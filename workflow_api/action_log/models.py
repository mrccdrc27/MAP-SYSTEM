from django.db import models
from action.models import Actions
from django.core.exceptions import ValidationError
import uuid

# Create your models here.

class ActionLog(models.Model):
    action_log_id = models.CharField(max_length=64, unique=True, null=True, blank=True)  # New UUID field
    step_instance_id =  models.ForeignKey('step_instance.StepInstance', on_delete=models.CASCADE, to_field='step_instance_id')
    task_id = models.ForeignKey('task.Task', on_delete=models.CASCADE, to_field='task_id', null=True, blank=True)  # ✅ New field
    action_id = models.ForeignKey(
        Actions,
        on_delete=models.CASCADE,
        null=True,
        to_field='action_id'  # Reference the UUID field
    )

    def save(self, *args, **kwargs):
        if not self.pk:  # Only enforce immutability on creation
            if not self.action_log_id:
                self.action_log_id = str(uuid.uuid4())  # Assign a unique identifier if missing
        else:
            if 'action_log_id' in kwargs.get('update_fields', []):
                raise ValidationError("action_log_id cannot be modified after creation.")  # Prevent updates
        
        super().save(*args, **kwargs)

    def get_step_instance_id(self):
        from step_instance.models import StepInstance
        return StepInstance.objects.first()
    
    def get_task_id(self):
        from task.models import Task
        return Task.objects.first()

        