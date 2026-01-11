from celery import shared_task, current_app
import logging
from django.conf import settings

logger = logging.getLogger(__name__)

# Queue name for in-app notifications
INAPP_NOTIFICATION_QUEUE = getattr(settings, 'INAPP_NOTIFICATION_QUEUE', 'inapp-notification-queue')


# =============================================================================
# BMS (BUDGET MANAGEMENT SYSTEM) SUBMISSION TASKS
# =============================================================================

@shared_task(name="task.submit_bms_budget_proposal", bind=True, max_retries=0)
def submit_bms_budget_proposal(self, task_id: int):
    """
    Celery task to submit a budget proposal to BMS when task reaches pending_external.
    
    This is triggered when a workflow with end_logic='bms' reaches its final step.
    
    Args:
        task_id: ID of the Task to submit
        
    Returns:
        dict: Status of the BMS submission
    """
    from task.models import Task
    from task.services.bms_service import submit_budget_proposal
    
    logger.info(f"📋 BMS Submission Task started for task_id={task_id}")
    
    try:
        task = Task.objects.select_related('ticket_id', 'workflow_id').get(task_id=task_id)
    except Task.DoesNotExist:
        logger.error(f"❌ Task {task_id} not found for BMS submission")
        return {
            'status': 'error',
            'message': f'Task {task_id} not found',
            'task_id': task_id
        }
    
    # Verify this is a BMS workflow
    if not task.workflow_id or task.workflow_id.end_logic != 'bms':
        logger.warning(f"⚠️ Task {task_id} is not a BMS workflow, skipping")
        return {
            'status': 'skipped',
            'message': 'Not a BMS workflow',
            'task_id': task_id
        }
    
    # Submit to BMS
    result = submit_budget_proposal(task)
    
    if result.get('status') == 'success':
        logger.info(f"✅ BMS submission successful for task {task_id}")
    elif result.get('status') == 'pending_retry':
        logger.info(f"⏳ BMS submission pending retry for task {task_id}")
    else:
        logger.error(f"❌ BMS submission failed for task {task_id}: {result.get('message')}")
    
    return result


@shared_task(name="task.retry_failed_bms_submissions")
def retry_failed_bms_submissions():
    """
    Periodic task to retry failed BMS submissions.
    
    Finds all FailedBMSSubmission records that:
    - Are in 'pending' status
    - Have next_retry_at <= now
    - Have not exceeded max_retries
    
    Run this task periodically (e.g., every 30 seconds via Celery beat).
    """
    from django.utils import timezone
    from task.models import FailedBMSSubmission
    from task.services.bms_service import retry_failed_submission
    
    now = timezone.now()
    
    # Get pending submissions ready for retry
    pending_submissions = FailedBMSSubmission.objects.filter(
        status='pending',
        next_retry_at__lte=now
    ).select_related('task')[:10]  # Process max 10 at a time
    
    if not pending_submissions:
        logger.debug("No pending BMS submissions to retry")
        return {'status': 'ok', 'retried': 0}
    
    logger.info(f"🔄 Retrying {len(pending_submissions)} failed BMS submissions")
    
    results = []
    for submission in pending_submissions:
        result = retry_failed_submission(submission)
        results.append({
            'failed_bms_id': submission.failed_bms_id,
            'ticket_number': submission.ticket_number,
            'result': result.get('status')
        })
    
    succeeded = sum(1 for r in results if r['result'] == 'success')
    pending = sum(1 for r in results if r['result'] == 'pending_retry')
    failed = sum(1 for r in results if r['result'] == 'error')
    
    logger.info(f"🔄 BMS retry results: {succeeded} succeeded, {pending} pending, {failed} failed")
    
    return {
        'status': 'ok',
        'retried': len(results),
        'succeeded': succeeded,
        'pending': pending,
        'failed': failed,
        'results': results
    }


@shared_task(name="task.retry_single_bms_submission")
def retry_single_bms_submission(failed_bms_id: int):
    """
    Retry a specific failed BMS submission.
    
    Args:
        failed_bms_id: ID of the FailedBMSSubmission to retry
        
    Returns:
        dict: Status of the retry attempt
    """
    from task.models import FailedBMSSubmission
    from task.services.bms_service import retry_failed_submission
    
    logger.info(f"🔄 Retrying BMS submission {failed_bms_id}")
    
    try:
        submission = FailedBMSSubmission.objects.select_related('task').get(failed_bms_id=failed_bms_id)
    except FailedBMSSubmission.DoesNotExist:
        logger.error(f"❌ FailedBMSSubmission {failed_bms_id} not found")
        return {
            'status': 'error',
            'message': f'Submission {failed_bms_id} not found'
        }
    
    return retry_failed_submission(submission)


