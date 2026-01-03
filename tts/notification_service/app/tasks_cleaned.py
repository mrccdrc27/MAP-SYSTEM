from celery import shared_task
from .models import InAppNotification
from django.utils import timezone
import logging

logger = logging.getLogger(__name__)


def _send_email_for_notification(user_id, subject, message, notification_type, context=None):
    """
    Helper to send email counterpart for in-app notification.
    Runs in a try-except to not fail the main task if email fails.
    """
    try:
        from .email_service import send_notification_email, get_template_for_notification
        
        template = get_template_for_notification(notification_type)
        success, error = send_notification_email(
            user_id=user_id,
            subject=subject,
            message=message,
            notification_type=notification_type,
            template_name=template,
            context=context
        )
        
        if not success:
            logger.warning(f"Email notification failed for user {user_id}: {error}")
        
        return success
    except Exception as e:
        logger.error(f"Error sending email notification: {str(e)}", exc_info=True)
        return False


# =============================================================================
# TASK ASSIGNMENT NOTIFICATIONS
# =============================================================================

@shared_task(name="task.send_assignment_notification")
def send_assignment_notification(user_id, ticket_number, task_title, role_name):
    """
    Handle assignment notifications sent from the workflow API.
    
    This task receives notifications when users are assigned to tasks
    in the workflow system and creates in-app notifications.
    
    Args:
        user_id (int): The ID of the user being assigned
        ticket_number (str): The ticket number for navigation
        task_title (str): The title of the task
        role_name (str): The role the user is being assigned to
    
    Returns:
        dict: Status of the operation
    """
    try:
        subject = f"Task Assignment: {task_title}"
        message = f"Assigned as {role_name}"
        
        notification = InAppNotification.objects.create(
            user_id=user_id,
            subject=subject,
            message=message,
            notification_type='task_assignment',
            related_ticket_number=str(ticket_number),
            metadata={
                'role_name': role_name,
                'assigned_at': timezone.now().isoformat()
            }
        )
        
        logger.info(f"✅ Created assignment notification {notification.id} for user {user_id} to ticket {ticket_number}")
        
        # Send email counterpart
        _send_email_for_notification(
            user_id=user_id,
            subject=subject,
            message=f"You have been assigned to task '{task_title}' as {role_name}.",
            notification_type='task_assignment',
            context={
                'task_title': task_title,
                'ticket_number': ticket_number,
                'ticket_subject': task_title,
                'role_name': role_name
            }
        )
        
        return {
            "status": "success",
            "notification_id": str(notification.id),
            "user_id": user_id,
            "ticket_number": ticket_number
        }
    except Exception as e:
        logger.error(f"❌ Failed to create assignment notification: {str(e)}", exc_info=True)
        return {
            "status": "error",
            "error": str(e),
            "user_id": user_id,
            "ticket_number": ticket_number
        }


# =============================================================================
# TASK TRANSFER NOTIFICATIONS
# =============================================================================

