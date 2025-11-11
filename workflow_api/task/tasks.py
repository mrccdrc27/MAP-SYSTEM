from celery import shared_task, current_app
import logging
from django.conf import settings

logger = logging.getLogger(__name__)


@shared_task(name="task.send_assignment_notification")
def send_assignment_notification(user_id, task_id, task_title, role_name):
    """
    Send an in-app notification when a user is assigned to a task.
    
    This task is called via Celery and sends a message to the notification service's
    message broker queue for processing.
    
    Args:
        user_id (int): ID of the user being assigned
        task_id (str): ID of the task
        task_title (str): Title/name of the task
        role_name (str): Role the user is being assigned to
    
    Returns:
        dict: Status of the notification request
        
    Example:
        >>> send_assignment_notification.delay(
        ...     user_id=6,
        ...     task_id="TASK-001",
        ...     task_title="Review Ticket",
        ...     role_name="Reviewer"
        ... )
    """
    try:
        from django.utils import timezone
        
        subject = f"New Task Assignment: {task_title}"
        message = f"""
You have been assigned to a task with the following details:

Task ID: {task_id}
Task Title: {task_title}
Role: {role_name}
Assigned At: {timezone.now().strftime('%Y-%m-%d %H:%M:%S')}

Please log in to the system to view more details.
        """.strip()
        
        # Send task to notification service via shared Celery broker
        # The notification service worker listens to 'inapp-notification-queue'
        current_app.send_task(
            'notifications.create_inapp_notification',
            args=[user_id, subject, message],
            queue='inapp-notification-queue'
        )
        
        logger.info(
            f"📧 Assignment notification queued for user {user_id} to task {task_id} "
            f"with role '{role_name}'"
        )
        
        return {
            "status": "success",
            "message": "Notification queued for sending",
            "user_id": user_id,
            "task_id": task_id
        }
        
    except Exception as e:
        logger.error(
            f"❌ Failed to queue assignment notification for user {user_id}, task {task_id}: {str(e)}",
            exc_info=True
        )
        return {
            "status": "error",
            "message": str(e),
            "user_id": user_id,
            "task_id": task_id
        }


@shared_task(name="task.send_bulk_assignment_notifications")
def send_bulk_assignment_notifications(assignments_data):
    """
    Send notifications for multiple task assignments at once.
    
    Args:
        assignments_data (list): List of dicts with keys:
            - user_id (int)
            - task_id (str)
            - task_title (str)
            - role_name (str)
    
    Returns:
        dict: Status with count of notifications sent
        
    Example:
        >>> send_bulk_assignment_notifications.delay([
        ...     {
        ...         "user_id": 6,
        ...         "task_id": "TASK-001",
        ...         "task_title": "Review Ticket",
        ...         "role_name": "Reviewer"
        ...     },
        ...     {
        ...         "user_id": 7,
        ...         "task_id": "TASK-002",
        ...         "task_title": "Approve Ticket",
        ...         "role_name": "Approver"
        ...     }
        ... ])
    """
    sent_count = 0
    failed_count = 0
    
    try:
        for assignment in assignments_data:
            try:
                result = send_assignment_notification(
                    user_id=assignment['user_id'],
                    task_id=assignment['task_id'],
                    task_title=assignment['task_title'],
                    role_name=assignment['role_name']
                )
                if result['status'] == 'success':
                    sent_count += 1
                else:
                    failed_count += 1
            except Exception as e:
                logger.error(
                    f"❌ Error sending notification for assignment {assignment}: {str(e)}",
                    exc_info=True
                )
                failed_count += 1
        
        logger.info(
            f"📊 Bulk assignment notifications: {sent_count} sent, {failed_count} failed"
        )
        
        return {
            "status": "completed",
            "sent_count": sent_count,
            "failed_count": failed_count,
            "total": len(assignments_data)
        }
        
    except Exception as e:
        logger.error(
            f"❌ Failed in bulk assignment notification: {str(e)}",
            exc_info=True
        )
        return {
            "status": "error",
            "message": str(e),
            "sent_count": sent_count,
            "failed_count": failed_count,
            "total": len(assignments_data)
        }
