"""
Management command to run the role sync consumer.
This is an alternative to running a Celery worker for consuming role sync tasks.
If using a standard Celery worker, this command is not needed.

Usage (Alternative 1 - Management Command):
    python manage.py role_sync_consumer

Usage (Alternative 2 - Standard Celery Worker - Recommended):
    celery -A workflow_api worker -l info -Q tts.role.sync,tts.user_system_role.sync
"""

from django.core.management.base import BaseCommand
import logging

logger = logging.getLogger(__name__)


class Command(BaseCommand):
    help = 'Consumer for syncing roles and user_system_roles from TTS auth service'

    def add_arguments(self, parser):
        parser.add_argument(
            '--queue',
            type=str,
            default='tts.role.sync,tts.user_system_role.sync',
            help='Comma-separated list of queues to consume from'
        )

    def handle(self, *args, **options):
        queues = options.get('queue', 'tts.role.sync,tts.user_system_role.sync').split(',')
        
        self.stdout.write(
            self.style.SUCCESS(f'Starting role sync consumer on queues: {queues}')
        )
        self.stdout.write(
            self.style.WARNING(
                'NOTE: This is a simple consumer. For production, use:\n'
                'celery -A workflow_api worker -l info -Q tts.role.sync,tts.user_system_role.sync'
            )
        )
        
        from celery import Celery
        from django.conf import settings
        
        app = Celery('workflow_api')
        app.config_from_object('django.conf:settings', namespace='CELERY')
        
        try:
            # Import tasks to register them
            from role.tasks import sync_role, sync_user_system_role
            
            self.stdout.write(
                self.style.SUCCESS('Consumer connected. Waiting for messages...')
            )
            
            # Start consuming from the specified queues
            with app.connection() as connection:
                with connection.channel() as channel:
                    # Declare the queues
                    for queue_name in queues:
                        queue_name = queue_name.strip()
                        self.stdout.write(f'Declaring queue: {queue_name}')
                    
                    # Run the consumer
                    worker = app.Worker(
                        queues=queues,
                        loglevel='INFO',
                        logfile='-',
                    )
                    worker.start()
        
        except KeyboardInterrupt:
            self.stdout.write(
                self.style.SUCCESS('Consumer stopped by user')
            )
        except Exception as e:
            self.stdout.write(
                self.style.ERROR(f'Error in consumer: {str(e)}')
            )
            logger.error(f'Consumer error: {str(e)}')
            import traceback
            traceback.print_exc()
