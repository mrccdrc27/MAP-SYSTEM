from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from rest_framework.generics import ListAPIView
from rest_framework.filters import SearchFilter, OrderingFilter
from django_filters.rest_framework import DjangoFilterBackend
from django.db.models import Q
from django.utils import timezone
import logging
from copy import deepcopy

from audit.utils import log_action, compare_models
from .models import Task, TaskItem, TaskItemHistory
from .serializers import TaskSerializer, UserTaskListSerializer, TaskCreateSerializer, ActionLogSerializer, TaskItemSerializer
from authentication import JWTCookieAuthentication
from step.models import Steps, StepTransition
from tickets.models import WorkflowTicket
from role.models import RoleUsers

logger = logging.getLogger(__name__)


class UserTaskListView(ListAPIView):
    """
    View to list TaskItems assigned to the authenticated user.
    Each row represents a TaskItem with associated task and ticket data.
    """
    serializer_class = UserTaskListSerializer
    authentication_classes = [JWTCookieAuthentication]
    permission_classes = [IsAuthenticated]
    filter_backends = [SearchFilter, OrderingFilter]
    search_fields = ['task__ticket_id__subject', 'task__ticket_id__description']
    ordering_fields = ['assigned_on']
    ordering = ['-assigned_on']
    
    def get_queryset(self):
        """Filter TaskItems assigned to the current user."""
        user_id = self.request.user.user_id
        
        queryset = TaskItem.objects.filter(
            role_user__user_id=user_id
        ).select_related(
            'task__ticket_id', 
            'task__workflow_id', 
            'task__current_step', 
            'role_user', 
            'assigned_on_step'
        ).prefetch_related('taskitemhistory_set')
        
        # Apply role filter if provided
        role = self.request.query_params.get('role')
        if role:
            queryset = queryset.filter(role_user__role_id__name=role)
        
        return queryset
    
    def filter_queryset(self, queryset):
        """Override to filter by status from history after serialization"""
        queryset = super().filter_queryset(queryset)
        
        # Handle status filter if provided (filter in Python since it's from history)
        assignment_status = self.request.query_params.get('assignment_status')
        workflow_id = self.request.query_params.get('task__workflow_id')
        
        if workflow_id:
            queryset = queryset.filter(task__workflow_id=workflow_id)
        
        if assignment_status:
            # Filter in memory based on latest history status
            filtered_list = []
            for item in queryset:
                latest_history = item.taskitemhistory_set.order_by('-created_at').first()
                status = latest_history.status if latest_history else 'new'
                if status == assignment_status:
                    filtered_list.append(item.id)
            queryset = queryset.filter(id__in=filtered_list)
        
        return queryset


class AllTasksListView(ListAPIView):
    """
    View to list all TaskItems across all users.
    Same as UserTaskListView but without user filtering.
    Each row represents a TaskItem with associated task and ticket data.
    """
    serializer_class = UserTaskListSerializer
    authentication_classes = [JWTCookieAuthentication]
    permission_classes = [IsAuthenticated]
    filter_backends = [SearchFilter, OrderingFilter]
    search_fields = ['task__ticket_id__subject', 'task__ticket_id__description']
    ordering_fields = ['assigned_on']
    ordering = ['-assigned_on']
    
    def get_queryset(self):
        """Return all TaskItems without user filtering."""
        queryset = TaskItem.objects.select_related(
            'task__ticket_id', 
            'task__workflow_id', 
            'task__current_step', 
            'role_user', 
            'assigned_on_step'
        ).prefetch_related('taskitemhistory_set')
        
        # Apply role filter if provided
        role = self.request.query_params.get('role')
        if role:
            queryset = queryset.filter(role_user__role_id__name=role)
        
        return queryset
    
    def filter_queryset(self, queryset):
        """Override to filter by status from history after serialization"""
        queryset = super().filter_queryset(queryset)
        
        # Handle status filter if provided
        assignment_status = self.request.query_params.get('assignment_status')
        workflow_id = self.request.query_params.get('task__workflow_id')
        
        if workflow_id:
            queryset = queryset.filter(task__workflow_id=workflow_id)
        
        if assignment_status:
            # Filter in memory based on latest history status
            filtered_list = []
            for item in queryset:
                latest_history = item.taskitemhistory_set.order_by('-created_at').first()
                status = latest_history.status if latest_history else 'new'
                if status == assignment_status:
                    filtered_list.append(item.id)
            queryset = queryset.filter(id__in=filtered_list)
        
        return queryset


