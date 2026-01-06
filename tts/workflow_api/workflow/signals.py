from django.db.models.signals import post_save, post_delete
from django.dispatch import receiver
from step.models import Steps, StepTransition
from workflow.utils import compute_workflow_status
from .models import Workflows, WorkflowVersion
import logging

logger = logging.getLogger(__name__)


def create_workflow_version(workflow):
    """
    Create a new WorkflowVersion snapshot when a workflow becomes initialized.
    Captures all steps, transitions, and metadata in JSON format.
    """
    try:
        # Get all steps for this workflow
        steps = Steps.objects.filter(workflow_id=workflow.workflow_id)
        transitions = StepTransition.objects.filter(workflow_id=workflow.workflow_id)
        
        # Build nodes from steps
        nodes = []
        for step in steps:
            nodes.append({
                'id': step.step_id,
                'label': step.name,
                'description': step.description or '',
                'instruction': step.instruction or '',
                'role_id': step.role_id.role_id if step.role_id else None,
                'role_name': step.role_id.name if step.role_id else None,
                'order': step.order,
                'weight': float(step.weight),
                'is_initialized': step.is_initialized,
                'is_start': step.is_start,
                'is_end': step.is_end,
            })
        
        # Build edges from transitions
        edges = []
        for transition in transitions:
            edges.append({
                'id': transition.transition_id,
                'from_step_id': transition.from_step_id.step_id if transition.from_step_id else None,
                'to_step_id': transition.to_step_id.step_id if transition.to_step_id else None,
                'action_id': getattr(transition, 'action_id', None),
                'action_name': getattr(transition.action_id, 'name', None) if hasattr(transition, 'action_id') and transition.action_id else None,
                'name': transition.name or '',
            })
        
        # Build workflow definition with metadata
        definition = {
            'nodes': nodes,
            'edges': edges,
            'metadata': {
                'workflow_id': workflow.workflow_id,
                'workflow_name': workflow.name,
                'description': workflow.description or '',
                'category': workflow.category,
                'sub_category': workflow.sub_category,
                'department': workflow.department,
                'low_sla': str(workflow.low_sla) if workflow.low_sla else None,
                'medium_sla': str(workflow.medium_sla) if workflow.medium_sla else None,
                'high_sla': str(workflow.high_sla) if workflow.high_sla else None,
                'urgent_sla': str(workflow.urgent_sla) if workflow.urgent_sla else None,
            }
        }
        
        # Determine next version number
        last_version = WorkflowVersion.objects.filter(
            workflow=workflow
        ).order_by('-version').first()
        next_version = (last_version.version + 1) if last_version else 1
        
        # Deactivate previous versions
        WorkflowVersion.objects.filter(
            workflow=workflow,
            is_active=True
        ).update(is_active=False)
        
        # Create new version
        workflow_version = WorkflowVersion.objects.create(
            workflow=workflow,
            version=next_version,
            definition=definition,
            is_active=True
        )
        
        logger.info(
            f"✅ WorkflowVersion {next_version} created for workflow '{workflow.name}' "
            f"with {len(nodes)} nodes and {len(edges)} edges"
        )
        
    except Exception as e:
        logger.error(f"❌ Error creating WorkflowVersion for workflow {workflow.workflow_id}: {str(e)}", exc_info=True)

def get_workflow_id_from_instance(instance):
    if hasattr(instance, "workflow_id") and instance.workflow_id:
        return instance.workflow_id.workflow_id

    from_step = getattr(instance, "from_step_id", None)
    if from_step and from_step.workflow_id:
        return from_step.workflow_id.workflow_id

    to_step = getattr(instance, "to_step_id", None)
    if to_step and to_step.workflow_id:
        return to_step.workflow_id.workflow_id

    return None

@receiver([post_save, post_delete], sender=Steps)
@receiver([post_save, post_delete], sender=StepTransition)
def update_workflow_status(sender, instance, **kwargs):
    workflow_id = get_workflow_id_from_instance(instance)
    if workflow_id:
        compute_workflow_status(workflow_id)

# No more push to localhost — this signal now only reacts to status changes.
@receiver(post_save, sender=Workflows)
def push_initialized_workflow(sender, instance: Workflows, created, **kwargs):
    if instance.status == "initialized":
        logger.info(f"Workflow {instance.workflow_id} is initialized. Creating WorkflowVersion...")
        create_workflow_version(instance)
