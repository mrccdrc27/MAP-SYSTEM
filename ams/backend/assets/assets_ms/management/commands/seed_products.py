from django.core.management.base import BaseCommand
from django.utils import timezone
from assets_ms.models import Product
from decimal import Decimal
from datetime import timedelta
import random


class Command(BaseCommand):
    help = 'Seed the database with 100 product records'

    def add_arguments(self, parser):
        parser.add_argument(
            '--clear',
            action='store_true',
            help='Clear existing products before seeding',
        )

    def handle(self, *args, **options):
        if options['clear']:
            self.stdout.write(self.style.WARNING('Clearing existing products...'))
            Product.objects.all().delete()
            self.stdout.write(self.style.SUCCESS('Existing products cleared.'))

        self.stdout.write(self.style.MIGRATE_HEADING('\n=== Seeding 100 Products ==='))

        products_data = self.get_products_data()
        created_count = 0

        for i, product_data in enumerate(products_data, 1):
            product, created = Product.objects.get_or_create(
                name=product_data['name'],
                model_number=product_data['model_number'],
                defaults=product_data
            )
            if created:
                created_count += 1
                if created_count % 10 == 0:
                    self.stdout.write(self.style.SUCCESS(f'✓ Created {created_count} products...'))
            else:
                self.stdout.write(self.style.WARNING(f'- Product exists: {product.name}'))

        self.stdout.write(self.style.SUCCESS(f'\n✓ Products seeding complete: {created_count} created'))

    def get_products_data(self):
        base_date = timezone.now().date()

        # Product templates for different categories
        laptop_models = [
            ('Dell', 'Latitude', [5420, 5430, 5440, 7420, 7430]),
            ('HP', 'EliteBook', [840, 850, 860, 1040, 1050]),
            ('Lenovo', 'ThinkPad', ['X1', 'T14', 'T15', 'P14s', 'P15s']),
            ('Apple', 'MacBook Pro', [13, 14, 15, 16]),
            ('ASUS', 'ZenBook', [13, 14, 15]),
        ]

        desktop_models = [
            ('HP', 'EliteDesk', [800, 805, 880]),
            ('Dell', 'OptiPlex', [3090, 5090, 7090, 9020]),
            ('Lenovo', 'ThinkCentre', ['M70', 'M75', 'M90']),
            ('Apple', 'Mac Mini', ['M1', 'M2']),
        ]

        monitor_models = [
            ('Dell', 'UltraSharp', ['U2720Q', 'U2723DE', 'U3223QE']),
            ('LG', '4K Monitor', ['27UK850', '27UP850', '32UN880']),
            ('Samsung', 'ViewFinity', ['S8', 'S9']),
            ('BenQ', 'Designer', ['PD2700U', 'PD3220U']),
        ]

        network_models = [
            ('Cisco', 'Catalyst', ['2960-X', '3650', '9300']),
            ('Ubiquiti', 'UniFi', ['Dream Machine', 'Switch Pro', 'Access Point']),
            ('Netgear', 'ProSafe', ['GS724T', 'GS748T']),
        ]

        printer_models = [
            ('HP', 'LaserJet', ['M404dn', 'M507dn', 'M608dn']),
            ('Canon', 'imageCLASS', ['MF445dw', 'MF743Cdw']),
            ('Epson', 'WorkForce', ['Pro WF-4830', 'Pro WF-C5790']),
        ]

        cpus = ['Intel Core i5-1135G7', 'Intel Core i7-1165G7', 'Intel Core i7-1185G7',
                'Intel Core i5-11400', 'Intel Core i7-11700', 'AMD Ryzen 5 5600G', 'AMD Ryzen 7 5700G']
        gpus = ['Intel Iris Xe Graphics', 'Intel UHD Graphics 630', 'Intel UHD Graphics 750',
                'AMD Radeon Graphics', 'NVIDIA GeForce GTX 1650']
        operating_systems = ['Windows 11 Pro', 'Windows 10 Pro', 'macOS Ventura', 'Ubuntu 22.04 LTS']
        ram_options = ['8GB DDR4', '16GB DDR4', '32GB DDR4', '16GB LPDDR4X', '64GB DDR4']
        storage_options = ['256GB NVMe SSD', '512GB NVMe SSD', '1TB NVMe SSD', '2TB NVMe SSD']

        products = []

        # Generate 40 Laptops (Category 1)
        for i in range(40):
            manufacturer, model_base, variants = random.choice(laptop_models)
            variant = random.choice(variants)
            model_num = f'{model_base}-{variant}-{i+1:03d}'

            products.append({
                'name': f'{manufacturer} {model_base} {variant} #{i+1}',
                'category': 1,  # Laptops category (from contexts)
                'manufacturer': random.randint(1, 10),  # Random manufacturer ID 1-10
                'depreciation': random.randint(1, 10),  # Random depreciation ID 1-10
                'model_number': model_num,
                'end_of_life': base_date + timedelta(days=random.randint(1095, 2190)),  # 3-6 years
                'default_purchase_cost': Decimal(str(round(random.uniform(899.99, 2499.99), 2))),
                'default_supplier': random.randint(1, 10),  # Random supplier ID 1-10
                'minimum_quantity': random.randint(2, 10),
                'cpu': random.choice(cpus),
                'gpu': random.choice(gpus),
                'os': random.choice(operating_systems),
                'ram': random.choice(ram_options),
                'storage': random.choice(storage_options),
                'notes': f'Business laptop model {i+1}',
            })

        # Generate 25 Desktops (Category 2)
        for i in range(25):
            manufacturer, model_base, variants = random.choice(desktop_models)
            variant = random.choice(variants)
            model_num = f'{model_base}-{variant}-{i+1:03d}'

            products.append({
                'name': f'{manufacturer} {model_base} {variant} #{i+1}',
                'category': 2,  # Desktops category (from contexts)
                'manufacturer': random.randint(1, 10),  # Random manufacturer ID 1-10
                'depreciation': random.randint(1, 10),  # Random depreciation ID 1-10
                'model_number': model_num,
                'end_of_life': base_date + timedelta(days=random.randint(1460, 2555)),  # 4-7 years
                'default_purchase_cost': Decimal(str(round(random.uniform(699.99, 1899.99), 2))),
                'default_supplier': random.randint(1, 10),  # Random supplier ID 1-10
                'minimum_quantity': random.randint(3, 8),
                'cpu': random.choice(cpus),
                'gpu': random.choice(gpus),
                'os': random.choice(operating_systems),
                'ram': random.choice(ram_options),
                'storage': random.choice(storage_options),
                'notes': f'Desktop workstation model {i+1}',
            })

        # Generate 15 Monitors (Category 3)
        for i in range(15):
            manufacturer, model_base, variants = random.choice(monitor_models)
            variant = random.choice(variants)
            model_num = f'{model_base}-{variant}-{i+1:03d}'

            products.append({
                'name': f'{manufacturer} {model_base} {variant} #{i+1}',
                'category': 3,  # Monitors category (from contexts)
                'manufacturer': random.randint(1, 10),  # Random manufacturer ID 1-10
                'model_number': model_num,
                'end_of_life': base_date + timedelta(days=random.randint(1095, 1825)),  # 3-5 years
                'default_purchase_cost': Decimal(str(round(random.uniform(299.99, 899.99), 2))),
                'default_supplier': random.randint(1, 10),  # Random supplier ID 1-10
                'minimum_quantity': random.randint(5, 15),
                'size': random.choice(['24-inch FHD', '27-inch 4K', '32-inch 4K', '34-inch UltraWide']),
                'notes': f'Professional monitor model {i+1}',
            })

        # Generate 10 Network Equipment (Category 4)
        for i in range(10):
            manufacturer, model_base, variants = random.choice(network_models)
            variant = random.choice(variants)
            model_num = f'{model_base}-{variant}-{i+1:03d}'

            products.append({
                'name': f'{manufacturer} {model_base} {variant} #{i+1}',
                'category': 4,  # Network Equipment category (from contexts)
                'manufacturer': random.randint(1, 10),  # Random manufacturer ID 1-10
                'model_number': model_num,
                'end_of_life': base_date + timedelta(days=random.randint(1825, 3650)),  # 5-10 years
                'default_purchase_cost': Decimal(str(round(random.uniform(299.99, 2999.99), 2))),
                'default_supplier': random.randint(1, 10),  # Random supplier ID 1-10
                'minimum_quantity': random.randint(1, 5),
                'notes': f'Network equipment model {i+1}',
            })

        # Generate 10 Printers (Category 5)
        for i in range(10):
            manufacturer, model_base, variants = random.choice(printer_models)
            variant = random.choice(variants)
            model_num = f'{model_base}-{variant}-{i+1:03d}'

            products.append({
                'name': f'{manufacturer} {model_base} {variant} #{i+1}',
                'category': 5,  # Printers category (from contexts)
                'manufacturer': random.randint(1, 10),  # Random manufacturer ID 1-10
                'model_number': model_num,
                'end_of_life': base_date + timedelta(days=random.randint(1095, 1825)),  # 3-5 years
                'default_purchase_cost': Decimal(str(round(random.uniform(199.99, 799.99), 2))),
                'default_supplier': random.randint(1, 10),  # Random supplier ID 1-10
                'minimum_quantity': random.randint(2, 8),
                'notes': f'Office printer model {i+1}',
            })

        return products


