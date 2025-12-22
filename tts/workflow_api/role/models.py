from django.db import models
from django.core.exceptions import ValidationError

class Roles(models.Model):
    role_id = models.IntegerField(primary_key=True)
    name = models.CharField(max_length=64, unique=True)
    system = models.CharField(max_length=50, default='tts')  # System identifier (e.g., 'tts')

    def __str__(self):
        return self.name

    class Meta:
        ordering = ['name']


class RoleUsers(models.Model):
    """
    Represents user-role assignments (equivalent to UserSystemRole in auth service).
    Synced from the auth service for total sync capability.
    """
    role_id = models.ForeignKey(Roles, on_delete=models.CASCADE, to_field='role_id', db_column='role_id')
    user_id = models.IntegerField()
    user_full_name = models.CharField(max_length=255, blank=True, default='')  # Full name of the user
    is_active = models.BooleanField(default=True)  # Can user perform role actions
    assigned_at = models.DateTimeField(auto_now_add=True)  # When was the role assigned
    settings = models.JSONField(default=dict, blank=True)  # Additional role settings

    class Meta:
        unique_together = ('role_id', 'user_id')
        ordering = ['role_id', 'user_id']

    def __str__(self):
        return f"{self.role_id.name} - User {self.user_id}"