from django.core.management.base import BaseCommand
from contexts_ms.models import Supplier


class Command(BaseCommand):
    help = 'Seed the database with 10 supplier records'

    def add_arguments(self, parser):
        parser.add_argument(
            '--clear',
            action='store_true',
            help='Clear existing suppliers before seeding',
        )

    def handle(self, *args, **options):
        if options['clear']:
            self.stdout.write(self.style.WARNING('Clearing existing suppliers...'))
            Supplier.objects.all().delete()
            self.stdout.write(self.style.SUCCESS('Existing suppliers cleared.'))

        self.stdout.write(self.style.MIGRATE_HEADING('\n=== Seeding 10 Suppliers ==='))

        suppliers_data = self.get_suppliers_data()
        created_count = 0

        for supplier_data in suppliers_data:
            supplier, created = Supplier.objects.get_or_create(
                name=supplier_data['name'],
                defaults=supplier_data
            )
            if created:
                created_count += 1
                self.stdout.write(self.style.SUCCESS(f'✓ Created: {supplier.name}'))
            else:
                self.stdout.write(self.style.WARNING(f'- Supplier exists: {supplier.name}'))

        self.stdout.write(self.style.SUCCESS(f'\n✓ Suppliers seeding complete: {created_count} created'))

    def get_suppliers_data(self):
        """Generate 10 realistic IT equipment suppliers

        Note: phone_number field is limited to 13 characters in the database
        """

        suppliers = [
            {
                'name': 'Tech Solutions Inc.',
                'address': '123 Ayala Avenue',
                'city': 'Makati',
                'state_province': 'Metro Manila',
                'country': 'Philippines',
                'zip': '1200',
                'contact_name': 'Juan dela Cruz',
                'phone_number': '028-123-4567',
                'fax': '+63-2-8123-4568',
                'email': 'sales@techsolutions.ph',
                'url': 'https://www.techsolutions.ph',
                'notes': 'Primary supplier for laptops and desktops',
            },
            {
                'name': 'Global IT Distributors',
                'address': '456 Ortigas Center',
                'city': 'Pasig',
                'state_province': 'Metro Manila',
                'country': 'Philippines',
                'zip': '1605',
                'contact_name': 'Maria Santos',
                'phone_number': '028-234-5678',
                'email': 'contact@globalit.ph',
                'url': 'https://www.globalit.ph',
                'notes': 'Specializes in network equipment',
            },
            {
                'name': 'Office Equipment Pro',
                'address': '789 BGC High Street',
                'city': 'Taguig',
                'state_province': 'Metro Manila',
                'country': 'Philippines',
                'zip': '1634',
                'contact_name': 'Roberto Reyes',
                'phone_number': '028-345-6789',
                'email': 'info@officeequipmentpro.ph',
                'url': 'https://www.officeequipmentpro.ph',
                'notes': 'Printers and office peripherals',
            },
            {
                'name': 'Computer World Manila',
                'address': '321 Quezon Avenue',
                'city': 'Quezon City',
                'state_province': 'Metro Manila',
                'country': 'Philippines',
                'zip': '1103',
                'contact_name': 'Ana Gonzales',
                'phone_number': '028-456-7890',
                'email': 'sales@computerworld.ph',
                'url': 'https://www.computerworld.ph',
                'notes': 'Wide range of computer components',
            },
            {
                'name': 'Enterprise Tech Supply',
                'address': '654 Shaw Boulevard',
                'city': 'Mandaluyong',
                'state_province': 'Metro Manila',
                'country': 'Philippines',
                'zip': '1552',
                'contact_name': 'Carlos Mendoza',
                'phone_number': '028-567-8901',
                'email': 'enterprise@techsupply.ph',
                'url': 'https://www.enterprisetechsupply.ph',
                'notes': 'Enterprise-grade hardware and servers',
            },
            {
                'name': 'Digital Solutions Hub',
                'address': '987 EDSA',
                'city': 'Mandaluyong',
                'state_province': 'Metro Manila',
                'country': 'Philippines',
                'zip': '1550',
                'contact_name': 'Lisa Tan',
                'phone_number': '028-678-9012',
                'email': 'hub@digitalsolutions.ph',
                'url': 'https://www.digitalsolutionshub.ph',
                'notes': 'Software and hardware solutions',
            },
            {
                'name': 'Network Systems Corp',
                'address': '147 Makati Avenue',
                'city': 'Makati',
                'state_province': 'Metro Manila',
                'country': 'Philippines',
                'zip': '1224',
                'contact_name': 'David Cruz',
                'phone_number': '028-789-0123',
                'email': 'sales@networksystems.ph',
                'url': 'https://www.networksystems.ph',
                'notes': 'Cisco and Ubiquiti authorized reseller',
            },
            {
                'name': 'PC Parts Warehouse',
                'address': '258 Boni Avenue',
                'city': 'Mandaluyong',
                'state_province': 'Metro Manila',
                'country': 'Philippines',
                'zip': '1554',
                'contact_name': 'Sarah Lim',
                'phone_number': '028-890-1234',
                'email': 'warehouse@pcparts.ph',
                'url': 'https://www.pcpartswarehouse.ph',
                'notes': 'Computer components and accessories',
            },
            {
                'name': 'Business Tech Partners',
                'address': '369 Jupiter Street',
                'city': 'Makati',
                'state_province': 'Metro Manila',
                'country': 'Philippines',
                'zip': '1209',
                'contact_name': 'Michael Ramos',
                'phone_number': '028-901-2345',
                'email': 'partners@businesstech.ph',
                'url': 'https://www.businesstechpartners.ph',
                'notes': 'Corporate IT solutions provider',
            },
            {
                'name': 'Smart IT Resources',
                'address': '741 Meralco Avenue',
                'city': 'Pasig',
                'state_province': 'Metro Manila',
                'country': 'Philippines',
                'zip': '1600',
                'contact_name': 'Jennifer Garcia',
                'phone_number': '028-012-3456',
                'email': 'resources@smartit.ph',
                'url': 'https://www.smartitresources.ph',
                'notes': 'IT equipment and maintenance services',
            },
        ]

        return suppliers