# =============================================================================
# TASK ASSIGNMENT NOTIFICATIONS
# =============================================================================

@shared_task(name="task.send_assignment_notification")
def send_assignment_notification(user_id, ticket_number, task_title, role_name):
    """
    Send an in-app notification when a user is assigned to a task.
    
    This task is called via Celery and sends a message to the notification service's
    message broker queue for processing.
    
    Args:
        user_id (int): ID of the user being assigned
        ticket_number (str): Ticket number for navigation
        task_title (str): Title/name of the task
        role_name (str): Role the user is being assigned to
    
    Returns:
        dict: Status of the notification request
        
    Example:
        >>> send_assignment_notification.delay(
        ...     user_id=6,
        ...     ticket_number="TX20251227638396",
        ...     task_title="Review Ticket",
        ...     role_name="Reviewer"
        ... )
    """
    try:
        from django.utils import timezone
        
        # Send task to notification service via shared Celery broker
        # The notification service worker listens to 'inapp-notification-queue'
        # This calls the notification service's task which creates both in-app notification AND sends email
        current_app.send_task(
            'notifications.send_assignment_notification',
            args=(
                user_id,
                str(ticket_number),
                task_title,
                role_name
            ),
            queue=INAPP_NOTIFICATION_QUEUE
        )
        
        logger.info(
            f"📧 Assignment notification queued for user {user_id} to ticket {ticket_number} "
            f"with role '{role_name}'"
        )
        
        return {
            "status": "success",
            "message": "Notification queued for sending",
            "user_id": user_id,
            "ticket_number": ticket_number
        }
        
    except Exception as e:
        logger.error(
            f"❌ Failed to queue assignment notification for user {user_id}, ticket {ticket_number}: {str(e)}",
            exc_info=True
        )
        return {
            "status": "error",
            "message": str(e),
            "user_id": user_id,
            "task_item_id": task_item_id
        }


# =============================================================================
# TASK TRANSFER NOTIFICATIONS
# =============================================================================

@shared_task(name="task.send_transfer_notification")
def send_transfer_notification(
    from_user_id, 
    to_user_id, 
    from_task_item_id,
    to_task_item_id,
    task_title, 
    transferred_by_id,
    transferred_by_name=None,
    transfer_notes=None
):
    """
    Send notifications when a task is transferred between users.
    Sends to the notification service which creates notifications for both users.
    
    Args:
        from_user_id (int): Original assignee user ID
        to_user_id (int): New assignee user ID
        from_task_item_id (str): The original task item ID (for the user losing the task)
        to_task_item_id (str): The new task item ID (for the user receiving the task)
        task_title (str): The task title/ticket number
        transferred_by_id (int): User ID who initiated the transfer
        transferred_by_name (str): Name of user who initiated the transfer
        transfer_notes (str): Optional reason for transfer
    
    Returns:
        dict: Status of the notification request
    """
    try:
        # Send to notification service
        current_app.send_task(
            'notifications.send_task_transfer_notification',
            args=(
                from_user_id,
                to_user_id,
                str(from_task_item_id),
                str(to_task_item_id),
                task_title,
                transferred_by_id,
                transferred_by_name,
                transfer_notes
            ),
            queue=INAPP_NOTIFICATION_QUEUE
        )
        
        logger.info(
            f"📧 Transfer notification queued: task item {from_task_item_id} from user {from_user_id} to user {to_user_id} (new task item {to_task_item_id})"
        )
        
        return {
            "status": "success",
            "message": "Transfer notification queued",
            "from_user_id": from_user_id,
            "to_user_id": to_user_id,
            "from_task_item_id": from_task_item_id,
            "to_task_item_id": to_task_item_id
        }
        
    except Exception as e:
        logger.error(
            f"❌ Failed to queue transfer notification for task items {from_task_item_id}/{to_task_item_id}: {str(e)}",
            exc_info=True
        )
        return {
            "status": "error",
            "message": str(e),
            "from_task_item_id": from_task_item_id,
            "to_task_item_id": to_task_item_id
        }


