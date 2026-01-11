from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated, AllowAny
from rest_framework.generics import ListAPIView
from rest_framework.filters import SearchFilter, OrderingFilter
from rest_framework.pagination import PageNumberPagination
from django_filters.rest_framework import DjangoFilterBackend
from django.db.models import Q
from django.utils import timezone
import logging
from copy import deepcopy

from audit.utils import log_action, compare_models
from .models import Task, TaskItem, TaskItemHistory
from .serializers import TaskSerializer, UserTaskListSerializer, TaskCreateSerializer, TaskItemSerializer, UnassignedTicketSerializer
from authentication import JWTCookieAuthentication, SystemRolePermission
from step.models import Steps, StepTransition
from tickets.models import WorkflowTicket
from role.models import RoleUsers

logger = logging.getLogger(__name__)


class TaskPagination(PageNumberPagination):
    page_size = 10
    page_size_query_param = 'page_size'
    max_page_size = 100


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
    
    Query Parameters:
        - tab: 'active', 'inactive' - filters by task status
        - search: search term for ticket subject/description/number or assignee name
        - page: page number
        - page_size: items per page (default 10, max 100)
    
    Note: For 'unassigned' tab, use the /tasks/unassigned-tickets/ endpoint instead.
    """
    serializer_class = UserTaskListSerializer
    authentication_classes = [JWTCookieAuthentication]
    permission_classes = [IsAuthenticated]
    filter_backends = [OrderingFilter]  # Removed SearchFilter - using custom search
    ordering_fields = ['assigned_on']
    ordering = ['-assigned_on']
    pagination_class = TaskPagination
    
    # Define which statuses are considered "inactive" (resolved/closed/completed)
    INACTIVE_STATUSES = ['closed', 'resolved', 'completed', 'cancelled', 'rejected']
    # Define which statuses are considered "active" (open/in progress/pending)
    ACTIVE_STATUSES = ['open', 'in progress', 'in_progress', 'pending', 'new', 'on_hold']
    
    def get_queryset(self):
        """Return all TaskItems with tab-based filtering and search."""
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
        
        # Apply tab filter (active, inactive)
        tab = self.request.query_params.get('tab', '').lower()
        if tab == 'active':
            # Active tickets: task status OR ticket status is NOT in inactive statuses
            # Also include tasks where status is in active statuses
            queryset = queryset.exclude(
                Q(task__status__in=self.INACTIVE_STATUSES) |
                Q(task__ticket_id__status__in=self.INACTIVE_STATUSES)
            )
        elif tab == 'inactive':
            # Inactive tickets: task status OR ticket status is resolved, closed, completed, etc.
            queryset = queryset.filter(
                Q(task__status__in=self.INACTIVE_STATUSES) |
                Q(task__ticket_id__status__in=self.INACTIVE_STATUSES)
            )
        # Note: 'unassigned' tab is handled by UnassignedTicketsListView
        
        # Apply custom search filter (searches in JSONField ticket_data)
        search = self.request.query_params.get('search', '').strip()
        if search:
            queryset = queryset.filter(
                Q(task__ticket_id__ticket_number__icontains=search) |
                Q(task__ticket_id__ticket_data__subject__icontains=search) |
                Q(task__ticket_id__ticket_data__description__icontains=search) |
                Q(role_user__user_full_name__icontains=search)
            )
        
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


class UnassignedTicketsListView(ListAPIView):
    """
    View to list WorkflowTickets that have NOT been assigned to any workflow.
    These are tickets where is_task_allocated=False (no Task created for them).
    
    Query Parameters:
        - search: search term for ticket number, subject, or description
        - page: page number
        - page_size: items per page (default 10, max 100)
    """
    serializer_class = UnassignedTicketSerializer
    authentication_classes = [JWTCookieAuthentication]
    permission_classes = [IsAuthenticated]
    filter_backends = [OrderingFilter]
    ordering_fields = ['created_at', 'fetched_at']
    ordering = ['-created_at']
    pagination_class = TaskPagination
    
    def get_queryset(self):
        """Return WorkflowTickets that are not assigned to any workflow."""
        queryset = WorkflowTicket.objects.filter(
            is_task_allocated=False
        ).order_by('-created_at')
        
        # Apply custom search filter
        search = self.request.query_params.get('search', '').strip()
        if search:
            queryset = queryset.filter(
                Q(ticket_number__icontains=search) |
                Q(ticket_data__subject__icontains=search) |
                Q(ticket_data__description__icontains=search) |
                Q(ticket_data__ticket_id__icontains=search)
            )
        
        return queryset


class AllAssignedTicketsListView(ListAPIView):
    """
    View to list ALL Tasks that have a ticket owner assigned (Admin view).
    Admins can see all tickets and their current owners for management purposes.
    
    Permission: Requires HDTS Admin or System Admin role.
    
    Query Parameters:
        - tab: 'active', 'inactive' - filters by task status
        - search: search term for ticket subject/description/number
        - owner_id: filter by specific owner's user_id
        - page: page number
        - page_size: items per page (default 10, max 100)
    """
    serializer_class = TaskSerializer
    authentication_classes = [JWTCookieAuthentication]
    permission_classes = [IsAuthenticated, SystemRolePermission]
    filter_backends = [OrderingFilter]
    ordering_fields = ['created_at', 'updated_at']
    ordering = ['-created_at']
    pagination_class = TaskPagination
    
    # SystemRolePermission configuration - require HDTS Admin
    required_system_roles = {
        'hdts': ['Admin', 'System Admin']
    }
    
    def get_queryset(self):
        """Return ALL Tasks that have a ticket owner assigned."""
        # Get all tasks with a ticket owner
        queryset = Task.objects.filter(
            ticket_owner__isnull=False
        ).select_related(
            'ticket_id', 
            'workflow_id', 
            'workflow_version',
            'current_step',
            'current_step__role_id',
            'ticket_owner',
            'ticket_owner__role_id'
        )
        
        # Apply tab filter (active, inactive)
        tab = self.request.query_params.get('tab', '').lower()
        if tab == 'active':
            queryset = queryset.filter(
                Q(status__in=['in progress', 'open', 'pending', 'in_progress']) |
                Q(ticket_id__status__in=['in progress', 'open', 'pending', 'in_progress'])
            )
        elif tab == 'inactive':
            queryset = queryset.filter(
                Q(status__in=['closed', 'resolved', 'completed']) |
                Q(ticket_id__status__in=['closed', 'resolved', 'completed'])
            )
        
        # Apply owner filter
        owner_id = self.request.query_params.get('owner_id', '').strip()
        if owner_id:
            queryset = queryset.filter(ticket_owner__user_id=int(owner_id))
        
        # Apply custom search filter
        search = self.request.query_params.get('search', '').strip()
        if search:
            queryset = queryset.filter(
                Q(ticket_id__ticket_number__icontains=search) |
                Q(ticket_id__ticket_data__subject__icontains=search) |
                Q(ticket_id__ticket_data__description__icontains=search) |
                Q(ticket_owner__user_full_name__icontains=search)
            )
        
        return queryset


class OwnedTicketsListView(ListAPIView):
    """
    View to list Tasks owned by the authenticated user (Ticket Coordinator).
    Returns tasks where the current user is assigned as ticket_owner.
    
    Permission: Requires HDTS Ticket Coordinator role.
    
    Query Parameters:
        - tab: 'active', 'inactive' - filters by task status
        - search: search term for ticket subject/description/number
        - page: page number
        - page_size: items per page (default 10, max 100)
    """
    serializer_class = TaskSerializer
    authentication_classes = [JWTCookieAuthentication]
    permission_classes = [IsAuthenticated, SystemRolePermission]
    filter_backends = [OrderingFilter]
    ordering_fields = ['created_at', 'updated_at']
    ordering = ['-created_at']
    pagination_class = TaskPagination
    
    # SystemRolePermission configuration - require HDTS Ticket Coordinator
    required_system_roles = {
        'hdts': ['Ticket Coordinator']
    }
    
    def get_queryset(self):
        """Return Tasks owned by the current user."""
        user_id = self.request.user.user_id
        
        # Get tasks where current user is the ticket owner
        queryset = Task.objects.filter(
            ticket_owner__user_id=user_id
        ).select_related(
            'ticket_id', 
            'workflow_id', 
            'workflow_version',
            'current_step',
            'current_step__role_id',
            'ticket_owner',
            'ticket_owner__role_id'
        )
        
        # Apply tab filter (active, inactive)
        tab = self.request.query_params.get('tab', '').lower()
        if tab == 'active':
            queryset = queryset.filter(
                Q(status__in=['in progress', 'open', 'pending', 'in_progress']) |
                Q(ticket_id__status__in=['in progress', 'open', 'pending', 'in_progress'])
            )
        elif tab == 'inactive':
            queryset = queryset.filter(
                Q(status__in=['closed', 'resolved', 'completed']) |
                Q(ticket_id__status__in=['closed', 'resolved', 'completed'])
            )
        
        # Apply custom search filter
        search = self.request.query_params.get('search', '').strip()
        if search:
            queryset = queryset.filter(
                Q(ticket_id__ticket_number__icontains=search) |
                Q(ticket_id__ticket_data__subject__icontains=search) |
                Q(ticket_id__ticket_data__description__icontains=search)
            )
        
        return queryset


class OwnedTicketDetailView(ListAPIView):
    """
    View to get a specific owned ticket by ticket number.
    Only returns the ticket if the current user is the ticket owner.
    
    GET /tasks/owned-tickets/<ticket_number>/
    
    Permission: Requires HDTS Ticket Coordinator role.
    """
    authentication_classes = [JWTCookieAuthentication]
    permission_classes = [IsAuthenticated, SystemRolePermission]
    
    required_system_roles = {
        'hdts': ['Ticket Coordinator', 'Admin', 'System Admin']
    }
    
    def get(self, request, ticket_number, *args, **kwargs):
        user_id = request.user.user_id
        
        # Find the task for this ticket
        try:
            task = Task.objects.select_related(
                'ticket_id', 
                'workflow_id', 
                'workflow_version',
                'current_step',
                'current_step__role_id',
                'ticket_owner',
                'ticket_owner__role_id'
            ).get(ticket_id__ticket_number=ticket_number)
        except Task.DoesNotExist:
            return Response(
                {'error': f'Ticket {ticket_number} not found'},
                status=status.HTTP_404_NOT_FOUND
            )
        
        # Check if user is the ticket owner
        owner_user_id = task.ticket_owner.user_id if task.ticket_owner else None
        is_owner = owner_user_id == user_id
        
        # Check if user is admin (admins can view any ticket)
        user_roles = request.user.roles if hasattr(request.user, 'roles') else []
        is_admin = any(
            (isinstance(r, dict) and r.get('system') == 'hdts' and r.get('role') in ['Admin', 'System Admin'])
            for r in user_roles
        )
        
        if not is_owner and not is_admin:
            return Response(
                {'error': 'You do not have permission to view this ticket. You are not the owner.'},
                status=status.HTTP_403_FORBIDDEN
            )
        
        # Serialize and return
        serializer = TaskSerializer(task)
        data = serializer.data
        
        # Add ownership info
        data['is_owner'] = is_owner
        data['is_admin'] = is_admin
        data['current_user_id'] = user_id
        
        return Response(data, status=status.HTTP_200_OK)


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
        
        # Get the actionable TaskItem for this user (handles multiple TaskItems scenario)
        try:
            # Find TaskItems for this user on this task
            task_items = TaskItem.objects.filter(
                task=task, 
                role_user__user_id=user_id
            ).prefetch_related('taskitemhistory_set').order_by('-assigned_on')
            
            if not task_items.exists():
                raise TaskItem.DoesNotExist("No TaskItems found")
            
            # Find the actionable one (with 'new' or 'in progress' status)
            task_item = None
            for ti in task_items:
                latest_history = ti.taskitemhistory_set.order_by('-created_at').first()
                current_status = latest_history.status if latest_history else 'new'
                if current_status in ['new', 'in progress']:
                    task_item = ti
                    break
            
            if not task_item:
                # No actionable TaskItem, use the most recent one for the response
                task_item = task_items.first()
            
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
        GET endpoint to retrieve comprehensive action logs for a task.
        
        Combines task items and their history into a single logs array.
        
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
                    "task_item_id": 1,
                    "user_id": 123,
                    "user_full_name": "John Doe",
                    "role": "Reviewer",
                    "status": "resolved",
                    "origin": "System",
                    "notes": "Approved",
                    "assigned_on": "2025-11-11T10:30:00Z",
                    "acted_on": "2025-11-11T11:15:00Z",
                    "assigned_on_step_id": 1,
                    "assigned_on_step_name": "Review Step",
                    "task_history": [
                        {
                            "task_item_history_id": 1,
                            "status": "new",
                            "created_at": "2025-11-11T10:30:00Z"
                        },
                        {
                            "task_item_history_id": 2,
                            "status": "in progress",
                            "created_at": "2025-11-11T10:45:00Z"
                        },
                        {
                            "task_item_history_id": 3,
                            "status": "resolved",
                            "created_at": "2025-11-11T11:15:00Z"
                        }
                    ]
                },
                ...
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
        
        # Get ALL task items (not just resolved ones)
        all_task_items = TaskItem.objects.filter(
            task=task
        ).select_related(
            'assigned_on_step', 
            'assigned_on_step__role_id',
            'role_user',
            'role_user__role_id'
        ).prefetch_related('taskitemhistory_set').order_by('assigned_on')
        
        # Serialize all task items with their history into a single logs array
        task_items_serializer = TaskItemSerializer(all_task_items, many=True)
        
        response_data = {
            'task_id': task.task_id,
            'ticket_id': task.ticket_id.ticket_id,
            'workflow_id': str(task.workflow_id.workflow_id),
            'logs': task_items_serializer.data
        }
        
        return Response(response_data, status=status.HTTP_200_OK)
    
    @action(detail=False, methods=['get'], url_path='detail/by-ticket/(?P<ticket_number>[A-Za-z0-9]+)')
    def task_details_by_ticket(self, request, ticket_number=None):
        """
        GET endpoint to retrieve TaskItem details by ticket_number.
        
        URL Path: /tasks/detail/by-ticket/{ticket_number}/
        
        Query Parameters:
        - task_item_id: (optional) Specific TaskItem ID to fetch. This is critical when
                        a user has multiple TaskItems for the same ticket (e.g., assigned
                        at step 1, rejected, then assigned again at step 3).
        
        This endpoint finds the current user's TaskItem for the given ticket.
        Each user will get their own TaskItem for the same ticket.
        
        Example:
        - User A calls /tasks/detail/by-ticket/TX20251227638396/ → returns most recent TaskItem
        - User A calls /tasks/detail/by-ticket/TX20251227638396/?task_item_id=70 → returns TaskItem 70 specifically
        """
        if not ticket_number:
            return Response(
                {'error': 'ticket_number is required'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        user_id = request.user.user_id
        
        # Get optional task_item_id from query params for specific TaskItem lookup
        task_item_id_param = request.query_params.get('task_item_id')
        
        # Find the ticket by ticket_number
        try:
            from tickets.models import WorkflowTicket
            ticket = WorkflowTicket.objects.get(ticket_number=ticket_number)
        except WorkflowTicket.DoesNotExist:
            # Try searching in ticket_data
            try:
                ticket = WorkflowTicket.objects.get(ticket_data__ticket_id=ticket_number)
            except WorkflowTicket.DoesNotExist:
                return Response(
                    {'error': f'Ticket {ticket_number} not found'},
                    status=status.HTTP_404_NOT_FOUND
                )
        
        # Build base queryset for user's TaskItems on this ticket
        base_queryset = TaskItem.objects.filter(
            task__ticket_id=ticket,
            role_user__user_id=user_id
        ).select_related(
            'task__ticket_id',
            'task__workflow_id',
            'role_user',
            'role_user__role_id',
            'assigned_on_step',
            'assigned_on_step__role_id',
            'assigned_on_step__workflow_id',
            'transferred_to',
        ).prefetch_related('taskitemhistory_set')
        
        # If specific task_item_id is provided, fetch that specific TaskItem
        if task_item_id_param:
            try:
                task_item = base_queryset.get(task_item_id=task_item_id_param)
                logger.info(f"📋 Fetching specific TaskItem {task_item_id_param} for ticket {ticket_number}")
            except TaskItem.DoesNotExist:
                return Response(
                    {'error': f'TaskItem {task_item_id_param} not found or not assigned to you'},
                    status=status.HTTP_404_NOT_FOUND
                )
        else:
            # No specific task_item_id - find the most relevant TaskItem
            # Priority: non-terminal (actionable) TaskItems first, then most recent
            terminal_statuses = ['resolved', 'escalated', 'reassigned', 'breached']
            
            # First try to find an actionable (non-terminal) TaskItem
            actionable_items = []
            for item in base_queryset.order_by('-assigned_on'):
                latest_status = item.taskitemhistory_set.order_by('-created_at').first()
                status_value = latest_status.status if latest_status else 'new'
                if status_value not in terminal_statuses:
                    actionable_items.append(item)
            
            if actionable_items:
                # Return the most recently assigned actionable TaskItem
                task_item = actionable_items[0]
                logger.info(f"📋 Found actionable TaskItem {task_item.task_item_id} for ticket {ticket_number}")
            else:
                # No actionable items, fall back to most recent
                task_item = base_queryset.order_by('-assigned_on').first()
                if task_item:
                    logger.info(f"📋 No actionable items, using most recent TaskItem {task_item.task_item_id} for ticket {ticket_number}")
        
        if not task_item:
            # Check if user is admin and allow viewing any task item for the ticket
            is_admin = False
            if hasattr(request.user, 'has_tts_role'):
                is_admin = request.user.has_tts_role('Admin') or request.user.has_tts_role('Super Admin')
            
            if is_admin:
                 task_item = TaskItem.objects.filter(
                    task__ticket_id=ticket
                 ).select_related(
                    'task__ticket_id',
                    'task__workflow_id',
                    'role_user',
                    'role_user__role_id',
                    'assigned_on_step',
                    'assigned_on_step__role_id',
                    'assigned_on_step__workflow_id',
                    'transferred_to',
                 ).prefetch_related('taskitemhistory_set').order_by('-assigned_on').first()

            if not task_item:
                return Response(
                    {'error': f'You have no assignment for ticket {ticket_number}'},
                    status=status.HTTP_404_NOT_FOUND
                )
        
        # Delegate to the shared response building logic
        return self._build_task_item_response(request, task_item)
    
    @action(detail=False, methods=['get'], url_path='admin/view/(?P<ticket_number>[A-Za-z0-9]+)')
    def admin_view_ticket(self, request, ticket_number=None):
        """
        GET endpoint for admins to view any ticket's details (read-only).
        
        URL Path: /tasks/admin/view/{ticket_number}/
        
        This endpoint is for ADMIN ARCHIVE VIEW ONLY - allows admins to view ticket details
        without ownership restrictions. Does NOT grant action permissions.
        
        Permission: TTS Admin or Super Admin role required.
        
        Returns:
        - Ticket info
        - Workflow info
        - Current owner (most recent TaskItem holder)
        - Admin's ownership status (is_owner: true/false)
        - Available admin actions (transfer_to_self if not owner, navigate if owner)
        """
        if not ticket_number:
            return Response(
                {'error': 'ticket_number is required'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Check admin permission using multiple methods for robustness
        is_admin = False
        
        # Method 1: Use has_tts_role if available
        if hasattr(request.user, 'has_tts_role'):
            is_admin = request.user.has_tts_role('Admin') or request.user.has_tts_role('Super Admin')
        
        # Method 2: Direct check on tts_roles list (case-insensitive)
        if not is_admin and hasattr(request.user, 'tts_roles'):
            for role in request.user.tts_roles:
                role_name = role.get('role', '') if isinstance(role, dict) else str(role)
                if role_name.lower() in ['admin', 'super admin', 'superadmin']:
                    is_admin = True
                    break
        
        # Method 3: Check the full roles list for TTS admin roles
        if not is_admin and hasattr(request.user, 'roles'):
            for role in request.user.roles:
                if isinstance(role, dict):
                    system = role.get('system', '').lower()
                    role_name = role.get('role', '').lower()
                    if system == 'tts' and role_name in ['admin', 'super admin', 'superadmin']:
                        is_admin = True
                        break
                elif isinstance(role, str) and ':' in role:
                    parts = role.split(':', 1)
                    if len(parts) == 2 and parts[0].lower() == 'tts' and parts[1].lower() in ['admin', 'super admin', 'superadmin']:
                        is_admin = True
                        break
        
        if not is_admin:
            user_roles = getattr(request.user, 'roles', [])
            # If roles are empty, suggest re-login
            if not user_roles:
                return Response(
                    {'error': 'Admin access required. Your session may not have updated roles. Please log out and log back in.'},
                    status=status.HTTP_403_FORBIDDEN
                )
            return Response(
                {'error': 'Admin access required to view ticket archive. You need TTS Admin or Super Admin role.'},
                status=status.HTTP_403_FORBIDDEN
            )
        
        user_id = request.user.user_id
        
        # Find the ticket by ticket_number
        try:
            from tickets.models import WorkflowTicket
            ticket = WorkflowTicket.objects.get(ticket_number=ticket_number)
        except WorkflowTicket.DoesNotExist:
            # Try searching in ticket_data
            try:
                ticket = WorkflowTicket.objects.get(ticket_data__ticket_id=ticket_number)
            except WorkflowTicket.DoesNotExist:
                return Response(
                    {'error': f'Ticket {ticket_number} not found'},
                    status=status.HTTP_404_NOT_FOUND
                )
        
        # Get the task for this ticket
        try:
            task = Task.objects.select_related('workflow_id', 'current_step').get(ticket_id=ticket)
        except Task.DoesNotExist:
            # Ticket exists but has no workflow assigned
            ticket_data = ticket.ticket_data.copy() if ticket.ticket_data else {}
            ticket_response = {
                'id': ticket.id,
                'ticket_id': ticket.ticket_id,
                'ticket_number': ticket.ticket_number,
                'created_at': ticket.created_at.isoformat() if ticket.created_at else None,
                'updated_at': ticket.updated_at.isoformat() if ticket.updated_at else None,
            }
            ticket_response.update(ticket_data)
            
            return Response({
                'ticket': ticket_response,
                'workflow': None,
                'current_step': None,
                'current_owner': None,
                'is_owner': False,
                'has_workflow': False,
                'admin_actions': ['assign_workflow'],
                'message': 'Ticket has no workflow assigned'
            }, status=status.HTTP_200_OK)
        
        # Get the most recent TaskItem (current owner)
        most_recent_task_item = TaskItem.objects.filter(
            task=task
        ).select_related(
            'role_user', 
            'role_user__role_id',
            'assigned_on_step'
        ).prefetch_related('taskitemhistory_set').order_by('-assigned_on').first()
        
        current_owner = None
        is_owner = False
        user_task_item = None
        
        if most_recent_task_item:
            owner_status = most_recent_task_item.taskitemhistory_set.order_by('-created_at').first()
            current_owner = {
                'task_item_id': most_recent_task_item.task_item_id,
                'user_id': most_recent_task_item.role_user.user_id,
                'user_full_name': most_recent_task_item.role_user.user_full_name,
                'role': most_recent_task_item.role_user.role_id.name if most_recent_task_item.role_user.role_id else None,
                'status': owner_status.status if owner_status else 'new',
                'origin': most_recent_task_item.origin,
                'assigned_on': most_recent_task_item.assigned_on.isoformat() if most_recent_task_item.assigned_on else None,
            }
            
            # Check if current user is the owner
            is_owner = most_recent_task_item.role_user.user_id == user_id
            
            # Get the user's task item if they own it
            if is_owner:
                user_task_item = most_recent_task_item
        
        # Build ticket response
        ticket_data = ticket.ticket_data.copy() if ticket.ticket_data else {}
        ticket_response = {
            'id': ticket.id,
            'ticket_id': ticket.ticket_id,
            'ticket_number': ticket.ticket_number,
            'created_at': ticket.created_at.isoformat() if ticket.created_at else None,
            'updated_at': ticket.updated_at.isoformat() if ticket.updated_at else None,
        }
        ticket_response.update(ticket_data)
        
        # Build workflow response
        workflow_response = None
        if task.workflow_id:
            workflow_response = {
                'workflow_id': str(task.workflow_id.workflow_id),
                'name': task.workflow_id.name,
                'description': task.workflow_id.description,
            }
        
        # Build step response
        step_response = None
        if task.current_step:
            step_response = {
                'step_id': str(task.current_step.step_id),
                'name': task.current_step.name,
                'description': task.current_step.description,
                'instruction': task.current_step.instruction,
                'role_id': str(task.current_step.role_id.role_id) if task.current_step.role_id else None,
                'role_name': task.current_step.role_id.name if task.current_step.role_id else None,
            }
        
        # Determine admin actions
        admin_actions = []
        if is_owner:
            admin_actions.append('navigate')  # Can navigate to their ticket detail
        else:
            admin_actions.append('transfer_to_self')  # Can transfer to themselves
        
        # Build response
        response_data = {
            'ticket': ticket_response,
            'workflow': workflow_response,
            'current_step': step_response,
            'current_owner': current_owner,
            'is_owner': is_owner,
            'has_workflow': True,
            'admin_actions': admin_actions,
            'task_id': str(task.task_id),
            'task_item_id': most_recent_task_item.task_item_id if most_recent_task_item else None,
            'user_task_item_id': user_task_item.task_item_id if user_task_item else None,
        }
        
        return Response(response_data, status=status.HTTP_200_OK)
    
    @action(detail=False, methods=['post'], url_path='admin/transfer-to-self')
    def admin_transfer_to_self(self, request):
        """
        POST endpoint for admins to transfer a ticket to themselves.
        
        URL Path: /tasks/admin/transfer-to-self/
        
        Request Body:
        {
            "task_item_id": 10,
            "notes": "Reason for taking over this ticket"
        }
        
        Permission: TTS Admin or Super Admin role required.
        
        This creates a new TaskItem assigned to the admin, marking the original as 'reassigned'.
        """
        # Check admin permission using multiple methods for robustness
        is_admin = False
        
        # Method 1: Use has_tts_role if available
        if hasattr(request.user, 'has_tts_role'):
            is_admin = request.user.has_tts_role('Admin') or request.user.has_tts_role('Super Admin')
        
        # Method 2: Direct check on tts_roles list (case-insensitive)
        if not is_admin and hasattr(request.user, 'tts_roles'):
            for role in request.user.tts_roles:
                role_name = role.get('role', '') if isinstance(role, dict) else str(role)
                if role_name.lower() in ['admin', 'super admin', 'superadmin']:
                    is_admin = True
                    break
        
        # Method 3: Check the full roles list for TTS admin roles
        if not is_admin and hasattr(request.user, 'roles'):
            for role in request.user.roles:
                if isinstance(role, dict):
                    system = role.get('system', '').lower()
                    role_name = role.get('role', '').lower()
                    if system == 'tts' and role_name in ['admin', 'super admin', 'superadmin']:
                        is_admin = True
                        break
                elif isinstance(role, str) and ':' in role:
                    parts = role.split(':', 1)
                    if len(parts) == 2 and parts[0].lower() == 'tts' and parts[1].lower() in ['admin', 'super admin', 'superadmin']:
                        is_admin = True
                        break
        
        if not is_admin:
            return Response(
                {'error': 'Admin access required'},
                status=status.HTTP_403_FORBIDDEN
            )
        
        task_item_id = request.data.get('task_item_id')
        transfer_notes = request.data.get('notes', 'Transferred to self by admin')
        
        if not task_item_id:
            return Response(
                {'error': 'task_item_id is required'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        user_id = request.user.user_id
        
        # Get the task item
        try:
            task_item = TaskItem.objects.select_related(
                'task__ticket_id',
                'role_user',
                'assigned_on_step'
            ).get(task_item_id=task_item_id)
        except TaskItem.DoesNotExist:
            return Response(
                {'error': f'TaskItem {task_item_id} not found'},
                status=status.HTTP_404_NOT_FOUND
            )
        
        # Check if already owner
        if task_item.role_user.user_id == user_id:
            return Response(
                {'error': 'You already own this ticket'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Validate task item status - can only transfer unacted, non-escalated items
        latest_history = task_item.taskitemhistory_set.order_by('-created_at').first()
        current_status = latest_history.status if latest_history else 'new'
        
        if current_status in ['resolved', 'escalated', 'reassigned', 'breached']:
            return Response(
                {'error': f'Cannot transfer task item with status "{current_status}"'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Get admin's RoleUsers entry
        try:
            admin_role_user = RoleUsers.objects.get(
                user_id=user_id,
                is_active=True
            )
        except RoleUsers.DoesNotExist:
            return Response(
                {'error': 'Admin user is not registered in RoleUsers'},
                status=status.HTTP_400_BAD_REQUEST
            )
        except RoleUsers.MultipleObjectsReturned:
            admin_role_user = RoleUsers.objects.filter(
                user_id=user_id,
                is_active=True
            ).first()
        
        # Mark original assignment as transferred
        task_item.transferred_to = admin_role_user
        task_item.transferred_by = user_id
        task_item.notes = transfer_notes
        task_item.acted_on = timezone.now()
        task_item.save()
        
        # Create history record for reassignment
        TaskItemHistory.objects.create(
            task_item=task_item,
            status='reassigned'
        )
        
        # Create new TaskItem for admin
        new_task_item = TaskItem.objects.create(
            task=task_item.task,
            role_user=admin_role_user,
            origin='Admin Transfer',
            notes=transfer_notes,
            target_resolution=task_item.target_resolution,
            assigned_on_step=task_item.assigned_on_step or task_item.task.current_step
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
                'admin_transfer_to_self',
                target=task_item.task,
                changes={
                    'transferred_from_user': task_item.role_user.user_id,
                    'transferred_to_user': user_id,
                    'task_item_id': task_item_id,
                    'reason': transfer_notes
                },
                request=request
            )
        except Exception as e:
            logger.error(f"Failed to log audit for admin_transfer_to_self: {e}")
        
        # Send transfer notification
        try:
            from celery import current_app
            from django.conf import settings
            
            ticket_number = str(task_item.task.ticket_id.ticket_number) if hasattr(task_item.task, 'ticket_id') and hasattr(task_item.task.ticket_id, 'ticket_number') else f"Task {task_item.task.task_id}"
            inapp_queue = getattr(settings, 'INAPP_NOTIFICATION_QUEUE', 'inapp-notification-queue')
            
            current_app.send_task(
                'notifications.send_task_transfer_notification',
                args=(
                    task_item.role_user.user_id,
                    user_id,
                    ticket_number,
                    ticket_number,
                    f"Ticket {ticket_number}",
                    user_id,
                    getattr(request.user, 'full_name', None) or getattr(request.user, 'username', f'Admin User {user_id}'),
                    transfer_notes
                ),
                queue=inapp_queue
            )
        except Exception as e:
            logger.error(f"Failed to send transfer notification: {e}")
        
        # Return success with new task item details
        return Response({
            'message': 'Ticket transferred to you successfully',
            'new_task_item_id': new_task_item.task_item_id,
            'ticket_number': task_item.task.ticket_id.ticket_number,
        }, status=status.HTTP_200_OK)
    
    @action(detail=False, methods=['get'], url_path='detail/(?P<task_item_id>[0-9]+)')
    def task_details(self, request, task_item_id=None):
        """
        GET endpoint to retrieve TaskItem details - fully TaskItem-centric.
        
        URL Path: /tasks/detail/{task_item_id}/
        
        This endpoint is PURELY based on the TaskItem, NOT the parent Task.
        - Uses TaskItem's assigned_on_step for step info (where this user was assigned)
        - Uses TaskItem's own history for status flags
        - Each TaskItem is independent - transfer/escalation creates new TaskItems
        
        Action flags (based on THIS TaskItem only):
        - can_act: False if this TaskItem has terminal status (resolved, escalated, reassigned)
        - is_escalated: True if THIS TaskItem's status is 'escalated'
        - is_transferred: True if THIS TaskItem was transferred out
        - has_acted: True if THIS TaskItem's status is 'resolved'
        """
        if not task_item_id:
            return Response(
                {'error': 'task_item_id is required'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        user_id = request.user.user_id
        
        # Fetch TaskItem with its own related data (not Task-centric)
        try:
            task_item = TaskItem.objects.select_related(
                'task__ticket_id',
                'task__workflow_id',
                'role_user',
                'role_user__role_id',
                'assigned_on_step',              # The step where THIS TaskItem was assigned
                'assigned_on_step__role_id',
                'assigned_on_step__workflow_id',
                'transferred_to',
            ).prefetch_related('taskitemhistory_set').get(task_item_id=task_item_id)
        except TaskItem.DoesNotExist:
            return Response(
                {'error': f'TaskItem {task_item_id} not found'},
                status=status.HTTP_404_NOT_FOUND
            )
        
        # Strict permission check - ONLY the assigned user can view this TaskItem
        # No admin bypass - each user must view their own TaskItem
        if task_item.role_user.user_id != user_id:
            return Response(
                {'error': 'This task item is not assigned to you'},
                status=status.HTTP_403_FORBIDDEN
            )
        
        return self._build_task_item_response(request, task_item)
    
    def _build_task_item_response(self, request, task_item):
        """
        Helper method to build the response for a TaskItem.
        Shared between task_details and task_details_by_ticket endpoints.
        """
        user_id = request.user.user_id
        task_item_id = task_item.task_item_id
        
        # ========== TaskItem's OWN status from history ==========
        latest_history = task_item.taskitemhistory_set.order_by('-created_at').first()
        current_status = latest_history.status if latest_history else 'new'
        
        # Auto-mark as 'in progress' on first view
        if current_status == 'new':
            TaskItemHistory.objects.create(task_item=task_item, status='in progress')
            current_status = 'in progress'
            logger.info(f"✅ TaskItem {task_item_id} marked 'in progress' for user {user_id}")
        
        # ========== ACTION FLAGS - purely from THIS TaskItem ==========
        terminal_statuses = ['resolved', 'escalated', 'reassigned', 'breached']
        has_terminal_status = task_item.taskitemhistory_set.filter(status__in=terminal_statuses).exists()
        
        can_act = not has_terminal_status
        has_acted = current_status == 'resolved'
        is_escalated = current_status == 'escalated'
        is_transferred = task_item.transferred_to is not None or current_status == 'reassigned'
        
        logger.info(
            f"📋 TaskItem {task_item_id}: status={current_status}, "
            f"can_act={can_act}, is_escalated={is_escalated}, is_transferred={is_transferred}"
        )
        
        # ========== STEP INFO - from TaskItem's assigned_on_step ==========
        # Use the step where THIS TaskItem was assigned, fallback to task.current_step
        step = task_item.assigned_on_step or task_item.task.current_step
        
        if not step:
            return Response(
                {'error': 'TaskItem has no step information'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Get transitions from THIS step
        available_transitions = StepTransition.objects.filter(
            from_step_id=step
        ).select_related('to_step_id', 'to_step_id__role_id')
        
        available_actions = [
            {
                'transition_id': str(t.transition_id),
                'id': t.transition_id,
                'name': t.name or f'{step.name} → {t.to_step_id.name if t.to_step_id else "End"}',
                'description': t.to_step_id.description if t.to_step_id else 'Complete workflow',
            }
            for t in available_transitions
        ]
        
        if not available_actions:
            available_actions.append({
                'transition_id': None,
                'id': None,
                'name': f'Finalize {step.name}',
                'description': step.description or f'Complete {step.name}',
            })
        
        step_transition_id = str(available_transitions.first().transition_id) if available_transitions.exists() else None
        
        # ========== TICKET DATA ==========
        ticket = task_item.task.ticket_id
        ticket_data = ticket.ticket_data.copy() if ticket.ticket_data else {}
        ticket_response = {
            'id': ticket.id,
            'ticket_number': ticket.ticket_number,
            'created_at': ticket.created_at.isoformat() if ticket.created_at else None,
            'updated_at': ticket.updated_at.isoformat() if ticket.updated_at else None,
        }
        ticket_response.update(ticket_data)
        
        # ========== CURRENT OWNER (most recent TaskItem for this ticket's task) ==========
        most_recent = TaskItem.objects.filter(
            task=task_item.task
        ).select_related('role_user', 'role_user__role_id').prefetch_related('taskitemhistory_set').order_by('-assigned_on').first()
        
        current_owner = None
        if most_recent:
            owner_status = most_recent.taskitemhistory_set.order_by('-created_at').first()
            current_owner = {
                'task_item_id': most_recent.task_item_id,
                'user_id': most_recent.role_user.user_id,
                'user_full_name': most_recent.role_user.user_full_name,
                'role': most_recent.role_user.role_id.name if most_recent.role_user.role_id else None,
                'status': owner_status.status if owner_status else 'new',
                'origin': most_recent.origin,
                'assigned_on': most_recent.assigned_on.isoformat() if most_recent.assigned_on else None,
            }
        
        # ========== BUILD RESPONSE ==========
        response_data = {
            # Primary identifier - this is a TaskItem view
            'task_item_id': int(task_item_id),
            'user_id': user_id,
            
            # Action flags - ONLY based on THIS TaskItem
            'can_act': can_act,
            'has_acted': has_acted,
            'is_escalated': is_escalated,
            'is_transferred': is_transferred,
            'current_status': current_status,
            'origin': task_item.origin,
            
            # TaskItem's target resolution (may differ from Task's)
            'target_resolution': (task_item.target_resolution or task_item.task.target_resolution).isoformat() 
                if (task_item.target_resolution or task_item.task.target_resolution) else None,
            
            # Step info - from THIS TaskItem's assigned step
            'step_transition_id': step_transition_id,
            'step': {
                'id': step.step_id,
                'step_id': str(step.step_id),
                'workflow_id': str(step.workflow_id.workflow_id) if step.workflow_id else None,
                'role_id': str(step.role_id.role_id) if step.role_id else None,
                'name': step.name,
                'description': step.description,
                'instruction': step.instruction,
            },
            'available_actions': available_actions,
            
            # Related data
            'current_owner': current_owner,
            'step_instance_id': str(task_item.task.task_id),  # For backwards compatibility
            'task': {
                'task_id': str(task_item.task.task_id),
                'workflow_id': task_item.task.workflow_id.workflow_id,
                'ticket': ticket_response,
            },
        }
        
        return Response(response_data, status=status.HTTP_200_OK)
    
    @action(detail=False, methods=['get'], url_path='workflow-visualization', permission_classes=[AllowAny], authentication_classes=[])
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
                # Determine status based on current step and task completion
                if task.status == 'completed':
                    # If task is completed, all nodes should be 'done'
                    node_status = 'done'
                elif node['id'] == current_step_id:
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
                # Determine status based on current step and task completion
                if task.status == 'completed':
                    # If task is completed, all nodes should be 'done'
                    node_status = 'done'
                elif step.step_id == current_step_id:
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
                reason=reason,
                from_user_id=current_assignment.role_user.user_id,
                from_user_role=current_assignment.role_user.role_id.name,
                escalated_by_id=request.user.user_id,
                escalated_by_name=getattr(request.user, 'full_name', None) or getattr(request.user, 'username', f'User {request.user.user_id}')
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
        
        # Create new TaskItem for target user - inherit assigned_on_step from original
        new_task_item = TaskItem.objects.create(
            task=task_item.task,
            role_user=target_role_user,
            origin='Transferred',
            notes='',
            target_resolution=task_item.target_resolution,
            assigned_on_step=task_item.assigned_on_step or task_item.task.current_step  # Inherit step
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
        
        # Send transfer notifications to both users via notification_service
        try:
            from celery import current_app
            from django.conf import settings
            
            task_title = str(task_item.task.ticket_id.ticket_number) if hasattr(task_item.task, 'ticket_id') else f"Task {task_item.task.task_id}"
            ticket_number = str(task_item.task.ticket_id.ticket_number) if hasattr(task_item.task, 'ticket_id') and hasattr(task_item.task.ticket_id, 'ticket_number') else task_title
            inapp_queue = getattr(settings, 'INAPP_NOTIFICATION_QUEUE', 'inapp-notification-queue')
            
            current_app.send_task(
                'notifications.send_task_transfer_notification',
                args=(
                    task_item.role_user.user_id,
                    target_user_id,
                    ticket_number,  # Use ticket_number for URL routing
                    ticket_number,  # Both users navigate to the same ticket
                    task_title,
                    request.user.user_id,
                    getattr(request.user, 'full_name', None) or getattr(request.user, 'username', f'User {request.user.user_id}'),
                    transfer_notes
                ),
                queue=inapp_queue
            )
        except Exception as e:
            logger.error(f"Failed to send transfer notification: {e}")
        
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


class TicketOwnerEscalateView(ListAPIView):
    """
    API endpoint for Ticket Coordinators to escalate ticket ownership to a supervisor.
    
    POST /tasks/ticket-owner/escalate/
    
    This escalates the ticket ownership to a supervisor Ticket Coordinator.
    Only the current ticket owner (Ticket Coordinator) can escalate.
    
    Request Body:
    {
        "ticket_number": "TX20251231962083",
        "reason": "Complex technical issue requiring senior expertise"
    }
    
    Permission: Requires HDTS Ticket Coordinator role.
    """
    authentication_classes = [JWTCookieAuthentication]
    permission_classes = [IsAuthenticated, SystemRolePermission]
    
    # SystemRolePermission configuration - require HDTS Ticket Coordinator
    required_system_roles = {
        'hdts': ['Ticket Coordinator']
    }
    
    def post(self, request, *args, **kwargs):
        ticket_number = request.data.get('ticket_number')
        reason = request.data.get('reason', '')
        
        if not ticket_number:
            return Response(
                {'error': 'ticket_number is required'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        if not reason or not reason.strip():
            return Response(
                {'error': 'reason is required and cannot be empty'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        user_id = request.user.user_id
        
        # Find the ticket
        try:
            ticket = WorkflowTicket.objects.get(ticket_number=ticket_number)
        except WorkflowTicket.DoesNotExist:
            return Response(
                {'error': f'Ticket {ticket_number} not found'},
                status=status.HTTP_404_NOT_FOUND
            )
        
        # Find the task for this ticket
        try:
            task = Task.objects.select_related(
                'ticket_owner', 
                'ticket_owner__role_id'
            ).get(ticket_id=ticket)
        except Task.DoesNotExist:
            return Response(
                {'error': f'No task found for ticket {ticket_number}'},
                status=status.HTTP_404_NOT_FOUND
            )
        
        # Check if current user is the ticket owner
        # Note: user_id from JWT should match RoleUsers.user_id
        owner_user_id = task.ticket_owner.user_id if task.ticket_owner else None
        print(f"Escalation check: logged_in_user_id={user_id}, ticket_owner_user_id={owner_user_id}")
        
        # For coordinators on their owned tickets page, allow escalation if they are the owner
        # Or if there's no owner set yet (shouldn't happen but handle gracefully)
        if task.ticket_owner and owner_user_id != user_id:
            return Response(
                {'error': f'Only the current ticket owner can escalate. Your ID: {user_id}, Owner ID: {owner_user_id}'},
                status=status.HTTP_403_FORBIDDEN
            )
        
        if not task.ticket_owner:
            return Response(
                {'error': 'This ticket has no owner assigned yet'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        old_owner = task.ticket_owner
        
        # Find a supervisor/senior Ticket Coordinator to escalate to
        # Look for Ticket Coordinators who are NOT the current owner
        from role.models import RoleUsers, Roles
        
        try:
            coordinator_role = Roles.objects.get(name='Ticket Coordinator')
        except Roles.DoesNotExist:
            return Response(
                {'error': 'Ticket Coordinator role not found'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Get active coordinators (excluding current owner)
        available_coordinators = RoleUsers.objects.filter(
            role_id=coordinator_role,
            is_active=True
        ).exclude(user_id=user_id).order_by('user_id')
        
        if not available_coordinators.exists():
            return Response(
                {'error': 'No other Ticket Coordinators available for escalation'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Use round-robin to select next coordinator
        from tickets.models import RoundRobin
        round_robin_key = 'ticket_owner_escalation'
        
        try:
            rr = RoundRobin.objects.get(role_name=round_robin_key)
        except RoundRobin.DoesNotExist:
            rr = RoundRobin.objects.create(role_name=round_robin_key, current_index=0)
        
        coordinator_list = list(available_coordinators)
        next_index = rr.current_index % len(coordinator_list)
        new_owner = coordinator_list[next_index]
        
        # Update round robin index
        rr.current_index = (next_index + 1) % len(coordinator_list)
        rr.save()
        
        # Update ticket owner
        task.ticket_owner = new_owner
        task.save()
        
        # Log the escalation
        try:
            log_action(
                request.user,
                'ticket_owner_escalate',
                target=task,
                changes={
                    'from_user_id': old_owner.user_id,
                    'from_user_name': old_owner.user_full_name,
                    'to_user_id': new_owner.user_id,
                    'to_user_name': new_owner.user_full_name,
                    'reason': reason,
                    'ticket_number': ticket_number
                },
                request=request
            )
        except Exception as e:
            logger.error(f"Failed to log audit for ticket_owner_escalate: {e}")
        
        # Send escalation notification
        try:
            from celery import current_app
            from django.conf import settings
            
            inapp_queue = getattr(settings, 'INAPP_NOTIFICATION_QUEUE', 'inapp-notification-queue')
            
            current_app.send_task(
                'notifications.send_ticket_owner_escalation_notification',
                args=(
                    old_owner.user_id,
                    new_owner.user_id,
                    ticket_number,
                    ticket.ticket_data.get('subject', f'Ticket {ticket_number}'),
                    reason,
                    user_id,
                    getattr(request.user, 'full_name', None) or old_owner.user_full_name
                ),
                queue=inapp_queue
            )
        except Exception as e:
            logger.error(f"Failed to send escalation notification: {e}")
        
        return Response({
            'message': 'Ticket ownership escalated successfully',
            'ticket_number': ticket_number,
            'previous_owner': {
                'user_id': old_owner.user_id,
                'name': old_owner.user_full_name,
                'role': old_owner.role_id.name if old_owner.role_id else None
            },
            'new_owner': {
                'user_id': new_owner.user_id,
                'name': new_owner.user_full_name,
                'role': new_owner.role_id.name if new_owner.role_id else None
            },
            'reason': reason
        }, status=status.HTTP_200_OK)


class TicketOwnerTransferView(ListAPIView):
    """
    API endpoint for HDTS Admins to transfer ticket ownership to another Ticket Coordinator.
    
    POST /tasks/ticket-owner/transfer/
    
    Admins can transfer ticket ownership to any active Ticket Coordinator.
    
    Request Body:
    {
        "ticket_number": "TX20251231962083",
        "new_owner_user_id": 5,
        "reason": "Workload balancing"
    }
    
    Permission: Requires HDTS Admin or System Admin role.
    """
    authentication_classes = [JWTCookieAuthentication]
    permission_classes = [IsAuthenticated, SystemRolePermission]
    
    # SystemRolePermission configuration - require HDTS Admin roles
    required_system_roles = {
        'hdts': ['Admin', 'System Admin']
    }
    
    def post(self, request, *args, **kwargs):
        ticket_number = request.data.get('ticket_number')
        new_owner_user_id = request.data.get('new_owner_user_id')
        reason = request.data.get('reason', '')
        
        if not ticket_number:
            return Response(
                {'error': 'ticket_number is required'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        if not new_owner_user_id:
            return Response(
                {'error': 'new_owner_user_id is required'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        user_id = request.user.user_id
        
        # Find the ticket
        try:
            ticket = WorkflowTicket.objects.get(ticket_number=ticket_number)
        except WorkflowTicket.DoesNotExist:
            return Response(
                {'error': f'Ticket {ticket_number} not found'},
                status=status.HTTP_404_NOT_FOUND
            )
        
        # Find the task for this ticket
        try:
            task = Task.objects.select_related(
                'ticket_owner', 
                'ticket_owner__role_id'
            ).get(ticket_id=ticket)
        except Task.DoesNotExist:
            return Response(
                {'error': f'No task found for ticket {ticket_number}'},
                status=status.HTTP_404_NOT_FOUND
            )
        
        old_owner = task.ticket_owner
        
        # Find the new owner (must be an active Ticket Coordinator)
        from role.models import RoleUsers, Roles
        
        try:
            coordinator_role = Roles.objects.get(name='Ticket Coordinator')
        except Roles.DoesNotExist:
            return Response(
                {'error': 'Ticket Coordinator role not found'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        try:
            new_owner = RoleUsers.objects.get(
                user_id=new_owner_user_id,
                role_id=coordinator_role,
                is_active=True
            )
        except RoleUsers.DoesNotExist:
            return Response(
                {'error': f'User {new_owner_user_id} is not an active Ticket Coordinator'},
                status=status.HTTP_400_BAD_REQUEST
            )
        except RoleUsers.MultipleObjectsReturned:
            new_owner = RoleUsers.objects.filter(
                user_id=new_owner_user_id,
                role_id=coordinator_role,
                is_active=True
            ).first()
        
        # Check if new owner is the same as current owner
        if old_owner and old_owner.user_id == new_owner_user_id:
            return Response(
                {'error': 'New owner is the same as current owner'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Update ticket owner
        task.ticket_owner = new_owner
        task.save()
        
        # Log the transfer
        try:
            log_action(
                request.user,
                'ticket_owner_transfer',
                target=task,
                changes={
                    'from_user_id': old_owner.user_id if old_owner else None,
                    'from_user_name': old_owner.user_full_name if old_owner else None,
                    'to_user_id': new_owner.user_id,
                    'to_user_name': new_owner.user_full_name,
                    'transferred_by_user_id': user_id,
                    'reason': reason,
                    'ticket_number': ticket_number
                },
                request=request
            )
        except Exception as e:
            logger.error(f"Failed to log audit for ticket_owner_transfer: {e}")
        
        # Send transfer notification
        try:
            from celery import current_app
            from django.conf import settings
            
            inapp_queue = getattr(settings, 'INAPP_NOTIFICATION_QUEUE', 'inapp-notification-queue')
            
            current_app.send_task(
                'notifications.send_ticket_owner_transfer_notification',
                args=(
                    old_owner.user_id if old_owner else None,
                    new_owner.user_id,
                    ticket_number,
                    ticket.ticket_data.get('subject', f'Ticket {ticket_number}'),
                    reason,
                    user_id,
                    getattr(request.user, 'full_name', None) or getattr(request.user, 'username', f'Admin {user_id}')
                ),
                queue=inapp_queue
            )
        except Exception as e:
            logger.error(f"Failed to send transfer notification: {e}")
        
        return Response({
            'message': 'Ticket ownership transferred successfully',
            'ticket_number': ticket_number,
            'previous_owner': {
                'user_id': old_owner.user_id if old_owner else None,
                'name': old_owner.user_full_name if old_owner else None,
                'role': old_owner.role_id.name if old_owner and old_owner.role_id else None
            } if old_owner else None,
            'new_owner': {
                'user_id': new_owner.user_id,
                'name': new_owner.user_full_name,
                'role': new_owner.role_id.name if new_owner.role_id else None
            },
            'transferred_by': {
                'user_id': user_id,
                'name': getattr(request.user, 'full_name', None) or getattr(request.user, 'username', None)
            },
            'reason': reason
        }, status=status.HTTP_200_OK)


class AvailableCoordinatorsView(ListAPIView):
    """
    API endpoint to get list of available Ticket Coordinators for transfer/escalation.
    
    GET /tasks/ticket-owner/available-coordinators/
    
    Query Parameters:
        - exclude_user_id: (optional) Exclude specific user from the list
    
    Permission: Requires HDTS Admin, System Admin, or Ticket Coordinator role.
    """
    authentication_classes = [JWTCookieAuthentication]
    permission_classes = [IsAuthenticated, SystemRolePermission]
    
    required_system_roles = {
        'hdts': ['Admin', 'System Admin', 'Ticket Coordinator']
    }
    
    def get(self, request, *args, **kwargs):
        from role.models import RoleUsers, Roles
        
        exclude_user_id = request.query_params.get('exclude_user_id')
        
        try:
            coordinator_role = Roles.objects.get(name='Ticket Coordinator')
        except Roles.DoesNotExist:
            return Response(
                {'error': 'Ticket Coordinator role not found'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        coordinators = RoleUsers.objects.filter(
            role_id=coordinator_role,
            is_active=True
        ).select_related('role_id')
        
        if exclude_user_id:
            coordinators = coordinators.exclude(user_id=int(exclude_user_id))
        
        result = [{
            'user_id': coord.user_id,
            'name': coord.user_full_name,
            'email': coord.email if hasattr(coord, 'email') else None,
            'role': coord.role_id.name if coord.role_id else None
        } for coord in coordinators.order_by('user_full_name')]
        
        return Response({
            'coordinators': result,
            'count': len(result)
        }, status=status.HTTP_200_OK)


class FailedNotificationViewSet(viewsets.ReadOnlyModelViewSet):
    """
    ViewSet for viewing and retrying failed notifications.
    Read-only operations (list/retrieve) plus custom retry action.
    """
    from .models import FailedNotification
    from .serializers import FailedNotificationSerializer
    
    queryset = FailedNotification.objects.all()
    serializer_class = FailedNotificationSerializer
    authentication_classes = [JWTCookieAuthentication]
    permission_classes = [IsAuthenticated]
    filter_backends = [DjangoFilterBackend, SearchFilter, OrderingFilter]
    filterset_fields = ['status', 'user_id', 'role_name']
    search_fields = ['task_id', 'task_title', 'error_message']
    ordering_fields = ['created_at', 'last_retry_at', 'retry_count']
    ordering = ['-created_at']
    pagination_class = TaskPagination
    
    @action(detail=True, methods=['post'])
    def retry(self, request, pk=None):
        """
        Retry a specific failed notification.
        POST /failed-notifications/{id}/retry/
        """
        from .tasks import send_assignment_notification as notify_task
        
        notification = self.get_object()
        
        # Check if already succeeded
        if notification.status == 'success':
            return Response(
                {'error': 'Notification already succeeded'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Check max retries
        if notification.retry_count >= notification.max_retries:
            return Response(
                {'error': f'Max retries ({notification.max_retries}) already reached'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        try:
            # Update retry tracking
            notification.status = 'retrying'
            notification.retry_count += 1
            notification.last_retry_at = timezone.now()
            notification.save()
            
            # Attempt to send notification
            notify_task.delay(
                user_id=notification.user_id,
                ticket_number=notification.task_item_id,
                task_title=notification.task_title,
                role_name=notification.role_name
            )
            
            # Mark as success
            notification.status = 'success'
            notification.succeeded_at = timezone.now()
            notification.save()
            
            serializer = self.get_serializer(notification)
            return Response(
                {
                    'message': 'Notification sent successfully',
                    'notification': serializer.data
                },
                status=status.HTTP_200_OK
            )
            
        except Exception as e:
            # Update error details
            notification.error_message = str(e)
            
            # Check if max retries reached
            if notification.retry_count >= notification.max_retries:
                notification.status = 'failed'
            else:
                notification.status = 'pending'
            
            notification.save()
            
            return Response(
                {
                    'error': f'Failed to send notification: {str(e)}',
                    'notification': self.get_serializer(notification).data
                },
                status=status.HTTP_503_SERVICE_UNAVAILABLE
            )
    
    @action(detail=False, methods=['post'])
    def retry_all(self, request):
        """
        Retry all pending failed notifications.
        POST /failed-notifications/retry_all/
        """
        from .tasks import send_assignment_notification as notify_task
        
        # Get pending notifications
        notifications = self.queryset.filter(status='pending')
        
        # Apply max_retries filter
        from django.db.models import F
        notifications = notifications.filter(retry_count__lt=F('max_retries'))
        
        total_count = notifications.count()
        success_count = 0
        failed_count = 0
        
        for notification in notifications:
            try:
                notification.status = 'retrying'
                notification.retry_count += 1
                notification.last_retry_at = timezone.now()
                notification.save()
                
                notify_task.delay(
                    user_id=notification.user_id,
                    task_item_id=notification.task_item_id,
                    task_title=notification.task_title,
                    role_name=notification.role_name
                )
                
                notification.status = 'success'
                notification.succeeded_at = timezone.now()
                notification.save()
                success_count += 1
                
            except Exception as e:
                notification.error_message = str(e)
                if notification.retry_count >= notification.max_retries:
                    notification.status = 'failed'
                else:
                    notification.status = 'pending'
                notification.save()
                failed_count += 1
        
        return Response(
            {
                'message': f'Retry completed',
                'total': total_count,
                'success': success_count,
                'failed': failed_count,
                'remaining_pending': self.queryset.filter(status='pending').count()
            },
            status=status.HTTP_200_OK
        )
