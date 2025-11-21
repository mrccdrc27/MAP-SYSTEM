# workflow/utils/status.py
from django.db.models import Q
from step.models import Steps, StepTransition
from workflow.models import Workflows


def is_transition_initialized(transition):
    """A transition is initialized when both source and destination steps exist."""
    return all([
        transition.from_step_id is not None,
        transition.to_step_id is not None,
    ])


def has_valid_workflow_path(workflow):
    """
    Check if the workflow has a valid path from start to end without deadends.
    
    A workflow is valid if:
    1. There is exactly one step marked as is_start
    2. There is at least one step marked as is_end
    3. All steps are reachable from the start step
    4. The start step can reach at least one end step
    5. No step is a deadend (except end steps)
    """
    steps = Steps.objects.filter(workflow_id=workflow.workflow_id)
    transitions = StepTransition.objects.filter(workflow_id=workflow.workflow_id)
    
    if not steps.exists():
        return False
    
    # Find start and end steps
    start_steps = list(steps.filter(is_start=True))
    end_steps = list(steps.filter(is_end=True))
    
    # Must have exactly one start step
    if len(start_steps) != 1:
        return False
    
    # Must have at least one end step
    if len(end_steps) == 0:
        return False
    
    start_step = start_steps[0]
    end_step_ids = {step.step_id for step in end_steps}
    
    # Build adjacency list for all transitions
    graph = {}
    reverse_graph = {}
    for step in steps:
        graph[step.step_id] = []
        reverse_graph[step.step_id] = []
    
    for transition in transitions:
        if transition.from_step_id and transition.to_step_id:
            graph[transition.from_step_id.step_id].append(transition.to_step_id.step_id)
            reverse_graph[transition.to_step_id.step_id].append(transition.from_step_id.step_id)
    
    # DFS from start to find all reachable steps
    reachable_from_start = set()
    stack = [start_step.step_id]
    
    while stack:
        current = stack.pop()
        if current in reachable_from_start:
            continue
        reachable_from_start.add(current)
        stack.extend(graph.get(current, []))
    
    # All steps must be reachable from start
    for step in steps:
        if step.step_id not in reachable_from_start:
            return False
    
    # Check if start can reach at least one end step
    can_reach_end = any(end_id in reachable_from_start for end_id in end_step_ids)
    if not can_reach_end:
        return False
    
    # Check for deadends: no step (except end steps) should be a dead-end
    for step in steps:
        if step.step_id in end_step_ids:
            continue  # End steps can have no outgoing transitions
        
        # Non-end steps must have at least one outgoing transition
        if not graph.get(step.step_id):
            return False
    
    return True


def is_step_initialized(step):
    """A step is initialized if it has a role assigned."""
    return step.role_id is not None


def is_workflow_initialized(workflow):
    """
    A workflow is initialized (published) when:
    1. It has category and sub_category set
    2. It has valid metadata (name, description)
    3. It has a valid path from start to end (no deadends)
    4. All steps have required fields (role_id)
    """
    # Basic metadata checks
    if not workflow.category or not workflow.sub_category:
        return False
    
    if not workflow.name:
        return False
    
    # Check if steps exist and all are initialized
    steps = Steps.objects.filter(workflow_id=workflow.workflow_id)
    if not steps.exists():
        return False
    
    # All steps must have a role
    if not all(is_step_initialized(step) for step in steps):
        return False
    
    # All transitions must be properly formed
    transitions = StepTransition.objects.filter(workflow_id=workflow.workflow_id)
    if not all(is_transition_initialized(t) for t in transitions):
        return False
    
    # Must have a valid path from start to end
    if not has_valid_workflow_path(workflow):
        return False
    
    return True


def compute_workflow_status(workflow):
    """Update workflow status based on initialization checks."""
    new_status = "initialized" if is_workflow_initialized(workflow) else "draft"
    new_is_published = (new_status == "initialized")
    
    if workflow.status != new_status or workflow.is_published != new_is_published:
        workflow.status = new_status
        workflow.is_published = new_is_published
        workflow.save(update_fields=["status", "is_published"])
