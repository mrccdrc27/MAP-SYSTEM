"""
Django signals for the HDTS app to trigger user syncing (combined with roles).
Listens to post_save and post_delete signals and sends combined user+role data
to the message broker in a single sync task.

Also syncs HDTS Ticket Coordinator role and users to TTS (workflow_api) for
cross-system role synchronization.
"""

from django.db.models.signals import post_save, post_delete
from django.dispatch import receiver
import logging
from threading import Thread

logger = logging.getLogger(__name__)

# HDTS roles that should also sync to TTS/workflow_api
# Ticket Coordinator needs to exist in both HDTS and TTS for workflow management
HDTS_ROLES_TO_SYNC_TO_TTS = ['Ticket Coordinator']


def _get_hdts_user_role(user):
    """
    Helper function to get the role name for an HDTS user.
    Returns the role name if the user has a role in HDTS system, None otherwise.
    """
    try:
        from system_roles.models import UserSystemRole
        user_role = UserSystemRole.objects.filter(
            user=user,
            system__slug='hdts'
        ).select_related('role').first()
        return user_role.role.name if user_role else None
    except Exception as e:
        logger.warning(f"Error getting HDTS role for user {user.id}: {str(e)}")
        return None


def _prepare_hdts_user_data(user, action='update'):
    """
    Helper function to prepare combined user + role data for HDTS sync.
    Combines user profile information with their HDTS role in a single object.
    """
    role = _get_hdts_user_role(user)
    
    return {
        "user_id": user.id,
        "email": user.email,
        "username": user.username,
        "first_name": user.first_name,
        "last_name": user.last_name,
        "middle_name": getattr(user, 'middle_name', ''),
        "suffix": getattr(user, 'suffix', ''),
        "company_id": user.company_id,
        "department": user.department,
        "role": role,
        "status": user.status,
        "notified": getattr(user, 'notified', False),
        "profile_picture": user.profile_picture.url if user.profile_picture else None,
        "action": action,
    }


def _should_sync_to_tts(role_name):
    """
    Check if an HDTS role should also be synced to TTS.
    Returns True for roles like 'Ticket Coordinator' that need cross-system sync.
    """
    return role_name in HDTS_ROLES_TO_SYNC_TO_TTS





def _prepare_hdts_user_for_workflow(user, hdts_role, hdts_user_system_role, action='update'):
    """
    Prepare HDTS user data for syncing to workflow_api.
    Sends HDTS role information - workflow_api handles its own storage.
    """
    return {
        "user_system_role_id": hdts_user_system_role.id if hdts_user_system_role else None,
        "user_id": user.id,
        "user_email": user.email,
        "user_full_name": user.get_full_name(),
        "department": user.department or '',
        "system": "hdts",  # Keep as hdts - workflow_api knows this is an HDTS user
        "role_id": hdts_role.id,
        "role_name": hdts_role.name,
        "assigned_at": hdts_user_system_role.assigned_at.isoformat() if hdts_user_system_role and hasattr(hdts_user_system_role, 'assigned_at') and hdts_user_system_role.assigned_at else None,
        "is_active": hdts_user_system_role.is_active if hdts_user_system_role else True,
        "settings": hdts_user_system_role.settings if hdts_user_system_role else {},
        "action": action,
        "source_system": "hdts",
    }


def _sync_hdts_role_to_workflow(hdts_role, action='create'):
    """
    Sync an HDTS role to workflow_api if it's in the list of roles to sync.
    Only forwards HDTS role data - does NOT create TTS roles.
    """
    if not _should_sync_to_tts(hdts_role.name):
        return
    
    from celery import current_app
    
    try:
        # Prepare HDTS role data for workflow_api
        role_data = {
            "role_id": hdts_role.id,
            "name": hdts_role.name,
            "system": "hdts",  # Keep as hdts - workflow_api handles its own storage
            "description": hdts_role.description or '',
            "is_custom": hdts_role.is_custom,
            "created_at": hdts_role.created_at.isoformat() if hdts_role.created_at else None,
            "action": action,
            "source_system": "hdts",
        }
        
        # Send to workflow_api via role sync queue
        try:
            current_app.send_task(
                'role.tasks.sync_role',
                args=[role_data],
                queue='tts.role.sync',
                routing_key='tts.role.sync',
                retry=False,
                time_limit=10,
            )
            logger.info(f"HDTS role '{hdts_role.name}' forwarded to workflow_api with action: {action}")
        except Exception as celery_error:
            logger.warning(f"Celery task send failed for HDTS->workflow_api role sync (non-blocking): {str(celery_error)}")
    except Exception as e:
        logger.error(f"Error forwarding HDTS role to workflow_api: {str(e)}")