# =============================================================================
# TASK ESCALATION NOTIFICATIONS
# =============================================================================

@shared_task(name="task.send_escalation_notification")
def send_escalation_notification(
    from_user_id,
    to_user_id,
    from_task_item_id,
    to_task_item_id,
    task_title,
    escalated_from_role,
    escalated_to_role,
    escalation_reason=None,
    escalated_by_id=None,
    escalated_by_name=None
):
    """
    Send notifications when a task is escalated between users.
    Sends to the notification service which creates notifications for both users:
    - Original assignee: informed their task was escalated
    - New assignee: informed they received an escalated task
    
    Args:
        from_user_id (int): Original assignee user ID
        to_user_id (int): New assignee user ID (escalated to)
        from_task_item_id (str): The original task item ID (for the user losing the task)
        to_task_item_id (str): The new task item ID (for the user receiving the task)
        task_title (str): The task title/ticket number
        escalated_from_role (str): Original role name
        escalated_to_role (str): Escalated role name
        escalation_reason (str): Optional reason for escalation
        escalated_by_id (int): User ID who initiated the escalation
        escalated_by_name (str): Name of user who initiated the escalation
    
    Returns:
        dict: Status of the notification request
    """
    try:
        current_app.send_task(
            'notifications.send_escalation_notification',
            args=(
                from_user_id,
                to_user_id,
                str(from_task_item_id),
                str(to_task_item_id),
                task_title,
                escalated_from_role,
                escalated_to_role,
                escalation_reason,
                escalated_by_id,
                escalated_by_name
            ),
            queue=INAPP_NOTIFICATION_QUEUE
        )
        
        logger.info(
            f"🚨 Escalation notification queued: task item {from_task_item_id} from user {from_user_id} to user {to_user_id} (new task item {to_task_item_id})"
        )
        
        return {
            "status": "success",
            "message": "Escalation notification queued",
            "from_user_id": from_user_id,
            "to_user_id": to_user_id,
            "from_task_item_id": from_task_item_id,
            "to_task_item_id": to_task_item_id
        }
        
    except Exception as e:
        logger.error(
            f"❌ Failed to queue escalation notification for task items {from_task_item_id}/{to_task_item_id}: {str(e)}",
            exc_info=True
        )
        return {
            "status": "error",
            "message": str(e),
            "from_task_item_id": from_task_item_id,
            "to_task_item_id": to_task_item_id
        }


# =============================================================================
# TASK COMPLETION NOTIFICATIONS
# =============================================================================

@shared_task(name="task.send_task_completed_notification")
def send_task_completed_notification(
    user_id,
    task_item_id,
    task_title,
    completed_by_id=None,
    completed_by_name=None
):
    """
    Send notification when a task is completed.
    Typically sent to ticket owners/coordinators.
    
    Args:
        user_id (int): User to notify (e.g., ticket owner)
        task_item_id (str): The task item ID
        task_title (str): The task title/ticket number
        completed_by_id (int): User who completed the task
        completed_by_name (str): Name of user who completed the task
    
    Returns:
        dict: Status of the notification request
    """
    try:
        current_app.send_task(
            'notifications.send_task_completed_notification',
            args=(
                user_id,
                str(task_item_id),
                task_title,
                completed_by_id,
                completed_by_name
            ),
            queue=INAPP_NOTIFICATION_QUEUE
        )
        
        logger.info(
            f"✅ Task completed notification queued for user {user_id} on task item {task_item_id}"
        )
        
        return {
            "status": "success",
            "message": "Task completed notification queued",
            "user_id": user_id,
            "task_item_id": task_item_id
        }
        
    except Exception as e:
        logger.error(
            f"❌ Failed to queue task completed notification for task item {task_item_id}: {str(e)}",
            exc_info=True
        )
        return {
            "status": "error",
            "message": str(e),
            "task_item_id": task_item_id
        }


# =============================================================================
# WORKFLOW STEP CHANGE NOTIFICATIONS
# =============================================================================

