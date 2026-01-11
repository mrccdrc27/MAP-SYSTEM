"""
Management command to seed resolved tickets for employeeaccount@gmail.com
These tickets can be closed by the employee later.
"""
from django.core.management.base import BaseCommand
from django.utils import timezone
from core.models import Ticket, Employee
from datetime import timedelta
import random
import uuid


class Command(BaseCommand):
    help = 'Seed resolved tickets for employeeaccount@gmail.com'

    def handle(self, *args, **options):
        # Get the employee account
        try:
            employee = Employee.objects.get(email='employeeaccount@gmail.com')
            self.stdout.write(self.style.SUCCESS(f'Found employee: {employee.email}'))
        except Employee.DoesNotExist:
            self.stdout.write(self.style.ERROR('employeeaccount@gmail.com not found!'))
            self.stdout.write('Creating employee account...')
            employee = Employee.objects.create_user(
                email='employeeaccount@gmail.com',
                password='Employee123!',
                first_name='Employee',
                last_name='Account',
                company_id=f'EMP-{uuid.uuid4().hex[:8].upper()}'
            )
            self.stdout.write(self.style.SUCCESS('Created employeeaccount@gmail.com'))

        # Get a coordinator to assign as resolver (or None)
        coordinator = Employee.objects.exclude(email='employeeaccount@gmail.com').first()

        created_count = 0
        now = timezone.now()

        # Resolved tickets data - various categories
        resolved_tickets = [
            # IT Support - Resolved
            {
                'subject': 'Cannot connect to company VPN from home',
                'category': 'IT Support',
                'sub_category': 'Internet/Network Connectivity Issue',
                'description': '''I am unable to connect to the company VPN when working from home. 
                
I get an error message saying "Connection timed out" after entering my credentials.

I have tried:
- Restarting my computer
- Reinstalling the VPN client
- Checking my internet connection (other sites work fine)

Please help resolve this issue as I cannot access internal systems.''',
                'priority': 'High',
                'days_ago': 5,
                'resolution_notes': 'VPN certificate was expired. Issued new certificate and updated client configuration. Employee confirmed VPN is now working.',
            },
            {
                'subject': 'Outlook keeps crashing when opening attachments',
                'category': 'IT Support',
                'sub_category': 'Software Installation/Update',
                'description': '''Microsoft Outlook crashes every time I try to open email attachments.

This started happening after the recent Windows update. The error says "Microsoft Outlook has stopped working".

I need to be able to open attachments for my daily work.''',
                'priority': 'Medium',
                'days_ago': 7,
                'resolution_notes': 'Repaired Office installation and cleared Outlook cache. Applied latest Office patches. Issue resolved.',
            },
            {
                'subject': 'Request for second monitor setup',
                'category': 'IT Support',
                'sub_category': 'Hardware Troubleshooting',
                'description': '''I would like to request assistance setting up a second monitor at my workstation.

I have received approval from my manager for the additional monitor. The monitor has been delivered but I need help with the cables and configuration.

Monitor model: Dell P2419H
Current setup: Dell laptop with docking station''',
                'priority': 'Low',
                'days_ago': 10,
                'resolution_notes': 'Visited workstation and configured dual monitor setup. Provided DisplayPort cable and adjusted display settings. Employee confirmed setup working correctly.',
            },
            {
                'subject': 'Password reset for project management tool',
                'category': 'IT Support',
                'sub_category': 'Email/Account Access Issue',
                'description': '''I forgot my password for the project management tool (Jira) and the self-service reset is not sending emails to my inbox.

I have checked spam folder and waited 30 minutes but no reset email arrived.

Please help me regain access to my account: employee.account@company.com''',
                'priority': 'High',
                'days_ago': 3,
                'resolution_notes': 'Reset password manually in Jira admin console. Employee confirmed access restored. Also fixed email configuration for password reset emails.',
            },
            # Asset Check Out - Resolved
            {
                'subject': 'Request laptop for new project assignment',
                'category': 'Asset Check Out',
                'sub_category': None,
                'description': '''I am being assigned to a new client project that requires on-site work starting next week.

I need a portable laptop for this assignment as my current desktop cannot be moved.

Requirements:
- Windows laptop with minimum 16GB RAM
- VPN capability
- Microsoft Office installed
- At least 256GB storage

Project duration: 3 months
Manager approval: Attached''',
                'priority': 'High',
                'days_ago': 8,
                'resolution_notes': 'Issued Dell Latitude 5520 laptop (Asset Tag: LAP-2024-0156). Configured with VPN, Office 365, and required software. Employee signed asset acknowledgment form.',
            },
            {
                'subject': 'Need headset for video conferencing',
                'category': 'Asset Check Out',
                'sub_category': None,
                'description': '''With the increase in remote meetings, I need a proper headset with microphone for video calls.

Currently using laptop speakers which causes echo issues during meetings.

Preferred: USB headset with noise cancellation if available.''',
                'priority': 'Medium',
                'days_ago': 12,
                'resolution_notes': 'Provided Jabra Evolve2 40 USB headset (Asset Tag: AUD-2024-0089). Employee tested during pickup and confirmed working.',
            },
            # Asset Check In - Resolved
            {
                'subject': 'Returning old laptop after upgrade',
                'category': 'Asset Check In',
                'sub_category': None,
                'description': '''I received a new laptop last month and need to return my old one.

Old laptop details:
- Dell Latitude 5510
- Asset Tag: LAP-2022-0078
- Includes: Power adapter, carrying case

The laptop has been wiped and is ready for return.''',
                'priority': 'Low',
                'days_ago': 15,
                'resolution_notes': 'Received Dell Latitude 5510 (LAP-2022-0078) with all accessories. Verified data wipe completed. Asset returned to inventory.',
            },
            # New Budget Proposal - Resolved
            {
                'subject': 'Budget request for team training subscription',
                'category': 'New Budget Proposal',
                'sub_category': None,
                'description': '''I am requesting budget approval for a LinkedIn Learning team subscription for our department.

Details:
- Cost: $299/year per seat
- Number of seats: 5
- Total: $1,495/year

Justification:
- Continuous learning for team members
- Access to latest technology courses
- Reduces need for expensive external training

ROI: Each team member will complete at least 4 courses per quarter, equivalent to $500+ in traditional training value.''',
                'priority': 'Medium',
                'days_ago': 20,
                'resolution_notes': 'Budget approved by department head and finance. Purchase order created. LinkedIn Learning licenses activated for 5 team members.',
            },
            # Others - Resolved
            {
                'subject': 'Request for parking spot change',
                'category': 'Others',
                'sub_category': None,
                'description': '''I would like to request a change in my assigned parking spot.

Current spot: B-45 (basement level 2)
Requested: Any spot on level 1 or ground level

Reason: I have a minor mobility issue that makes climbing stairs difficult. The elevator is frequently out of service.

Medical documentation can be provided if needed.''',
                'priority': 'Medium',
                'days_ago': 6,
                'resolution_notes': 'Coordinated with facilities management. Reassigned to parking spot G-12 (ground level near entrance). Employee confirmed new assignment.',
            },
            {
                'subject': 'Update emergency contact information',
                'category': 'Others',
                'sub_category': None,
                'description': '''I need to update my emergency contact information in the system.

New emergency contact:
Name: John Account (Spouse)
Phone: 555-123-4567
Relationship: Spouse

Please update the HR records accordingly.''',
                'priority': 'Low',
                'days_ago': 4,
                'resolution_notes': 'Forwarded to HR department. Emergency contact information updated in HR system. Employee notified of completion.',
            },
        ]

        for ticket_data in resolved_tickets:
            # Generate ticket number
            ticket_number = f"HDTS-{random.randint(100000, 999999)}"
            
            # Calculate dates
            submit_date = now - timedelta(days=ticket_data['days_ago'])
            update_date = now - timedelta(days=max(1, ticket_data['days_ago'] - 2))
            date_completed = update_date
            
            # Create the ticket
            ticket = Ticket.objects.create(
                ticket_number=ticket_number,
                employee=employee,
                subject=ticket_data['subject'],
                category=ticket_data['category'],
                sub_category=ticket_data.get('sub_category'),
                description=ticket_data['description'],
                priority=ticket_data['priority'],
                status='Resolved',
                submit_date=submit_date,
                update_date=update_date,
                assigned_to=coordinator,
                date_completed=date_completed,
            )
            
            # Add resolution comment
            from core.models import TicketComment
            try:
                TicketComment.objects.create(
                    ticket=ticket,
                    author=coordinator if coordinator else None,
                    author_cookie_id=None,
                    message=f"Resolution: {ticket_data['resolution_notes']}",
                    is_auto_response=False,
                )
            except Exception as e:
                self.stdout.write(f'  Warning: Could not add comment: {e}')
            
            created_count += 1
            self.stdout.write(f'  ✓ Created: {ticket_number} - {ticket_data["subject"][:40]}...')

        self.stdout.write(self.style.SUCCESS(f'\n✓ Done! Created {created_count} resolved tickets for employeeaccount@gmail.com'))
        
        # Show summary
        total = Ticket.objects.filter(employee=employee).count()
        resolved = Ticket.objects.filter(employee=employee, status='Resolved').count()
        self.stdout.write(f'Total tickets for this employee: {total}')
        self.stdout.write(f'Resolved tickets (ready to close): {resolved}')
        self.stdout.write(self.style.WARNING('\nEmployee can now log in and close these resolved tickets.'))
