import os, sys, django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'workflow_api.settings')
django.setup()

from tickets.models import WorkflowTicket
from django.utils.dateparse import parse_datetime

ticket = WorkflowTicket.objects.first()
print(f'BEFORE: Ticket {ticket.ticket_number}')
print(f'  created_at: {ticket.created_at}')
print(f'  fetched_at: {ticket.fetched_at}')
submit_date = ticket.ticket_data.get('submit_date')
print(f'  submit_date in data: {submit_date}')

if submit_date:
    parsed = parse_datetime(submit_date)
    print(f'Parsed date: {parsed}')
    
    count = WorkflowTicket.objects.filter(pk=ticket.pk).update(
        created_at=parsed,
        fetched_at=parsed
    )
    print(f'Updated {count} records')
    
    ticket.refresh_from_db()
    print(f'AFTER: Ticket {ticket.ticket_number}')
    print(f'  created_at: {ticket.created_at}')
    print(f'  fetched_at: {ticket.fetched_at}')
