from celery import shared_task
from .models import InAppNotification
from django.utils import timezone
import logging

logger = logging.getLogger(__name__)


# =============================================================================
# TASK ASSIGNMENT NOTIFICATIONS
# =============================================================================

@shared_task(name="task.send_assignment_notification")
def send_assignment_notification(user_id, task_id, task_title, role_name):
    """
    Handle assignment notifications sent from the workflow API.
    
    This task receives notifications when users are assigned to tasks
    in the workflow system and creates in-app notifications.
    
    Args:
        user_id (int): The ID of the user being assigned
        task_id (str): The ID of the task
        task_title (str): The title of the task
        role_name (str): The role the user is being assigned to
    
    Returns:
        dict: Status of the operation
    """
    try:
        subject = f"New Task Assignment: {task_title}"
        message = f"""
You have been assigned to a task with the following details:

Task ID: {task_id}
Task Title: {task_title}
Role: {role_name}
Assigned At: {timezone.now().strftime('%Y-%m-%d %H:%M:%S')}

Please log in to the system to view more details.
        """.strip()
        
        notification = InAppNotification.objects.create(
            user_id=user_id,
            subject=subject,
            message=message,
            notification_type='task_assignment',
            related_task_id=str(task_id),
            metadata={
                'role_name': role_name,
                'assigned_at': timezone.now().isoformat()
            }
        )
        
        logger.info(f"✅ Created assignment notification {notification.id} for user {user_id} to task {task_id}")
        
        return {
            "status": "success",
            "notification_id": str(notification.id),
            "user_id": user_id,
            "task_id": task_id
        }
    except Exception as e:
        logger.error(f"❌ Failed to create assignment notification: {str(e)}", exc_info=True)
        return {
            "status": "error",
            "error": str(e),
            "user_id": user_id,
            "task_id": task_id
        }


# =============================================================================
# TASK TRANSFER NOTIFICATIONS
# =============================================================================

