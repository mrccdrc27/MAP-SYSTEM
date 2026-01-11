"""
Seed HDTS Tickets for AMS Asset Check-In/Check-Out Integration

This seeder creates tickets based on the AMS assets.json data structure.
It creates tickets that will be processed through TTS workflow and then
consumed by AMS for asset checkin/checkout operations.

The seeder reads from:
- /root/MAP-SYSTEM/tts/workflow_api/assets.json (fetched from AMS API)

Key fields for AMS integration:
- asset_id: The AMS asset ID (stored in dynamic_data)
- asset_id_number: The AMS asset_id string (e.g., "AST-20260110-00018-8EB6")
- location: Location ID from AMS
- checkout_date / return_date: For checkout tickets
- checkin_date: For checkin tickets
- asset_checkout: Reference to checkout record (for checkin tickets)

Usage:
    python manage.py seed_asset_tickets --count 10
    python manage.py seed_asset_tickets --type checkout --count 5
    python manage.py seed_asset_tickets --type checkin --count 5
    python manage.py seed_asset_tickets --days-ago 30 --days-range 30
"""

from django.core.management.base import BaseCommand
from django.utils import timezone
from core.models import Ticket, Employee
import random
import json
import os
from datetime import datetime, timedelta


# AMS Locations mapping (from assets.json location_details)
LOCATIONS = {
    1: 'Makati',
    2: 'Pasig',
    3: 'Quezon City',
    4: 'Taguig',
    5: 'Mandaluyong',
    6: 'Manila',
    7: 'San Juan',
    8: 'Marikina',
    9: 'Parañaque',
    10: 'Las Piñas',
}

# Subjects for checkout tickets
CHECKOUT_SUBJECTS = [
    'Laptop needed for remote work',
    'Equipment for project work',
    'Desktop computer for new employee',
    'Workstation for design team',
    'Printer for department use',
    'Monitor for conference room',
    'Network switch for expansion',
    'Replacement device - hardware failure',
    'Desktop for temporary contractor',
    'Printer for satellite office',
    'Additional monitor for productivity',
    'Laptop for business trip',
    'Monitor for dual screen setup',
]

# Subjects for checkin tickets
CHECKIN_SUBJECTS = [
    'Equipment return - employee resignation',
    'Printer return - department consolidation',
    'Monitor return - no longer needed',
    'Desktop return - office relocation',
    'Network equipment return',
    'Returning laptop after project completion',
    'Equipment return - project ended',
    'Laptop return - end of remote work',
    'Printer return - upgrade to new model',
    'Monitor return - workspace change',
]


