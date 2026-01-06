"""
Celery tasks for syncing roles and user_system_roles to other services.
These tasks send newly created/updated/deleted roles and user_system_roles 
that are attached to the TTS system via the message broker.
"""

from celery import shared_task
import logging

logger = logging.getLogger(__name__)


@shared_task(name='tts.tasks.sync_role_to_workflow_api')
def sync_role_to_workflow_api(role_id, action='create'):
    """
    Sync a role to workflow_api via the message broker.
    
    Args:
        role_id (int): The ID of the role to sync
        action (str): The action type - 'create', 'update', or 'delete'
    
    Returns:
        dict: Status of the sync operation
    """
    from roles.models import Role
    from django.core.serializers.json import DjangoJSONEncoder
    from celery import current_app
    import json
    
    try:
        # Get the role from database
        role = Role.objects.get(id=role_id)
        
        # Only sync roles attached to TTS system
        if role.system.slug != 'tts':
            logger.info(f"Role {role_id} is not attached to TTS system, skipping sync")
            return {"status": "skipped", "reason": "not_tts_system"}
        
        # Prepare the role data
        role_data = {
            "role_id": role.id,
            "name": role.name,
            "system": role.system.slug,
            "description": role.description,
            "is_custom": role.is_custom,
            "created_at": role.created_at.isoformat(),
            "action": action,  # Include action for the consumer to handle
        }
        
        # Send message to workflow_api via Celery task
        # This will be picked up by the workflow_api consumer
        current_app.send_task(
            'role.tasks.sync_role',
            args=[role_data],
            queue='tts.role.sync',
            routing_key='tts.role.sync',
        )
        
        logger.info(f"Role {role_id} synced to workflow_api with action: {action}")
        return {
            "status": "success",
            "role_id": role_id,
            "action": action,
        }
    
    except Role.DoesNotExist:
        logger.error(f"Role {role_id} not found")
        return {"status": "error", "error": "Role not found"}
    except Exception as e:
        logger.error(f"Error syncing role {role_id}: {str(e)}")
        return {"status": "error", "error": str(e)}


@shared_task(name='tts.tasks.sync_user_system_role_to_workflow_api')
def sync_user_system_role_to_workflow_api(user_system_role_id, action='create'):
    """
    Sync a UserSystemRole object to workflow_api via the message broker.
    Supports create, update, and delete actions for total sync.
    
    Args:
        user_system_role_id (int): The ID of the UserSystemRole to sync
        action (str): The action type - 'create', 'update', or 'delete'
    
    Returns:
        dict: Status of the sync operation
    """
    from system_roles.models import UserSystemRole
    from celery import current_app
    import json
    
    try:
        # For delete action, we may not have the object anymore
        # So we'll need to handle this differently in the signals
        # For now, assume we're getting the object
        user_system_role = UserSystemRole.objects.get(id=user_system_role_id)
        
        # Only sync if the role's system is TTS
        if user_system_role.role.system.slug != 'tts':
            logger.info(f"UserSystemRole {user_system_role_id} is not for TTS system, skipping sync")
            return {"status": "skipped", "reason": "not_tts_system"}
        
        # Prepare the full user_system_role data
        user_full_name = user_system_role.user.get_full_name()
        logger.info(f"DEBUG: User {user_system_role.user.id} - first_name='{user_system_role.user.first_name}', last_name='{user_system_role.user.last_name}', get_full_name()='{user_full_name}'")
        
        user_system_role_data = {
            "user_system_role_id": user_system_role.id,
            "user_id": user_system_role.user.id,
            "user_email": user_system_role.user.email,
            "user_full_name": user_full_name,
            "system": user_system_role.system.slug,
            "role_id": user_system_role.role.id,
            "role_name": user_system_role.role.name,
            "assigned_at": user_system_role.assigned_at.isoformat(),
            "is_active": user_system_role.is_active,
            "settings": user_system_role.settings,
            "action": action,  # Include action for the consumer to handle
        }
        
        logger.info(f"Syncing UserSystemRole data: {user_system_role_data}")
        current_app.send_task(
            'role.tasks.sync_user_system_role',
            args=[user_system_role_data],
            queue='tts.user_system_role.sync',
            routing_key='tts.user_system_role.sync',
        )
        
        logger.info(f"UserSystemRole {user_system_role_id} synced to workflow_api with action: {action}")
        return {
            "status": "success",
            "user_system_role_id": user_system_role_id,
            "action": action,
        }
    
    except UserSystemRole.DoesNotExist:
        logger.error(f"UserSystemRole {user_system_role_id} not found")
        return {"status": "error", "error": "UserSystemRole not found"}
    except Exception as e:
        logger.error(f"Error syncing UserSystemRole {user_system_role_id}: {str(e)}")
        return {"status": "error", "error": str(e)}


@shared_task(name='tts.tasks.sync_user_system_role_delete')
def sync_user_system_role_delete(user_system_role_data):
    """
    Sync deletion of a UserSystemRole object to workflow_api.
    Used when the object is being deleted and we need to send the data before deletion.
    
    Args:
        user_system_role_data (dict): The UserSystemRole data before deletion
    
    Returns:
        dict: Status of the sync operation
    """
    from celery import current_app
    import json
    
    try:
        # Add action for deletion
        user_system_role_data['action'] = 'delete'
        
        # Send message to workflow_api via Celery task
        current_app.send_task(
            'role.tasks.sync_user_system_role',
            args=[user_system_role_data],
            queue='tts.user_system_role.sync',
            routing_key='tts.user_system_role.sync',
        )
        
        logger.info(f"UserSystemRole deletion synced to workflow_api")
        return {
            "status": "success",
            "action": "delete",
        }
    
    except Exception as e:
        logger.error(f"Error syncing UserSystemRole deletion: {str(e)}")
        return {"status": "error", "error": str(e)}


def trigger_workflow_seeding():
    """
    Trigger the seed_workflows2 command in workflow_api via Celery message broker.
    This is called after successful TTS seeding (roles and users creation).
    This is NOT a Celery task - it directly sends a message to workflow_api.
    """
    from celery import current_app
    
    try:
        # Send task to workflow_api to seed workflows
        current_app.send_task(
            'workflow.seed_workflows',
            queue='workflow_seed_queue',
            routing_key='workflow.seed',
        )
        
        logger.info("[OK] Triggered workflow seeding via Celery")
        return {
            "status": "success",
            "message": "Workflow seeding triggered in workflow_api",
        }
    
    except Exception as e:
        logger.error(f"[ERROR] Error triggering workflow seeding: {str(e)}")
        return {"status": "error", "error": str(e)}
