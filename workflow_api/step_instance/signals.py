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
        # ✅ Update ticket status if the step is not the first one
        from_step = instance.step_transition_id.from_step_id
        if from_step:
            ticket = instance.task_id.ticket_id
            ticket.status = "In Progress"  # or any status you want
            ticket.save(update_fields=["status"])
            logger.info(f"Ticket {ticket.ticket_id} status updated to 'In Progress'")

        # 1. Identify the role for the current step
        role = instance.step_transition_id.to_step_id.role_id
        role_id = role.role_id
        role_name = role.name  # Get the role name
        logger.info(f"Role ID: {role_id}, Role Name: {role_name}")

        # 2. Fetch users assigned to this role from the user service
        # Using role_name instead of role.id for the API call
        response = requests.get(f"{settings.AUTH_SERVICE_URL}/api/v1/tts/round-robin/?role_name={role_name}", timeout=10)
        logger.info(f"User service responded with {response.status_code}")

        if response.status_code != 200:
            logger.warning(f"Failed to fetch users for role {role.name}")
            return

        users = response.json()
        if not users:
            logger.warning(f"No users found for role {role_name}")
            return

        logger.info(f"Retrieved {len(users)} users for role {role_name}")

        # 3. Get or create the round-robin pointer for this role
        pointer, created_pointer = RoleRoundRobinPointer.objects.get_or_create(
            role_id=role_id,
            defaults={"pointer": 0}
        )
        logger.info(f"{'Created new' if created_pointer else 'Existing'} pointer for role {role.name} at index {pointer.pointer}")

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

        # 5. Send notification via Celery
        from celery import Celery
        celery = Celery(broker=settings.CELERY_BROKER_URL)

        message = (
            f"You have been assigned to the step '{instance.step_transition_id.to_step_id.name}' "
            f"in workflow '{instance.step_transition_id.workflow_id.name}' "
            f"for ticket '{instance.task_id.ticket_id}'."
        )
        subject = f"New Step Assigned: {instance.step_transition_id.to_step_id.name}"


        celery.send_task(
            "notifications.create_inapp_notification",
            # args=[selected_user_id, message, str(instance.step_instance_id)],
            args=[selected_user_id, subject, message],
            queue="inapp-notification-queue"
        )

    except Exception as e:
        logger.exception(f"Error assigning user to StepInstance: {e}")
