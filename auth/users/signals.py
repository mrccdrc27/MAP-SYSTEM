"""
Django signals for User model.
Triggers email sync to notification service when users are created or updated.
"""

from django.db.models.signals import post_save, post_delete, pre_save
from django.dispatch import receiver
import logging

logger = logging.getLogger(__name__)

# Store old email to detect changes
_old_emails = {}


@receiver(pre_save, sender='users.User')
def cache_old_email(sender, instance, **kwargs):
    """Cache the old email before save to detect changes."""
    if instance.pk:
        try:
            old_instance = sender.objects.get(pk=instance.pk)
            _old_emails[instance.pk] = old_instance.email
        except sender.DoesNotExist:
            pass


@receiver(post_save, sender='users.User')
def sync_user_email_on_save(sender, instance, created, **kwargs):
    """
    Sync user email to notification service when user is created or email changes.
    """
    try:
        # Check if this is a new user or email changed
        should_sync = created
        
        if not created and instance.pk in _old_emails:
            old_email = _old_emails.pop(instance.pk, None)
            if old_email != instance.email:
                should_sync = True
                logger.info(f"User {instance.pk} email changed from {old_email} to {instance.email}")
        
        # Also sync if is_active changed
        if not should_sync:
            # For now, always sync on save to be safe
            should_sync = True
        
        if should_sync:
            from .tasks import sync_user_email_to_notification_service
            # Use delay() to run async
            sync_user_email_to_notification_service.delay(instance.pk, action='sync')
            logger.info(f"Triggered email sync for user {instance.pk} ({'created' if created else 'updated'})")
    
    except Exception as e:
        # Don't let sync failure prevent user save
        logger.error(f"Failed to trigger email sync for user {instance.pk}: {str(e)}")


@receiver(post_delete, sender='users.User')
def sync_user_email_on_delete(sender, instance, **kwargs):
    """
    Remove user from notification service cache when user is deleted.
    """
    try:
        from .tasks import sync_user_email_to_notification_service
        sync_user_email_to_notification_service.delay(instance.pk, action='delete')
        logger.info(f"Triggered email cache delete for user {instance.pk}")
    except Exception as e:
        logger.error(f"Failed to trigger email cache delete for user {instance.pk}: {str(e)}")