@shared_task(name="notifications.send_task_transfer_notification")
def send_task_transfer_notification(
    from_user_id, 
    to_user_id, 
    from_ticket_number,
    to_ticket_number,
    task_title, 
    transferred_by_id,
    transferred_by_name=None,
    transfer_notes=None
):
    """
    Send notifications when a task is transferred between users.
    Creates two notifications:
    1. For the original assignee (task_transfer_out) - informing them the task was transferred
    2. For the new assignee (task_transfer_in) - informing them they received the task
    
    Args:
        from_user_id (int): Original assignee user ID
        to_user_id (int): New assignee user ID
        from_ticket_number (str): The original task item ID (for the user losing the task)
        to_ticket_number (str): The new task item ID (for the user receiving the task)
        task_title (str): The task title/ticket number
        transferred_by_id (int): User ID who initiated the transfer
        transferred_by_name (str): Name of user who initiated the transfer
        transfer_notes (str): Optional reason for transfer
    
    Returns:
        dict: Status with notification IDs
    """
    try:
        notifications_created = []
        timestamp = timezone.now()
        
        # Notification for original assignee (task transferred away from them)
        subject_out = f"Task Transferred: {task_title}"
        transfer_by = transferred_by_name or ("a teammate" if not transferred_by_id else "a teammate")
        # Use friendly labels in messages; keep IDs in metadata only
        to_user_label = "the new assignee"
        from_user_label = "the previous assignee"

        # Make it explicit when the current user initiated the transfer
        if transferred_by_id and transferred_by_id == from_user_id:
            message_out = (
                f"You transferred task '{task_title}' to {to_user_label}."
                + (f" Notes: {transfer_notes}" if transfer_notes else "")
            )
        else:
            message_out = (
                f"Task '{task_title}' was moved to {to_user_label} by {transfer_by}."
                + (f" Notes: {transfer_notes}" if transfer_notes else "")
            )
        
        notification_out = InAppNotification.objects.create(
            user_id=from_user_id,
            subject=subject_out,
            message=message_out,
            notification_type='task_transfer_out',
            related_ticket_number=str(from_ticket_number),
            metadata={
                'transferred_to_user_id': to_user_id,
                'transferred_by_id': transferred_by_id,
                'transferred_by_name': transferred_by_name,
                'transfer_notes': transfer_notes,
                'transferred_at': timestamp.isoformat()
            }
        )
        notifications_created.append(str(notification_out.id))
        logger.info(f"✅ Created transfer-out notification {notification_out.id} for user {from_user_id}")
        
        # Notification for new assignee (task transferred to them)
        # Treat like a fresh assignment for clarity
        subject_in = f"New Task: {task_title}"
        message_in = (
            f"New task '{task_title}' assigned to you. It was transferred from {from_user_label} by {transfer_by}."
            + (f" Notes: {transfer_notes}" if transfer_notes else "")
        )
        
        notification_in = InAppNotification.objects.create(
            user_id=to_user_id,
            subject=subject_in,
            message=message_in,
            notification_type='task_transfer_in',
            related_ticket_number=str(to_ticket_number),
            metadata={
                'transferred_from_user_id': from_user_id,
                'transferred_by_id': transferred_by_id,
                'transferred_by_name': transferred_by_name,
                'transfer_notes': transfer_notes,
                'transferred_at': timestamp.isoformat()
            }
        )
        notifications_created.append(str(notification_in.id))
        logger.info(f"✅ Created transfer-in notification {notification_in.id} for user {to_user_id}")
        
        # Send email counterparts
        _send_email_for_notification(
            user_id=from_user_id,
            subject=subject_out,
            message=f"Your task '{task_title}' has been transferred to another team member by {transfer_by}." + (f" Reason: {transfer_notes}" if transfer_notes else ""),
            notification_type='task_transfer_out',
            context={
                'task_title': task_title,
                'ticket_number': task_title,
                'ticket_subject': task_title,
                'ticket_number': from_ticket_number,
                'transferred_by': transfer_by,
                'transfer_notes': transfer_notes,
                'direction': 'out'
            }
        )
        
        _send_email_for_notification(
            user_id=to_user_id,
            subject=subject_in,
            message=f"Task '{task_title}' has been transferred to you by {transfer_by}." + (f" Notes: {transfer_notes}" if transfer_notes else ""),
            notification_type='task_transfer_in',
            context={
                'task_title': task_title,
                'ticket_number': task_title,
                'ticket_subject': task_title,
                'ticket_number': to_ticket_number,
                'transferred_by': transfer_by,
                'transfer_notes': transfer_notes,
                'direction': 'in'
            }
        )
        
        return {
            "status": "success",
            "notifications_created": notifications_created,
            "from_user_id": from_user_id,
            "to_user_id": to_user_id,
            "from_ticket_number": from_ticket_number,
            "to_ticket_number": to_ticket_number
        }
    except Exception as e:
        logger.error(f"❌ Failed to create transfer notification: {str(e)}", exc_info=True)
        return {
            "status": "error",
            "error": str(e),
            "from_ticket_number": from_ticket_number,
            "to_ticket_number": to_ticket_number
        }


