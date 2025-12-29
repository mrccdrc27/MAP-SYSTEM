import json
import logging
from channels.generic.websocket import AsyncWebsocketConsumer
from channels.db import database_sync_to_async
from asgiref.sync import sync_to_async

logger = logging.getLogger(__name__)


class NotificationConsumer(AsyncWebsocketConsumer):
    """
    WebSocket consumer for real-time notifications.
    Each user connects to their own notification channel based on user_id.
    """
    
    async def connect(self):
        """Handle WebSocket connection"""
        self.user_id = self.scope['url_route']['kwargs']['user_id']
        self.room_group_name = f'notifications_{self.user_id}'
        
        # Join user-specific notification group
        await self.channel_layer.group_add(
            self.room_group_name,
            self.channel_name
        )

        await self.accept()
        
        # Send connection confirmation
        await self.send(text_data=json.dumps({
            'type': 'connection_established',
            'user_id': self.user_id,
            'message': f'Connected to notifications for user {self.user_id}'
        }))
        
        logger.info(f"[NotificationConsumer] User {self.user_id} connected")

    async def disconnect(self, close_code):
        """Handle WebSocket disconnection"""
        # Leave notification group
        await self.channel_layer.group_discard(
            self.room_group_name,
            self.channel_name
        )
        logger.info(f"[NotificationConsumer] User {self.user_id} disconnected with code {close_code}")

    async def receive(self, text_data):
        """Handle incoming WebSocket messages from client"""
        try:
            text_data_json = json.loads(text_data)
            message_type = text_data_json.get('type')
            
            if message_type == 'ping':
                # Handle ping/pong for connection health
                await self.send(text_data=json.dumps({
                    'type': 'pong',
                    'timestamp': text_data_json.get('timestamp')
                }))
            elif message_type == 'mark_read':
                # Client marking a notification as read
                notification_id = text_data_json.get('notification_id')
                if notification_id:
                    await self.mark_notification_read(notification_id)
            elif message_type == 'subscribe':
                # Client explicitly subscribing to updates
                await self.send(text_data=json.dumps({
                    'type': 'subscribed',
                    'user_id': self.user_id
                }))
            else:
                logger.warning(f"[NotificationConsumer] Unhandled message type: {message_type}")
                
        except json.JSONDecodeError as e:
            logger.error(f"[NotificationConsumer] Invalid JSON received: {e}")
            await self.send(text_data=json.dumps({
                'type': 'error',
                'message': 'Invalid JSON format'
            }))
        except Exception as e:
            logger.error(f"[NotificationConsumer] Error handling message: {e}")
            await self.send(text_data=json.dumps({
                'type': 'error',
                'message': 'Internal server error'
            }))

    @database_sync_to_async
    def mark_notification_read(self, notification_id):
        """Mark a notification as read in the database"""
        from .models import InAppNotification
        try:
            notification = InAppNotification.objects.get(id=notification_id, user_id=self.user_id)
            notification.mark_as_read()
            return True
        except InAppNotification.DoesNotExist:
            logger.warning(f"[NotificationConsumer] Notification {notification_id} not found for user {self.user_id}")
            return False

    # Handler for notification messages sent via channel layer
    async def notification_message(self, event):
        """
        Handle notification messages from the channel layer.
        This is called when a notification is sent via:
        channel_layer.group_send(group_name, {'type': 'notification_message', ...})
        """
        try:
            notification_data = event.get('notification', {})
            action = event.get('action', 'new')
            
            # Send notification to WebSocket
            await self.send(text_data=json.dumps({
                'type': 'notification_update',
                'action': action,
                'notification': notification_data,
                'timestamp': event.get('timestamp')
            }))
            
            logger.info(f"[NotificationConsumer] Sent {action} notification to user {self.user_id}")
            
        except Exception as e:
            logger.error(f"[NotificationConsumer] Error sending notification: {e}")

    async def notification_count_update(self, event):
        """
        Handle unread count update messages.
        Sent when notifications are marked as read.
        """
        try:
            await self.send(text_data=json.dumps({
                'type': 'count_update',
                'unread_count': event.get('unread_count', 0),
                'timestamp': event.get('timestamp')
            }))
        except Exception as e:
            logger.error(f"[NotificationConsumer] Error sending count update: {e}")
