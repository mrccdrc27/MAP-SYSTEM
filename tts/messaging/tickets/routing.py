from django.urls import re_path
from . import consumers

websocket_urlpatterns = [
    # Support both direct WebSocket (ws/tickets/...) and Kong-proxied (tickets/...)
    re_path(r'^(?:ws/)?tickets/(?P<ticket_id>\w+)/$', consumers.TicketMessagingConsumer.as_asgi()),
]