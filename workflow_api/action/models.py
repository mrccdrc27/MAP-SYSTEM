from django.db import models
from django.core.exceptions import ValidationError

class Actions(models.Model):
    action_id = models.AutoField(primary_key=True, unique=True)
    name = models.CharField(max_length=64, unique=True)
    description = models.CharField(max_length=256, null=True)
    
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def save(self, *args, **kwargs):
        super().save(*args, **kwargs)