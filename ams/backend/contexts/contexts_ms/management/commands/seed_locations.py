from django.core.management.base import BaseCommand
from contexts_ms.models import Location


class Command(BaseCommand):
    help = 'Seed the database with 10 location records'

    def add_arguments(self, parser):
        parser.add_argument(
            '--clear',
            action='store_true',
            help='Clear existing locations before seeding',
        )

    def handle(self, *args, **options):
        if options['clear']:
            self.stdout.write(self.style.WARNING('Clearing existing locations...'))
            Location.objects.all().delete()
            self.stdout.write(self.style.SUCCESS('Existing locations cleared.'))

        self.stdout.write(self.style.MIGRATE_HEADING('\n=== Seeding 10 Locations ==='))

        locations_data = self.get_locations_data()
        created_count = 0

        for location_data in locations_data:
            location, created = Location.objects.get_or_create(
                city=location_data['city'],
                zip=location_data['zip'],
                defaults=location_data
            )
            if created:
                created_count += 1
                self.stdout.write(self.style.SUCCESS(f'✓ Created: {location.city} ({location.zip})'))
            else:
                self.stdout.write(self.style.WARNING(f'- Location exists: {location.city}'))

        self.stdout.write(self.style.SUCCESS(f'\n✓ Locations seeding complete: {created_count} created'))

    def get_locations_data(self):
        """Generate 10 office locations in Metro Manila"""
        
        locations = [
            {'city': 'Makati', 'zip': '1200'},
            {'city': 'Pasig', 'zip': '1605'},
            {'city': 'Quezon City', 'zip': '1103'},
            {'city': 'Taguig', 'zip': '1634'},
            {'city': 'Mandaluyong', 'zip': '1550'},
            {'city': 'Manila', 'zip': '1000'},
            {'city': 'San Juan', 'zip': '1500'},
            {'city': 'Marikina', 'zip': '1800'},
            {'city': 'Parañaque', 'zip': '1700'},
            {'city': 'Las Piñas', 'zip': '1740'},
        ]
        
        return locations

