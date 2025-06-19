from django.db import IntegrityError
from django.utils import timezone
from workflow.models import Workflows
from task.models import Task

def allocate_task_for_ticket(ticket):
    """
    Create Tasks for every Workflows entry whose
    category (case‐insensitive) matches ticket.category
    AND sub_category matches ticket.subcategory.
    Returns True if at least one Task was created (or already existed).
    """
    cat = ticket.category.strip()
    sub = ticket.subcategory.strip()

    if not cat or not sub:
        return False

    # Now filtering on CharField rather than FK linked name
    workflows = Workflows.objects.filter(
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
            # Duplicate Task; treat as “exists”
            created_any = True

    return created_any
