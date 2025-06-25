from django.db import models

class WorkflowTicket(models.Model):
    PRIORITY_LEVELS = [
        ('Critical', 'Critical'),
        ('High', 'High'),
        ('Medium', 'Medium'),
        ('Low', 'Low'),
    ]

    STATUS_CHOICES = [
        ('New', 'New'),
        ('Open', 'Open'),
        ('On Process', 'On Process'),
        ('On Hold', 'On Hold'),
        ('Pending', 'Pending'),
        ('Resolved', 'Resolved'),
        ('Rejected', 'Rejected'),
        ('Closed', 'Closed'),
    ]

    # Ticket identity fields
    ticket_id = models.CharField(max_length=20, blank=True, null=True)
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
    priority = models.CharField(max_length=10, choices=PRIORITY_LEVELS, default='Low', db_index=True,  blank=True, null=True)
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
            models.Index(fields=['original_ticket_id']),
            models.Index(fields=['source_service']),
            models.Index(fields=['status']),
            models.Index(fields=['priority']),
            models.Index(fields=['employee']),
            models.Index(fields=['department']),
        ]

    def save(self, *args, **kwargs):
        is_new = self.pk is None
        super().save(*args, **kwargs)

        if is_new and not self.is_task_allocated:
            from tickets.utils import allocate_task_for_ticket
            success = allocate_task_for_ticket(self)

            if success:
                # Important: prevent race condition from parallel creation
                WorkflowTicket.objects.filter(pk=self.pk, is_task_allocated=False).update(
                    is_task_allocated=True
                )

    def __str__(self):
        return f"WF-{self.id} ({self.original_ticket_id}) - {self.subject}"
