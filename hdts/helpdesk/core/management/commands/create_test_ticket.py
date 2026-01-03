"""
Management command to create a controlled test ticket for integration testing.

This command creates a single ticket with predictable data that can be used
to test the HDTS -> TTS workflow integration.

Usage:
    python manage.py create_test_ticket
    python manage.py create_test_ticket --test-id TEST123
    python manage.py create_test_ticket --status Open  # triggers workflow immediately
"""

from django.core.management.base import BaseCommand
from django.utils import timezone
from core.models import Ticket, Employee
import uuid
import json


class Command(BaseCommand):
    help = 'Create a controlled test ticket for integration testing'

    def add_arguments(self, parser):
        parser.add_argument(
            '--test-id',
            type=str,
            default=None,
            help='Custom test ID to include in ticket subject (for tracking)'
        )
        parser.add_argument(
            '--status',
            type=str,
            default='New',
            choices=['New', 'Open'],
            help='Initial ticket status. Use "Open" to trigger workflow immediately.'
        )
        parser.add_argument(
            '--category',
            type=str,
            default='IT Support',
            help='Ticket category (e.g., "IT Support", "Integration Test")'
        )
        parser.add_argument(
            '--sub-category',
            type=str,
            default=None,
            help='Ticket sub-category (defaults based on category if not specified)'
        )
        parser.add_argument(
            '--department',
            type=str,
            default='IT Department',
            help='Target department (e.g., "IT Department", "Test Department")'
        )
        parser.add_argument(
            '--priority',
            type=str,
            default='Medium',
            choices=['Critical', 'High', 'Medium', 'Low'],
            help='Ticket priority'
        )
        parser.add_argument(
            '--json',
            action='store_true',
            help='Output result as JSON for scripting'
        )

    def handle(self, *args, **options):
        test_id = options['test_id'] or f"INT-{uuid.uuid4().hex[:8].upper()}"
        status = options['status']
        category = options['category']
        department = options['department']
        priority = options['priority']
        output_json = options['json']
        
        # Set subcategory based on category if not specified
        sub_category = options.get('sub_category')
        if sub_category is None:
            subcategory_map = {
                'IT Support': 'Technical Assistance',
                'Asset Check In': 'Check In',
                'Asset Check Out': 'Check Out',
                'New Budget Proposal': 'Capital Expenses (CapEx)',
                'Integration Test': 'Test Flow',
                'Others': None,
            }
            sub_category = subcategory_map.get(category, 'General')
        
        # Try to get an employee for the ticket, or use cookie auth
        employee = Employee.objects.first()
        employee_cookie_id = None if employee else 1
        
        # Create the test ticket with 'New' status first
        # The signal only triggers on status CHANGE to 'Open', not on creation
        initial_status = 'New'
        ticket = Ticket.objects.create(
            subject=f"[Integration Test {test_id}] Automated Test Ticket",
            category=category,
            sub_category=sub_category,
            description=f"""This is an automated integration test ticket.

Test ID: {test_id}
Created: {timezone.now().isoformat()}
Purpose: End-to-end integration test between HDTS and TTS (workflow_api)

This ticket should:
1. Be picked up by the TTS workflow system
2. Have a Task created for it in workflow_api
3. Be processed through the workflow steps
4. Have status updates synced back to HDTS
""",
            priority=priority,
            department=department,
            status=initial_status,  # Start with 'New'
            employee=employee,
            employee_cookie_id=employee_cookie_id,
            submit_date=timezone.now(),
        )
        
        # If target status is 'Open', update the ticket to trigger the workflow signal
        workflow_triggered = False
        if status == 'Open':
            ticket.status = 'Open'
            ticket.save()  # This triggers post_save signal with created=False
            workflow_triggered = True
        
        result = {
            'success': True,
            'test_id': test_id,
            'ticket_id': ticket.id,
            'ticket_number': ticket.ticket_number,
            'status': ticket.status,
            'category': ticket.category,
            'sub_category': ticket.sub_category,
            'department': ticket.department,
            'priority': ticket.priority,
            'subject': ticket.subject,
            'created_at': ticket.submit_date.isoformat() if ticket.submit_date else None,
            'workflow_triggered': workflow_triggered,
        }
        
        if output_json:
            self.stdout.write(json.dumps(result))
        else:
            self.stdout.write(self.style.SUCCESS(f"✅ Test ticket created successfully!"))
            self.stdout.write(f"   Test ID:       {test_id}")
            self.stdout.write(f"   Ticket ID:     {ticket.id}")
            self.stdout.write(f"   Ticket Number: {ticket.ticket_number}")
            self.stdout.write(f"   Status:        {ticket.status}")
            self.stdout.write(f"   Category:      {ticket.category}")
            self.stdout.write(f"   Sub-Category:  {ticket.sub_category}")
            self.stdout.write(f"   Department:    {ticket.department}")
            self.stdout.write(f"   Priority:      {ticket.priority}")
            
            if status == 'Open':
                self.stdout.write(self.style.WARNING(
                    f"\n⚡ Ticket status is 'Open' - workflow task should be triggered via Celery!"
                ))
            else:
                self.stdout.write(self.style.NOTICE(
                    f"\n💡 To trigger workflow, update status to 'Open':"
                ))
                self.stdout.write(f"   python manage.py update_ticket_status {ticket.ticket_number} Open")
        
        return result if not output_json else None