def _sync_hdts_user_to_workflow(user, hdts_role, hdts_user_system_role, action='create'):
    """
    Sync an HDTS user with a specific role to workflow_api.
    Only forwards HDTS user data - does NOT create TTS UserSystemRole.
    """
    if not _should_sync_to_tts(hdts_role.name):
        return
    
    from celery import current_app
    
    try:
        # Prepare HDTS user data for workflow_api
        user_data = _prepare_hdts_user_for_workflow(user, hdts_role, hdts_user_system_role, action)
        
        # Send to workflow_api via user_system_role sync queue
        try:
            current_app.send_task(
                'role.tasks.sync_user_system_role',
                args=[user_data],
                queue='tts.user_system_role.sync',
                routing_key='tts.user_system_role.sync',
                retry=False,
                time_limit=10,
            )
            logger.info(f"HDTS user {user.email} with role '{hdts_role.name}' forwarded to workflow_api with action: {action}")
        except Exception as celery_error:
            logger.warning(f"Celery task send failed for HDTS->workflow_api user sync (non-blocking): {str(celery_error)}")
    except Exception as e:
        logger.error(f"Error forwarding HDTS user to workflow_api: {str(e)}")


def _prepare_hdts_employee_data(employee, action='update'):
    """
    Helper function to prepare employee data for HDTS sync.
    Sends employee data as-is with role set to 'employee'.
    """
    return {
        "employee_id": employee.id,
        "user_id": employee.user.id if employee.user else None,
        "email": employee.email,
        "username": employee.username,
        "first_name": employee.first_name,
        "last_name": employee.last_name,
        "middle_name": employee.middle_name or '',
        "suffix": employee.suffix or '',
        "phone_number": employee.phone_number,
        "company_id": employee.company_id,
        "department": employee.department,
        "status": employee.status,
        "notified": employee.notified,
        "profile_picture": employee.profile_picture.url if employee.profile_picture else None,
        "role": "employee",
        "action": action,
    }


# ==================== HDTS Role Signals for TTS Sync ====================

@receiver(post_save, sender='roles.Role')
def hdts_role_post_save(sender, instance, created, **kwargs):
    """
    Signal handler for when an HDTS Role is created or updated.
    If the role is 'Ticket Coordinator', also sync it to TTS.
    Runs in background thread to prevent blocking.
    """
    def send_sync_task():
        try:
            # Only process HDTS roles
            if instance.system.slug == 'hdts' and _should_sync_to_tts(instance.name):
                action = 'create' if created else 'update'
                logger.info(f"HDTS Role {instance.id} ({instance.name}) {action}d, forwarding to workflow_api")
                _sync_hdts_role_to_workflow(instance, action)
        except Exception as e:
            logger.error(f"Error in hdts_role_post_save signal: {str(e)}")
    
    # Send in background thread to prevent blocking the response
    thread = Thread(target=send_sync_task, daemon=False)
    thread.start()


@receiver(post_delete, sender='roles.Role')
def hdts_role_post_delete(sender, instance, **kwargs):
    """
    Signal handler for when an HDTS Role is deleted.
    If the role is 'Ticket Coordinator', also sync deletion to TTS.
    """
    def send_sync_task():
        try:
            # Only process HDTS roles
            if instance.system.slug == 'hdts' and _should_sync_to_tts(instance.name):
                logger.info(f"HDTS Role {instance.id} ({instance.name}) deleted, forwarding to workflow_api")
                _sync_hdts_role_to_workflow(instance, 'delete')
        except Exception as e:
            logger.error(f"Error in hdts_role_post_delete signal: {str(e)}")
    
    # Send in background thread to prevent blocking the response
    thread = Thread(target=send_sync_task, daemon=False)
    thread.start()


# ==================== HDTS User Signals ====================

