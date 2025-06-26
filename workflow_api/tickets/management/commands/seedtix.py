import os
import random
import shutil
from datetime import datetime, timedelta
from django.core.management.base import BaseCommand
from django.utils.timezone import make_aware
from tickets.models import WorkflowTicket
from django.conf import settings
from pathlib import Path

PRIORITIES = ['Low', 'Medium', 'High', 'Urgent']
STATUSES = ['New', 'Open', 'In Progress', 'Resolved', 'Closed', 'On Hold']
CATEGORIES = ['Network & Connectivity', 'Hardware', 'Software', 'User Access']
SUBCATEGORIES = ['VPN Access Issue', 'Printer Issue', 'Application Crash', 'Password Reset']
DEPARTMENTS = ['IT Support', 'Infrastructure', 'Development', 'Security']
NAMES = ['Alice', 'Bob', 'Charlie', 'Diana', 'Eve', 'Frank']
COMPANIES = ['Acme Corp', 'Globex', 'Initech', 'Umbrella Corp']

# Folder containing sample files
SAMPLE_FOLDER = os.path.join(settings.BASE_DIR, 'media/documents')
# Destination folder inside MEDIA_ROOT
ATTACHMENT_UPLOAD_DIR = 'uploads/tickets'

class Command(BaseCommand):
    help = "Seed the WorkflowTicket model with actual file-based attachments"

    def handle(self, *args, **kwargs):
        self.stdout.write("📥 Seeding WorkflowTickets with actual attachments...")

        if not os.path.isdir(SAMPLE_FOLDER):
            self.stdout.write(self.style.ERROR(f"❌ Attachment folder not found: {SAMPLE_FOLDER}"))
            return

        # Ensure destination upload directory exists
        dest_dir = os.path.join(settings.MEDIA_ROOT, ATTACHMENT_UPLOAD_DIR)
        os.makedirs(dest_dir, exist_ok=True)

        # Gather file paths
        sample_files = [
            os.path.join(SAMPLE_FOLDER, f)
            for f in os.listdir(SAMPLE_FOLDER)
            if os.path.isfile(os.path.join(SAMPLE_FOLDER, f))
        ]
        if not sample_files:
            self.stdout.write(self.style.WARNING("⚠️ No sample attachment files found. Proceeding without attachments."))

        for i in range(20):
            submit_date = make_aware(datetime.now() - timedelta(days=random.randint(1, 30)))
            update_date = submit_date + timedelta(days=random.randint(0, 5))

            # Copy random files and collect relative paths
            selected_files = random.sample(sample_files, k=random.randint(0, min(3, len(sample_files))))
            attached_paths = []

            for file_path in selected_files:
                filename = f"{datetime.now().timestamp()}_{os.path.basename(file_path)}"
                destination_path = os.path.join(dest_dir, filename)

                shutil.copy(file_path, destination_path)
                relative_path = os.path.join(ATTACHMENT_UPLOAD_DIR, filename).replace("\\", "/")
                attached_paths.append(relative_path)

            ticket = WorkflowTicket.objects.create(
                ticket_id=f"WF-{random.randint(1000, 9999)}",
                original_ticket_id=f"TK-{random.randint(1000, 9999)}",
                customer={
                    "id": random.randint(1, 100),
                    "name": random.choice(NAMES),
                    "company": random.choice(COMPANIES),
                },
                subject=f"Issue {i+1}: {random.choice(SUBCATEGORIES)}",
                category=random.choice(CATEGORIES),
                subcategory=random.choice(SUBCATEGORIES),
                description="Generated ticket with actual attachment files.",
                scheduled_date=(submit_date + timedelta(days=random.randint(1, 5))).date(),
                submit_date=submit_date,
                update_date=update_date,
                assigned_to=random.choice(NAMES),
                priority=random.choice(PRIORITIES),
                status=random.choice(STATUSES),
                department=random.choice(DEPARTMENTS),
                response_time=timedelta(hours=random.randint(1, 5)),
                resolution_time=timedelta(days=random.randint(1, 3)),
                time_closed=update_date + timedelta(days=1),
                rejection_reason=None if random.random() > 0.2 else "Unjustified request.",
                attachments=attached_paths,
                fetched_at=update_date,
            )

            self.stdout.write(self.style.SUCCESS(f"✅ Created: {ticket.subject} (Attachments: {len(attached_paths)})"))

        self.stdout.write(self.style.SUCCESS("🎉 Done seeding WorkflowTicket with real attachments."))
