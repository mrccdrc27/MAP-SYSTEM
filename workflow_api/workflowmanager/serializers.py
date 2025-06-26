from rest_framework import serializers


from workflow.models import Workflows

class WorkflowSerializer(serializers.ModelSerializer):
    class Meta:
        model = Workflows
        fields = '__all__'

from step.models import Steps, StepTransition

class StepSerializer(serializers.ModelSerializer):
    class Meta:
        model = Steps
        fields = '__all__'

class StepTransitionSerializer(serializers.ModelSerializer):
    class Meta:
        model = StepTransition
        fields = '__all__'

from action.models import Actions

class ActionSerializer(serializers.ModelSerializer):
    class Meta:
        model = Actions
        fields = '__all__'
