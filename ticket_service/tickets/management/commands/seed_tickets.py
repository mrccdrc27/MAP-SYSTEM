import os
import random
import shutil
import mimetypes
from datetime import datetime, timedelta
from urllib.parse import urljoin

from django.core.management.base import BaseCommand
from django.utils.timezone import make_aware
from django.conf import settings
from tickets.models import Ticket

# Constants
PRIORITIES = ['Low', 'Medium', 'High', 'Urgent']
STATUSES = ['Open']
NAMES = ['Alice Johnson', 'Bob Smith', 'Charlie Davis', 'Diana Martinez', 'Eve Wilson', 'Frank Brown', 'Grace Lee', 'Henry Taylor', 'Iris Chen', 'Jack Anderson']

# Folder paths
SAMPLE_FOLDER = os.path.join(settings.BASE_DIR, 'media/documents')
ATTACHMENT_UPLOAD_DIR = 'uploads/tickets'

# Valid workflow-aligned combinations
VALID_WORKFLOWS = [
    ("Asset Department", "Asset Category", "Asset Check-in"),
    ("Asset Department", "Asset Category", "Asset Check-out"),
    ("Budget Department", "Budget Category", "Project Proposal"),
    ("IT Department", "IT Category", "Access Request"),
    ("IT Department", "IT Category", "Software Installation"),
]

# Additional random categories and subcategories
RANDOM_CATEGORIES = [
    ("HR Department", "HR Category", ["Leave Request", "Payroll Issue", "New Hire Onboarding"]),
    ("Facilities", "Facility Category", ["Maintenance Request", "Room Booking", "Equipment Repair"]),
    ("Logistics", "Logistics Category", ["Delivery Request", "Inventory Check", "Shipping Issue"]),
]

