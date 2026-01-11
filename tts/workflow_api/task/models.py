from django.db import models


# Status choices for tasks
TASK_STATUS_CHOICES = [
    ('pending', 'Pending'),
    ('in progress', 'In Progress'),
    ('completed', 'Completed'),
    ('pending_external', 'Pending External'),  # Awaiting external system (AMS/BMS) resolution
    ('on_hold', 'On Hold'),
    ('cancelled', 'Cancelled'),
]

# Status choices for task items (user assignments)
TASK_ITEM_STATUS_CHOICES = [
    ('new', 'New'),
    ('in progress', 'In Progress'),
    ('resolved', 'Resolved'),
    ('reassigned', 'Reassigned'),
    ('escalated', 'Escalated'),
    ('breached', 'Breached'),
]

# Origin choices for task items (where the assignment came from)
TASK_ITEM_ORIGIN_CHOICES = [
    ('System', 'System'),
    ('Transferred', 'Transferred'),
    ('Escalation', 'Escalation'),
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
    ticket_owner = models.ForeignKey(
        'role.RoleUsers',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='owned_tasks',
        help_text="Ticket Coordinator assigned as owner via round-robin rotation"
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
    ams_executed = models.BooleanField(
        default=False,
        help_text="Indicates if AMS (Asset Management System) has processed/approved this task"
    )

    def get_assigned_user_ids(self):
        """Get list of user IDs assigned to this task"""
        return list(self.taskitem_set.values_list('role_user__user_id', flat=True).distinct())

    def __str__(self):
        return f'Task {self.task_id} for Ticket ID: {self.ticket_id}'
    
    def save(self, *args, **kwargs):
        # 🎯 Calculate target resolution if not already set
        # Task uses FULL SLA (not weighted by step)
        if not self.target_resolution and self.ticket_id and self.workflow_id:
            try:
                from task.utils.target_resolution import calculate_target_resolution_for_task
                self.target_resolution = calculate_target_resolution_for_task(
                    ticket=self.ticket_id,
                    workflow=self.workflow_id
                )
            except Exception as e:
                print(f"⚠️ Failed to calculate task target resolution: {e}")
        
        super().save(*args, **kwargs)

    def mark_as_completed(self):
        """Mark task as completed"""
        self.status = 'completed'
        self.save()

    def move_to_next_step(self):
        """
        Move task to the next step in the workflow.
        Delegates logic to TaskService to keep model thin.
        """
        from task.services import TaskService
        return TaskService.move_task_to_next_step(self)


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
    origin = models.CharField(
        max_length=50,
        choices=TASK_ITEM_ORIGIN_CHOICES,
        default='System',
        help_text="Origin of this assignment: System (auto-assigned), Transferred (admin transfer), or Escalation"
    )
    notes = models.TextField(blank=True, help_text="Notes provided during action transition")
    assigned_on = models.DateTimeField(auto_now_add=True, help_text="When this assignment was created")
    
    target_resolution = models.DateTimeField(null=True, blank=True, help_text="Target date and time for task resolution")
    resolution_time = models.DateTimeField(null=True, blank=True, help_text="Actual date and time when the task was resolved")
    acted_on = models.DateTimeField(null=True, blank=True)
    assigned_on_step = models.ForeignKey(
        'step.Steps',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        to_field='step_id',
        help_text="The step where this task item was assigned"
    )
    
    class Meta:
        ordering = ['task']
    
    def __str__(self):
        return f'TaskItem {self.task_item_id}: User {self.role_user.user_id} → Task {self.task_id}'
    
    def to_dict(self):
        """Convert to dictionary for API responses"""
        # Get the most recent history entry for this task item
        latest_history = self.taskitemhistory_set.order_by('-created_at').first()
        
        return {
            'user_id': self.role_user.user_id,
            'user_full_name': self.role_user.user_full_name,
            'role': self.role_user.role_id.name,
            'status': latest_history.status if latest_history else None,
            'notes': self.notes,
            'assigned_on': self.assigned_on.isoformat() if self.assigned_on else None,
            'acted_on': self.acted_on.isoformat() if self.acted_on else None,
            'assigned_on_step': {
                'step_id': self.assigned_on_step.step_id,
                'name': self.assigned_on_step.name
            } if self.assigned_on_step else None,
        }


class TaskItemHistory(models.Model):
    """
    Stores historical records of task item status changes.
    Maintains audit trail of when assignments were created and status updates occurred.
    """
    task_item_history_id = models.AutoField(primary_key=True, unique=True)
    
    task_item = models.ForeignKey(TaskItem, on_delete=models.CASCADE, related_name='taskitemhistory_set')
    
    status = models.CharField(
        max_length=50,
        choices=TASK_ITEM_STATUS_CHOICES,
        help_text="Status at this point in history"
    )
    
    created_at = models.DateTimeField(auto_now_add=True, help_text="When this history record was created")
    
    class Meta:
        ordering = ['task_item', 'created_at']
        verbose_name_plural = "Task Item History"
    
    def __str__(self):
        return f'TaskItemHistory {self.task_item_history_id}: TaskItem {self.task_item_id} - Status {self.status}'


class FailedNotification(models.Model):
    """
    Stores failed notification attempts for later retry.
    When RabbitMQ or Celery is unavailable, notifications are stored here.
    """
    NOTIFICATION_STATUS_CHOICES = [
        ('pending', 'Pending Retry'),
        ('retrying', 'Retrying'),
        ('failed', 'Failed'),
        ('success', 'Success'),
    ]
    
    failed_notification_id = models.AutoField(primary_key=True)
    
    # Notification details
    user_id = models.IntegerField(help_text="User ID to notify")
    task_item_id = models.CharField(max_length=50, help_text="Task Item ID")
    task_title = models.CharField(max_length=255, help_text="Task title/subject")
    role_name = models.CharField(max_length=100, help_text="Role name")
    
    # Tracking
    status = models.CharField(
        max_length=20,
        choices=NOTIFICATION_STATUS_CHOICES,
        default='pending',
        help_text="Current status of this notification"
    )
    error_message = models.TextField(blank=True, help_text="Error details from failed attempt")
    retry_count = models.IntegerField(default=0, help_text="Number of retry attempts")
    max_retries = models.IntegerField(default=3, help_text="Maximum retry attempts")
    
    # Timestamps
    created_at = models.DateTimeField(auto_now_add=True, help_text="When notification first failed")
    last_retry_at = models.DateTimeField(null=True, blank=True, help_text="Last retry attempt")
    succeeded_at = models.DateTimeField(null=True, blank=True, help_text="When notification finally succeeded")
    
    class Meta:
        ordering = ['-created_at']
        indexes = [
            models.Index(fields=['status', 'created_at']),
            models.Index(fields=['user_id', 'task_item_id']),
        ]
    
    def __str__(self):
        return f'FailedNotification {self.failed_notification_id}: User {self.user_id} - TaskItem {self.task_item_id} ({self.status})'