class Command(BaseCommand):
    help = 'Seed HDTS tickets for AMS Asset Check-In/Check-Out based on assets.json'

    def add_arguments(self, parser):
        parser.add_argument('--count', type=int, default=10, help='Number of tickets to create')
        parser.add_argument('--type', type=str, choices=['checkout', 'checkin', 'both'], 
                          default='both', help='Type of tickets to create')
        parser.add_argument('--days-ago', type=int, default=0, 
                          help='Create tickets as if submitted N days ago')
        parser.add_argument('--days-range', type=int, default=0, 
                          help='Randomize days-ago within range')
        parser.add_argument('--assets-file', type=str, 
                          default='/app/assets.json',
                          help='Path to assets.json file')

    def handle(self, *args, **options):
        count = options['count']
        ticket_type = options['type']
        days_ago = options['days_ago']
        days_range = options['days_range']
        assets_file = options['assets_file']

        # Load assets from JSON file
        if not os.path.exists(assets_file):
            self.stderr.write(self.style.ERROR(f'Assets file not found: {assets_file}'))
            self.stderr.write('Please run: curl -s https://ams-assets.up.railway.app/assets/ > /root/MAP-SYSTEM/tts/workflow_api/assets.json')
            return

        with open(assets_file, 'r') as f:
            assets = json.load(f)

        self.stdout.write(f'Loaded {len(assets)} assets from {assets_file}')

        # Filter assets based on type
        # For checkout: Use deployable assets (Available, Ready to Deploy)
        # For checkin: Use deployed assets (Checked Out, In Use) with active_checkout
        deployable_assets = [a for a in assets if a.get('status_details', {}).get('type') == 'deployable']
        deployed_assets = [a for a in assets if a.get('active_checkout') is not None]

        self.stdout.write(f'  Deployable assets: {len(deployable_assets)}')
        self.stdout.write(f'  Deployed assets (for checkin): {len(deployed_assets)}')

        # Get employees
        employees = list(Employee.objects.all())
        if not employees:
            self.stderr.write(self.style.ERROR('No employees found. Please seed employees first.'))
            return

        self.stdout.write(f'Found {len(employees)} employees')

        # Show simulation mode info
        if days_ago > 0:
            self.stdout.write(self.style.WARNING(
                f'⏳ SIMULATION MODE: Creating tickets {days_ago} days in the past'
                + (f' (±{days_range} days range)' if days_range > 0 else '')
            ))

        created = 0
        
        # Determine how many of each type to create
        if ticket_type == 'both':
            checkout_count = count // 2
            checkin_count = count - checkout_count
        elif ticket_type == 'checkout':
            checkout_count = count
            checkin_count = 0
        else:
            checkout_count = 0
            checkin_count = count

        # Create CHECKOUT tickets
        if checkout_count > 0 and deployable_assets:
            self.stdout.write(self.style.NOTICE(f'\n📤 Creating {checkout_count} CHECKOUT tickets...'))
            for i in range(checkout_count):
                asset = random.choice(deployable_assets)
                employee = random.choice(employees)
                
                ticket = self._create_checkout_ticket(asset, employee, days_ago, days_range)
                if ticket:
                    created += 1
                    self.stdout.write(f'  ✓ {ticket.ticket_number} - Checkout: {asset.get("name")} (Asset ID: {asset.get("id")})')

        # Create CHECKIN tickets
        if checkin_count > 0 and deployed_assets:
            self.stdout.write(self.style.NOTICE(f'\n📥 Creating {checkin_count} CHECKIN tickets...'))
            for i in range(checkin_count):
                asset = random.choice(deployed_assets)
                employee = random.choice(employees)
                
                ticket = self._create_checkin_ticket(asset, employee, days_ago, days_range)
                if ticket:
                    created += 1
                    self.stdout.write(f'  ✓ {ticket.ticket_number} - Checkin: {asset.get("name")} (Asset ID: {asset.get("id")})')

        self.stdout.write(self.style.SUCCESS(f'\n✅ Finished creating {created} asset tickets'))

    def _create_checkout_ticket(self, asset, employee, days_ago, days_range):
        """Create an Asset Check Out ticket"""
        try:
            # Calculate checkout and return dates
            checkout_date = datetime.now().date() - timedelta(days=random.randint(0, 30))
            return_date = checkout_date + timedelta(days=random.randint(14, 90))
            
            # Get location from asset or random
            location_id = random.randint(1, 10)
            location_name = LOCATIONS.get(location_id, f'Location {location_id}')
            
            # Build ticket data
            ticket_kwargs = {
                'employee': employee,
                'subject': random.choice(CHECKOUT_SUBJECTS),
                'category': 'Asset Check Out',
                'sub_category': asset.get('product_details', {}).get('name', asset.get('name', '')),
                'description': f"Request to checkout asset: {asset.get('name')}\n\n"
                              f"Asset ID: {asset.get('asset_id')}\n"
                              f"Serial Number: {asset.get('serial_number')}\n"
                              f"Checkout Date: {checkout_date}\n"
                              f"Expected Return Date: {return_date}",
                'department': 'Asset Department',
                'priority': random.choice(['Critical', 'High', 'Medium', 'Low']),
                'asset_name': asset.get('name'),
                'serial_number': asset.get('serial_number'),
                'location': location_name,
                'expected_return_date': return_date,
                'dynamic_data': {
                    # Critical AMS fields
                    'asset_id': asset.get('id'),  # AMS asset primary key
                    'asset_id_number': asset.get('asset_id'),  # AMS asset_id string
                    'employee_id': employee.id,
                    'location_id': location_id,
                    # Employee details (required for ticket submission)
                    'employee': {
                        'email': employee.email,
                        'first_name': employee.first_name,
                        'last_name': employee.last_name,
                        'company_id': employee.company_id,
                        'department': employee.department,
                        'middle_name': employee.middle_name or '',
                        'suffix': employee.suffix or '',
                    },
                    # Checkout specific fields
                    'checkout_date': str(checkout_date),
                    'return_date': str(return_date),
                    # Asset metadata
                    'product_name': asset.get('product_details', {}).get('name'),
                    'status_name': asset.get('status_details', {}).get('name'),
                    'warranty_expiration': asset.get('warranty_expiration'),
                },
                'status': 'New',
            }

            ticket = Ticket(**ticket_kwargs)
            ticket.full_clean()
            ticket.save()

            # Backdate if specified
            if days_ago > 0:
                actual_days_ago = days_ago
                if days_range > 0:
                    actual_days_ago = random.randint(max(0, days_ago - days_range), days_ago)
                
                simulated_date = timezone.now() - timedelta(days=actual_days_ago)
                Ticket.objects.filter(pk=ticket.pk).update(submit_date=simulated_date)
                ticket.refresh_from_db()

            # Set to Open to trigger Celery workflow
            ticket.status = 'Open'
            ticket.save()

            return ticket

        except Exception as e:
            self.stderr.write(self.style.ERROR(f'Failed to create checkout ticket: {e}'))
            return None

    def _create_checkin_ticket(self, asset, employee, days_ago, days_range):
        """Create an Asset Check In ticket"""
        try:
            # Calculate checkin date
            checkin_date = datetime.now().date() - timedelta(days=random.randint(0, 60))
            
            # Get location from asset or random
            location_id = random.randint(1, 10)
            location_name = LOCATIONS.get(location_id, f'Location {location_id}')
            
            # Get the active checkout reference
            asset_checkout_id = asset.get('active_checkout')
            
            # Build ticket data
            ticket_kwargs = {
                'employee': employee,
                'subject': random.choice(CHECKIN_SUBJECTS),
                'category': 'Asset Check In',
                'sub_category': asset.get('product_details', {}).get('name', asset.get('name', '')),
                'description': f"Request to return asset: {asset.get('name')}\n\n"
                              f"Asset ID: {asset.get('asset_id')}\n"
                              f"Serial Number: {asset.get('serial_number')}\n"
                              f"Check-in Date: {checkin_date}\n"
                              f"Checkout Reference: {asset_checkout_id}",
                'department': 'Asset Department',
                'priority': random.choice(['Critical', 'High', 'Medium', 'Low']),
                'asset_name': asset.get('name'),
                'serial_number': asset.get('serial_number'),
                'location': location_name,
                'dynamic_data': {
                    # Critical AMS fields
                    'asset_id': asset.get('id'),  # AMS asset primary key
                    'asset_id_number': asset.get('asset_id'),  # AMS asset_id string
                    'employee_id': employee.id,
                    'location_id': location_id,
                    # Employee details (required for ticket submission)
                    'employee': {
                        'email': employee.email,
                        'first_name': employee.first_name,
                        'last_name': employee.last_name,
                        'company_id': employee.company_id,
                        'department': employee.department,
                        'middle_name': employee.middle_name or '',
                        'suffix': employee.suffix or '',
                    },
                    # Checkin specific fields
                    'checkin_date': str(checkin_date),
                    'asset_checkout': asset_checkout_id,  # Reference to checkout record
                    # Asset metadata
                    'product_name': asset.get('product_details', {}).get('name'),
                    'status_name': asset.get('status_details', {}).get('name'),
                    'warranty_expiration': asset.get('warranty_expiration'),
                },
                'status': 'New',
            }

            ticket = Ticket(**ticket_kwargs)
            ticket.full_clean()
            ticket.save()

            # Backdate if specified
            if days_ago > 0:
                actual_days_ago = days_ago
                if days_range > 0:
                    actual_days_ago = random.randint(max(0, days_ago - days_range), days_ago)
                
                simulated_date = timezone.now() - timedelta(days=actual_days_ago)
                Ticket.objects.filter(pk=ticket.pk).update(submit_date=simulated_date)
                ticket.refresh_from_db()

            # Set to Open to trigger Celery workflow
            ticket.status = 'Open'
            ticket.save()

            return ticket

        except Exception as e:
            self.stderr.write(self.style.ERROR(f'Failed to create checkin ticket: {e}'))
            return None
