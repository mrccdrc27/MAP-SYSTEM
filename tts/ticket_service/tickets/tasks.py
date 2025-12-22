from celery import shared_task

@shared_task(name='tickets.tasks.receive_ticket')
def push_ticket_to_workflow(ticket_data):
    # This will be picked up and executed by `workflow_api`
    pass
