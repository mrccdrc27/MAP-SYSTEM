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

# serializers.py

from rest_framework import serializers
from tickets.models import WorkflowTicket
from workflow.models import Workflows
from .utils import manually_assign_task  # adjust import path

class ManualTaskAssignmentSerializer(serializers.Serializer):
    ticket_id = serializers.PrimaryKeyRelatedField(queryset=WorkflowTicket.objects.all())
    workflow_id = serializers.PrimaryKeyRelatedField(queryset=Workflows.objects.all())

    def validate(self, data):
        ticket = data['ticket_id']
        workflow = data['workflow_id']

        if ticket.is_task_allocated:
            raise serializers.ValidationError("Ticket is already assigned to a task.")
        if workflow.status != "initialized":
            raise serializers.ValidationError("Workflow must be in 'initialized' status.")
        return data

    def create(self, validated_data):
        ticket = validated_data['ticket_id']
        workflow = validated_data['workflow_id']

        success = manually_assign_task(ticket, workflow)
        if not success:
            raise serializers.ValidationError("Failed to assign task. Try again later.")
        return {"ticket_id": ticket.id, "workflow_id": workflow.id}


from rest_framework import serializers

class TaskAssignmentSerializer(serializers.Serializer):
    ticket_id = serializers.CharField()
    workflow_id = serializers.CharField()
