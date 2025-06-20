from rest_framework import serializers
from .models import WorkflowTicket

class WorkflowTicketSerializer(serializers.ModelSerializer):
    class Meta:
        model = WorkflowTicket
        fields = '__all__'
        read_only_fields = ['id', 'created_at', 'updated_at']

class WorkflowTicketCreateSerializer(serializers.ModelSerializer):
    """Serializer for creating workflow tickets from ticket service"""
    class Meta:
        model = WorkflowTicket
        fields = '__all__'
        read_only_fields = ['id', 'created_at', 'updated_at']



class WorkflowTicketSerializer(serializers.ModelSerializer):
    """
    Full serializer for WorkflowTicket with all fields
    """
    
    class Meta:
        model = WorkflowTicket
        fields =  '__all__'
        read_only_fields = [
            'id',
            'created_at',
            'updated_at',
            'is_task_allocated',
        ]


class WorkflowTicketListSerializer(serializers.ModelSerializer):
    """
    Lightweight serializer for listing tickets with essential fields only
    """
    
    class Meta:
        model = WorkflowTicket
        fields = '__all__'


class WorkflowTicketDetailSerializer(serializers.ModelSerializer):
    """
    Detailed serializer with computed fields and formatted data
    """
    
    priority_display = serializers.CharField(source='get_priority_display', read_only=True)
    status_display = serializers.CharField(source='get_status_display', read_only=True)
    days_since_opened = serializers.SerializerMethodField()
    workflow_ticket_reference = serializers.SerializerMethodField()
    
    class Meta:
        model = WorkflowTicket
        fields =  '__all__'
        read_only_fields = [
            'id',
            'created_at',
            'updated_at',
            'is_task_allocated',
            'priority_display',
            'status_display',
            'days_since_opened',
            'workflow_ticket_reference',
        ]
    
    # def get_days_since_opened(self, obj):
    #     """Calculate days since ticket was opened"""
    #     from django.utils import timezone
    #     if obj.opened_on:
    #         today = timezone.now().date()
    #         return (today - obj.opened_on).days
    #     return None
    
    def get_workflow_ticket_reference(self, obj):
        """Generate workflow ticket reference"""
        return f"WF-{obj.id}"
