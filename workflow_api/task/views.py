from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from rest_framework.generics import ListAPIView
from rest_framework.filters import SearchFilter, OrderingFilter
from django_filters.rest_framework import DjangoFilterBackend
from django.db.models import Q
import logging

from .models import Task
from .serializers import TaskSerializer, UserTaskListSerializer, TaskCreateSerializer
from authentication import JWTCookieAuthentication, MultiSystemPermission

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
        
        # Get all tasks that have this user in their users array
        queryset = Task.objects.all()
        filtered_tasks = []
        
        for task in queryset:
            if task.users and any(user.get('userID') == user_id for user in task.users):
                filtered_tasks.append(task.pk)
        
        queryset = Task.objects.filter(pk__in=filtered_tasks)
        
        # Apply additional filters from query parameters
        role = self.request.query_params.get('role')
        assignment_status = self.request.query_params.get('assignment_status')
        
        if role:
            # Filter by role - check users array for matching role
            filtered_by_role = []
            for task in queryset:
                for user in task.users:
                    if user.get('userID') == user_id and user.get('role') == role:
                        filtered_by_role.append(task.pk)
                        break
            queryset = queryset.filter(pk__in=filtered_by_role)
        
        if assignment_status:
            # Filter by assignment status - check users array for matching status
            filtered_by_status = []
            for task in queryset:
                for user in task.users:
                    if user.get('userID') == user_id and user.get('status') == assignment_status:
                        filtered_by_status.append(task.pk)
                        break
            queryset = queryset.filter(pk__in=filtered_by_status)
        
        return queryset.select_related('ticket_id', 'workflow_id', 'current_step')
    
    def get_serializer_context(self):
        """Add user_id to serializer context for extracting user-specific assignment data"""
        context = super().get_serializer_context()
        context['user_id'] = self.request.user.user_id
        return context


class TaskViewSet(viewsets.ModelViewSet):
    """
    ViewSet for managing tasks with authentication.
    
    Actions:
    - list: GET /tasks/ - List all tasks (admin only)
    - retrieve: GET /tasks/{id}/ - Get task details
    - create: POST /tasks/ - Create new task
    - update: PUT /tasks/{id}/ - Update task
    - partial_update: PATCH /tasks/{id}/ - Partially update task
    - destroy: DELETE /tasks/{id}/ - Delete task
    - my-tasks: GET /tasks/my-tasks/ - Get user's assigned tasks
    - update-user-status: POST /tasks/{id}/update-user-status/ - Update user's task status
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
        
        # Filter tasks by user ID
        filtered_tasks = []
        for task in self.queryset:
            if task.users and any(user.get('userID') == user_id for user in task.users):
                filtered_tasks.append(task)
        
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
        valid_statuses = ['assigned', 'in_progress', 'completed', 'on_hold']
        if new_status not in valid_statuses:
            return Response(
                {'error': f'status must be one of: {valid_statuses}'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Check if user is assigned to this task
        user_found = False
        for user in task.users:
            if user.get('userID') == user_id:
                user_found = True
                user['status'] = new_status
                break
        
        if not user_found:
            return Response(
                {'error': f'User {user_id} is not assigned to this task'},
                status=status.HTTP_403_FORBIDDEN
            )
        
        task.save()
        
        serializer = UserTaskListSerializer(
            task,
            context={**self.get_serializer_context(), 'user_id': user_id}
        )
        return Response(serializer.data)
