import os
import random
import shutil
import mimetypes
from datetime import datetime, timedelta
from urllib.parse import urljoin

from django.core.management.base import BaseCommand
from django.utils.timezone import make_aware
from django.conf import settings
from tickets.models import Ticket

# Constants
PRIORITIES = ['Low', 'Medium', 'High', 'Critical']
STATUSES = ['Open']
NAMES = ['Alice', 'Bob', 'Charlie', 'Diana', 'Eve', 'Frank']

# Folder paths
SAMPLE_FOLDER = os.path.join(settings.BASE_DIR, 'media/documents')
ATTACHMENT_UPLOAD_DIR = 'uploads/tickets'

# Valid workflow-aligned combinations
VALID_WORKFLOWS = [
    ("Asset Department", "Asset", "Asset Check-in"),
    ("Asset Department", "Asset", "Asset Check-out"),
    ("Budget Department", "Budget", "Project Proposal"),
    ("IT Department", "IT", "Access Request"),
    ("IT Department", "IT", "Software Installation"),
]

class Command(BaseCommand):
    help = "Seed the Ticket model with actual file-based attachments matching defined workflows."

    def handle(self, *args, **kwargs):
        self.stdout.write("📥 Seeding Tickets with valid workflow combinations and attachments...")

        if not os.path.isdir(SAMPLE_FOLDER):
            self.stdout.write(self.style.ERROR(f"❌ Attachment folder not found: {SAMPLE_FOLDER}"))
            return

        # Ensure destination folder exists
        dest_dir = os.path.join(settings.MEDIA_ROOT, ATTACHMENT_UPLOAD_DIR)
        os.makedirs(dest_dir, exist_ok=True)

        # Gather files
        sample_files = [
            os.path.join(SAMPLE_FOLDER, f)
            for f in os.listdir(SAMPLE_FOLDER)
            if os.path.isfile(os.path.join(SAMPLE_FOLDER, f))
        ]
        if not sample_files:
            self.stdout.write(self.style.WARNING("⚠️ No sample attachment files found. Proceeding without attachments."))

        # Shuffle combinations to randomize selection
        random.shuffle(VALID_WORKFLOWS)

        for i, (department, category, subcategory) in enumerate(VALID_WORKFLOWS):
            submit_date = make_aware(datetime.now() - timedelta(days=random.randint(1, 30)))
            update_date = submit_date + timedelta(days=random.randint(0, 5))

            # Sample attachments
            selected_files = random.sample(sample_files, k=random.randint(0, min(3, len(sample_files))))
            attached_paths = []
            for file_path in selected_files:
                filename = f"{datetime.now().timestamp()}_{os.path.basename(file_path)}"
                destination_path = os.path.join(dest_dir, filename)
                shutil.copy(file_path, destination_path)

                relative_path = os.path.join(ATTACHMENT_UPLOAD_DIR, filename).replace("\\", "/")
                full_url = urljoin(settings.BASE_URL, f"/media/{relative_path}")
                file_stat = os.stat(destination_path)

                attachment_data = {
                    "id": random.randint(50, 9999),
                    "file": full_url,
                    "file_name": os.path.basename(file_path),
                    "file_type": mimetypes.guess_type(file_path)[0] or "application/octet-stream",
                    "file_size": file_stat.st_size,
                    "upload_date": datetime.now().isoformat(),
                }
                attached_paths.append(attachment_data)

            # Employee info
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

            # Create ticket
            ticket = Ticket.objects.create(
                ticket_id=f"WF-{random.randint(1000, 9999)}",
                original_ticket_id=f"TK-{random.randint(1000, 9999)}",
                employee=employee,
                subject=f"Issue {i+1}: {subcategory}",
                category=category,
                subcategory=subcategory,
                description="Generated ticket with actual attachment files.",
                scheduled_date=(submit_date + timedelta(days=random.randint(1, 5))).date(),
                submit_date=submit_date,
                update_date=update_date,
                assigned_to=random.choice(NAMES),
                priority=random.choice(PRIORITIES),
                status=random.choice(STATUSES),
                department=department,
                response_time=timedelta(hours=random.randint(1, 5)),
                resolution_time=timedelta(days=random.randint(1, 3)),
                time_closed=update_date + timedelta(days=1),
                rejection_reason=None if random.random() > 0.2 else "Unjustified request.",
                attachments=attached_paths,
                fetched_at=update_date,
            )

            self.stdout.write(self.style.SUCCESS(f"✅ Created: {ticket.subject} ({department}, {category}, {subcategory})"))

        self.stdout.write(self.style.SUCCESS("🎉 Done seeding all tickets!"))
