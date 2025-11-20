from rest_framework import serializers
from .models import Task, TaskItem
from tickets.models import WorkflowTicket
from workflow.models import Workflows
from step.models import Steps

class TaskItemSerializer(serializers.ModelSerializer):
    """Serializer for TaskItem (user assignment in a task)"""
    user_id = serializers.IntegerField(source='role_user.user_id', read_only=True)
    user_full_name = serializers.CharField(source='role_user.user_full_name', read_only=True)
    role = serializers.CharField(source='role_user.role_id.name', read_only=True)
    acted_on_step_name = serializers.CharField(source='acted_on_step.name', read_only=True, allow_null=True)
    acted_on_step_id = serializers.IntegerField(source='acted_on_step.step_id', read_only=True, allow_null=True)
    transferred_to_user_id = serializers.IntegerField(source='transferred_to.user_id', read_only=True, allow_null=True)
    transferred_to_user_name = serializers.CharField(source='transferred_to.user_full_name', read_only=True, allow_null=True)
    
    class Meta:
        model = TaskItem
        fields = [
            'task_item_id', 'user_id', 'user_full_name', 'status', 'origin',
            'role', 'notes', 'assigned_on', 'status_updated_on', 'acted_on',
            'acted_on_step_id', 'acted_on_step_name', 'target_resolution', 'resolution_time',
            'transferred_to', 'transferred_to_user_id', 'transferred_to_user_name', 'transferred_by'
        ]
        read_only_fields = ['task_item_id', 'assigned_on', 'target_resolution', 'resolution_time', 'transferred_to_user_id', 'transferred_to_user_name', 'origin']
    
    def validate_notes(self, value):
        """Ensure notes field is not empty"""
        if not value or not value.strip():
            raise serializers.ValidationError("Notes cannot be empty. Notes are required for action transitions.")
        return value

class TaskSerializer(serializers.ModelSerializer):
    ticket_subject = serializers.SerializerMethodField()
    ticket_description = serializers.SerializerMethodField()
    workflow_name = serializers.CharField(source='workflow_id.name', read_only=True)
    current_step_name = serializers.CharField(source='current_step.name', read_only=True)
    current_step_role = serializers.CharField(source='current_step.role_id.name', read_only=True)
    assigned_users = serializers.SerializerMethodField()
    assigned_users_count = serializers.SerializerMethodField()
    
    class Meta:
        model = Task
        fields = [
            'task_id', 'ticket_id', 'workflow_id', 'current_step',
            'status', 'created_at', 'updated_at', 'fetched_at',
            'target_resolution', 'resolution_time',
            # Read-only fields for easier frontend consumption
            'ticket_subject', 'ticket_description', 'workflow_name', 'current_step_name', 
            'current_step_role', 'assigned_users', 'assigned_users_count'
        ]
        read_only_fields = ['task_id', 'created_at', 'updated_at', 'target_resolution', 'resolution_time']
    
    def get_ticket_subject(self, obj):
        """Extract subject from ticket_data"""
        return obj.ticket_id.ticket_data.get('subject', '')
    
    def get_ticket_description(self, obj):
        """Extract description from ticket_data"""
        return obj.ticket_id.ticket_data.get('description', '')
    
    def get_assigned_users(self, obj):
        """Return all TaskItems for this task"""
        task_items = TaskItem.objects.filter(task=obj)
        return TaskItemSerializer(task_items, many=True).data
    
    def get_assigned_users_count(self, obj):
        """Return the count of assigned users"""
        return TaskItem.objects.filter(task=obj).count()

class TaskCreateSerializer(serializers.ModelSerializer):
    """Simplified serializer for creating tasks manually"""
    class Meta:
        model = Task
        fields = ['ticket_id', 'workflow_id', 'current_step', 'status']

