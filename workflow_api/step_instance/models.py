from django.db import models
from django.core.exceptions import ValidationError
import uuid
from step.models import StepTransition
# Create your models here.

class StepInstance(models.Model):
    step_instance_id = models.CharField(max_length=64, unique=True, null=True, blank=True)  # New UUID field
    user_id = models.IntegerField(null=True)
    step_transition_id = models.ForeignKey(
        StepTransition,
        on_delete=models.CASCADE,
        null=True,
        # unique=True,  # enforce one-to-one between Action and StepTransition
        to_field='transition_id'  # Reference the UUID field
    )
    task_id = models.ForeignKey(
        'task.Task',
        on_delete=models.CASCADE,
        null=True,
        to_field='task_id'  # Reference the UUID field
    )
    has_acted = models.BooleanField(default=False)
    def save(self, *args, **kwargs):
        if not self.pk:  # Only enforce immutability on creation
            if not self.step_instance_id:
                self.step_instance_id = str(uuid.uuid4())  # Assign a unique identifier if missing
        else:
            if 'step_instance_id' in kwargs.get('update_fields', []):
                raise ValidationError("step_instance_id cannot be modified after creation.")  # Prevent updates
       
        # ensure clean() runs on every save
        super().save(*args, **kwargs)
    created_at= models.DateTimeField(auto_now_add=True)
    def get_task_id(self):
        from task.models import Task
        return Task.objects.first()
class RoleRoundRobinPointer(models.Model):
    """
    Tracks the last-used index in the list of users for each role,
    used for round-robin user assignment.
    """
    role = models.OneToOneField(
        'role.Roles',
        on_delete=models.CASCADE,
        to_field='role_id',
        primary_key=True,
    )
    pointer = models.PositiveIntegerField(default=0)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return f"{self.role.name}: idx={self.pointer}"