# =============================================================================
# TASK ESCALATION NOTIFICATIONS
# =============================================================================

@shared_task(name="notifications.send_escalation_notification")
def send_escalation_notification(
    from_user_id,
    to_user_id,
    from_ticket_number,
    to_ticket_number,
    task_title,
    escalated_from_role,
    escalated_to_role,
    escalation_reason=None,
    escalated_by_id=None,
    escalated_by_name=None
):
    """
    Send notifications when a task is escalated between users.
    Creates two notifications:
    1. For the original assignee (task_escalation_out) - informing them the task was escalated
    2. For the new assignee (task_escalation_in) - informing them they received the escalated task
    
    Args:
        from_user_id (int): Original assignee user ID
        to_user_id (int): New assignee user ID (escalated to)
        from_ticket_number (str): The original task item ID (for the user losing the task)
        to_ticket_number (str): The new task item ID (for the user receiving the task)
        task_title (str): The task title/ticket number
        escalated_from_role (str): Original role name
        escalated_to_role (str): Escalated role name
        escalation_reason (str): Optional reason for escalation
        escalated_by_id (int): User ID who initiated the escalation
        escalated_by_name (str): Name of user who initiated the escalation
    
    Returns:
        dict: Status with notification IDs
    """
    try:
        notifications_created = []
        timestamp = timezone.now()
        
        # Notification for original assignee (task escalated away from them)
        subject_out = f"Task Escalated: {task_title}"
        escalated_by = escalated_by_name or f'User {escalated_by_id}' if escalated_by_id else None
        message_out = f"Escalated to {escalated_to_role}" + (f" by {escalated_by}" if escalated_by else "") + (f" - {escalation_reason}" if escalation_reason else "")
        
        notification_out = InAppNotification.objects.create(
            user_id=from_user_id,
            subject=subject_out,
            message=message_out,
            notification_type='task_escalation_out',
            related_ticket_number=str(from_ticket_number),
            metadata={
                'escalated_to_user_id': to_user_id,
                'escalated_to_role': escalated_to_role,
                'escalated_from_role': escalated_from_role,
                'escalated_by_id': escalated_by_id,
                'escalated_by_name': escalated_by_name,
                'escalation_reason': escalation_reason,
                'escalated_at': timestamp.isoformat()
            }
        )
        notifications_created.append(str(notification_out.id))
        logger.info(f"✅ Created escalation-out notification {notification_out.id} for user {from_user_id}")
        
        # Notification for new assignee (task escalated to them)
        subject_in = f"Escalated Task: {task_title}"
        message_in = f"From {escalated_from_role} as {escalated_to_role}" + (f" - {escalation_reason}" if escalation_reason else "")
        
        notification_in = InAppNotification.objects.create(
            user_id=to_user_id,
            subject=subject_in,
            message=message_in,
            notification_type='task_escalation_in',
            related_ticket_number=str(to_ticket_number),
            metadata={
                'escalated_from_user_id': from_user_id,
                'escalated_from_role': escalated_from_role,
                'escalated_to_role': escalated_to_role,
                'escalated_by_id': escalated_by_id,
                'escalated_by_name': escalated_by_name,
                'escalation_reason': escalation_reason,
                'escalated_at': timestamp.isoformat()
            }
        )
        notifications_created.append(str(notification_in.id))
        logger.info(f"✅ Created escalation-in notification {notification_in.id} for user {to_user_id}")
        
        # Send email counterparts
        _send_email_for_notification(
            user_id=from_user_id,
            subject=subject_out,
            message=f"Task '{task_title}' has been escalated from {escalated_from_role} to {escalated_to_role}." + (f" Reason: {escalation_reason}" if escalation_reason else ""),
            notification_type='task_escalation_out',
            context={
                'task_title': task_title,
                'ticket_number': task_title,
                'ticket_subject': task_title,
                'ticket_number': from_ticket_number,
                'escalated_from_role': escalated_from_role,
                'escalated_to_role': escalated_to_role,
                'escalation_reason': escalation_reason,
                'direction': 'out'
            }
        )
        
        _send_email_for_notification(
            user_id=to_user_id,
            subject=subject_in,
            message=f"You have received an escalated task '{task_title}' as {escalated_to_role}." + (f" Reason: {escalation_reason}" if escalation_reason else ""),
            notification_type='task_escalation_in',
            context={
                'task_title': task_title,
                'ticket_number': task_title,
                'ticket_subject': task_title,
                'ticket_number': to_ticket_number,
                'escalated_from_role': escalated_from_role,
                'escalated_to_role': escalated_to_role,
                'escalation_reason': escalation_reason,
                'direction': 'in'
            }
        )
        
        return {
            "status": "success",
            "notifications_created": notifications_created,
            "from_user_id": from_user_id,
            "to_user_id": to_user_id,
            "from_ticket_number": from_ticket_number,
            "to_ticket_number": to_ticket_number
        }
    except Exception as e:
        logger.error(f"❌ Failed to create escalation notification: {str(e)}", exc_info=True)
        return {
            "status": "error",
            "error": str(e),
            "from_ticket_number": from_ticket_number,
            "to_ticket_number": to_ticket_number
        }


