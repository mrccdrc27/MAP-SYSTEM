import json
from channels.generic.websocket import AsyncWebsocketConsumer
from channels.db import database_sync_to_async
from django.contrib.auth.models import AnonymousUser
from .models import Ticket, Message
from .serializers import MessageSerializer


class TicketMessagingConsumer(AsyncWebsocketConsumer):
    # Class-level tracking of connected users per ticket
    connected_users = {}  # {ticket_id: {channel_name: user_identifier}}
    
    async def connect(self):
        self.ticket_id = self.scope['url_route']['kwargs']['ticket_id']
        
        # Handle both authenticated and anonymous users
        user = self.scope.get('user')
        if isinstance(user, AnonymousUser) or not user:
            self.user_id = 'anonymous'
            self.user_display_name = 'Anonymous'
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
            # Get display name for presence
            first_name = getattr(user, 'first_name', '')
            last_name = getattr(user, 'last_name', '')
            self.user_display_name = f"{first_name} {last_name}".strip() or getattr(user, 'username', str(self.user_id))
        
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
        
        # Track connected user
        if self.ticket_id not in self.connected_users:
            self.connected_users[self.ticket_id] = {}
        self.connected_users[self.ticket_id][self.channel_name] = self.user_display_name
        
        # Get list of all connected users for this ticket
        connected_list = list(set(self.connected_users.get(self.ticket_id, {}).values()))
        
        # Send connection confirmation with online users
        await self.send(text_data=json.dumps({
            'type': 'connection_established',
            'ticket_id': self.ticket_id,
            'user_id': str(self.user_id),
            'message': f'Connected to ticket {self.ticket_id}',
            'users': connected_list
        }))
        
        # Notify others that user joined
        await self.channel_layer.group_send(
            self.ticket_group_name,
            {
                'type': 'user_presence',
                'user': self.user_display_name,
                'status': 'online',
                'users': connected_list
            }
        )

    async def disconnect(self, close_code):
        # Remove user from connected users
        if self.ticket_id in self.connected_users:
            self.connected_users[self.ticket_id].pop(self.channel_name, None)
            if not self.connected_users[self.ticket_id]:
                del self.connected_users[self.ticket_id]
        
        # Get updated list of connected users
        connected_list = list(set(self.connected_users.get(self.ticket_id, {}).values()))
        
        # Notify others that user left
        await self.channel_layer.group_send(
            self.ticket_group_name,
            {
                'type': 'user_presence',
                'user': self.user_display_name,
                'status': 'offline',
                'users': connected_list
            }
        )
        
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

    # Handle user presence (online/offline)
    async def user_presence(self, event):
        await self.send(text_data=json.dumps({
            'type': 'presence_update',
            'user': event['user'],
            'status': event['status'],
            'users': event.get('users', [])
        }))

    @database_sync_to_async
    def get_ticket(self, ticket_id):
        try:
            return Ticket.objects.get(ticket_id=ticket_id)
        except Ticket.DoesNotExist:
            return None