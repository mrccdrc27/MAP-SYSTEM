import os
import random
import shutil
import mimetypes
from datetime import datetime, timedelta
from urllib.parse import urljoin
from decimal import Decimal, ROUND_HALF_UP

from django.core.management.base import BaseCommand
from django.utils.timezone import make_aware
from django.conf import settings
from tickets.models import Ticket

# Updated Constants based on the correct structure
CATEGORY_CHOICES = [
    'IT Support', 'Asset Check In', 'Asset Check Out', 'New Budget Proposal', 'Others'
]

IT_SUBCATS = [
    'Technical Assistance',
    'Software Installation/Update',
    'Hardware Troubleshooting',
    'Email/Account Access Issue',
    'Internet/Network Connectivity Issue',
    'Printer/Scanner Setup or Issue',
    'System Performance Issue',
    'Virus/Malware Check',
    'IT Consultation Request',
    'Data Backup/Restore',
]

DEVICE_TYPES = ['Laptop', 'Printer', 'Projector', 'Monitor', 'Other']

ASSET_NAMES = {
    'Laptop': ['Dell Latitude 5420', 'HP ProBook 450 G9', 'Lenovo ThinkPad X1'],
    'Printer': ['HP LaserJet Pro M404dn', 'Canon imageCLASS MF445dw'],
    'Projector': ['Epson PowerLite 2247U', 'BenQ MH535A'],
    'Mouse': ['Logitech MX Master 3', 'Microsoft Surface Mouse'],
    'Keyboard': ['Logitech K380', 'Microsoft Ergonomic Keyboard'],
}

LOCATIONS = [
    'Main Office - 1st Floor',
    'Main Office - 2nd Floor',
    'Main Office - 3rd Floor',
    'Branch Office - North',
    'Branch Office - South',
    'Warehouse',
    'Remote/Home Office',
]

BUDGET_SUBCATS = [
    'Capital Expenses (CapEx)',
    'Operational Expenses (OpEx)',
    'Reimbursement Claim (Liabilities)',
    'Charging Department (Cost Center)'
]

COST_ELEMENTS = {
    'Capital Expenses (CapEx)': ['Equipment', 'Software', 'Furniture'],
    'Operational Expenses (OpEx)': ['Utilities', 'Supplies', 'IT Services', 'Software Subscriptions'],
    'Reimbursement Claim (Liabilities)': ['Payable', 'Loans'],
    'Charging Department (Cost Center)': ['IT Operations', 'System Development', 'Infrastructure & Equipment', 'Training and Seminars'],
}

PRIORITIES = ['Critical', 'High', 'Medium', 'Low']
STATUSES = ['New', 'Open', 'In Progress', 'On Hold', 'Pending', 'Resolved', 'Rejected', 'Withdrawn', 'Closed']
NAMES = ['Alice Johnson', 'Bob Smith', 'Charlie Davis', 'Diana Martinez', 'Eve Wilson', 'Frank Brown', 'Grace Lee', 'Henry Taylor', 'Iris Chen', 'Jack Anderson']

# Folder paths
SAMPLE_FOLDER = os.path.join(settings.BASE_DIR, 'media/documents')
ATTACHMENT_UPLOAD_DIR = 'uploads/tickets'

