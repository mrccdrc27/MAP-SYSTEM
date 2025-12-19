"""
Celery tasks for syncing simplified HDTS user information to backend services.
Sends combined user + role data in a single sync operation via the message broker.
"""

from celery import shared_task
import logging

logger = logging.getLogger(__name__)


@shared_task(name='hdts.tasks.sync_hdts_user')
def sync_hdts_user(user_data):
    """
    Sync combined user + role information to HDTS subscribers via the message broker.
    Handles create, update, and delete actions for total sync.
    
    The user_data includes both user profile and their role in a single object,
    eliminating the need for separate role syncs.
    
    Args:
        user_data (dict): The combined user + role data to sync including action type
    
    Returns:
        dict: Status of the sync operation
    """
    from celery import current_app
    
    try:
        action = user_data.get('action', 'update')
        user_id = user_data.get('user_id')
        
        # For delete action, we have the full data in user_data
        # For create/update, verify user exists (except for deletes)
        if action != 'delete':
            from users.models import User
            try:
                user = User.objects.get(id=user_id)
            except User.DoesNotExist:
                logger.error(f"User {user_id} not found for {action} action")
                return {"status": "error", "error": "User not found"}
        
        logger.info(f"Syncing HDTS user {user_id} ({user_data.get('email')}) with role '{user_data.get('role')}' to subscribers with action: {action}")
        logger.debug(f"User data: {user_data}")
        
        # Send message to HDTS subscribers via Celery task
        # This will be picked up by any service listening to hdts.user.sync queue
        current_app.send_task(
            'hdts.consumer.process_hdts_user_sync',
            args=[user_data],
            queue='hdts.user.sync',
            routing_key='hdts.user.sync',
        )
        
        logger.info(f"HDTS user {user_id} sync message sent to subscribers with action: {action}")
        return {
            "status": "success",
            "user_id": user_id,
            "action": action,
        }
    
    except Exception as e:
        logger.error(f"Error syncing HDTS user: {str(e)}")
        return {"status": "error", "error": str(e)}


@shared_task(name='hdts.tasks.sync_hdts_employee')
def sync_hdts_employee(employee_data):
    """
    Sync employee information to backend external employees table via message broker.
    Handles create, update, and delete actions for employee synchronization.
    
    Args:
        employee_data (dict): The employee data to sync including action type
    
    Returns:
        dict: Status of the sync operation
    """
    from celery import current_app
    
    try:
        action = employee_data.get('action', 'update')
        employee_id = employee_data.get('employee_id')
        
        # For delete action, we have the full data in employee_data
        # For create/update, verify employee exists (except for deletes)
        if action != 'delete':
            from hdts.models import Employees
            try:
                employee = Employees.objects.get(id=employee_id)
            except Employees.DoesNotExist:
                logger.error(f"Employee {employee_id} not found for {action} action")
                return {"status": "error", "error": "Employee not found"}
        
        logger.info(f"Syncing HDTS employee {employee_id} ({employee_data.get('email')}) to backend external employees with action: {action}")
        logger.debug(f"Employee data: {employee_data}")
        
        # Send message to backend via separate employee sync queue
        # This will be picked up by backend service listening to hdts.employee.sync queue
        current_app.send_task(
            'core.tasks.process_hdts_employee_sync',
            args=[employee_data],
            queue='hdts.employee.sync',
            routing_key='hdts.employee.sync',
        )
        
        logger.info(f"HDTS employee {employee_id} sync message sent to backend with action: {action}")
        return {
            "status": "success",
            "employee_id": employee_id,
            "action": action,
        }
    
    except Exception as e:
        logger.error(f"Error syncing HDTS employee: {str(e)}")
        return {"status": "error", "error": str(e)}


# ==================== HDTS to TTS Sync Tasks ====================

# HDTS roles that should also sync to TTS/workflow_api
# Ticket Coordinator needs to exist in both HDTS and TTS for workflow management
HDTS_ROLES_TO_SYNC_TO_TTS = ['Ticket Coordinator']


