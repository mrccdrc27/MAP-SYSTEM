from django.core.management.base import BaseCommand
from hdts.models import Employees, EmployeeOTP
from django.utils import timezone
import logging
import random

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
                'email': 'john.doe@gmail.com',
                'username': 'johndoe',
                'password': 'TestPassword123!',
                'first_name': 'John',
                'middle_name': 'Michael',
                'last_name': 'Doe',
                'suffix': 'Jr.',
                'phone_number': '+63917000001',
                'department': 'IT Department',
                'status': 'Approved',
                'otp_enabled': False,
            },
            {
                'email': 'jane.smith@gmail.com',
                'username': 'janesmith',
                'password': 'TestPassword123!',
                'first_name': 'Jane',
                'middle_name': 'Elizabeth',
                'last_name': 'Smith',
                'suffix': None,
                'phone_number': '+63917000002',
                'department': 'Asset Department',
                'status': 'Approved',
                'otp_enabled': False,
            },
            {
                'email': 'robert.johnson@gmail.com',
                'username': 'robertj',
                'password': 'TestPassword123!',
                'first_name': 'Robert',
                'middle_name': 'James',
                'last_name': 'Johnson',
                'suffix': 'Sr.',
                'phone_number': '+63917000003',
                'department': 'IT Department',
                'status': 'Approved',
                'otp_enabled': True,
            },
            {
                'email': 'sarah.williams@gmail.com',
                'username': 'sarahw',
                'password': 'TestPassword123!',
                'first_name': 'Sarah',
                'middle_name': 'Marie',
                'last_name': 'Williams',
                'suffix': None,
                'phone_number': '+63917000004',
                'department': 'Budget Department',
                'status': 'Approved',
                'otp_enabled': False,
            },
            {
                'email': 'michael.brown@gmail.com',
                'username': 'michaelb',
                'password': 'TestPassword123!',
                'first_name': 'Michael',
                'middle_name': 'Andrew',
                'last_name': 'Brown',
                'suffix': None,
                'phone_number': '+63917000005',
                'department': 'Asset Department',
                'status': 'Pending',
                'otp_enabled': False,
            },
            {
                'email': 'emily.davis@gmail.com',
                'username': 'emilyd',
                'password': 'TestPassword123!',
                'first_name': 'Emily',
                'middle_name': 'Grace',
                'last_name': 'Davis',
                'suffix': None,
                'phone_number': '+63917000006',
                'department': 'IT Department',
                'status': 'Approved',
                'otp_enabled': False,
            },
            {
                'email': 'david.miller@gmail.com',
                'username': 'davidm',
                'password': 'TestPassword123!',
                'first_name': 'David',
                'middle_name': 'Christopher',
                'last_name': 'Miller',
                'suffix': 'II',
                'phone_number': '+63917000007',
                'department': 'Budget Department',
                'status': 'Approved',
                'otp_enabled': False,
            },
            {
                'email': 'lisa.anderson@gmail.com',
                'username': 'lisaa',
                'password': 'TestPassword123!',
                'first_name': 'Lisa',
                'middle_name': 'Ann',
                'last_name': 'Anderson',
                'suffix': None,
                'phone_number': '+63917000008',
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
                # Ensure company_id exists in format MAXXXX (3 digit number)
                def generate_company_id():
                    # Generate unique company_id in format MA#### (4 digits)
                    # Try a reasonable number of attempts to avoid infinite loops
                    for _ in range(10000):
                        num = random.randint(0, 9999)
                        cid = f"MA{num:04d}"
                        if not Employees.objects.filter(company_id=cid).exists():
                            return cid
                    # Fallback: use timestamp-based value to guarantee uniqueness
                    return f"MA{int(timezone.now().timestamp()) % 10000:04d}"

                # If newly created, set password and ensure company_id
                if created:
                    # fill any missing fields from emp_data (get_or_create used defaults)
                    for key, value in emp_data.items():
                        if not getattr(employee, key, None) and value:
                            setattr(employee, key, value)
                    if not getattr(employee, 'company_id', None):
                        employee.company_id = generate_company_id()
                    employee.set_password(password)
                    employee.save()
                    self.stdout.write(
                        self.style.SUCCESS(
                            f'Created employee: {employee.email} ({employee.get_full_name()})'
                        )
                    )
                    created_count += 1
                else:
                    # Update existing employee fields and ensure company_id exists
                    for key, value in emp_data.items():
                        setattr(employee, key, value)
                    if not getattr(employee, 'company_id', None):
                        employee.company_id = generate_company_id()
                    employee.set_password(password)
                    employee.save()
                    self.stdout.write(
                        self.style.WARNING(
                            f'Updated employee: {employee.email} ({employee.get_full_name()})'
                        )
                    )
                    updated_count += 1

            except Exception as e:
                self.stdout.write(
                    self.style.ERROR(
                        f'Error creating employee {emp_data.get("email")}: {str(e)}'
                    )
                )
                logger.error(f'Error seeding employee: {str(e)}', exc_info=True)

        self.stdout.write(
            self.style.SUCCESS(
                f'\nSummary: {created_count} created, {updated_count} updated'
            )
        )
