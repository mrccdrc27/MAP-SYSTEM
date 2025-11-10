import logging
from django.db.models import Q
from step.models import Steps, StepTransition
from workflow.models import Workflows

logger = logging.getLogger(__name__)

# Utility functions to check the initialization status of workflows, steps, and transitions.

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
    logger.debug(f"Checking step: {step.step_id}")

    if not step.role_id:
        logger.warning(f"Step {step.step_id} has no role assigned.")
        return False

    transitions = StepTransition.objects.filter(
        Q(from_step_id=step.step_id) | Q(to_step_id=step.step_id)
    )

    if not transitions.exists():
        logger.warning(f"Step {step.step_id} has no transitions at all.")
        return False

    for t in transitions:
        if not is_transition_initialized(t):
            logger.warning(f"Step {step.step_id} has uninitialized transition {getattr(t, 'transition_id', t)}.")
            return False

    logger.debug(f"Step {step.step_id} is fully initialized.")
    return True


def is_workflow_initialized(workflow):
    logger.info(f"Evaluating workflow '{workflow.name}' ({workflow.workflow_id})")
    logger.debug(f"Category: {workflow.category}, Sub-category: {workflow.sub_category}")

    if not workflow.category or not workflow.sub_category:
        logger.warning("Missing category or subcategory.")
        return False

    steps = Steps.objects.filter(workflow_id=workflow.workflow_id)
    if not steps.exists():
        logger.warning("No steps found.")
        return False

    for step in steps:
        if not is_step_initialized(step):
            logger.warning(f"Step {step.step_id} failed initialization check.")
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
    
    Rules:
    1. Always vertical workflow (default: source_handle="Bottom", target_handle="Top")
    2. Detect upstream movement (loops): use left/right handles instead
    3. For loops, prioritize left first, then right if left is occupied
    
    Returns a dictionary mapping transition_id to design dict with handles.
    
    Example return:
    {
        1: {"source_handle": "Bottom", "target_handle": "Top"},
        2: {"source_handle": "left", "target_handle": "left"},  # loop case
    }
    """
    try:
        workflow = Workflows.objects.get(workflow_id=workflow_id)
    except Workflows.DoesNotExist:
        logger.warning(f"Workflow {workflow_id} not found for handle calculation")
        return {}
    
    transitions = StepTransition.objects.filter(workflow_id=workflow_id)
    steps = Steps.objects.filter(workflow_id=workflow_id)
    
    # Build a map of step_id -> order for ordering comparison
    step_order = {step.step_id: step.order for step in steps}
    
    # Track handle usage per step to avoid conflicts
    # Format: {step_id: {"left": count, "right": count}}
    handle_usage = {step.step_id: {"left": 0, "right": 0} for step in steps}
    
    handles_map = {}
    
    for transition in transitions:
        if not transition.from_step_id or not transition.to_step_id:
            # Handle incomplete transitions
            handles_map[transition.transition_id] = {
                "source_handle": "Bottom",
                "target_handle": "Top"
            }
            continue
        
        from_step_order = step_order.get(transition.from_step_id.step_id, 0)
        to_step_order = step_order.get(transition.to_step_id.step_id, 0)
        
        # Check if this is a loop (upstream movement)
        is_loop = to_step_order <= from_step_order
        
        if is_loop:
            # Use left/right handles for loops
            # Prioritize left first
            from_left_count = handle_usage[transition.from_step_id.step_id]["left"]
            from_right_count = handle_usage[transition.from_step_id.step_id]["right"]
            
            to_left_count = handle_usage[transition.to_step_id.step_id]["left"]
            to_right_count = handle_usage[transition.to_step_id.step_id]["right"]
            
            # Choose handle based on usage count (less used first)
            source_handle = "left" if from_left_count <= from_right_count else "right"
            target_handle = "left" if to_left_count <= to_right_count else "right"
            
            # Update usage counters
            handle_usage[transition.from_step_id.step_id][source_handle] += 1
            handle_usage[transition.to_step_id.step_id][target_handle] += 1
            
            logger.debug(
                f"Loop detected: {transition.from_step_id.step_id} -> {transition.to_step_id.step_id}. "
                f"Handles: {source_handle} -> {target_handle}"
            )
        else:
            # Linear flow: use bottom and top
            source_handle = "Bottom"
            target_handle = "Top"
            logger.debug(
                f"Linear flow: {transition.from_step_id.step_id} -> {transition.to_step_id.step_id}. "
                f"Handles: {source_handle} -> {target_handle}"
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
