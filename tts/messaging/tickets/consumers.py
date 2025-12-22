import json
from channels.generic.websocket import AsyncWebsocketConsumer
from channels.db import database_sync_to_async
from django.contrib.auth.models import AnonymousUser
from .models import Ticket, Message
from .serializers import MessageSerializer


class TicketMessagingConsumer(AsyncWebsocketConsumer):
    async def connect(self):
        self.ticket_id = self.scope['url_route']['kwargs']['ticket_id']
        
        # Handle both authenticated and anonymous users
        user = self.scope.get('user')
        if isinstance(user, AnonymousUser) or not user:
            self.user_id = 'anonymous'
        else:
            # Try different user identifier attributes
            self.user_id = (
                getattr(user, 'id', None) or 
                getattr(user, 'pk', None) or 
                getattr(user, 'username', None) or 
                getattr(user, 'email', None) or 
                str(user) or 
                'anonymous'
            )
        
        # Join ticket group
        self.ticket_group_name = f'ticket_{self.ticket_id}'
        await self.channel_layer.group_add(
            self.ticket_group_name,
            self.channel_name
        )
        
        # Join user group for personal notifications
        self.user_group_name = f'user_{self.user_id}'
        await self.channel_layer.group_add(
            self.user_group_name,
            self.channel_name
        )
        
        await self.accept()
        
        # Send connection confirmation
        await self.send(text_data=json.dumps({
            'type': 'connection_established',
            'ticket_id': self.ticket_id,
            'user_id': str(self.user_id),
            'message': f'Connected to ticket {self.ticket_id}'
        }))

    async def disconnect(self, close_code):
        # Leave ticket group
        await self.channel_layer.group_discard(
            self.ticket_group_name,
            self.channel_name
        )
        
        # Leave user group
        await self.channel_layer.group_discard(
            self.user_group_name,
            self.channel_name
        )

    async def receive(self, text_data):
        try:
            data = json.loads(text_data)
            message_type = data.get('type')
            
            if message_type == 'ping':
                await self.send(text_data=json.dumps({'type': 'pong'}))
            
            elif message_type == 'typing_start':
                await self.channel_layer.group_send(
                    self.ticket_group_name,
                    {
                        'type': 'user_typing',
                        'user': data.get('user', 'Unknown'),
                        'is_typing': True
                    }
                )
            
            elif message_type == 'typing_stop':
                await self.channel_layer.group_send(
                    self.ticket_group_name,
                    {
                        'type': 'user_typing',
                        'user': data.get('user', 'Unknown'),
                        'is_typing': False
                    }
                )
                
        except json.JSONDecodeError:
            await self.send(text_data=json.dumps({
                'type': 'error',
                'message': 'Invalid JSON data'
            }))

    # Handle message broadcasts
    async def message_broadcast(self, event):
        await self.send(text_data=json.dumps(event['data']))

    # Handle user-specific messages
    async def user_message(self, event):
        await self.send(text_data=json.dumps(event['data']))

    # Handle typing indicators
    async def user_typing(self, event):
        await self.send(text_data=json.dumps({
            'type': 'typing_indicator',
            'user': event['user'],
            'is_typing': event['is_typing']
        }))

    @database_sync_to_async
    def get_ticket(self, ticket_id):
        try:
            return Ticket.objects.get(ticket_id=ticket_id)
        except Ticket.DoesNotExist:
            return None