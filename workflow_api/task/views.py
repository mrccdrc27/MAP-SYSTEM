from django.shortcuts import render, get_object_or_404
from rest_framework import generics, viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from django.utils import timezone
from .serializers import TaskSerializer
from .models import Task
from tickets.tasks import create_task_for_ticket
import json

class TaskViewSet(viewsets.ModelViewSet):
    queryset = Task.objects.all()
    serializer_class = TaskSerializer
    
    def get_queryset(self):
        queryset = Task.objects.all()
        
        # Filter by status
        status_param = self.request.query_params.get('status')
        if status_param:
            queryset = queryset.filter(status=status_param)
        
        # Filter by ticket
        ticket_id = self.request.query_params.get('ticket_id')
        if ticket_id:
            queryset = queryset.filter(ticket_id=ticket_id)
        
        # Filter by workflow
        workflow_id = self.request.query_params.get('workflow_id')
        if workflow_id:
            queryset = queryset.filter(workflow_id=workflow_id)
        
        return queryset.order_by('-created_at')
    
    @action(detail=True, methods=['post'])
    def assign_user(self, request, pk=None):
        """Assign a user to the task"""
        task = self.get_object()
        user_data = request.data
        
        try:
            success = task.add_user_assignment(user_data)
            if success:
                return Response({
                    'status': 'success',
                    'message': 'User assigned successfully',
                    'assigned_users': task.users
                })
            else:
                return Response({
                    'status': 'error',
                    'message': 'User already assigned'
                }, status=status.HTTP_400_BAD_REQUEST)
        except ValueError as e:
            return Response({
                'status': 'error',
                'message': str(e)
            }, status=status.HTTP_400_BAD_REQUEST)
    
    @action(detail=True, methods=['post'])
    def update_user_status(self, request, pk=None):
        """Update the status of an assigned user"""
        task = self.get_object()
        user_id = request.data.get('user_id')
        new_status = request.data.get('status')
        
        if not user_id or not new_status:
            return Response({
                'status': 'error',
                'message': 'user_id and status are required'
            }, status=status.HTTP_400_BAD_REQUEST)
        
        success = task.update_user_status(user_id, new_status)
        if success:
            return Response({
                'status': 'success',
                'message': 'User status updated successfully',
                'assigned_users': task.users
            })
        else:
            return Response({
                'status': 'error',
                'message': 'User not found in task assignments'
            }, status=status.HTTP_404_NOT_FOUND)
    
    @action(detail=True, methods=['post'])
    def complete_task(self, request, pk=None):
        """Mark task as completed and trigger end logic"""
        task = self.get_object()
        task.mark_as_completed()
        
        return Response({
            'status': 'success',
            'message': 'Task completed successfully',
            'task_status': task.status,
            'end_logic_triggered': task.workflow_id.end_logic if task.workflow_id else None
        })
    
    @action(detail=True, methods=['post'])
    def move_to_next_step(self, request, pk=None):
        """Move task to the next step in the workflow"""
        task = self.get_object()
        success = task.move_to_next_step()
        
        if success:
            return Response({
                'status': 'success',
                'message': 'Task moved to next step',
                'current_step': task.current_step.name if task.current_step else None,
                'assigned_users': task.users
            })
        else:
            return Response({
                'status': 'error',
                'message': 'Failed to move to next step'
            }, status=status.HTTP_400_BAD_REQUEST)
    
    @action(detail=False, methods=['post'])
    def create_task_for_ticket(self, request):
        """Manually trigger task creation for a ticket (for testing)"""
        ticket_id = request.data.get('ticket_id')
        
        if not ticket_id:
            return Response({
                'status': 'error',
                'message': 'ticket_id is required'
            }, status=status.HTTP_400_BAD_REQUEST)
        
        try:
            # Trigger the Celery task
            task_result = create_task_for_ticket.delay(ticket_id)
            
            return Response({
                'status': 'success',
                'message': 'Task creation initiated',
                'celery_task_id': task_result.id,
                'ticket_id': ticket_id
            })
        except Exception as e:
            return Response({
                'status': 'error',
                'message': f'Failed to create task: {str(e)}'
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
    
    @action(detail=False, methods=['get'])
    def workflow_statistics(self, request):
        """Get statistics about tasks and workflows"""
        from django.db.models import Count
        from workflow.models import Workflows
        
        # Task statistics by status
        task_stats = Task.objects.values('status').annotate(
            count=Count('status')
        ).order_by('status')
        
        # Tasks by workflow
        workflow_stats = Task.objects.values(
            'workflow_id__name'
        ).annotate(
            count=Count('workflow_id')
        ).order_by('-count')
        
        # Recent tasks
        recent_tasks = Task.objects.select_related(
            'ticket_id', 'workflow_id', 'current_step'
        ).order_by('-created_at')[:10]
        
        recent_tasks_data = []
        for task in recent_tasks:
            recent_tasks_data.append({
                'task_id': task.task_id,
                'ticket_subject': task.ticket_id.subject if task.ticket_id else None,
                'workflow_name': task.workflow_id.name if task.workflow_id else None,
                'current_step': task.current_step.name if task.current_step else None,
                'status': task.status,
                'assigned_users_count': len(task.users),
                'created_at': task.created_at
            })
        
        return Response({
            'task_statistics': list(task_stats),
            'workflow_statistics': list(workflow_stats),
            'recent_tasks': recent_tasks_data,
            'total_tasks': Task.objects.count()
        })