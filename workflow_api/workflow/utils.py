import logging
from django.db.models import Q
from step.models import Steps, StepTransition
from workflow.models import Workflows

logger = logging.getLogger(__name__)

# =============================================================================
# Utility functions to check the initialization status of workflows, steps, 
# and transitions. Consolidated from utils.py and utils/status.py
# =============================================================================


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
    A transition is initialized when both source and destination steps exist.
    Both from_step_id and to_step_id must be set for a valid transition.
    """
    result = (
        transition.from_step_id is not None and transition.to_step_id is not None
    )
    logger.debug(f"Transition {getattr(transition, 'transition_id', transition)} initialized: {result}")
    return result


def is_step_initialized(step):
    """
    Check if a step is fully initialized.
    A step is initialized if it has a role assigned.
    
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

    logger.debug(f"Step {step.step_id} is initialized.")
    return True, ""


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
        logger.warning(f"Workflow '{workflow.name}' must have exactly one start step, found {len(start_steps)}")
        return False
    
    # Must have at least one end step
    if len(end_steps) == 0:
        logger.warning(f"Workflow '{workflow.name}' must have at least one end step")
        return False
    
    start_step = start_steps[0]
    end_step_ids = {step.step_id for step in end_steps}
    
    # Build adjacency list for all transitions
    graph = {}
    for step in steps:
        graph[step.step_id] = []
    
    for transition in transitions:
        if transition.from_step_id and transition.to_step_id:
            graph[transition.from_step_id.step_id].append(transition.to_step_id.step_id)
    
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
            logger.warning(f"Step {step.step_id} is not reachable from start")
            return False
    
    # Check if start can reach at least one end step
    can_reach_end = any(end_id in reachable_from_start for end_id in end_step_ids)
    if not can_reach_end:
        logger.warning(f"Workflow '{workflow.name}' cannot reach any end step from start")
        return False
    
    # Check for deadends: no step (except end steps) should be a dead-end
    for step in steps:
        if step.step_id in end_step_ids:
            continue  # End steps can have no outgoing transitions
        
        # Non-end steps must have at least one outgoing transition
        if not graph.get(step.step_id):
            logger.warning(f"Step {step.step_id} is a deadend (no outgoing transitions)")
            return False
    
    return True


def is_workflow_initialized(workflow):
    """
    A workflow is initialized (published) when:
    1. It has category and sub_category set
    2. It has valid metadata (name)
    3. It has steps
    4. All steps have required fields (role_id)
    5. All transitions are properly formed (both from and to steps set)
    6. It has a valid path from start to end (no deadends)
    """
    logger.info(f"Evaluating workflow '{workflow.name}' ({workflow.workflow_id})")
    
    # Basic metadata checks
    if not workflow.category or not workflow.sub_category:
        logger.warning(f"Workflow '{workflow.name}' failed initialization: missing category or subcategory.")
        return False
    
    if not workflow.name:
        logger.warning(f"Workflow '{workflow.workflow_id}' failed initialization: missing name.")
        return False

    steps = Steps.objects.filter(workflow_id=workflow.workflow_id)
    if not steps.exists():
        logger.warning(f"Workflow '{workflow.name}' failed initialization: no steps found.")
        return False

    # All steps must have a role
    for step in steps:
        is_initialized, failure_reason = is_step_initialized(step)
        if not is_initialized:
            return False
    
    # All transitions must be properly formed
    transitions = StepTransition.objects.filter(workflow_id=workflow.workflow_id)
    for t in transitions:
        if not is_transition_initialized(t):
            logger.warning(f"Transition {t.transition_id} is not properly initialized")
            return False
    
    # Must have a valid path from start to end
    if not has_valid_workflow_path(workflow):
        return False

    logger.info(f"Workflow '{workflow.name}' is initialized.")
    return True


def compute_workflow_status(workflow_id):
    """
    Update workflow status based on initialization checks.
    
    Args:
        workflow_id: Can be an int (workflow_id) or a Workflows object
    """
    # Handle both workflow_id (int) and workflow object for backward compatibility
    if isinstance(workflow_id, Workflows):
        workflow = workflow_id
    else:
        logger.info(f">>> Computing status for workflow_id: {workflow_id}")
        try:
            workflow = Workflows.objects.get(workflow_id=workflow_id)
        except Workflows.DoesNotExist:
            logger.error(f"Workflow {workflow_id} not found.")
            return

    initialized = is_workflow_initialized(workflow)
    new_status = "initialized" if initialized else "draft"
    new_is_published = (new_status == "initialized")
    
    logger.info(f"Setting workflow '{workflow.name}' status to: {new_status}")

    if workflow.status != new_status or workflow.is_published != new_is_published:
        workflow.status = new_status
        workflow.is_published = new_is_published
        workflow.save(update_fields=["status", "is_published"])


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
    
    # Find start nodes: nodes marked as is_start, or nodes that appear as from_step but never as to_step
    start_steps = steps.filter(is_start=True)
    if start_steps.exists():
        start_nodes = {s.step_id for s in start_steps}
    else:
        # Fallback: nodes that have outgoing but no incoming transitions
        start_nodes = from_steps - to_steps
    
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
        
        # Get calculated handles or use defaults (lowercase for consistency)
        if edge.transition_id in handles_map:
            design.update(handles_map[edge.transition_id])
        else:
            design.setdefault("source_handle", "bottom")
            design.setdefault("target_handle", "top")
        
        transition_data = {
            'id': edge.transition_id,
            'from': edge.from_step_id.step_id if edge.from_step_id else None,
            'to': edge.to_step_id.step_id if edge.to_step_id else None,
            'name': edge.name or '',
            'design': design
        }
        transitions_data.append(transition_data)
    
    return transitions_data
