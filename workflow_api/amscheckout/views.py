from rest_framework import generics, status
from rest_framework.response import Response
from rest_framework.views import APIView
from .models import Checkout
from .serializers import CheckoutSerializer
from django_filters.rest_framework import DjangoFilterBackend
from tickets.models import WorkflowTicket

# GET /api/ams/checkout-tickets
class CheckoutListView(generics.ListAPIView):
    queryset = Checkout.objects.all()
    serializer_class = CheckoutSerializer
    filter_backends = [DjangoFilterBackend]
    filterset_fields = ['is_resolved']

# POST /api/ams/checkout-resolve/{ticket_id}
class CheckoutResolveView(APIView):
    def post(self, request, ticket_id):
        try:
            checkout = Checkout.objects.get(ticket_id=ticket_id)
        except Checkout.DoesNotExist:
            return Response({"detail": "Ticket not found"}, status=status.HTTP_404_NOT_FOUND)

        is_resolved = request.data.get("is_resolved")
        if is_resolved is None:
            return Response({"detail": "Missing 'is_resolved'"}, status=status.HTTP_400_BAD_REQUEST)

        checkout.is_resolved = is_resolved
        checkout.save()

        # ✅ Update ticket status to "Resolved" if resolved (in ticket_data)
        if is_resolved:
            try:
                # Query using the ticket_data field
                ticket = WorkflowTicket.objects.get(ticket_data__ticket_id=ticket_id)
                ticket.ticket_data['status'] = "Resolved"  # or your enum/choice value
                ticket.save()
            except WorkflowTicket.DoesNotExist:
                return Response({"detail": "Related ticket not found"}, status=status.HTTP_404_NOT_FOUND)

        return Response(CheckoutSerializer(checkout).data, status=status.HTTP_200_OK)

# POST /api/ams/checkout-create
class CheckoutCreateView(generics.CreateAPIView):
    serializer_class = CheckoutSerializer

    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        self.perform_create(serializer)
        return Response(serializer.data, status=status.HTTP_201_CREATED)

import random
import requests
from faker import Faker
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from amscheckout.models import Checkout

API_URL = "https://assets-service-production.up.railway.app/assets/"

class FlushAndSeedCheckoutView(APIView):
    """
    Deletes all checkout records and seeds 20 fresh check-in/checkout records,
    including 4 fixed default entries.
    """

    def post(self, request):
        fake = Faker()
        deleted_count, _ = Checkout.objects.all().delete()

        # Fetch asset data
        try:
            resp = requests.get(API_URL)
            resp.raise_for_status()
            assets = resp.json()
        except Exception as e:
            return Response({"error": f"Failed to fetch assets: {str(e)}"}, status=status.HTTP_503_SERVICE_UNAVAILABLE)

        asset_choices = [(a["id"], a["name"]) for a in assets if a.get("name")]
        if not asset_choices:
            return Response({"error": "No valid assets returned from asset service."}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

        locations = [
            "Manila HQ", "Cebu Branch", "Makati Office",
            "Davao Hub", "QC Tech Center", "Pasig Office", "Quezon City Office"
        ]
        num_records = 20
        created = 0

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
                created += 1
            else:
                # Check-in
                checkin_date = fake.date_between(start_date='-30d', end_date='today')
                condition = random.randint(1, 10)
                ref_checkout = Checkout.objects.filter(checkin_date=None).order_by('?').first()

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
                created += 1

        # Seed fixed default records
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
            created += 1

        return Response({
            "message": f"✅ Flushed {deleted_count} records and seeded {created} new records (including 4 defaults)."
        }, status=status.HTTP_201_CREATED)