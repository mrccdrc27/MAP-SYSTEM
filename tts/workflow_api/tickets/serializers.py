from rest_framework import serializers
from .models import WorkflowTicket

class WorkflowTicketSerializer(serializers.ModelSerializer):
    """Serializer for WorkflowTicket/TicketSnapshot with all fields"""
    class Meta:
        model = WorkflowTicket
        fields = ['id', 'ticket_number', 'fetched_at', 'ticket_data', 'is_task_allocated', 'created_at', 'updated_at']
        read_only_fields = ['id', 'created_at', 'updated_at', 'fetched_at']

class WorkflowTicketCreateSerializer(serializers.ModelSerializer):
    """Serializer for creating workflow tickets from ticket service"""
    class Meta:
        model = WorkflowTicket
        fields = ['ticket_number', 'ticket_data', 'is_task_allocated']


class WorkflowTicketListSerializer(serializers.ModelSerializer):
    """
    Lightweight serializer for listing tickets with essential fields only
    """
    
    class Meta:
        model = WorkflowTicket
        fields = ['id', 'ticket_number', 'fetched_at', 'ticket_data', 'is_task_allocated']


class WorkflowTicketDetailSerializer(serializers.ModelSerializer):
    """
    Detailed serializer with convenience access to ticket_data fields
    """
    
    subject = serializers.SerializerMethodField()
    status = serializers.SerializerMethodField()
    department = serializers.SerializerMethodField()
    
    class Meta:
        model = WorkflowTicket
        fields = ['id', 'ticket_number', 'fetched_at', 'ticket_data', 'is_task_allocated', 
                  'subject', 'status', 'department', 'created_at', 'updated_at']
        read_only_fields = [
            'id',
            'created_at',
            'updated_at',
            'is_task_allocated',
            'subject',
            'status',
            'department',
        ]
    
    def get_subject(self, obj):
        """Extract subject from ticket_data"""
        return obj.ticket_data.get('subject', '')
    
    def get_status(self, obj):
        """Extract status from ticket_data"""
        return obj.ticket_data.get('status', '')
    
    def get_department(self, obj):
        """Extract department from ticket_data"""
        return obj.ticket_data.get('department', '')

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