@receiver(post_save, sender='users.User')
def user_post_save(sender, instance, created, **kwargs):
    """
    Signal handler for when a User is created or updated.
    Checks if user belongs to HDTS system and syncs combined user+role information.
    Runs in background thread to prevent blocking.
    """
    def send_sync_task():
        try:
            # Check if this user belongs to HDTS system
            role = _get_hdts_user_role(instance)
            
            if role:
                action = 'create' if created else 'update'
                logger.info(f"User {instance.id} ({instance.email}) {action}d with role {role}, syncing to HDTS subscribers")
                
                from celery import current_app
                
                # Prepare combined user + role data
                user_data = _prepare_hdts_user_data(instance, action=action)
                
                # Send directly to HDTS handlers via Celery task with timeout
                try:
                    current_app.send_task(
                        'hdts.tasks.sync_hdts_user',
                        args=[user_data],
                        queue='hdts.user.sync',
                        routing_key='hdts.user.sync',
                        retry=False,
                        time_limit=10,
                    )
                except Exception as celery_error:
                    logger.warning(f"Celery task send failed (non-blocking): {str(celery_error)}")
        except Exception as e:
            logger.error(f"Error in user_post_save signal: {str(e)}")
    
    # Send in background thread to prevent blocking the response
    thread = Thread(target=send_sync_task, daemon=False)
    thread.start()


@receiver(post_delete, sender='users.User')
def user_post_delete(sender, instance, **kwargs):
    """
    Signal handler for when a User is deleted.
    Only processes users that belonged to the HDTS system.
    """
    def send_sync_task():
        try:
            # We can't query for the role after deletion, but we can still sync the delete action
            # The consumer will need to handle the delete based on email/user_id
            logger.info(f"User {instance.id} ({instance.email}) deleted, syncing to HDTS subscribers")
            
            from celery import current_app
            
            # Prepare user data for deletion (include what we have)
            user_data = {
                "user_id": instance.id,
                "email": instance.email,
                "username": instance.username,
                "first_name": instance.first_name,
                "last_name": instance.last_name,
                "middle_name": getattr(instance, 'middle_name', ''),
                "suffix": getattr(instance, 'suffix', ''),
                "company_id": instance.company_id,
                "department": instance.department,
                "status": instance.status,
                "action": 'delete',
            }
            
            # Send directly to HDTS handlers task
            current_app.send_task(
                'hdts.tasks.sync_hdts_user',
                args=[user_data],
                queue='hdts.user.sync',
                routing_key='hdts.user.sync',
            )
        except Exception as e:
            logger.error(f"Error in user_post_delete signal: {str(e)}")
    
    # Send in background thread to prevent blocking the response
    thread = Thread(target=send_sync_task, daemon=False)
    thread.start()


@receiver(post_save, sender='system_roles.UserSystemRole')
def user_system_role_post_save(sender, instance, created, **kwargs):
    """
    Signal handler for when a UserSystemRole is created or updated.
    Only syncs if the role belongs to the HDTS system.
    Sends combined user + role data in a single sync operation.
    Runs in background thread to prevent blocking.
    
    Also syncs Ticket Coordinator role and users to TTS/workflow_api.
    """
    def send_sync_task():
        try:
            # Check if this user_system_role is for HDTS system
            if instance.role.system.slug == 'hdts':
                action = 'create' if created else 'update'
                logger.info(f"UserSystemRole {instance.id} (user={instance.user.email}, role={instance.role.name}) {action}d, syncing combined user+role to HDTS subscribers")
                
                from celery import current_app
                
                # Prepare combined user + role data with the new role
                user_data = _prepare_hdts_user_data(instance.user, action=action)
                # Override with the current role from the signal instance
                user_data['role'] = instance.role.name
                
                # Send directly to HDTS handlers task with timeout
                try:
                    current_app.send_task(
                        'hdts.tasks.sync_hdts_user',
                        args=[user_data],
                        queue='hdts.user.sync',
                        routing_key='hdts.user.sync',
                        retry=False,
                        time_limit=10,
                    )
                except Exception as celery_error:
                    logger.warning(f"Celery task send failed (non-blocking): {str(celery_error)}")
                
                # Also forward to workflow_api if role is in the list of roles to sync
                if _should_sync_to_tts(instance.role.name):
                    logger.info(f"HDTS role '{instance.role.name}' should sync to workflow_api, forwarding user {instance.user.email}")
                    _sync_hdts_user_to_workflow(instance.user, instance.role, instance, action)
        except Exception as e:
            logger.error(f"Error in user_system_role_post_save signal: {str(e)}")
    
    # Send in background thread to prevent blocking the response
    thread = Thread(target=send_sync_task, daemon=False)
    thread.start()


