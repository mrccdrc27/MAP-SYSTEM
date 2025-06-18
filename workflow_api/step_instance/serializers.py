from rest_framework import serializers
from .models import StepInstance
from step.models import StepTransition
from action.models import Actions
from action_log.models import ActionLog
class StepInstanceSerializer(serializers.ModelSerializer):
    class Meta:
        model = StepInstance
        fields = '__all__'

class NextStepInstanceSerializer(serializers.Serializer):
    action_id = serializers.CharField()

    def validate(self, data):
        current_instance = self.context['step_instance']
        task = current_instance.task_id
        current_transition = current_instance.step_transition_id
        current_step = current_transition.to_step_id

        # Find next transition matching action
        try:
            next_transition = StepTransition.objects.get(
                from_step_id=current_step,
                action_id__action_id=data['action_id']
            )
        except StepTransition.DoesNotExist:
            raise serializers.ValidationError("Invalid action for this step.")

        data['next_transition'] = next_transition
        data['task'] = task
        return data

    def create(self, validated_data):
        return StepInstance.objects.create(
            task_id=validated_data['task'],
            step_transition_id=validated_data['next_transition'],
            user_id=self.context['request'].user.id  # or pass from context
        )

class TriggerNextStepSerializer(serializers.Serializer):
    action_id = serializers.CharField()
    available_actions = serializers.SerializerMethodField()
    has_acted = serializers.BooleanField(read_only=True)

    def validate_action_id(self, value):
        try:
            return Actions.objects.get(action_id=value)
        except Actions.DoesNotExist:
            raise serializers.ValidationError("Invalid action_id")

    def get_available_actions(self, obj):
        step_instance = self.context.get('step_instance')
        if not step_instance:
            return []

        current_step = step_instance.step_transition_id.to_step_id
        transitions = StepTransition.objects.filter(from_step_id=current_step).select_related('action_id')

        return [
            {
                'action_id': t.action_id.action_id,
                'name': t.action_id.name
            }
            for t in transitions if t.action_id
        ]

    def create(self, validated_data):
        action = validated_data['action_id']
        original_instance = self.context['step_instance']

        # Prevent re-acting
        if original_instance.has_acted:
            raise serializers.ValidationError("This step has already been acted on.")

        try:
            transition = StepTransition.objects.get(action_id=action.action_id)
        except StepTransition.DoesNotExist:
            raise serializers.ValidationError("No transition linked to this action")

        if not transition.to_step_id:
            raise serializers.ValidationError("This transition does not lead to another step (to_step_id is null)")

        # Mark original as acted
        original_instance.has_acted = True
        original_instance.save(update_fields=['has_acted'])

        # Create the next step instance
        new_step_instance = StepInstance.objects.create(
            task_id=original_instance.task_id,
            user_id=original_instance.user_id,
            step_transition_id=transition
        )

        # 🔹 Create ActionLog linked to the original step and action
        ActionLog.objects.create(
            step_instance_id=original_instance,
            action_id=action,
            task_id=original_instance.task_id  # ✅ Add this line
        )
        return new_step_instance