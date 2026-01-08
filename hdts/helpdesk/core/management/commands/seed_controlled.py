import json
import csv
import random
import os
from datetime import datetime, timedelta
from decimal import Decimal, ROUND_HALF_UP
from django.core.management.base import BaseCommand
from django.utils import timezone
from core.models import Ticket, Employee

# Consistent choices with existing seeder
CATEGORY_CHOICES = ['IT Support', 'Asset Check In', 'Asset Check Out', 'New Budget Proposal', 'Others']
IT_SUBCATS = ['Technical Assistance', 'Software Installation/Update', 'Hardware Troubleshooting', 'Email/Account Access Issue', 'Internet/Network Connectivity Issue', 'Printer/Scanner Setup or Issue', 'System Performance Issue', 'Virus/Malware Check', 'IT Consultation Request', 'Data Backup/Restore']
DEVICE_TYPES = ['Laptop', 'Printer', 'Projector', 'Monitor', 'Other']
ASSET_NAMES = {
    'Laptop': ['Dell Latitude 5420', 'HP ProBook 450 G9', 'Lenovo ThinkPad X1'],
    'Printer': ['HP LaserJet Pro M404dn', 'Canon imageCLASS MF445dw'],
    'Projector': ['Epson PowerLite 2247U', 'BenQ MH535A'],
    'Mouse': ['Logitech MX Master 3', 'Microsoft Surface Mouse'],
    'Keyboard': ['Logitech K380', 'Microsoft Ergonomic Keyboard'],
}
PRIORITIES = ['Critical', 'High', 'Medium', 'Low']
LOCATIONS = ['Main Office - 1st Floor', 'Main Office - 2nd Floor', 'Main Office - 3rd Floor', 'Branch Office - North', 'Branch Office - South', 'Warehouse', 'Remote/Home Office']
BUDGET_SUBCATS = ['Capital Expenses (CapEx)', 'Operational Expenses (OpEx)', 'Reimbursement Claim (Liabilities)', 'Charging Department (Cost Center)']
COST_ELEMENTS = {
    'Capital Expenses (CapEx)': ['Equipment', 'Software', 'Furniture'],
    'Operational Expenses (OpEx)': ['Utilities', 'Supplies', 'IT Services', 'Software Subscriptions'],
    'Reimbursement Claim (Liabilities)': ['Payable', 'Loans'],
    'Charging Department (Cost Center)': ['IT Operations', 'System Development', 'Infrastructure & Equipment', 'Training and Seminars'],
}