# Realistic ticket templates per workflow
TICKET_TEMPLATES = {
    "Asset Check-in": [
        {
            "subject": "Return MacBook Pro 16\" M2 - Asset #{asset_id}",
            "description": "I am returning my assigned MacBook Pro as I have completed the {project} project. The device is in {condition} with all accessories included (charger, USB-C cable, carrying case). Asset tag #{asset_id} is intact and verified. The laptop has been backed up and factory reset per IT security policy. Please process check-in and update inventory."
        },
        {
            "subject": "Check-in Request: Dell Latitude 5420 Laptop - Serial #{serial}",
            "description": "Submitting check-in for Dell Latitude 5420 (Serial: {serial}). Equipment used for {duration} months, returning due to {reason}. Current condition: {condition}. All original packaging included. Battery health at {battery}%. Located at {location}. Request Asset Manager verification."
        },
        {
            "subject": "Equipment Return: iPhone 13 Pro Company Phone",
            "description": "Returning company iPhone 13 Pro issued on {date}. Device in {condition}, all functions working properly. Includes original charger and case. IMEI verified against records. Phone wiped and reset to factory settings. Return reason: {reason}."
        },
        {
            "subject": "Asset Handover: HP Monitor 27\" and Docking Station",
            "description": "Checking in HP 27\" monitor and docking station from home office setup. Both items in {condition}. All cables and power adapters included. Equipment no longer needed due to {reason}. Asset tags #{asset_id} verified. Ready for reallocation."
        },
    ],
    "Asset Check-out": [
        {
            "subject": "Laptop Request: MacBook Pro for Software Development",
            "description": "Requesting MacBook Pro for {project} project starting {start_date}. Duration: {duration} weeks. Required specs: 16GB RAM, 512GB SSD. Will be used at {location}. Manager {manager} approved on {approval_date}. Needed for: {task}. Understand responsibility for equipment care and timely return."
        },
        {
            "subject": "Equipment Needed: Projector for Client Presentation",
            "description": "Urgent request for presentation projector and screen for client meeting on {date}. Required from {start_date} to {end_date}. Location: {location}. Will be presenting {topic}. Manager approval obtained. Will follow all equipment handling guidelines."
        },
        {
            "subject": "Request: Microsoft Surface Pro for Field Work",
            "description": "Need Microsoft Surface Pro for field assignment at {location}. Assignment period: {duration} weeks starting {start_date}. Required for: {task}. Supervisor {manager} approved. Will maintain equipment properly and return on schedule. Business justification: {reason}."
        },
        {
            "subject": "Check-out: Wireless Headset for Remote Support Role",
            "description": "Requesting wireless headset for customer support role. Working remotely from {location}. Need professional audio equipment for client calls. Duration: permanent assignment. Manager {manager} approved request. Will use for {task}."
        },
    ],
    "Project Proposal": [
        {
            "subject": "Budget Proposal: {project} - ${budget}",
            "description": "Requesting ${budget} funding for {project}. \n\nObjective: {objective}\n\nBudget Breakdown:\n- Personnel: ${personnel}\n- Equipment: ${equipment}\n- Operations: ${operations}\n- Contingency: ${contingency}\n\nTimeline: {duration} months\nExpected ROI: {roi}%\nDepartment: {department}\nProject Manager: {manager}\n\nThis project will {benefit} and directly supports our goal to {goal}."
        },
        {
            "subject": "Funding Request: {project} Initiative",
            "description": "Submitting proposal for {project} requiring ${budget} budget allocation.\n\nBusiness Case: {business_case}\n\nKey Benefits:\n- {benefit1}\n- {benefit2}\n- {benefit3}\n\nProject Duration: {duration} months\nBreak-even: {breakeven} months\nRisk Level: {risk}\n\nManager: {manager}\nApproval needed by: {approval_date}"
        },
        {
            "subject": "Project Proposal: {project}",
            "description": "{project} proposal for {department} Department.\n\nBudget: ${budget}\nDuration: {duration} months\nTeam Size: {team_size} members\n\nJustification: {justification}\n\nExpected Outcomes:\n- {outcome1}\n- {outcome2}\n- {outcome3}\n\nRisks: {risk}\nMitigation: {mitigation}\n\nSponsor: {manager}"
        },
    ],
    "Access Request": [
        {
            "subject": "Access Request: {system} - {role} Role",
            "description": "Requesting {access_level} access to {system} for {role} position.\n\nBusiness Justification: {justification}\n\nRequired Permissions: {permissions}\nDuration: {duration}\nData Classification: {classification}\n\nManager Approval: {manager} ({approval_date})\nSecurity Training: Completed\n\nWill comply with all security policies and data handling procedures."
        },
        {
            "subject": "System Access: {system} for {purpose}",
            "description": "Need access to {system} starting {start_date}.\n\nPurpose: {purpose}\nAccess Type: {access_level}\nRequired for: {task}\n\nCompliance: {compliance}\nSupervisor: {manager}\nExpected Usage: {usage}\n\nThis access is critical for {critical_reason} and supports {project} project."
        },
        {
            "subject": "Urgent: {system} Access for Production Support",
            "description": "Urgent access request for {system}.\n\nRole: {role}\nAccess Level: {access_level}\nStart Date: {start_date}\n\nBusiness Need: {business_need}\nImpact if denied: {impact}\n\nManager {manager} approved. Security clearance: {clearance}. MFA enabled."
        },
    ],
    "Software Installation": [
        {
            "subject": "Software Install: {software} for {purpose}",
            "description": "Requesting installation of {software} (Version {version}) on workstation {device}.\n\nBusiness Purpose: {purpose}\nLicense Type: {license}\nCost: ${cost}\n\nJustification: {justification}\nWill improve {improvement} by {percentage}%.\n\nDevice: {device}\nOS: {os}\nManager Approval: {manager}\nBudget Code: {budget_code}"
        },
        {
            "subject": "Installation Request: {software} - {version}",
            "description": "Need {software} ({version}) installed for {purpose}.\n\nSoftware Details:\n- Publisher: {publisher}\n- License: {license}\n- Users: {users}\n\nBusiness Case: {business_case}\nProductivity Gain: {gain}\n\nSecurity Review: Approved\nCompliance: Verified\nManager: {manager}\nInstall Date: {install_date}"
        },
        {
            "subject": "{software} Installation for {department}",
            "description": "Installing {software} for {department} department use.\n\nPurpose: {purpose}\nVersion: {version}\nLicense Cost: ${cost}\n\nWill enable: {capability}\nTime Savings: {time_saved} hours/week\n\nScope: {scope}\nApprovals: Manager {manager}, IT Security, Budget approved\nTraining: {training}"
        },
    ],
    "Leave Request": [
        {
            "subject": "Annual Leave: {duration} Days - {month}",
            "description": "Requesting annual leave from {start_date} to {end_date} ({days} working days).\n\nReason: {reason}\n\nCoverage Plan: {colleague} will handle urgent matters. All current tasks will be completed or delegated.\n\nRemaining Balance: {balance} days\nManager: {manager}"
        },
    ],
    "Maintenance Request": [
        {
            "subject": "Maintenance: {issue} in {location}",
            "description": "Reporting {issue} in {location}.\n\nIssue noticed: {date_noticed}\nImpact: {impact} - Affecting {affected} employees\nUrgency: {urgency}\n\nPreferred service time: {service_time}\nReported by: {reporter}"
        },
    ],
}

