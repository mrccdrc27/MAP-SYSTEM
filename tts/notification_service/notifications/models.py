#tts/notifications/service/models.py
from django.db import models
import uuid
from django.utils import timezone


class NotificationTemplate(models.Model):
    """
    Template for different types of notifications
    """
    NOTIFICATION_TYPES = [
        ('account_locked', 'Account Locked'),
        ('account_unlocked', 'Account Unlocked'),
        ('failed_login_attempt', 'Failed Login Attempt'),
        ('password_reset', 'Password Reset'),
        ('login_success', 'Successful Login'),
        ('otp_generated', 'OTP Generated'),
        ('profile_updated', 'Profile Updated'),
        ('account_created', 'Account Created'),
    ]
    
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    notification_type = models.CharField(max_length=50, choices=NOTIFICATION_TYPES, unique=True)
    subject = models.CharField(max_length=200)
    body_text = models.TextField(help_text="Plain text email body with placeholders like {user_name}, {timestamp}")
    body_html = models.TextField(blank=True, help_text="HTML email body (optional)")
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        ordering = ['notification_type']
    
    def __str__(self):
        return f"{self.get_notification_type_display()} Template"


class NotificationLog(models.Model):
    """
    Log of sent notifications for tracking purposes
    """
    STATUS_CHOICES = [
        ('pending', 'Pending'),
        ('sent', 'Sent'),
        ('failed', 'Failed'),
    ]
    
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    user_id = models.CharField(max_length=255, help_text="User ID from auth service (can be UUID or integer)", null=True, blank=True)
    user_email = models.EmailField()
    notification_type = models.CharField(max_length=50)
    recipient_email = models.EmailField()
    subject = models.CharField(max_length=200)
    message = models.TextField()
    context_data = models.JSONField(default=dict, blank=True, help_text="Additional context data used for the notification")
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='pending')
    error_message = models.TextField(blank=True, null=True)
    sent_at = models.DateTimeField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    
    class Meta:
        ordering = ['-created_at']
        indexes = [
            models.Index(fields=['user_id', 'notification_type']),
            models.Index(fields=['status', 'created_at']),
            models.Index(fields=['user_email']),
        ]
    
    def __str__(self):
        return f"{self.notification_type} to {self.recipient_email} - {self.status}"


class NotificationRequest(models.Model):
    """
    Incoming notification requests from other services
    """
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    user_id = models.CharField(max_length=255, null=True, blank=True, help_text="User ID from requesting service (can be UUID or integer)")
    user_email = models.EmailField()
    user_name = models.CharField(max_length=255, blank=True)
    notification_type = models.CharField(max_length=50)
    context_data = models.JSONField(default=dict, blank=True)
    ip_address = models.GenericIPAddressField(null=True, blank=True)
    user_agent = models.TextField(blank=True)
    processed = models.BooleanField(default=False)
    processed_at = models.DateTimeField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    
    class Meta:
        ordering = ['-created_at']
        indexes = [
            models.Index(fields=['processed', 'created_at']),
            models.Index(fields=['user_id']),
        ]
    
    def __str__(self):
        return f"Notification request: {self.notification_type} for {self.user_email}"
