"""
Utility functions for user assignment and round-robin logic.
These functions are used across tasks, steps, and transitions.
"""

from django.conf import settings
from django.utils import timezone
from tickets.models import RoundRobin, WorkflowTicket
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


def apply_round_robin_assignment(user_ids, role_name, max_assignments=1):
    """
    Apply round-robin logic to assign users to a task using persistent storage.
    
    Maintains state of which user was last assigned for a role, ensuring
    fair distribution of tasks across users.
    
    Args:
        user_ids: List of user IDs [3, 6, 7, ...]
        role_name: Name of the role for state tracking
        max_assignments: Maximum number of users to assign (default 1)
    
    Returns:
        List of user assignment objects with status, role, and assignment time:
        [
            {
                "userID": 3,
                "status": "assigned",
                "assigned_on": "2025-11-09T20:14:18.865143+00:00",
                "role": "Admin"
            }
        ]
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

    assigned_user = {
        "userID": user_id,
        "username": "",  # Will be fetched from auth service if needed
        "email": "",     # Will be fetched from auth service if needed
        "status": "assigned",
        "assigned_on": timezone.now().isoformat(),
        "role": role_name
    }

    # Update round-robin state for next assignment
    round_robin_state.current_index = (current_index + 1) % len(user_ids)
    round_robin_state.save()
    
    logger.info(f"👤 Assigned user {user_id} from role '{role_name}' (round-robin index: {user_index})")

    return [assigned_user]


def assign_users_for_step(step, role_name):
    """
    High-level function to fetch users for a role and apply round-robin assignment.
    
    This is a convenience function that combines fetching users and applying
    round-robin logic in a single call.
    
    Args:
        step: Steps model instance
        role_name: Name of the role to assign users for
    
    Returns:
        List of assigned user objects, or empty list if no users found
    
    Example:
        >>> from step.models import Steps
        >>> step = Steps.objects.get(step_id=1)
        >>> assigned_users = assign_users_for_step(step, 'Admin')
        >>> print(assigned_users)
        [{'userID': 6, 'status': 'assigned', 'assigned_on': '...', 'role': 'Admin'}]
    """
    # Fetch users for the role
    user_ids = fetch_users_for_role(role_name)
    
    if not user_ids:
        logger.warning(f"⚠️ No users found for role '{role_name}' at step {step.step_id}")
        return []
    
    # Apply round-robin assignment
    assigned_users = apply_round_robin_assignment(user_ids, role_name)
    
    return assigned_users
