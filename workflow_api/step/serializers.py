from rest_framework import serializers
from .models import Steps, StepTransition
from role.models import Roles
from action.models import Actions


class StepSerializer(serializers.ModelSerializer):
    is_initialized = serializers.SerializerMethodField()
    class Meta:
        model = Steps
        fields = (
            "id", 
            "step_id",
            "workflow_id",
            "role_id", 
            "name", 
            "description",
            "is_initialized",
            "created_at", 
            "updated_at",
            "instruction"
        )
    def get_is_initialized(self, obj):
        return StepTransition.objects.filter(to_step_id=obj).exists()

# class StepTransitionSerializer(serializers.ModelSerializer):
#     class Meta:
#         model = StepTransition
#         fields = [
#             'id',
#             'from_step',
#             'to_step',
#             'action_id',
#         ]
#         read_only_fields = ['id']

#         # validation: from_step != to_step
#         # from_step workflow must be equal to to_step workflow

class ActionSerializer(serializers.ModelSerializer):
    class Meta:
        model = Actions
        fields = ['id', 'name', 'description']
        read_only_fields = ['id']



from rest_framework import serializers
from .models import StepTransition
from action.models import Actions
from step.models import Steps
from action.serializers import ActionSerializer  # Make sure this exists

class ActionInlineSerializer(serializers.Serializer):
    name = serializers.CharField()
    description = serializers.CharField(allow_blank=True, required=False)

from rest_framework import serializers
from step.models import StepTransition, Steps
from action.models import Actions

class ActionInlineSerializer(serializers.Serializer):
    name = serializers.CharField()
    description = serializers.CharField(allow_blank=True, required=False)

from rest_framework import serializers
from .models import Steps, StepTransition, Actions

class StepTransitionSerializer(serializers.ModelSerializer):
    action = ActionInlineSerializer(write_only=True)
    action_id = serializers.SerializerMethodField(read_only=True)
    action_name = serializers.SerializerMethodField(read_only=True)
    action_description = serializers.SerializerMethodField(read_only=True)

    from_step_id = serializers.SlugRelatedField(
        queryset=Steps.objects.all(),
        slug_field='step_id'
    )
    to_step_id = serializers.SlugRelatedField(
        queryset=Steps.objects.all(),
        slug_field='step_id',
        allow_null=True,
        required=False
    )

    class Meta:
        model = StepTransition
        fields = [
            'id', 'workflow_id', 'transition_id', 
            'from_step_id', 'to_step_id', 
            'action', 'action_id', 'action_name', 'action_description'
        ]
        read_only_fields = ['id', 'action_id', 'action_name', 'action_description']

    def get_action_id(self, obj):
        return obj.action_id.action_id if obj.action_id else None

    def get_action_name(self, obj):
        return obj.action_id.name if obj.action_id else None

    def get_action_description(self, obj):
        return obj.action_id.description if obj.action_id else None

    def validate(self, attrs):
        frm = attrs.get('from_step_id') or getattr(self.instance, 'from_step_id', None)
        to = attrs.get('to_step_id') or getattr(self.instance, 'to_step_id', None)

        if frm and to and frm.pk == to.pk:
            raise serializers.ValidationError("from_step and to_step must be different")
        if frm and to and frm.workflow_id != to.workflow_id:
            raise serializers.ValidationError("from_step and to_step must belong to the same workflow")

        return attrs

    def create(self, validated_data):
        action_data = validated_data.pop('action')
        action, _ = Actions.objects.get_or_create(
            name=action_data['name'],
            defaults={'description': action_data.get('description', '')}
        )
        return StepTransition.objects.create(action_id=action, **validated_data)

    def update(self, instance, validated_data):
        action_data = validated_data.pop('action', None)
        if action_data:
            action, _ = Actions.objects.get_or_create(
                name=action_data['name'],
                defaults={'description': action_data.get('description', '')}
            )
            instance.action_id = action

        instance.from_step_id = validated_data.get('from_step_id', instance.from_step_id)
        instance.to_step_id = validated_data.get('to_step_id', instance.to_step_id)
        instance.workflow_id = validated_data.get('workflow_id', instance.workflow_id)

        instance.full_clean()
        instance.save()
        return instance
