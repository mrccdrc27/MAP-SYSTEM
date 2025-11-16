from celery import shared_task
from role.models import Roles, RoleUsers
import logging
from datetime import datetime
from django.utils.timezone import make_aware

logger = logging.getLogger(__name__)


@shared_task(name='role.tasks.recieve_role')  # 👈 match this name!
def recieve_role(role_data):
    try:
        Roles.objects.create(**role_data)
        return {"status": "success", "role_id": role_data.get("role_id")}
    
    except Exception as e:
        return {"status": "error", "error": str(e)}


@shared_task(name='role.tasks.sync_role')
def sync_role(role_data):
    """
    Consumer task for syncing roles from the TTS auth service.
    Handles create, update, and delete actions for roles.
    
    Args:
        role_data (dict): The role data from the auth service
            Expected format:
            {
                "role_id": int,
                "name": str,
                "system": str (e.g., "tts"),
                "description": str,
                "is_custom": bool,
                "created_at": str (ISO format),
                "action": str ("create", "update", or "delete")
            }
    
    Returns:
        dict: Status of the sync operation
    """
    try:
        role_id = role_data.get('role_id')
        action = role_data.get('action', 'create')
        
        if action == 'delete':
            # Delete the role
            deleted_count, _ = Roles.objects.filter(role_id=role_id).delete()
            if deleted_count > 0:
                logger.info(f"Role {role_id} deleted successfully")
                return {"status": "success", "role_id": role_id, "action": "delete"}
            else:
                logger.warning(f"Role {role_id} not found for deletion")
                return {"status": "success", "role_id": role_id, "action": "delete", "note": "not_found"}
        
        elif action == 'update':
            # Update the role
            role, created = Roles.objects.update_or_create(
                role_id=role_id,
                defaults={
                    'name': role_data.get('name'),
                }
            )
            logger.info(f"Role {role_id} updated successfully")
            return {"status": "success", "role_id": role_id, "action": "update"}
        
        else:  # create
            # Create or update the role
            role, created = Roles.objects.update_or_create(
                role_id=role_id,
                defaults={
                    'name': role_data.get('name'),
                }
            )
            action_str = "created" if created else "updated"
            logger.info(f"Role {role_id} {action_str} successfully")
            return {"status": "success", "role_id": role_id, "action": "create"}
    
    except Exception as e:
        logger.error(f"Error syncing role {role_data.get('role_id')}: {str(e)}")
        return {"status": "error", "error": str(e)}


