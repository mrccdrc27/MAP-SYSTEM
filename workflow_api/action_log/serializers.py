from rest_framework import serializers
from .models import ActionLog
from action.serializers import ActionSerializer

class ActionLogSerializer(serializers.ModelSerializer):
    action = ActionSerializer(source='action_id', read_only=True)  # ✅ Correct nesting

    class Meta:
        model = ActionLog
        fields = '__all__'  # ✅ Includes all model fields
        # depth = 0  # Optional: prevents nested foreign keys from auto-expanding unless specified

# serializers/workflow.py
# serializers/workflow.py
from rest_framework import serializers
from step.models import Steps, StepTransition
from step_instance.models import StepInstance
from action_log.models import ActionLog
from task.models import Task

class WorkflowProgressSerializer(serializers.Serializer):
    task_id = serializers.CharField()

    def to_representation(self, instance):
        task_id = instance.get('task_id')
        if not task_id:
            return {}

        # Step 1: Get all step instances for this task
        step_instances = StepInstance.objects.filter(task_id=task_id)
        if not step_instances.exists():
            return {}

        # Step 2: Infer the workflow from one of the transitions
        workflow = step_instances.first().step_transition_id.workflow_id
        transitions = StepTransition.objects.filter(workflow_id=workflow)
        steps = Steps.objects.filter(workflow_id=workflow)

        # Build a map of transition_id -> StepInstance
        instance_map = {s.step_transition_id.transition_id: s for s in step_instances}

        # Step 3: Determine step status
        def get_step_status(step):
            incoming = transitions.filter(to_step_id=step.step_id)
            has_instance = False
            for trans in incoming:
                inst = instance_map.get(trans.transition_id)
                if inst:
                    has_instance = True
                    if inst.has_acted:
                        return "done"
                    else:
                        return "active"
            return "pending" if has_instance else "pending"

        # Step 4: Build graph data
        nodes = []
        for step in steps:
            nodes.append({
                "id": step.step_id,
                "label": step.name,
                "status": get_step_status(step),
                "instruction": step.instruction,
                "role": step.role_id.name if step.role_id else None,
                "order": step.order,
            })

        edges = []
        for trans in transitions:
            edges.append({
                "from": trans.from_step_id.step_id if trans.from_step_id else None,
                "to": trans.to_step_id.step_id if trans.to_step_id else None,
                "action": trans.action_id.name if trans.action_id else "→"
            })

        return {
            "task_id": task_id,
            "workflow_id": str(workflow.workflow_id),
            "nodes": nodes,
            "edges": edges
        }
