from rest_framework import serializers
from .models import Task, TaskItem
from tickets.models import WorkflowTicket
from workflow.models import Workflows
from step.models import Steps

class TaskItemSerializer(serializers.ModelSerializer):
    """Serializer for TaskItem (user assignment in a task)"""
    acted_on_step_name = serializers.CharField(source='acted_on_step.name', read_only=True, allow_null=True)
    acted_on_step_id = serializers.IntegerField(source='acted_on_step.step_id', read_only=True, allow_null=True)
    
    class Meta:
        model = TaskItem
        fields = [
            'task_item_id', 'user_id', 'username', 'email', 'status', 
            'role', 'notes', 'assigned_on', 'status_updated_on', 'acted_on',
            'acted_on_step_id', 'acted_on_step_name', 'target_resolution', 'resolution_time'
        ]
        read_only_fields = ['task_item_id', 'assigned_on', 'target_resolution', 'resolution_time']
    
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
    
    def create(self, validated_data):
        return super().create(validated_data)

class UserAssignmentSerializer(serializers.Serializer):
    """Serializer for user assignment data"""
    user_id = serializers.IntegerField()
    username = serializers.CharField(max_length=150, required=False, allow_blank=True)
    email = serializers.EmailField(required=False, allow_blank=True)
    status = serializers.CharField(max_length=50, default='assigned')
    role = serializers.CharField(max_length=100, required=False, allow_blank=True)
    
    def validate_status(self, value):
        valid_statuses = ['assigned', 'in_progress', 'completed', 'on_hold', 'acted']
        if value not in valid_statuses:
            raise serializers.ValidationError(f"Status must be one of: {valid_statuses}")
        return value

class UserAssignmentDetailSerializer(serializers.Serializer):
    """Serializer for individual user assignment in a task"""
    user_id = serializers.IntegerField()
    username = serializers.CharField(max_length=150, required=False, allow_blank=True)
    email = serializers.EmailField(required=False, allow_blank=True)
    status = serializers.CharField(max_length=50)
    assigned_on = serializers.DateTimeField()
    role = serializers.CharField(max_length=100, required=False, allow_blank=True)
    status_updated_on = serializers.DateTimeField(required=False, allow_null=True)
    acted_on = serializers.DateTimeField(required=False, allow_null=True)


class UserTaskListSerializer(serializers.ModelSerializer):
    """
    Serializer for displaying tasks assigned to a specific user.
    Returns task details with related information for easy frontend consumption.
    """
    ticket_subject = serializers.SerializerMethodField()
    ticket_description = serializers.SerializerMethodField()
    ticket_number = serializers.SerializerMethodField()
    workflow_name = serializers.CharField(source='workflow_id.name', read_only=True)
    current_step_name = serializers.CharField(source='current_step.name', read_only=True)
    current_step_role = serializers.CharField(source='current_step.role_id.name', read_only=True, allow_null=True)
    user_assignment = serializers.SerializerMethodField()
    has_acted = serializers.SerializerMethodField()
    
    class Meta:
        model = Task
        fields = [
            'task_id',
            'ticket_id',
            'ticket_subject',
            'ticket_description',
            'ticket_number',
            'workflow_id',
            'workflow_name',
            'current_step',
            'current_step_name',
            'current_step_role',
            'status',
            'user_assignment',
            'has_acted',
            'created_at',
            'updated_at',
            'fetched_at',
            'target_resolution',
        ]
        read_only_fields = fields
    
    def get_ticket_subject(self, obj):
        """Extract subject from ticket_data"""
        return obj.ticket_id.ticket_data.get('subject', '')
    
    def get_ticket_description(self, obj):
        """Extract description from ticket_data"""
        return obj.ticket_id.ticket_data.get('description', '')
    
    def get_ticket_number(self, obj):
        """Get ticket number"""
        return obj.ticket_id.ticket_number
    
    def get_user_assignment(self, obj):
        """
        Extract the current user's assignment details from TaskItem.
        Called when filtering by user_id.
        """
        user_id = self.context.get('user_id')
        if user_id:
            try:
                task_item = TaskItem.objects.select_related('acted_on_step').get(task=obj, user_id=user_id)
                return {
                    'user_id': task_item.user_id,
                    'username': task_item.username,
                    'email': task_item.email,
                    'status': task_item.status,
                    'role': task_item.role,
                    'assigned_on': task_item.assigned_on,
                    'status_updated_on': task_item.status_updated_on,
                    'acted_on': task_item.acted_on,
                    'target_resolution': task_item.target_resolution,
                    'acted_on_step': {
                        'step_id': task_item.acted_on_step.step_id,
                        'name': task_item.acted_on_step.name
                    } if task_item.acted_on_step else None,
                }
            except TaskItem.DoesNotExist:
                return None
        return None
    
    def get_has_acted(self, obj):
        """
        Check if the current user has already acted on this task.
        Returns True if user has any TaskItem with status 'acted', False otherwise.
        """
        user_id = self.context.get('user_id')
        if user_id:
            return TaskItem.objects.filter(
                task=obj,
                user_id=user_id,
                status='acted'
            ).exists()
        return False

class ActionLogSerializer(serializers.Serializer):
    """
    Serializer for action logs - converts TaskItem records into action log format.
    Infers role from the acted_on_step's role_id.
    Includes the full name of the user who performed the action.
    """
    id = serializers.IntegerField(source='task_item_id')
    action = serializers.SerializerMethodField()
    acted_on = serializers.DateTimeField()
    # user = serializers.CharField(source='username')
    user = serializers.CharField(source='name', allow_null=True)
    role = serializers.SerializerMethodField()
    comment = serializers.CharField(source='notes', allow_null=True)
    
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
        """Get role from the acted_on_step's role_id"""
        if obj.acted_on_step and obj.acted_on_step.role_id:
            return obj.acted_on_step.role_id.name
        return obj.role or None
