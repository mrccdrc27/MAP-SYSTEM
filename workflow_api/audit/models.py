from django.db import models
from django.contrib.contenttypes.models import ContentType
from django.contrib.contenttypes.fields import GenericForeignKey
import json


class AuditEvent(models.Model):
    """
    Generic audit event model to track user actions.
    Stores user, action type, target object, and structured changes.
    """
    
    ACTION_CHOICES = [
        ('create_workflow', 'Created Workflow'),
        ('update_workflow', 'Updated Workflow'),
        ('delete_workflow', 'Deleted Workflow'),
        ('publish_workflow', 'Published Workflow'),
        ('deploy_workflow', 'Deployed Workflow'),
        ('pause_workflow', 'Paused Workflow'),
        ('resume_workflow', 'Resumed Workflow'),
        
        ('create_step', 'Created Step'),
        ('update_step', 'Updated Step'),
        ('delete_step', 'Deleted Step'),
        ('reorder_steps', 'Reordered Steps'),
        
        ('create_task', 'Created Task'),
        ('update_task', 'Updated Task'),
        ('delete_task', 'Deleted Task'),
        ('assign_task', 'Assigned Task'),
        
        ('create_version', 'Created Version'),
        ('update_version', 'Updated Version'),
        ('publish_version', 'Published Version'),
        
        ('update_sla', 'Updated SLA'),
        ('update_category', 'Updated Category'),
        
        ('other', 'Other Action'),
    ]
    
    # User who performed the action
    user_id = models.IntegerField(null=True, blank=True, help_text="ID of user who performed action")
    username = models.CharField(max_length=255, null=True, blank=True, help_text="Username for audit trail")
    email = models.EmailField(null=True, blank=True, help_text="Email of user who performed action")
    
    # Action details
    action = models.CharField(
        max_length=100,
        choices=ACTION_CHOICES,
        help_text="Type of action performed"
    )
    
    # Target object information
    content_type = models.ForeignKey(
        ContentType,
        null=True,
        blank=True,
        on_delete=models.SET_NULL,
        help_text="Content type of the object being audited"
    )
    object_id = models.PositiveIntegerField(null=True, blank=True)
    content_object = GenericForeignKey('content_type', 'object_id')
    
    # Legacy direct references (for backward compatibility)
    target_type = models.CharField(
        max_length=100,
        null=True,
        blank=True,
        help_text="Model name (e.g., 'Workflow', 'Step')"
    )
    target_id = models.IntegerField(null=True, blank=True, help_text="ID of object being audited")
    
    # Changes tracking
    changes = models.JSONField(
        null=True,
        blank=True,
        help_text="Structured JSON describing what changed (old vs new values)"
    )
    description = models.TextField(
        null=True,
        blank=True,
        help_text="Human-readable description of the change"
    )
    
    # Metadata
    timestamp = models.DateTimeField(auto_now_add=True, db_index=True)
    ip_address = models.GenericIPAddressField(null=True, blank=True)
    user_agent = models.TextField(null=True, blank=True)
    
    class Meta:
        ordering = ['-timestamp']
        indexes = [
            models.Index(fields=['user_id', '-timestamp']),
            models.Index(fields=['target_type', 'target_id']),
            models.Index(fields=['action', '-timestamp']),
            models.Index(fields=['content_type', 'object_id']),
        ]
    
    def __str__(self):
        return f"{self.get_action_display()} by {self.username or self.user_id} at {self.timestamp}"
    
    def get_human_readable_description(self):
        """
        Generate a human-readable description based on action and changes.
        Example: "Marc updated Workflow #5: renamed from 'Old' → 'New'"
        """
        if self.description:
            return self.description
        
        base = f"{self.username or 'User'} {self.get_action_display().lower()}"
        
        if self.target_type and self.target_id:
            base += f" {self.target_type} #{self.target_id}"
        
        if self.changes:
            changes_str = self._format_changes()
            if changes_str:
                base += f": {changes_str}"
        
        return base
    
    def _format_changes(self):
        """Format changes dict into readable string"""
        if not self.changes or not isinstance(self.changes, dict):
            return ""
        
        parts = []
        for field, change in self.changes.items():
            if isinstance(change, dict):
                old = change.get('old')
                new = change.get('new')
                if old != new:
                    parts.append(f"{field}: {old} → {new}")
            else:
                parts.append(f"{field}: {change}")
        
        return ", ".join(parts)
    
    @classmethod
    def create_from_changes(cls, user_data, action, target=None, changes=None, 
                          description=None, request=None):
        """
        Factory method to create an audit event from changes.
        
        Args:
            user_data: Dict with user_id, username, email (from JWT)
            action: Action type string
            target: Optional target object (model instance)
            changes: Optional dict of changes {field: {old: val, new: val}}
            description: Optional human-readable description
            request: Optional Django request object for IP/user-agent
        
        Returns:
            AuditEvent instance
        """
        from django.contrib.contenttypes.models import ContentType
        
        event_data = {
            'user_id': user_data.get('user_id'),
            'username': user_data.get('username'),
            'email': user_data.get('email'),
            'action': action,
            'target_type': type(target).__name__ if target else None,
            'target_id': getattr(target, 'pk', None) if target else None,
            'changes': changes,
            'description': description,
        }
        
        # Add generic foreign key if target provided
        if target:
            try:
                content_type = ContentType.objects.get_for_model(target)
                event_data['content_type'] = content_type
                event_data['object_id'] = target.pk
            except Exception as e:
                # Silently fail if content type lookup fails
                pass
        
        # Add request metadata if available
        if request:
            event_data['ip_address'] = cls._get_client_ip(request)
            event_data['user_agent'] = request.META.get('HTTP_USER_AGENT', '')[:1000]
        
        return cls(**event_data)
    
    @staticmethod
    def _get_client_ip(request):
        """Extract client IP from request"""
        x_forwarded_for = request.META.get('HTTP_X_FORWARDED_FOR')
        if x_forwarded_for:
            ip = x_forwarded_for.split(',')[0]
        else:
            ip = request.META.get('REMOTE_ADDR')
        return ip


class AuditLog(models.Model):
    """
    Simplified audit log for quick action tracking.
    Use when you don't need structured change tracking.
    """
    
    user_id = models.IntegerField(null=True, blank=True)
    username = models.CharField(max_length=255, null=True, blank=True)
    action = models.CharField(max_length=255)
    entity_type = models.CharField(max_length=100, null=True, blank=True)
    entity_id = models.IntegerField(null=True, blank=True)
    details = models.JSONField(null=True, blank=True)
    timestamp = models.DateTimeField(auto_now_add=True, db_index=True)
    
    class Meta:
        ordering = ['-timestamp']
        indexes = [
            models.Index(fields=['user_id', '-timestamp']),
            models.Index(fields=['entity_type', 'entity_id']),
        ]
    
    def __str__(self):
        return f"{self.username} - {self.action} - {self.timestamp}"
