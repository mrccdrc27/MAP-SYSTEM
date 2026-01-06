"""
WebSocket utilities for broadcasting notifications in real-time.
"""
import json
import logging
import threading
from datetime import datetime
import requests
from django.conf import settings

logger = logging.getLogger(__name__)


def get_channel_layer():
    """
    Get the channel layer instance.
    Returns None if channels is not available.
    """
    try:
        from channels.layers import get_channel_layer as channels_get_layer
        return channels_get_layer()
    except ImportError:
        logger.warning("Django Channels not installed, WebSocket broadcasts disabled")
        return None
    except Exception as e:
        logger.error(f"Error getting channel layer: {e}")
        return None


def broadcast_notification_internal(user_id, notification_data, action='new'):
    """
    Broadcast a notification via the internal HTTP endpoint.
    Uses fire-and-forget pattern to avoid blocking the caller.
    
    Args:
        user_id: The user ID to send the notification to
        notification_data: Dictionary containing notification data
        action: The action type ('new', 'read', 'deleted')
    """
    def _do_broadcast():
        try:
            base_url = getattr(settings, 'NOTIFICATION_SERVICE_INTERNAL_URL', 'http://localhost:8006')
            url = f"{base_url}/api/v1/app/internal/broadcast/"
            
            payload = {
                'user_id': user_id,
                'notification': notification_data,
                'action': action
            }
            
            response = requests.post(
                url,
                json=payload,
                headers={'Content-Type': 'application/json'},
                timeout=5.0
            )
            
            if response.status_code == 200:
                logger.info(f"[WebSocket] Broadcast triggered for user {user_id}")
            else:
                logger.warning(f"[WebSocket] Broadcast failed: {response.status_code}")
                
        except Exception as e:
            logger.debug(f"[WebSocket] Broadcast error: {e}")
    
    # Fire-and-forget: launch in background thread
    thread = threading.Thread(target=_do_broadcast, daemon=True)
    thread.start()
    logger.info(f"[WebSocket] Broadcast queued for user {user_id}")
    return True


def broadcast_notification_direct(user_id, notification_data, action='new'):
    """
    Broadcast a notification directly via channel layer.
    This only works when called from within the Daphne process.
    
    Args:
        user_id: The user ID to send the notification to
        notification_data: Dictionary containing notification data
        action: The action type ('new', 'read', 'deleted')
    """
    from asgiref.sync import async_to_sync
    
    channel_layer = get_channel_layer()
    if not channel_layer:
        logger.debug("No channel layer available, skipping WebSocket broadcast")
        return False
    
    try:
        group_name = f'notifications_{user_id}'
        
        # Prepare the message
        message = {
            'type': 'notification_message',  # This maps to notification_message handler in consumer
            'notification': notification_data,
            'action': action,
            'timestamp': datetime.now().isoformat()
        }
        
        # Send to the user's notification group
        async_to_sync(channel_layer.group_send)(group_name, message)
        
        logger.info(f"[WebSocket] Direct broadcast {action} notification to user {user_id}")
        return True
        
    except Exception as e:
        logger.error(f"[WebSocket] Error broadcasting notification: {e}")
        return False


def broadcast_notification(user_id, notification_data, action='new'):
    """
    Broadcast a notification to a specific user via WebSocket.
    Uses HTTP internal endpoint to ensure broadcast happens in Daphne process.
    
    Args:
        user_id: The user ID to send the notification to
        notification_data: Dictionary containing notification data
        action: The action type ('new', 'read', 'deleted')
    """
    return broadcast_notification_internal(user_id, notification_data, action)


def broadcast_unread_count(user_id, unread_count):
    """
    Broadcast updated unread notification count to a user.
    
    Args:
        user_id: The user ID to send the count update to
        unread_count: The new unread count
    """
    try:
        base_url = getattr(settings, 'NOTIFICATION_SERVICE_INTERNAL_URL', 'http://localhost:8006')
        url = f"{base_url}/api/v1/app/internal/broadcast-count/"
        
        payload = {
            'user_id': user_id,
            'unread_count': unread_count
        }
        
        response = requests.post(
            url,
            json=payload,
            headers={'Content-Type': 'application/json'},
            timeout=5
        )
        
        return response.status_code == 200
        
    except Exception as e:
        logger.error(f"[WebSocket] Error broadcasting count update: {e}")
        return False


def serialize_notification(notification):
    """
    Serialize an InAppNotification model instance to a dictionary
    suitable for WebSocket transmission.
    
    Args:
        notification: InAppNotification model instance
    
    Returns:
        Dictionary with notification data
    """
    return {
        'id': str(notification.id),
        'user_id': notification.user_id,
        'subject': notification.subject,
        'message': notification.message,
        'notification_type': notification.notification_type,
        'related_ticket_number': notification.related_ticket_number,
        'metadata': notification.metadata or {},
        'is_read': notification.is_read,
        'created_at': notification.created_at.isoformat() if notification.created_at else None,
        'read_at': notification.read_at.isoformat() if notification.read_at else None,
    }
