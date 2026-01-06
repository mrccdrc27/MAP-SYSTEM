from django.urls import re_path
from . import consumers

websocket_urlpatterns = [
    # Support both direct WebSocket (ws/comments/...) and Kong-proxied (comments/...)
    re_path(r'^(?:ws/)?comments/(?P<ticket_id>\w+)/$', consumers.CommentConsumer.as_asgi()),
]