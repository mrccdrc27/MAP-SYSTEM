from django.core.management.base import BaseCommand
from contexts_ms.models import Employee


class Command(BaseCommand):
    help = 'Seed the database with 20 employee records'

    def add_arguments(self, parser):
        parser.add_argument(
            '--clear',
            action='store_true',
            help='Clear existing employees before seeding',
        )

    def handle(self, *args, **options):
        if options['clear']:
            self.stdout.write(self.style.WARNING('Clearing existing employees...'))
            Employee.objects.all().delete()
            self.stdout.write(self.style.SUCCESS('Existing employees cleared.'))

        self.stdout.write(self.style.MIGRATE_HEADING('\n=== Seeding 20 Employees ==='))

        employees_data = self.get_employees_data()
        created_count = 0

        for employee_data in employees_data:
            employee, created = Employee.objects.get_or_create(
                firstname=employee_data['firstname'],
                lastname=employee_data['lastname'],
                defaults=employee_data
            )
            if created:
                created_count += 1
                self.stdout.write(self.style.SUCCESS(
                    f'✓ Created: {employee.firstname} {employee.lastname}'
                ))
            else:
                self.stdout.write(self.style.WARNING(
                    f'- Employee exists: {employee.firstname} {employee.lastname}'
                ))

        self.stdout.write(self.style.SUCCESS(f'\n✓ Employees seeding complete: {created_count} created'))

    def get_employees_data(self):
        # 20 employees with first and last names
        employees = [
            {'firstname': 'John', 'lastname': 'Smith'},
            {'firstname': 'Maria', 'lastname': 'Garcia'},
            {'firstname': 'Robert', 'lastname': 'Johnson'},
            {'firstname': 'Emily', 'lastname': 'Davis'},
            {'firstname': 'Michael', 'lastname': 'Brown'},
            {'firstname': 'Sarah', 'lastname': 'Wilson'},
            {'firstname': 'David', 'lastname': 'Martinez'},
            {'firstname': 'Lisa', 'lastname': 'Anderson'},
            {'firstname': 'James', 'lastname': 'Taylor'},
            {'firstname': 'Jennifer', 'lastname': 'Thomas'},
            {'firstname': 'William', 'lastname': 'Moore'},
            {'firstname': 'Patricia', 'lastname': 'Jackson'},
            {'firstname': 'Richard', 'lastname': 'White'},
            {'firstname': 'Linda', 'lastname': 'Harris'},
            {'firstname': 'Joseph', 'lastname': 'Martin'},
            {'firstname': 'Elizabeth', 'lastname': 'Thompson'},
            {'firstname': 'Charles', 'lastname': 'Garcia'},
            {'firstname': 'Susan', 'lastname': 'Robinson'},
            {'firstname': 'Christopher', 'lastname': 'Clark'},
            {'firstname': 'Jessica', 'lastname': 'Rodriguez'},
        ]
        return employees