class TaskViewSet(viewsets.ModelViewSet):
    """ViewSet for managing tasks with authentication."""
    
    queryset = Task.objects.select_related('ticket_id', 'workflow_id', 'current_step')
    serializer_class = TaskSerializer
    authentication_classes = [JWTCookieAuthentication]
    permission_classes = [IsAuthenticated]
    filter_backends = [DjangoFilterBackend, SearchFilter, OrderingFilter]
    filterset_fields = ['status', 'workflow_id', 'ticket_id']
    search_fields = ['ticket_id__subject', 'ticket_id__ticket_id']
    ordering_fields = ['created_at', 'updated_at', 'status']
    ordering = ['-created_at']
    
    def create(self, request, *args, **kwargs):
        """Create a new task with audit logging."""
        response = super().create(request, *args, **kwargs)
        if response.status_code == 201:
            # Log audit event
            try:
                task = Task.objects.get(task_id=response.data['task_id'])
                log_action(request.user, 'create_task', target=task, request=request)
            except Exception as e:
                logger.error(f"Failed to log audit for create_task: {e}")
        return response
    
    def update(self, request, *args, **kwargs):
        """Update task with audit logging."""
        task = self.get_object()
        old_task = deepcopy(task)
        response = super().update(request, *args, **kwargs)
        if response.status_code == 200:
            # Log audit event
            changes = compare_models(old_task, task)
            if changes:
                try:
                    log_action(request.user, 'update_task', target=task, changes=changes, request=request)
                except Exception as e:
                    logger.error(f"Failed to log audit for update_task: {e}")
        return response
    
    def destroy(self, request, *args, **kwargs):
        """Delete task with audit logging."""
        task = self.get_object()
        try:
            log_action(request.user, 'delete_task', target=task, request=request)
        except Exception as e:
            logger.error(f"Failed to log audit for delete_task: {e}")
        return super().destroy(request, *args, **kwargs)
    
    @action(detail=True, methods=['post'], url_path='update-user-status')
    def update_user_status(self, request, pk=None):
        """
        Update the status of a specific user's assignment in this task.
        
        Request Body:
        {
            "status": "in progress"  # or "completed", "on_hold", "assigned"
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
        valid_statuses = ['new', 'in progress', 'resolved', 'reassigned', 'escalated', 'breached']
        if new_status not in valid_statuses:
            return Response(
                {'error': f'status must be one of: {valid_statuses}'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Get or create TaskItem for this user
        try:
            task_item = TaskItem.objects.get(task=task, role_user__user_id=user_id)
            old_task_item = deepcopy(task_item)
            task_item.status = new_status
            task_item.save()
            
            # Log audit event
            changes = compare_models(old_task_item, task_item)
            if changes:
                try:
                    log_action(request.user, 'update_task', target=task, changes=changes, request=request)
                except Exception as e:
                    logger.error(f"Failed to log audit for update_task: {e}")
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
    
    @action(detail=False, methods=['get'], url_path='logs')
    def logs(self, request):
        """
        GET endpoint to retrieve action logs for a task.
        
        Query Parameters (at least one required):
        - task_id: (optional) The task ID (integer)
        - ticket_id: (optional) The ticket ID string (e.g., TX20251111322614)
        
        Examples:
        - /tasks/logs/?task_id=1
        - /tasks/logs/?ticket_id=TX20251111322614
        
        Response format:
        {
            "task_id": 1,
            "ticket_id": "TX20251111322614",
            "workflow_id": "uuid-string",
            "logs": [
                {
                    "id": 1,
                    "action": { "name": "Created" },
                    "acted_on": "2025-11-11T10:30:00Z",
                    "user": "john_doe",
                    "role": "Initiator",
                    "comment": "Initial ticket creation"
                },
                {
                    "id": 2,
                    "action": { "name": "Reviewed" },
                    "acted_on": "2025-11-11T11:15:00Z",
                    "user": "jane_smith",
                    "role": "Reviewer",
                    "comment": "Approved for processing"
                }
            ]
        }
        """
        task_id_param = request.query_params.get('task_id')
        ticket_id_param = request.query_params.get('ticket_id')
        
        # Validate at least one identifier is provided
        if not task_id_param and not ticket_id_param:
            return Response(
                {
                    'error': 'Either task_id or ticket_id query parameter is required',
                    'examples': {
                        'by_task_id': '/tasks/logs/?task_id=1',
                        'by_ticket_id': '/tasks/logs/?ticket_id=TX20251111322614'
                    }
                },
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Find task based on provided identifier
        try:
            if task_id_param:
                task = Task.objects.select_related(
                    'ticket_id',
                    'workflow_id'
                ).get(task_id=task_id_param)
            else:
                # Find task by ticket_id - search in both ticket_number and ticket_data
                ticket = None
                try:
                    # Try as ticket_number first
                    ticket = WorkflowTicket.objects.get(ticket_number=ticket_id_param)
                except WorkflowTicket.DoesNotExist:
                    # Try as ticket_id in ticket_data
                    ticket = WorkflowTicket.objects.get(ticket_data__ticket_id=ticket_id_param)
                
                task = Task.objects.select_related(
                    'ticket_id',
                    'workflow_id'
                ).get(ticket_id=ticket)
        except (Task.DoesNotExist, WorkflowTicket.DoesNotExist):
            return Response(
                {
                    'error': 'Task or ticket not found',
                    'searched_by': 'task_id' if task_id_param else 'ticket_id',
                    'value': task_id_param or ticket_id_param
                },
                status=status.HTTP_404_NOT_FOUND
            )
        
        # Get all TaskItems with acted_on (completed actions), ordered by acted_on time
        all_task_items = TaskItem.objects.filter(
            task=task,
            acted_on__isnull=False
        ).select_related(
            'assigned_on_step', 
            'assigned_on_step__role_id'
        ).prefetch_related('taskitemhistory_set').order_by('acted_on')
        
        # Filter to only those with 'resolved' status from history
        action_items = []
        for item in all_task_items:
            latest_history = item.taskitemhistory_set.order_by('-created_at').first()
            if latest_history and latest_history.status == 'resolved':
                action_items.append(item)
        
        # Serialize the action logs
        serializer = ActionLogSerializer(action_items, many=True)
        
        response_data = {
            'task_id': task.task_id,
            'ticket_id': task.ticket_id.ticket_id,
            'workflow_id': str(task.workflow_id.workflow_id),
            'logs': serializer.data
        }
        
        return Response(response_data, status=status.HTTP_200_OK)
    
    @action(detail=False, methods=['get'], url_path='detail/(?P<task_item_id>[0-9]+)')
    def task_details(self, request, task_item_id=None):
        """
        GET endpoint to retrieve complete task details with step information and available transitions.
        
        URL Path:
        - /tasks/detail/{task_item_id}/
        
        Example:
        - /tasks/detail/4/
        
        Response includes:
        - step_instance_id: UUID identifier for this task instance
        - task_item_id: The TaskItem ID for this assignment
        - user_id: Current authenticated user ID
        - step_transition_id: UUID identifier for transitions
        - has_acted: Boolean indicating if user has acted on this task
        - current_owner: Most recent TaskItem details (user who currently owns the task)
        - step: Detailed step information (name, description, instruction, etc.)
        - task: Complete task details with nested ticket information
        - available_actions: List of available transitions from current step
        """
        if not task_item_id:
            return Response(
                {
                    'error': 'task_item_id is required in URL path',
                    'example': '/tasks/detail/4/'
                },
                status=status.HTTP_400_BAD_REQUEST
            )
        
        user_id = request.user.user_id
        
        # Fetch TaskItem by task_item_id
        try:
            user_assignment = TaskItem.objects.select_related(
                'task',
                'task__ticket_id',
                'task__workflow_id',
                'task__current_step',
                'task__current_step__role_id',
                'role_user'
            ).get(task_item_id=task_item_id)
        except TaskItem.DoesNotExist:
            return Response(
                {
                    'error': f'TaskItem {task_item_id} not found',
                    'task_item_id': task_item_id
                },
                status=status.HTTP_404_NOT_FOUND
            )
        
        # Verify the TaskItem belongs to the current user, or user is an admin
        is_admin = request.user.has_system_role('tts', 'Admin') or request.user.has_system_role('hdts', 'Admin')
        
        if user_assignment.role_user.user_id != user_id and not is_admin:
            return Response(
                {
                    'error': 'You do not have permission to view this task item',
                    'task_item_id': task_item_id
                },
                status=status.HTTP_403_FORBIDDEN
            )
        
        task = user_assignment.task
        
        # ✅ Set task_item status to 'in progress' only if it hasn't already been viewed
        # Check if there's already an 'in progress' or later status (not just 'new')
        latest_history = user_assignment.taskitemhistory_set.order_by('-created_at').first()
        current_status = latest_history.status if latest_history else 'new'
        
        if current_status == 'new':
            # Create history record for transition from 'new' to 'in progress'
            from task.models import TaskItemHistory
            TaskItemHistory.objects.create(
                task_item=user_assignment,
                status='in progress'
            )
            logger.info(
                f"✅ Task {task.task_id} set to 'in progress' for user {user_id}"
            )
        
        has_acted = user_assignment.taskitemhistory_set.filter(status__in=['resolved', 'escalated']).exists()
        is_escalated = user_assignment.origin == 'Escalation'
        
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
        
        # Build available_actions list
        available_actions = []
        for transition in available_transitions:
            action_data = {
                'transition_id': str(transition.transition_id),
                'id': transition.transition_id,
                'name': transition.name or f'{current_step.name} → {transition.to_step_id.name if transition.to_step_id else "End"}',
                'description': transition.to_step_id.description if transition.to_step_id else 'Complete workflow',
            }
            available_actions.append(action_data)
        
        # Get first step transition for step_transition_id (use from_step outgoing transitions)
        step_transition_id = None
        if available_transitions.exists():
            step_transition_id = str(available_transitions.first().transition_id)
        
        # Flatten ticket data - merge ticket_data fields directly into ticket object
        ticket_data = task.ticket_id.ticket_data.copy() if task.ticket_id.ticket_data else {}
        ticket_response = {
            'id': task.ticket_id.id,
            'ticket_number': task.ticket_id.ticket_number,
            'is_task_allocated': task.ticket_id.is_task_allocated,
            'fetched_at': task.ticket_id.fetched_at.isoformat() if task.ticket_id.fetched_at else None,
            'created_at': task.ticket_id.created_at.isoformat() if task.ticket_id.created_at else None,
            'updated_at': task.ticket_id.updated_at.isoformat() if task.ticket_id.updated_at else None,
        }
        # Merge all ticket_data fields into the response
        ticket_response.update(ticket_data)
        
        # Get the most recent TaskItem (current owner) for this task
        most_recent_task_item = TaskItem.objects.filter(
            task=task
        ).select_related('role_user', 'role_user__role_id').prefetch_related('taskitemhistory_set').order_by('-assigned_on').first()
        
        current_owner = None
        if most_recent_task_item:
            # Get latest status from history
            latest_history = most_recent_task_item.taskitemhistory_set.order_by('-created_at').first()
            status_value = latest_history.status if latest_history else 'new'
            status_updated_on = latest_history.created_at if latest_history else most_recent_task_item.assigned_on
            
            current_owner = {
                'task_item_id': most_recent_task_item.task_item_id,
                'user_id': most_recent_task_item.role_user.user_id,
                'user_full_name': most_recent_task_item.role_user.user_full_name,
                'role': most_recent_task_item.role_user.role_id.name if most_recent_task_item.role_user.role_id else None,
                'status': status_value,
                'origin': most_recent_task_item.origin,
                'assigned_on': most_recent_task_item.assigned_on.isoformat() if most_recent_task_item.assigned_on else None,
                'status_updated_on': status_updated_on.isoformat() if status_updated_on else None,
                'acted_on': most_recent_task_item.acted_on.isoformat() if most_recent_task_item.acted_on else None,
            }
        
        # Build response
        response_data = {
            'step_instance_id': str(task.task_id),
            'task_item_id': int(task_item_id),
            'user_id': user_id,
            'step_transition_id': step_transition_id,
            'has_acted': has_acted,
            'is_escalated': is_escalated,
            'current_owner': current_owner,
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
            },
            'task': {
                'task_id': str(task.task_id),
                'workflow_id': task.workflow_id.workflow_id,
                'ticket': ticket_response,
                'fetched_at': task.fetched_at.isoformat() if task.fetched_at else None,
            },
            'available_actions': available_actions,
        }
        
        return Response(response_data, status=status.HTTP_200_OK)
    
    @action(detail=False, methods=['get'], url_path='workflow-visualization')
    def workflow_visualization(self, request):
        """
        GET endpoint to retrieve workflow visualization data for a specific task.
        
        Uses the WorkflowVersion definition stored in the task to ensure visualization
        matches the exact workflow version that was active when the task was created.
        
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
                "workflow_version": 1,
                "ticket_id": "TX20251111322614",
                "current_step_id": "2",
                "task_status": "in progress"
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
                    'workflow_version',
                    'current_step'
                ).get(task_id=task_id_param)
            else:
                # Find task by ticket_id (string like TX20251111322614)
                # Search in both ticket_number and ticket_data__ticket_id
                ticket = None
                try:
                    # Try as ticket_number first
                    ticket = WorkflowTicket.objects.get(ticket_number=ticket_id_param)
                except WorkflowTicket.DoesNotExist:
                    # Try as ticket_id in ticket_data
                    ticket = WorkflowTicket.objects.get(ticket_data__ticket_id=ticket_id_param)
                
                # Then find the task associated with this ticket
                task = Task.objects.select_related(
                    'workflow_id',
                    'workflow_version',
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
        
        # 📋 Use WorkflowVersion definition if available, otherwise fall back to database
        nodes = []
        workflow_version = task.workflow_version
        current_step_id = task.current_step.step_id if task.current_step else None
        
        if workflow_version:
            # ✅ Use the versioned workflow definition from JSONField
            logger.info(
                f"📋 Using WorkflowVersion {workflow_version.version} for visualization of task {task.task_id}"
            )
            definition = workflow_version.definition
            workflow_nodes = definition.get('nodes', [])
            
            # Build nodes from versioned definition
            for node in workflow_nodes:
                # Determine status based on current step
                if node['id'] == current_step_id:
                    node_status = 'active'
                elif node['order'] < (task.current_step.order if task.current_step else 0):
                    node_status = 'done'
                else:
                    node_status = 'pending'
                
                node_data = {
                    'id': f'step-{node["id"]}',
                    'label': node['label'],
                    'role': node.get('role_name', 'Unassigned'),
                    'status': node_status,
                    'description': node.get('description', ''),
                    'instruction': node.get('instruction', ''),
                    'order': node.get('order', 0)
                }
                nodes.append(node_data)
        else:
            # ⚠️ Fall back to database queries if no version exists
            logger.warning(
                f"⚠️ No WorkflowVersion for task {task.task_id}. Falling back to database models."
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
            
            # Build nodes from database
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
                    'status': node_status,
                    'description': step.description or '',
                    'instruction': step.instruction or '',
                    'order': step.order
                }
                nodes.append(node)
        
        response_data = {
            'nodes': nodes,
            'metadata': {
                'task_id': task.task_id,
                'workflow_id': str(task.workflow_id.workflow_id),
                'workflow_version': workflow_version.version if workflow_version else None,
                'ticket_id': task.ticket_id.ticket_number,
                'current_step_id': str(current_step_id) if current_step_id else None,
                'task_status': task.status
            }
        }
        
        return Response(response_data, status=status.HTTP_200_OK)
    
    @action(detail=False, methods=['post'], url_path='escalate')
    def escalate_task(self, request):
        """
        POST endpoint to escalate a task item to the escalate_to role.
        
        Request Body:
        {
            "task_item_id": 10,
            "reason": "Task requires higher authority approval"
        }
        
        Returns the escalated task with new TaskItem assignment to escalated role.
        The current step's escalate_to role is used for escalation.
        """
        task_item_id = request.data.get('task_item_id')
        reason = request.data.get('reason')
        user_id = request.user.user_id
        
        # Validate required fields
        if not task_item_id:
            return Response(
                {'error': 'task_item_id field is required'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        if not reason or not reason.strip():
            return Response(
                {'error': 'reason field is required and cannot be empty'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Get the task item
        try:
            current_assignment = TaskItem.objects.get(task_item_id=task_item_id)
        except TaskItem.DoesNotExist:
            return Response(
                {'error': f'TaskItem {task_item_id} not found'},
                status=status.HTTP_404_NOT_FOUND
            )
        
        # Get the associated task
        task = current_assignment.task
        
        if not task.current_step:
            return Response(
                {'error': 'Task has no current step assigned'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Check if step has escalate_to role configured
        if not task.current_step.escalate_to:
            return Response(
                {'error': f'Step "{task.current_step.name}" has no escalation role configured'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Check if the original assignment is already escalated
        latest_history = current_assignment.taskitemhistory_set.order_by('-created_at').first()
        current_status = latest_history.status if latest_history else 'new'
        
        if current_status == 'escalated':
            return Response(
                {'error': 'This task item has already been escalated and cannot be escalated again'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        escalate_to_role = task.current_step.escalate_to
        
        # Check if any existing task item for the CURRENT role already has escalated status
        # This prevents escalating if the current role has already been escalated
        current_role = current_assignment.role_user.role_id
        escalated_in_current_role = False
        for item in TaskItem.objects.filter(task=task, role_user__role_id=current_role).prefetch_related('taskitemhistory_set'):
            item_latest_history = item.taskitemhistory_set.order_by('-created_at').first()
            if item_latest_history and item_latest_history.status == 'escalated':
                escalated_in_current_role = True
                break
        
        if escalated_in_current_role:
            return Response(
                {'error': f'This role "{current_role.name}" has already been escalated for this task. Cannot escalate further.'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Check if any existing task item for the escalate_to role already has escalated status
        escalated_in_target_role = False
        for item in TaskItem.objects.filter(task=task, role_user__role_id=escalate_to_role).prefetch_related('taskitemhistory_set'):
            item_latest_history = item.taskitemhistory_set.order_by('-created_at').first()
            if item_latest_history and item_latest_history.status == 'escalated':
                escalated_in_target_role = True
                break
        
        if escalated_in_target_role:
            return Response(
                {'error': f'The escalation role "{escalate_to_role.name}" has already been escalated for this task. Cannot escalate further.'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Create history record for escalated status
        from task.models import TaskItemHistory
        TaskItemHistory.objects.create(
            task_item=current_assignment,
            status='escalated'
        )
        
        # Update other fields
        current_assignment.notes = f"Escalated by user {user_id}: {reason}"
        current_assignment.acted_on = timezone.now()  # Record when the escalation action was taken
        current_assignment.assigned_on_step = task.current_step  # Record the step where escalation occurred
        current_assignment.save()
        
        # Log audit event
        try:
            log_action(request.user, 'escalate_task', target=task, changes={'reason': reason}, request=request)
        except Exception as e:
            logger.error(f"Failed to log audit for escalate_task: {e}")
        
        # Create new assignment to escalated role using assignment utility
        from task.utils.assignment import assign_users_for_escalation
        
        try:
            escalated_task_items = assign_users_for_escalation(
                task=task,
                escalate_to_role=task.current_step.escalate_to,
                reason=reason
            )
            
            if not escalated_task_items:
                return Response(
                    {'error': f'No active users found for escalated role "{task.current_step.escalate_to.name}"'},
                    status=status.HTTP_400_BAD_REQUEST
                )
        except Exception as e:
            logger.error(f"Failed to escalate task: {e}")
            return Response(
                {'error': f'Failed to escalate task: {str(e)}'},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )
        
        # Return updated task with new assignments
        serializer = TaskSerializer(task)
        return Response(serializer.data, status=status.HTTP_200_OK)
    
    @action(detail=False, methods=['post'], url_path='transfer')
    def transfer_task(self, request):
        """
        POST endpoint to transfer a task to another user.
        Only admins can transfer unacted, non-escalated task items.
        
        Request Body:
        {
            "user_id": 5,
            "task_item_id": 10,
            "notes": "Reason for transfer"
        }
        
        Returns the transferred task item with new TaskItem record created.
        Original task item status set to 'reassigned'.
        """
        target_user_id = request.data.get('user_id')
        task_item_id = request.data.get('task_item_id')
        transfer_notes = request.data.get('notes', '')
        
        # Validate required fields
        if not target_user_id:
            return Response(
                {'error': 'user_id field is required'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        if not task_item_id:
            return Response(
                {'error': 'task_item_id field is required'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Get the task item to transfer
        try:
            task_item = TaskItem.objects.get(task_item_id=task_item_id)
        except TaskItem.DoesNotExist:
            return Response(
                {'error': f'TaskItem {task_item_id} not found'},
                status=status.HTTP_404_NOT_FOUND
            )
        
        # Validate task item status - can only transfer unacted, non-escalated items
        latest_history = task_item.taskitemhistory_set.order_by('-created_at').first()
        current_status = latest_history.status if latest_history else 'new'
        
        if current_status in ['resolved', 'escalated', 'reassigned', 'breached']:
            return Response(
                {'error': f'Cannot transfer task item with status \"{current_status}\"'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Get target RoleUsers - user can be in any role
        try:
            target_role_user = RoleUsers.objects.get(
                user_id=target_user_id,
                is_active=True
            )
        except RoleUsers.DoesNotExist:
            return Response(
                {'error': f'User {target_user_id} is not active or does not exist'},
                status=status.HTTP_404_NOT_FOUND
            )
        except RoleUsers.MultipleObjectsReturned:
            # If user has multiple roles, use the first one
            target_role_user = RoleUsers.objects.filter(
                user_id=target_user_id,
                is_active=True
            ).first()
        
        # Mark original assignment as transferred with notes
        task_item.transferred_to = target_role_user
        task_item.transferred_by = request.user.user_id
        task_item.notes = transfer_notes
        task_item.acted_on = timezone.now()
        task_item.save()
        
        # Create history record for reassignment
        TaskItemHistory.objects.create(
            task_item=task_item,
            status='reassigned'
        )
        
        # Create new TaskItem for target user (no notes)
        new_task_item = TaskItem.objects.create(
            task=task_item.task,
            role_user=target_role_user,
            origin='Transferred',
            notes='',
            target_resolution=task_item.target_resolution
        )
        
        # Create history record for new assignment
        TaskItemHistory.objects.create(
            task_item=new_task_item,
            status='new'
        )
        
        # Log audit event
        try:
            log_action(
                request.user, 
                'transfer_task', 
                target=task_item.task, 
                changes={
                    'transferred_from_user': task_item.role_user.user_id,
                    'transferred_to_user': target_user_id,
                    'task_item_id': task_item_id
                }, 
                request=request
            )
        except Exception as e:
            logger.error(f"Failed to log audit for transfer_task: {e}")
        
        # Return the new task item
        serializer = TaskItemSerializer(new_task_item)
        return Response(
            {
                'original_task_item': TaskItemSerializer(task_item).data,
                'new_task_item': serializer.data,
                'message': f'Task transferred from user {task_item.role_user.user_id} to user {target_user_id}'
            },
            status=status.HTTP_200_OK
        )

