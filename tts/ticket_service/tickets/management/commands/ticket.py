import os
import shutil
import mimetypes
import random
from datetime import datetime, timedelta
from urllib.parse import urljoin

from django.core.management.base import BaseCommand
from django.utils.timezone import make_aware
from django.conf import settings
from tickets.models import Ticket

PRIORITIES = ['Low', 'Medium', 'High', 'Critical']
STATUSES = ['Open']
NAMES = ['Alice', 'Bob', 'Charlie', 'Diana', 'Eve', 'Frank']
ATTACHMENT_UPLOAD_DIR = 'uploads/tickets'
SAMPLE_FOLDER = os.path.join(settings.BASE_DIR, 'media/documents')

VALID_WORKFLOWS = [
    ("Asset Department", "Asset Category", "Asset Check-in"),
    ("Asset Department", "Asset Category", "Asset Check-out"),
    ("Budget Department", "Budget Category", "Project Proposal"),
    ("IT Department", "IT Category", "Access Request"),
    ("IT Department", "IT Category", "Software Installation"),
]

class Command(BaseCommand):
    help = "Create one ticket by selecting a document manually."

    def handle(self, *args, **kwargs):
        self.stdout.write("📄 Available files in media/documents/")
        if not os.path.isdir(SAMPLE_FOLDER):
            self.stdout.write(self.style.ERROR("❌ Sample document folder not found."))
            return

        sample_files = [f for f in os.listdir(SAMPLE_FOLDER) if os.path.isfile(os.path.join(SAMPLE_FOLDER, f))]
        if not sample_files:
            self.stdout.write(self.style.WARNING("⚠️ No files found in the folder."))
            return

        for idx, file in enumerate(sample_files, start=1):
            self.stdout.write(f"{idx}. {file}")

        choice = input("Enter the number of the file you want to attach: ").strip()
        if not choice.isdigit() or int(choice) < 1 or int(choice) > len(sample_files):
            self.stdout.write(self.style.ERROR("❌ Invalid choice. Exiting."))
            return

        selected_file = sample_files[int(choice) - 1]
        file_path = os.path.join(SAMPLE_FOLDER, selected_file)

        # Create attachment
        filename = f"{datetime.now().timestamp()}_{selected_file}"
        dest_dir = os.path.join(settings.MEDIA_ROOT, ATTACHMENT_UPLOAD_DIR)
        os.makedirs(dest_dir, exist_ok=True)
        destination_path = os.path.join(dest_dir, filename)
        shutil.copy(file_path, destination_path)

        relative_path = os.path.join(ATTACHMENT_UPLOAD_DIR, filename).replace("\\", "/")
        full_url = urljoin(settings.BASE_URL, f"/media/{relative_path}")
        file_stat = os.stat(destination_path)
        attachment_data = {
            "id": random.randint(50, 9999),
            "file": full_url,
            "file_name": selected_file,
            "file_type": mimetypes.guess_type(file_path)[0] or "application/octet-stream",
            "file_size": file_stat.st_size,
            "upload_date": datetime.now().isoformat(),
        }

        department, category, subcategory = random.choice(VALID_WORKFLOWS)
        submit_date = make_aware(datetime.now())
        update_date = submit_date + timedelta(hours=2)

        first_name = random.choice(NAMES)
        last_name = random.choice(NAMES)
        email = f"{first_name.lower()}.{last_name.lower()}@example.com"
        company_id = f"MA{random.randint(1000, 9999)}"
        image_url = urljoin(settings.BASE_URL, "/media/employee_images/resized-placeholder.jpeg")

        employee = {
            "first_name": first_name,
            "last_name": last_name,
            "email": email,
            "company_id": company_id,
            "department": department,
            "image": image_url,
        }

        ticket = Ticket.objects.create(
            ticket_id=f"WF-{random.randint(1000, 9999)}",
            original_ticket_id=f"TK-{random.randint(1000, 9999)}",
            employee=employee,
            subject=f"Manual Issue: {subcategory}",
            category=category,
            subcategory=subcategory,
            description="One manually seeded ticket with chosen attachment.",
            scheduled_date=(submit_date + timedelta(days=2)).date(),
            submit_date=submit_date,
            update_date=update_date,
            assigned_to=random.choice(NAMES),
            priority=random.choice(PRIORITIES),
            status=random.choice(STATUSES),
            department=department,
            response_time=timedelta(hours=2),
            resolution_time=timedelta(days=1),
            time_closed=update_date + timedelta(days=1),
            rejection_reason=None,
            attachments=[attachment_data],
            fetched_at=update_date,
        )

        self.stdout.write(self.style.SUCCESS(f"✅ Ticket created: {ticket.ticket_id} with {selected_file}"))