# =============================================================================
# TASK COMPLETION NOTIFICATIONS
# =============================================================================

@shared_task(name="notifications.send_task_completed_notification")
def send_task_completed_notification(
    user_id,
    ticket_number,
    task_title,
    completed_by_id=None,
    completed_by_name=None
):
    """
    Send notification when a task the user is associated with is completed.
    
    Args:
        user_id (int): User to notify (e.g., ticket owner)
        ticket_number (str): The task item ID
        task_title (str): The task title/ticket number
        completed_by_id (int): User who completed the task
        completed_by_name (str): Name of user who completed the task
    
    Returns:
        dict: Status of the operation
    """
    try:
        timestamp = timezone.now()
        
        subject = f"Task Completed: {task_title}"
        completed_by = completed_by_name or f'User {completed_by_id}' if completed_by_id else None
        message = f"Completed by {completed_by}" if completed_by else "Task has been finalized"
        
        notification = InAppNotification.objects.create(
            user_id=user_id,
            subject=subject,
            message=message,
            notification_type='task_completed',
            related_ticket_number=str(ticket_number),
            metadata={
                'completed_by_id': completed_by_id,
                'completed_by_name': completed_by_name,
                'completed_at': timestamp.isoformat()
            }
        )
        
        logger.info(f"✅ Created task completed notification {notification.id} for user {user_id}")
        
        # Send email counterpart
        _send_email_for_notification(
            user_id=user_id,
            subject=subject,
            message=f"Task '{task_title}' has been completed" + (f" by {completed_by}" if completed_by else "") + ".",
            notification_type='task_completed',
            context={
                'task_title': task_title,
                'ticket_number': task_title,
                'ticket_subject': task_title,
                'ticket_number': ticket_number,
                'completed_by': completed_by
            }
        )
        
        return {
            "status": "success",
            "notification_id": str(notification.id),
            "user_id": user_id,
            "ticket_number": ticket_number
        }
    except Exception as e:
        logger.error(f"❌ Failed to create task completed notification: {str(e)}", exc_info=True)
        return {
            "status": "error",
            "error": str(e),
            "ticket_number": ticket_number
        }


# =============================================================================
# WORKFLOW STEP CHANGE NOTIFICATIONS
# =============================================================================

