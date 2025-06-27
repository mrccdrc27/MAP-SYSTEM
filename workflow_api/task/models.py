from django.db import models
from django.core.exceptions import ValidationError
import uuid
import os
from django.conf import settings
import json


class Task(models.Model):
    task_id = models.CharField(max_length=64, unique=True, null=True, blank=True)  # New UUID field

    ticket_id = models.ForeignKey(
        'tickets.WorkflowTicket',  # Assuming Ticket model is in tickets app
        on_delete=models.CASCADE,
    )
    workflow_id = models.ForeignKey('workflow.Workflows', on_delete=models.CASCADE)

    def get_workflow(self):
        # Optional: only if you need to reference it somewhere dynamically
        from workflow.models import Workflows
        return Workflows.objects.first()
    
    def get_ticket(self):
        # Optional: only if you need to reference it somewhere dynamically
        from tickets.models import WorkflowTicket
        return WorkflowTicket.objects.first()

    fetched_at = models.DateTimeField(null=True, blank=True)

    def __str__(self):
        return f'Task {self.id} for Ticket ID: {self.ticket_id}'
    
    def save(self, *args, **kwargs):
        if not self.pk:  # Only enforce immutability on creation
            if not self.task_id:
                self.task_id = str(uuid.uuid4())  # Assign a unique identifier if missing
        else:
            if 'task_id' in kwargs.get('update_fields', []):
                raise ValidationError("task_id cannot be modified after creation.")  # Prevent updates
        
        super().save(*args, **kwargs)

    def mark_as_completed(self):
        if not self.workflow_id:
            print("⚠️ No workflow associated with this task.")
            return

        end_logic = self.workflow_id.end_logic

        # ⚙️ Trigger logic based on end_logic
        if end_logic == 'asset':
            print("✅ Asset logic triggered.")
            self._process_attachments_from_ticket()
        elif end_logic == 'budget':
            print("💰 Budget logic triggered.")
            self._process_attachments_from_ticket()
        elif end_logic == 'notification':
            print("🔔 Notification logic triggered.")
            self._process_attachments_from_ticket()
            # Could send emails or push messages here
        else:
            print("⚠️ Unknown end logic:", end_logic)

    def _process_attachments_from_ticket(self):
        from amscheckout.serializers import CheckoutSerializer
        from bmscheckout.serializers import ProjectSerializer
        from bmscheckout.models import Project
        from .utils.document_parser_3 import process_document
        import requests
        import json

        API_URL = "https://budget-pro.onrender.com/api/external-budget-proposals/"
        API_KEY = "t@=1%4-ib(ow*i2#87$l4=i%3@ak!vnwyp2l&p52^+a!f$s#^r"

        if not self.ticket_id:
            print("⚠️ No ticket associated with this task.")
            return

        ticket = self.ticket_id
        attachments = ticket.attachments or []

        if not attachments:
            print("📭 No attachments to process.")
            return

        for attachment in attachments:
            file_url = attachment.get("file")
            if not file_url:
                print("⚠️ Malformed attachment object, missing 'file' key.")
                continue

            try:
                print(f"🌐 Processing from URL: {file_url}")
                result = process_document(file_url)  # 🔥 Pass URL directly
                print("✅ Extracted JSON:\n", result)

                data = json.loads(result)
                data["ticket_id"] = ticket.ticket_id
                data["subject"] = ticket.subject
                data["description"] = ticket.description

                # AMS Checkout JSON
                if "asset_id" in data and "requestor" in data:
                    print("1️⃣ AMS-style JSON detected.")

                    serializer = CheckoutSerializer(data={
                        "ticket_id": data.get("ticket_id"),
                        "asset_id": data.get("asset_id"),
                        "asset_name": data.get("asset_name"),
                        "requestor": data.get("requestor"),
                        "requestor_location": data.get("requestor_location"),
                        "requestor_id": data.get("requestor_id"),
                        "checkout_date": data.get("checkout_date"),
                        "checkin_date": data.get("checkin_date"),
                        "return_date": data.get("return_date"),
                        "is_resolved": data.get("is_resolved", False),
                        "checkout_ref_id": data.get("checkout_ref_id"),
                        "condition": data.get("condition", 1),
                        "subject": data.get("subject"),
                        "description": data.get("description"),
                    })

                    if serializer.is_valid():
                        serializer.save()
                        print(f"✅ Checkout record saved for ticket: {data.get('ticket_id')}")
                    else:
                        print(f"❌ Failed to save Checkout record: {serializer.errors}")

                # BMS Proposal JSON
                elif "title" in data and "project_summary" in data and "items" in data:
                    print("2️⃣ BMS-style JSON detected.")

                    serializer = ProjectSerializer(data={
                        "ticket_id": data.get("ticket_id"),
                    })

                    if serializer.is_valid():
                        serializer.save()
                        print(f"✅ Project record saved for ticket: {data.get('ticket_id')}")

                        # 🚀 Only send BMS data to API
                        try:
                            headers = {
                                "Content-Type": "application/json",
                                "X-API-Key": API_KEY
                            }
                            response = requests.post(API_URL, headers=headers, json=data)

                            if response.status_code in (200, 201):
                                print(f"📡 Data pushed successfully to API ({response.status_code})")
                            else:
                                print(f"❌ Failed to push to API ({response.status_code}): {response.text}")
                        except Exception as e:
                            print(f"❌ Error sending data to API: {e}")
                    else:
                        print(f"❌ Failed to save Project record: {serializer.errors}")

                else:
                    print("⚠️ Unknown JSON structure.")

            except Exception as e:
                print(f"❌ Failed to process URL {file_url}: {e}")
