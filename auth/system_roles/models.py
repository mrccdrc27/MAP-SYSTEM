import uuid
from django.db import models
from django.utils.timezone import now
from django.db.models import JSONField

# Create your models here.
class UserSystemRole(models.Model):
    id = models.AutoField(primary_key=True)
    user = models.ForeignKey('users.User', on_delete=models.CASCADE, related_name='system_roles')
    system = models.ForeignKey('systems.System', on_delete=models.CASCADE, related_name='user_roles')
    role = models.ForeignKey('roles.Role', on_delete=models.CASCADE, related_name='user_assignments')
    assigned_at = models.DateTimeField(default=now)
    is_active = models.BooleanField(default=True)  # Can login
    settings = models.JSONField(default=dict, blank=True)  # Additional settings storage
    class Meta:
        unique_together = ('user', 'system', 'role')  # Prevent duplicate assignments

    def __str__(self):
        return f"{self.user.email} → {self.role.name} in {self.system.slug}"