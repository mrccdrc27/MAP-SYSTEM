from django.db import models
from django.utils import timezone
from django.core.validators import FileExtensionValidator
import uuid
import os


class Ticket(models.Model):
    STATUS_CHOICES = [
        ('open', 'Open'),
        ('closed', 'Closed'),
    ]
    
    ticket_id = models.CharField(max_length=20, unique=True, db_index=True)
    status = models.CharField(max_length=10, choices=STATUS_CHOICES, default='open')
    # User tracking fields from JWT token
    created_by = models.CharField(max_length=255, blank=True, null=True)    
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        ordering = ['-created_at']
    
    def save(self, *args, **kwargs):
        if not self.ticket_id:
            # Generate a unique ticket ID like T12345
            self.ticket_id = f"T{str(uuid.uuid4().int)[:5]}"
        super().save(*args, **kwargs)
    
    def __str__(self):
        return f"{self.ticket_id} - {self.status}"


class MessageAttachment(models.Model):
    """Model to store file attachments for messages"""
    attachment_id = models.CharField(max_length=20, unique=True, db_index=True)
    filename = models.CharField(max_length=255)
    file = models.FileField(
        upload_to='message_attachments/%Y/%m/%d/',
        validators=[FileExtensionValidator(
            allowed_extensions=['pdf', 'doc', 'docx', 'txt', 'jpg', 'jpeg', 'png', 'gif', 'zip', 'rar']
        )]
    )
    file_size = models.PositiveIntegerField()
    content_type = models.CharField(max_length=100)
    
    # User tracking fields from JWT token
    user_id = models.CharField(max_length=255, blank=True, null=True)
    
    created_at = models.DateTimeField(auto_now_add=True)
    
    def save(self, *args, **kwargs):
        if not self.attachment_id:
            self.attachment_id = f"ATT{str(uuid.uuid4().int)[:8]}"
        if self.file:
            self.file_size = self.file.size
        super().save(*args, **kwargs)
    
    def __str__(self):
        return f"{self.attachment_id} - {self.filename}"


class Message(models.Model):
    message_id = models.CharField(max_length=20, unique=True, db_index=True)
    ticket_id = models.ForeignKey(Ticket, on_delete=models.CASCADE, related_name='messages')
    sender = models.CharField(max_length=255)
    sender_role = models.CharField(max_length=100, blank=True, null=True)  # Store sender's role
    user_id = models.CharField(max_length=255, blank=True, null=True)  # Store user ID from JWT token
    message = models.TextField()
    attachments = models.ManyToManyField(MessageAttachment, blank=True, related_name='messages')
  
    # Edit tracking
    is_edited = models.BooleanField(default=False)
    edited_at = models.DateTimeField(null=True, blank=True)
    original_message = models.TextField(blank=True)  # Store original content for edit history
    
    # Soft delete
    is_deleted = models.BooleanField(default=False)
    deleted_at = models.DateTimeField(null=True, blank=True)
    deleted_by = models.CharField(max_length=255, blank=True, null=True)
    deleted_by_email = models.EmailField(blank=True, null=True)
    
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        ordering = ['created_at']
    
    def save(self, *args, **kwargs):
        if not self.message_id:
            unique_part = str(uuid.uuid4().int)[:8]
            # Check if ticket is available, otherwise use a generic ID
            if self.ticket_id and self.ticket_id.ticket_id:
                self.message_id = f"M{self.ticket_id.ticket_id[1:]}-{unique_part}"
            else:
                # Generate a temporary message ID if ticket is not yet available
                self.message_id = f"M{unique_part}"
        super().save(*args, **kwargs)
    
    def soft_delete(self, deleted_by=None, deleted_by_email=None):
        """Soft delete the message"""
        self.is_deleted = True
        self.deleted_at = timezone.now()
        if deleted_by:
            self.deleted_by = deleted_by
        if deleted_by_email:
            self.deleted_by_email = deleted_by_email
        self.save()
    
    def edit_message(self, new_message, edited_by=None, edited_by_email=None):
        """Edit message content and track changes"""
        if not self.is_edited:
            self.original_message = self.message
        self.message = new_message
        self.is_edited = True
        self.edited_at = timezone.now()
        if edited_by:
            self.edited_by = edited_by
        if edited_by_email:
            self.edited_by_email = edited_by_email
        self.save()
    
    def __str__(self):
        return f"{self.message_id} - {self.sender}: {self.message[:50]}"


class MessageReaction(models.Model):
    """Model to store message reactions (emojis)"""
    REACTION_CHOICES = [
        ('👍', 'Thumbs Up'),
        ('👎', 'Thumbs Down'),
        ('❤️', 'Heart'),
        ('😂', 'Laugh'),
        ('😮', 'Wow'),
        ('😢', 'Sad'),
        ('😡', 'Angry'),
        ('👏', 'Clap'),
        ('🎉', 'Celebrate'),
        ('🔥', 'Fire'),
    ]
    
    message = models.ForeignKey(Message, on_delete=models.CASCADE, related_name='reactions')
    user = models.CharField(max_length=255)  # User identifier (name for backward compatibility)
    reaction = models.CharField(max_length=10, choices=REACTION_CHOICES)
    
    # User tracking fields from JWT token
    user_id = models.CharField(max_length=255, blank=True, null=True)
    user_full_name = models.CharField(max_length=255, blank=True, null=True)
    
    created_at = models.DateTimeField(auto_now_add=True)
    
    class Meta:
        unique_together = ('message', 'user_id', 'reaction')  # One reaction per user per message
        ordering = ['created_at']
    
    def __str__(self):
        return f"{self.user} reacted {self.reaction} to {self.message.message_id}"
