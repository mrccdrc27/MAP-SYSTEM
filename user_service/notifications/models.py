from django.db import models
from accounts.models import CustomUser

# Create your models here.

class Notification(models.Model):
    user = models.ForeignKey(CustomUser, on_delete=models.CASCADE) 
    type = models.CharField(max_length=50)
    message = models.TextField(blank=True, null=True)
    ticket_reference_id = models.UUIDField(unique=False, blank=True, null=True)
    is_read = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)
