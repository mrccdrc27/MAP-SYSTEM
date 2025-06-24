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
    # Now plain text fields, not slug‐related
    category = serializers.CharField(max_length=64)
    sub_category = serializers.CharField(max_length=64)

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
        )
        read_only_fields = ("id", "status", "workflow_id")

    def update_status(self, workflow):
        """
        Determines whether a workflow should be marked as 'initialized'.
        """
        steps = Steps.objects.filter(workflow_id=workflow)
        if steps.exists():
            all_initialized = all(
                StepTransition.objects.filter(
                    models.Q(from_step_id=step) | models.Q(to_step_id=step)
                ).exists()
                for step in steps
            )
            workflow.status = "initialized" if all_initialized else "draft"
        else:
            workflow.status = "draft"
        workflow.save(update_fields=["status"])

    def create(self, validated_data):
        with transaction.atomic():
            workflow = Workflows.objects.create(**validated_data)
            return workflow

    def update(self, instance, validated_data):
        is_published = validated_data.get("is_published", instance.is_published)
        if is_published and instance.status != "initialized":
            raise serializers.ValidationError(
                "Workflow must be in 'initialized' state before it can be published."
            )
        return super().update(instance, validated_data)


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
        fields = [
            'workflow_id', 'user_id', 'name', 'description',
            'status', 'created_at', 'updated_at',
            'category', 'sub_category'
        ]


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
