from django.core.management.base import BaseCommand
from django.core.management import call_command
from django.utils import timezone
from assets_ms.models import Asset, Product
from decimal import Decimal
from datetime import timedelta
import random


class Command(BaseCommand):
    help = 'Seed the database with 100 asset records (will auto-seed products if they don\'t exist)'

    def add_arguments(self, parser):
        parser.add_argument(
            '--clear',
            action='store_true',
            help='Clear existing assets before seeding',
        )
        parser.add_argument(
            '--no-auto-seed-products',
            action='store_true',
            help='Do not automatically seed products if they don\'t exist',
        )

    def handle(self, *args, **options):
        if options['clear']:
            self.stdout.write(self.style.WARNING('Clearing existing assets...'))
            Asset.objects.all().delete()
            self.stdout.write(self.style.SUCCESS('Existing assets cleared.'))

        # Check if products exist
        products = Product.objects.filter(is_deleted=False)
        if not products.exists():
            if options['no_auto_seed_products']:
                self.stdout.write(self.style.ERROR('No products found. Please seed products first using: python manage.py seed_products'))
                return
            else:
                self.stdout.write(self.style.WARNING('\n⚠ No products found. Auto-seeding products first...'))
                self.stdout.write(self.style.MIGRATE_HEADING('\n=== Auto-Seeding Products (100 records) ==='))
                call_command('seed_products')
                # Refresh products queryset
                products = Product.objects.filter(is_deleted=False)
                if not products.exists():
                    self.stdout.write(self.style.ERROR('Failed to seed products. Cannot create assets.'))
                    return
                self.stdout.write(self.style.SUCCESS(f'\n✓ Successfully seeded {products.count()} products'))

        self.stdout.write(self.style.MIGRATE_HEADING('\n=== Seeding 100 Assets ==='))

        assets_data = self.get_assets_data(products)
        created_count = 0

        for asset_data in assets_data:
            # Check by serial number to avoid duplicates
            asset, created = Asset.objects.get_or_create(
                serial_number=asset_data['serial_number'],
                defaults=asset_data
            )
            if created:
                created_count += 1
                if created_count % 10 == 0:
                    self.stdout.write(self.style.SUCCESS(f'✓ Created {created_count} assets...'))
            else:
                self.stdout.write(self.style.WARNING(f'- Asset exists: {asset.asset_id}'))

        self.stdout.write(self.style.SUCCESS(f'\n✓ Assets seeding complete: {created_count} created'))

    def get_assets_data(self, products):
        base_date = timezone.now().date()

        # Get all available products
        products_list = list(products)

        if len(products_list) < 100:
            self.stdout.write(self.style.WARNING(
                f'Only {len(products_list)} products available. Some products will have multiple assets.'
            ))

        assets = []
        suppliers = list(range(1, 11))  # Supplier IDs 1-10 (from contexts)
        locations = list(range(1, 11))  # Location IDs 1-10 (from contexts)

        # Status IDs from seed_statuses.py:
        # 1: Ready to Deploy (deployable)
        # 2: Available (deployable)
        # 3: In Use (deployed)
        # 4: Checked Out (deployed)
        # 5: Under Repair (undeployable)
        # 6: Broken (undeployable)
        # 7: Pending Approval (pending)
        # 8: In Transit (pending)
        # 9: Retired (archived)
        # 10: Lost/Stolen (archived)

        # Distribution strategy for 100 assets:
        # - Assets 1-40: Deployable (status IDs 1-2) - Available for checkout → CHECKOUT tickets
        # - Assets 41-80: Deployed (status IDs 3-4) - Currently checked out → CHECKIN tickets
        # - Assets 81-90: Undeployable (status IDs 5-6) - Under repair or broken → NO tickets
        # - Assets 91-95: Pending (status IDs 7-8) - Pending approval or in transit → NO tickets
        # - Assets 96-100: Archived (status IDs 9-10) - Retired or lost/stolen → NO tickets

        # IMPORTANT: Do NOT shuffle! Ticket seeder depends on this exact order
        status_distribution = (
            [1, 2] * 20 +  # Assets 1-40: deployable (will have CHECKOUT tickets)
            [3, 4] * 20 +  # Assets 41-80: deployed (will have CHECKIN tickets)
            [5, 6] * 5 +   # Assets 81-90: undeployable (no tickets)
            [7, 8] * 3 + [7] * 2 +  # Assets 91-95: pending (no tickets)
            [9, 10] * 3 + [9] * 2   # Assets 96-100: archived (no tickets)
        )
        # DO NOT SHUFFLE - ticket seeder relies on this order!

        # Create 100 assets
        for i in range(100):
            # Cycle through products if we have fewer than 100
            product = products_list[i % len(products_list)]

            # Get status from distribution
            status = status_distribution[i]
            supplier = random.choice(suppliers)
            location = random.choice(locations)

            # Warranty: 1-3 years from purchase date
            warranty_years = random.randint(1, 3)

            # Purchase date: Random date in the past 2 years
            days_ago = random.randint(0, 730)
            purchase_date = base_date - timedelta(days=days_ago)
            warranty_expiration = purchase_date + timedelta(days=365 * warranty_years)

            # Purchase cost: Use product default or add some variation
            if product.default_purchase_cost:
                # Add ±10% variation to the default cost
                variation = random.uniform(0.9, 1.1)
                purchase_cost = product.default_purchase_cost * Decimal(str(variation))
                purchase_cost = Decimal(str(round(float(purchase_cost), 2)))
            else:
                purchase_cost = Decimal(str(round(random.uniform(299.99, 2999.99), 2)))

            assets.append({
                'product': product,
                'status': status,
                'supplier': supplier,
                'location': location,
                'name': f'{product.name} Unit {(i % 10) + 1}',
                'serial_number': f'SN{i+1:06d}',  # SN000001 to SN000100
                'warranty_expiration': warranty_expiration,
                'order_number': f'ORD-2024-{i+1:04d}',
                'purchase_date': purchase_date,
                'purchase_cost': purchase_cost,
                'notes': f'Asset #{i+1} - {product.name}',
            })

        return assets

