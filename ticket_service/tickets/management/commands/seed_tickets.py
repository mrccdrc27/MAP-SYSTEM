from django.core.management.base import BaseCommand
from tickets.models import Ticket
from faker import Faker
import random
from datetime import datetime, timedelta

class Command(BaseCommand):
    help = 'Seed the database with realistic sample tickets'

    def add_arguments(self, parser):
        parser.add_argument(
            '--force',
            action='store_true',
            help='Force reseeding by deleting existing data first',
        )

    def handle(self, *args, **options):
        # Optionally clear existing data
        if options['force']:
            self.stdout.write("Force mode: deleting all existing tickets...")
            Ticket.objects.all().delete()
        elif Ticket.objects.exists():
            self.stdout.write(self.style.WARNING(
                "Tickets already exist. Use --force to reseed."
            ))
            return

        fake = Faker()
        priorities = ['Low', 'Medium', 'High', 'Urgent']
        statuses = ['Open', 'In Progress', 'Resolved', 'Closed', 'On Hold']
        departments = ['Support', 'IT', 'Sales', 'HR', 'Finance', 'Legal']
        positions = ['IT Analyst', 'Support Rep', 'Manager', 'Technician', 'Consultant', 'Coordinator']
        sla_options = ['24 hours', '48 hours', '72 hours', '1 week']
        categories = ['General Inquiry', 'Technical Issue', 'Billing']
        subcategories = ['Software', 'Hardware', 'Payment']

        for i in range(1, 11):  # Create 10 tickets
            opened_date = fake.date_between(start_date='-30d', end_date='today')
            fetched_dt = datetime.combine(opened_date, datetime.min.time()) + timedelta(hours=i % 6)

            Ticket.objects.create(
                ticket_id=f"TK-{100000 + i}",
                subject=fake.sentence(nb_words=5),
                customer=fake.name(),
                priority=priorities[i % len(priorities)],
                status=statuses[i % len(statuses)],
                opened_on=opened_date,
                sla=sla_options[i % len(sla_options)],
                description=fake.paragraph(nb_sentences=3),
                department=departments[i % len(departments)],
                position=positions[i % len(positions)],
                category=categories[i % len(categories)],
                subcategory=subcategories[i % len(subcategories)],
                fetched_at=fetched_dt,
            )

            self.stdout.write(self.style.SUCCESS(f"Created ticket TK-{100000 + i}"))

        self.stdout.write(self.style.SUCCESS(
            "✅ Seeded 10 tickets. Automatic push/queueing handled by post_save signal."
        ))
