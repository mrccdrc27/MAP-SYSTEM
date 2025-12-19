from rest_framework import serializers
from django.core.exceptions import ValidationError
from .models import Workflows
from step.models import Steps, StepTransition
from role.models import Roles
import logging

logger = logging.getLogger(__name__)


class GraphNodeDesignSerializer(serializers.Serializer):
    """Serializer for node design coordinates"""
    x = serializers.FloatField(required=False)
    y = serializers.FloatField(required=False)


class GraphNodeSerializer(serializers.Serializer):
    """Serializer for graph nodes with support for temporary IDs"""
    id = serializers.CharField()  # Can be integer or temp-id string
    name = serializers.CharField(max_length=64, required=False)
    role = serializers.CharField(max_length=64, required=False)
    description = serializers.CharField(max_length=256, required=False, allow_blank=True)
    instruction = serializers.CharField(required=False, allow_blank=True)
    design = GraphNodeDesignSerializer(required=False)
    to_delete = serializers.BooleanField(default=False, required=False)
    is_start = serializers.BooleanField(default=False, required=False)
    is_end = serializers.BooleanField(default=False, required=False)
    
    def validate_id(self, value):
        """Validate that id is either an integer or temp-id string"""
        try:
            int(value)
        except ValueError:
            if not value.startswith('temp-'):
                raise serializers.ValidationError(
                    "Node id must be an integer or start with 'temp-'"
                )
        return value


class GraphEdgeSerializer(serializers.Serializer):
    """Serializer for graph edges with support for temporary IDs"""
    id = serializers.CharField()  # Can be integer or temp-id string
    from_field = serializers.CharField(source='from')  # Can be integer or temp-id string
    to_field = serializers.CharField(source='to')  # Can be integer or temp-id string
    name = serializers.CharField(max_length=64, required=False, allow_blank=True)
    design = GraphNodeDesignSerializer(required=False)  # Add design field for handles
    to_delete = serializers.BooleanField(default=False, required=False)
    
    def validate_id(self, value):
        """Validate that id is either an integer or temp-id string"""
        try:
            int(value)
        except ValueError:
            if not value.startswith('temp-'):
                raise serializers.ValidationError(
                    "Edge id must be an integer or start with 'temp-'"
                )
        return value
    
    def to_representation(self, instance):
        """Override to return 'from' and 'to' in response"""
        ret = super().to_representation(instance)
        if 'from_field' in ret:
            ret['from'] = ret.pop('from_field')
        if 'to_field' in ret:
            ret['to'] = ret.pop('to_field')
        return ret
    
    def to_internal_value(self, data):
        """Override to accept 'from' and 'to' in request"""
        if 'from' in data:
            data['from_field'] = data.pop('from')
        if 'to' in data:
            data['to_field'] = data.pop('to')
        return super().to_internal_value(data)


class UpdateWorkflowGraphSerializer(serializers.Serializer):
    """
    Serializer for batch updating workflow graph (nodes and edges).
    Supports create, update, and delete operations.
    
    Example:
    {
        "nodes": [
            {"id": 1, "name": "Updated Node", "role": "Admin"},
            {"id": "temp-1", "name": "New Node", "role": "User", "design": {"x": 100, "y": 200}},
            {"id": 5, "to_delete": true}
        ],
        "edges": [
            {"id": 1, "from_node": 1, "to_node": 2, "name": "Edge Name"},
            {"id": "temp-e1", "from_node": 1, "to_node": "temp-1", "name": "New Edge"},
            {"id": 10, "to_delete": true}
        ]
    }
    """
    nodes = GraphNodeSerializer(many=True, required=False)
    edges = GraphEdgeSerializer(many=True, required=False)
    
    def validate(self, data):
        nodes = data.get('nodes', [])
        start_nodes = [node for node in nodes if node.get('is_start', False)]
        if len(start_nodes) != 1:
            raise serializers.ValidationError("There must be exactly one start node.")
        return data


class WorkflowBasicSerializer(serializers.ModelSerializer):
    """Basic serializer for workflow list views"""
    class Meta:
        model = Workflows
        fields = [
            'workflow_id',
            'name',
            'description',
            'category',
            'sub_category',
            'department',
            'is_published',
            'status',
            'created_at',
            'updated_at',
        ]


class CreateWorkflowSerializer(serializers.ModelSerializer):
    """Serializer for creating new workflows"""
    class Meta:
        model = Workflows
        fields = [
            'name',
            'description',
            'category',
            'sub_category',
            'department',
            'end_logic',
            'low_sla',
            'medium_sla',
            'high_sla',
            'urgent_sla',
        ]


class UpdateWorkflowDetailsSerializer(serializers.Serializer):
    """Serializer for updating workflow metadata"""
    name = serializers.CharField(max_length=64, required=False)
    description = serializers.CharField(max_length=256, required=False, allow_blank=True)
    category = serializers.CharField(max_length=64, required=False)
    sub_category = serializers.CharField(max_length=64, required=False)
    department = serializers.CharField(max_length=64, required=False)
    end_logic = serializers.CharField(max_length=32, required=False, allow_blank=True)
    low_sla = serializers.DurationField(required=False)
    medium_sla = serializers.DurationField(required=False)
    high_sla = serializers.DurationField(required=False)
    urgent_sla = serializers.DurationField(required=False)


