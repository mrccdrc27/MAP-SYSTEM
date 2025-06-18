from django.db import models
from django.core.exceptions import ValidationError
import uuid

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
        # self.status = 'completed'
        # self.save(update_fields=['status'])

        # 🔍 Extract end logic from related workflow
        if not self.workflow_id:
            print("⚠️ No workflow associated with this task.")
            return

        end_logic = self.workflow_id.end_logic

        # ⚙️ Trigger logic based on end_logic
        if end_logic == 'asset':
            print("✅ Asset logic triggered.")
            # You could trigger asset processing here
        elif end_logic == 'budget':
            print("💰 Budget logic triggered.")
            # Or budget updates here
        elif end_logic == 'notification':
            print("🔔 Notification logic triggered.")
            # Send a notification here
        else:
            print("⚠️ Unknown end logic:", end_logic)