def generate_ticket_content(subcategory):
    """Generate realistic subject and description based on subcategory."""
    
    if subcategory not in TICKET_TEMPLATES:
        # Generic template for non-workflow tickets
        return {
            "subject": f"{subcategory} Request",
            "description": f"This is a {subcategory} request requiring attention. Please review and process according to standard procedures. Additional details are provided in attachments."
        }
    
    template = random.choice(TICKET_TEMPLATES[subcategory])
    
    # Generate placeholder values
    placeholders = {
        "asset_id": f"AST{random.randint(10000, 99999)}",
        "serial": f"{random.randint(100000, 999999)}",
        "project": random.choice(["Digital Transformation", "Client Portal Upgrade", "Data Migration", "Infrastructure Modernization", "Marketing Campaign"]),
        "condition": random.choice(["excellent condition", "good condition with minor wear", "fair condition", "like new"]),
        "duration": random.choice(["3", "6", "12", "18"]),
        "reason": random.choice(["project completion", "role change", "department transfer", "equipment upgrade", "contract ended"]),
        "battery": random.randint(75, 98),
        "location": random.choice(["Head Office", "Remote Location", "Client Site", "Branch Office", "Home Office"]),
        "date": (datetime.now() - timedelta(days=random.randint(30, 180))).strftime("%B %Y"),
        "start_date": (datetime.now() + timedelta(days=random.randint(1, 14))).strftime("%B %d, %Y"),
        "end_date": (datetime.now() + timedelta(days=random.randint(30, 90))).strftime("%B %d, %Y"),
        "approval_date": (datetime.now() - timedelta(days=random.randint(1, 7))).strftime("%B %d, %Y"),
        "manager": random.choice(NAMES),
        "task": random.choice(["software development", "data analysis", "client presentations", "field testing", "document preparation"]),
        "topic": random.choice(["Q4 results", "product demo", "training session", "strategic planning"]),
        "budget": f"{random.randint(20, 200) * 1000:,}",
        "personnel": f"{random.randint(20, 80) * 1000:,}",
        "equipment": f"{random.randint(10, 40) * 1000:,}",
        "operations": f"{random.randint(5, 30) * 1000:,}",
        "contingency": f"{random.randint(5, 20) * 1000:,}",
        "roi": random.randint(15, 45),
        "objective": random.choice(["improve efficiency", "expand capacity", "enhance customer experience", "reduce costs"]),
        "department": random.choice(["Engineering", "Marketing", "Operations", "Sales", "Finance"]),
        "benefit": random.choice(["increase productivity", "improve quality", "reduce operational costs", "enhance collaboration"]),
        "goal": random.choice(["increase revenue", "improve customer satisfaction", "streamline operations", "expand market reach"]),
        "business_case": random.choice(["market expansion opportunity", "operational efficiency improvement", "customer demand", "competitive pressure"]),
        "benefit1": "Increased operational efficiency",
        "benefit2": "Improved customer satisfaction",
        "benefit3": "Reduced operational costs",
        "breakeven": random.randint(12, 36),
        "risk": random.choice(["Low", "Medium", "Moderate"]),
        "team_size": random.randint(3, 12),
        "justification": random.choice(["critical for project success", "required for compliance", "essential for daily operations", "needed for customer deliverables"]),
        "outcome1": "Improved efficiency and productivity",
        "outcome2": "Better resource utilization",
        "outcome3": "Enhanced service delivery",
        "mitigation": random.choice(["regular monitoring and reviews", "contingency planning", "phased implementation", "pilot testing"]),
        "system": random.choice(["Salesforce CRM", "SAP ERP", "Azure Portal", "GitHub Enterprise", "Jira", "AWS Console"]),
        "role": random.choice(["Software Developer", "Data Analyst", "Project Manager", "Sales Representative", "System Administrator"]),
        "access_level": random.choice(["Read-Only", "Read-Write", "Admin", "Contributor"]),
        "justification": random.choice(["required for job duties", "project requirement", "customer support", "compliance reporting"]),
        "permissions": random.choice(["Create, Read, Update", "Read-Only", "Full Admin", "Standard User"]),
        "classification": random.choice(["Confidential", "Internal", "Public", "Restricted"]),
        "purpose": random.choice(["daily operations", "project work", "data analysis", "system administration"]),
        "compliance": random.choice(["SOX", "GDPR", "HIPAA", "Standard"]),
        "usage": random.choice(["Daily 9-5", "As needed", "24/7 on-call", "Periodic"]),
        "critical_reason": random.choice(["meeting deadlines", "customer service", "compliance", "operational continuity"]),
        "business_need": random.choice(["project delivery", "customer support", "data processing", "system maintenance"]),
        "impact": random.choice(["project delays", "customer dissatisfaction", "missed deadlines", "revenue loss"]),
        "clearance": random.choice(["Standard", "Enhanced", "Confidential"]),
        "software": random.choice(["Adobe Creative Suite", "Microsoft Visual Studio", "AutoCAD", "Tableau Desktop", "Slack", "Docker Desktop"]),
        "version": random.choice(["2024", "2025", "Latest", "Enterprise"]),
        "device": f"WS-{random.randint(100, 999)}",
        "license": random.choice(["Named User", "Concurrent", "Enterprise", "Site License"]),
        "cost": random.randint(100, 2000),
        "improvement": random.choice(["productivity", "quality", "efficiency", "collaboration"]),
        "percentage": random.randint(15, 40),
        "os": random.choice(["Windows 11 Pro", "macOS Sonoma", "Ubuntu 22.04"]),
        "budget_code": f"DEPT-{random.randint(1000, 9999)}",
        "publisher": random.choice(["Microsoft", "Adobe", "Autodesk", "Oracle", "Atlassian"]),
        "users": random.randint(1, 25),
        "business_case": random.choice(["efficiency improvement", "capability enablement", "system replacement", "compliance requirement"]),
        "gain": random.choice(["20%", "35%", "50%"]),
        "install_date": (datetime.now() + timedelta(days=random.randint(3, 14))).strftime("%B %d, %Y"),
        "capability": random.choice(["automated workflows", "real-time collaboration", "advanced analytics", "integrated reporting"]),
        "time_saved": random.randint(5, 20),
        "scope": random.choice(["Single workstation", "Department-wide", "Team rollout"]),
        "training": random.choice(["Self-paced", "Instructor-led", "Documentation provided", "Not required"]),
        "month": (datetime.now() + timedelta(days=random.randint(14, 90))).strftime("%B %Y"),
        "days": random.randint(5, 15),
        "colleague": random.choice(NAMES),
        "balance": random.randint(5, 20),
        "issue": random.choice(["Air conditioning not working", "Leaking faucet", "Flickering lights", "Door lock malfunction", "Water cooler broken"]),
        "date_noticed": (datetime.now() - timedelta(days=random.randint(1, 3))).strftime("%B %d"),
        "impact": random.choice(["High", "Medium", "Low"]),
        "affected": random.randint(5, 50),
        "urgency": random.choice(["Urgent", "High Priority", "Standard"]),
        "service_time": random.choice(["Business hours", "After 5 PM", "Weekend", "Anytime"]),
        "reporter": random.choice(NAMES),
    }
    
    # Format template with placeholders
    subject = template["subject"].format(**placeholders)
    description = template["description"].format(**placeholders)
    
    return {"subject": subject, "description": description}