@receiver(post_delete, sender='system_roles.UserSystemRole')
def user_system_role_post_delete(sender, instance, **kwargs):
    """
    Signal handler for when a UserSystemRole is deleted.
    Sends the combined user+role data before deletion for sync purposes.
    Also syncs Ticket Coordinator deletion to TTS/workflow_api.
    """
    def send_sync_task():
        try:
            # Check if this user_system_role belonged to HDTS system
            if instance.role.system.slug == 'hdts':
                logger.info(f"UserSystemRole {instance.id} (user={instance.user.email}, role={instance.role.name}) deleted, syncing to HDTS subscribers")
                
                from celery import current_app
                
                # Prepare the combined user data before it's deleted
                user_data = _prepare_hdts_user_data(instance.user, action='delete')
                # Override with the deleted role
                user_data['role'] = instance.role.name
                
                # Send directly to HDTS handlers task
                current_app.send_task(
                    'hdts.tasks.sync_hdts_user',
                    args=[user_data],
                    queue='hdts.user.sync',
                    routing_key='hdts.user.sync',
                )
                
                # Also forward to workflow_api if role is in the list of roles to sync
                if _should_sync_to_tts(instance.role.name):
                    logger.info(f"HDTS role '{instance.role.name}' deletion should sync to workflow_api, forwarding user {instance.user.email}")
                    _sync_hdts_user_to_workflow(instance.user, instance.role, instance, 'delete')
        except Exception as e:
            logger.error(f"Error in user_system_role_post_delete signal: {str(e)}")
    
    # Send in background thread to prevent blocking the response
    thread = Thread(target=send_sync_task, daemon=False)
    thread.start()


@receiver(post_save, sender='hdts.Employees')
def employee_post_save(sender, instance, created, **kwargs):
    """
    Signal handler for when an Employee is created or updated.
    Syncs employee data with role set to 'employee' to separate queue.
    Runs in background thread to prevent blocking.
    """
    def send_sync_task():
        try:
            action = 'create' if created else 'update'
            logger.info(f"Employee {instance.id} ({instance.email}) {action}d, syncing to external employee subscribers")
            
            from celery import current_app
            
            # Prepare employee data with role set to 'employee'
            employee_data = _prepare_hdts_employee_data(instance, action=action)
            
            # Send to SEPARATE queue for employees (hdts.employee.sync)
            # Task will be processed by backend Celery worker
            try:
                current_app.send_task(
                    'core.tasks.process_hdts_employee_sync',
                    args=[employee_data],
                    queue='hdts.employee.sync',
                    routing_key='hdts.employee.sync',
                    retry=False,
                    time_limit=10,
                )
            except Exception as celery_error:
                logger.warning(f"Celery task send failed (non-blocking): {str(celery_error)}")
        except Exception as e:
            logger.error(f"Error in employee_post_save signal: {str(e)}")
    
    # Send in background thread to prevent blocking the response
    thread = Thread(target=send_sync_task, daemon=False)
    thread.start()


@receiver(post_delete, sender='hdts.Employees')
def employee_post_delete(sender, instance, **kwargs):
    """
    Signal handler for when an Employee is deleted.
    Syncs employee deletion to separate queue for external employee subscribers.
    """
    def send_sync_task():
        try:
            logger.info(f"Employee {instance.id} ({instance.email}) deleted, syncing to external employee subscribers")
            
            from celery import current_app
            
            # Prepare employee data for deletion
            employee_data = _prepare_hdts_employee_data(instance, action='delete')
            
            # Send to SEPARATE queue for employees (hdts.employee.sync)
            # Task will be processed by backend Celery worker
            current_app.send_task(
                'core.tasks.process_hdts_employee_sync',
                args=[employee_data],
                queue='hdts.employee.sync',
                routing_key='hdts.employee.sync',
            )
        except Exception as e:
            logger.error(f"Error in employee_post_delete signal: {str(e)}")
    
    # Send in background thread to prevent blocking the response
    thread = Thread(target=send_sync_task, daemon=False)
    thread.start()
