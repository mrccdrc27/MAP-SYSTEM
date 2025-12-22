from django.core.management.base import BaseCommand
from django.utils import timezone
from ...services import WorkflowPushService
import time

class Command(BaseCommand):
    help = 'Process workflow push queue (run this as a cron job or daemon)'
    
    def add_arguments(self, parser):
        parser.add_argument(
            '--daemon',
            action='store_true',
            help='Run as daemon (continuous processing)',
        )
        parser.add_argument(
            '--interval',
            type=int,
            default=60,
            help='Processing interval in seconds (default: 60)',
        )
    
    def handle(self, *args, **options):
        service = WorkflowPushService()
        
        if options['daemon']:
            self.stdout.write('Starting queue processor daemon...')
            while True:
                try:
                    results = service.process_retry_queue()
                    if results:
                        self.stdout.write(f'Processed {len(results)} retry items at {timezone.now()}')
                    time.sleep(options['interval'])
                except KeyboardInterrupt:
                    self.stdout.write('Stopping daemon...')
                    break
                except Exception as e:
                    self.stderr.write(f'Error in daemon: {str(e)}')
                    time.sleep(options['interval'])
        else:
            results = service.process_retry_queue()
            self.stdout.write(f'Processed {len(results)} retry items')
            for result in results:
                self.stdout.write(f"Ticket {result['ticket_id']}: {result['result']}")