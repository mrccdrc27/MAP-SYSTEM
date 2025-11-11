from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from rest_framework.generics import ListAPIView
from rest_framework.filters import SearchFilter, OrderingFilter
from django_filters.rest_framework import DjangoFilterBackend
from django.db.models import Q
import logging
import uuid

from .models import Task, TaskItem
from .serializers import TaskSerializer, UserTaskListSerializer, TaskCreateSerializer
from .utils.assignment import assign_users_for_step
from authentication import JWTCookieAuthentication, MultiSystemPermission
from step.models import Steps, StepTransition
from tickets.models import WorkflowTicket

logger = logging.getLogger(__name__)


class UserTaskListView(ListAPIView):
    """
    View to list tasks assigned to the authenticated user.
    """
    
    serializer_class = UserTaskListSerializer
    authentication_classes = [JWTCookieAuthentication]
    permission_classes = [IsAuthenticated]
    filter_backends = [DjangoFilterBackend, SearchFilter, OrderingFilter]
    filterset_fields = ['status', 'workflow_id']
    search_fields = ['ticket_id__subject', 'ticket_id__description']
    ordering_fields = ['created_at', 'updated_at', 'status']
    ordering = ['-created_at']
    
    def get_queryset(self):
        """
        Filter tasks to only those assigned to the current user.
        Extended filtering based on query parameters.
        """
        user_id = self.request.user.user_id
        
        # Get all tasks that have this user assigned via TaskItem
        queryset = Task.objects.filter(
            taskitem__user_id=user_id
        ).distinct()
        
        # Apply additional filters from query parameters
        role = self.request.query_params.get('role')
        assignment_status = self.request.query_params.get('assignment_status')
        
        if role:
            # Filter by role - check TaskItems for matching role
            queryset = queryset.filter(taskitem__user_id=user_id, taskitem__role=role)
        
        if assignment_status:
            # Filter by assignment status - check TaskItems for matching status
            queryset = queryset.filter(taskitem__user_id=user_id, taskitem__status=assignment_status)
        
        return queryset.select_related('ticket_id', 'workflow_id', 'current_step').distinct()
    
    def get_serializer_context(self):
        """Add user_id to serializer context for extracting user-specific assignment data"""
        context = super().get_serializer_context()
        context['user_id'] = self.request.user.user_id
        return context


