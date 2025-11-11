from rest_framework import viewsets, status
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from rest_framework.generics import CreateAPIView
import logging
from django.utils import timezone

from task.models import Task, TaskItem
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
    """
    
    serializer_class = TaskSerializer
    authentication_classes = [JWTCookieAuthentication]
    permission_classes = [IsAuthenticated]
    
    def create(self, request, *args, **kwargs):
        """Handle transition request"""
        task_id = request.data.get('task_id')
        transition_id = request.data.get('transition_id')
        notes = request.data.get('notes', '').strip()  # Optional notes field
        
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
        
        # Validate notes are provided and not empty
        if not notes:
            return Response(
                {'error': 'notes field is required and cannot be empty. Please provide notes for this action transition.'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Extract current user_id from authenticated request
        if not hasattr(request, 'user') or not hasattr(request.user, 'user_id'):
            return Response(
                {'error': 'Current user information not found in request'},
                status=status.HTTP_401_UNAUTHORIZED
            )
        
        current_user_id = request.user.user_id
        current_user_full_name = getattr(request.user, 'full_name', '')
        logger.info(f"👤 User {current_user_id} ({current_user_full_name}) attempting transition")
        
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
        
        # Validate user is assigned to this task with "assigned" status
        user_assignment = None
        try:
            user_assignment = TaskItem.objects.get(
                task=task,
                user_id=current_user_id,
                status='assigned'
            )
        except TaskItem.DoesNotExist:
            # User has no "assigned" records - either not assigned or already acted on all assignments
            user_records = TaskItem.objects.filter(task=task, user_id=current_user_id)
            return Response(
                {
                    'error': f'User {current_user_id} has no active "assigned" status for task {task_id}',
                    'task_id': task_id,
                    'current_user_id': current_user_id,
                    'user_records': [item.to_dict() for item in user_records],
                    'message': 'User may have already acted on all their assignments or is not assigned to this task'
                },
                status=status.HTTP_403_FORBIDDEN
            )
        
        logger.info(
            f"✅ User {current_user_id} validated with status 'assigned' for role '{user_assignment.role}'"
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
        
        # Handle terminal transitions (to_step_id is NULL)
        if not transition.to_step_id:
            logger.info(
                f"🏁 Terminal transition {transition_id} detected (to_step_id is NULL). "
                f"Completing task {task_id}"
            )
            
            # Mark the user assignment as "acted" with the current step
            # Log the current user's full name on the TaskItem they are acting on
            user_assignment.name = current_user_full_name
            user_assignment.status = 'acted'
            user_assignment.acted_on = timezone.now()
            user_assignment.acted_on_step = task.current_step
            user_assignment.notes = notes  # Store notes
            user_assignment.save()
            logger.info(
                f"📝 Updated user {current_user_id} ({current_user_full_name}) TaskItem to 'acted' at step {task.current_step.name}"
            )
            
            # Mark task as completed
            task.status = 'completed'
            task.save()
            
            logger.info(
                f"✅ Task {task_id} completed successfully. "
                f"User {current_user_id} status updated to 'acted'"
            )
            
            # Return completion response
            serializer = TaskSerializer(task)
            
            return Response({
                'status': 'success',
                'message': 'Task completed successfully (terminal transition reached)',
                'task_id': task_id,
                'workflow_status': 'completed',
                'current_user_id': current_user_id,
                'user_status': 'acted',
                'acted_on_step': {
                    'step_id': task.current_step.step_id,
                    'name': task.current_step.name
                },
                'transition_id': transition_id,
                'is_terminal': True,
                'task_details': serializer.data,
            }, status=status.HTTP_200_OK)
        
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
        
        # Assign users for the next step using round-robin with authenticated user's full name
        assigned_items = assign_users_for_step(task, next_step, next_step.role_id.name, current_user_full_name)
        
        if not assigned_items:
            return Response(
                {
                    'error': f'No users available for role {next_step.role_id.name}',
                    'step_id': next_step.step_id,
                    'role': next_step.role_id.name
                },
                status=status.HTTP_503_SERVICE_UNAVAILABLE
            )
        
        # Mark the user assignment as "acted" before moving to next step
        # Log the current user's full name on the TaskItem they are acting on
        user_assignment.name = current_user_full_name
        user_assignment.status = 'acted'
        user_assignment.acted_on = timezone.now()
        user_assignment.acted_on_step = task.current_step
        user_assignment.notes = notes  # Store notes
        user_assignment.save()
        logger.info(
            f"📝 Updated user {current_user_id} ({current_user_full_name}) TaskItem to 'acted' at step {task.current_step.name}"
        )
        
        # Update task
        task.current_step = next_step
        task.status = 'pending'
        task.save()
        
        logger.info(
            f"✅ Task {task.task_id} transitioned successfully. "
            f"User {current_user_id} status changed to 'acted' at step {user_assignment.acted_on_step.name}. "
            f"New assigned users: {[item.user_id for item in assigned_items]}"
        )
        
        # Return detailed response
        serializer = TaskSerializer(task)
        
        return Response({
            'status': 'success',
            'message': 'Task transitioned to next step successfully',
            'task_id': task.task_id,
            'current_user_id': current_user_id,
            'user_action_status': 'acted',
            'acted_on_step': {
                'step_id': user_assignment.acted_on_step.step_id,
                'name': user_assignment.acted_on_step.name
            },
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
            'assigned_users': [item.to_dict() for item in assigned_items],
            'task_details': serializer.data,
        }, status=status.HTTP_200_OK)
