"""
Serializers for audit event models.
"""

from rest_framework import serializers
from .models import AuditEvent, AuditLog


class AuditEventSerializer(serializers.ModelSerializer):
    """Serializer for AuditEvent model"""
    
    action_display = serializers.CharField(source='get_action_display', read_only=True)
    human_readable = serializers.SerializerMethodField()
    
    class Meta:
        model = AuditEvent
        fields = [
            'id', 'user_id', 'username', 'email',
            'action', 'action_display',
            'target_type', 'target_id',
            'content_type', 'object_id',
            'changes', 'description', 'human_readable',
            'timestamp', 'ip_address', 'user_agent'
        ]
        read_only_fields = fields
    
    def get_human_readable(self, obj):
        """Get human-readable description"""
        return obj.get_human_readable_description()


class AuditLogSerializer(serializers.ModelSerializer):
    """Serializer for AuditLog model"""
    
    class Meta:
        model = AuditLog
        fields = [
            'id', 'user_id', 'username', 'action',
            'entity_type', 'entity_id', 'details', 'timestamp'
        ]
        read_only_fields = fields
