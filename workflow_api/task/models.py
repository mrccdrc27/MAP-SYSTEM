from django.db import models
from django.core.exceptions import ValidationError


# Status choices for tasks
TASK_STATUS_CHOICES = [
    ('pending', 'Pending'),
    ('in progress', 'In Progress'),
    ('completed', 'Completed'),
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
        return list(self.taskitem_set.values_list('role_user__user_id', flat=True).distinct())
    
    def get_assigned_users_by_status(self, status=None):
        """Get TaskItem instances filtered by their assignment status"""
        if status:
            return self.taskitem_set.filter(status=status)
        return self.taskitem_set.all()
    
    def update_user_status(self, user_id, new_status):
        """Update the status of a specific assigned user"""
        from django.utils import timezone
        
        try:
            task_item = self.taskitem_set.get(role_user__user_id=user_id)
            
            # Create history record for the status change
            TaskItemHistory.objects.create(
                task_item=task_item,
                status=new_status
            )
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
            origin='System'
        )
        
        # Create initial history record
        TaskItemHistory.objects.create(
            task_item=task_item,
            status='new'
        )
        
        return True

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
    task_id = models.CharField(max_length=50, help_text="Task ID")
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
            models.Index(fields=['user_id', 'task_id']),
        ]
    
    def __str__(self):
        return f'FailedNotification {self.failed_notification_id}: User {self.user_id} - Task {self.task_id} ({self.status})'
