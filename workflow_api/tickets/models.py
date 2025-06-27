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
    original_ticket_id = models.CharField(max_length=20, db_index=True, blank=True, null=True)
    source_service = models.CharField(max_length=50, default='ticket_service', db_index=True)

    # Customer info
    employee = models.JSONField(blank=True, null=True)

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
    priority = models.CharField(max_length=10, choices=PRIORITY_LEVELS, default='Low', db_index=True, blank=True, null=True)
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='New', db_index=True, blank=True, null=True)
    department = models.CharField(max_length=100, db_index=True, blank=True, null=True)

    # Timing info
    response_time = models.DurationField(blank=True, null=True)
    resolution_time = models.DurationField(blank=True, null=True)
    time_closed = models.DateTimeField(blank=True, null=True)
    rejection_reason = models.TextField(blank=True, null=True)

    # Attachments
    attachments = models.JSONField(default=list, blank=True)

    # Workflow
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
        from tickets.tasks import send_ticket_status
        is_new = self.pk is None
        old_status = None

        if not is_new:
            try:
                old_status = WorkflowTicket.objects.get(pk=self.pk).status
            except WorkflowTicket.DoesNotExist:
                pass

        super().save(*args, **kwargs)

        # Allocate task
        if is_new and not self.is_task_allocated:
            from tickets.utils import allocate_task_for_ticket
            success = allocate_task_for_ticket(self)
            if success:
                WorkflowTicket.objects.filter(pk=self.pk, is_task_allocated=False).update(
                    is_task_allocated=True
                )

        # Send status update
        # Send status update
        if not is_new and old_status != self.status:
            print("status changed")
            try:
                result = send_ticket_status.delay(self.original_ticket_id or self.ticket_id, self.status)
                print(f"✅ Task queued to Celery. ID: {result.id}")
            except Exception as e:
                print(f"❌ Failed to queue task: {e}")