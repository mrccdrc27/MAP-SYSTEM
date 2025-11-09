from django.db.models.signals import post_save, post_delete
from django.dispatch import receiver
from task.models import Task
from step_instance.models import StepInstance
from step.models import StepTransition
import time

@receiver([post_save, post_delete], sender=Task)
def create_step_instance(sender, instance, created, **kwargs):
    # Only create StepInstance when Task is created, not updated or deleted
    if not created or kwargs.get('signal') == post_delete:
        return
        
    print('testinstance', instance.workflow_id)
    
    if not instance.workflow_id:
        print('Task has no workflow_id — skipping.')
        return

    try:
        entry_transition = StepTransition.objects.filter(
            workflow_id=instance.workflow_id,
            from_step_id__isnull=True
        ).first()

        if not entry_transition:
            print(f"No entry transition found for workflow {instance.workflow_id}")
            return

        # Prevent duplicate step instance for this task-transition
        if StepInstance.objects.filter(
            task_id=instance,
            step_transition_id=entry_transition
        ).exists():
            print(f"StepInstance already exists for Task {instance.task_id}")
            return

        # Generate a simple integer-based step_instance_id
        timestamp = int(time.time() * 1000)  # milliseconds for uniqueness
        step_instance_id = f"{instance.task_id}_{entry_transition.transition_id}_{timestamp}"

        # Create StepInstance with proper ID
        StepInstance.objects.create(
            step_instance_id=step_instance_id,
            task_id=instance,
            step_transition_id=entry_transition,
        )

        print(f"StepInstance created for Task {instance.task_id} at step {entry_transition.to_step_id}")
        
    except Exception as e:
        print(f"Error creating StepInstance for Task {instance.task_id}: {e}")
        # Don't re-raise the exception to avoid breaking the ticket ingestion process