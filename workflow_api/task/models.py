from django.db import models
from django.core.exceptions import ValidationError
import uuid
import os
from django.conf import settings
import json

# Status choices for tasks
TASK_STATUS_CHOICES = [
    ('pending', 'Pending'),
    ('in_progress', 'In Progress'),
    ('completed', 'Completed'),
    ('on_hold', 'On Hold'),
    ('cancelled', 'Cancelled'),
]

# Status choices for task items (user assignments)
TASK_ITEM_STATUS_CHOICES = [
    ('assigned', 'Assigned'),
    ('in_progress', 'In Progress'),
    ('completed', 'Completed'),
    ('on_hold', 'On Hold'),
    ('acted', 'Acted'),
    ('escalated', 'Escalated'),
    ('transferred', 'Transferred'),
]

class Task(models.Model):
    task_id = models.AutoField(primary_key=True, unique=True)

    ticket_id = models.ForeignKey(
        'tickets.WorkflowTicket',
        on_delete=models.CASCADE,
    )
    workflow_id = models.ForeignKey('workflow.Workflows', on_delete=models.CASCADE)
    workflow_version = models.ForeignKey(
        'workflow.WorkflowVersion',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='tasks',
        help_text="The specific version of the workflow used for this task"
    )
    current_step = models.ForeignKey(
        'step.Steps',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        to_field='step_id'
    )
    status = models.CharField(
        max_length=36, 
        choices=TASK_STATUS_CHOICES,
        default='pending',
        help_text="Current status of the task"
    )

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    fetched_at = models.DateTimeField(null=True, blank=True)
    target_resolution = models.DateTimeField(null=True, blank=True, help_text="Target date and time for task resolution")
    resolution_time = models.DateTimeField(null=True, blank=True, help_text="Actual date and time when the task was resolved")

    def get_workflow(self):
        # Optional: only if you need to reference it somewhere dynamically
        from workflow.models import Workflows
        return Workflows.objects.first()
    
    def get_ticket(self):
        # Optional: only if you need to reference it somewhere dynamically
        from tickets.models import WorkflowTicket
        return WorkflowTicket.objects.first()

    def get_assigned_user_ids(self):
        """Get list of user IDs assigned to this task"""
        return list(self.taskitem_set.values_list('user_id', flat=True).distinct())
    
    def get_assigned_users_by_status(self, status=None):
        """Get TaskItem instances filtered by their assignment status"""
        if status:
            return self.taskitem_set.filter(status=status)
        return self.taskitem_set.all()
    
    def update_user_status(self, user_id, new_status):
        """Update the status of a specific assigned user"""
        from django.utils import timezone
        
        try:
            task_item = self.taskitem_set.get(user_id=user_id)
            task_item.status = new_status
            task_item.status_updated_on = timezone.now()
            task_item.save()
            return True
        except TaskItem.DoesNotExist:
            return False
    
    def add_user_assignment(self, role_user):
        """Add a new user assignment to the task"""
        from django.utils import timezone
        
        # Ensure required fields
        if not role_user:
            raise ValueError("role_user is required for user assignment")
        
        # Check if user is already assigned to this task
        if self.taskitem_set.filter(role_user=role_user).exists():
            return False  # User already assigned
        
        # Create TaskItem
        task_item = TaskItem.objects.create(
            task=self,
            role_user=role_user,
            status='assigned',
            assigned_on=timezone.now()
        )
        
        return True

    def __str__(self):
        return f'Task {self.task_id} for Ticket ID: {self.ticket_id}'
    
    def save(self, *args, **kwargs):
        # 🎯 Calculate target resolution if not already set
        if not self.target_resolution and self.ticket_id and self.current_step and self.workflow_id:
            try:
                from task.utils.target_resolution import calculate_target_resolution
                self.target_resolution = calculate_target_resolution(
                    ticket=self.ticket_id,
                    step=self.current_step,
                    workflow=self.workflow_id
                )
            except Exception as e:
                print(f"⚠️ Failed to calculate target resolution: {e}")
        
        super().save(*args, **kwargs)

    def mark_as_completed(self):
        """Mark task as completed and trigger workflow end logic"""
        self.status = 'completed'
        self.save()
        
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

    def move_to_next_step(self):
        """Move task to the next step in the workflow"""
        from step.models import StepTransition
        from django.utils import timezone
        
        if not self.current_step:
            print("⚠️ No current step set for this task")
            return False
        
        # Find next step through transitions
        transition = StepTransition.objects.filter(
            from_step_id=self.current_step,
            workflow_id=self.workflow_id
        ).first()
        
        if not transition:
            print(f"⚠️ No transition found from step {self.current_step.name}")
            return False
        
        # Move to next step
        next_step = transition.to_step_id
        self.current_step = next_step
        
        # Reset user assignments for new step
        if next_step and next_step.role_id:
            # Fetch new users for the next step's role
            from tickets.tasks import fetch_users_for_role, apply_round_robin_assignment
            
            users_for_role = fetch_users_for_role(next_step.role_id.role_id)
            if users_for_role:
                # Append new users instead of overwriting
                new_assignments = apply_round_robin_assignment(
                    users_for_role, 
                    next_step.role_id.name
                )
                # Add new TaskItems
                for assignment in new_assignments:
                    self.add_user_assignment(assignment)
            # If no users, keep existing assignments (don't clear)
        
        self.status = 'pending'
        self.save()
        
        print(f"✅ Task moved to step: {next_step.name}")
        return True

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
        ticket_data = ticket.ticket_data
        attachments = ticket_data.get('attachments') or []

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
                ticket_id = ticket_data.get('ticket_id') or ticket_data.get('id')
                data["ticket_id"] = ticket_id
                data["subject"] = ticket_data.get('subject', '')
                data["description"] = ticket_data.get('description', '')
                
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
                        'is_resolved': False
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


