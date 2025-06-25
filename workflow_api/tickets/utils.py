from django.db import IntegrityError
from django.utils import timezone
from workflow.models import Workflows
from task.models import Task

def allocate_task_for_ticket(ticket):
    """
    Create Tasks for every Workflows entry whose:
    - department matches ticket.department (case-insensitive),
    - category matches ticket.category (case-insensitive),
    - sub_category matches ticket.subcategory (case-insensitive).

    Returns True if at least one Task was created (or already existed).
    """
    dep = (ticket.department or '').strip()
    cat = (ticket.category or '').strip()
    sub = (ticket.subcategory or '').strip()

    if not (dep and cat and sub):
        return False

    workflows = Workflows.objects.filter(
        department__iexact=dep,
        category__iexact=cat,
        sub_category__iexact=sub
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
