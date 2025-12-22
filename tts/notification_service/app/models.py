from django.db import models
import uuid
from django.utils import timezone

# Notification type choices for categorizing notifications
NOTIFICATION_TYPE_CHOICES = [
    ('task_assignment', 'Task Assignment'),
    ('task_transfer_out', 'Task Transferred From You'),
    ('task_transfer_in', 'Task Transferred To You'),
    ('task_escalation', 'Task Escalation'),
    ('task_completed', 'Task Completed'),
    ('task_status_update', 'Task Status Update'),
    ('ticket_resolved', 'Ticket Resolved'),
    ('ticket_closed', 'Ticket Closed'),
    ('ticket_reopened', 'Ticket Reopened'),
    ('sla_warning', 'SLA Warning'),
    ('sla_breach', 'SLA Breach'),
    ('workflow_step_change', 'Workflow Step Change'),
    ('comment_added', 'Comment Added'),
    ('mention', 'Mentioned in Comment'),
    ('system', 'System Notification'),
]

class InAppNotification(models.Model):
    """
    Model for storing in-app notifications
    """
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    user_id = models.IntegerField(help_text="User ID from auth service")
    subject = models.CharField(max_length=200)
    message = models.TextField()
    notification_type = models.CharField(
        max_length=50,
        choices=NOTIFICATION_TYPE_CHOICES,
        default='system',
        help_text="Type of notification for filtering and display"
    )
    related_task_item_id = models.CharField(
        max_length=100,
        null=True,
        blank=True,
        help_text="Related task item ID for navigation (links to user's specific assignment)"
    )
    related_ticket_number = models.CharField(
        max_length=100,
        null=True,
        blank=True,
        help_text="Related ticket number for navigation"
    )
    metadata = models.JSONField(
        default=dict,
        blank=True,
        help_text="Additional metadata for the notification (e.g., transferred_by, old_assignee)"
    )
    is_read = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)
    read_at = models.DateTimeField(null=True, blank=True)
    
    class Meta:
        ordering = ['-created_at']
        indexes = [
            models.Index(fields=['user_id', 'is_read']),
            models.Index(fields=['created_at']),
        ]
    
    def __str__(self):
        return f"{self.subject} for user {self.user_id}"
    
    def mark_as_read(self):
        """Mark the notification as read and save the timestamp"""
        if not self.is_read:
            self.is_read = True
            self.read_at = timezone.now()
            self.save()
