"""
Management command to update a ticket's status.

This command updates a ticket's status and triggers the appropriate signals.
Used in integration testing to trigger the workflow (status -> Open).

Usage:
    python manage.py update_ticket_status HDTS-XXXXXX Open
    python manage.py update_ticket_status HDTS-XXXXXX Resolved --json
"""

from django.core.management.base import BaseCommand, CommandError
from core.models import Ticket
import json


class Command(BaseCommand):
    help = 'Update a ticket status (triggers workflow signal if changing to Open)'

    def add_arguments(self, parser):
        parser.add_argument(
            'ticket_number',
            type=str,
            help='Ticket number (e.g., HDTS-XXXXXX)'
        )
        parser.add_argument(
            'new_status',
            type=str,
            choices=['New', 'Open', 'In Progress', 'On Hold', 'Pending', 'Resolved', 'Rejected', 'Withdrawn', 'Closed'],
            help='New status for the ticket'
        )
        parser.add_argument(
            '--json',
            action='store_true',
            help='Output result as JSON for scripting'
        )

    def handle(self, *args, **options):
        ticket_number = options['ticket_number']
        new_status = options['new_status']
        output_json = options['json']
        
        try:
            ticket = Ticket.objects.get(ticket_number=ticket_number)
        except Ticket.DoesNotExist:
            if output_json:
                self.stdout.write(json.dumps({
                    'success': False,
                    'error': f'Ticket {ticket_number} not found'
                }))
                return
            raise CommandError(f'Ticket {ticket_number} not found')
        
        old_status = ticket.status
        ticket.status = new_status
        ticket.save()  # This will trigger the post_save signal
        
        result = {
            'success': True,
            'ticket_number': ticket.ticket_number,
            'ticket_id': ticket.id,
            'old_status': old_status,
            'new_status': ticket.status,
            'workflow_triggered': old_status != 'Open' and new_status == 'Open',
        }
        
        if output_json:
            self.stdout.write(json.dumps(result))
        else:
            self.stdout.write(self.style.SUCCESS(f"✅ Ticket {ticket_number} status updated!"))
            self.stdout.write(f"   Old Status: {old_status}")
            self.stdout.write(f"   New Status: {ticket.status}")
            
            if result['workflow_triggered']:
                self.stdout.write(self.style.WARNING(
                    f"\n⚡ Workflow signal triggered (status changed to 'Open')!"
                ))
