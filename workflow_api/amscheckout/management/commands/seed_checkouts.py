import random
import requests
from django.core.management.base import BaseCommand
from faker import Faker
from amscheckout.models import Checkout

API_URL = "https://assets-service-production.up.railway.app/assets/"

class Command(BaseCommand):
    help = 'Seed 20 fake checkout/checkin records with proper field usage and return_date always set'

    def handle(self, *args, **kwargs):
        fake = Faker()
        Checkout.objects.all().delete()

        # Fetch asset data
        resp = requests.get(API_URL)
        resp.raise_for_status()
        assets = resp.json()
        asset_choices = [(a["id"], a["name"]) for a in assets if a.get("name")]

        locations = [
            "Manila Office", "Cebu Branch", "Makati Office", 
            "Davao Hub", "QC Tech Center", "Pasig Office", "Quezon City Office"
        ]
        num_records = 20

        for _ in range(num_records):
            ticket_id = f"TK-{fake.unique.random_int(min=1000, max=9999)}"
            requestor_id = random.randint(1, 20)
            requestor = fake.name()
            requestor_location = random.choice(locations)

            if random.random() < 0.8:
                # Checkout
                asset_id, asset_name = random.choice(asset_choices)
                checkout_date = fake.date_between(start_date='-30d', end_date='today')
                return_date = fake.date_between(start_date=checkout_date, end_date='+30d')

                Checkout.objects.create(
                    ticket_id=ticket_id,
                    asset_id=asset_id,
                    asset_name=asset_name,
                    requestor_id=requestor_id,
                    requestor=requestor,
                    requestor_location=requestor_location,
                    checkout_date=checkout_date,
                    checkin_date=None,
                    return_date=return_date,
                    is_resolved=False,
                    checkout_ref_id=None,
                    condition=None
                )
            else:
                # Check-in
                checkin_date = fake.date_between(start_date='-30d', end_date='today')
                condition = random.randint(1, 10)
                ref_checkout = Checkout.objects.filter(checkin_date__isnull=True).order_by('?').first()

                if not ref_checkout:
                    continue

                Checkout.objects.create(
                    ticket_id=ticket_id,
                    asset_id=ref_checkout.asset_id,
                    asset_name=ref_checkout.asset_name,
                    requestor_id=requestor_id,
                    requestor=requestor,
                    requestor_location=requestor_location,
                    checkout_date=ref_checkout.checkout_date,
                    checkin_date=checkin_date,
                    return_date=checkin_date,
                    is_resolved=False,
                    checkout_ref_id=ref_checkout.id,
                    condition=condition
                )

        # Seed specific default records
        default_records = [
            {
                "ticket_id": "TK-9537",
                "asset_id": 22,
                "asset_name": "iPad Pro",
                "requestor_id": 1,
                "requestor": "Kelly Barron",
                "requestor_location": "Pasig Office",
                "checkout_date": "2025-06-16",
                "return_date": "2025-08-16",
                "checkin_date": None,
                "checkout_ref_id": None,
                "condition": None,
                "is_resolved": False,
            },
            {
                "ticket_id": "TK-3590",
                "asset_id": 24,
                "asset_name": "LENOVO",
                "requestor_id": 2,
                "requestor": "Tammy Sawyer",
                "requestor_location": "Quezon City Office",
                "checkout_date": "2025-06-13",
                "return_date": "2028-06-16",
                "checkin_date": None,
                "checkout_ref_id": None,
                "condition": None,
                "is_resolved": False,
            },
            {
                "ticket_id": "TK-6188",
                "asset_id": 25,
                "asset_name": "Samsung",
                "requestor_id": 3,
                "requestor": "Denise Jimenez",
                "requestor_location": "Manila Office",
                "checkout_date": "2025-06-13",
                "return_date": "2027-06-16",
                "checkin_date": "2027-06-16",
                "checkout_ref_id": 1,
                "condition": 9,
                "is_resolved": False,
            },
            {
                "ticket_id": "TK-6018",
                "asset_id": 27,
                "asset_name": "Samsuung 12",
                "requestor_id": 3,
                "requestor": "Denise Jimenez",
                "requestor_location": "Makati Office",
                "checkout_date": "2025-06-10",
                "return_date": "2025-06-16",
                "checkin_date": "2025-06-18",
                "checkout_ref_id": 1,
                "condition": 6,
                "is_resolved": False,
            },
        ]

        for record in default_records:
            Checkout.objects.create(**record)

        self.stdout.write(self.style.SUCCESS(
            f'✅ Seeded {num_records + len(default_records)} check-in/checkout records including defaults.'
        ))
