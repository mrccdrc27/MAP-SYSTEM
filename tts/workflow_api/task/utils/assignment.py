"""
Utility functions for user assignment and round-robin logic.
These functions are used across tasks, steps, and transitions.
"""

from django.utils import timezone
from tickets.models import RoundRobin
from task.models import TaskItem, TaskItemHistory, FailedNotification
from role.models import Roles, RoleUsers
from task.tasks import send_assignment_notification as notify_task
import logging

logger = logging.getLogger(__name__)


def fetch_users_for_role(role_name):
    """
    Fetch users for a role from the RoleUsers model.
    
    Args:
        role_name: Name of the role
    
    Returns:
        List of user IDs: [3, 6, 7, ...]
    """
    try:
        role = Roles.objects.get(name=role_name)
        user_ids = list(RoleUsers.objects.filter(
            role_id=role,
            is_active=True
        ).values_list('user_id', flat=True))
        logger.info(f"[OK] Found {len(user_ids)} users for role '{role_name}'")
        return user_ids
    except Roles.DoesNotExist:
        logger.warning(f"[ERROR] Role '{role_name}' not found")
        return []
    except Exception as e:
        logger.error(f"[ERROR] Error fetching users: {e}")
        return []


def apply_round_robin_assignment(task, user_ids, role_name, step=None):
    """
    Apply round-robin logic to assign users to tasks.
    
    Args:
        task: Task instance
        user_ids: List of user IDs to assign
        role_name: Role name for tracking
        step: Steps instance - the step to assign users to (defaults to task.current_step if not provided)
    
    Returns:
        List of created TaskItem instances
    """
    if not user_ids:
        logger.warning(f"No users for role '{role_name}'")
        return []
    
    # Use provided step or fall back to task.current_step
    target_step = step or task.current_step

    round_robin_state, _ = RoundRobin.objects.get_or_create(
        role_name=role_name,
        defaults={"current_index": 0}
    )

    current_index = round_robin_state.current_index
    user_index = current_index % len(user_ids)
    user_id = user_ids[user_index]

    # Calculate target resolution for TaskItem using WEIGHTED SLA
    # TaskItem target = now + (SLA * step_weight_percentage)
    target_resolution = None
    try:
        if task.ticket_id and task.workflow_id and target_step:
            from task.utils.target_resolution import calculate_target_resolution_for_task_item
            target_resolution = calculate_target_resolution_for_task_item(
                ticket=task.ticket_id,
                step=target_step,
                workflow=task.workflow_id
            )
            if target_resolution:
                logger.info(f"[OK] Calculated TASK ITEM target resolution: {target_resolution}")
            else:
                logger.warning(f"[WARNING] Failed to calculate TaskItem target resolution")
        else:
            logger.warning(f"[WARNING] Missing required fields for target resolution calculation (ticket_id, workflow_id, or target_step)")

    except Exception as e:
        logger.error(f"[ERROR] Failed to calculate TaskItem target resolution: {e}", exc_info=True)

    # Get RoleUsers record for this user and role
    try:
        role_users = RoleUsers.objects.select_related('role_id').get(
            user_id=user_id,
            role_id__name=role_name,
            is_active=True
        )
    except RoleUsers.DoesNotExist:
        logger.error(f"[ERROR] RoleUsers record not found for user {user_id} and role '{role_name}'")
        return []

    # Create TaskItem for the assigned user
    # Check if user already has an ACTIVE (non-terminal) TaskItem for this step
    # Terminal statuses: resolved, escalated, reassigned, breached
    # If existing TaskItem is terminal, create a NEW one (for re-assignment scenarios like rejection loops)
    
    terminal_statuses = ['resolved', 'escalated', 'reassigned', 'breached']
    
    # Look for existing TaskItem at this step
    existing_item = TaskItem.objects.filter(
        task=task,
        role_user=role_users,
        assigned_on_step=target_step,
    ).prefetch_related('taskitemhistory_set').first()
    
    if existing_item:
        # Check if the existing TaskItem has a terminal status
        latest_history = existing_item.taskitemhistory_set.order_by('-created_at').first()
        existing_status = latest_history.status if latest_history else 'new'
        
        if existing_status in terminal_statuses:
            # Existing TaskItem is terminal - CREATE A NEW ONE for re-assignment
            logger.info(f"[INFO] Existing TaskItem {existing_item.task_item_id} for User {user_id} at step {target_step.name} has terminal status '{existing_status}'. Creating new TaskItem for re-assignment.")
            task_item = TaskItem.objects.create(
                task=task,
                role_user=role_users,
                assigned_on_step=target_step,
                origin='System',
                target_resolution=target_resolution,
            )
            # Create initial history record with 'new' status
            TaskItemHistory.objects.create(
                task_item=task_item,
                status='new'
            )
            logger.info(f"[OK] Created NEW TaskItem {task_item.task_item_id}: User {user_id} RE-assigned to Task {task.task_id} at step {target_step.name}")
            created = True
        else:
            # Existing TaskItem is still active - use it (don't duplicate)
            task_item = existing_item
            created = False
            logger.info(f"[WARNING] TaskItem {task_item.task_item_id} already exists and is active (status: {existing_status}): User {user_id} for Task {task.task_id}")
    else:
        # No existing TaskItem - create new one
        task_item = TaskItem.objects.create(
            task=task,
            role_user=role_users,
            assigned_on_step=target_step,
            origin='System',
            target_resolution=target_resolution,
        )
        # Create initial history record with 'new' status
        TaskItemHistory.objects.create(
            task_item=task_item,
            status='new'
        )
        logger.info(f"[OK] Created TaskItem {task_item.task_item_id}: User {user_id} assigned to Task {task.task_id}")
        created = True
    
    if created:
        # Send assignment notification via Celery
        task_title = str(task.ticket_id.subject) if hasattr(task, 'ticket_id') else f"Task {task.task_id}"
        ticket_number = str(task.ticket_id.ticket_number) if hasattr(task, 'ticket_id') and hasattr(task.ticket_id, 'ticket_number') else task_title
        try:
            notify_task.delay(
                user_id=user_id,
                ticket_number=ticket_number,
                task_title=task_title,
                role_name=role_name
            )
        except Exception as e:
            # Store failed notification for later retry
            # (e.g., RabbitMQ is not running or connection issues)
            logger.warning(f"[WARNING] Failed to send assignment notification: {e}")
            FailedNotification.objects.create(
                user_id=user_id,
                task_item_id=str(task_item.task_item_id),
                task_title=task_title,
                role_name=role_name,
                error_message=str(e),
                status='pending'
            )
            logger.info("[OK] Task assignment succeeded, notification queued for retry")

    # Update round-robin state for next assignment
    round_robin_state.current_index = (current_index + 1) % len(user_ids)
    round_robin_state.save()
    
    logger.info(f"[OK] Assigned user {user_id} from role '{role_name}' (round-robin index: {user_index})")

    return [task_item]


