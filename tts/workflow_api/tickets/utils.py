from django.db import IntegrityError
from django.utils import timezone
from workflow.models import Workflows, WorkflowVersion
from task.models import Task
from step.models import Steps
import logging

logger = logging.getLogger(__name__)

def get_latest_workflow_version(workflow):
    """
    Get the latest active WorkflowVersion for a workflow.
    Falls back to None if no version exists.
    """
    try:
        return WorkflowVersion.objects.filter(
            workflow=workflow,
            is_active=True
        ).order_by('-version').first()
    except Exception as e:
        print(f"⚠️ Error fetching workflow version: {e}")
        return None


def allocate_task_for_ticket(ticket):
    """
    Create Tasks for every Workflows entry whose:
    - department matches ticket_data.department (case-insensitive),
    - category matches ticket_data.category (case-insensitive).

    Returns True if at least one Task was created (or already existed).
    """
    ticket_data = ticket.ticket_data
    dep = (ticket_data.get('department') or '').strip()
    cat = (ticket_data.get('category') or '').strip()

    if not (dep and cat):
        return False

    workflows = Workflows.objects.filter(
        department__iexact=dep,
        category__iexact=cat
    )

    created_any = False
    for wf in workflows:
        try:
            # Get the latest workflow version
            workflow_version = get_latest_workflow_version(wf)
            
            Task.objects.create(
                ticket_id=ticket,
                workflow_id=wf,
                workflow_version=workflow_version,  # Assign the latest version
                fetched_at=ticket.fetched_at or timezone.now()
            )
            created_any = True
        except IntegrityError:
            # Duplicate Task; treat as already exists
            created_any = True

    return created_any


def manually_assign_task(ticket, workflow):
    """
    Manually assign a Task to the given ticket using the specified workflow.

    Conditions:
    - The ticket must not already be allocated (ticket.is_task_allocated is False).
    - The workflow must have status 'initialized'.

    If both conditions are met:
    - Deletes any existing tasks for the ticket.
    - Creates a new task with current_step set to first step
    - Assigns users to the task via round-robin
    - Updates ticket.is_task_allocated = True.
    
    Returns True if task was created, False otherwise.
    """
    from task.utils.assignment import assign_users_for_step, assign_ticket_owner

    if ticket.is_task_allocated:
        logger.info(f"Ticket {ticket.ticket_number} already allocated")
        return False

    if workflow.status != 'initialized':
        logger.info(f"Workflow {workflow.name} status is {workflow.status}, not initialized")
        return False

    # Delete any prior tasks (if any)
    Task.objects.filter(ticket_id=ticket).delete()

    try:
        # Get the latest workflow version
        workflow_version = get_latest_workflow_version(workflow)
        
        # Find the first step of the workflow (start step)
        first_step = Steps.objects.filter(
            workflow_id=workflow,
            is_start=True
        ).first()
        
        # Fallback: if no is_start step, get the first by order
        if not first_step:
            first_step = Steps.objects.filter(
                workflow_id=workflow
            ).order_by('order').first()
        
        if not first_step:
            logger.error(f"No steps found for workflow {workflow.name}")
            return False
        
        logger.info(f"First step: {first_step.name}, Role: {first_step.role_id.name if first_step.role_id else 'None'}")
        
        # Create task with current_step set
        task = Task.objects.create(
            ticket_id=ticket,
            workflow_id=workflow,
            workflow_version=workflow_version,
            current_step=first_step,
            status='pending',
            fetched_at=ticket.fetched_at or timezone.now()
        )
        
        logger.info(f"Created Task {task.task_id} for ticket {ticket.ticket_number}")
        
        # Assign ticket owner (Ticket Coordinator) via round-robin
        try:
            ticket_owner = assign_ticket_owner(task, hdts_owner_id=None)
            if ticket_owner:
                logger.info(f"Ticket owner assigned: {ticket_owner.user_full_name}")
        except Exception as e:
            logger.warning(f"Failed to assign ticket owner: {e}")
        
        # Assign users to the first step via round-robin
        try:
            role_name = first_step.role_id.name if first_step.role_id else None
            if role_name:
                assignments = assign_users_for_step(task, first_step, role_name)
                if assignments:
                    logger.info(f"Assigned {len(assignments)} users to first step")
            else:
                logger.warning(f"First step {first_step.name} has no role assigned")
        except Exception as e:
            logger.warning(f"Failed to assign users to step: {e}")
        
        ticket.is_task_allocated = True
        ticket.save(update_fields=["is_task_allocated"])
        
        logger.info(f"Successfully assigned ticket {ticket.ticket_number} to workflow {workflow.name}")
        return True
        
    except IntegrityError as e:
        logger.error(f"IntegrityError creating task: {e}")
        return False
    except Exception as e:
        logger.error(f"Error creating task: {e}")
        return False