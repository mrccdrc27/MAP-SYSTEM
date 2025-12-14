import logging
from django.db.models import Q
from step.models import Steps, StepTransition
from workflow.models import Workflows

logger = logging.getLogger(__name__)

# Utility functions to check the initialization status of workflows, steps, and transitions.

def calculate_default_node_design(step_order, total_steps, base_x=-2.0):
    """
    Calculate standardized design coordinates for workflow steps.
    
    Uses a vertical layout with consistent spacing based on the number of steps.
    The interval between steps is 202 pixels (standardized for visual clarity).
    
    Args:
        step_order: The order/position of the step (0-indexed, 1-indexed order converted)
        total_steps: Total number of steps in the workflow
        base_x: Base x-coordinate for all nodes (default: -2.0)
    
    Returns:
        Dict with 'x' and 'y' coordinates for the node design
    
    Example:
        For 3 steps:
        - Step 0: y = -164.82
        - Step 1: y = 37.49
        - Step 2: y = 246.26
        Interval: ~202 pixels
    """
    # Calculate vertical spacing: 202 pixels per step
    # Start position centers the workflow around y=0
    VERTICAL_INTERVAL = 202.0
    
    # Calculate starting y position to center the workflow
    total_height = (total_steps - 1) * VERTICAL_INTERVAL
    start_y = -(total_height / 2) - 40  # Slight offset for visual centering
    
    # Calculate y position for this step
    y_position = start_y + (step_order * VERTICAL_INTERVAL)
    
    return {
        "x": round(base_x, 2),
        "y": round(y_position, 2)
    }

def is_transition_initialized(transition):
    """
    A transition is considered initialized if:
      - At least one of from_step_id or to_step_id is non-null
    """
    result = (
        transition.from_step_id_id is not None or transition.to_step_id_id is not None
    )
    logger.debug(f"Transition {getattr(transition, 'transition_id', transition)} initialized: {result}")
    return result


def is_step_initialized(step):
    """
    Check if a step is fully initialized.
    
    Returns:
        tuple: (bool, str) - (is_initialized, failure_reason)
               If initialized: (True, "")
               If not: (False, "specific reason for failure")
    """
    logger.debug(f"Checking step: {step.step_id}")

    if not step.role_id:
        reason = f"Step {step.step_id} failed initialization: no role assigned"
        logger.warning(reason)
        return False, reason

    transitions = StepTransition.objects.filter(
        Q(from_step_id=step.step_id) | Q(to_step_id=step.step_id)
    )

    if not transitions.exists():
        reason = f"Step {step.step_id} failed initialization: no transitions found (step must have at least one incoming or outgoing transition)"
        logger.warning(reason)
        return False, reason

    for t in transitions:
        if not is_transition_initialized(t):
            reason = f"Step {step.step_id} failed initialization: has uninitialized transition {getattr(t, 'transition_id', t)} (transition must have from_step_id or to_step_id)"
            logger.warning(reason)
            return False, reason

    logger.debug(f"Step {step.step_id} is fully initialized.")
    return True, ""


def is_workflow_initialized(workflow):
    logger.info(f"Evaluating workflow '{workflow.name}' ({workflow.workflow_id})")
    logger.debug(f"Category: {workflow.category}, Sub-category: {workflow.sub_category}")

    if not workflow.category or not workflow.sub_category:
        logger.warning(f"Workflow '{workflow.name}' failed initialization: missing category or subcategory.")
        return False

    steps = Steps.objects.filter(workflow_id=workflow.workflow_id)
    if not steps.exists():
        logger.warning(f"Workflow '{workflow.name}' failed initialization: no steps found.")
        return False

    for step in steps:
        is_initialized, failure_reason = is_step_initialized(step)
        if not is_initialized:
            # Specific reason already logged by is_step_initialized
            return False

    logger.info(f"Workflow '{workflow.name}' is initialized.")
    return True


from workflow.tasks import send_hello, send_to_consumer  # Import the Celery task

def compute_workflow_status(workflow_id):
    logger.info(f">>> Computing status for workflow_id: {workflow_id}")
    try:
        workflow = Workflows.objects.get(workflow_id=workflow_id)
    except Workflows.DoesNotExist:
        logger.error("Workflow not found.")
        return

    initialized = is_workflow_initialized(workflow)
    new_status = "initialized" if initialized else "draft"
    logger.info(f"Setting workflow '{workflow.name}' status to: {new_status}")

    if workflow.status != new_status:  # Prevent unnecessary updates
        workflow.status = new_status
        workflow.save(update_fields=["status"])


