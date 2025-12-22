from django.core.management.base import BaseCommand
from contexts_ms.models import Depreciation
from decimal import Decimal


class Command(BaseCommand):
    help = 'Seed the database with 10 depreciation records'

    def add_arguments(self, parser):
        parser.add_argument(
            '--clear',
            action='store_true',
            help='Clear existing depreciations before seeding',
        )

    def handle(self, *args, **options):
        if options['clear']:
            self.stdout.write(self.style.WARNING('Clearing existing depreciations...'))
            Depreciation.objects.all().delete()
            self.stdout.write(self.style.SUCCESS('Existing depreciations cleared.'))

        self.stdout.write(self.style.MIGRATE_HEADING('\n=== Seeding 10 Depreciations ==='))

        depreciations_data = self.get_depreciations_data()
        created_count = 0

        for depreciation_data in depreciations_data:
            depreciation, created = Depreciation.objects.get_or_create(
                name=depreciation_data['name'],
                defaults=depreciation_data
            )
            if created:
                created_count += 1
                self.stdout.write(self.style.SUCCESS(
                    f'✓ Created: {depreciation.name} ({depreciation.duration} months, min: ₱{depreciation.minimum_value})'
                ))
            else:
                self.stdout.write(self.style.WARNING(f'- Depreciation exists: {depreciation.name}'))

        self.stdout.write(self.style.SUCCESS(f'\n✓ Depreciations seeding complete: {created_count} created'))

    def get_depreciations_data(self):
        """Generate 10 realistic depreciation schedules for IT equipment"""
        
        depreciations = [
            {
                'name': 'Computer Equipment - 3 Years',
                'duration': 36,  # 3 years
                'minimum_value': Decimal('1000.00'),
            },
            {
                'name': 'Computer Equipment - 5 Years',
                'duration': 60,  # 5 years
                'minimum_value': Decimal('500.00'),
            },
            {
                'name': 'Laptops - Standard',
                'duration': 36,  # 3 years
                'minimum_value': Decimal('2000.00'),
            },
            {
                'name': 'Desktops - Standard',
                'duration': 48,  # 4 years
                'minimum_value': Decimal('1500.00'),
            },
            {
                'name': 'Servers - Enterprise',
                'duration': 60,  # 5 years
                'minimum_value': Decimal('5000.00'),
            },
            {
                'name': 'Network Equipment - 5 Years',
                'duration': 60,  # 5 years
                'minimum_value': Decimal('1000.00'),
            },
            {
                'name': 'Printers - Standard',
                'duration': 36,  # 3 years
                'minimum_value': Decimal('500.00'),
            },
            {
                'name': 'Monitors - Standard',
                'duration': 48,  # 4 years
                'minimum_value': Decimal('300.00'),
            },
            {
                'name': 'Mobile Devices - 2 Years',
                'duration': 24,  # 2 years
                'minimum_value': Decimal('200.00'),
            },
            {
                'name': 'Peripherals - Standard',
                'duration': 24,  # 2 years
                'minimum_value': Decimal('100.00'),
            },
        ]
        
        return depreciations

