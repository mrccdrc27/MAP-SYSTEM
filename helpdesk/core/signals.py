"""
Django signals for the backend core app.
Handles updates when HDTS user data is synced into the local database.
"""

from django.db.models.signals import post_save, post_delete
from django.dispatch import receiver
import logging

logger = logging.getLogger(__name__)


@receiver(post_save, sender='core.HDTSUser')
def hdts_user_post_save(sender, instance, created, **kwargs):
    """
    Signal handler for when an HDTS user is saved locally.
    This is triggered after processing sync messages from the auth service.
    Combined user + role data is now stored in a single HDTSUser model.
    """
    action = "created" if created else "updated"
    logger.info(f"HDTS User {action} locally: {instance.email} with role '{instance.role}' (hdts_user_id={instance.hdts_user_id})")
    
    # Future: Add any local business logic here
    # For example: trigger workflows, send notifications, etc.


@receiver(post_delete, sender='core.HDTSUser')
def hdts_user_post_delete(sender, instance, **kwargs):
    """
    Signal handler for when an HDTS user is deleted locally.
    This happens when a delete action is received from the auth service.
    """
    logger.info(f"HDTS User deleted locally: {instance.email} (hdts_user_id={instance.hdts_user_id})")
    
    # Future: Add any cleanup logic here
    # For example: cascade deletes, audit logs, notifications, etc.

