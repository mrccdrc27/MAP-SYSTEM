"""
Seed Asset Checkout Tickets for HDTS

This command creates asset checkout tickets that will be pushed to TTS workflow.
These tickets simulate employee requests to checkout company assets.

Usage:
    python manage.py seed_asset_checkout --count 10
    python manage.py seed_asset_checkout --count 5 --status Open
"""

from django.core.management.base import BaseCommand
from django.utils import timezone
from core.models import Ticket, Employee
import random
from datetime import datetime, timedelta
from decimal import Decimal

# Asset checkout specific data
DEVICE_TYPES = ['Laptop', 'Monitor', 'Printer', 'Projector', 'Mouse', 'Keyboard', 'Headset', 'Webcam', 'Docking Station']

ASSET_CATALOG = {
    'Laptop': [
        ('Dell Latitude 5420', 'LAP-DELL-001'),
        ('HP ProBook 450 G9', 'LAP-HP-002'),
        ('Lenovo ThinkPad X1 Carbon', 'LAP-LEN-003'),
        ('MacBook Pro 14"', 'LAP-MAC-004'),
        ('ASUS ZenBook 14', 'LAP-ASUS-005'),
    ],
    'Monitor': [
        ('Dell UltraSharp 27"', 'MON-DELL-001'),
        ('LG 27UK850-W', 'MON-LG-002'),
        ('Samsung 32" Curved', 'MON-SAM-003'),
        ('BenQ PD2700U', 'MON-BEN-004'),
    ],
    'Printer': [
        ('HP LaserJet Pro M404dn', 'PRT-HP-001'),
        ('Canon imageCLASS MF445dw', 'PRT-CAN-002'),
        ('Brother HL-L2350DW', 'PRT-BRO-003'),
    ],
    'Projector': [
        ('Epson PowerLite 2247U', 'PRJ-EPS-001'),
        ('BenQ MH535A', 'PRJ-BEN-002'),
        ('ViewSonic PA503W', 'PRJ-VSO-003'),
    ],
    'Mouse': [
        ('Logitech MX Master 3', 'MOU-LOG-001'),
        ('Microsoft Surface Mouse', 'MOU-MSF-002'),
        ('HP Wireless Mouse Z4000', 'MOU-HP-003'),
    ],
    'Keyboard': [
        ('Logitech K380', 'KEY-LOG-001'),
        ('Microsoft Ergonomic Keyboard', 'KEY-MSF-002'),
        ('HP Wireless Keyboard', 'KEY-HP-003'),
    ],
    'Headset': [
        ('Jabra Evolve2 75', 'HDS-JAB-001'),
        ('Poly Voyager Focus 2', 'HDS-PLY-002'),
        ('Logitech Zone Wireless', 'HDS-LOG-003'),
    ],
    'Webcam': [
        ('Logitech C920', 'WEB-LOG-001'),
        ('Microsoft LifeCam HD-3000', 'WEB-MSF-002'),
        ('Razer Kiyo', 'WEB-RAZ-003'),
    ],
    'Docking Station': [
        ('Dell WD19TB', 'DOC-DELL-001'),
        ('HP USB-C Dock G5', 'DOC-HP-002'),
        ('Lenovo ThinkPad USB-C Dock', 'DOC-LEN-003'),
    ],
}

LOCATIONS = [
    'Main Office - 1st Floor',
    'Main Office - 2nd Floor',
    'Main Office - 3rd Floor',
    'Branch Office - North',
    'Branch Office - South',
    'Warehouse',
    'Remote/Home Office',
    'Conference Room A',
    'Conference Room B',
    'IT Department',
]

CONDITIONS = [
    'New',
    'Excellent',
    'Good',
    'Fair',
]

PRIORITIES = ['Critical', 'High', 'Medium', 'Low']


