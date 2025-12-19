from django.core.management.base import BaseCommand
from hdts.models import Employees, EmployeeOTP
from django.utils import timezone
import logging

logger = logging.getLogger(__name__)


class Command(BaseCommand):
    help = 'Seed database with test employees for the HDTS system.'

    def add_arguments(self, parser):
        parser.add_argument(
            '--clear',
            action='store_true',
            dest='clear',
            help='Clear existing employees before seeding',
        )

    def handle(self, *args, **options):
        self.stdout.write('Seeding test employees for HDTS system...')
        
        if options['clear']:
            self.clear_employees()
        
        self.create_employees()
        self.stdout.write(self.style.SUCCESS('Done seeding test employees.'))

    def clear_employees(self):
        """Clear all existing employees."""
        count, _ = Employees.objects.all().delete()
        self.stdout.write(self.style.WARNING(f'Deleted {count} employees.'))

    def create_employees(self):
        """Create test employees."""
        employees_data = [
            {
                'email': 'john.doe@example.com',
                'username': 'johndoe',
                'password': 'TestPassword123!',
                'first_name': 'John',
                'middle_name': 'Michael',
                'last_name': 'Doe',
                'suffix': 'Jr.',
                'phone_number': '+16175551234',
                'department': 'IT Department',
                'status': 'Approved',
                'otp_enabled': False,
            },
            {
                'email': 'jane.smith@example.com',
                'username': 'janesmith',
                'password': 'TestPassword123!',
                'first_name': 'Jane',
                'middle_name': 'Elizabeth',
                'last_name': 'Smith',
                'suffix': None,
                'phone_number': '+16175551235',
                'department': 'Asset Department',
                'status': 'Approved',
                'otp_enabled': False,
            },
            {
                'email': 'robert.johnson@example.com',
                'username': 'robertj',
                'password': 'TestPassword123!',
                'first_name': 'Robert',
                'middle_name': 'James',
                'last_name': 'Johnson',
                'suffix': 'Sr.',
                'phone_number': '+16175551236',
                'department': 'IT Department',
                'status': 'Approved',
                'otp_enabled': True,
            },
            {
                'email': 'sarah.williams@example.com',
                'username': 'sarahw',
                'password': 'TestPassword123!',
                'first_name': 'Sarah',
                'middle_name': 'Marie',
                'last_name': 'Williams',
                'suffix': None,
                'phone_number': '+16175551237',
                'department': 'Budget Department',
                'status': 'Approved',
                'otp_enabled': False,
            },
            {
                'email': 'michael.brown@example.com',
                'username': 'michaelb',
                'password': 'TestPassword123!',
                'first_name': 'Michael',
                'middle_name': 'Andrew',
                'last_name': 'Brown',
                'suffix': None,
                'phone_number': '+16175551238',
                'department': 'Asset Department',
                'status': 'Pending',
                'otp_enabled': False,
            },
            {
                'email': 'emily.davis@example.com',
                'username': 'emilyd',
                'password': 'TestPassword123!',
                'first_name': 'Emily',
                'middle_name': 'Grace',
                'last_name': 'Davis',
                'suffix': None,
                'phone_number': '+16175551239',
                'department': 'IT Department',
                'status': 'Approved',
                'otp_enabled': False,
            },
            {
                'email': 'david.miller@example.com',
                'username': 'davidm',
                'password': 'TestPassword123!',
                'first_name': 'David',
                'middle_name': 'Christopher',
                'last_name': 'Miller',
                'suffix': 'II',
                'phone_number': '+16175551240',
                'department': 'Budget Department',
                'status': 'Approved',
                'otp_enabled': False,
            },
            {
                'email': 'lisa.anderson@example.com',
                'username': 'lisaa',
                'password': 'TestPassword123!',
                'first_name': 'Lisa',
                'middle_name': 'Ann',
                'last_name': 'Anderson',
                'suffix': None,
                'phone_number': '+16175551241',
                'department': 'IT Department',
                'status': 'Rejected',
                'otp_enabled': False,
            },
        ]

        created_count = 0
        updated_count = 0

        for emp_data in employees_data:
            try:
                password = emp_data.pop('password')
                
                employee, created = Employees.objects.get_or_create(
                    email=emp_data['email'],
                    defaults=emp_data
                )

                if created:
                    employee.set_password(password)
                    employee.save()
                    self.stdout.write(
                        self.style.SUCCESS(
                            f'✓ Created employee: {employee.email} ({employee.get_full_name()})'
                        )
                    )
                    created_count += 1
                else:
                    # Update existing employee
                    for key, value in emp_data.items():
                        setattr(employee, key, value)
                    employee.set_password(password)
                    employee.save()
                    self.stdout.write(
                        self.style.WARNING(
                            f'⟳ Updated employee: {employee.email} ({employee.get_full_name()})'
                        )
                    )
                    updated_count += 1

            except Exception as e:
                self.stdout.write(
                    self.style.ERROR(
                        f'✗ Error creating employee {emp_data.get("email")}: {str(e)}'
                    )
                )
                logger.error(f'Error seeding employee: {str(e)}', exc_info=True)

        self.stdout.write(
            self.style.SUCCESS(
                f'\nSummary: {created_count} created, {updated_count} updated'
            )
        )
