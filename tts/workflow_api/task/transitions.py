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
from workflow.models import WorkflowVersion

logger = logging.getLogger(__name__)


def get_workflow_definition(task):
    """Get workflow definition from WorkflowVersion."""
    return task.workflow_version.definition if task.workflow_version else None


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
        
        # transition_id can be None (finalize step action) or an integer (normal transition)
        is_finalize_action = transition_id is None
        
        # Validate and convert transition_id to integer if not None
        if not is_finalize_action:
            try:
                transition_id = int(transition_id)
            except (ValueError, TypeError):
                return Response(
                    {'error': f'transition_id must be an integer or null for finalize action'},
                    status=status.HTTP_400_BAD_REQUEST
                )
        
        # Validate and convert task_id to integer
        try:
            task_id = int(task_id)
        except (ValueError, TypeError):
            return Response(
                {'error': f'task_id must be an integer'},
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
        logger.info(f"User {current_user_id} attempting transition")
        
        # Get task
        try:
            task = Task.objects.select_related(
                'ticket_id',
                'workflow_id',
                'workflow_version',
                'current_step'
            ).get(task_id=task_id)
        except Task.DoesNotExist:
            return Response(
                {'error': f'Task {task_id} not found'},
                status=status.HTTP_404_NOT_FOUND
            )
        
        # Validate user is assigned to this task with "new" or "in progress" status
        # Note: A user can have multiple TaskItems for the same task (due to re-assignments after rejection)
        # We need to find the one that is currently actionable
        user_assignment = None
        try:
            # Get all TaskItems for this user on this task
            task_items = TaskItem.objects.filter(
                task=task,
                role_user__user_id=current_user_id
            ).select_related('role_user').prefetch_related('taskitemhistory_set').order_by('-assigned_on')
            
            if not task_items.exists():
                raise TaskItem.DoesNotExist("No TaskItems found for user")
            
            # Find the TaskItem with 'new' or 'in progress' status (actionable)
            for task_item in task_items:
                latest_history = task_item.taskitemhistory_set.order_by('-created_at').first()
                if latest_history and latest_history.status in ['new', 'in progress']:
                    user_assignment = task_item
                    logger.info(f"Found actionable TaskItem {task_item.task_item_id} for user {current_user_id}")
                    break
            
            if not user_assignment:
                # User has TaskItems but none are actionable
                raise TaskItem.DoesNotExist("No actionable TaskItems found")
                
        except TaskItem.DoesNotExist:
            # User has no "new" or "in progress" records - either not assigned or already acted on all assignments
            user_records = TaskItem.objects.filter(task=task, role_user__user_id=current_user_id)
            return Response(
                {
                    'error': f'User {current_user_id} has no active "new" or "in progress" status for task {task_id}',
                    'task_id': task_id,
                    'current_user_id': current_user_id,
                    'user_records': [item.to_dict() for item in user_records],
                    'message': 'User may have already acted on all their assignments or is not assigned to this task'
                },
                status=status.HTTP_403_FORBIDDEN
            )
        
        logger.info(f"User {current_user_id} validated for transition")
        
        # If user has 'new' status, update to 'in progress' and sync to HDTS
        try:
            from task.models import TaskItemHistory
            latest_history = user_assignment.taskitemhistory_set.order_by('-created_at').first()
            if latest_history and latest_history.status == 'new':
                # Create 'in progress' status record
                TaskItemHistory.objects.create(
                    task_item=user_assignment,
                    status='in progress'
                )
                logger.info(f"User {current_user_id} status updated from 'new' to 'in progress'")
                
                # Update local WorkflowTicket status to 'In Progress'
                try:
                    if hasattr(task.ticket_id, 'ticket_data'):
                        task.ticket_id.ticket_data['status'] = 'In Progress'
                        task.ticket_id.save()
                        logger.info(f"Updated local ticket {task.ticket_id.ticket_number} status to 'In Progress'")
                except Exception as e:
                    logger.error(f"Failed to update local ticket status to 'In Progress': {str(e)}")
                
                # Sync 'In Progress' status to HDTS
                try:
                    from celery import current_app
                    ticket_number = task.ticket_id.ticket_number if hasattr(task.ticket_id, 'ticket_number') else None
                    if ticket_number:
                        current_app.send_task(
                            'send_ticket_status',
                            args=[ticket_number, 'In Progress'],
                            queue='ticket_status-default'
                        )
                        logger.info(f"Sent status update to HDTS for ticket {ticket_number}: In Progress")
                except Exception as e:
                    logger.error(f"Failed to sync 'In Progress' status to HDTS: {str(e)}")
        except Exception as e:
            logger.error(f"Error updating user status to 'in progress': {str(e)}")
        
        # Handle finalize action (transition_id is None)
        if is_finalize_action:
            current_step = task.current_step
            
            if not current_step:
                return Response(
                    {
                        'error': 'Task has no current step assigned',
                        'task_id': task_id
                    },
                    status=status.HTTP_400_BAD_REQUEST
                )
            
            # Check if this step is referenced as a from_step in any transition
            # If it is NOT referenced, this is an end step
            step_has_outgoing_transitions = StepTransition.objects.filter(
                from_step_id=current_step
            ).exists()
            
            if step_has_outgoing_transitions:
                return Response(
                    {
                        'error': f'Cannot finalize step {current_step.name}: this step has available transitions',
                        'step_id': current_step.step_id,
                        'step_name': current_step.name,
                        'message': 'Use a proper transition action instead of finalize'
                    },
                    status=status.HTTP_400_BAD_REQUEST
                )
            
            logger.info(f"Finalize action detected on end step {current_step.name}")
            
            # Create history record for 'resolved' status
            from task.models import TaskItemHistory
            TaskItemHistory.objects.create(
                task_item=user_assignment,
                status='resolved'
            )
            
            # Update user assignment fields
            user_assignment.acted_on = timezone.now()
            user_assignment.assigned_on_step = current_step
            user_assignment.notes = notes  # Store notes
            user_assignment.save()
            logger.info(f"User {current_user_id} marked as resolved on final step")
            
            # Mark task as completed
            task.status = 'completed'
            task.save()
            
            logger.info(f"Task {task_id} completed via finalize action")
            
            # Update local WorkflowTicket status to 'Resolved'
            try:
                if hasattr(task.ticket_id, 'ticket_data'):
                    task.ticket_id.ticket_data['status'] = 'Resolved'
                    task.ticket_id.save()
                    logger.info(f"Updated local ticket {task.ticket_id.ticket_number} status to 'Resolved'")
            except Exception as e:
                logger.error(f"Failed to update local ticket status to 'Resolved': {str(e)}")
            
            # Sync ticket status back to HDTS
            try:
                from celery import current_app
                ticket_number = task.ticket_id.ticket_number if hasattr(task.ticket_id, 'ticket_number') else None
                if ticket_number:
                    current_app.send_task(
                        'send_ticket_status',
                        args=[ticket_number, 'Resolved'],
                        queue='ticket_status-default'
                    )
                    logger.info(f"Sent status update to HDTS for ticket {ticket_number}: Resolved")
            except Exception as e:
                logger.error(f"Failed to sync ticket status to HDTS: {str(e)}")
            
            # Return completion response
            serializer = TaskSerializer(task)
            
            return Response({
                'status': 'success',
                'message': 'Task completed successfully (finalized on end step)',
                'task_id': task_id,
                'workflow_status': 'completed',
                'current_user_id': current_user_id,
                'user_status': 'acted',
                'acted_on_step': {
                    'step_id': current_step.step_id,
                    'name': current_step.name
                },
                'transition_id': None,
                'is_finalize_action': True,
                'task_details': serializer.data,
            }, status=status.HTTP_200_OK)
        
        # Get transition for normal (non-finalize) action
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
            logger.info(f"Terminal transition detected: completing task {task_id}")
            
            # Validate task has a current step before terminal transition
            if not task.current_step:
                return Response(
                    {
                        'error': 'Task has no current step assigned. Cannot execute terminal transition.',
                        'task_id': task_id,
                        'transition_id': transition_id
                    },
                    status=status.HTTP_400_BAD_REQUEST
                )
            
            # Create history record for 'resolved' status
            from task.models import TaskItemHistory
            TaskItemHistory.objects.create(
                task_item=user_assignment,
                status='resolved'
            )
            
            # Update other fields
            user_assignment.acted_on = timezone.now()
            user_assignment.assigned_on_step = task.current_step
            user_assignment.notes = notes  # Store notes
            user_assignment.save()
            logger.info(f"User {current_user_id} marked as resolved")
            
            # Mark task as completed
            task.status = 'completed'
            task.save()
            
            logger.info(f"Task {task_id} completed")
            
            # Update local WorkflowTicket status to 'Resolved'
            try:
                if hasattr(task.ticket_id, 'ticket_data'):
                    task.ticket_id.ticket_data['status'] = 'Resolved'
                    task.ticket_id.save()
                    logger.info(f"Updated local ticket {task.ticket_id.ticket_number} status to 'Resolved'")
            except Exception as e:
                logger.error(f"Failed to update local ticket status to 'Resolved': {str(e)}")
            
            # Sync ticket status back to HDTS
            try:
                from celery import current_app
                ticket_number = task.ticket_id.ticket_number if hasattr(task.ticket_id, 'ticket_number') else None
                if ticket_number:
                    current_app.send_task(
                        'send_ticket_status',
                        args=[ticket_number, 'Resolved'],
                        queue='ticket_status-default'
                    )
                    logger.info(f"Sent status update to HDTS for ticket {ticket_number}: Resolved")
            except Exception as e:
                logger.error(f"Failed to sync ticket status to HDTS: {str(e)}")
            
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
                        'error': f'Cannot use START transition: task already at step {task.current_step.step_id}',

                        'current_step_id': task.current_step.step_id,
                        'current_step_name': task.current_step.name,
                        'transition_id': transition_id,
                        'transition_from_step': None,
                        'transition_to_step': transition.to_step_id.step_id
                    },
                    status=status.HTTP_400_BAD_REQUEST
                )
            logger.info(f"START transition detected")
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
            
            logger.info(f"Transition valid: step {task.current_step.step_id} → {transition.to_step_id.step_id}")
        
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
        
        logger.info(f"Transitioning task {task.task_id} to step {next_step.name}")
        
        # Assign users for the next step using round-robin
        assigned_items = assign_users_for_step(task, next_step, next_step.role_id.name)
        
        if not assigned_items:
            return Response(
                {
                    'error': f'No users available for role {next_step.role_id.name}',
                    'step_id': next_step.step_id,
                    'role': next_step.role_id.name
                },
                status=status.HTTP_503_SERVICE_UNAVAILABLE
            )
        
        # Mark the user assignment as "resolved" before moving to next step
        from task.models import TaskItemHistory
        TaskItemHistory.objects.create(
            task_item=user_assignment,
            status='resolved'
        )
        
        user_assignment.acted_on = timezone.now()
        user_assignment.assigned_on_step = task.current_step
        user_assignment.notes = notes
        user_assignment.save()
        logger.info(f"User {current_user_id} marked as resolved")
        
        # Update task
        task.current_step = next_step
        task.status = 'pending'
        task.save()
        
        logger.info(f"Task {task.task_id} transitioned successfully")
        
        # Update local WorkflowTicket status to 'In Progress' for middle transitions
        try:
            if hasattr(task.ticket_id, 'ticket_data'):
                task.ticket_id.ticket_data['status'] = 'In Progress'
                task.ticket_id.save()
                logger.info(f"Updated local ticket {task.ticket_id.ticket_number} status to 'In Progress'")
        except Exception as e:
            logger.error(f"Failed to update local ticket status during transition: {str(e)}")
        
        # Sync 'In Progress' status to HDTS for middle transitions
        try:
            from celery import current_app
            ticket_number = task.ticket_id.ticket_number if hasattr(task.ticket_id, 'ticket_number') else None
            if ticket_number:
                current_app.send_task(
                    'send_ticket_status',
                    args=[ticket_number, 'In Progress'],
                    queue='ticket_status-default'
                )
                logger.info(f"Sent status update to HDTS for ticket {ticket_number}: In Progress")
        except Exception as e:
            logger.error(f"Failed to sync 'In Progress' status to HDTS during transition: {str(e)}")
        
        # Return detailed response
        serializer = TaskSerializer(task)
        
        return Response({
            'status': 'success',
            'message': 'Task transitioned to next step successfully',
            'task_id': task.task_id,
            'current_user_id': current_user_id,
            'user_action_status': 'acted',
            'acted_on_step': {
                'step_id': user_assignment.assigned_on_step.step_id,
                'name': user_assignment.assigned_on_step.name
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
