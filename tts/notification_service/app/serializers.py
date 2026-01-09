#tts_/notification_service/app/serializers.py
from rest_framework import serializers
from .models import InAppNotification, NOTIFICATION_TYPE_CHOICES

class InAppNotificationSerializer(serializers.ModelSerializer):
    """
    Serializer for InAppNotification model
    """
    notification_type_display = serializers.CharField(source='get_notification_type_display', read_only=True)
    
    class Meta:
        model = InAppNotification
        fields = '__all__'
        read_only_fields = ['id', 'created_at', 'read_at']

class InAppNotificationCreateSerializer(serializers.ModelSerializer):
    """
    Serializer for creating a new InAppNotification
    """
    class Meta:
        model = InAppNotification
        fields = ['user_id', 'subject', 'message', 'notification_type', 'related_ticket_number', 'metadata']
        
class InAppNotificationUpdateSerializer(serializers.ModelSerializer):
    """
    Serializer for updating an InAppNotification (primarily marking as read)
    """
    class Meta:
        model = InAppNotification
        fields = ['is_read']

class MarkNotificationAsReadSerializer(serializers.Serializer):
    """
    Serializer for marking a notification as read
    """
    notification_id = serializers.UUIDField(
        required=True,
        help_text="UUID of the notification to mark as read"
    )

class NotificationTypeSerializer(serializers.Serializer):
    """
    Serializer for listing available notification types
    """
    value = serializers.CharField()
    display = serializers.CharField()