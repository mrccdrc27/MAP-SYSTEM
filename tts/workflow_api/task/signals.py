from django.db.models.signals import post_save, post_delete
from django.dispatch import receiver
from task.models import Task
from step.models import StepTransition
import time

@receiver([post_save, post_delete], sender=Task)
def create_step_instance(sender, instance, created, **kwargs):
    # Step instances are no longer created automatically
    pass