class Command(BaseCommand):
    help = 'Seed Asset Checkout tickets for HDTS (to be pushed to TTS workflow)'

    def add_arguments(self, parser):
        parser.add_argument(
            '--count', 
            type=int, 
            default=10, 
            help='Number of tickets to create'
        )
        parser.add_argument(
            '--status', 
            type=str, 
            default='Open', 
            choices=['New', 'Open', 'In Progress', 'Resolved', 'Closed'],
            help='Status for the created tickets'
        )
        parser.add_argument(
            '--days-ago', 
            type=int, 
            default=0, 
            help='Create tickets as if submitted N days ago'
        )
        parser.add_argument(
            '--days-range', 
            type=int, 
            default=0, 
            help='Randomize days-ago within range'
        )

    def handle(self, *args, **options):
        count = options['count']
        ticket_status = options['status']
        days_ago = options['days_ago']
        days_range = options['days_range']

        self.stdout.write(self.style.MIGRATE_HEADING(
            f'Seeding {count} Asset Checkout tickets with status "{ticket_status}"...'
        ))

        if days_ago > 0:
            self.stdout.write(self.style.WARNING(
                f'⏳ SIMULATION MODE: Creating tickets {days_ago} days in the past'
                + (f' (±{days_range} days range)' if days_range > 0 else '')
            ))

        employees = list(Employee.objects.all())
        if not employees:
            self.stderr.write(self.style.ERROR(
                'No employees found. Please seed employees first: python manage.py seed_employees'
            ))
            return

        created = 0
        for i in range(count):
            employee = random.choice(employees)
            
            # Select random device type and asset
            device_type = random.choice(DEVICE_TYPES)
            asset_options = ASSET_CATALOG.get(device_type, [('Generic Asset', 'GEN-001')])
            asset_name, asset_id_base = random.choice(asset_options)
            
            # Generate unique asset ID and serial number
            asset_id_number = f"{asset_id_base}-{random.randint(1000, 9999)}"
            serial_number = f"SN-{random.randint(100000, 999999)}"
            
            # Generate dates
            checkout_date = datetime.now()
            expected_return_days = random.randint(7, 90)  # Return within 7-90 days
            expected_return_date = (checkout_date + timedelta(days=expected_return_days)).date()
            
            location = random.choice(LOCATIONS)
            condition = random.choice(CONDITIONS)
            priority = random.choice(PRIORITIES)
            
            # Build subject and description
            subject = f"Asset Checkout Request - {device_type} ({employee.company_id})"
            description = (
                f"Request to checkout {asset_name} ({device_type}).\n"
                f"Asset ID: {asset_id_number}\n"
                f"Serial Number: {serial_number}\n"
                f"Location: {location}\n"
                f"Expected Return: {expected_return_date}"
            )
            
            # Prepare dynamic data for additional fields
            dynamic_data = {
                'device_type': device_type,
                'checkout_to_name': f"{employee.first_name} {employee.last_name}",
                'checkout_to_id': employee.company_id,
                'checkout_purpose': random.choice([
                    'Work from home',
                    'Business travel',
                    'Project requirement',
                    'Equipment replacement',
                    'New hire setup',
                ]),
            }
            
            try:
                # Create ticket with initial 'New' status
                ticket = Ticket(
                    employee=employee,
                    subject=subject,
                    category='Asset Check Out',
                    sub_category=device_type,
                    description=description,
                    priority=priority,
                    department='Asset Department',
                    asset_name=asset_name,
                    serial_number=serial_number,
                    location=location,
                    expected_return_date=expected_return_date,
                    dynamic_data={
                        **dynamic_data,
                        'asset_id_number': asset_id_number,
                        'condition': condition,
                        'checkout_date': checkout_date.isoformat(),
                        'employee_name': f"{employee.first_name} {employee.last_name}",
                        'employee_company_id': employee.company_id,
                    },
                    status='New',
                )
                ticket.full_clean()
                ticket.save()
                
                # Backdate if requested
                if days_ago > 0:
                    actual_days_ago = days_ago
                    if days_range > 0:
                        actual_days_ago = random.randint(max(0, days_ago - days_range), days_ago)
                    
                    simulated_date = timezone.now() - timedelta(days=actual_days_ago)
                    Ticket.objects.filter(pk=ticket.pk).update(submit_date=simulated_date)
                    ticket.refresh_from_db()
                    self.stdout.write(f'  ⏳ Ticket {ticket.ticket_number} backdated to {simulated_date.date()}')
                
                # Update to target status (triggers workflow push if 'Open')
                if ticket_status != 'New':
                    ticket.status = ticket_status
                    ticket.save()
                
                created += 1
                self.stdout.write(self.style.SUCCESS(
                    f'✅ Created: {ticket.ticket_number} - {device_type} ({asset_id_number})'
                ))
                
            except Exception as e:
                self.stderr.write(self.style.ERROR(f'❌ Failed to create ticket #{i+1}: {e}'))

        self.stdout.write(self.style.SUCCESS(
            f'\n🎉 Finished creating {created} Asset Checkout tickets'
        ))
        
        if ticket_status == 'Open':
            self.stdout.write(self.style.WARNING(
                '📤 Open tickets will trigger Celery workflow push to TTS'
            ))
