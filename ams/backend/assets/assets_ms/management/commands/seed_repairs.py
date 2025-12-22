from django.core.management.base import BaseCommand
from django.core.management import call_command
from django.utils import timezone
from assets_ms.models import Asset, Repair
from decimal import Decimal
from datetime import timedelta
import random


class Command(BaseCommand):
    help = 'Seed the database with 20 repair records'

    def add_arguments(self, parser):
        parser.add_argument(
            '--clear',
            action='store_true',
            help='Clear existing repairs before seeding',
        )
        parser.add_argument(
            '--no-auto-seed-assets',
            action='store_true',
            help='Do not automatically seed assets if they don\'t exist',
        )

    def handle(self, *args, **options):
        if options['clear']:
            self.stdout.write(self.style.WARNING('Clearing existing repairs...'))
            Repair.objects.all().delete()
            self.stdout.write(self.style.SUCCESS('Existing repairs cleared.'))

        # Get assets with undeployable status (5 or 6) - these are the ones that should have repairs
        # According to seed_assets.py, assets at positions 81-90 (0-indexed: 80-89) have undeployable status
        undeployable_assets = Asset.objects.filter(status__in=[5, 6], is_deleted=False).order_by('id')[:10]

        if undeployable_assets.count() < 10:
            if options['no_auto_seed_assets']:
                self.stdout.write(self.style.ERROR(
                    f'Only {undeployable_assets.count()} undeployable assets found. Need 10. Please seed assets first using: python manage.py seed_assets'
                ))
                return
            else:
                self.stdout.write(self.style.WARNING(f'\n⚠ Only {undeployable_assets.count()} undeployable assets found. Auto-seeding assets first...'))
                self.stdout.write(self.style.MIGRATE_HEADING('\n=== Auto-Seeding Assets (100 records) ==='))
                call_command('seed_assets')
                # Refresh assets queryset
                undeployable_assets = Asset.objects.filter(status__in=[5, 6], is_deleted=False).order_by('id')[:10]
                if undeployable_assets.count() < 10:
                    self.stdout.write(self.style.ERROR(f'Failed to seed assets. Only {undeployable_assets.count()} undeployable assets found.'))
                    return
                self.stdout.write(self.style.SUCCESS('\n✓ Successfully seeded assets'))

        self.stdout.write(self.style.MIGRATE_HEADING('\n=== Seeding 20 Repairs ==='))

        repairs_data = self.get_repairs_data(undeployable_assets)
        created_count = 0

        for repair_data in repairs_data:
            # Check by asset, type, name, and start_date to avoid duplicates
            existing = Repair.objects.filter(
                asset=repair_data['asset'],
                type=repair_data['type'],
                name=repair_data['name'],
                start_date=repair_data['start_date'],
            ).exists()

            if existing:
                self.stdout.write(self.style.WARNING(
                    f'- Repair exists for asset {repair_data["asset"].asset_id}'
                ))
                continue

            Repair.objects.create(**repair_data)
            created_count += 1
            if created_count % 5 == 0:
                self.stdout.write(self.style.SUCCESS(f'✓ Created {created_count} repairs...'))

        self.stdout.write(self.style.SUCCESS(f'\n✓ Repairs seeding complete: {created_count} created'))

    def get_repairs_data(self, undeployable_assets):
        base_date = timezone.now().date()

        # Repair types from the model
        repair_types = ['maintenance', 'repair', 'upgrade', 'hardware', 'software']

        # Supplier IDs (1-10 from contexts seeder)
        supplier_ids = list(range(1, 11))

        # Repair status IDs (11-15 from seed_statuses.py)
        # 11: Pending, 12: In Progress, 13: Awaiting Parts, 14: Completed, 15: Cancelled
        repair_status_ids = [11, 12, 13, 14, 15]

        repair_names = [
            'Screen Replacement', 'Battery Replacement', 'Keyboard Repair',
            'Hard Drive Upgrade', 'RAM Upgrade', 'Software Update',
            'OS Reinstallation', 'Virus Removal', 'Fan Replacement',
            'Power Supply Fix', 'Motherboard Repair', 'General Maintenance',
            'Display Calibration', 'Port Repair', 'Speaker Replacement',
            'Touchpad Repair', 'Hinge Repair', 'Thermal Paste Application',
            'GPU Repair', 'Network Card Replacement'
        ]

        repairs = []

        # Create 2 repairs per undeployable asset (10 assets * 2 = 20 repairs)
        for i, asset in enumerate(undeployable_assets):
            for j in range(2):
                repair_type = random.choice(repair_types)
                supplier_id = random.choice(supplier_ids)
                status_id = random.choice(repair_status_ids)
                repair_name = repair_names[(i * 2 + j) % len(repair_names)]

                # Start date: Random date in the past 60 days
                days_ago = random.randint(1, 60)
                start_date = base_date - timedelta(days=days_ago)

                # End date: Some repairs are completed (50% chance)
                end_date = None
                if status_id == 14:  # Completed status
                    end_date = start_date + timedelta(days=random.randint(1, 14))

                # Cost: Random between 500 and 5000
                cost = Decimal(str(round(random.uniform(500, 5000), 2)))

                repairs.append({
                    'asset': asset,
                    'supplier_id': supplier_id,
                    'type': repair_type,
                    'name': repair_name,
                    'start_date': start_date,
                    'end_date': end_date,
                    'cost': cost,
                    'status_id': status_id,
                    'notes': f'Repair #{i * 2 + j + 1} for {asset.asset_id}',
                })

        return repairs

