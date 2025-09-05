from celery import shared_task
from tickets.models import WorkflowTicket
from datetime import datetime, timedelta
from django.utils.timezone import make_aware
from django.utils.dateparse import parse_datetime
from django.core.exceptions import ValidationError
from django.conf import settings
import requests
from urllib.parse import urlparse, urljoin
import os
from django.db import transaction

@shared_task(name='tickets.tasks.receive_ticket')
def receive_ticket(ticket_data):
    import traceback
    try:
        # ✅ Normalize keys
        if 'ticket_number' in ticket_data:
            ticket_data['ticket_id'] = ticket_data.pop('ticket_number')
        if 'sub_category' in ticket_data:
            ticket_data['subcategory'] = ticket_data.pop('sub_category')

        # ✅ Parse datetime and durations
        if isinstance(ticket_data.get('opened_on'), str):
            try:
                ticket_data['opened_on'] = datetime.fromisoformat(ticket_data['opened_on']).date()
            except Exception:
                ticket_data['opened_on'] = None

        if isinstance(ticket_data.get('fetched_at'), str):
            try:
                dt = parse_datetime(ticket_data['fetched_at'])
                ticket_data['fetched_at'] = make_aware(dt) if dt and dt.tzinfo is None else dt
            except Exception:
                ticket_data['fetched_at'] = None

        for dur_field in ['response_time', 'resolution_time']:
            if isinstance(ticket_data.get(dur_field), str):
                try:
                    h, m, s = map(float, ticket_data[dur_field].split(':'))
                    ticket_data[dur_field] = timedelta(hours=h, minutes=m, seconds=s)
                except Exception:
                    ticket_data[dur_field] = None

        # ✅ Filter allowed fields
        allowed_fields = {
            'ticket_id', 'subject', 'employee', 'priority', 'status', 'opened_on', 'sla',
            'description', 'department', 'position', 'fetched_at', 'category', 'subcategory',
            'original_ticket_id', 'source_service', 'attachments', 'is_task_allocated',
            'submit_date', 'update_date', 'response_time', 'resolution_time', 'time_closed', 'rejection_reason'
        }
        ticket_data = {k: v for k, v in ticket_data.items() if k in allowed_fields}

        # ✅ Validate required fields
        required_fields = ['ticket_id', 'category', 'subcategory']
        missing = [field for field in required_fields if not ticket_data.get(field)]
        if missing:
            return {
                "status": "error",
                "type": "validation_error",
                "errors": {field: "This field is required." for field in missing}
            }

        # ✅ Validate attachments exist
        validated_attachments = []
        for att in ticket_data.get("attachments", []):
            file_url = att.get("file")
            if not file_url:
                continue
            try:
                # Extract the path after /media/
                relative_path = urlparse(file_url).path.split("/media/")[1]
                abs_path = os.path.join(settings.MEDIA_ROOT, os.path.normpath(relative_path))

                # Ensure destination directory exists
                os.makedirs(os.path.dirname(abs_path), exist_ok=True)

                # Skip downloading if the file already exists
                if os.path.exists(abs_path):
                    print(f"✅ File already exists: {abs_path}")
                else:
                    print(f"📥 Downloading: {file_url}")
                    response = requests.get(file_url)
                    if response.status_code == 200:
                        with open(abs_path, "wb") as f:
                            f.write(response.content)
                        print(f"✅ Stored: {abs_path}")
                    else:
                        print(f"❌ Failed to download: {file_url} (status {response.status_code})")
                        continue  # skip this attachment

                # Attach the new internal file URL
                validated_attachments.append({
                    "file": urljoin(settings.BASE_URL, f"/media/{relative_path.replace(os.sep, '/')}")
                })

            except Exception as e:
                print(f"❌ Error processing attachment {file_url}: {e}")
                continue

        # ✅ Create and save with explicit transaction
        with transaction.atomic():
            ticket = WorkflowTicket(**ticket_data)
            ticket.full_clean()
            ticket.save()
            
            # Force a database query to verify the save worked
            saved_ticket = WorkflowTicket.objects.get(pk=ticket.pk)
            print(f"✅ Verified ticket saved with ID: {saved_ticket.pk}")

        return {"status": "success", "ticket_id": ticket.ticket_id}

    except ValidationError as ve:
        return {
            "status": "error",
            "type": "validation_error",
            "errors": ve.message_dict
        }

    except Exception as e:
        return {
            "status": "error",
            "type": "exception",
            "error": str(e),
            "trace": traceback.format_exc()
        }


# tickets/tasks.py

import json

@shared_task(name="send_ticket_status")
def send_ticket_status(ticket_id, status):
    data = {
        "ticket_number": ticket_id,
        "new_status": status
    }
    json_data = json.dumps(data)
    print("Sending to queue:", json_data)
    return json_data
