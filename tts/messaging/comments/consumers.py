import json
import logging
from channels.generic.websocket import AsyncWebsocketConsumer
from channels.db import database_sync_to_async
from django.core.exceptions import ObjectDoesNotExist
from .models import Comment, CommentRating
from .serializers import CommentSerializer, CommentRatingSerializer

logger = logging.getLogger(__name__)


class CommentConsumer(AsyncWebsocketConsumer):
    async def connect(self):
        self.ticket_id = self.scope['url_route']['kwargs']['ticket_id']
        self.room_group_name = f'comments_{self.ticket_id}'
        
        # Store user info if available
        self.user = self.scope.get('user')

        # Join room group
        await self.channel_layer.group_add(
            self.room_group_name,
            self.channel_name
        )

        await self.accept()
        
        # Send connection confirmation
        await self.send(text_data=json.dumps({
            'type': 'connection_established',
            'ticket_id': self.ticket_id,
            'message': f'Connected to comments for ticket {self.ticket_id}'
        }))

    async def disconnect(self, close_code):
        # Leave room group
        await self.channel_layer.group_discard(
            self.room_group_name,
            self.channel_name
        )

    async def receive(self, text_data):
        """Handle incoming WebSocket messages"""
        try:
            text_data_json = json.loads(text_data)
            message_type = text_data_json.get('type')
            
            if message_type == 'ping':
                # Handle ping/pong for connection health
                await self.send(text_data=json.dumps({
                    'type': 'pong',
                    'timestamp': text_data_json.get('timestamp')
                }))
            elif message_type == 'subscribe':
                # Client explicitly subscribing to updates
                await self.send(text_data=json.dumps({
                    'type': 'subscribed',
                    'ticket_id': self.ticket_id
                }))
            else:
                logger.warning(f"Unhandled message type: {message_type}")
                
        except json.JSONDecodeError as e:
            logger.error(f"Invalid JSON received: {e}")
            await self.send(text_data=json.dumps({
                'type': 'error',
                'message': 'Invalid JSON format'
            }))
        except Exception as e:
            logger.error(f"Error handling WebSocket message: {e}")
            await self.send(text_data=json.dumps({
                'type': 'error',
                'message': 'Internal server error'
            }))

    # Handle different types of comment notifications
    async def comment_message(self, event):
        """Handle comment-related messages from the channel layer"""
        try:
            message = event['message']
            action = event['action']
            
            # Send message to WebSocket
            response_data = {
                'type': 'comment_update',
                'action': action,
                'comment': message,
                'timestamp': event.get('timestamp')
            }
            
            # Add additional data based on action type
            if action == 'delete':
                response_data['deleted_comment_id'] = event.get('deleted_comment_id')
            elif action == 'rate':
                response_data['rating_data'] = event.get('rating_data')
            elif action in ['attach_document', 'detach_document']:
                response_data['document_info'] = event.get('document_info')
                
            await self.send(text_data=json.dumps(response_data))
            
        except Exception as e:
            logger.error(f"Error sending comment message: {e}")
            await self.send(text_data=json.dumps({
                'type': 'error',
                'message': 'Failed to process comment update'
            }))

    async def comment_create(self, event):
        """Handle comment creation notifications"""
        await self.comment_message({
            **event,
            'action': 'create'
        })

    async def comment_update(self, event):
        """Handle comment update notifications"""
        await self.comment_message({
            **event,
            'action': 'update'
        })

    async def comment_delete(self, event):
        """Handle comment deletion notifications"""
        await self.comment_message({
            **event,
            'action': 'delete'
        })

    async def comment_reply(self, event):
        """Handle comment reply notifications"""
        await self.comment_message({
            **event,
            'action': 'reply'
        })

    async def comment_rate(self, event):
        """Handle comment rating notifications"""
        await self.comment_message({
            **event,
            'action': 'rate'
        })

    async def comment_attach_document(self, event):
        """Handle document attachment notifications"""
        await self.comment_message({
            **event,
            'action': 'attach_document'
        })

    async def comment_detach_document(self, event):
        """Handle document detachment notifications"""
        await self.comment_message({
            **event,
            'action': 'detach_document'
        })

    async def notification_message(self, event):
        """Handle general notification messages"""
        try:
            await self.send(text_data=json.dumps({
                'type': 'notification',
                'message': event['message'],
                'level': event.get('level', 'info'),
                'timestamp': event.get('timestamp')
            }))
        except Exception as e:
            logger.error(f"Error sending notification: {e}")

    @database_sync_to_async
    def get_comment_data(self, comment_id):
        """Async helper to get comment data from database"""
        try:
            comment = Comment.objects.get(id=comment_id)
            return CommentSerializer(comment).data
        except Comment.DoesNotExist:
            return None
        except Exception as e:
            logger.error(f"Error fetching comment {comment_id}: {e}")
            return None
