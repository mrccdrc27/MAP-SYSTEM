from django.db import models
from action.models import Actions
from django.core.exceptions import ValidationError
import uuid

# Create your models here.

class ActionLog(models.Model):
    action_log_id = models.AutoField(primary_key=True, unique=True)
    step_instance_id =  models.ForeignKey('step_instance.StepInstance', on_delete=models.CASCADE, to_field='step_instance_id')
    task_id = models.ForeignKey('task.Task', on_delete=models.CASCADE, to_field='task_id', null=True, blank=True)
    user = models.CharField(max_length=200, null=True, blank=True)
    action_id = models.ForeignKey(
        Actions,
        on_delete=models.CASCADE,
        null=True,
        to_field='action_id'  # Reference the integer field
    )
    comment = models.CharField(max_length=200, null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    def save(self, *args, **kwargs):
        super().save(*args, **kwargs)

    def get_step_instance_id(self):
        from step_instance.models import StepInstance
        return StepInstance.objects.first()
    
    def get_task_id(self):
        from task.models import Task
        return Task.objects.first()

