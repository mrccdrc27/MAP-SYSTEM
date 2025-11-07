import json
from channels.generic.websocket import AsyncWebsocketConsumer
from channels.db import database_sync_to_async
from .models import Comment
from .serializers import CommentSerializer


class CommentConsumer(AsyncWebsocketConsumer):
    async def connect(self):
        self.ticket_id = self.scope['url_route']['kwargs']['ticket_id']
        self.room_group_name = f'comments_{self.ticket_id}'

        # Join room group
        await self.channel_layer.group_add(
            self.room_group_name,
            self.channel_name
        )

        await self.accept()

    async def disconnect(self, close_code):
        # Leave room group
        await self.channel_layer.group_discard(
            self.room_group_name,
            self.channel_name
        )

    async def receive(self, text_data):
        text_data_json = json.loads(text_data)
        message_type = text_data_json.get('type')

        if message_type == 'comment_create':
            # Handle new comment creation
            comment_data = text_data_json.get('comment')
            comment = await self.create_comment(comment_data)
            
            if comment:
                # Send message to room group
                await self.channel_layer.group_send(
                    self.room_group_name,
                    {
                        'type': 'comment_message',
                        'message': comment,
                        'action': 'create'
                    }
                )

    # Receive message from room group
    async def comment_message(self, event):
        message = event['message']
        action = event['action']

        # Send message to WebSocket
        await self.send(text_data=json.dumps({
            'type': 'comment_update',
            'action': action,
            'comment': message
        }))

    @database_sync_to_async
    def create_comment(self, comment_data):
        try:
            comment_data['ticket'] = self.ticket_id
            serializer = CommentSerializer(data=comment_data)

            if serializer.is_valid():
                comment = serializer.save()

                # 🔄 Re-fetch from DB to ensure related docs/files are fully saved
                comment.refresh_from_db()
                
                # ✅ Serialize fresh instance with complete file URLs
                return CommentSerializer(comment).data

            print(serializer.errors)
            return None

        except Exception as e:
            print(f"Error creating comment: {e}")
            return None