def calculate_edge_handles(workflow_id):
    """
    Calculate and return source/target handles for all edges in a workflow.
    
    Algorithm:
    1. Identify start nodes: nodes that only appear as to_step_id (never as from_step_id)
    2. Perform BFS from start nodes to assign depth to all reachable nodes
    3. For each transition:
       - If target depth > source depth → downstream (bottom → top)
       - If target depth ≤ source depth → upstream (right → right)
    4. Handle incomplete transitions gracefully with defaults
    
    Returns a dictionary mapping transition_id to design dict with handles.
    
    Example return:
    {
        1: {"source_handle": "bottom", "target_handle": "top"},
        2: {"source_handle": "right", "target_handle": "right"},  # upstream/loop
    }
    """
    try:
        workflow = Workflows.objects.get(workflow_id=workflow_id)
    except Workflows.DoesNotExist:
        logger.warning(f"Workflow {workflow_id} not found for handle calculation")
        return {}
    
    transitions = StepTransition.objects.filter(workflow_id=workflow_id)
    steps = Steps.objects.filter(workflow_id=workflow_id)
    
    if not steps.exists() or not transitions.exists():
        logger.warning(f"Workflow {workflow_id} has no steps or transitions")
        return {}
    
    # Build sets of step_ids that appear as from_step and to_step
    from_steps = set()
    to_steps = set()
    
    for transition in transitions:
        if transition.from_step_id:
            from_steps.add(transition.from_step_id.step_id)
        if transition.to_step_id:
            to_steps.add(transition.to_step_id.step_id)
    
    # Find start nodes: appear as to_step but never as from_step
    start_nodes = to_steps - from_steps
    
    # If no start node found (e.g., circular graph), pick any node
    if not start_nodes:
        start_nodes = {steps.first().step_id}
        logger.warning(f"No clear start node found. Using arbitrary start: {start_nodes}")
    
    logger.debug(f"Identified start nodes: {start_nodes}")
    
    # Build adjacency list for BFS
    adjacency = {}
    for step in steps:
        adjacency[step.step_id] = []
    
    for transition in transitions:
        if transition.from_step_id and transition.to_step_id:
            adjacency[transition.from_step_id.step_id].append(transition.to_step_id.step_id)
    
    # BFS to compute depth for each node
    node_depth = {}
    queue = [(node, 0) for node in start_nodes]
    visited = set(start_nodes)
    
    while queue:
        current_node, current_depth = queue.pop(0)
        node_depth[current_node] = current_depth
        
        for neighbor in adjacency.get(current_node, []):
            if neighbor not in visited:
                visited.add(neighbor)
                queue.append((neighbor, current_depth + 1))
    
    logger.debug(f"Node depths: {node_depth}")
    
    # Assign handles based on depth comparison
    handles_map = {}
    
    for transition in transitions:
        if not transition.from_step_id or not transition.to_step_id:
            # Handle incomplete transitions with defaults
            handles_map[transition.transition_id] = {
                "source_handle": "bottom",
                "target_handle": "top"
            }
            logger.debug(
                f"Transition {transition.transition_id} is incomplete. Using default handles."
            )
            continue
        
        from_step_id = transition.from_step_id.step_id
        to_step_id = transition.to_step_id.step_id
        
        from_depth = node_depth.get(from_step_id, 0)
        to_depth = node_depth.get(to_step_id, 0)
        
        # Determine if downstream or upstream
        is_downstream = to_depth > from_depth
        
        if is_downstream:
            source_handle = "bottom"
            target_handle = "top"
            logger.debug(
                f"Downstream: {from_step_id} (depth {from_depth}) → {to_step_id} (depth {to_depth}). "
                f"Handles: {source_handle} → {target_handle}"
            )
        else:
            source_handle = "right"
            target_handle = "right"
            logger.debug(
                f"Upstream/Loop: {from_step_id} (depth {from_depth}) → {to_step_id} (depth {to_depth}). "
                f"Handles: {source_handle} → {target_handle}"
            )
        
        handles_map[transition.transition_id] = {
            "source_handle": source_handle,
            "target_handle": target_handle
        }
    
    logger.info(f"Calculated handles for {len(handles_map)} transitions in workflow {workflow_id}")
    return handles_map


def apply_edge_handles_to_transitions(transitions_queryset, workflow_id):
    """
    Apply calculated handles to transition objects for serialization.
    
    Returns a list of transition data dicts with design field containing handles.
    
    Args:
        transitions_queryset: QuerySet of StepTransition objects
        workflow_id: The workflow ID for context
    
    Returns:
        List of dicts with transition data including design field with handles
    """
    handles_map = calculate_edge_handles(workflow_id)
    
    transitions_data = []
    for edge in transitions_queryset:
        design = edge.design or {}
        
        # Get calculated handles or use defaults
        if edge.transition_id in handles_map:
            design.update(handles_map[edge.transition_id])
        else:
            design.setdefault("source_handle", "Bottom")
            design.setdefault("target_handle", "Top")
        
        transition_data = {
            'id': edge.transition_id,
            'from': edge.from_step_id.step_id if edge.from_step_id else None,
            'to': edge.to_step_id.step_id if edge.to_step_id else None,
            'name': edge.name or '',
            'design': design
        }
        transitions_data.append(transition_data)
    
    return transitions_data
