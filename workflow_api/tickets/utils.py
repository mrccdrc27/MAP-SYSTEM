from django.db import IntegrityError
from django.utils import timezone
from workflow.models import Workflows
from task.models import Task

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
            Task.objects.create(
                ticket_id=ticket,
                workflow_id=wf,
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
    - Creates a new task and updates ticket.is_task_allocated = True.
    
    Returns True if task was created, False otherwise.
    """

    if ticket.is_task_allocated:
        return False

    if workflow.status != 'initialized':
        return False

    # Delete any prior tasks (if any)
    Task.objects.filter(ticket_id=ticket).delete()

    try:
        Task.objects.create(
            ticket_id=ticket,
            workflow_id=workflow,
            fetched_at=ticket.fetched_at or timezone.now()
        )
        ticket.is_task_allocated = True
        ticket.save(update_fields=["is_task_allocated"])
        return True
    except IntegrityError:
        return False