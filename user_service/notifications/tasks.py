# user_service/notifications/tasks.py

from celery import shared_task
from .models import Notification
from accounts.models import CustomUser

@shared_task(name="notifications.tasks.create_assignment_notification")
def create_assignment_notification(user_id, message, ticket_reference_id=None):
    try:
        user = CustomUser.objects.get(id=user_id)
        Notification.objects.create(
            user=user,
            type="step_assignment",
            message=message,
            ticket_reference_id=ticket_reference_id
        )
    except Exception as e:
        print(f"[Notification Error] {e}")