@shared_task(name="notifications.send_workflow_step_notification")
def send_workflow_step_notification(
    user_id,
    ticket_number,
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
        ticket_number (str): The task item ID
        task_title (str): The task title/ticket number
        previous_step (str): Previous step name
        current_step (str): Current step name
        action_by_id (int): User who triggered the transition
        action_by_name (str): Name of user who triggered the transition
    
    Returns:
        dict: Status of the operation
    """
    try:
        timestamp = timezone.now()
        
        subject = f"Workflow Update: {task_title}"
        message = f"{previous_step} → {current_step}"
        
        notification = InAppNotification.objects.create(
            user_id=user_id,
            subject=subject,
            message=message,
            notification_type='workflow_step_change',
            related_ticket_number=str(ticket_number),
            metadata={
                'previous_step': previous_step,
                'current_step': current_step,
                'action_by_id': action_by_id,
                'action_by_name': action_by_name,
                'updated_at': timestamp.isoformat()
            }
        )
        
        logger.info(f"✅ Created workflow step notification {notification.id} for user {user_id}")
        
        # Send email counterpart
        _send_email_for_notification(
            user_id=user_id,
            subject=subject,
            message=f"Task '{task_title}' has moved from '{previous_step}' to '{current_step}'.",
            notification_type='workflow_step_change',
            context={
                'task_title': task_title,
                'ticket_number': task_title,
                'ticket_subject': task_title,
                'ticket_number': ticket_number,
                'previous_step': previous_step,
                'current_step': current_step,
                'action_by_name': action_by_name
            }
        )
        
        return {
            "status": "success",
            "notification_id": str(notification.id),
            "user_id": user_id,
            "ticket_number": ticket_number
        }
    except Exception as e:
        logger.error(f"❌ Failed to create workflow step notification: {str(e)}", exc_info=True)
        return {
            "status": "error",
            "error": str(e),
            "ticket_number": ticket_number
        }


# =============================================================================
# SLA NOTIFICATIONS
# =============================================================================

@shared_task(name="notifications.send_sla_warning_notification")
def send_sla_warning_notification(
    user_id,
    ticket_number,
    task_title,
    time_remaining,
    target_resolution
):
    """
    Send warning notification when SLA deadline is approaching.
    
    Args:
        user_id (int): User to notify
        ticket_number (str): The task item ID
        task_title (str): The task title/ticket number
        time_remaining (str): Human-readable time remaining
        target_resolution (str): Target resolution datetime
    
    Returns:
        dict: Status of the operation
    """
    try:
        timestamp = timezone.now()
        
        subject = f"SLA Warning: {task_title}"
        message = f"{time_remaining} remaining until {target_resolution}"
        
        notification = InAppNotification.objects.create(
            user_id=user_id,
            subject=subject,
            message=message,
            notification_type='sla_warning',
            related_ticket_number=str(ticket_number),
            metadata={
                'time_remaining': time_remaining,
                'target_resolution': target_resolution,
                'warning_issued_at': timestamp.isoformat()
            }
        )
        
        logger.info(f"✅ Created SLA warning notification {notification.id} for user {user_id}")
        
        # Send email counterpart
        _send_email_for_notification(
            user_id=user_id,
            subject=subject,
            message=f"SLA Warning: Task '{task_title}' has {time_remaining} remaining. Target resolution: {target_resolution}.",
            notification_type='sla_warning',
            context={
                'task_title': task_title,
                'ticket_number': task_title,
                'ticket_subject': task_title,
                'ticket_number': ticket_number,
                'time_remaining': time_remaining,
                'target_resolution': target_resolution
            }
        )
        
        return {
            "status": "success",
            "notification_id": str(notification.id),
            "user_id": user_id,
            "ticket_number": ticket_number
        }
    except Exception as e:
        logger.error(f"❌ Failed to create SLA warning notification: {str(e)}", exc_info=True)
        return {
            "status": "error",
            "error": str(e),
            "ticket_number": ticket_number
        }


@shared_task(name="notifications.send_sla_breach_notification")
def send_sla_breach_notification(
    user_id,
    ticket_number,
    task_title,
    target_resolution,
    breach_duration=None
):
    """
    Send notification when SLA has been breached.
    
    Args:
        user_id (int): User to notify
        ticket_number (str): The task item ID
        task_title (str): The task title/ticket number
        target_resolution (str): Target resolution datetime
        breach_duration (str): How long past the deadline
    
    Returns:
        dict: Status of the operation
    """
    try:
        timestamp = timezone.now()
        
        subject = f"SLA Breached: {task_title}"
        message = f"Overdue by {breach_duration}" if breach_duration else f"Target was {target_resolution}"
        
        notification = InAppNotification.objects.create(
            user_id=user_id,
            subject=subject,
            message=message,
            notification_type='sla_breach',
            related_ticket_number=str(ticket_number),
            metadata={
                'target_resolution': target_resolution,
                'breach_duration': breach_duration,
                'breach_recorded_at': timestamp.isoformat()
            }
        )
        
        logger.info(f"✅ Created SLA breach notification {notification.id} for user {user_id}")
        
        # Send email counterpart
        _send_email_for_notification(
            user_id=user_id,
            subject=subject,
            message=f"SLA Breached: Task '{task_title}' is overdue" + (f" by {breach_duration}" if breach_duration else "") + f". Target was: {target_resolution}.",
            notification_type='sla_breach',
            context={
                'task_title': task_title,
                'ticket_number': task_title,
                'ticket_subject': task_title,
                'ticket_number': ticket_number,
                'target_resolution': target_resolution,
                'breach_duration': breach_duration
            }
        )
        
        return {
            "status": "success",
            "notification_id": str(notification.id),
            "user_id": user_id,
            "ticket_number": ticket_number
        }
    except Exception as e:
        logger.error(f"❌ Failed to create SLA breach notification: {str(e)}", exc_info=True)
        return {
            "status": "error",
            "error": str(e),
            "ticket_number": ticket_number
        }


# =============================================================================
# TICKET STATUS NOTIFICATIONS
# =============================================================================

@shared_task(name="notifications.send_ticket_status_notification")
def send_ticket_status_notification(
    user_id,
    ticket_number,
    ticket_number,
    old_status,
    new_status,
    changed_by_name=None
):
    """
    Send notification when ticket status changes (resolved, closed, reopened).
    
    Args:
        user_id (int): User to notify
        ticket_number (str): The ticket number
        ticket_number (str): Associated task item ID
        old_status (str): Previous status
        new_status (str): New status
        changed_by_name (str): Name of user who changed the status
    
    Returns:
        dict: Status of the operation
    """
    try:
        timestamp = timezone.now()
        
        # Determine notification type based on new status
        status_lower = new_status.lower()
        if status_lower in ['resolved', 'completed']:
            notification_type = 'ticket_resolved'
        elif status_lower == 'closed':
            notification_type = 'ticket_closed'
        elif status_lower in ['reopened', 'open']:
            notification_type = 'ticket_reopened'
        else:
            notification_type = 'task_status_update'
        
        subject = f"Ticket {new_status}: {ticket_number}"
        message = f"{old_status} → {new_status}" + (f" by {changed_by_name}" if changed_by_name else "")
        
        notification = InAppNotification.objects.create(
            user_id=user_id,
            subject=subject,
            message=message,
            notification_type=notification_type,
            related_ticket_number=str(ticket_number),
            related_ticket_number=ticket_number,
            metadata={
                'old_status': old_status,
                'new_status': new_status,
                'changed_by_name': changed_by_name,
                'updated_at': timestamp.isoformat()
            }
        )
        
        logger.info(f"✅ Created ticket status notification {notification.id} for user {user_id}")
        
        # Send email counterpart
        _send_email_for_notification(
            user_id=user_id,
            subject=subject,
            message=f"Ticket {ticket_number} status changed from '{old_status}' to '{new_status}'" + (f" by {changed_by_name}" if changed_by_name else "") + ".",
            notification_type=notification_type,
            context={
                'ticket_number': ticket_number,
                'ticket_subject': ticket_number,
                'ticket_number': ticket_number,
                'old_status': old_status,
                'new_status': new_status,
                'changed_by_name': changed_by_name
            }
        )
        
        return {
            "status": "success",
            "notification_id": str(notification.id),
            "user_id": user_id,
            "ticket_number": ticket_number
        }
    except Exception as e:
        logger.error(f"❌ Failed to create ticket status notification: {str(e)}", exc_info=True)
        return {
            "status": "error",
            "error": str(e),
            "ticket_number": ticket_number
        }


# =============================================================================
# GENERIC NOTIFICATION TASKS
# =============================================================================

@shared_task(name="notifications.create_inapp_notification")
def create_inapp_notification(user_id, subject, message, notification_type='system', related_ticket_number=None, metadata=None):
    """
    Create a new in-app notification for a user
    
    Args:
        user_id (int): The ID of the user to receive the notification
        subject (str): The notification subject
        message (str): The notification message content
        notification_type (str): Type of notification (default: 'system')
        related_ticket_number (str): Optional related ticket number for navigation
        metadata (dict): Optional additional metadata
    
    Returns:
        dict: Status of the operation
    """
    try:
        notification = InAppNotification.objects.create(
            user_id=user_id,
            subject=subject,
            message=message,
            notification_type=notification_type,
            related_ticket_number=related_ticket_number,
            metadata=metadata or {}
        )
        
        logger.info(f"Created in-app notification {notification.id} for user {user_id}")
        
        return {
            "status": "success",
            "notification_id": str(notification.id),
            "user_id": user_id
        }
    except Exception as e:
        logger.error(f"Failed to create in-app notification: {str(e)}")
        return {
            "status": "error",
            "error": str(e)
        }

@shared_task(name="notifications.mark_notification_read")
def mark_notification_read(notification_id):
    """
    Mark an in-app notification as read
    
    Args:
        notification_id (str): The UUID of the notification to mark as read
        
    Returns:
        dict: Status of the operation
    """
    try:
        notification = InAppNotification.objects.get(id=notification_id)
        notification.mark_as_read()
        
        logger.info(f"Marked notification {notification_id} as read")
        
        return {
            "status": "success",
            "notification_id": notification_id,
            "user_id": notification.user_id
        }
    except InAppNotification.DoesNotExist:
        logger.warning(f"Notification {notification_id} not found")
        return {
            "status": "error",
            "error": f"Notification {notification_id} not found"
        }
    except Exception as e:
        logger.error(f"Failed to mark notification as read: {str(e)}")
        return {
            "status": "error",
            "error": str(e)
        }

@shared_task(name="notifications.bulk_create_notifications")
def bulk_create_notifications(notifications_data):
    """
    Create multiple in-app notifications at once
    
    Args:
        notifications_data (list): List of dictionaries with:
            - user_id (required)
            - subject (required)
            - message (required)
            - notification_type (optional)
            - related_ticket_number (optional)
            - related_ticket_number (optional)
            - metadata (optional)
        
    Returns:
        dict: Status of the operation with count of created notifications
    """
    created_count = 0
    failed_count = 0
    
    try:
        notifications = []
        for data in notifications_data:
            try:
                notifications.append(InAppNotification(
                    user_id=data['user_id'],
                    subject=data['subject'],
                    message=data['message'],
                    notification_type=data.get('notification_type', 'system'),
                    related_ticket_number=data.get('related_ticket_number'),
                    related_ticket_number=data.get('related_ticket_number'),
                    metadata=data.get('metadata', {})
                ))
                created_count += 1
            except Exception as e:
                logger.error(f"Failed to prepare notification: {str(e)}")
                failed_count += 1
                
        # Bulk create all prepared notifications
        if notifications:
            InAppNotification.objects.bulk_create(notifications)
            
        return {
            "status": "success",
            "created_count": created_count,
            "failed_count": failed_count
        }
    except Exception as e:
        logger.error(f"Failed in bulk notification creation: {str(e)}")
        return {
            "status": "error",
            "error": str(e),
            "created_count": created_count,
            "failed_count": failed_count
        }


# =============================================================================
# COMMENT NOTIFICATIONS
# =============================================================================

@shared_task(name="notifications.send_comment_notification")
def send_comment_notification(
    user_id,
    ticket_number,
    task_title,
    commenter_name,
    comment_preview=None
):
    """
    Send notification when a comment is added to a task.
    
    Args:
        user_id (int): User to notify
        ticket_number (str): The task item ID
        task_title (str): The task title/ticket number
        commenter_name (str): Name of the person who commented
        comment_preview (str): First few characters of the comment
    
    Returns:
        dict: Status of the operation
    """
    try:
        timestamp = timezone.now()
        
        subject = f"New Comment: {task_title}"
        preview = comment_preview[:80] + "..." if comment_preview and len(comment_preview) > 80 else comment_preview
        message = f"{commenter_name}: {preview}" if preview else f"Comment from {commenter_name}"
        
        notification = InAppNotification.objects.create(
            user_id=user_id,
            subject=subject,
            message=message,
            notification_type='comment_added',
            related_ticket_number=str(ticket_number),
            metadata={
                'commenter_name': commenter_name,
                'comment_preview': comment_preview[:200] if comment_preview else None,
                'commented_at': timestamp.isoformat()
            }
        )
        
        logger.info(f"✅ Created comment notification {notification.id} for user {user_id}")
        
        # Send email counterpart
        _send_email_for_notification(
            user_id=user_id,
            subject=subject,
            message=f"{commenter_name} commented on task '{task_title}': {comment_preview[:100] + '...' if comment_preview and len(comment_preview) > 100 else comment_preview or ''}",
            notification_type='comment_added',
            context={
                'task_title': task_title,
                'ticket_number': task_title,
                'ticket_subject': task_title,
                'ticket_number': ticket_number,
                'commenter_name': commenter_name,
                'comment_preview': comment_preview
            }
        )
        
        return {
            "status": "success",
            "notification_id": str(notification.id),
            "user_id": user_id,
            "ticket_number": ticket_number
        }
    except Exception as e:
        logger.error(f"❌ Failed to create comment notification: {str(e)}", exc_info=True)
        return {
            "status": "error",
            "error": str(e),
            "ticket_number": ticket_number
        }


@shared_task(name="notifications.send_mention_notification")
def send_mention_notification(
    user_id,
    ticket_number,
    task_title,
    mentioned_by_name,
    comment_preview=None
):
    """
    Send notification when a user is mentioned in a comment.
    
    Args:
        user_id (int): User who was mentioned
        ticket_number (str): The task item ID
        task_title (str): The task title/ticket number
        mentioned_by_name (str): Name of the person who mentioned them
        comment_preview (str): First few characters of the comment
    
    Returns:
        dict: Status of the operation
    """
    try:
        timestamp = timezone.now()
        
        subject = f"Mentioned: {task_title}"
        preview = comment_preview[:80] + "..." if comment_preview and len(comment_preview) > 80 else comment_preview
        message = f"{mentioned_by_name}: {preview}" if preview else f"Mentioned by {mentioned_by_name}"
        
        notification = InAppNotification.objects.create(
            user_id=user_id,
            subject=subject,
            message=message,
            notification_type='mention',
            related_ticket_number=str(ticket_number),
            metadata={
                'mentioned_by_name': mentioned_by_name,
                'comment_preview': comment_preview[:200] if comment_preview else None,
                'mentioned_at': timestamp.isoformat()
            }
        )
        
        logger.info(f"✅ Created mention notification {notification.id} for user {user_id}")
        
        # Send email counterpart
        _send_email_for_notification(
            user_id=user_id,
            subject=subject,
            message=f"You were mentioned by {mentioned_by_name} in task '{task_title}': {comment_preview[:100] + '...' if comment_preview and len(comment_preview) > 100 else comment_preview or ''}",
            notification_type='mention',
            context={
                'task_title': task_title,
                'ticket_number': task_title,
                'ticket_subject': task_title,
                'ticket_number': ticket_number,
                'mentioned_by_name': mentioned_by_name,
                'comment_preview': comment_preview
            }
        )
        
        return {
            "status": "success",
            "notification_id": str(notification.id),
            "user_id": user_id,
            "ticket_number": ticket_number
        }
    except Exception as e:
        logger.error(f"❌ Failed to create mention notification: {str(e)}", exc_info=True)
        return {
            "status": "error",
            "error": str(e),
            "ticket_number": ticket_number
        }


# =============================================================================
# USER EMAIL SYNC TASKS - Imported from sync_tasks module
# =============================================================================

# Import sync tasks so they are discovered by Celery autodiscover
from .sync_tasks import (
    sync_user_email,
    bulk_sync_user_emails,
    delete_user_email_cache,
)
