from django.db import models
from django.core.exceptions import ValidationError

class Roles(models.Model):
    role_id = models.AutoField(primary_key=True, unique=True)
    # used to who creates the model
    user_id = models.IntegerField(null=False)
    # Must be unique
    name = models.CharField(max_length=64, unique=True)
    description = models.CharField(max_length=256, null=True)

    # timestamps
    createdAt = models.DateTimeField(auto_now_add=True)
    updatedAt = models.DateTimeField(auto_now=True)

    def save(self, *args, **kwargs):
        super().save(*args, **kwargs)