class UserTaskListSerializer(serializers.ModelSerializer):
    """
    Serializer for displaying TaskItems assigned to a specific user.
    Each row represents a TaskItem with embedded task and ticket data.
    """
    # TaskItem fields
    task_item_id = serializers.IntegerField()
    user_id = serializers.IntegerField(source='role_user.user_id', read_only=True)
    user_full_name = serializers.CharField(source='role_user.user_full_name', read_only=True)
    role = serializers.CharField(source='role_user.role_id.name', read_only=True)
    
    # Task fields
    task_id = serializers.IntegerField(source='task.task_id', read_only=True)
    ticket_id = serializers.IntegerField(source='task.ticket_id.id', read_only=True)
    ticket_number = serializers.SerializerMethodField()
    
    # Ticket data fields
    ticket_subject = serializers.SerializerMethodField()
    ticket_description = serializers.SerializerMethodField()
    ticket_status = serializers.CharField(source='task.ticket_id.status', read_only=True, allow_null=True)
    ticket_priority = serializers.CharField(source='task.ticket_id.priority', read_only=True, allow_null=True)
    
    # Workflow fields
    workflow_id = serializers.IntegerField(source='task.workflow_id.workflow_id', read_only=True)
    workflow_name = serializers.CharField(source='task.workflow_id.name', read_only=True)
    
    # Step fields
    current_step_id = serializers.IntegerField(source='task.current_step.step_id', read_only=True)
    current_step_name = serializers.CharField(source='task.current_step.name', read_only=True)
    current_step_role = serializers.CharField(source='task.current_step.role_id.name', read_only=True, allow_null=True)
    
    # Acted on step
    acted_on_step_id = serializers.IntegerField(source='acted_on_step.step_id', read_only=True, allow_null=True)
    acted_on_step_name = serializers.CharField(source='acted_on_step.name', read_only=True, allow_null=True)
    
    # Task status
    task_status = serializers.CharField(source='task.status', read_only=True)
    
    # Transfer and origin fields
    transferred_to_user_id = serializers.SerializerMethodField()
    transferred_to_user_name = serializers.SerializerMethodField()
    transferred_by = serializers.IntegerField(allow_null=True)
    origin = serializers.CharField()
    resolution_time = serializers.DateTimeField(allow_null=True)
    
    class Meta:
        model = TaskItem
        fields = [
            'task_item_id',
            'user_id',
            'user_full_name',
            'role',
            'status',
            'origin',
            'task_id',
            'ticket_id',
            'ticket_number',
            'ticket_subject',
            'ticket_description',
            'ticket_status',
            'ticket_priority',
            'workflow_id',
            'workflow_name',
            'current_step_id',
            'current_step_name',
            'current_step_role',
            'acted_on_step_id',
            'acted_on_step_name',
            'task_status',
            'assigned_on',
            'status_updated_on',
            'acted_on',
            'target_resolution',
            'resolution_time',
            'notes',
            'transferred_to_user_id',
            'transferred_to_user_name',
            'transferred_by',
        ]
        read_only_fields = fields
    
    def get_transferred_to_user_id(self, obj):
        """Get transferred_to user ID"""
        if obj.transferred_to:
            return obj.transferred_to.user_id
        return None
    
    def get_transferred_to_user_name(self, obj):
        """Get transferred_to user full name"""
        if obj.transferred_to:
            return obj.transferred_to.user_full_name
        return None
    
    def get_ticket_number(self, obj):
        """Get ticket number"""
        return obj.task.ticket_id.ticket_number
    
    def get_ticket_subject(self, obj):
        """Extract subject from ticket_data"""
        return obj.task.ticket_id.ticket_data.get('subject', '')
    
    def get_ticket_description(self, obj):
        """Extract description from ticket_data"""
        return obj.task.ticket_id.ticket_data.get('description', '')

class ActionLogSerializer(serializers.Serializer):
    """
    Serializer for action logs - converts TaskItem records into action log format.
    Infers role from the acted_on_step's role_id.
    Includes the full name of the user who performed the action from RoleUsers.
    """
    id = serializers.IntegerField(source='task_item_id')
    action = serializers.SerializerMethodField()
    acted_on = serializers.DateTimeField()
    user = serializers.SerializerMethodField()
    role = serializers.SerializerMethodField()
    comment = serializers.CharField(source='notes', allow_null=True)
    
    def get_user(self, obj):
        """Get user full name from RoleUsers"""
        if obj.role_user:
            return obj.role_user.user_full_name
        return None
    
    def get_action(self, obj):
        """Infer action name from acted_on_step"""
        if obj.acted_on_step:
            # Try to infer action from step name
            step_name = obj.acted_on_step.name.lower()
            if 'create' in step_name or 'submit' in step_name:
                action_name = 'Created'
            elif 'review' in step_name or 'approve' in step_name:
                action_name = 'Reviewed'
            elif 'reject' in step_name or 'decline' in step_name:
                action_name = 'Rejected'
            elif 'comment' in step_name or 'note' in step_name:
                action_name = 'Added comment'
            else:
                action_name = f'Updated at {obj.acted_on_step.name}'
            return {'name': action_name}
        return {'name': 'Unknown Action'}
    
    def get_role(self, obj):
        """Get role from the RoleUsers relationship"""
        if obj.role_user and obj.role_user.role_id:
            return obj.role_user.role_id.name
        return None
