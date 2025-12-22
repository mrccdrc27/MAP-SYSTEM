from django.urls import re_path
from . import consumers

websocket_urlpatterns = [
    re_path(r'ws/comments/(?P<ticket_id>\w+)/$', consumers.CommentConsumer.as_asgi()),
]