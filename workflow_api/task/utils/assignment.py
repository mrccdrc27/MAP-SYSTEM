"""
Utility functions for user assignment and round-robin logic.
These functions are used across tasks, steps, and transitions.
"""

from django.conf import settings
from django.utils import timezone
from tickets.models import RoundRobin
from task.models import TaskItem
import requests
import logging

logger = logging.getLogger(__name__)


def fetch_users_for_role(role_name):
    """
    Fetch users for a role using the round-robin endpoint from auth service.
    
    Calls the TTS round-robin endpoint which returns user IDs directly.
    Endpoint: /api/v1/tts/round-robin/?role_name={role_name}
    Returns: [user_id1, user_id2, user_id3, ...]
    
    Args:
        role_name: Name of the role to fetch users for
    
    Returns:
        List of user IDs: [3, 6, 7, ...]
        Empty list if no users found or error occurred
    """
    try:
        # Configuration for auth service
        AUTH_SERVICE_URL = getattr(settings, 'AUTH_SERVICE_URL', 'http://localhost:8002')
        
        # Call the round-robin endpoint with role name
        response = requests.get(
            f"{AUTH_SERVICE_URL}/api/v1/tts/round-robin/",
            params={"role_name": role_name},
            timeout=10
        )
        
        if response.status_code == 200:
            user_ids = response.json()  # Returns [3, 6, 7, ...]
            logger.info(f"✅ Found {len(user_ids)} users for role '{role_name}': {user_ids}")
            return user_ids
        else:
            logger.warning(f"❌ Failed to fetch users for role '{role_name}': {response.status_code}")
            return []
            
    except requests.RequestException as e:
        logger.error(f"❌ Network error fetching users for role '{role_name}': {e}")
        return []
    except Exception as e:
        logger.error(f"❌ Unexpected error fetching users for role '{role_name}': {e}")
        return []


def apply_round_robin_assignment(task, user_ids, role_name, authenticated_user_full_name='', max_assignments=1):
    """
    Apply round-robin logic to assign users to a task and create TaskItem records.
    
    Maintains state of which user was last assigned for a role, ensuring
    fair distribution of tasks across users.
    
    Args:
        task: Task instance to assign users to
        user_ids: List of user IDs [3, 6, 7, ...]
        role_name: Name of the role for state tracking
        authenticated_user_full_name: Full name of the authenticated user performing the action
        max_assignments: Maximum number of users to assign (default 1)
    
    Returns:
        List of created TaskItem instances
    """
    if not user_ids:
        logger.warning(f"No user IDs provided for round-robin assignment to role '{role_name}'")
        return []

    # Get or create the round-robin state for this role
    round_robin_state, created = RoundRobin.objects.get_or_create(
        role_name=role_name,
        defaults={"current_index": 0}
    )
    
    if created:
        logger.info(f"🆕 Created new round-robin state for role '{role_name}'")

    # Determine the user to assign
    current_index = round_robin_state.current_index
    user_index = current_index % len(user_ids)
    user_id = user_ids[user_index]

    # Create TaskItem for the assigned user with authenticated user's full name
    task_item, created = TaskItem.objects.get_or_create(
        task=task,
        user_id=user_id,
        defaults={
            'username': '',
            'email': '',
            'name': authenticated_user_full_name,
            'status': 'assigned',
            'assigned_on': timezone.now(),
            'role': role_name
        }
    )
    
    if created:
        logger.info(f"👤 Created TaskItem: User {user_id} assigned to Task {task.task_id} with role '{role_name}' by {authenticated_user_full_name} (round-robin index: {user_index})")
    else:
        logger.info(f"⚠️ TaskItem already exists: User {user_id} for Task {task.task_id}")

    # Update round-robin state for next assignment
    round_robin_state.current_index = (current_index + 1) % len(user_ids)
    round_robin_state.save()
    
    logger.info(f"👤 Assigned user {user_id} from role '{role_name}' (round-robin index: {user_index})")

    return [task_item]


def assign_users_for_step(task, step, role_name, authenticated_user_full_name=''):
    """
    High-level function to fetch users for a role and apply round-robin assignment.
    
    This is a convenience function that combines fetching users and applying
    round-robin logic in a single call.
    
    Args:
        task: Task instance to assign users to
        step: Steps model instance
        role_name: Name of the role to assign users for
        authenticated_user_full_name: Full name of the authenticated user performing the action
    
    Returns:
        List of created TaskItem instances, or empty list if no users found
    
    Example:
        >>> from step.models import Steps
        >>> from task.models import Task
        >>> task = Task.objects.get(task_id=1)
        >>> step = Steps.objects.get(step_id=1)
        >>> assigned_items = assign_users_for_step(task, step, 'Admin', 'John Doe')
        >>> print(assigned_items)
        [<TaskItem: TaskItem 1: User 6 -> Task 1>]
    """
    # Fetch users for the role
    user_ids = fetch_users_for_role(role_name)
    
    if not user_ids:
        logger.warning(f"⚠️ No users found for role '{role_name}' at step {step.step_id}")
        return []
    
    # Apply round-robin assignment and create TaskItem records with authenticated user's full name
    assigned_items = apply_round_robin_assignment(task, user_ids, role_name, authenticated_user_full_name)
    
    return assigned_items
