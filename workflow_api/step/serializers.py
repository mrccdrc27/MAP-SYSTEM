from rest_framework import serializers
from .models import Steps, StepTransition
from role.models import Roles


class RoleSerializer(serializers.ModelSerializer):
    """Simple serializer for role information"""
    class Meta:
        model = Roles
        fields = ['role_id', 'name']
        read_only_fields = fields


class StepDetailSerializer(serializers.ModelSerializer):
    """Detailed step information including role details"""
    role_name = serializers.CharField(source='role_id.name', read_only=True)
    workflow_name = serializers.CharField(source='workflow_id.name', read_only=True)
    escalate_to_name = serializers.CharField(source='escalate_to.name', read_only=True, allow_null=True)
    
    class Meta:
        model = Steps
        fields = [
            'step_id',
            'workflow_id',
            'workflow_name',
            'role_id',
            'role_name',
            'escalate_to',
            'escalate_to_name',
            'name',
            'description',
            'instruction',
            'order',
            'is_initialized',
            'created_at',
            'updated_at',
        ]
        read_only_fields = ['step_id', 'workflow_id', 'workflow_name', 'role_id', 'role_name', 'escalate_to_name', 'created_at', 'updated_at']


class StepTransitionSerializer(serializers.ModelSerializer):
    """Serializer for step transitions with related step details"""
    from_step_name = serializers.CharField(source='from_step_id.name', read_only=True)
    to_step_name = serializers.CharField(source='to_step_id.name', read_only=True)
    to_step_role = serializers.CharField(source='to_step_id.role_id.name', read_only=True)
    
    class Meta:
        model = StepTransition
        fields = [
            'transition_id',
            'workflow_id',
            'from_step_id',
            'from_step_name',
            'to_step_id',
            'to_step_name',
            'to_step_role',
            'name',
        ]
        read_only_fields = fields


class AvailableTransitionSerializer(serializers.ModelSerializer):
    """
    Serializer for available transitions from a current step.
    Used in the list-transitions endpoint.
    """
    to_step_name = serializers.CharField(source='to_step_id.name', read_only=True)
    to_step_description = serializers.CharField(source='to_step_id.description', read_only=True)
    to_step_order = serializers.IntegerField(source='to_step_id.order', read_only=True)
    to_step_role = serializers.CharField(source='to_step_id.role_id.name', read_only=True)
    to_step_instruction = serializers.CharField(source='to_step_id.instruction', read_only=True)
    
    class Meta:
        model = StepTransition
        fields = [
            'transition_id',
            'from_step_id',
            'to_step_id',
            'to_step_name',
            'to_step_description',
            'to_step_instruction',
            'to_step_order',
            'to_step_role',
            'name',
        ]
        read_only_fields = fields


class StepWeightSerializer(serializers.ModelSerializer):
    """Serializer for step weight information"""
    role_name = serializers.CharField(source='role_id.name', read_only=True)
    
    class Meta:
        model = Steps
        fields = [
            'step_id',
            'name',
            'weight',
            'role_id',
            'role_name',
            'order',
        ]
        read_only_fields = ['step_id', 'name', 'role_id', 'role_name', 'order']


class WorkflowSLASerializer(serializers.Serializer):
    """Serializer for workflow SLA information"""
    low_sla = serializers.DurationField(allow_null=True)
    medium_sla = serializers.DurationField(allow_null=True)
    high_sla = serializers.DurationField(allow_null=True)
    urgent_sla = serializers.DurationField(allow_null=True)


class WeightManagementSerializer(serializers.Serializer):
    """Serializer for weight management endpoint - returns workflow SLAs and steps with weights"""
    workflow_id = serializers.IntegerField()
    workflow_name = serializers.CharField()
    slas = WorkflowSLASerializer()
    steps = StepWeightSerializer(many=True)