class Command(BaseCommand):
    help = "Seed tickets with comprehensive, realistic content based on workflow types."

    def handle(self, *args, **kwargs):
        self.stdout.write("📥 Seeding Tickets with realistic content...")

        if not os.path.isdir(SAMPLE_FOLDER):
            self.stdout.write(self.style.WARNING(f"⚠️ Attachment folder not found: {SAMPLE_FOLDER}"))
            sample_files = []
        else:
            # Ensure destination folder exists
            dest_dir = os.path.join(settings.MEDIA_ROOT, ATTACHMENT_UPLOAD_DIR)
            os.makedirs(dest_dir, exist_ok=True)

            # Gather sample files
            sample_files = [
                os.path.join(SAMPLE_FOLDER, f)
                for f in os.listdir(SAMPLE_FOLDER)
                if os.path.isfile(os.path.join(SAMPLE_FOLDER, f))
            ]

        # Generate 30 tickets total
        for i in range(30):
            # Mix of workflow and random tickets
            if i < len(VALID_WORKFLOWS) * 3:  # 15 workflow tickets (3 per workflow)
                department, category, subcategory = VALID_WORKFLOWS[i % len(VALID_WORKFLOWS)]
            else:  # 15 random category tickets
                dept, cat, subs = random.choice(RANDOM_CATEGORIES)
                department, category = dept, cat
                subcategory = random.choice(subs)

            # Generate dates
            submit_date = make_aware(datetime.now() - timedelta(days=random.randint(1, 30)))
            update_date = submit_date + timedelta(days=random.randint(0, 5))

            # Handle attachments
            attached_paths = []
            if sample_files:
                selected_files = random.sample(sample_files, k=random.randint(0, min(2, len(sample_files))))
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

            # Employee info
            name_parts = random.choice(NAMES).split()
            first_name = name_parts[0]
            last_name = name_parts[1] if len(name_parts) > 1 else "Doe"
            email = f"{first_name.lower()}.{last_name.lower()}@example.com"
            company_id = f"EMP{random.randint(1000, 9999)}"
            image_url = urljoin(settings.BASE_URL, "/media/employee_images/resized-placeholder.jpeg")

            employee = {
                "first_name": first_name,
                "last_name": last_name,
                "email": email,
                "company_id": company_id,
                "department": department,
                "image": image_url,
            }

            # Generate content
            content = generate_ticket_content(subcategory)

            # Create ticket (ticket_id will be auto-generated in format TXYYYYMMDD######)
            ticket = Ticket.objects.create(
                original_ticket_id=f"SRC-{random.randint(1000, 9999)}",
                employee=employee,
                subject=content["subject"],
                category=category,
                subcategory=subcategory,
                description=content["description"],
                scheduled_date=(submit_date + timedelta(days=random.randint(1, 7))).date(),
                submit_date=submit_date,
                update_date=update_date,
                assigned_to=random.choice(NAMES),
                priority=random.choice(PRIORITIES),
                status=random.choice(STATUSES),
                department=department,
                response_time=timedelta(hours=random.randint(1, 24)),
                resolution_time=timedelta(days=random.randint(1, 5)),
                time_closed=update_date + timedelta(days=random.randint(1, 3)) if random.random() > 0.7 else None,
                rejection_reason=None if random.random() > 0.15 else random.choice([
                    "Insufficient justification",
                    "Budget not available",
                    "Does not meet requirements",
                    "Alternative solution exists",
                ]),
                attachments=attached_paths,
                fetched_at=update_date,
            )

            self.stdout.write(self.style.SUCCESS(
                f"✅ Created: {ticket.ticket_id} - {ticket.subject[:50]}... ({subcategory})"
            ))

        self.stdout.write(self.style.SUCCESS(f"🎉 Successfully seeded 30 tickets with realistic content!"))