from django.core.management.base import BaseCommand
from django.core.management import call_command


class Command(BaseCommand):
    help = 'Seed all context data (categories, suppliers, manufacturers, statuses, depreciations, locations, employees, tickets)'

    def add_arguments(self, parser):
        parser.add_argument(
            '--clear',
            action='store_true',
            help='Clear existing data before seeding',
        )
        parser.add_argument(
            '--categories-only',
            action='store_true',
            help='Seed only categories (10 records)',
        )
        parser.add_argument(
            '--suppliers-only',
            action='store_true',
            help='Seed only suppliers (10 records)',
        )
        parser.add_argument(
            '--manufacturers-only',
            action='store_true',
            help='Seed only manufacturers (10 records)',
        )
        parser.add_argument(
            '--statuses-only',
            action='store_true',
            help='Seed only statuses (15 records: 10 asset + 5 repair)',
        )
        parser.add_argument(
            '--depreciations-only',
            action='store_true',
            help='Seed only depreciations (10 records)',
        )
        parser.add_argument(
            '--locations-only',
            action='store_true',
            help='Seed only locations (10 records)',
        )
        parser.add_argument(
            '--tickets-only',
            action='store_true',
            help='Seed only tickets (80 records)',
        )
        parser.add_argument(
            '--employees-only',
            action='store_true',
            help='Seed only employees (20 records)',
        )

    def handle(self, *args, **options):
        clear_flag = '--clear' if options['clear'] else ''

        # Check if any specific flag is set
        specific_flags = [
            options['categories_only'],
            options['suppliers_only'],
            options['manufacturers_only'],
            options['statuses_only'],
            options['depreciations_only'],
            options['locations_only'],
            options['employees_only'],
            options['tickets_only'],
        ]
        
        seed_all = not any(specific_flags)

        # Seed Categories (10 records)
        if seed_all or options['categories_only']:
            self.stdout.write(self.style.MIGRATE_HEADING('\n=== Seeding Categories (10 records) ==='))
            call_command('seed_categories', clear_flag) if clear_flag else call_command('seed_categories')

        # Seed Suppliers (10 records)
        if seed_all or options['suppliers_only']:
            self.stdout.write(self.style.MIGRATE_HEADING('\n=== Seeding Suppliers (10 records) ==='))
            call_command('seed_suppliers', clear_flag) if clear_flag else call_command('seed_suppliers')

        # Seed Manufacturers (10 records)
        if seed_all or options['manufacturers_only']:
            self.stdout.write(self.style.MIGRATE_HEADING('\n=== Seeding Manufacturers (10 records) ==='))
            call_command('seed_manufacturers', clear_flag) if clear_flag else call_command('seed_manufacturers')

        # Seed Statuses (15 records: 10 asset + 5 repair)
        if seed_all or options['statuses_only']:
            self.stdout.write(self.style.MIGRATE_HEADING('\n=== Seeding Statuses (15 records: 10 asset + 5 repair) ==='))
            call_command('seed_statuses', clear_flag) if clear_flag else call_command('seed_statuses')

        # Seed Depreciations (10 records)
        if seed_all or options['depreciations_only']:
            self.stdout.write(self.style.MIGRATE_HEADING('\n=== Seeding Depreciations (10 records) ==='))
            call_command('seed_depreciations', clear_flag) if clear_flag else call_command('seed_depreciations')

        # Seed Locations (10 records)
        if seed_all or options['locations_only']:
            self.stdout.write(self.style.MIGRATE_HEADING('\n=== Seeding Locations (10 records) ==='))
            call_command('seed_locations', clear_flag) if clear_flag else call_command('seed_locations')

        # Seed Employees (20 records)
        if seed_all or options['employees_only']:
            self.stdout.write(self.style.MIGRATE_HEADING('\n=== Seeding Employees (20 records) ==='))
            call_command('seed_employees', clear_flag) if clear_flag else call_command('seed_employees')

        # Seed Tickets (80 records: 40 checkout + 40 checkin)
        if seed_all or options['tickets_only']:
            self.stdout.write(self.style.MIGRATE_HEADING('\n=== Seeding Tickets (80 records) ==='))
            call_command('seed_tickets', clear_flag) if clear_flag else call_command('seed_tickets')

        self.stdout.write(self.style.SUCCESS('\n✓ All context seeding complete!'))

