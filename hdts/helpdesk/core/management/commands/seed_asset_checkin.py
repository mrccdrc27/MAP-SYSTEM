"""
Seed Asset Check-In Tickets for HDTS

This command creates asset check-in tickets that will be pushed to TTS workflow.
These tickets simulate employee requests to check-in (return) company assets.

The check-in tickets can reference existing checkout tickets to simulate
returning previously checked-out assets.

Usage:
    python manage.py seed_asset_checkin --count 10
    python manage.py seed_asset_checkin --count 5 --status Open
    python manage.py seed_asset_checkin --count 5 --reference-checkout
"""

from django.core.management.base import BaseCommand
from django.utils import timezone
from core.models import Ticket, Employee
import random
from datetime import datetime, timedelta

# Asset check-in specific data
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
    'IT Department',
    'Asset Storage Room',
]

RETURN_CONDITIONS = [
    ('Excellent', 'Asset returned in excellent condition'),
    ('Good', 'Asset returned in good working condition'),
    ('Fair', 'Asset returned with minor wear'),
    ('Damaged', 'Asset returned with damage - requires inspection'),
    ('Needs Repair', 'Asset requires repair before redeployment'),
]

CHECKIN_REASONS = [
    'End of project',
    'Employee transfer',
    'Equipment upgrade',
    'No longer needed',
    'Returning from WFH',
    'Contract ended',
    'Asset replacement',
]

PRIORITIES = ['Critical', 'High', 'Medium', 'Low']


class Command(BaseCommand):
    help = 'Seed Asset Check-In tickets for HDTS (to be pushed to TTS workflow)'

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
        parser.add_argument(
            '--reference-checkout',
            action='store_true',
            help='Link check-in tickets to existing checkout tickets'
        )

    def handle(self, *args, **options):
        count = options['count']
        ticket_status = options['status']
        days_ago = options['days_ago']
        days_range = options['days_range']
        reference_checkout = options['reference_checkout']

        self.stdout.write(self.style.MIGRATE_HEADING(
            f'Seeding {count} Asset Check-In tickets with status "{ticket_status}"...'
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

        # Get existing checkout tickets for reference
        checkout_tickets = []
        if reference_checkout:
            checkout_tickets = list(
                Ticket.objects.filter(category='Asset Check Out')
                .exclude(status='Closed')
                .order_by('-submit_date')[:50]
            )
            if checkout_tickets:
                self.stdout.write(self.style.SUCCESS(
                    f'📋 Found {len(checkout_tickets)} checkout tickets for reference'
                ))
            else:
                self.stdout.write(self.style.WARNING(
                    '⚠️ No checkout tickets found. Creating standalone check-in tickets.'
                ))

        created = 0
        for i in range(count):
            employee = random.choice(employees)
            
            checkout_reference = None
            asset_name = None
            asset_id_number = None
            serial_number = None
            device_type = None
            
            # Try to use checkout ticket reference
            if reference_checkout and checkout_tickets:
                checkout_ticket = random.choice(checkout_tickets)
                checkout_reference = checkout_ticket.ticket_number
                
                # Extract asset info from checkout ticket
                asset_name = checkout_ticket.asset_name
                serial_number = checkout_ticket.serial_number
                device_type = checkout_ticket.sub_category
                
                # Get asset_id_number from dynamic_data if available
                if checkout_ticket.dynamic_data:
                    asset_id_number = checkout_ticket.dynamic_data.get('asset_id_number')
                
                # Use the same employee from checkout
                employee = checkout_ticket.employee or employee
                
                self.stdout.write(f'  📎 Referencing checkout ticket: {checkout_reference}')
            
            # Generate new asset info if not from reference
            if not device_type:
                device_type = random.choice(DEVICE_TYPES)
            
            if not asset_name:
                asset_options = ASSET_CATALOG.get(device_type, [('Generic Asset', 'GEN-001')])
                asset_name, asset_id_base = random.choice(asset_options)
                asset_id_number = f"{asset_id_base}-{random.randint(1000, 9999)}"
            
            if not serial_number:
                serial_number = f"SN-{random.randint(100000, 999999)}"
            
            if not asset_id_number:
                asset_id_base = asset_name[:3].upper() if asset_name else 'AST'
                asset_id_number = f"{asset_id_base}-{random.randint(1000, 9999)}"
            
            # Generate check-in date (today or based on expected return date)
            checkin_date = datetime.now().date()
            
            location = random.choice(LOCATIONS)
            condition, condition_note = random.choice(RETURN_CONDITIONS)
            priority = random.choice(PRIORITIES)
            checkin_reason = random.choice(CHECKIN_REASONS)
            
            # Build subject and description
            subject = f"Asset Check-In Request - {device_type} ({employee.company_id})"
            description = (
                f"Request to check-in/return {asset_name} ({device_type}).\n"
                f"Asset ID: {asset_id_number}\n"
                f"Serial Number: {serial_number}\n"
                f"Return Location: {location}\n"
                f"Condition: {condition} - {condition_note}\n"
                f"Reason: {checkin_reason}"
            )
            
            if checkout_reference:
                description += f"\nCheckout Reference: {checkout_reference}"
            
            # Prepare dynamic data
            dynamic_data = {
                'device_type': device_type,
                'asset_id_number': asset_id_number,
                'checkin_date': checkin_date.isoformat(),
                'condition': condition,
                'condition_notes': condition_note,
                'checkin_reason': checkin_reason,
                'return_location': location,
                'employee_name': f"{employee.first_name} {employee.last_name}",
                'employee_company_id': employee.company_id,
            }
            
            if checkout_reference:
                dynamic_data['checkout_ticket_reference'] = checkout_reference
            
            try:
                # Create ticket with initial 'New' status
                ticket = Ticket(
                    employee=employee,
                    subject=subject,
                    category='Asset Check In',
                    sub_category=device_type,
                    description=description,
                    priority=priority,
                    department='Asset Department',
                    asset_name=asset_name,
                    serial_number=serial_number,
                    location=location,
                    dynamic_data=dynamic_data,
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
                ref_info = f' (ref: {checkout_reference})' if checkout_reference else ''
                self.stdout.write(self.style.SUCCESS(
                    f'✅ Created: {ticket.ticket_number} - {device_type} ({asset_id_number}){ref_info}'
                ))
                
            except Exception as e:
                self.stderr.write(self.style.ERROR(f'❌ Failed to create ticket #{i+1}: {e}'))

        self.stdout.write(self.style.SUCCESS(
            f'\n🎉 Finished creating {created} Asset Check-In tickets'
        ))
        
        if ticket_status == 'Open':
            self.stdout.write(self.style.WARNING(
                '📤 Open tickets will trigger Celery workflow push to TTS'
            ))
