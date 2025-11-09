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


# def compute_workflow_status(workflow_id):
#     logger.info(f">>> Computing status for workflow_id: {workflow_id}")
#     try:
#         workflow = Workflows.objects.get(workflow_id=workflow_id)
#     except Workflows.DoesNotExist:
#         logger.error("Workflow not found.")
#         return

#     initialized = is_workflow_initialized(workflow)
#     new_status = "initialized" if initialized else "draft"
#     logger.info(f"Setting workflow '{workflow.name}' status to: {new_status}")
#     workflow.status = new_status
#     workflow.save(update_fields=["status"])

# 
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

        # if new_status == "initialized":
        #     send_to_consumer.delay(workflow.workflow_id)  # Trigger Celery task
        #     # send_hello()
