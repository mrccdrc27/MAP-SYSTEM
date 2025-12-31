"""
Management command to get a ticket's current status.

Usage:
    python manage.py get_ticket_status HDTS-XXXXXX
    python manage.py get_ticket_status HDTS-XXXXXX --json
"""

from django.core.management.base import BaseCommand, CommandError
from core.models import Ticket
import json


class Command(BaseCommand):
    help = 'Get the current status of a ticket'

    def add_arguments(self, parser):
        parser.add_argument(
            'ticket_number',
            type=str,
            help='Ticket number (e.g., HDTS-XXXXXX)'
        )
        parser.add_argument(
            '--json',
            action='store_true',
            help='Output result as JSON for scripting'
        )

    def handle(self, *args, **options):
        ticket_number = options['ticket_number']
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
        
        result = {
            'success': True,
            'ticket_number': ticket.ticket_number,
            'ticket_id': ticket.id,
            'status': ticket.status,
            'subject': ticket.subject,
            'category': ticket.category,
            'sub_category': ticket.sub_category,
            'department': ticket.department,
            'priority': ticket.priority,
            'submit_date': ticket.submit_date.isoformat() if ticket.submit_date else None,
            'update_date': ticket.update_date.isoformat() if ticket.update_date else None,
            'date_completed': ticket.date_completed.isoformat() if ticket.date_completed else None,
            'csat_rating': ticket.csat_rating,
        }
        
        if output_json:
            self.stdout.write(json.dumps(result))
        else:
            self.stdout.write(self.style.SUCCESS(f"📋 Ticket: {ticket_number}"))
            self.stdout.write(f"   Status:        {ticket.status}")
            self.stdout.write(f"   Subject:       {ticket.subject}")
            self.stdout.write(f"   Category:      {ticket.category}")
            self.stdout.write(f"   Sub-Category:  {ticket.sub_category}")
            self.stdout.write(f"   Department:    {ticket.department}")
            self.stdout.write(f"   Priority:      {ticket.priority}")
            self.stdout.write(f"   Submitted:     {ticket.submit_date}")
            self.stdout.write(f"   Updated:       {ticket.update_date}")
            if ticket.date_completed:
                self.stdout.write(f"   Completed:     {ticket.date_completed}")
