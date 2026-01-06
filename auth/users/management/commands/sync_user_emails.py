"""
Management command to sync all user emails to notification service.
Run this after initial setup or to refresh the notification service's user cache.

Usage:
    python manage.py sync_user_emails
    python manage.py sync_user_emails --async   # Run via Celery
"""

from django.core.management.base import BaseCommand
from users.models import User
import logging

logger = logging.getLogger(__name__)


class Command(BaseCommand):
    help = 'Sync all user emails to notification service'

    def add_arguments(self, parser):
        parser.add_argument(
            '--async',
            action='store_true',
            dest='run_async',
            help='Run sync via Celery task (async)',
        )

    def handle(self, *args, **options):
        run_async = options.get('run_async', False)
        
        if run_async:
            self.sync_async()
        else:
            self.sync_direct()

    def sync_async(self):
        """Trigger bulk sync via Celery task."""
        from users.tasks import bulk_sync_user_emails_to_notification_service
        
        self.stdout.write("Triggering async bulk user email sync...")
        result = bulk_sync_user_emails_to_notification_service.delay()
        self.stdout.write(
            self.style.SUCCESS(f"Bulk sync task queued with ID: {result.id}")
        )
        self.stdout.write("Check notification-worker logs for sync progress.")

    def sync_direct(self):
        """Directly sync all users to notification service."""
        from celery import current_app
        
        users = User.objects.filter(is_active=True).values(
            'id', 'email', 'first_name', 'last_name', 'is_active'
        )
        
        total = users.count()
        self.stdout.write(f"Syncing {total} users to notification service...")
        
        # Prepare users data
        users_data = [
            {
                'user_id': user['id'],
                'email': user['email'],
                'first_name': user['first_name'] or '',
                'last_name': user['last_name'] or '',
                'is_active': user['is_active'],
            }
            for user in users
        ]
        
        # Send in chunks
        CHUNK_SIZE = 100
        chunks_sent = 0
        
        for i in range(0, len(users_data), CHUNK_SIZE):
            chunk = users_data[i:i + CHUNK_SIZE]
            current_app.send_task(
                'notifications.bulk_sync_user_emails',
                kwargs={'users_data': chunk},
                queue='user-email-sync-queue',
            )
            chunks_sent += 1
            self.stdout.write(f"  Sent chunk {chunks_sent} ({len(chunk)} users)")
        
        self.stdout.write(
            self.style.SUCCESS(
                f"✅ Sent {total} users in {chunks_sent} chunks to notification service"
            )
        )
        self.stdout.write("Check notification-worker logs to confirm sync completed.")
