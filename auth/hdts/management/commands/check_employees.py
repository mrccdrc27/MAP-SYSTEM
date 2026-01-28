from django.core.management.base import BaseCommand
from hdts.models import Employees
import logging

logger = logging.getLogger(__name__)


class Command(BaseCommand):
    help = 'Check and list all employees in the database.'

    def add_arguments(self, parser):
        parser.add_argument(
            '--email',
            type=str,
            help='Filter by specific email',
        )
        parser.add_argument(
            '--status',
            type=str,
            help='Filter by status (Pending, Approved, Rejected)',
        )
        parser.add_argument(
            '--count-only',
            action='store_true',
            dest='count_only',
            help='Show only the total count of employees',
        )

    def handle(self, *args, **options):
        queryset = Employees.objects.all()
        
        # Apply filters
        if options.get('email'):
            queryset = queryset.filter(email__icontains=options['email'])
        if options.get('status'):
            queryset = queryset.filter(status=options['status'])
        
        total_count = queryset.count()
        
        if options['count_only']:
            self.stdout.write(
                self.style.SUCCESS(f'Total employees in database: {total_count}')
            )
            return
        
        if total_count == 0:
            self.stdout.write(self.style.WARNING('No employees found in database.'))
            return
        
        self.stdout.write(
            self.style.SUCCESS(f'\n=== Employee Database Check ({total_count} total) ===\n')
        )
        
        # Display table header
        header = f"{'Email':<40} {'Status':<12} {'Department':<20} {'Company ID':<10}"
        self.stdout.write(self.style.HTTP_INFO(header))
        self.stdout.write('-' * 82)
        
        for emp in queryset:
            status_style = self.get_status_style(emp.status)
            status = status_style(emp.status)
            
            row = f"{emp.email:<40} {emp.status:<12} {emp.department or 'N/A':<20} {emp.company_id or 'N/A':<10}"
            self.stdout.write(row)
        
        self.stdout.write('-' * 82)
        
        # Show summary by status
        self.stdout.write(self.style.SUCCESS('\n=== Summary by Status ==='))
        for status in ['Approved', 'Pending', 'Rejected']:
            count = queryset.filter(status=status).count()
            if count > 0:
                self.stdout.write(f'{status}: {count}')
    
    def get_status_style(self, status):
        """Return appropriate style for status."""
        if status == 'Approved':
            return self.style.SUCCESS
        elif status == 'Pending':
            return self.style.WARNING
        else:  # Rejected
            return self.style.ERROR
