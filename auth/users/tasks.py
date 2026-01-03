"""
Celery tasks for syncing user emails to notification service.
These tasks send user email data when users are created or updated.
Only syncs TTS User model, not HDTS Employee model.
"""

from celery import shared_task, current_app
import logging

logger = logging.getLogger(__name__)


@shared_task(name='users.tasks.sync_user_email_to_notification_service')
def sync_user_email_to_notification_service(user_id, action='sync'):
    """
    Sync a single user's email to notification service.
    
    Args:
        user_id (int): The ID of the user to sync
        action (str): The action type - 'sync' or 'delete'
    
    Returns:
        dict: Status of the sync operation
    """
    from users.models import User
    
    try:
        if action == 'delete':
            # Send delete task to notification service
            current_app.send_task(
                'notifications.delete_user_email_cache',
                kwargs={'user_id': user_id},
                queue='user-email-sync-queue',
            )
            logger.info(f"Sent delete sync for user {user_id} to notification service")
            return {"status": "success", "user_id": user_id, "action": "delete"}
        
        # Get user from database
        user = User.objects.get(id=user_id)
        
        # Send sync task to notification service
        current_app.send_task(
            'notifications.sync_user_email',
            kwargs={
                'user_id': user.id,
                'email': user.email,
                'first_name': user.first_name or '',
                'last_name': user.last_name or '',
                'is_active': user.is_active,
            },
            queue='user-email-sync-queue',
        )
        
        logger.info(f"Sent email sync for user {user_id} ({user.email}) to notification service")
        return {
            "status": "success",
            "user_id": user_id,
            "email": user.email,
            "action": "sync",
        }
    
    except User.DoesNotExist:
        logger.error(f"User {user_id} not found for email sync")
        return {"status": "error", "error": "User not found"}
    except Exception as e:
        logger.error(f"Error syncing user email {user_id}: {str(e)}")
        return {"status": "error", "error": str(e)}


@shared_task(name='users.tasks.bulk_sync_user_emails_to_notification_service')
def bulk_sync_user_emails_to_notification_service():
    """
    Bulk sync all active users' emails to notification service.
    Used for initial sync or periodic refresh.
    
    Returns:
        dict: Status with count of synced users
    """
    from users.models import User
    
    try:
        # Get all active users
        users = User.objects.filter(is_active=True).values(
            'id', 'email', 'first_name', 'last_name', 'is_active'
        )
        
        # Prepare users data
        users_data = [
            {
                'user_id': user['id'],
                'email': user['email'],
                'first_name': user['first_name'] or '',
                'last_name': user['last_name'] or '',
                'is_active': user['is_active'],
            }
            for user in users
        ]
        
        # Send bulk sync to notification service
        # Split into chunks to avoid message size limits
        CHUNK_SIZE = 100
        for i in range(0, len(users_data), CHUNK_SIZE):
            chunk = users_data[i:i + CHUNK_SIZE]
            current_app.send_task(
                'notifications.bulk_sync_user_emails',
                kwargs={'users_data': chunk},
                queue='user-email-sync-queue',
            )
        
        logger.info(f"Sent bulk email sync for {len(users_data)} users to notification service")
        return {
            "status": "success",
            "total_users": len(users_data),
            "chunks_sent": (len(users_data) + CHUNK_SIZE - 1) // CHUNK_SIZE,
        }
    
    except Exception as e:
        logger.error(f"Error in bulk user email sync: {str(e)}")
        return {"status": "error", "error": str(e)}
