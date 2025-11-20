"""
Utility functions for user assignment and round-robin logic.
These functions are used across tasks, steps, and transitions.
"""

from django.utils import timezone
from tickets.models import RoundRobin
from task.models import TaskItem, TaskItemHistory
from task.utils.target_resolution import calculate_target_resolution
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
        logger.info(f"✅ Found {len(user_ids)} users for role '{role_name}'")
        return user_ids
    except Roles.DoesNotExist:
        logger.warning(f"❌ Role '{role_name}' not found")
        return []
    except Exception as e:
        logger.error(f"❌ Error fetching users: {e}")
        return []


def apply_round_robin_assignment(task, user_ids, role_name):
    """
    Apply round-robin logic to assign users to tasks.
    
    Args:
        task: Task instance
        user_ids: List of user IDs to assign
        role_name: Role name for tracking
    
    Returns:
        List of created TaskItem instances
    """
    if not user_ids:
        logger.warning(f"No users for role '{role_name}'")
        return []

    round_robin_state, _ = RoundRobin.objects.get_or_create(
        role_name=role_name,
        defaults={"current_index": 0}
    )

    current_index = round_robin_state.current_index
    user_index = current_index % len(user_ids)
    user_id = user_ids[user_index]

    # Calculate target resolution
    target_resolution = None
    try:
        if task.ticket_id and task.current_step and task.workflow_id:
            target_resolution = calculate_target_resolution(
                ticket=task.ticket_id,
                step=task.current_step,
                workflow=task.workflow_id
            )
    except Exception as e:
        logger.error(f"Failed to calculate target resolution: {e}")

    # Get RoleUsers record for this user and role
    try:
        role_users = RoleUsers.objects.select_related('role_id').get(
            user_id=user_id,
            role_id__name=role_name,
            is_active=True
        )
    except RoleUsers.DoesNotExist:
        logger.error(f"❌ RoleUsers record not found for user {user_id} and role '{role_name}'")
        return []

    # Create TaskItem for the assigned user
    task_item, created = TaskItem.objects.get_or_create(
        task=task,
        role_user=role_users,
        defaults={
            'origin': 'System',
            'target_resolution': target_resolution,
            'assigned_on_step': task.current_step
        }
    )
    
    if created:
        # Create initial history record with 'new' status
        TaskItemHistory.objects.create(
            task_item=task_item,
            status='new'
        )
        logger.info(f"👤 Created TaskItem: User {user_id} assigned to Task {task.task_id}")
        # Send assignment notification via Celery
        notify_task.delay(
            user_id=user_id,
            task_id=str(task.task_id),
            task_title=str(task.ticket_id.subject) if hasattr(task, 'ticket_id') else f"Task {task.task_id}",
            role_name=role_name
        )
    else:
        logger.info(f"⚠️ TaskItem already exists: User {user_id} for Task {task.task_id}")

    # Update round-robin state for next assignment
    round_robin_state.current_index = (current_index + 1) % len(user_ids)
    round_robin_state.save()
    
    logger.info(f"👤 Assigned user {user_id} from role '{role_name}' (round-robin index: {user_index})")

    return [task_item]


def assign_users_for_step(task, step, role_name):
    """
    Fetch users for a role and apply round-robin assignment.
    
    Args:
        task: Task instance
        step: Steps instance
        role_name: Role name
    
    Returns:
        List of TaskItem instances
    """
    user_ids = fetch_users_for_role(role_name)
    if not user_ids:
        logger.warning(f"No users for role '{role_name}'")
        return []
    return apply_round_robin_assignment(task, user_ids, role_name)


def assign_users_for_escalation(task, escalate_to_role, reason):
    """
    Assign users for escalation to a higher-priority role.
    Uses round-robin to distribute escalated tasks fairly.
    
    Args:
        task: Task instance
        escalate_to_role: Roles instance (the escalated role)
        reason: String reason for escalation
    
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
    # Send escalation notification via Celery
    try:
        notify_task.delay(
            user_id=selected_role_user.user_id,
            task_id=str(task.task_id),
            task_title=str(task.ticket_id.ticket_number) if hasattr(task, 'ticket_id') else f"Task {task.task_id}",
            role_name=escalate_to_role.name
        )
    except Exception as e:
        logger.error(f"⚠️ Failed to send escalation notification: {e}")
    
    # Update round-robin state for next escalation
    round_robin_state.current_index = (current_index + 1) % len(role_users_list)
    round_robin_state.save()
    
    logger.info(f"🚨 Task {task.task_id} escalated to user {selected_role_user.user_id} in role '{escalate_to_role.name}' (reason: {reason})")
    
    return [task_item]

