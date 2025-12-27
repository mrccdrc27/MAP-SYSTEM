"""
Celery tasks for syncing user email data from auth service.
These tasks receive user sync events and update the local cache.
"""

from celery import shared_task
import logging

logger = logging.getLogger(__name__)


@shared_task(name="notifications.sync_user_email")
def sync_user_email(user_id, email, first_name='', last_name='', is_active=True):
    """
    Sync a single user's email to the local cache.
    Called by auth service when a user is created or updated.
    
    Args:
        user_id (int): User ID from auth service
        email (str): User's email address
        first_name (str): User's first name
        last_name (str): User's last name
        is_active (bool): Whether user is active
    
    Returns:
        dict: Status of the sync operation
    """
    try:
        from .models import UserEmailCache
        
        cache_entry, created = UserEmailCache.sync_user(
            user_id=user_id,
            email=email,
            first_name=first_name,
            last_name=last_name,
            is_active=is_active
        )
        
        action = "created" if created else "updated"
        logger.info(f"✅ User email cache {action} for user {user_id}: {email}")
        
        return {
            "status": "success",
            "action": action,
            "user_id": user_id,
            "email": email
        }
    except Exception as e:
        logger.error(f"❌ Failed to sync user email for user {user_id}: {str(e)}", exc_info=True)
        return {
            "status": "error",
            "error": str(e),
            "user_id": user_id
        }


@shared_task(name="notifications.bulk_sync_user_emails")
def bulk_sync_user_emails(users_data):
    """
    Bulk sync multiple users' emails to the local cache.
    Called by auth service for initial sync or periodic refresh.
    
    Args:
        users_data (list): List of dicts with user_id, email, first_name, last_name, is_active
    
    Returns:
        dict: Status with counts of created and updated entries
    """
    try:
        from .models import UserEmailCache
        
        created_count, updated_count = UserEmailCache.bulk_sync(users_data)
        
        logger.info(f"✅ Bulk user email sync complete: {created_count} created, {updated_count} updated")
        
        return {
            "status": "success",
            "created_count": created_count,
            "updated_count": updated_count,
            "total_processed": len(users_data)
        }
    except Exception as e:
        logger.error(f"❌ Failed bulk user email sync: {str(e)}", exc_info=True)
        return {
            "status": "error",
            "error": str(e)
        }


@shared_task(name="notifications.delete_user_email_cache")
def delete_user_email_cache(user_id):
    """
    Remove a user from the email cache.
    Called when a user is deleted in auth service.
    
    Args:
        user_id (int): User ID to remove
    
    Returns:
        dict: Status of the delete operation
    """
    try:
        from .models import UserEmailCache
        
        deleted_count, _ = UserEmailCache.delete_user(user_id)
        
        if deleted_count > 0:
            logger.info(f"✅ Removed user {user_id} from email cache")
        else:
            logger.warning(f"⚠️ User {user_id} not found in email cache")
        
        return {
            "status": "success",
            "deleted": deleted_count > 0,
            "user_id": user_id
        }
    except Exception as e:
        logger.error(f"❌ Failed to delete user {user_id} from cache: {str(e)}", exc_info=True)
        return {
            "status": "error",
            "error": str(e),
            "user_id": user_id
        }
