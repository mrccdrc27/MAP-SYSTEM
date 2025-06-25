# notifications/views.py

from rest_framework import generics, permissions
from rest_framework.response import Response
from .models import Notification
from .serializers import NotificationSerializer

class NotificationListView(generics.ListAPIView):
    serializer_class = NotificationSerializer
    # permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        return Notification.objects.filter(
            user=self.request.user,
            is_read=False
        ).order_by('-created_at')
class NotificationMarkReadView(generics.UpdateAPIView):
    serializer_class = NotificationSerializer
    # permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        return Notification.objects.filter(user=self.request.user)

    def patch(self, request, *args, **kwargs):
        instance = self.get_object()
        instance.is_read = True
        instance.save()
        return Response({'status': 'marked as read'})
