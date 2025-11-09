# workflow/utils/status.py
from django.db.models import Q
from step.models import Steps, StepTransition
from workflow.models import Workflows


def is_transition_initialized(transition):
    return all([
        transition.from_step_id is not None,
        transition.to_step_id is not None,
        transition.action_id is not None,
    ])


def is_step_initialized(step):
    if step.role_id is None:
        return False

    transitions = StepTransition.objects.filter(
        Q(from_step_id=step.step_id) | Q(to_step_id=step.step_id)
    )

    return transitions.exists() and all(
        is_transition_initialized(t) for t in transitions
    )


def is_workflow_initialized(workflow):
    if not workflow.category or not workflow.sub_category:
        return False

    steps = Steps.objects.filter(workflow_id=workflow.workflow_id)
    return steps.exists() and all(is_step_initialized(step) for step in steps)


def compute_workflow_status(workflow):
    new_status = "initialized" if is_workflow_initialized(workflow) else "draft"
    if workflow.status != new_status:
        workflow.status = new_status
        workflow.save(update_fields=["status"])