@shared_task(name="task.send_workflow_step_notification")
def send_workflow_step_notification(
    user_id,
    task_item_id,
    task_title,
    previous_step,
    current_step,
    action_by_id=None,
    action_by_name=None
):
    """
    Send notification when a workflow moves to a new step.
    Useful for ticket owners/coordinators tracking progress.
    
    Args:
        user_id (int): User to notify
        task_item_id (str): The task item ID
        task_title (str): The task title/ticket number
        previous_step (str): Previous step name
        current_step (str): Current step name
        action_by_id (int): User who triggered the transition
        action_by_name (str): Name of user who triggered the transition
    
    Returns:
        dict: Status of the notification request
    """
    try:
        current_app.send_task(
            'notifications.send_workflow_step_notification',
            args=(
                user_id,
                str(task_item_id),
                task_title,
                previous_step,
                current_step,
                action_by_id,
                action_by_name
            ),
            queue=INAPP_NOTIFICATION_QUEUE
        )
        
        logger.info(
            f"📋 Workflow step notification queued for user {user_id} on task item {task_item_id}"
        )
        
        return {
            "status": "success",
            "message": "Workflow step notification queued",
            "user_id": user_id,
            "task_item_id": task_item_id
        }
        
    except Exception as e:
        logger.error(
            f"❌ Failed to queue workflow step notification for task item {task_item_id}: {str(e)}",
            exc_info=True
        )
        return {
            "status": "error",
            "message": str(e),
            "task_item_id": task_item_id
        }


# =============================================================================
# SLA NOTIFICATIONS
# =============================================================================

@shared_task(name="task.send_sla_warning_notification")
def send_sla_warning_notification(
    user_id,
    task_item_id,
    task_title,
    time_remaining,
    target_resolution
):
    """
    Send warning notification when SLA deadline is approaching.
    
    Args:
        user_id (int): User to notify
        task_item_id (str): The task item ID
        task_title (str): The task title/ticket number
        time_remaining (str): Human-readable time remaining
        target_resolution (str): Target resolution datetime
    
    Returns:
        dict: Status of the notification request
    """
    try:
        current_app.send_task(
            'notifications.send_sla_warning_notification',
            args=(
                user_id,
                str(task_item_id),
                task_title,
                time_remaining,
                target_resolution
            ),
            queue=INAPP_NOTIFICATION_QUEUE
        )
        
        logger.info(
            f"⚠️ SLA warning notification queued for user {user_id} on task item {task_item_id}"
        )
        
        return {
            "status": "success",
            "message": "SLA warning notification queued",
            "user_id": user_id,
            "task_item_id": task_item_id
        }
        
    except Exception as e:
        logger.error(
            f"❌ Failed to queue SLA warning notification for task item {task_item_id}: {str(e)}",
            exc_info=True
        )
        return {
            "status": "error",
            "message": str(e),
            "task_item_id": task_item_id
        }


@shared_task(name="task.send_sla_breach_notification")
def send_sla_breach_notification(
    user_id,
    task_item_id,
    task_title,
    target_resolution,
    breach_duration=None
):
    """
    Send notification when SLA has been breached.
    
    Args:
        user_id (int): User to notify
        task_item_id (str): The task item ID
        task_title (str): The task title/ticket number
        target_resolution (str): Target resolution datetime
        breach_duration (str): How long past the deadline
    
    Returns:
        dict: Status of the notification request
    """
    try:
        current_app.send_task(
            'notifications.send_sla_breach_notification',
            args=(
                user_id,
                str(task_item_id),
                task_title,
                target_resolution,
                breach_duration
            ),
            queue=INAPP_NOTIFICATION_QUEUE
        )
        
        logger.info(
            f"🔴 SLA breach notification queued for user {user_id} on task item {task_item_id}"
        )
        
        return {
            "status": "success",
            "message": "SLA breach notification queued",
            "user_id": user_id,
            "task_item_id": task_item_id
        }
        
    except Exception as e:
        logger.error(
            f"❌ Failed to queue SLA breach notification for task item {task_item_id}: {str(e)}",
            exc_info=True
        )
        return {
            "status": "error",
            "message": str(e),
            "task_item_id": task_item_id
        }


# =============================================================================
# BULK ASSIGNMENT NOTIFICATIONS
# =============================================================================


