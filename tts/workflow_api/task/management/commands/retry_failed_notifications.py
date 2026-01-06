"""
Django management command to retry failed notifications.

Usage:
    python manage.py retry_failed_notifications
    python manage.py retry_failed_notifications --max-age 24  # Only retry notifications from last 24 hours
    python manage.py retry_failed_notifications --limit 50    # Process max 50 notifications
"""

from django.core.management.base import BaseCommand
from django.utils import timezone
from datetime import timedelta
from task.models import FailedNotification
from task.tasks import send_assignment_notification as notify_task
import logging

logger = logging.getLogger(__name__)


class Command(BaseCommand):
    help = 'Retry failed notifications that are pending'

    def add_arguments(self, parser):
        parser.add_argument(
            '--max-age',
            type=int,
            default=None,
            help='Only retry notifications created within this many hours (default: all)'
        )
        parser.add_argument(
            '--limit',
            type=int,
            default=None,
            help='Maximum number of notifications to process (default: all)'
        )
        parser.add_argument(
            '--force',
            action='store_true',
            help='Force retry even if max retries reached'
        )

    def handle(self, *args, **options):
        max_age = options.get('max_age')
        limit = options.get('limit')
        force = options.get('force')

        self.stdout.write(self.style.SUCCESS('Starting failed notification retry process...'))

        # Build query
        query = FailedNotification.objects.filter(status='pending')
        
        if not force:
            # Only retry notifications that haven't exceeded max retries
            from django.db.models import F
            query = query.filter(retry_count__lt=F('max_retries'))
        
        if max_age:
            cutoff_time = timezone.now() - timedelta(hours=max_age)
            query = query.filter(created_at__gte=cutoff_time)
            self.stdout.write(f"Filtering notifications created after {cutoff_time}")
        
        query = query.order_by('created_at')
        
        if limit:
            query = query[:limit]
            self.stdout.write(f"Processing up to {limit} notifications")
        
        notifications = list(query)
        total_count = len(notifications)
        
        if total_count == 0:
            self.stdout.write(self.style.WARNING('No pending notifications to retry'))
            return

        self.stdout.write(f"Found {total_count} pending notifications")

        success_count = 0
        failed_count = 0
        
        for notification in notifications:
            self.stdout.write(f"\nRetrying notification {notification.failed_notification_id}:")
            self.stdout.write(f"  User: {notification.user_id}")
            self.stdout.write(f"  Task Item: {notification.task_item_id}")
            self.stdout.write(f"  Retry count: {notification.retry_count}/{notification.max_retries}")
            
            try:
                # Update retry tracking
                notification.status = 'retrying'
                notification.retry_count += 1
                notification.last_retry_at = timezone.now()
                notification.save()
                
                # Attempt to send notification
                notify_task.delay(
                    user_id=notification.user_id,
                    ticket_number=notification.task_item_id,
                    task_title=notification.task_title,
                    role_name=notification.role_name
                )
                
                # Mark as success
                notification.status = 'success'
                notification.succeeded_at = timezone.now()
                notification.save()
                
                success_count += 1
                self.stdout.write(self.style.SUCCESS(f"  ✅ Notification sent successfully"))
                
            except Exception as e:
                failed_count += 1
                error_msg = str(e)
                
                # Update error details
                notification.error_message = error_msg
                
                # Check if max retries reached
                if notification.retry_count >= notification.max_retries:
                    notification.status = 'failed'
                    self.stdout.write(self.style.ERROR(f"  ❌ Max retries reached. Marked as failed."))
                else:
                    notification.status = 'pending'
                    self.stdout.write(self.style.WARNING(f"  ⚠️ Retry failed: {error_msg}"))
                
                notification.save()
                logger.error(f"Failed to retry notification {notification.failed_notification_id}: {e}")

        # Summary
        self.stdout.write("\n" + "="*60)
        self.stdout.write(self.style.SUCCESS(f"\nRetry Summary:"))
        self.stdout.write(f"  Total processed: {total_count}")
        self.stdout.write(self.style.SUCCESS(f"  Successful: {success_count}"))
        self.stdout.write(self.style.ERROR(f"  Failed: {failed_count}"))
        
        # Show remaining pending
        remaining_pending = FailedNotification.objects.filter(status='pending').count()
        if remaining_pending > 0:
            self.stdout.write(self.style.WARNING(f"  Still pending: {remaining_pending}"))
