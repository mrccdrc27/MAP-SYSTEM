# ticket_service/models.py
from django.db import models
from django.db.models.signals import post_save
from django.dispatch import receiver
from datetime import datetime
import random

class Ticket(models.Model):
    PRIORITY_CHOICES = [
        ('Low', 'Low'),
        ('Medium', 'Medium'),
        ('High', 'High'),
        ('Urgent', 'Urgent'),
    ]

    STATUS_CHOICES = [
        ('New', 'New'),
        ('Open', 'Open'),
        ('In Progress', 'In Progress'),
        ('Resolved', 'Resolved'),
        ('Closed', 'Closed'),
        ('On Hold', 'On Hold'),
    ]

    # Ticket identity fields
    ticket_id = models.CharField(max_length=20, unique=True, db_index=True, blank=True, null=True)
    original_ticket_id = models.CharField(max_length=20, db_index=True,  blank=True, null=True)  # ID from source service
    source_service = models.CharField(max_length=50, default='ticket_service', db_index=True)

    # Customer info
    employee = models.JSONField(blank=True, null=True)  # Dict with id, name, company_id, etc.

    # Ticket metadata
    subject = models.CharField(max_length=255)
    category = models.CharField(max_length=100, blank=True, null=True)
    subcategory = models.CharField(max_length=100, blank=True, null=True)
    description = models.TextField(blank=True, null=True)
    scheduled_date = models.DateField(blank=True, null=True)
    submit_date = models.DateTimeField(blank=True, null=True)
    update_date = models.DateTimeField(blank=True, null=True)
    assigned_to = models.CharField(max_length=255, blank=True, null=True)

    # Status tracking
    priority = models.CharField(max_length=10, choices=PRIORITY_CHOICES, default='Low', db_index=True,  blank=True, null=True)
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='New', db_index=True,  blank=True, null=True)
    department = models.CharField(max_length=100, db_index=True,  blank=True, null=True)

    # Timing info
    response_time = models.DurationField(blank=True, null=True)
    resolution_time = models.DurationField(blank=True, null=True)
    time_closed = models.DateTimeField(blank=True, null=True)
    rejection_reason = models.TextField(blank=True, null=True)

    # Attachments as JSON
    attachments = models.JSONField(default=list, blank=True)

    # Workflow-specific
    is_task_allocated = models.BooleanField(default=False)
    fetched_at = models.DateTimeField(blank=True, null=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        indexes = [
            models.Index(fields=['ticket_id']),
            models.Index(fields=['original_ticket_id']),
            models.Index(fields=['source_service']),
            models.Index(fields=['status']),
            models.Index(fields=['priority']),
            models.Index(fields=['employee']),
            models.Index(fields=['department']),
        ]

    def save(self, *args, **kwargs):
        """Generate ticket_id in format TXYYYYMMDD###### if not set."""
        if not self.ticket_id:
            self.ticket_id = self._generate_unique_ticket_id()
        super().save(*args, **kwargs)

    def _generate_unique_ticket_id(self):
        """
        Generate a unique ticket ID in the format: TXYYYYMMDD######
        - TX: Fixed prefix (Ticket Transaction)
        - YYYYMMDD: UTC date
        - ######: 6-digit random number (000000-999999)
        """
        max_attempts = 100
        
        for _ in range(max_attempts):
            # Get current UTC date in YYYYMMDD format
            date_part = datetime.utcnow().strftime('%Y%m%d')
            
            # Generate 6-digit random number
            random_part = f"{random.randint(0, 999999):06d}"
            
            # Combine: TX + YYYYMMDD + ######
            ticket_id = f"TX{date_part}{random_part}"
            
            # Check if this ticket_id already exists
            if not Ticket.objects.filter(ticket_id=ticket_id).exists():
                return ticket_id
        
        # Fallback: if somehow we couldn't generate unique ID in 100 attempts
        raise ValueError("Unable to generate unique ticket ID after multiple attempts")

    def __str__(self):
        return f"{self.ticket_id} - {self.subject}"

from .tasks import push_ticket_to_workflow
from .serializers import TicketSerializer

@receiver(post_save, sender=Ticket)
def send_ticket_to_workflow(sender, instance, created, **kwargs):
    if created:
        serializer = TicketSerializer(instance)
        push_ticket_to_workflow.delay(serializer.data)
