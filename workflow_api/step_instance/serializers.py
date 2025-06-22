from rest_framework import serializers
from .models import StepInstance
from step.models import StepTransition
from action.models import Actions
from action_log.models import ActionLog


# step_instance/serializers.py
from rest_framework import serializers
from .models import StepInstance
from task.serializers import TaskSerializer
from action.serializers import ActionSerializer
from step.serializers import StepSerializer

class StepInstanceSerializer(serializers.ModelSerializer):
    task = TaskSerializer(source='task_id', read_only=True)
    available_actions = serializers.SerializerMethodField()
    step = StepSerializer(source='step_transition_id.to_step_id', read_only=True)
    # edit_helper_/instance/list/
    class Meta:
        model = StepInstance
        fields = [
            'step_instance_id',
            'user_id',
            'step_transition_id',
            'has_acted',
            'step',
            'task',
            'available_actions',  # 👈 include custom field
        ]

    def get_available_actions(self, instance):
        try:
            current_step = instance.step_transition_id.to_step_id
        except AttributeError:
            return []

        transitions = StepTransition.objects.filter(from_step_id=current_step)
        actions = [t.action_id for t in transitions if t.action_id]

        serializer = ActionSerializer(actions, many=True)
        return serializer.data


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

        # Mark original step instance as completed
        original_instance.has_acted = True
        original_instance.save(update_fields=['has_acted'])

        # Create action log
        ActionLog.objects.create(
            step_instance_id=original_instance,
            action_id=action,
            task_id=original_instance.task_id
        )

        if not transition.to_step_id:
            print("🛑 Ending workflow: no next step.")
            # 🔁 END LOGIC: Graceful ending
            task = original_instance.task_id
            task.mark_as_completed()  # ← Or whatever your end logic is
            # task.save(update_fields=['status'])  # example field
            return original_instance  # or return a flag if preferred

        # Continue the workflow as normal
        if transition.to_step_id:
            print("🚨 Creating new step instance...")
            new_step_instance = StepInstance.objects.create(
                task_id=original_instance.task_id,
                user_id=original_instance.user_id,
                step_transition_id=transition
            )
            return new_step_instance