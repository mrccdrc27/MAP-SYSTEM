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

class TicketSnapshot(models.Model):
    """Stores incoming ticket data as-is in JSON format"""
    ticket_number = models.CharField(max_length=64, db_index=True)
    fetched_at = models.DateTimeField(auto_now_add=True)
    ticket_data = models.JSONField()
    
    class Meta:
        indexes = [
            models.Index(fields=['ticket_number']),
        ]
    
    def __str__(self):
        return f"TicketSnapshot {self.ticket_number}"
    
    def get(self, key, default=None):
        """Convenience method to get values from ticket_data"""
        return self.ticket_data.get(key, default)


# Keep old model name for backward compatibility (maps to new model)
class WorkflowTicket(models.Model):
    """Alias for TicketSnapshot for backward compatibility"""
    ticket_number = models.CharField(max_length=64, db_index=True)
    fetched_at = models.DateTimeField(auto_now_add=True)
    ticket_data = models.JSONField()
    is_task_allocated = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    # Legacy fields for backward compatibility - stored in ticket_data
    ticket_id = models.CharField(max_length=20, blank=True, null=True)
    original_ticket_id = models.CharField(max_length=20, db_index=True, blank=True, null=True)
    source_service = models.CharField(max_length=50, default='ticket_service', db_index=True)
    status = models.CharField(max_length=20, default='New', db_index=True, blank=True, null=True)
    department = models.CharField(max_length=100, db_index=True, blank=True, null=True)
    priority = models.CharField(max_length=20, default='Medium', db_index=True, blank=True, null=True, choices=[
        ('Low', 'Low'),
        ('Medium', 'Medium'),
        ('High', 'High'),
        ('Critical', 'Critical')
    ])
    
    class Meta:
        indexes = [
            models.Index(fields=['ticket_number']),
            models.Index(fields=['original_ticket_id']),
            models.Index(fields=['status']),
        ]
    
    def __str__(self):
        return f'Ticket {self.ticket_number}'
    
    # Properties to access ticket_data conveniently
    @property
    def subject(self):
        return self.ticket_data.get('subject', '')
    
    @property
    def description(self):
        return self.ticket_data.get('description', '')
    
    @property
    def attachments(self):
        return self.ticket_data.get('attachments', [])
    
    def save(self, *args, **kwargs):
        from tickets.tasks import send_ticket_status
        is_new = self.pk is None
        old_status = None

        if not is_new:
            try:
                old_status = WorkflowTicket.objects.get(pk=self.pk).ticket_data.get('status')
            except WorkflowTicket.DoesNotExist:
                pass

        super().save(*args, **kwargs)

        # Note: Task allocation now happens in receive_ticket() -> create_task_for_ticket()
        # which provides intelligent workflow matching and user assignment via round-robin

        # Send status update
        new_status = self.ticket_data.get('status')
        if not is_new and old_status != new_status:
            print("status changed")
            try:
                ticket_id = self.ticket_data.get('ticket_id') or self.ticket_data.get('id')
                result = send_ticket_status.delay(ticket_id, new_status)
                print(f"✅ Task queued to Celery. ID: {result.id}")
            except Exception as e:
                print(f"❌ Failed to queue task: {e}")