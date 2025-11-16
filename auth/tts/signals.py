"""
Django signals for the TTS app to trigger role and user_system_role syncing.
Listens to post_save and post_delete signals and sends tasks to the message broker.
"""

from django.db.models.signals import post_save, post_delete
from django.dispatch import receiver
import logging

logger = logging.getLogger(__name__)


@receiver(post_save, sender='roles.Role')
def role_post_save(sender, instance, created, **kwargs):
    """
    Signal handler for when a Role is created or updated.
    Only syncs roles attached to the TTS system.
    """
    try:
        # Check if this role belongs to TTS system
        if instance.system.slug == 'tts':
            action = 'create' if created else 'update'
            logger.info(f"Role {instance.id} ({instance.name}) {action}d, syncing to workflow_api")
            
            # Prepare the role data
            from celery import current_app
            
            role_data = {
                "role_id": instance.id,
                "name": instance.name,
                "system": instance.system.slug,
                "description": instance.description,
                "is_custom": instance.is_custom,
                "created_at": instance.created_at.isoformat(),
                "action": action,
            }
            
            # Send directly to workflow_api task (not auth service task)
            current_app.send_task(
                'role.tasks.sync_role',
                args=[role_data],
                queue='tts.role.sync',
                routing_key='tts.role.sync',
            )
    except Exception as e:
        logger.error(f"Error in role_post_save signal: {str(e)}")


@receiver(post_delete, sender='roles.Role')
def role_post_delete(sender, instance, **kwargs):
    """
    Signal handler for when a Role is deleted.
    Only processes roles that were attached to the TTS system.
    """
    try:
        # Check if this role belonged to TTS system
        if instance.system.slug == 'tts':
            logger.info(f"Role {instance.id} ({instance.name}) deleted, syncing to workflow_api")
            
            # Prepare the role data
            from celery import current_app
            
            role_data = {
                "role_id": instance.id,
                "name": instance.name,
                "system": instance.system.slug,
                "description": instance.description,
                "is_custom": instance.is_custom,
                "created_at": instance.created_at.isoformat(),
                "action": 'delete',
            }
            
            # Send directly to workflow_api task
            current_app.send_task(
                'role.tasks.sync_role',
                args=[role_data],
                queue='tts.role.sync',
                routing_key='tts.role.sync',
            )
    except Exception as e:
        logger.error(f"Error in role_post_delete signal: {str(e)}")


@receiver(post_save, sender='system_roles.UserSystemRole')
def user_system_role_post_save(sender, instance, created, **kwargs):
    """
    Signal handler for when a UserSystemRole is created or updated.
    Only syncs if the role belongs to the TTS system.
    """
    try:
        # Check if this user_system_role is for TTS system
        if instance.role.system.slug == 'tts':
            action = 'create' if created else 'update'
            logger.info(f"UserSystemRole {instance.id} (user={instance.user.email}, role={instance.role.name}) {action}d, syncing to workflow_api")
            
            from celery import current_app
            
            # Prepare the full user_system_role data
            user_system_role_data = {
                "user_system_role_id": instance.id,
                "user_id": instance.user.id,
                "user_email": instance.user.email,
                "system": instance.system.slug,
                "role_id": instance.role.id,
                "role_name": instance.role.name,
                "assigned_at": instance.assigned_at.isoformat(),
                "is_active": instance.is_active,
                "settings": instance.settings,
                "action": action,
            }
            
            # Send directly to workflow_api task
            current_app.send_task(
                'role.tasks.sync_user_system_role',
                args=[user_system_role_data],
                queue='tts.user_system_role.sync',
                routing_key='tts.user_system_role.sync',
            )
    except Exception as e:
        logger.error(f"Error in user_system_role_post_save signal: {str(e)}")


@receiver(post_delete, sender='system_roles.UserSystemRole')
def user_system_role_post_delete(sender, instance, **kwargs):
    """
    Signal handler for when a UserSystemRole is deleted.
    Sends the full user_system_role data before deletion for sync purposes.
    """
    try:
        # Check if this user_system_role belonged to TTS system
        if instance.role.system.slug == 'tts':
            logger.info(f"UserSystemRole {instance.id} (user={instance.user.email}, role={instance.role.name}) deleted, syncing to workflow_api")
            
            from celery import current_app
            
            # Prepare the data before it's deleted
            user_system_role_data = {
                "user_system_role_id": instance.id,
                "user_id": instance.user.id,
                "user_email": instance.user.email,
                "system": instance.system.slug,
                "role_id": instance.role.id,
                "role_name": instance.role.name,
                "assigned_at": instance.assigned_at.isoformat(),
                "is_active": instance.is_active,
                "settings": instance.settings,
                "action": 'delete',
            }
            
            # Send directly to workflow_api task
            current_app.send_task(
                'role.tasks.sync_user_system_role',
                args=[user_system_role_data],
                queue='tts.user_system_role.sync',
                routing_key='tts.user_system_role.sync',
            )
    except Exception as e:
        logger.error(f"Error in user_system_role_post_delete signal: {str(e)}")