class WorkflowDetailSerializer(serializers.ModelSerializer):
    """Detailed serializer for workflow with all information"""
    class Meta:
        model = Workflows
        fields = [
            'workflow_id',
            'user_id',
            'name',
            'description',
            'category',
            'sub_category',
            'department',
            'end_logic',
            'is_published',
            'status',
            'low_sla',
            'medium_sla',
            'high_sla',
            'urgent_sla',
            'created_at',
            'updated_at',
        ]


class StepSerializer(serializers.ModelSerializer):
    """Serializer for step details"""
    role_name = serializers.CharField(source='role_id.name', read_only=True)
    
    class Meta:
        model = Steps
        fields = [
            'step_id',
            'workflow_id',
            'role_id',
            'role_name',
            'name',
            'description',
            'instruction',
            'order',
            'design',
            'is_initialized',
            'created_at',
            'updated_at',
        ]
        read_only_fields = ['step_id', 'workflow_id', 'created_at', 'updated_at']


class UpdateStepDetailsSerializer(serializers.Serializer):
    """Serializer for updating step details (non-relationship fields)"""
    name = serializers.CharField(max_length=64, required=False)
    description = serializers.CharField(max_length=256, required=False, allow_blank=True)
    instruction = serializers.CharField(required=False, allow_blank=True)
    order = serializers.IntegerField(required=False)
    design = GraphNodeDesignSerializer(required=False)


class TransitionSerializer(serializers.ModelSerializer):
    """Serializer for transition details"""
    from_step_name = serializers.CharField(source='from_step_id.name', read_only=True)
    to_step_name = serializers.CharField(source='to_step_id.name', read_only=True)
    
    class Meta:
        model = StepTransition
        fields = [
            'transition_id',
            'workflow_id',
            'from_step_id',
            'from_step_name',
            'to_step_id',
            'to_step_name',
            'name',
            'created_at',
            'updated_at',
        ]
        read_only_fields = ['transition_id', 'workflow_id', 'created_at', 'updated_at']


class UpdateTransitionDetailsSerializer(serializers.Serializer):
    """Serializer for updating transition details (name only)"""
    name = serializers.CharField(max_length=64, required=False, allow_blank=True)


class CreateWorkflowWithGraphSerializer(serializers.Serializer):
    """
    Serializer for creating a complete workflow with graph in a single request.
    
    Example:
    {
        "workflow": {
            "name": "Infrastructure Workflow",
            "description": "Handles IT reset requests",
            "category": "IT",
            "sub_category": "Support",
            "department": "IT Support",
            "end_logic": "",
            "low_sla": "P7D",
            "medium_sla": "P5D",
            "high_sla": "P3D",
            "urgent_sla": "P1D"
        },
        "graph": {
            "nodes": [
                {
                    "id": "temp-1",
                    "name": "Request Received",
                    "role": "System",
                    "description": "",
                    "instruction": "",
                    "design": {}
                },
                {
                    "id": "temp-2",
                    "name": "Reset Password",
                    "role": "Admin",
                    "description": "",
                    "instruction": "",
                    "design": {}
                }
            ],
            "edges": [
                {
                    "id": "temp-101",
                    "from": "temp-1",
                    "to": "temp-2",
                    "name": ""
                }
            ]
        }
    }
    """
    
    class WorkflowDataSerializer(serializers.Serializer):
        """Nested serializer for workflow metadata"""
        name = serializers.CharField(max_length=64)
        description = serializers.CharField(max_length=256, required=False, allow_blank=True)
        category = serializers.CharField(max_length=64)
        sub_category = serializers.CharField(max_length=64)
        department = serializers.CharField(max_length=64)
        end_logic = serializers.CharField(max_length=32, required=False, allow_blank=True)
        low_sla = serializers.DurationField(required=False)
        medium_sla = serializers.DurationField(required=False)
        high_sla = serializers.DurationField(required=False)
        urgent_sla = serializers.DurationField(required=False)
    
    workflow = WorkflowDataSerializer()
    graph = UpdateWorkflowGraphSerializer(required=False)
    
    def validate_workflow(self, value):
        """Validate workflow data"""
        # Check if workflow name is unique
        if Workflows.objects.filter(name=value.get('name')).exists():
            raise serializers.ValidationError(
                f"Workflow with name '{value.get('name')}' already exists"
            )
        return value
    
    def validate_graph(self, value):
        """Validate graph structure"""
        if not value:
            return value
        
        nodes = value.get('nodes', [])
        edges = value.get('edges', [])
        
        # Validate edges reference existing nodes
        node_ids = {str(node.get('id')) for node in nodes}
        
        for edge in edges:
            from_id = str(edge.get('from', ''))
            to_id = str(edge.get('to', ''))
            
            if from_id and from_id not in node_ids:
                raise serializers.ValidationError(
                    f"Edge references non-existent from node: {from_id}"
                )
            if to_id and to_id not in node_ids:
                raise serializers.ValidationError(
                    f"Edge references non-existent to node: {to_id}"
                )
        
        # Validate all node roles exist
        for node in nodes:
            role_name = node.get('role')
            if role_name and not node.get('to_delete', False):
                if not Roles.objects.filter(name=role_name).exists():
                    raise serializers.ValidationError(
                        f"Role '{role_name}' does not exist"
                    )
        
        return value