class TaskViewSet(viewsets.ModelViewSet):
    """
    ViewSet for managing tasks with authentication.
    
    Actions:
    - list: GET /tasks/ - List all tasks
    - retrieve: GET /tasks/{id}/ - Get task details
    - create: POST /tasks/ - Create new task
    - update: PUT /tasks/{id}/ - Update task
    - partial_update: PATCH /tasks/{id}/ - Partially update task
    - destroy: DELETE /tasks/{id}/ - Delete task
    - my-tasks: GET /tasks/my-tasks/ - Get user's assigned tasks
    - update-user-status: POST /tasks/{id}/update-user-status/ - Update user's task status
    - workflow-visualization: GET /tasks/workflow-visualization/?task_id={task_id} - Get workflow visualization data
    
    Note: Task transitions are handled by a separate endpoint at POST /transitions/
    """
    
    queryset = Task.objects.select_related('ticket_id', 'workflow_id', 'current_step')
    serializer_class = TaskSerializer
    authentication_classes = [JWTCookieAuthentication]
    permission_classes = [IsAuthenticated]
    filter_backends = [DjangoFilterBackend, SearchFilter, OrderingFilter]
    filterset_fields = ['status', 'workflow_id', 'ticket_id']
    search_fields = ['ticket_id__subject', 'ticket_id__ticket_id']
    ordering_fields = ['created_at', 'updated_at', 'status']
    ordering = ['-created_at']
    
    @action(detail=False, methods=['get'], url_path='my-tasks')
    def my_tasks(self, request):
        """
        Get all tasks assigned to the current user.
        This is a convenience endpoint that wraps UserTaskListView functionality.
        
        Same query parameters as UserTaskListView apply here.
        """
        user_id = request.user.user_id
        
        # Filter tasks by user ID via TaskItems
        filtered_tasks = Task.objects.filter(
            taskitem__user_id=user_id
        ).select_related('ticket_id', 'workflow_id', 'current_step').distinct()
        
        # Apply pagination if needed
        page = self.paginate_queryset(filtered_tasks)
        if page is not None:
            serializer = UserTaskListSerializer(
                page, 
                many=True, 
                context={**self.get_serializer_context(), 'user_id': user_id}
            )
            return self.get_paginated_response(serializer.data)
        
        serializer = UserTaskListSerializer(
            filtered_tasks, 
            many=True, 
            context={**self.get_serializer_context(), 'user_id': user_id}
        )
        return Response(serializer.data)
    
    @action(detail=True, methods=['post'], url_path='update-user-status')
    def update_user_status(self, request, pk=None):
        """
        Update the status of a specific user's assignment in this task.
        
        Request Body:
        {
            "status": "in_progress"  # or "completed", "on_hold", "assigned"
        }
        
        Returns updated task with user assignment details.
        """
        task = self.get_object()
        user_id = request.user.user_id
        new_status = request.data.get('status')
        
        if not new_status:
            return Response(
                {'error': 'status field is required'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Validate status
        valid_statuses = ['assigned', 'in_progress', 'completed', 'on_hold', 'acted']
        if new_status not in valid_statuses:
            return Response(
                {'error': f'status must be one of: {valid_statuses}'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Get or create TaskItem for this user
        try:
            task_item = TaskItem.objects.get(task=task, user_id=user_id)
            task_item.status = new_status
            task_item.save()
        except TaskItem.DoesNotExist:
            return Response(
                {'error': f'User {user_id} is not assigned to this task'},
                status=status.HTTP_403_FORBIDDEN
            )
        
        serializer = UserTaskListSerializer(
            task,
            context={**self.get_serializer_context(), 'user_id': user_id}
        )
        return Response(serializer.data)
    
    @action(detail=False, methods=['get'], url_path='details')
    def task_details(self, request):
        """
        GET endpoint to retrieve complete task details with step information and available transitions.
        
        Query Parameters:
        - task_id: (optional) Get task by task_id (integer or UUID)
        - ticket_id: (optional) Get task by ticket_id string (e.g., TX20251111322614)
        
        At least one of task_id or ticket_id must be provided.
        
        Examples:
        - /tasks/details/?task_id=1
        - /tasks/details/?ticket_id=TX20251111322614
        
        Response includes:
        - step_instance_id: UUID identifier for this task instance
        - user_id: Current authenticated user ID
        - step_transition_id: UUID identifier for transitions
        - has_acted: Boolean indicating if user has acted on this task
        - step: Detailed step information (name, description, instruction, etc.)
        - task: Complete task details with nested ticket information
        - available_actions: List of available transitions from current step
        """
        task_id_param = request.query_params.get('task_id')
        ticket_id_param = request.query_params.get('ticket_id')
        user_id = request.user.user_id
        
        # Validate that at least one identifier is provided
        if not task_id_param and not ticket_id_param:
            return Response(
                {
                    'error': 'Either task_id or ticket_id query parameter must be provided',
                    'examples': {
                        'by_task_id': '/tasks/details/?task_id=1',
                        'by_ticket_id': '/tasks/details/?ticket_id=TX20251111322614'
                    }
                },
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Fetch task based on provided identifier
        try:
            if task_id_param:
                # Try to find task by task_id (integer or UUID string)
                task = Task.objects.select_related(
                    'ticket_id',
                    'workflow_id',
                    'current_step',
                    'current_step__role_id'
                ).get(task_id=task_id_param)
            else:
                # Find task by ticket_id (string like TX20251111322614)
                # First find the ticket by ticket_id
                ticket = WorkflowTicket.objects.get(ticket_id=ticket_id_param)
                # Then find the task associated with this ticket
                task = Task.objects.select_related(
                    'ticket_id',
                    'workflow_id',
                    'current_step',
                    'current_step__role_id'
                ).get(ticket_id=ticket)
        except WorkflowTicket.DoesNotExist:
            return Response(
                {
                    'error': f'Ticket not found',
                    'searched_by': 'ticket_id',
                    'value': ticket_id_param
                },
                status=status.HTTP_404_NOT_FOUND
            )
        except Task.DoesNotExist:
            return Response(
                {
                    'error': f'Task not found',
                    'searched_by': 'task_id' if task_id_param else 'ticket_id',
                    'value': task_id_param or ticket_id_param
                },
                status=status.HTTP_404_NOT_FOUND
            )
        
        # Check if user is assigned to this task
        has_acted = TaskItem.objects.filter(
            task=task,
            user_id=user_id,
            status='acted'
        ).exists()
        
        # Get step information
        current_step = task.current_step
        if not current_step:
            return Response(
                {
                    'error': 'Task has no current step assigned',
                    'task_id': task.task_id
                },
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Get available transitions from current step
        available_transitions = StepTransition.objects.filter(
            from_step_id=current_step
        ).select_related('to_step_id', 'to_step_id__role_id')
        
        # Build available actions list
        available_actions = []
        for transition in available_transitions:
            action_data = {
                'id': transition.transition_id,
                'transition_id': transition.transition_id,
                'name': transition.name or f'{current_step.name} → {transition.to_step_id.name if transition.to_step_id else "End"}',
                'description': transition.to_step_id.description if transition.to_step_id else 'Complete workflow',
                'from_step_id': current_step.step_id,
                'to_step_id': transition.to_step_id.step_id if transition.to_step_id else None,
                'to_step_name': transition.to_step_id.name if transition.to_step_id else 'Complete',
                'to_step_role': transition.to_step_id.role_id.name if transition.to_step_id and transition.to_step_id.role_id else None,
            }
            available_actions.append(action_data)
        
        # Serialize the ticket with all its details
        from tickets.serializers import WorkflowTicketSerializer
        ticket_serializer = WorkflowTicketSerializer(task.ticket_id)
        
        # Build response
        response_data = {
            'user_id': user_id,
            'has_acted': has_acted,
            'step': {
                'id': current_step.step_id,
                'step_id': str(current_step.step_id),
                'workflow_id': str(current_step.workflow_id.workflow_id) if current_step.workflow_id else None,
                'role_id': str(current_step.role_id.role_id) if current_step.role_id else None,
                'name': current_step.name,
                'description': current_step.description,
                'is_initialized': current_step.is_initialized,
                'created_at': current_step.created_at.isoformat() if current_step.created_at else None,
                'updated_at': current_step.updated_at.isoformat() if current_step.updated_at else None,
                'instruction': current_step.instruction,
                'order': current_step.order,
            },
            'task': {
                'task_id': str(task.task_id),
                'workflow_id': task.workflow_id.workflow_id,
                'ticket': ticket_serializer.data,
                'status': task.status,
                'created_at': task.created_at.isoformat() if task.created_at else None,
                'updated_at': task.updated_at.isoformat() if task.updated_at else None,
                'fetched_at': task.fetched_at.isoformat() if task.fetched_at else None,
            },
            'available_actions': available_actions,
        }
        
        return Response(response_data, status=status.HTTP_200_OK)
    
    @action(detail=False, methods=['get'], url_path='workflow-visualization')
    def workflow_visualization(self, request):
        """
        GET endpoint to retrieve workflow visualization data for a specific task.
        
        Returns a structured format compatible with WorkflowVisualizer2 component.
        
        Query Parameters:
        - task_id: (optional) The task ID (integer or UUID)
        - ticket_id: (optional) The ticket ID string (e.g., TX20251111322614)
        
        At least one of task_id or ticket_id must be provided.
        
        Examples:
        - /tasks/workflow-visualization/?task_id=1
        - /tasks/workflow-visualization/?ticket_id=TX20251111322614
        
        Response format:
        {
            "nodes": [
                {
                    "id": "step-1",
                    "label": "Submit Ticket",
                    "role": "User",
                    "status": "done"  // "done", "active", or "pending"
                },
                ...
            ],
            "metadata": {
                "task_id": 1,
                "workflow_id": "uuid-string",
                "ticket_id": "TX20251111322614",
                "current_step_id": "2",
                "task_status": "in_progress"
            }
        }
        """
        task_id_param = request.query_params.get('task_id')
        ticket_id_param = request.query_params.get('ticket_id')
        
        # Validate that at least one identifier is provided
        if not task_id_param and not ticket_id_param:
            return Response(
                {
                    'error': 'Either task_id or ticket_id query parameter must be provided',
                    'examples': {
                        'by_task_id': '/tasks/workflow-visualization/?task_id=1',
                        'by_ticket_id': '/tasks/workflow-visualization/?ticket_id=TX20251111322614'
                    }
                },
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Fetch task based on provided identifier
        try:
            if task_id_param:
                # Try to find task by task_id (integer or UUID string)
                task = Task.objects.select_related(
                    'workflow_id',
                    'current_step'
                ).get(task_id=task_id_param)
            else:
                # Find task by ticket_id (string like TX20251111322614)
                # First find the ticket by ticket_id
                ticket = WorkflowTicket.objects.get(ticket_id=ticket_id_param)
                # Then find the task associated with this ticket
                task = Task.objects.select_related(
                    'workflow_id',
                    'current_step'
                ).get(ticket_id=ticket)
        except WorkflowTicket.DoesNotExist:
            return Response(
                {
                    'error': 'Ticket not found',
                    'searched_by': 'ticket_id',
                    'value': ticket_id_param
                },
                status=status.HTTP_404_NOT_FOUND
            )
        except Task.DoesNotExist:
            return Response(
                {
                    'error': 'Task not found',
                    'searched_by': 'task_id' if task_id_param else 'ticket_id',
                    'value': task_id_param or ticket_id_param
                },
                status=status.HTTP_404_NOT_FOUND
            )
        
        # Get all steps in the workflow, ordered by their order field
        workflow_steps = Steps.objects.filter(
            workflow_id=task.workflow_id
        ).select_related('role_id').order_by('order')
        
        if not workflow_steps.exists():
            return Response(
                {
                    'error': 'No steps found for this workflow',
                    'workflow_id': str(task.workflow_id.workflow_id)
                },
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Build nodes list
        nodes = []
        current_step_id = task.current_step.step_id if task.current_step else None
        
        for step in workflow_steps:
            # Determine status based on current step
            if step.step_id == current_step_id:
                node_status = 'active'
            elif step.order < (task.current_step.order if task.current_step else 0):
                node_status = 'done'
            else:
                node_status = 'pending'
            
            node = {
                'id': f'step-{step.step_id}',
                'label': step.name,
                'role': step.role_id.name if step.role_id else 'Unassigned',
                'status': node_status
            }
            nodes.append(node)
        
        response_data = {
            'nodes': nodes,
            'metadata': {
                'task_id': task.task_id,
                'workflow_id': str(task.workflow_id.workflow_id),
                'ticket_id': task.ticket_id.ticket_id,
                'current_step_id': str(current_step_id) if current_step_id else None,
                'task_status': task.status
            }
        }
        
        return Response(response_data, status=status.HTTP_200_OK)