class Command(BaseCommand):
    help = 'Seed tickets with a controlled historical pattern from a JSON or CSV file'

    def add_arguments(self, parser):
        parser.add_argument('file', type=str, nargs='?', help='Path to the seed plan JSON or CSV file')

    def handle(self, *args, **options):
        file_path = options['file']
        
        if not file_path:
            # List available csv/json files in current directory or hdts/helpdesk to help the user
            cwd = os.getcwd()
            # Expanded filter to include 'ticket' or 'historical' patterns
            files = [f for f in os.listdir(cwd) if f.endswith(('.csv', '.json')) and any(k in f.lower() for k in ['seed', 'plan', 'ticket', 'historical'])]
            
            if files:
                self.stdout.write(self.style.SUCCESS("\nAvailable seed files in current directory:"))
                for i, f in enumerate(files):
                    self.stdout.write(f"  [{i}] {f}")
                
                try:
                    val = input("\nEnter file index or path (default 'historical_seed_plan.csv'): ").strip()
                    if not val:
                        file_path = 'historical_seed_plan.csv'
                    elif val.isdigit() and int(val) < len(files):
                        file_path = files[int(val)]
                    else:
                        file_path = val
                except EOFError:
                    file_path = 'historical_seed_plan.csv'
            else:
                file_path = 'historical_seed_plan.csv'

        if not os.path.exists(file_path):
            self.stderr.write(f'File not found: {file_path}')
            return

        plan = []
        ext = os.path.splitext(file_path)[1].lower()

        try:
            if ext == '.json':
                with open(file_path, 'r') as f:
                    plan = json.load(f)
            elif ext == '.csv':
                with open(file_path, 'r', encoding='utf-8') as f:
                    reader = csv.DictReader(f)
                    for row in reader:
                        plan.append({
                            'days_ago': int(row.get('days_ago', 0) or 0),
                            'date': row.get('date'),
                            'time': row.get('time'),
                            'tickets': [{
                                'category': row.get('category'),
                                'sub_category': row.get('sub_category'),
                                'count': int(row.get('count', 1) or 1),
                                'priority': row.get('priority'),
                                'department': row.get('department')
                            }]
                        })
            else:
                self.stderr.write(f'Unsupported file extension: {ext}')
                return
        except Exception as e:
            self.stderr.write(f'Failed to parse file: {e}')
            return

        employees = list(Employee.objects.all())
        if not employees:
            self.stderr.write('No employees found. Please seed employees first.')
            return

        total_created = 0
        for entry in plan:
            days_ago = entry.get('days_ago', 0)
            date_str = entry.get('date')
            time_str = entry.get('time') or "09:00"
            
            # Precise datetime parsing
            if date_str:
                dt_str = f"{date_str} {time_str}"
                try:
                    simulated_date = timezone.make_aware(datetime.strptime(dt_str, '%Y-%m-%d %H:%M'))
                except ValueError:
                    try:
                        simulated_date = timezone.make_aware(datetime.strptime(date_str, '%Y-%m-%d'))
                    except ValueError:
                        self.stderr.write(f"Invalid date format: {date_str}")
                        continue
            else:
                # Calculate date from days_ago
                base_dt = timezone.now() - timedelta(days=days_ago)
                try:
                    time_obj = datetime.strptime(time_str, '%H:%M').time()
                    simulated_date = timezone.make_aware(datetime.combine(base_dt.date(), time_obj))
                except ValueError:
                    simulated_date = base_dt

            self.stdout.write(self.style.WARNING(f'📅 Processing pattern for: {simulated_date}'))

            for spec in entry.get('tickets', []):
                count = spec.get('count', 1)
                category = spec.get('category')
                sub_category = spec.get('sub_category')
                priority = spec.get('priority')
                department = spec.get('department')

                for i in range(count):
                    # Slight jitter to avoid exact collisions on the same second
                    offset_date = simulated_date + timedelta(minutes=i * 2) 
                    t = self.create_controlled_ticket(
                        offset_date, 
                        employees,
                        category=category,
                        sub_category=sub_category,
                        priority=priority,
                        department=department
                    )
                    if t:
                        total_created += 1

        self.stdout.write(self.style.SUCCESS(f'✅ Finished! Created total of {total_created} tickets across historical pattern.'))

    def create_controlled_ticket(self, simulated_date, employees, **overrides):
        employee = random.choice(employees)
        category = overrides.get('category') or random.choice(CATEGORY_CHOICES)
        
        # Generate custom ticket number aligned with simulated date
        date_part = simulated_date.strftime('%Y%m%d')
        rand = f"{random.randint(0, 999999):06d}"
        ticket_number = f"TX{date_part}{rand}"

        ticket_kwargs = {
            'ticket_number': ticket_number,
            'employee': employee,
            'category': category,
            'status': 'New',
            'description': f'Controlled historical seed ticket for {category}.',
        }

        # Sub-category logic
        if category == 'IT Support':
            ticket_kwargs['sub_category'] = overrides.get('sub_category') or random.choice(IT_SUBCATS)
            ticket_kwargs['department'] = overrides.get('department') or 'IT Department'
            device = random.choice(DEVICE_TYPES)
            ticket_kwargs['dynamic_data'] = {'device_type': device}
            if device in ASSET_NAMES:
                asset = random.choice(ASSET_NAMES[device])
                ticket_kwargs['asset_name'] = asset
                ticket_kwargs['serial_number'] = f"SN-{abs(hash(asset)) % 1000000:06d}"
            ticket_kwargs['location'] = random.choice(LOCATIONS)
        
        elif category in ('Asset Check In', 'Asset Check Out'):
            ticket_kwargs['sub_category'] = overrides.get('sub_category') or random.choice(list(ASSET_NAMES.keys()))
            ticket_kwargs['department'] = overrides.get('department') or 'Asset Department'
            ticket_kwargs['asset_name'] = random.choice(ASSET_NAMES.get(ticket_kwargs['sub_category'], ['Generic Asset']))
            ticket_kwargs['serial_number'] = f"SN-{random.randint(100000, 999999)}"
        
        elif category == 'New Budget Proposal':
            sub = overrides.get('sub_category') or random.choice(BUDGET_SUBCATS)
            ticket_kwargs['sub_category'] = sub
            ticket_kwargs['department'] = overrides.get('department') or 'Budget Department'
            ce = random.choice(COST_ELEMENTS.get(sub, ['General']))
            ticket_kwargs['cost_items'] = {'cost_element': ce}
            val = Decimal(str(round(random.uniform(1000, 500000), 2))).quantize(Decimal('0.01'), rounding=ROUND_HALF_UP)
            ticket_kwargs['requested_budget'] = val
            ticket_kwargs['performance_start_date'] = simulated_date.date()
            ticket_kwargs['performance_end_date'] = simulated_date.date() + timedelta(days=365)
        
        else:
            ticket_kwargs['department'] = overrides.get('department') or 'IT Department'

        # Global overrides
        ticket_kwargs['priority'] = overrides.get('priority') or random.choice(PRIORITIES)
        
        # Unique Subject
        descriptor = ticket_kwargs.get('sub_category') or 'General'
        ticket_kwargs['subject'] = f"{category} - {descriptor} ({employee.company_id}) {simulated_date.strftime('%Y%m%d%H%M%S')}"

        try:
            t = Ticket(**ticket_kwargs)
            t.full_clean()
            t.save()
            
            # Force backdate
            Ticket.objects.filter(pk=t.pk).update(submit_date=simulated_date)
            t.refresh_from_db()
            
            # Trigger workflow
            t.status = 'Open'
            t.save()
            
            return t
        except Exception as e:
            self.stderr.write(f'Error creating ticket: {e}')
            return None
