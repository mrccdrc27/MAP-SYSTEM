from django.core.management.base import BaseCommand
from contexts_ms.models import Manufacturer
import re


class Command(BaseCommand):
    help = 'Seed the database with 10 manufacturer records'

    def add_arguments(self, parser):
        parser.add_argument(
            '--clear',
            action='store_true',
            help='Clear existing manufacturers before seeding',
        )
        parser.add_argument(
            '--count',
            type=int,
            default=10,
            help='Number of manufacturers to seed (default: 10)'
        )

    def handle(self, *args, **options):
        if options['clear']:
            self.stdout.write(self.style.WARNING('Clearing existing manufacturers...'))
            Manufacturer.objects.all().delete()
            self.stdout.write(self.style.SUCCESS('Existing manufacturers cleared.'))

        count = int(options.get('count') or 10)
        self.stdout.write(self.style.MIGRATE_HEADING(f'\n=== Seeding {count} Manufacturers ==='))

        manufacturers_data = self.get_manufacturers_data(count)
        created_count = 0

        for manufacturer_data in manufacturers_data:
            manufacturer, created = Manufacturer.objects.get_or_create(
                name=manufacturer_data['name'],
                defaults=manufacturer_data
            )
            if created:
                created_count += 1
                self.stdout.write(self.style.SUCCESS(f'✓ Created: {manufacturer.name}'))
            else:
                self.stdout.write(self.style.WARNING(f'- Manufacturer exists: {manufacturer.name}'))

        self.stdout.write(self.style.SUCCESS(f'\n✓ Manufacturers seeding complete: {created_count} created'))

    def get_manufacturers_data(self, count=10):
        """Return a list of manufacturer dicts sized to `count`.

        Produces realistic manufacturer names for the first block and then
        synthetic but realistic-looking local vendors to reach the requested
        count. Phone numbers use Philippine mobile-style E.164 (+63...) values
        which fit the `support_phone` max length.
        """

        # Curated list of 50 distinct manufacturer/vendor names (no repeated generic
        # placeholders). We'll construct reasonable website/support info and
        # produce unique +63 phone numbers for each.
        names = [
            'Dell Technologies','HP Inc.','Lenovo','Apple Inc.','ASUS','Cisco Systems',
            'Ubiquiti Networks','Samsung Electronics','LG Electronics','Canon Inc.',
            'Microsoft','Acer','Seagate Technology','Western Digital','Intel Corporation',
            'AMD','Kingston','Netgear','TP-Link','Razer','Sennheiser','Epson','Brother',
            'Philips','BenQ','MSI','Gigabyte','Zotac','HyperX','Anker','Belkin','Logitech',
            'Sony','Panasonic','Toshiba','Sharp','Olympus','Fujitsu','HPE','Motorola',
            'BlackBerry','Alcatel','Xiaomi','Oppo','Vivo','Realme','Huawei','Dyson','Corsair'
        ]

        manufacturers = []
        for idx, name in enumerate(names[:count]):
            slug = re.sub(r"[^a-z0-9]", '', name.lower()) or f'manufacturer{idx+1}'
            website = f'https://{slug}.com'
            support_url = f'https://{slug}.com/support'
            email = f'support@{slug}.com'
            # Generate unique +63 mobile-like E.164 numbers: +6399xxxxxxx
            phone = f'+63{9}{8000000 + idx}'
            phone = phone[:16]
            manufacturers.append({
                'name': name,
                'website_url': website,
                'support_url': support_url,
                'support_phone': phone,
                'support_email': email,
                'notes': 'Seeded manufacturer entry',
            })

        # If count requested > len(names), generate additional unique names
        i = len(manufacturers)
        while len(manufacturers) < count:
            n = len(manufacturers) + 1
            name = f'Local Manufacturer {n}'
            slug = f'localmanufacturer{n}'
            website = f'https://{slug}.ph'
            support_url = f'{website}/support'
            email = f'contact@{slug}.ph'
            phone = f'+63{9}{8000000 + len(manufacturers)}'
            phone = phone[:16]
            manufacturers.append({
                'name': name,
                'website_url': website,
                'support_url': support_url,
                'support_phone': phone,
                'support_email': email,
                'notes': 'Generated local manufacturer',
            })

        return manufacturers[:count]