class TaskItem(models.Model):
    """
    Represents a single user assignment within a task.
    Each row is one user assigned to a task via a RoleUsers assignment.
    """
    task_item_id = models.AutoField(primary_key=True, unique=True)
    
    task = models.ForeignKey(Task, on_delete=models.CASCADE)
    role_user = models.ForeignKey('role.RoleUsers', on_delete=models.CASCADE, help_text="Link to RoleUsers for user and role info")
    transferred_to = models.ForeignKey(
        'role.RoleUsers',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='transferred_task_items',
        help_text="User this task was transferred to"
    )
    transferred_by = models.IntegerField(
        null=True,
        blank=True,
        help_text="User ID of the admin who transferred this task"
    )
    status = models.CharField(
        max_length=50,
        choices=TASK_ITEM_STATUS_CHOICES,
        default='assigned',
        help_text="Status of this user's assignment"
    )
    notes = models.TextField(blank=True, help_text="Notes provided during action transition")
    
    assigned_on = models.DateTimeField(auto_now_add=True)
    status_updated_on = models.DateTimeField(null=True, blank=True)
    target_resolution = models.DateTimeField(null=True, blank=True, help_text="Target date and time for task resolution")
    resolution_time = models.DateTimeField(null=True, blank=True, help_text="Actual date and time when the task was resolved")
    acted_on = models.DateTimeField(null=True, blank=True)
    acted_on_step = models.ForeignKey(
        'step.Steps',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        to_field='step_id',
        help_text="The step where the user acted on this task"
    )
    
    class Meta:
        ordering = ['assigned_on']
    
    def __str__(self):
        return f'TaskItem {self.task_item_id}: User {self.role_user.user_id} → Task {self.task_id}'
    
    def to_dict(self):
        """Convert to dictionary for API responses"""
        return {
            'user_id': self.role_user.user_id,
            'user_full_name': self.role_user.user_full_name,
            'role': self.role_user.role_id.name,
            'status': self.status,
            'notes': self.notes,
            'assigned_on': self.assigned_on.isoformat() if self.assigned_on else None,
            'status_updated_on': self.status_updated_on.isoformat() if self.status_updated_on else None,
            'acted_on': self.acted_on.isoformat() if self.acted_on else None,
            'acted_on_step': {
                'step_id': self.acted_on_step.step_id,
                'name': self.acted_on_step.name
            } if self.acted_on_step else None,
        }