def assign_users_for_step(task, step, role_name):
    """
    Fetch users for a role and apply round-robin assignment.
    
    Args:
        task: Task instance
        step: Steps instance - the step to assign users to
        role_name: Role name
    
    Returns:
        List of TaskItem instances
    """
    user_ids = fetch_users_for_role(role_name)
    if not user_ids:
        logger.warning(f"No users for role '{role_name}'")
        return []
    return apply_round_robin_assignment(task, user_ids, role_name, step=step)


def assign_users_for_escalation(task, escalate_to_role, reason, from_user_id=None, from_user_role=None, from_task_item_id=None, escalated_by_id=None, escalated_by_name=None):
    """
    Assign users for escalation to a higher-priority role.
    Uses round-robin to distribute escalated tasks fairly.
    
    Args:
        task: Task instance
        escalate_to_role: Roles instance (the escalated role)
        reason: String reason for escalation
        from_user_id: User ID of the original assignee (for notification)
        from_user_role: Role name of the original assignee
        from_task_item_id: Task item ID of the original assignment (for notification)
        escalated_by_id: User ID who initiated the escalation
        escalated_by_name: Name of user who initiated the escalation
    
    Returns:
        List of created TaskItem instances
    """
    if not escalate_to_role:
        logger.error("❌ No escalate_to_role provided for escalation")
        return []
    
    # Fetch all active users for the escalate_to role
    role_users_qs = RoleUsers.objects.filter(
        role_id=escalate_to_role,
        is_active=True
    ).select_related('role_id')
    
    if not role_users_qs.exists():
        logger.warning(f"❌ No active users found for escalated role '{escalate_to_role.name}'")
        return []
    
    # Get round-robin state for this escalated role
    round_robin_state, _ = RoundRobin.objects.get_or_create(
        role_name=escalate_to_role.name,
        defaults={"current_index": 0}
    )
    
    # Convert queryset to list for round-robin indexing
    role_users_list = list(role_users_qs)
    current_index = round_robin_state.current_index
    user_index = current_index % len(role_users_list)
    selected_role_user = role_users_list[user_index]
    
    # Get the most recent assignment's target resolution to inherit
    original_target_resolution = None
    try:
        # Get the most recent TaskItem for this task (should be the one we're escalating from)
        original_assignment = TaskItem.objects.filter(task=task).order_by('-assigned_on').first()
        if original_assignment:
            original_target_resolution = original_assignment.target_resolution
    except Exception as e:
        logger.error(f"Failed to get original assignment target resolution: {e}")
    
    # Create TaskItem for escalated assignment (force create, don't check if exists)
    task_item = TaskItem.objects.create(
        task=task,
        role_user=selected_role_user,
        origin='Escalation',
        target_resolution=original_target_resolution,
        assigned_on_step=task.current_step,
        notes=''
    )
    
    # Create initial history record with 'new' status
    TaskItemHistory.objects.create(
        task_item=task_item,
        status='new'
    )
    
    logger.info(f"🚨 Escalated TaskItem created: User {selected_role_user.user_id} assigned to Task {task.task_id}")
    
    # Send escalation notification directly to notification_service via Celery
    try:
        from celery import current_app
        from django.conf import settings
        
        inapp_queue = getattr(settings, 'INAPP_NOTIFICATION_QUEUE', 'inapp-notification-queue')
        # Use the passed from_user_role, fallback to step's role if not provided
        original_role = from_user_role or (task.current_step.role_id.name if task.current_step and task.current_step.role_id else 'Unknown')
        
        # Get ticket_number for email URL routing
        ticket_number = str(task.ticket_id.ticket_number) if hasattr(task, 'ticket_id') and hasattr(task.ticket_id, 'ticket_number') else f"Task {task.task_id}"
        
        current_app.send_task(
            'notifications.send_escalation_notification',
            kwargs={
                'from_user_id': from_user_id,
                'to_user_id': selected_role_user.user_id,
                'from_ticket_number': ticket_number,  # Use ticket_number for URL routing
                'to_ticket_number': ticket_number,    # Both users navigate to the same ticket
                'task_title': ticket_number,
                'escalated_from_role': original_role,
                'escalated_to_role': escalate_to_role.name,
                'escalation_reason': reason,
                'escalated_by_id': escalated_by_id,
                'escalated_by_name': escalated_by_name
            },
            queue=inapp_queue
        )
        logger.info(f"📧 Escalation notification queued: ticket {ticket_number} from user {from_user_id} to user {selected_role_user.user_id}")
    except Exception as e:
        logger.error(f"⚠️ Failed to send escalation notification: {e}")
    
    # Update round-robin state for next escalation
    round_robin_state.current_index = (current_index + 1) % len(role_users_list)
    round_robin_state.save()
    
    logger.info(f"🚨 Task {task.task_id} escalated to user {selected_role_user.user_id} in role '{escalate_to_role.name}' (reason: {reason})")
    
    return [task_item]


