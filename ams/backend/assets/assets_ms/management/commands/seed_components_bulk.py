from django.core.management.base import BaseCommand
from django.utils import timezone
from assets_ms.models import Component
from decimal import Decimal
from datetime import timedelta
import random


class Command(BaseCommand):
    help = 'Seed the database with a large set of realistic component data'

    def add_arguments(self, parser):
        parser.add_argument(
            '--count',
            type=int,
            default=50,
            help='Number of components to create (default: 50)',
        )
        parser.add_argument(
            '--clear',
            action='store_true',
            help='Clear existing components before seeding',
        )

    def handle(self, *args, **options):
        if options['clear']:
            self.stdout.write(self.style.WARNING('Clearing existing components...'))
            Component.objects.all().delete()
            self.stdout.write(self.style.SUCCESS('Existing components cleared.'))

        count = options['count']
        
        # Component templates by category
        component_templates = {
            'RAM': [
                ('Kingston', ['4GB DDR4', '8GB DDR4', '16GB DDR4', '32GB DDR4']),
                ('Corsair', ['8GB DDR4', '16GB DDR4', '32GB DDR4']),
                ('Crucial', ['4GB DDR4', '8GB DDR4', '16GB DDR4']),
            ],
            'Storage': [
                ('Samsung', ['250GB SSD', '500GB SSD', '1TB SSD', '2TB HDD']),
                ('Western Digital', ['500GB HDD', '1TB HDD', '2TB HDD', '4TB HDD']),
                ('Crucial', ['250GB SSD', '500GB SSD', '1TB SSD']),
            ],
            'Peripherals': [
                ('Logitech', ['Wireless Mouse', 'Wired Mouse', 'Keyboard', 'Webcam']),
                ('Microsoft', ['Wireless Mouse', 'Keyboard', 'Ergonomic Mouse']),
                ('HP', ['Wired Mouse', 'Keyboard', 'USB Hub']),
            ],
            'Power': [
                ('Dell', ['65W Adapter', '90W Adapter', '130W Adapter']),
                ('HP', ['45W Adapter', '65W Adapter', '90W Adapter']),
                ('Lenovo', ['65W Adapter', '90W Adapter', '135W Adapter']),
            ],
            'Network': [
                ('TP-Link', ['5-Port Switch', '8-Port Switch', '16-Port Switch', 'WiFi Router']),
                ('Cisco', ['24-Port Switch', '48-Port Switch', 'Router']),
                ('Netgear', ['5-Port Switch', '8-Port Switch', 'WiFi Router']),
            ],
            'Cables': [
                ('Generic', ['HDMI Cable 6ft', 'HDMI Cable 10ft', 'USB-C Cable', 'DisplayPort Cable']),
                ('AmazonBasics', ['Ethernet Cable 10ft', 'Ethernet Cable 25ft', 'USB Cable']),
                ('Monoprice', ['HDMI Cable', 'DisplayPort Cable', 'Audio Cable']),
            ],
        }

        created_count = 0
        categories = list(component_templates.keys())
        
        for i in range(count):
            # Randomly select category
            category_name = random.choice(categories)
            category_id = categories.index(category_name) + 1
            
            # Randomly select manufacturer and product from that category
            manufacturer_name, products = random.choice(component_templates[category_name])
            product_name = random.choice(products)
            
            # Generate component data
            name = f'{manufacturer_name} {product_name}'
            model_number = f'{manufacturer_name[:3].upper()}-{random.randint(1000, 9999)}'
            
            # Random pricing based on category
            price_ranges = {
                'RAM': (30, 150),
                'Storage': (40, 200),
                'Peripherals': (10, 80),
                'Power': (20, 60),
                'Network': (15, 300),
                'Cables': (5, 30),
            }
            min_price, max_price = price_ranges[category_name]
            purchase_cost = Decimal(str(round(random.uniform(min_price, max_price), 2)))
            
            # Random quantities
            quantity = random.randint(5, 100)
            minimum_quantity = random.randint(3, 15)
            
            component_data = {
                'name': name,
                'category': category_id,
                'manufacturer': random.randint(1, 5),
                'supplier': random.randint(1, 3),
                'location': random.randint(1, 3),
                'model_number': model_number,
                'order_number': f'ORD-2024-{random.randint(1000, 9999)}',
                'purchase_date': timezone.now().date() - timedelta(days=random.randint(0, 365)),
                'purchase_cost': purchase_cost,
                'quantity': quantity,
                'minimum_quantity': minimum_quantity,
                'notes': f'{category_name} component - {manufacturer_name} brand',
            }

            try:
                component, created = Component.objects.get_or_create(
                    name=name,
                    model_number=model_number,
                    defaults=component_data
                )
                
                if created:
                    created_count += 1
                    if created_count % 10 == 0:
                        self.stdout.write(
                            self.style.SUCCESS(f'Created {created_count} components...')
                        )
            except Exception as e:
                self.stdout.write(
                    self.style.ERROR(f'Error creating component {name}: {str(e)}')
                )

        self.stdout.write(
            self.style.SUCCESS(
                f'\n✓ Bulk seeding complete! Created {created_count} new components out of {count} requested.'
            )
        )

