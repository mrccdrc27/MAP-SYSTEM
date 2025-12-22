# step/signals.py
from django.db.models.signals import post_save
from django.dispatch import receiver
from step.models import StepTransition


# @receiver(post_save, sender=StepTransition)
# def on_step_transition_saved(sender, instance, created, **kwargs):
#     if created:
#         print(f"New StepTransition created: {instance.transition_id}")
#     else:
#         print(f"StepTransition updated: {instance.transition_id}")