# Realistic ticket templates per category/subcategory
TICKET_TEMPLATES = {
    "Technical Assistance": [
        {
            "subject": "Technical Support - {device} Issue ({company_id})",
            "description": "I am experiencing technical difficulties with my {device}. The issue is: {issue}. This is impacting my work productivity and I need assistance as soon as possible. Device location: {location}."
        },
        {
            "subject": "Help Needed - {device} Not Working Properly",
            "description": "My {device} has been experiencing problems since {date}. The specific issue is {issue}. I have tried basic troubleshooting but the problem persists. Please provide technical assistance."
        },
    ],
    "Software Installation/Update": [
        {
            "subject": "Software Installation Request - {software} ({company_id})",
            "description": "Requesting installation of {software} on my workstation. This software is required for {purpose}. Manager approval: {manager}. Preferred installation time: {time}."
        },
        {
            "subject": "Update Required - {software} to Latest Version",
            "description": "Need to update {software} to the latest version for {purpose}. Current version is causing {issue}. Business justification: {justification}."
        },
    ],
    "Hardware Troubleshooting": [
        {
            "subject": "Hardware Issue - {device} Malfunction ({company_id})",
            "description": "Reporting hardware malfunction with {device}. Problem: {issue}. First noticed on {date}. This is affecting my daily work tasks. Location: {location}."
        },
    ],
    "Asset Check Out": [
        {
            "subject": "Equipment Request - {asset_name} ({company_id})",
            "description": "Requesting checkout of {asset_name} for {purpose}. Expected usage period: {duration}. Location: {location}. Manager approval: {manager}. Will follow all equipment handling guidelines."
        },
        {
            "subject": "Asset Checkout Request - {asset_name}",
            "description": "Need to checkout {asset_name} for project work. Usage from {start_date} to {return_date}. Business justification: {justification}. Will ensure proper care and timely return."
        },
    ],
    "Asset Check In": [
        {
            "subject": "Equipment Return - {asset_name} ({company_id})",
            "description": "Returning {asset_name} (Serial: {serial}). Equipment condition: {condition}. All accessories included. Return reason: {reason}. Asset has been properly cleaned and reset."
        },
        {
            "subject": "Asset Return - {asset_name}",
            "description": "Checking in {asset_name} after completion of {project}. Equipment is in {condition} with {accessories}. Serial number {serial} verified."
        },
    ],
    "Capital Expenses (CapEx)": [
        {
            "subject": "CapEx Budget Request - {cost_element} ({company_id})",
            "description": "Requesting capital expenditure approval for {cost_element}. Amount: ₱{budget:,.2f}. Business justification: {justification}. Expected ROI: {roi}%. Project duration: {duration} months."
        },
    ],
    "Operational Expenses (OpEx)": [
        {
            "subject": "OpEx Budget Request - {cost_element} ({company_id})",
            "description": "Requesting operational expense budget for {cost_element}. Amount: ₱{budget:,.2f}. Monthly recurring: {recurring}. Justification: {justification}."
        },
    ],
}

def generate_ticket_content(category, subcategory, company_id, asset_name=None):
    """Generate realistic subject and description based on category and subcategory."""
    
    template_key = subcategory if subcategory in TICKET_TEMPLATES else category
    
    if template_key not in TICKET_TEMPLATES:
        # Generic template
        return {
            "subject": f"{category} - {subcategory or 'General Request'} ({company_id})",
            "description": f"This is a {category} request requiring attention. Please review and process according to standard procedures."
        }
    
    template = random.choice(TICKET_TEMPLATES[template_key])
    
    # Generate placeholder values
    placeholders = {
        "company_id": company_id,
        "device": random.choice(['Laptop', 'Desktop', 'Monitor', 'Printer', 'Phone']),
        "asset_name": asset_name or random.choice(['Dell Laptop', 'HP Printer', 'Monitor']),
        "serial": f"SN-{random.randint(100000, 999999)}",
        "issue": random.choice([
            "not turning on", "running slowly", "displaying error messages", 
            "connectivity problems", "unusual noises", "overheating"
        ]),
        "location": random.choice(LOCATIONS),
        "date": (datetime.now() - timedelta(days=random.randint(1, 7))).strftime("%B %d, %Y"),
        "software": random.choice([
            "Microsoft Office", "Adobe Creative Suite", "AutoCAD", 
            "Visual Studio", "Slack", "Zoom"
        ]),
        "purpose": random.choice([
            "daily work tasks", "project requirements", "client presentations", 
            "data analysis", "design work"
        ]),
        "manager": random.choice(NAMES),
        "time": random.choice(["during lunch break", "after hours", "morning", "anytime"]),
        "justification": random.choice([
            "required for project completion", "improves work efficiency", 
            "client requirement", "compliance necessity"
        ]),
        "duration": random.choice(["2 weeks", "1 month", "3 months", "6 months"]),
        "start_date": (datetime.now() + timedelta(days=1)).strftime("%B %d"),
        "return_date": (datetime.now() + timedelta(days=random.randint(7, 30))).strftime("%B %d"),
        "condition": random.choice(["excellent condition", "good condition", "fair condition"]),
        "reason": random.choice([
            "project completion", "department transfer", "equipment upgrade", "role change"
        ]),
        "project": random.choice([
            "client presentation project", "data migration", "system upgrade", "training program"
        ]),
        "accessories": random.choice([
            "all original accessories", "charger and cables", "carrying case included"
        ]),
        "cost_element": random.choice([
            "Equipment", "Software", "Furniture", "Utilities", "IT Services"
        ]),
        "budget": random.uniform(10000, 500000),
        "roi": random.randint(15, 35),
        "recurring": random.choice(["Yes", "No"]),
    }
    
    # Format template with placeholders
    subject = template["subject"].format(**placeholders)
    description = template["description"].format(**placeholders)
    
    return {"subject": subject, "description": description}