@shared_task(name='role.tasks.sync_user_system_role')
def sync_user_system_role(user_system_role_data):
    """
    Consumer task for syncing user_system_roles from the TTS auth service.
    Handles create, update, and delete actions for user role assignments.
    Supports total sync capability.
    
    Args:
        user_system_role_data (dict): The full UserSystemRole object data
            Expected format:
            {
                "user_system_role_id": int,
                "user_id": int,
                "user_email": str,
                "system": str (e.g., "tts"),
                "role_id": int,
                "role_name": str,
                "assigned_at": str (ISO format),
                "is_active": bool,
                "settings": dict,
                "action": str ("create", "update", or "delete")
            }
    
    Returns:
        dict: Status of the sync operation
    """
    try:
        user_system_role_id = user_system_role_data.get('user_system_role_id')
        user_id = user_system_role_data.get('user_id')
        role_id = user_system_role_data.get('role_id')
        is_active = user_system_role_data.get('is_active', True)
        action = user_system_role_data.get('action', 'create')
        
        logger.info(f"===== SYNC USER_SYSTEM_ROLE START =====")
        logger.info(f"Processing UserSystemRole sync: ID={user_system_role_id}, user_id={user_id}, role_id={role_id}, is_active={is_active}, action={action}")
        logger.info(f"Full data received: {user_system_role_data}")
        
        # Verify role exists
        try:
            role = Roles.objects.get(role_id=role_id)
            logger.info(f"✓ Role {role_id} found: {role.name}")
        except Roles.DoesNotExist:
            logger.error(f"✗ Role {role_id} not found in RoleUsers database, cannot sync UserSystemRole")
            logger.error(f"Available roles: {list(Roles.objects.values_list('role_id', 'name'))}")
            return {"status": "error", "error": f"Role {role_id} not found"}
        
        # List all RoleUsers records BEFORE any operation for debugging
        logger.info(f"All RoleUsers records in database: {[(ru.role_id.role_id, ru.user_id, ru.is_active) for ru in RoleUsers.objects.all()]}")
        
        if action == 'delete':
            # Delete the user_system_role
            deleted_count, _ = RoleUsers.objects.filter(
                role_id=role,
                user_id=user_id
            ).delete()
            if deleted_count > 0:
                logger.info(f"UserSystemRole {user_system_role_id} deleted successfully")
                return {"status": "success", "user_system_role_id": user_system_role_id, "action": "delete"}
            else:
                logger.warning(f"UserSystemRole {user_system_role_id} not found for deletion")
                return {"status": "success", "user_system_role_id": user_system_role_id, "action": "delete", "note": "not_found"}
        
        elif action == 'update':
            # Update the user_system_role
            logger.info(f"Attempting to update RoleUsers with role_id={role.role_id}, user_id={user_id}, is_active={is_active}")
            
            # Check if the record exists BEFORE update
            existing_count = RoleUsers.objects.filter(role_id=role, user_id=user_id).count()
            logger.info(f"Existing RoleUsers records matching (role_id={role.role_id}, user_id={user_id}): {existing_count}")
            
            if existing_count > 0:
                existing = RoleUsers.objects.get(role_id=role, user_id=user_id)
                logger.info(f"Found existing record - Current is_active: {existing.is_active}, updating to: {is_active}")
            
            role_user, created = RoleUsers.objects.update_or_create(
                role_id=role,
                user_id=user_id,
                defaults={
                    'is_active': is_active,
                    'settings': user_system_role_data.get('settings', {}),
                }
            )
            logger.info(f"UserSystemRole {user_system_role_id} updated: is_active={role_user.is_active}, created={created}")
            
            # Verify the update actually happened
            verify = RoleUsers.objects.get(role_id=role, user_id=user_id)
            logger.info(f"Verification after update: is_active={verify.is_active}")
            
            # Double check: list all RoleUsers for this role
            all_for_role = RoleUsers.objects.filter(role_id=role)
            logger.info(f"All RoleUsers for role {role.role_id}: {[(ru.user_id, ru.is_active) for ru in all_for_role]}")
            
            # List all RoleUsers records in database AFTER the update
            logger.info(f"All RoleUsers records after update: {[(ru.role_id.role_id, ru.user_id, ru.is_active) for ru in RoleUsers.objects.all()]}")
            logger.info(f"===== SYNC USER_SYSTEM_ROLE END (UPDATE) =====")
            
            return {"status": "success", "user_system_role_id": user_system_role_id, "action": "update"}
        
        else:  # create
            # Create or update the user_system_role
            logger.info(f"Attempting to create/update RoleUsers with role_id={role.role_id}, user_id={user_id}, is_active={is_active}")
            role_user, created = RoleUsers.objects.update_or_create(
                role_id=role,
                user_id=user_id,
                defaults={
                    'is_active': is_active,
                    'settings': user_system_role_data.get('settings', {}),
                }
            )
            action_str = "created" if created else "updated"
            logger.info(f"UserSystemRole {user_system_role_id} {action_str}: is_active={role_user.is_active}")
            
            # Verify the creation/update actually happened
            verify = RoleUsers.objects.get(role_id=role, user_id=user_id)
            logger.info(f"Verification after create/update: is_active={verify.is_active}")
            
            return {"status": "success", "user_system_role_id": user_system_role_id, "action": "create"}
    
    except Exception as e:
        logger.error(f"Error syncing user_system_role: {str(e)}", exc_info=True)
        return {"status": "error", "error": str(e)}