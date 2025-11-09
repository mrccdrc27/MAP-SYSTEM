from rest_framework import serializers
from .models import Task
from tickets.models import WorkflowTicket
from workflow.models import Workflows
from step.models import Steps

class TaskSerializer(serializers.ModelSerializer):
    ticket_subject = serializers.CharField(source='ticket_id.subject', read_only=True)
    workflow_name = serializers.CharField(source='workflow_id.name', read_only=True)
    current_step_name = serializers.CharField(source='current_step.name', read_only=True)
    current_step_role = serializers.CharField(source='current_step.role_id.name', read_only=True)
    assigned_users_count = serializers.SerializerMethodField()
    
    class Meta:
        model = Task
        fields = [
            'task_id', 'ticket_id', 'workflow_id', 'current_step',
            'users', 'status', 'created_at', 'updated_at', 'fetched_at',
            # Read-only fields for easier frontend consumption
            'ticket_subject', 'workflow_name', 'current_step_name', 
            'current_step_role', 'assigned_users_count'
        ]
        read_only_fields = ['task_id', 'created_at', 'updated_at']
    
    def get_assigned_users_count(self, obj):
        """Return the count of assigned users"""
        return len(obj.users) if obj.users else 0
    
    def validate_users(self, value):
        """Validate the users JSON structure"""
        if not isinstance(value, list):
            raise serializers.ValidationError("Users must be a list")
        
        for user in value:
            if not isinstance(user, dict):
                raise serializers.ValidationError("Each user must be a dictionary")
            
            required_fields = ['userID', 'status', 'assigned_on', 'role']
            for field in required_fields:
                if field not in user:
                    raise serializers.ValidationError(f"User missing required field: {field}")
        
        return value

class TaskCreateSerializer(serializers.ModelSerializer):
    """Simplified serializer for creating tasks manually"""
    class Meta:
        model = Task
        fields = ['ticket_id', 'workflow_id', 'current_step', 'status']
    
    def create(self, validated_data):
        # Set default values
        validated_data['users'] = []
        return super().create(validated_data)

class UserAssignmentSerializer(serializers.Serializer):
    """Serializer for user assignment data"""
    userID = serializers.IntegerField()
    username = serializers.CharField(max_length=150, required=False, allow_blank=True)
    email = serializers.EmailField(required=False, allow_blank=True)
    status = serializers.CharField(max_length=50, default='assigned')
    role = serializers.CharField(max_length=100, required=False, allow_blank=True)
    
    def validate_status(self, value):
        valid_statuses = ['assigned', 'in_progress', 'completed', 'on_hold']
        if value not in valid_statuses:
            raise serializers.ValidationError(f"Status must be one of: {valid_statuses}")
        return value