@shared_task(name='hdts.tasks.sync_hdts_role_to_tts')
def sync_hdts_role_to_tts(role_data):
    """
    Sync an HDTS role (like Ticket Coordinator) to workflow_api.
    Only forwards the role data to workflow_api - does NOT create TTS roles in auth database.
    
    Args:
        role_data (dict): The role data to sync
            Expected format:
            {
                "role_id": int,
                "name": str,
                "description": str,
                "action": str ("create", "update", or "delete")
            }
    
    Returns:
        dict: Status of the sync operation
    """
    from celery import current_app
    
    try:
        action = role_data.get('action', 'create')
        role_name = role_data.get('name')
        
        # Only sync roles that are in the list
        if role_name not in HDTS_ROLES_TO_SYNC_TO_TTS:
            logger.info(f"HDTS role '{role_name}' not in sync list, skipping workflow_api sync")
            return {"status": "skipped", "reason": "not_in_sync_list"}
        
        logger.info(f"Forwarding HDTS role '{role_name}' to workflow_api with action: {action}")
        
        # Prepare role data for workflow_api
        # Note: workflow_api will handle role creation in its own database
        workflow_role_data = {
            "role_id": role_data.get('role_id'),
            "name": role_name,
            "system": "hdts",  # Keep as hdts - workflow_api knows this is an HDTS role
            "description": role_data.get('description', ''),
            "is_custom": False,
            "created_at": role_data.get('created_at'),
            "action": action,
            "source_system": "hdts",
        }
        
        # Send to workflow_api
        try:
            current_app.send_task(
                'role.tasks.sync_role',
                args=[workflow_role_data],
                queue='tts.role.sync',
                routing_key='tts.role.sync',
                retry=False,
                time_limit=10,
            )
            logger.info(f"HDTS role '{role_name}' forwarded to workflow_api")
        except Exception as celery_error:
            logger.warning(f"Celery task send failed for HDTS->workflow_api role sync: {str(celery_error)}")
            return {"status": "error", "error": str(celery_error)}
        
        return {
            "status": "success",
            "role_name": role_name,
            "action": action,
        }
    
    except Exception as e:
        logger.error(f"Error forwarding HDTS role to workflow_api: {str(e)}")
        return {"status": "error", "error": str(e)}


@shared_task(name='hdts.tasks.sync_hdts_user_to_tts')
def sync_hdts_user_to_tts(user_role_data):
    """
    Sync an HDTS user with Ticket Coordinator role to workflow_api.
    Only forwards the user data to workflow_api - does NOT create TTS UserSystemRole in auth database.
    
    Args:
        user_role_data (dict): The user and role data to sync
            Expected format:
            {
                "user_id": int,
                "user_email": str,
                "user_full_name": str,
                "role_name": str,
                "role_id": int,
                "user_system_role_id": int,
                "action": str ("create", "update", or "delete")
            }
    
    Returns:
        dict: Status of the sync operation
    """
    from celery import current_app
    
    try:
        action = user_role_data.get('action', 'create')
        user_id = user_role_data.get('user_id')
        role_name = user_role_data.get('role_name')
        
        # Only sync roles that are in the list
        if role_name not in HDTS_ROLES_TO_SYNC_TO_TTS:
            logger.info(f"HDTS role '{role_name}' not in sync list, skipping workflow_api user sync")
            return {"status": "skipped", "reason": "not_in_sync_list"}
        
        logger.info(f"Forwarding HDTS user {user_id} with role '{role_name}' to workflow_api with action: {action}")
        
        # Prepare user_system_role data for workflow_api
        # Note: workflow_api will handle user/role assignment in its own database
        workflow_user_data = {
            "user_system_role_id": user_role_data.get('user_system_role_id'),
            "user_id": user_id,
            "user_email": user_role_data.get('user_email'),
            "user_full_name": user_role_data.get('user_full_name'),
            "system": "hdts",  # Keep as hdts - workflow_api knows this is an HDTS user
            "role_id": user_role_data.get('role_id'),
            "role_name": role_name,
            "assigned_at": user_role_data.get('assigned_at'),
            "is_active": True,
            "settings": {},
            "action": action,
            "source_system": "hdts",
        }
        
        # Send to workflow_api
        try:
            current_app.send_task(
                'role.tasks.sync_user_system_role',
                args=[workflow_user_data],
                queue='tts.user_system_role.sync',
                routing_key='tts.user_system_role.sync',
                retry=False,
                time_limit=10,
            )
            logger.info(f"HDTS user {user_id} with role '{role_name}' forwarded to workflow_api")
        except Exception as celery_error:
            logger.warning(f"Celery task send failed for HDTS->workflow_api user sync: {str(celery_error)}")
            return {"status": "error", "error": str(celery_error)}
        
        return {
            "status": "success",
            "user_id": user_id,
            "role_name": role_name,
            "action": action,
        }
    
    except Exception as e:
        logger.error(f"Error forwarding HDTS user to workflow_api: {str(e)}")
        return {"status": "error", "error": str(e)}