@shared_task(name="notifications.send_task_transfer_notification")
def send_task_transfer_notification(
    from_user_id, 
    to_user_id, 
    task_id, 
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
        task_id (str): The task ID
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
        message_out = f"""
Your task assignment has been transferred to another user.

Task ID: {task_id}
Task: {task_title}
Transferred By: {transferred_by_name or f'User {transferred_by_id}'}
Transferred At: {timestamp.strftime('%Y-%m-%d %H:%M:%S')}
{f'Reason: {transfer_notes}' if transfer_notes else ''}

You no longer need to work on this task.
        """.strip()
        
        notification_out = InAppNotification.objects.create(
            user_id=from_user_id,
            subject=subject_out,
            message=message_out,
            notification_type='task_transfer_out',
            related_task_id=str(task_id),
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
        subject_in = f"Task Assigned via Transfer: {task_title}"
        message_in = f"""
A task has been transferred to you.

Task ID: {task_id}
Task: {task_title}
Transferred By: {transferred_by_name or f'User {transferred_by_id}'}
Transferred At: {timestamp.strftime('%Y-%m-%d %H:%M:%S')}
{f'Notes: {transfer_notes}' if transfer_notes else ''}

Please log in to the system to review and work on this task.
        """.strip()
        
        notification_in = InAppNotification.objects.create(
            user_id=to_user_id,
            subject=subject_in,
            message=message_in,
            notification_type='task_transfer_in',
            related_task_id=str(task_id),
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
        
        return {
            "status": "success",
            "notifications_created": notifications_created,
            "from_user_id": from_user_id,
            "to_user_id": to_user_id,
            "task_id": task_id
        }
    except Exception as e:
        logger.error(f"❌ Failed to create transfer notification: {str(e)}", exc_info=True)
        return {
            "status": "error",
            "error": str(e),
            "task_id": task_id
        }


# =============================================================================
# TASK ESCALATION NOTIFICATIONS
# =============================================================================

@shared_task(name="notifications.send_escalation_notification")
def send_escalation_notification(
    from_user_id,
    to_user_id,
    task_id,
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
        task_id (str): The task ID
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
        message_out = f"""
Your task has been escalated to a higher-priority role.

Task ID: {task_id}
Task: {task_title}
Escalated To Role: {escalated_to_role}
{f'Escalated By: {escalated_by_name or f"User {escalated_by_id}"}' if escalated_by_id else ''}
Escalated At: {timestamp.strftime('%Y-%m-%d %H:%M:%S')}
{f'Reason: {escalation_reason}' if escalation_reason else ''}

The task has been assigned to another user for further handling.
        """.strip()
        
        notification_out = InAppNotification.objects.create(
            user_id=from_user_id,
            subject=subject_out,
            message=message_out,
            notification_type='task_escalation_out',
            related_task_id=str(task_id),
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
        subject_in = f"🚨 Escalated Task Assigned: {task_title}"
        message_in = f"""
A task has been escalated to you for attention.

Task ID: {task_id}
Task: {task_title}
Your Role: {escalated_to_role}
Escalated From Role: {escalated_from_role}
{f'Escalated By: {escalated_by_name or f"User {escalated_by_id}"}' if escalated_by_id else ''}
Escalated At: {timestamp.strftime('%Y-%m-%d %H:%M:%S')}
{f'Reason: {escalation_reason}' if escalation_reason else ''}

This task requires your immediate attention. Please log in to review.
        """.strip()
        
        notification_in = InAppNotification.objects.create(
            user_id=to_user_id,
            subject=subject_in,
            message=message_in,
            notification_type='task_escalation_in',
            related_task_id=str(task_id),
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
        
        return {
            "status": "success",
            "notifications_created": notifications_created,
            "from_user_id": from_user_id,
            "to_user_id": to_user_id,
            "task_id": task_id
        }
    except Exception as e:
        logger.error(f"❌ Failed to create escalation notification: {str(e)}", exc_info=True)
        return {
            "status": "error",
            "error": str(e),
            "task_id": task_id
        }


# =============================================================================
# TASK COMPLETION NOTIFICATIONS
# =============================================================================

@shared_task(name="notifications.send_task_completed_notification")
def send_task_completed_notification(
    user_id,
    task_id,
    task_title,
    completed_by_id=None,
    completed_by_name=None
):
    """
    Send notification when a task the user is associated with is completed.
    
    Args:
        user_id (int): User to notify (e.g., ticket owner)
        task_id (str): The task ID
        task_title (str): The task title/ticket number
        completed_by_id (int): User who completed the task
        completed_by_name (str): Name of user who completed the task
    
    Returns:
        dict: Status of the operation
    """
    try:
        timestamp = timezone.now()
        
        subject = f"✅ Task Completed: {task_title}"
        message = f"""
A task has been completed.

Task ID: {task_id}
Task: {task_title}
{f'Completed By: {completed_by_name or f"User {completed_by_id}"}' if completed_by_id else ''}
Completed At: {timestamp.strftime('%Y-%m-%d %H:%M:%S')}

The workflow for this task has been finalized.
        """.strip()
        
        notification = InAppNotification.objects.create(
            user_id=user_id,
            subject=subject,
            message=message,
            notification_type='task_completed',
            related_task_id=str(task_id),
            metadata={
                'completed_by_id': completed_by_id,
                'completed_by_name': completed_by_name,
                'completed_at': timestamp.isoformat()
            }
        )
        
        logger.info(f"✅ Created task completed notification {notification.id} for user {user_id}")
        
        return {
            "status": "success",
            "notification_id": str(notification.id),
            "user_id": user_id,
            "task_id": task_id
        }
    except Exception as e:
        logger.error(f"❌ Failed to create task completed notification: {str(e)}", exc_info=True)
        return {
            "status": "error",
            "error": str(e),
            "task_id": task_id
        }


# =============================================================================
# WORKFLOW STEP CHANGE NOTIFICATIONS
# =============================================================================

@shared_task(name="notifications.send_workflow_step_notification")
def send_workflow_step_notification(
    user_id,
    task_id,
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
        task_id (str): The task ID
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
        
        subject = f"Workflow Progress: {task_title}"
        message = f"""
A workflow has progressed to a new step.

Task ID: {task_id}
Task: {task_title}
Previous Step: {previous_step}
Current Step: {current_step}
{f'Action By: {action_by_name or f"User {action_by_id}"}' if action_by_id else ''}
Updated At: {timestamp.strftime('%Y-%m-%d %H:%M:%S')}
        """.strip()
        
        notification = InAppNotification.objects.create(
            user_id=user_id,
            subject=subject,
            message=message,
            notification_type='workflow_step_change',
            related_task_id=str(task_id),
            metadata={
                'previous_step': previous_step,
                'current_step': current_step,
                'action_by_id': action_by_id,
                'action_by_name': action_by_name,
                'updated_at': timestamp.isoformat()
            }
        )
        
        logger.info(f"✅ Created workflow step notification {notification.id} for user {user_id}")
        
        return {
            "status": "success",
            "notification_id": str(notification.id),
            "user_id": user_id,
            "task_id": task_id
        }
    except Exception as e:
        logger.error(f"❌ Failed to create workflow step notification: {str(e)}", exc_info=True)
        return {
            "status": "error",
            "error": str(e),
            "task_id": task_id
        }


# =============================================================================
# SLA NOTIFICATIONS
# =============================================================================

@shared_task(name="notifications.send_sla_warning_notification")
def send_sla_warning_notification(
    user_id,
    task_id,
    task_title,
    time_remaining,
    target_resolution
):
    """
    Send warning notification when SLA deadline is approaching.
    
    Args:
        user_id (int): User to notify
        task_id (str): The task ID
        task_title (str): The task title/ticket number
        time_remaining (str): Human-readable time remaining
        target_resolution (str): Target resolution datetime
    
    Returns:
        dict: Status of the operation
    """
    try:
        timestamp = timezone.now()
        
        subject = f"⚠️ SLA Warning: {task_title}"
        message = f"""
SLA deadline is approaching for your task.

Task ID: {task_id}
Task: {task_title}
Time Remaining: {time_remaining}
Target Resolution: {target_resolution}
Warning Issued: {timestamp.strftime('%Y-%m-%d %H:%M:%S')}

Please prioritize this task to avoid SLA breach.
        """.strip()
        
        notification = InAppNotification.objects.create(
            user_id=user_id,
            subject=subject,
            message=message,
            notification_type='sla_warning',
            related_task_id=str(task_id),
            metadata={
                'time_remaining': time_remaining,
                'target_resolution': target_resolution,
                'warning_issued_at': timestamp.isoformat()
            }
        )
        
        logger.info(f"✅ Created SLA warning notification {notification.id} for user {user_id}")
        
        return {
            "status": "success",
            "notification_id": str(notification.id),
            "user_id": user_id,
            "task_id": task_id
        }
    except Exception as e:
        logger.error(f"❌ Failed to create SLA warning notification: {str(e)}", exc_info=True)
        return {
            "status": "error",
            "error": str(e),
            "task_id": task_id
        }


@shared_task(name="notifications.send_sla_breach_notification")
def send_sla_breach_notification(
    user_id,
    task_id,
    task_title,
    target_resolution,
    breach_duration=None
):
    """
    Send notification when SLA has been breached.
    
    Args:
        user_id (int): User to notify
        task_id (str): The task ID
        task_title (str): The task title/ticket number
        target_resolution (str): Target resolution datetime
        breach_duration (str): How long past the deadline
    
    Returns:
        dict: Status of the operation
    """
    try:
        timestamp = timezone.now()
        
        subject = f"🔴 SLA Breached: {task_title}"
        message = f"""
SLA deadline has been breached for this task.

Task ID: {task_id}
Task: {task_title}
Target Resolution Was: {target_resolution}
{f'Overdue By: {breach_duration}' if breach_duration else ''}
Breach Recorded: {timestamp.strftime('%Y-%m-%d %H:%M:%S')}

Immediate action is required.
        """.strip()
        
        notification = InAppNotification.objects.create(
            user_id=user_id,
            subject=subject,
            message=message,
            notification_type='sla_breach',
            related_task_id=str(task_id),
            metadata={
                'target_resolution': target_resolution,
                'breach_duration': breach_duration,
                'breach_recorded_at': timestamp.isoformat()
            }
        )
        
        logger.info(f"✅ Created SLA breach notification {notification.id} for user {user_id}")
        
        return {
            "status": "success",
            "notification_id": str(notification.id),
            "user_id": user_id,
            "task_id": task_id
        }
    except Exception as e:
        logger.error(f"❌ Failed to create SLA breach notification: {str(e)}", exc_info=True)
        return {
            "status": "error",
            "error": str(e),
            "task_id": task_id
        }


# =============================================================================
# TICKET STATUS NOTIFICATIONS
# =============================================================================

@shared_task(name="notifications.send_ticket_status_notification")
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
        dict: Status of the operation
    """
    try:
        timestamp = timezone.now()
        
        # Determine notification type based on new status
        status_lower = new_status.lower()
        if status_lower in ['resolved', 'completed']:
            notification_type = 'ticket_resolved'
            emoji = '✅'
        elif status_lower == 'closed':
            notification_type = 'ticket_closed'
            emoji = '🔒'
        elif status_lower in ['reopened', 'open']:
            notification_type = 'ticket_reopened'
            emoji = '🔓'
        else:
            notification_type = 'task_status_update'
            emoji = '📝'
        
        subject = f"{emoji} Ticket {new_status}: {ticket_number}"
        message = f"""
Ticket status has been updated.

Ticket: {ticket_number}
Task ID: {task_id}
Previous Status: {old_status}
New Status: {new_status}
{f'Updated By: {changed_by_name}' if changed_by_name else ''}
Updated At: {timestamp.strftime('%Y-%m-%d %H:%M:%S')}
        """.strip()
        
        notification = InAppNotification.objects.create(
            user_id=user_id,
            subject=subject,
            message=message,
            notification_type=notification_type,
            related_task_id=str(task_id),
            related_ticket_number=ticket_number,
            metadata={
                'old_status': old_status,
                'new_status': new_status,
                'changed_by_name': changed_by_name,
                'updated_at': timestamp.isoformat()
            }
        )
        
        logger.info(f"✅ Created ticket status notification {notification.id} for user {user_id}")
        
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
def create_inapp_notification(user_id, subject, message, notification_type='system', related_task_id=None, related_ticket_number=None, metadata=None):
    """
    Create a new in-app notification for a user
    
    Args:
        user_id (int): The ID of the user to receive the notification
        subject (str): The notification subject
        message (str): The notification message content
        notification_type (str): Type of notification (default: 'system')
        related_task_id (str): Optional related task ID
        related_ticket_number (str): Optional related ticket number
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
            related_task_id=related_task_id,
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
            - related_task_id (optional)
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
                    related_task_id=data.get('related_task_id'),
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
        dict: Status of the operation
    """
    try:
        timestamp = timezone.now()
        
        subject = f"💬 New Comment: {task_title}"
        message = f"""
A new comment has been added to a task you're involved with.

Task ID: {task_id}
Task: {task_title}
Comment By: {commenter_name}
{f'Preview: "{comment_preview[:100]}..."' if comment_preview and len(comment_preview) > 100 else f'Comment: "{comment_preview}"' if comment_preview else ''}
Added At: {timestamp.strftime('%Y-%m-%d %H:%M:%S')}

Log in to view the full comment.
        """.strip()
        
        notification = InAppNotification.objects.create(
            user_id=user_id,
            subject=subject,
            message=message,
            notification_type='comment_added',
            related_task_id=str(task_id),
            metadata={
                'commenter_name': commenter_name,
                'comment_preview': comment_preview[:200] if comment_preview else None,
                'commented_at': timestamp.isoformat()
            }
        )
        
        logger.info(f"✅ Created comment notification {notification.id} for user {user_id}")
        
        return {
            "status": "success",
            "notification_id": str(notification.id),
            "user_id": user_id,
            "task_id": task_id
        }
    except Exception as e:
        logger.error(f"❌ Failed to create comment notification: {str(e)}", exc_info=True)
        return {
            "status": "error",
            "error": str(e),
            "task_id": task_id
        }


@shared_task(name="notifications.send_mention_notification")
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
        dict: Status of the operation
    """
    try:
        timestamp = timezone.now()
        
        subject = f"📣 You were mentioned: {task_title}"
        message = f"""
You were mentioned in a comment.

Task ID: {task_id}
Task: {task_title}
Mentioned By: {mentioned_by_name}
{f'Context: "{comment_preview[:100]}..."' if comment_preview and len(comment_preview) > 100 else f'Context: "{comment_preview}"' if comment_preview else ''}
Mentioned At: {timestamp.strftime('%Y-%m-%d %H:%M:%S')}

Log in to view the full comment and respond.
        """.strip()
        
        notification = InAppNotification.objects.create(
            user_id=user_id,
            subject=subject,
            message=message,
            notification_type='mention',
            related_task_id=str(task_id),
            metadata={
                'mentioned_by_name': mentioned_by_name,
                'comment_preview': comment_preview[:200] if comment_preview else None,
                'mentioned_at': timestamp.isoformat()
            }
        )
        
        logger.info(f"✅ Created mention notification {notification.id} for user {user_id}")
        
        return {
            "status": "success",
            "notification_id": str(notification.id),
            "user_id": user_id,
            "task_id": task_id
        }
    except Exception as e:
        logger.error(f"❌ Failed to create mention notification: {str(e)}", exc_info=True)
        return {
            "status": "error",
            "error": str(e),
            "task_id": task_id
        }