class Command(BaseCommand):
    help = "Seed tickets with comprehensive, realistic content based on correct category structure."

    def add_arguments(self, parser):
        parser.add_argument('--count', type=int, default=30, help='Number of tickets to create')

    def handle(self, *args, **options):
        count = options['count']
        self.stdout.write(f"📥 Seeding {count} Tickets with realistic content...")

        # Handle attachments
        if not os.path.isdir(SAMPLE_FOLDER):
            self.stdout.write(self.style.WARNING(f"⚠️ Attachment folder not found: {SAMPLE_FOLDER}"))
            sample_files = []
        else:
            dest_dir = os.path.join(settings.MEDIA_ROOT, ATTACHMENT_UPLOAD_DIR)
            os.makedirs(dest_dir, exist_ok=True)
            sample_files = [
                os.path.join(SAMPLE_FOLDER, f)
                for f in os.listdir(SAMPLE_FOLDER)
                if os.path.isfile(os.path.join(SAMPLE_FOLDER, f))
            ]

        created = 0
        for i in range(count):
            category = random.choice(CATEGORY_CHOICES)
            
            # Generate employee info
            name_parts = random.choice(NAMES).split()
            first_name = name_parts[0]
            last_name = name_parts[1] if len(name_parts) > 1 else "Doe"
            email = f"{first_name.lower()}.{last_name.lower()}@example.com"
            company_id = f"EMP{random.randint(1000, 9999)}"
            image_url = urljoin(settings.BASE_URL, "/media/employee_images/resized-placeholder.jpeg")

            ticket_kwargs = {}
            
            # Set employee info
            employee = {
                "first_name": first_name,
                "last_name": last_name,
                "email": email,
                "company_id": company_id,
                "image": image_url,
            }
            ticket_kwargs['employee'] = employee
            
            # Configure based on category
            if category == 'IT Support':
                subcategory = random.choice(IT_SUBCATS)
                device_type = random.choice(DEVICE_TYPES)
                
                ticket_kwargs['category'] = 'IT Support'
                ticket_kwargs['subcategory'] = subcategory
                ticket_kwargs['department'] = 'IT Department'  # ✅ Maps to IT Department
                ticket_kwargs['dynamic_data'] = {'device_type': device_type}
                
                if device_type in ASSET_NAMES:
                    asset = random.choice(ASSET_NAMES[device_type])
                    ticket_kwargs['asset_name'] = asset
                    ticket_kwargs['serial_number'] = f"SN-{abs(hash(asset)) % 1000000:06d}"
                
                ticket_kwargs['location'] = random.choice(LOCATIONS)
                content = generate_ticket_content(category, subcategory, company_id, ticket_kwargs.get('asset_name'))
                
            elif category in ('Asset Check In', 'Asset Check Out'):
                product = random.choice(list(ASSET_NAMES.keys()))
                asset_name = random.choice(ASSET_NAMES.get(product, [product]))
                
                ticket_kwargs['category'] = category
                ticket_kwargs['subcategory'] = product
                ticket_kwargs['asset_name'] = asset_name
                ticket_kwargs['serial_number'] = f"SN-{random.randint(100000,999999)}"
                ticket_kwargs['department'] = 'Asset Department'  # ✅ Maps to Asset Department
                
                if category == 'Asset Check Out':
                    days = random.randint(7, 60)
                    exp = datetime.now() + timedelta(days=days)
                    ticket_kwargs['expected_return_date'] = exp.date()
                
                content = generate_ticket_content(category, category, company_id, asset_name)
                
            elif category == 'New Budget Proposal':
                subcategory = random.choice(BUDGET_SUBCATS)
                
                ticket_kwargs['category'] = 'New Budget Proposal'
                ticket_kwargs['subcategory'] = subcategory
                ticket_kwargs['department'] = 'Budget Department'  # ✅ Maps to Budget Department
                
                # Add cost elements and budget
                if random.random() < 0.8:
                    cost_element = random.choice(COST_ELEMENTS.get(subcategory, []))
                    ticket_kwargs['cost_items'] = {'cost_element': cost_element}
                    budget_val = Decimal(str(round(random.uniform(10000, 500000), 2))).quantize(
                        Decimal('0.01'), rounding=ROUND_HALF_UP
                    )
                    ticket_kwargs['requested_budget'] = budget_val
                
                # Performance dates
                start = datetime.now().date()
                end = start + timedelta(days=random.randint(30, 365))
                ticket_kwargs['performance_start_date'] = start
                ticket_kwargs['performance_end_date'] = end
                
                content = generate_ticket_content(category, subcategory, company_id)
                
            else:  # Others
                ticket_kwargs['category'] = 'Others'
                ticket_kwargs['subcategory'] = None
                ticket_kwargs['department'] = 'IT Department'  # ✅ Maps Others to IT Department
                content = generate_ticket_content('Others', 'General Inquiry', company_id)
            
            # Set subject and description
            ticket_kwargs['subject'] = content["subject"]
            ticket_kwargs['description'] = content["description"]
            
            # Set status and related fields - all tickets will be "Open"
            status = 'Open'
            ticket_kwargs['status'] = status
            
            # Since all tickets are "Open" (not "New"), ensure they have priority and proper department
            ticket_kwargs['priority'] = random.choice(PRIORITIES)
            if not ticket_kwargs.get('department'):
                if category == 'IT Support':
                    ticket_kwargs['department'] = 'IT Department'
                elif category in ('Asset Check In', 'Asset Check Out'):
                    ticket_kwargs['department'] = 'Asset Department'
                elif category == 'New Budget Proposal':
                    ticket_kwargs['department'] = 'Budget Department'
                else:
                    ticket_kwargs['department'] = random.choice(['IT Department', 'Asset Department', 'Budget Department'])
            
            # Set dates
            submit_date = make_aware(datetime.now() - timedelta(days=random.randint(1, 30)))
            update_date = submit_date + timedelta(days=random.randint(0, 5))
            
            ticket_kwargs['submit_date'] = submit_date
            ticket_kwargs['update_date'] = update_date
            ticket_kwargs['fetched_at'] = update_date
            
            # Optional scheduled date
            if random.random() < 0.3:
                ticket_kwargs['scheduled_date'] = (submit_date + timedelta(days=random.randint(1, 14))).date()
            
            # Set other fields
            ticket_kwargs['original_ticket_id'] = f"SRC-{random.randint(1000, 9999)}"
            ticket_kwargs['assigned_to'] = random.choice(NAMES)
            ticket_kwargs['response_time'] = timedelta(hours=random.randint(1, 48))
            ticket_kwargs['resolution_time'] = timedelta(days=random.randint(1, 7))
            
            if status in ['Resolved', 'Closed'] and random.random() > 0.3:
                ticket_kwargs['time_closed'] = update_date + timedelta(days=random.randint(1, 3))
            
            # Handle attachments
            attached_paths = []
            if sample_files and random.random() < 0.4:  # 40% chance of attachments
                selected_files = random.sample(sample_files, k=random.randint(1, min(2, len(sample_files))))
                dest_dir = os.path.join(settings.MEDIA_ROOT, ATTACHMENT_UPLOAD_DIR)
                
                for file_path in selected_files:
                    filename = f"{datetime.now().timestamp()}_{os.path.basename(file_path)}"
                    destination_path = os.path.join(dest_dir, filename)
                    shutil.copy(file_path, destination_path)

                    relative_path = os.path.join(ATTACHMENT_UPLOAD_DIR, filename).replace("\\", "/")
                    full_url = urljoin(settings.BASE_URL, f"/media/{relative_path}")
                    file_stat = os.stat(destination_path)

                    attachment_data = {
                        "id": random.randint(50, 9999),
                        "file": full_url,
                        "file_name": os.path.basename(file_path),
                        "file_type": mimetypes.guess_type(file_path)[0] or "application/octet-stream",
                        "file_size": file_stat.st_size,
                        "upload_date": datetime.now().isoformat(),
                    }
                    attached_paths.append(attachment_data)
            
            ticket_kwargs['attachments'] = attached_paths

            # Create the ticket
            try:
                ticket = Ticket.objects.create(**ticket_kwargs)
                created += 1
                
                self.stdout.write(self.style.SUCCESS(
                    f"✅ Created: {ticket.ticket_id} - {ticket.subject[:50]}... ({ticket.category})"
                ))
                
                if created % 10 == 0:
                    self.stdout.write(self.style.SUCCESS(f'Created {created} tickets'))
                    
            except Exception as e:
                self.stderr.write(f'Failed to create ticket #{i+1}: {e}')

        self.stdout.write(self.style.SUCCESS(f"🎉 Successfully seeded {created} tickets with realistic content!"))