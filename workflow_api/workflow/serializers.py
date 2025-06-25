from rest_framework import serializers
from django.db import transaction
from django.db import models
from .models import Workflows, Category
from step.models import Steps, StepTransition
from role.models import Roles
from action.models import Actions


class CategorySerializer(serializers.ModelSerializer):
    parent_name = serializers.CharField(source='parent.name', read_only=True)

    class Meta:
        model = Category
        fields = ['id', 'name', 'parent', 'parent_name']


class WorkflowSerializer(serializers.ModelSerializer):
    category = serializers.CharField(max_length=64)
    sub_category = serializers.CharField(max_length=64)

    # Add SLA duration fields as ISO 8601 durations or human-readable strings
    low_sla = serializers.DurationField(required=False, allow_null=True)
    medium_sla = serializers.DurationField(required=False, allow_null=True)
    high_sla = serializers.DurationField(required=False, allow_null=True)
    urgent_sla = serializers.DurationField(required=False, allow_null=True)

    class Meta:
        model = Workflows
        fields = (
            "user_id",
            "workflow_id",
            "name",
            "description",
            "category",
            "sub_category",
            "status",
            "is_published",
            "low_sla",
            "medium_sla",
            "high_sla",
            "urgent_sla",
        )
        read_only_fields = ("workflow_id",)

    def validate(self, data):
        """
        Validate that urgent < high < medium < low
        """
        sla_keys = ["urgent_sla", "high_sla", "medium_sla", "low_sla"]
        sla_values = [data.get(key) for key in sla_keys]

        for i in range(len(sla_values) - 1):
            a = sla_values[i]
            b = sla_values[i + 1]
            if a is not None and b is not None and a >= b:
                raise serializers.ValidationError(
                    f"{sla_keys[i]} should be less than {sla_keys[i + 1]} (urgent < high < medium < low)"
                )
        return data

class RoleSerializer(serializers.ModelSerializer):
    class Meta:
        model = Roles
        fields = ['role_id', 'name', 'description']


class StepSerializer(serializers.ModelSerializer):
    role_name = serializers.SerializerMethodField()
    class Meta:
        model = Steps
        fields = [
            'step_id', 'name', 'description', 'order',
            'is_initialized', 'created_at', 'updated_at',
            'role_name', 
            'workflow_id'
        ]

    def get_role_name(self, obj):
        return obj.role_id.name if obj.role_id else None


class StepTransitionSerializer(serializers.ModelSerializer):
    class Meta:
        model = StepTransition
        fields = ['transition_id', 'from_step_id', 'to_step_id', 'action_id']


class ActionSerializer(serializers.ModelSerializer):
    class Meta:
        model = Actions
        fields = ['action_id', 'name', 'description']


class WorkflowAggregatedSerializer(serializers.ModelSerializer):
    # expose raw string fields instead of nested CategorySerializer
    category = serializers.CharField(read_only=True)
    sub_category = serializers.CharField(read_only=True)

    class Meta:
        model = Workflows
        fields = '__all__'

class FullWorkflowSerializer(serializers.Serializer):
    workflow = serializers.SerializerMethodField()

    def get_workflow(self, obj: Workflows):
        # still filter steps by workflow_id
        steps = Steps.objects.filter(workflow_id=obj.workflow_id)
        step_ids = steps.values_list('step_id', flat=True)

        transitions = StepTransition.objects.filter(
            models.Q(from_step_id__in=step_ids) | models.Q(to_step_id__in=step_ids)
        )
        action_ids = transitions.values_list('action_id', flat=True)
        role_ids = steps.values_list('role_id', flat=True).distinct()

        base = WorkflowAggregatedSerializer(obj).data
        return {
            **base,
            "roles": RoleSerializer(Roles.objects.filter(role_id__in=role_ids), many=True).data if role_ids else [],
            "steps": StepSerializer(steps, many=True).data,
            "transitions": StepTransitionSerializer(transitions, many=True).data,
            "actions": ActionSerializer(Actions.objects.filter(action_id__in=action_ids), many=True).data,
        }
