import json
from channels.layers import get_channel_layer
from asgiref.sync import async_to_sync

def broadcast_message(ticket_id, message_data):
    """
    Broadcast a message to all clients connected to a specific ticket channel
    """
    channel_layer = get_channel_layer()
    if channel_layer:
        async_to_sync(channel_layer.group_send)(
            f"ticket_{ticket_id}",
            {
                'type': 'message_broadcast',
                'data': message_data
            }
        )

def broadcast_to_user(user_id, message_data):
    """
    Broadcast a message to a specific user
    """
    channel_layer = get_channel_layer()
    if channel_layer:
        async_to_sync(channel_layer.group_send)(
            f"user_{user_id}",
            {
                'type': 'user_message',
                'data': message_data
            }
        )