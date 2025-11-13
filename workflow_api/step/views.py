from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from rest_framework.generics import ListAPIView
from rest_framework.views import APIView
from django_filters.rest_framework import DjangoFilterBackend
import logging
from copy import deepcopy

from audit.utils import log_action, compare_models
from .models import Steps, StepTransition
from .serializers import (
    StepDetailSerializer, 
    StepTransitionSerializer, 
    AvailableTransitionSerializer,
    StepWeightSerializer,
    WeightManagementSerializer
)
from authentication import JWTCookieAuthentication
from task.models import Task
from task.serializers import UserTaskListSerializer
from task.utils.assignment import assign_users_for_step

logger = logging.getLogger(__name__)


class StepTransitionsListView(ListAPIView):
    """
    GET endpoint to list all available transitions (edges) from a task's current step.
    
    Query Parameters:
    - task_id: The ID of the task (required) - extracts current step from task
    - step_id: The ID of the current step (optional) - if not provided, uses task's current step
    
    Examples:
    GET /steps/transitions/?task_id=1
    GET /steps/transitions/?step_id=2
    GET /steps/transitions/?step_id=2&task_id=1
    
    Response:
    {
        "current_step": {
            "step_id": 2,
            "name": "Review",
            "description": "Review the request",
            "role": "Manager"
        },
        "task": {
            "task_id": 1,
            "ticket_id": 123,
            "status": "pending",
            "workflow_id": 1
        },
        "available_transitions": [
            {
                "transition_id": 1,
                "from_step_id": 2,
                "to_step_id": 3,
                "to_step_name": "Approval",
                "to_step_description": "Manager approval required",
                "to_step_instruction": "Review and approve the request",
                "to_step_order": 2,
                "to_step_role": "Manager",
                "name": null
            }
        ],
        "count": 1
    }
    """
    
    serializer_class = AvailableTransitionSerializer
    authentication_classes = [JWTCookieAuthentication]
    permission_classes = [IsAuthenticated]
    queryset = StepTransition.objects.select_related(
        'from_step_id', 
        'to_step_id', 
        'to_step_id__role_id'
    )
    
    def get_queryset(self):
        """Filter transitions based on step_id parameter or extracted from task"""
        # Try to get step_id from request context first (set in list method)
        step_id = getattr(self, '_step_id', None)
        
        # Fall back to query parameter if not set in context
        if not step_id:
            step_id = self.request.query_params.get('step_id')
        
        if not step_id:
            return StepTransition.objects.none()
        
        # Get all transitions FROM this step
        queryset = StepTransition.objects.filter(
            from_step_id=step_id
        ).select_related(
            'from_step_id',
            'to_step_id',
            'to_step_id__role_id'
        )
        
        logger.info(f"✅ Found {queryset.count()} transitions from step {step_id}")
        return queryset
    
    def list(self, request, *args, **kwargs):
        """Override to provide custom response with helpful metadata"""
        task_id = request.query_params.get('task_id')
        step_id = request.query_params.get('step_id')
        
        # If task_id is provided, extract step_id from task
        task_data = None
        if task_id:
            try:
                task = Task.objects.select_related(
                    'ticket_id',
                    'workflow_id',
                    'current_step'
                ).get(task_id=task_id)
                logger.info(f"🎯 Found task: {task.task_id}")
                
                # Use task's current step
                step_id = task.current_step.step_id
                
                # Store step_id in instance so get_queryset can access it
                self._step_id = step_id
                
                task_data = {
                    'task_id': task.task_id,
                    'ticket_id': task.ticket_id.ticket_id,
                    'status': task.status,
                    'workflow_id': task.workflow_id.workflow_id,
                    'current_step_id': task.current_step.step_id,
                    'current_step_name': task.current_step.name,
                }
            except Task.DoesNotExist:
                return Response(
                    {'error': f'Task with ID {task_id} not found'},
                    status=status.HTTP_404_NOT_FOUND
                )
            except (ValueError, AttributeError) as e:
                return Response(
                    {'error': f'Invalid task_id or task has no current step: {str(e)}'},
                    status=status.HTTP_400_BAD_REQUEST
                )
        else:
            # If no task_id, store step_id in instance for consistency
            if step_id:
                self._step_id = step_id
        
        # Now we need step_id (either from parameter or extracted from task)
        if not step_id:
            return Response(
                {'error': 'Either task_id or step_id query parameter is required'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Verify step exists
        try:
            current_step = Steps.objects.get(step_id=step_id)
            logger.info(f"📍 Current step: {current_step.name} (ID: {step_id})")
        except Steps.DoesNotExist:
            return Response(
                {'error': f'Step with ID {step_id} not found'},
                status=status.HTTP_404_NOT_FOUND
            )
        
        queryset = self.get_queryset()
        serializer = self.get_serializer(queryset, many=True)
        
        response_data = {
            'current_step': {
                'step_id': current_step.step_id,
                'name': current_step.name,
                'description': current_step.description,
                'role': current_step.role_id.name if current_step.role_id else None,
            },
            'available_transitions': serializer.data,
            'count': len(serializer.data),
        }
        
        # Add task info if provided
        if task_data:
            response_data['task'] = task_data
        
        return Response(response_data)


class StepViewSet(viewsets.ReadOnlyModelViewSet):
    """
    ViewSet for viewing step details.
    
    Actions:
    - list: GET /steps/ - List all steps
    - retrieve: GET /steps/{id}/ - Get step details
    """
    
    queryset = Steps.objects.select_related('workflow_id', 'role_id')
    serializer_class = StepDetailSerializer
    authentication_classes = [JWTCookieAuthentication]
    permission_classes = [IsAuthenticated]
    filter_backends = [DjangoFilterBackend]
    filterset_fields = ['workflow_id', 'role_id']


class StepWeightManagementView(APIView):
    """
    Weight management endpoint for a workflow.
    
    GET /weights/workflow/<workflow_id>/
    - Retrieve all SLAs (low, medium, high, urgent) for the workflow
    - Retrieve all steps for that workflow with their weights
    
    PUT /weights/workflow/<workflow_id>/
    - Update weights for steps in the workflow
    - Expected payload: {"steps": [{"step_id": 1, "weight": 5}, ...]}
    """
    
    authentication_classes = [JWTCookieAuthentication]
    permission_classes = [IsAuthenticated]
    
    def get(self, request, workflow_id):
        """
        Retrieve workflow SLAs and all steps with their weights.
        
        Returns:
        {
            "workflow_id": 1,
            "workflow_name": "Request Processing",
            "slas": {
                "low_sla": "5 days",
                "medium_sla": "3 days",
                "high_sla": "1 day",
                "urgent_sla": "4 hours"
            },
            "steps": [
                {
                    "step_id": 1,
                    "name": "Submission",
                    "weight": 1,
                    "role_id": 1,
                    "role_name": "Submitter",
                    "order": 0
                },
                ...
            ]
        }
        """
        try:
            from workflow.models import Workflows
            workflow = Workflows.objects.get(workflow_id=workflow_id)
        except Workflows.DoesNotExist:
            return Response(
                {'error': f'Workflow with ID {workflow_id} not found'},
                status=status.HTTP_404_NOT_FOUND
            )
        
        # Get all steps for this workflow, ordered
        steps = Steps.objects.filter(
            workflow_id=workflow_id
        ).select_related('role_id').order_by('order')
        
        # Prepare response
        response_data = {
            'workflow_id': workflow.workflow_id,
            'workflow_name': workflow.name,
            'slas': {
                'low_sla': (workflow.low_sla) if workflow.low_sla else None,
                'medium_sla': (workflow.medium_sla) if workflow.medium_sla else None,
                'high_sla': (workflow.high_sla) if workflow.high_sla else None,
                'urgent_sla': (workflow.urgent_sla) if workflow.urgent_sla else None,
            },
            'steps': StepWeightSerializer(steps, many=True).data
        }
        
        return Response(response_data, status=status.HTTP_200_OK)
    
    def put(self, request, workflow_id):
        """
        Update weights for steps in the workflow.
        
        Expected payload:
        {
            "steps": [
                {"step_id": 1, "weight": 5},
                {"step_id": 2, "weight": 10},
                ...
            ]
        }
        
        Returns:
        {
            "message": "Weights updated successfully",
            "updated_count": 2,
            "steps": [...]
        }
        """
        try:
            from workflow.models import Workflows
            workflow = Workflows.objects.get(workflow_id=workflow_id)
        except Workflows.DoesNotExist:
            return Response(
                {'error': f'Workflow with ID {workflow_id} not found'},
                status=status.HTTP_404_NOT_FOUND
            )
        
        # Get the steps data from request
        steps_data = request.data.get('steps', [])
        
        if not steps_data:
            return Response(
                {'error': 'No steps data provided in request body'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        updated_count = 0
        updated_steps = []
        errors = []
        
        for step_info in steps_data:
            step_id = step_info.get('step_id')
            weight = step_info.get('weight')
            
            if not step_id or weight is None:
                errors.append(f'Missing step_id or weight in: {step_info}')
                continue
            
            try:
                step = Steps.objects.get(step_id=step_id, workflow_id=workflow_id)
                old_step = deepcopy(step)
                step.weight = weight
                step.save()
                updated_count += 1
                updated_steps.append(StepWeightSerializer(step).data)
                logger.info(f"✅ Updated weight for step {step_id} to {weight}")
                
                # Log audit event
                changes = compare_models(old_step, step)
                if changes:
                    try:
                        log_action(request.user, 'update_step', target=step, changes=changes, request=request)
                    except Exception as e:
                        logger.error(f"Failed to log audit for update_step: {e}")
            except Steps.DoesNotExist:
                errors.append(f'Step with ID {step_id} not found in workflow {workflow_id}')
            except (ValueError, TypeError) as e:
                errors.append(f'Invalid weight value for step {step_id}: {str(e)}')
        
        response_data = {
            'message': f'Updated {updated_count} step weights',
            'updated_count': updated_count,
            'steps': updated_steps,
        }
        
        if errors:
            response_data['errors'] = errors
        
        return Response(
            response_data,
            status=status.HTTP_200_OK if updated_count > 0 else status.HTTP_400_BAD_REQUEST
        )
