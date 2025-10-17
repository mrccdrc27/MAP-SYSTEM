from django.db import models
from django.utils import timezone
import uuid


class Ticket(models.Model):
    STATUS_CHOICES = [
        ('open', 'Open'),
        ('closed', 'Closed'),
    ]
    
    ticket_id = models.CharField(max_length=20, unique=True, db_index=True)
    status = models.CharField(max_length=10, choices=STATUS_CHOICES, default='open')
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


class Message(models.Model):
    message_id = models.CharField(max_length=20, unique=True, db_index=True)
    ticket = models.ForeignKey(Ticket, on_delete=models.CASCADE, related_name='messages')
    sender = models.CharField(max_length=255)  # No user validation, just store sender name
    message = models.TextField()
    created_at = models.DateTimeField(auto_now_add=True)
    
    class Meta:
        ordering = ['created_at']
    
    def save(self, *args, **kwargs):
        if not self.message_id:
            # Generate a truly unique message ID using UUID combined with ticket reference
            # This avoids race conditions with the previous count-based approach
            unique_part = str(uuid.uuid4().int)[:8]
            self.message_id = f"M{self.ticket.ticket_id[1:]}-{unique_part}"
        super().save(*args, **kwargs)
    
    def __str__(self):
        return f"{self.message_id} - {self.sender}: {self.message[:50]}"
