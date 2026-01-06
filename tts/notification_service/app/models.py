from django.db import models
import uuid
from django.utils import timezone


# =============================================================================
# USER EMAIL CACHE - Synced from auth service via Celery
# =============================================================================

class UserEmailCache(models.Model):
    """
    Local cache of user emails synced from auth service.
    Avoids HTTP calls to auth service for every email notification.
    """
    user_id = models.IntegerField(primary_key=True, help_text="User ID from auth service")
    email = models.EmailField(help_text="User's email address")
    first_name = models.CharField(max_length=150, blank=True, default='')
    last_name = models.CharField(max_length=150, blank=True, default='')
    is_active = models.BooleanField(default=True, help_text="Whether user is active")
    synced_at = models.DateTimeField(auto_now=True, help_text="Last sync timestamp")
    
    class Meta:
        db_table = 'user_email_cache'
        verbose_name = 'User Email Cache'
        verbose_name_plural = 'User Email Cache'
    
    def __str__(self):
        return f"User {self.user_id}: {self.email}"
    
    @property
    def full_name(self):
        """Get user's full name."""
        if self.first_name and self.last_name:
            return f"{self.first_name} {self.last_name}"
        return self.first_name or self.last_name or f"User {self.user_id}"
    
    @classmethod
    def get_email(cls, user_id):
        """Get email for a user ID. Returns None if not found."""
        try:
            cache_entry = cls.objects.get(user_id=user_id)
            if cache_entry.is_active:
                return cache_entry.email
            return None
        except cls.DoesNotExist:
            return None
    
    @classmethod
    def get_user_info(cls, user_id):
        """Get full user info for a user ID."""
        try:
            cache_entry = cls.objects.get(user_id=user_id)
            return {
                'user_id': cache_entry.user_id,
                'email': cache_entry.email,
                'first_name': cache_entry.first_name,
                'last_name': cache_entry.last_name,
                'full_name': cache_entry.full_name,
                'is_active': cache_entry.is_active,
                'synced_at': cache_entry.synced_at.isoformat()
            }
        except cls.DoesNotExist:
            return None
    
    @classmethod
    def sync_user(cls, user_id, email, first_name='', last_name='', is_active=True):
        """Sync a single user's data. Creates or updates the cache entry."""
        cache_entry, created = cls.objects.update_or_create(
            user_id=user_id,
            defaults={
                'email': email,
                'first_name': first_name or '',
                'last_name': last_name or '',
                'is_active': is_active,
            }
        )
        return cache_entry, created
    
    @classmethod
    def bulk_sync(cls, users_data):
        """Bulk sync multiple users."""
        created_count = 0
        updated_count = 0
        
        for user_data in users_data:
            _, created = cls.sync_user(
                user_id=user_data['user_id'],
                email=user_data['email'],
                first_name=user_data.get('first_name', ''),
                last_name=user_data.get('last_name', ''),
                is_active=user_data.get('is_active', True)
            )
            if created:
                created_count += 1
            else:
                updated_count += 1
        
        return created_count, updated_count
    
    @classmethod
    def delete_user(cls, user_id):
        """Remove a user from the cache."""
        return cls.objects.filter(user_id=user_id).delete()


# =============================================================================
# NOTIFICATION TYPE CHOICES
# =============================================================================

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
