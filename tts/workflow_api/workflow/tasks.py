from celery import shared_task
from workflow.models import Workflows
from workflow.serializers import WorkflowDetailSerializer
from workflow_api.celery import app  # Your Celery instance
from django.core.management import call_command
from django.core.management.base import CommandError
import logging

logger = logging.getLogger(__name__)

@shared_task(name="workflow.send_to_consumer") 
def send_to_consumer(workflow_id):
    try:
        workflow = Workflows.objects.get(workflow_id=workflow_id)
        serializer = WorkflowDetailSerializer(workflow)
        serialized_data = serializer.data
        # Send to the consumer task in `task_service` via the queue
        app.send_task(
            "receive_workflow",  # ← Remove "workflow.tasks." prefix
            kwargs={"payload": {"workflow": serialized_data}},
            queue="workflow_send_queue"
        )
        logger.info(f"Dispatched workflow {workflow_id} to consumer")

    except Workflows.DoesNotExist:
        logger.error(f"Workflow with ID {workflow_id} does not exist")



@shared_task(name="workflow.send_hello")
def send_hello():
    app.send_task(
        "receive_hello",
        kwargs={"payload": {"message": "Hello"}},
        queue="workflow_send_queue"
    )


@shared_task(name="workflow.seed_workflows")
def seed_workflows():
    """
    Celery task to run the seed_workflows2 management command.
    This is triggered by the auth service after successful TTS seeding.
    """
    try:
        logger.info("Starting seed_workflows2 command execution...")
        call_command('seed_workflows2')
        logger.info("✓ seed_workflows2 command completed successfully")
        return {'status': 'success', 'message': 'Workflows seeded successfully'}
    except CommandError as e:
        logger.error(f"✗ seed_workflows2 command failed with error: {str(e)}")
        raise
    except Exception as e:
        logger.error(f"✗ Unexpected error during workflow seeding: {str(e)}")
        raise