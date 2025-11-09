from django.db import models

class RoundRobin(models.Model):
    """Stores round-robin state for role-based user assignment"""
    role_name = models.CharField(max_length=255, unique=True, db_index=True)
    current_index = models.IntegerField(default=0)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        db_table = 'tickets_roundrobin'
    
    def __str__(self):
        return f"RoundRobin({self.role_name}, index={self.current_index})"

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
    ticket_number = models.CharField(max_length=50, blank=True, null=True, db_index=True)
    source_service = models.CharField(max_length=50, default='ticket_service', db_index=True)

    # Customer info
    employee = models.JSONField(blank=True, null=True)
    employee_cookie_id = models.IntegerField(blank=True, null=True)

    # Ticket metadata
    subject = models.CharField(max_length=255)
    category = models.CharField(max_length=100, blank=True, null=True)
    subcategory = models.CharField(max_length=100, blank=True, null=True)
    sub_category = models.CharField(max_length=100, blank=True, null=True)  # Alternative field name from JSON
    description = models.TextField(blank=True, null=True)
    scheduled_date = models.DateField(blank=True, null=True)
    submit_date = models.DateTimeField(blank=True, null=True)
    update_date = models.DateTimeField(blank=True, null=True)
    assigned_to = models.CharField(max_length=255, blank=True, null=True)

    # Status tracking
    priority = models.CharField(max_length=10, choices=PRIORITY_LEVELS, default='Low', db_index=True, blank=True, null=True)
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='New', db_index=True, blank=True, null=True)
    department = models.CharField(max_length=100, db_index=True, blank=True, null=True)

    # Asset-related fields
    asset_name = models.CharField(max_length=255, blank=True, null=True)
    serial_number = models.CharField(max_length=100, blank=True, null=True)
    location = models.CharField(max_length=255, blank=True, null=True)
    expected_return_date = models.DateField(blank=True, null=True)
    issue_type = models.CharField(max_length=100, blank=True, null=True)
    other_issue = models.TextField(blank=True, null=True)

    # Performance/Project fields
    performance_start_date = models.DateField(blank=True, null=True)
    performance_end_date = models.DateField(blank=True, null=True)
    
    # Approval and Budget fields
    approved_by = models.CharField(max_length=255, blank=True, null=True)
    rejected_by = models.CharField(max_length=255, blank=True, null=True)
    cost_items = models.JSONField(blank=True, null=True)
    requested_budget = models.DecimalField(max_digits=12, decimal_places=2, blank=True, null=True)
    fiscal_year = models.CharField(max_length=10, blank=True, null=True)
    department_input = models.TextField(blank=True, null=True)

    # Dynamic data storage
    dynamic_data = models.JSONField(default=dict, blank=True)

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
            models.Index(fields=['ticket_number']),
            models.Index(fields=['source_service']),
            models.Index(fields=['status']),
            models.Index(fields=['priority']),
            models.Index(fields=['employee']),
            models.Index(fields=['department']),
            models.Index(fields=['asset_name']),
            models.Index(fields=['serial_number']),
            models.Index(fields=['employee_cookie_id']),
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

        # Note: Task allocation now happens in receive_ticket() -> create_task_for_ticket()
        # which provides intelligent workflow matching and user assignment via round-robin

        # Send status update
        if not is_new and old_status != self.status:
            print("status changed")
            try:
                result = send_ticket_status.delay(self.original_ticket_id or self.ticket_id, self.status)
                print(f"✅ Task queued to Celery. ID: {result.id}")
            except Exception as e:
                print(f"❌ Failed to queue task: {e}")