import logging
import requests
from django.db.models.signals import post_save
from django.conf import settings
from django.dispatch import receiver
from .models import StepInstance, RoleRoundRobinPointer
from django.conf import settings

logger = logging.getLogger(__name__)

@receiver(post_save, sender=StepInstance)
def assign_user_to_step_instance(sender, instance, created, **kwargs):
    if not created:
        logger.info("StepInstance updated (not created), skipping user assignment.")
        return

    try:
        logger.info("Assigning user to StepInstance...")

        # 1. Identify the role for the current step
        role = instance.step_transition_id.to_step_id.role_id
        role_id = role.role_id
        logger.info(f"Role ID: {role_id}")

        # 2. Fetch users assigned to this role from the user service
        response = requests.get(f"{settings.USER_SERVICE_URL}/round-robin?role_id={role.id}")
        print(response)
        logger.info(f"User service responded with {response.status_code}")

        if response.status_code != 200:
            logger.warning(f"Failed to fetch users for role {role.name}")
            return

        users = response.json()
        if not users:
            logger.warning(f"No users found for role {role_id}")
            return

        logger.info(f"Retrieved {len(users)} users for role {role_id}")

        # 3. Get or create the round-robin pointer for this role
        pointer, created_pointer = RoleRoundRobinPointer.objects.get_or_create(
            role_id=role_id,
            defaults={"pointer": 0}
        )
        if created_pointer:
            logger.info(f"Created new pointer for role {role.name}")
        else:
            logger.info(f"Existing pointer found for role {role.name} at index {pointer.pointer}")

        index = pointer.pointer or 0
        selected_user_id = users[index % len(users)]
        logger.info(f"Selected user ID: {selected_user_id} at index: {index}")

        # 4. Assign user to the step instance and update pointer
        instance.user_id = selected_user_id
        instance.save(update_fields=["user_id"])
        logger.info(f"StepInstance {instance.step_instance_id} assigned to user {instance.user_id}")

        pointer.pointer = (index + 1) % len(users)
        pointer.save(update_fields=["pointer"])
        logger.info(f"Pointer updated to {pointer.pointer} for role {role_id}")


        from celery import Celery
        celery = Celery(broker=settings.CELERY_BROKER_URL)

        message = (
            f"You have been assigned to the step '{instance.step_transition_id.to_step_id.name}' "
            f"in workflow '{instance.step_transition_id.workflow_id.name}' "
            f"for ticket '{instance.task_id.ticket_id}'."
        )

        celery.send_task(
            "notifications.tasks.create_assignment_notification",
            args=[selected_user_id, message, str(instance.step_instance_id)],
            queue="notification-queue"
        )

    except Exception as e:
        logger.exception(f"Error assigning user to StepInstance: {e}")
