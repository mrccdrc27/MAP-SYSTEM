from django.core.management.base import BaseCommand
from django.utils import timezone
from contexts_ms.models import Ticket
from datetime import timedelta
import random

# Shared date constants - must match seed_asset_checkouts.py in assets service
# Checkout dates: 60-90 days ago (earlier window)
# Checkin dates: must be AFTER checkout dates, so 1-30 days after checkout
CHECKOUT_DAYS_AGO_MIN = 60
CHECKOUT_DAYS_AGO_MAX = 90
CHECKIN_DAYS_AFTER_CHECKOUT_MIN = 1
CHECKIN_DAYS_AFTER_CHECKOUT_MAX = 30


class Command(BaseCommand):
    help = 'Seed the database with 80 ticket records (40 checkout + 40 checkin requests matched to asset statuses)'

    def add_arguments(self, parser):
        parser.add_argument(
            '--clear',
            action='store_true',
            help='Clear existing tickets before seeding',
        )

    def handle(self, *args, **options):
        if options['clear']:
            self.stdout.write(self.style.WARNING('Clearing existing tickets...'))
            Ticket.objects.all().delete()
            self.stdout.write(self.style.SUCCESS('Existing tickets cleared.'))

        self.stdout.write(self.style.MIGRATE_HEADING('\n=== Seeding 80 Tickets (40 Checkout + 40 Checkin) ==='))

        tickets_data = self.get_tickets_data()
        created_count = 0

        for i, ticket_data in enumerate(tickets_data, 1):
            ticket, created = Ticket.objects.get_or_create(
                ticket_number=ticket_data['ticket_number'],
                defaults=ticket_data
            )
            if created:
                created_count += 1
                if i % 10 == 0:
                    self.stdout.write(self.style.SUCCESS(f'✓ Created {i} tickets...'))
            else:
                self.stdout.write(self.style.WARNING(f'- Ticket exists: {ticket.ticket_number}'))

        self.stdout.write(self.style.SUCCESS(f'\n✓ Tickets seeding complete: {created_count} created'))

    def get_tickets_data(self):
        base_date = timezone.now()

        # Employee IDs (1-20 from seed_employees.py)
        employee_ids = list(range(1, 21))

        # Location IDs (1-10 from seed_locations.py)
        location_ids = list(range(1, 11))

        # Subjects for checkout requests
        checkout_subjects = [
            'Laptop needed for remote work',
            'Desktop computer for new employee',
            'Monitor for dual screen setup',
            'Network equipment for branch office',
            'Printer for department use',
            'Laptop for business trip',
            'Replacement device - hardware failure',
            'Additional monitor for productivity',
            'Desktop for temporary contractor',
            'Equipment for project work',
            'Laptop for field work',
            'Monitor for conference room',
            'Network switch for expansion',
            'Printer for satellite office',
            'Workstation for design team',
        ]

        # Subjects for checkin requests
        checkin_subjects = [
            'Returning laptop after project completion',
            'Equipment return - employee resignation',
            'Monitor return - no longer needed',
            'Desktop return - office relocation',
            'Printer return - department consolidation',
            'Laptop return - end of remote work',
            'Equipment return - project ended',
            'Monitor return - workspace change',
            'Network equipment return',
            'Printer return - upgrade to new model',
        ]

        tickets = []

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

        # IMPORTANT: Ticket logic based on asset status
        # - Assets with DEPLOYED status (IDs 3, 4) → Need CHECKIN tickets
        # - Assets with DEPLOYABLE status (IDs 1, 2) → Can have CHECKOUT tickets
        # - Other statuses → No active tickets

        # From seed_assets.py distribution:
        # - 40 assets are DEPLOYABLE (status 1-2) → 40 checkout tickets
        # - 40 assets are DEPLOYED (status 3-4) → 40 checkin tickets
        # - 20 assets are other statuses → No tickets

        # We'll create 80 tickets total (40 checkout + 40 checkin)
        # Tickets will be assigned to assets based on their expected status

        ticket_number_counter = 1

        # Create 40 CHECKOUT tickets for deployable assets
        # These will be for assets that are currently available (status 1-2)
        for i in range(40):
            asset_id = i + 1  # Assets 1-40 will have checkout tickets
            ticket_number = f'TKT{ticket_number_counter:03d}'
            ticket_number_counter += 1

            employee_id = random.choice(employee_ids)
            location_id = random.choice(location_ids)
            subject = random.choice(checkout_subjects)

            # Random date within last 90 days
            days_ago = random.randint(1, 90)
            created_date = base_date - timedelta(days=days_ago)
            checkout_date = (created_date + timedelta(days=random.randint(1, 3))).date()
            return_date = checkout_date + timedelta(days=random.randint(7, 90))

            # 30% resolved, 70% unresolved (so more buttons are visible)
            is_resolved = random.random() < 0.3

            ticket_data = {
                'ticket_number': ticket_number,
                'ticket_type': Ticket.TicketType.CHECKOUT,
                'employee': employee_id,
                'asset': asset_id,
                'subject': subject,
                'location': location_id,
                'checkout_date': checkout_date,
                'return_date': return_date,
                'checkin_date': None,  # NULL for checkout tickets
                'asset_checkout': None,  # NULL for checkout tickets
                'is_resolved': is_resolved,
            }
            tickets.append(ticket_data)

        # Create 40 CHECKIN tickets for deployed assets
        # These will be for assets that are currently checked out (status 3-4)
        # IMPORTANT: The asset_checkout IDs reference the AssetCheckout records
        # created by seed_asset_checkouts.py for assets 41-80
        #
        # IMPORTANT: Checkin date MUST be >= checkout date
        # Checkout dates are calculated as: base_date - (60 + i * 30/40) days
        # So we calculate checkout_date here and ensure checkin_date is after it
        for i in range(40):
            asset_id = i + 41  # Assets 41-80 will have checkin tickets
            ticket_number = f'TKT{ticket_number_counter:03d}'
            ticket_number_counter += 1

            employee_id = random.choice(employee_ids)
            location_id = random.choice(location_ids)
            subject = random.choice(checkin_subjects)

            # Calculate the same checkout_date that seed_asset_checkouts.py uses
            # This ensures checkin_date is always AFTER checkout_date
            checkout_days_ago = CHECKOUT_DAYS_AGO_MIN + (i * (CHECKOUT_DAYS_AGO_MAX - CHECKOUT_DAYS_AGO_MIN) // 40)
            checkout_date = (base_date - timedelta(days=checkout_days_ago)).date()

            # Checkin date must be AFTER checkout date (1-30 days after)
            days_after_checkout = random.randint(CHECKIN_DAYS_AFTER_CHECKOUT_MIN, CHECKIN_DAYS_AFTER_CHECKOUT_MAX)
            checkin_date = checkout_date + timedelta(days=days_after_checkout)

            # Reference to the AssetCheckout record (IDs 1-40 correspond to assets 41-80)
            # AssetCheckout ID 1 = Asset 41, ID 2 = Asset 42, ..., ID 40 = Asset 80
            asset_checkout_id = i + 1  # Checkout IDs 1-40

            # 30% resolved, 70% unresolved (so more buttons are visible)
            is_resolved = random.random() < 0.3

            ticket_data = {
                'ticket_number': ticket_number,
                'ticket_type': Ticket.TicketType.CHECKIN,
                'employee': employee_id,
                'asset': asset_id,
                'subject': subject,
                'location': location_id,
                'checkout_date': None,  # NULL for checkin tickets
                'return_date': None,  # NULL for checkin tickets
                'checkin_date': checkin_date,  # Has value for checkin tickets - ALWAYS after checkout_date
                'asset_checkout': asset_checkout_id,
                'is_resolved': is_resolved,
            }
            tickets.append(ticket_data)

        # Assets 81-100 will have NO tickets (undeployable, pending, archived statuses)

        return tickets

