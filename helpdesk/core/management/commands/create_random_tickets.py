from django.core.management.base import BaseCommand
from core.models import Ticket, Employee
import random
from datetime import datetime, timedelta

class Command(BaseCommand):
    help = 'Create random tickets for testing'

    def add_arguments(self, parser):
        parser.add_argument('num_tickets', type=int, help='Number of random tickets to create')

    def handle(self, *args, **options):
        num_tickets = options['num_tickets']
        employees = list(Employee.objects.all())
        if not employees:
            self.stdout.write(self.style.ERROR('No employees found. Please create employees first.'))
            return

        categories = ['IT Support', 'Asset Check In', 'Asset Check Out', 'New Budget Proposal', 'Others']
        priorities = ['Critical', 'High', 'Medium', 'Low']
        statuses = ['New', 'Open', 'In Progress', 'On Hold', 'Pending', 'Resolved', 'Rejected', 'Withdrawn', 'Closed']
        departments = ['IT Department', 'Asset Department', 'Budget Department']

        subjects = [
            'Computer not starting',
            'Need new laptop',
            'Budget for software',
            'Printer out of toner',
            'Network connectivity issue',
            'Asset check out request',
            'System performance slow',
            'New hire setup',
            'Data backup needed',
            'Other inquiry'
        ]

        descriptions = [
            'Please assist with this issue.',
            'Urgent help required.',
            'Standard request for approval.',
            'Details provided in attachment.',
            'Follow up needed.',
        ]

        created_count = 0
        for _ in range(num_tickets):
            employee = random.choice(employees)
            category = random.choice(categories)
            priority = random.choice(priorities) if random.choice([True, False]) else None
            status = random.choice(statuses)
            department = random.choice(departments) if random.choice([True, False]) else None
            subject = random.choice(subjects)
            description = random.choice(descriptions)
            scheduled_date = datetime.now().date() + timedelta(days=random.randint(1, 30)) if random.choice([True, False]) else None

            try:
                Ticket.objects.create(
                    employee=employee,
                    subject=subject,
                    category=category,
                    description=description,
                    scheduled_date=scheduled_date,
                    priority=priority,
                    department=department,
                    status=status,
                )
                created_count += 1
            except Exception as e:
                self.stdout.write(self.style.WARNING(f'Failed to create ticket: {e}'))

        self.stdout.write(self.style.SUCCESS(f'Successfully created {created_count} random tickets.'))