@shared_task(name="task.send_bulk_assignment_notifications")
def send_bulk_assignment_notifications(assignments_data):
    """
    Send notifications for multiple task assignments at once.
    
    Args:
        assignments_data (list): List of dicts with keys:
            - user_id (int)
            - task_item_id (str)
            - task_title (str)
            - role_name (str)
    
    Returns:
        dict: Status with count of notifications sent
        
    Example:
        >>> send_bulk_assignment_notifications.delay([
        ...     {
        ...         "user_id": 6,
        ...         "task_item_id": "123",
        ...         "task_title": "Review Ticket",
        ...         "role_name": "Reviewer"
        ...     },
        ...     {
        ...         "user_id": 7,
        ...         "task_item_id": "124",
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
                    task_item_id=assignment['task_item_id'],
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


# =============================================================================
# COMMENT NOTIFICATIONS
# =============================================================================

@shared_task(name="task.send_comment_notification")
def send_comment_notification(
    user_id,
    task_id,
    task_title,
    commenter_name,
    comment_preview=None
):
    """
    Send notification when a comment is added to a task.
    
    Args:
        user_id (int): User to notify
        task_id (str): The task ID
        task_title (str): The task title/ticket number
        commenter_name (str): Name of the person who commented
        comment_preview (str): First few characters of the comment
    
    Returns:
        dict: Status of the notification request
    """
    try:
        current_app.send_task(
            'notifications.send_comment_notification',
            args=(
                user_id,
                str(task_id),
                task_title,
                commenter_name,
                comment_preview
            ),
            queue=INAPP_NOTIFICATION_QUEUE
        )
        
        logger.info(
            f"💬 Comment notification queued for user {user_id} on task {task_id}"
        )
        
        return {
            "status": "success",
            "message": "Comment notification queued",
            "user_id": user_id,
            "task_id": task_id
        }
        
    except Exception as e:
        logger.error(
            f"❌ Failed to queue comment notification for task {task_id}: {str(e)}",
            exc_info=True
        )
        return {
            "status": "error",
            "message": str(e),
            "task_id": task_id
        }


@shared_task(name="task.send_mention_notification")
def send_mention_notification(
    user_id,
    task_id,
    task_title,
    mentioned_by_name,
    comment_preview=None
):
    """
    Send notification when a user is mentioned in a comment.
    
    Args:
        user_id (int): User who was mentioned
        task_id (str): The task ID
        task_title (str): The task title/ticket number
        mentioned_by_name (str): Name of the person who mentioned them
        comment_preview (str): First few characters of the comment
    
    Returns:
        dict: Status of the notification request
    """
    try:
        current_app.send_task(
            'notifications.send_mention_notification',
            args=(
                user_id,
                str(task_id),
                task_title,
                mentioned_by_name,
                comment_preview
            ),
            queue=INAPP_NOTIFICATION_QUEUE
        )
        
        logger.info(
            f"📣 Mention notification queued for user {user_id} on task {task_id}"
        )
        
        return {
            "status": "success",
            "message": "Mention notification queued",
            "user_id": user_id,
            "task_id": task_id
        }
        
    except Exception as e:
        logger.error(
            f"❌ Failed to queue mention notification for task {task_id}: {str(e)}",
            exc_info=True
        )
        return {
            "status": "error",
            "message": str(e),
            "task_id": task_id
        }


# =============================================================================
# TICKET STATUS NOTIFICATIONS
# =============================================================================

@shared_task(name="task.send_ticket_status_notification")
def send_ticket_status_notification(
    user_id,
    ticket_number,
    task_id,
    old_status,
    new_status,
    changed_by_name=None
):
    """
    Send notification when ticket status changes (resolved, closed, reopened).
    
    Args:
        user_id (int): User to notify
        ticket_number (str): The ticket number
        task_id (str): Associated task ID
        old_status (str): Previous status
        new_status (str): New status
        changed_by_name (str): Name of user who changed the status
    
    Returns:
        dict: Status of the notification request
    """
    try:
        current_app.send_task(
            'notifications.send_ticket_status_notification',
            args=(
                user_id,
                ticket_number,
                str(task_id),
                old_status,
                new_status,
                changed_by_name
            ),
            queue=INAPP_NOTIFICATION_QUEUE
        )
        
        logger.info(
            f"📝 Ticket status notification queued for user {user_id} - {ticket_number}"
        )
        
        return {
            "status": "success",
            "message": "Ticket status notification queued",
            "user_id": user_id,
            "ticket_number": ticket_number
        }
        
    except Exception as e:
        logger.error(
            f"❌ Failed to queue ticket status notification for {ticket_number}: {str(e)}",
            exc_info=True
        )
        return {
            "status": "error",
            "message": str(e),
            "ticket_number": ticket_number
        }