# Ticket Coordinator role name constant
TICKET_COORDINATOR_ROLE = "Ticket Coordinator"


def assign_ticket_owner(task, hdts_owner_id=None):
    """
    Assign a Ticket Coordinator as the ticket owner for a task.
    
    If hdts_owner_id is provided (from HDTS approval), use that coordinator.
    Otherwise, fall back to round-robin assignment.
    
    The ticket owner is assigned to every task and stays with the task throughout its lifecycle.
    
    Args:
        task: Task instance to assign an owner to
        hdts_owner_id: Optional user ID of coordinator assigned by HDTS during approval
    
    Returns:
        RoleUsers instance if assigned, None otherwise
    """
    try:
        # Get all active users with the Ticket Coordinator role
        role = Roles.objects.filter(name=TICKET_COORDINATOR_ROLE).first()
        
        if not role:
            logger.warning(f"⚠️ Role '{TICKET_COORDINATOR_ROLE}' not found. Ticket owner not assigned.")
            return None
        
        role_users_qs = RoleUsers.objects.filter(
            role_id=role,
            is_active=True
        ).select_related('role_id')
        
        if not role_users_qs.exists():
            logger.warning(f"⚠️ No active users found for role '{TICKET_COORDINATOR_ROLE}'. Ticket owner not assigned.")
            return None
        
        selected_owner = None
        
        # PRIORITY 1: Use HDTS-assigned coordinator if provided
        if hdts_owner_id:
            selected_owner = role_users_qs.filter(user_id=hdts_owner_id).first()
            if selected_owner:
                logger.info(f"👑 Using HDTS-assigned ticket owner: User {hdts_owner_id}")
            else:
                logger.warning(f"⚠️ HDTS-assigned owner {hdts_owner_id} not found in TTS, falling back to round-robin")
        
        # PRIORITY 2: Fall back to round-robin if no HDTS assignment
        if not selected_owner:
            # Get or create round-robin state for Ticket Coordinator
            round_robin_state, _ = RoundRobin.objects.get_or_create(
                role_name=TICKET_COORDINATOR_ROLE,
                defaults={"current_index": 0}
            )
            
            # Convert queryset to list for round-robin indexing
            role_users_list = list(role_users_qs)
            current_index = round_robin_state.current_index
            user_index = current_index % len(role_users_list)
            selected_owner = role_users_list[user_index]
            
            # Update round-robin state for next assignment
            round_robin_state.current_index = (current_index + 1) % len(role_users_list)
            round_robin_state.save()
        
        # Assign the ticket owner to the task
        task.ticket_owner = selected_owner
        task.save(update_fields=['ticket_owner'])
        
        logger.info(f"👑 Ticket owner assigned: User {selected_owner.user_id} ({selected_owner.user_full_name}) for Task {task.task_id}")
        
        # Send notification to ticket owner
        # Note: Ticket owners don't have a TaskItem, so we use a special format: task_<task_id>_owner
        task_title = str(task.ticket_id.ticket_number) if hasattr(task, 'ticket_id') else f"Task {task.task_id}"
        task_item_id = f"task_{task.task_id}_owner"  # Special identifier for ticket owner notifications
        try:
            notify_task.delay(
                user_id=selected_owner.user_id,
                task_item_id=task_item_id,
                task_title=task_title,
                role_name=TICKET_COORDINATOR_ROLE
            )
        except Exception as e:
            logger.warning(f"⚠️ Failed to send ticket owner notification: {e}")
            FailedNotification.objects.create(
                user_id=selected_owner.user_id,
                task_item_id=task_item_id,
                task_title=task_title,
                role_name=TICKET_COORDINATOR_ROLE,
                error_message=str(e),
                status='pending'
            )
            logger.info("✅ Ticket owner notification queued for retry")
        
        return selected_owner
        
    except Exception as e:
        logger.error(f"❌ Failed to assign ticket owner: {e}", exc_info=True)
        return None

