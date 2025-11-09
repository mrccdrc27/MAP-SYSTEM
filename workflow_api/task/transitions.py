from rest_framework import viewsets, status
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from rest_framework.generics import CreateAPIView
import logging

from task.models import Task
from task.serializers import TaskSerializer
from task.utils.assignment import assign_users_for_step
from authentication import JWTCookieAuthentication
from step.models import Steps, StepTransition

logger = logging.getLogger(__name__)


class TaskTransitionView(CreateAPIView):
    """
    POST endpoint to transition a task to the next step via a transition.
    
    This is a dedicated endpoint that handles workflow step transitions
    with automatic user assignment using round-robin logic.
    
    Endpoint: POST /transitions/
    
    Request Body:
    {
        "task_id": 1,
        "transition_id": 1
    }
    
    Example Response (200 OK):
    {
        "status": "success",
        "message": "Task transitioned to next step successfully",
        "task_id": 1,
        "previous_step": {
            "step_id": 2,
            "name": "Request Submission",
            "order": 1,
            "role": "User"
        },
        "current_step": {
            "step_id": 3,
            "name": "Approval",
            "order": 2,
            "description": "Manager approval required",
            "instruction": "Review and approve the request",
            "role": "Manager"
        },
        "assigned_users": [
            {
                "userID": 7,
                "username": "",
                "email": "",
                "status": "assigned",
                "assigned_on": "2025-11-10T10:30:00.000000+00:00",
                "role": "Manager"
            }
        ],
        "task_details": {
            "task_id": 1,
            "ticket_id": 1,
            "status": "pending",
            ...
        }
    }
    """
    
    serializer_class = TaskSerializer
    authentication_classes = [JWTCookieAuthentication]
    permission_classes = [IsAuthenticated]
    
    def create(self, request, *args, **kwargs):
        """Handle transition request"""
        task_id = request.data.get('task_id')
        transition_id = request.data.get('transition_id')
        
        # Validate required fields
        if not task_id:
            return Response(
                {'error': 'task_id field is required'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        if not transition_id:
            return Response(
                {'error': 'transition_id field is required'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Get task
        try:
            task = Task.objects.select_related(
                'ticket_id',
                'workflow_id',
                'current_step'
            ).get(task_id=task_id)
        except Task.DoesNotExist:
            return Response(
                {'error': f'Task {task_id} not found'},
                status=status.HTTP_404_NOT_FOUND
            )
        
        # Get transition
        try:
            transition = StepTransition.objects.select_related(
                'from_step_id',
                'to_step_id',
                'to_step_id__role_id'
            ).get(transition_id=transition_id)
        except StepTransition.DoesNotExist:
            return Response(
                {'error': f'Transition {transition_id} not found'},
                status=status.HTTP_404_NOT_FOUND
            )
        
        # Validate transition has a to_step (destination must always exist)
        if not transition.to_step_id:
            return Response(
                {
                    'error': f'Transition {transition_id} is terminal (to_step_id is NULL). '
                             f'Cannot transition to a null/end step',
                    'transition_id': transition_id
                },
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Core validation: Check if task's current_step matches the transition's from_step_id
        # This ensures the task is in the correct state to use this transition
        
        if transition.from_step_id is None:
            # This is a START transition (from_step_id = NULL)
            # Only valid if:
            # 1. Task is transitioning FROM its initial state to this start step, OR
            # 2. Task is being re-routed back to this start point
            
            # Prevent calling START transitions if task is already past the start
            # A START transition should typically only be used once at workflow initiation
            if task.current_step and task.current_step != transition.to_step_id:
                return Response(
                    {
                        'error': f'Cannot use START transition {transition_id}: '
                                 f'task is already at step {task.current_step.step_id} '
                                 f'({task.current_step.name}). '
                                 f'START transitions (from_step_id=NULL) can only transition from initial state.',
                        'current_step_id': task.current_step.step_id,
                        'current_step_name': task.current_step.name,
                        'transition_id': transition_id,
                        'transition_from_step': None,
                        'transition_to_step': transition.to_step_id.step_id
                    },
                    status=status.HTTP_400_BAD_REQUEST
                )
            logger.info(f"📍 START transition {transition_id} detected (from_step_id is NULL)")
        else:
            # This is a NORMAL transition - task MUST be at the from_step_id
            if not task.current_step:
                return Response(
                    {
                        'error': f'Task {task_id} has no current step assigned. '
                                 f'Cannot use transition {transition_id} which requires '
                                 f'being at step {transition.from_step_id.step_id}',
                        'task_id': task_id,
                        'transition_from_step': transition.from_step_id.step_id,
                        'transition_from_step_name': transition.from_step_id.name
                    },
                    status=status.HTTP_400_BAD_REQUEST
                )
            
            if task.current_step.step_id != transition.from_step_id.step_id:
                # Task's current step does NOT match the transition's starting point
                return Response(
                    {
                        'error': f'Invalid transition: task is at step {task.current_step.step_id} '
                                 f'({task.current_step.name}), but transition {transition_id} '
                                 f'requires starting from step {transition.from_step_id.step_id} '
                                 f'({transition.from_step_id.name}). Task cannot travel this route.',
                        'current_step_id': task.current_step.step_id,
                        'current_step_name': task.current_step.name,
                        'transition_id': transition_id,
                        'transition_from_step': transition.from_step_id.step_id,
                        'transition_from_step_name': transition.from_step_id.name,
                        'transition_to_step': transition.to_step_id.step_id
                    },
                    status=status.HTTP_400_BAD_REQUEST
                )
            
            logger.info(f"✅ Normal transition {transition_id} valid: step {task.current_step.step_id} → {transition.to_step_id.step_id}")
        
        # Store previous step for response
        previous_step = task.current_step
        next_step = transition.to_step_id
        
        # Validate next step has a role assigned
        if not next_step.role_id:
            return Response(
                {
                    'error': f'Next step {next_step.step_id} does not have a role assigned',
                    'step_id': next_step.step_id
                },
                status=status.HTTP_400_BAD_REQUEST
            )
        
        logger.info(
            f"🚀 Transitioning task {task.task_id} from step {previous_step.name} "
            f"to {next_step.name} via transition {transition_id}"
        )
        
        # Assign users for the next step using round-robin
        assigned_users = assign_users_for_step(next_step, next_step.role_id.name)
        
        if not assigned_users:
            return Response(
                {
                    'error': f'No users available for role {next_step.role_id.name}',
                    'step_id': next_step.step_id,
                    'role': next_step.role_id.name
                },
                status=status.HTTP_503_SERVICE_UNAVAILABLE
            )
        
        # Update task
        task.current_step = next_step
        task.users = assigned_users
        task.status = 'pending'
        task.save()
        
        logger.info(
            f"✅ Task {task.task_id} transitioned successfully. "
            f"New users: {[u.get('userID') for u in assigned_users]}"
        )
        
        # Return detailed response
        serializer = TaskSerializer(task)
        
        return Response({
            'status': 'success',
            'message': 'Task transitioned to next step successfully',
            'task_id': task.task_id,
            'previous_step': {
                'step_id': previous_step.step_id,
                'name': previous_step.name,
                'order': previous_step.order,
                'role': previous_step.role_id.name if previous_step.role_id else None,
            },
            'current_step': {
                'step_id': next_step.step_id,
                'name': next_step.name,
                'order': next_step.order,
                'description': next_step.description,
                'instruction': next_step.instruction,
                'role': next_step.role_id.name if next_step.role_id else None,
            },
            'assigned_users': assigned_users,
            'task_details': serializer.data,
        }, status=status.HTTP_200_OK)
