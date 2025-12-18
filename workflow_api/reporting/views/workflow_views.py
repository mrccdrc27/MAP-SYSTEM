from django.db.models import Count, Case, When, IntegerField
from rest_framework.response import Response
from rest_framework import status

from reporting.views.base import BaseReportingView
from reporting.utils import (
    apply_date_filter, build_base_response, safe_percentage
)

from task.models import Task

# ==================== WORKFLOW ANALYTICS ENDPOINTS (NEW) ====================

class WorkflowMetricsView(BaseReportingView):
    """Workflow Metrics - task counts and completion rates per workflow."""

    def get(self, request):
        try:
            queryset = apply_date_filter(Task.objects.all(), request)
            
            workflows = queryset.values('workflow_id', 'workflow_id__name').annotate(
                total_tasks=Count('task_id'),
                completed_tasks=Count(Case(When(status='completed', then=1), output_field=IntegerField())),
                pending_tasks=Count(Case(When(status='pending', then=1), output_field=IntegerField())),
                in_progress_tasks=Count(Case(When(status='in progress', then=1), output_field=IntegerField()))
            ).order_by('-total_tasks')
            
            workflow_data = [{
                'workflow_id': wf['workflow_id'],
                'workflow_name': wf['workflow_id__name'],
                'total_tasks': wf['total_tasks'],
                'completed_tasks': wf['completed_tasks'],
                'pending_tasks': wf['pending_tasks'],
                'in_progress_tasks': wf['in_progress_tasks'],
                'completion_rate': safe_percentage(wf['completed_tasks'], wf['total_tasks']),
            } for wf in workflows]
            
            return Response(build_base_response(request, {
                'workflow_metrics': workflow_data,
            }), status=status.HTTP_200_OK)
        except Exception as e:
            return self.handle_exception(e)


class DepartmentAnalyticsView(BaseReportingView):
    """Department Analytics - ticket counts and completion rates per department."""

    def get(self, request):
        try:
            queryset = apply_date_filter(Task.objects.all(), request)
            
            departments = queryset.filter(workflow_id__isnull=False).values('workflow_id__department').annotate(
                total_tickets=Count('task_id'),
                completed_tickets=Count(Case(When(status='completed', then=1), output_field=IntegerField()))
            ).order_by('-total_tickets')
            
            department_data = [{
                'department': dept['workflow_id__department'],
                'total_tickets': dept['total_tickets'],
                'completed_tickets': dept['completed_tickets'],
                'completion_rate': safe_percentage(dept['completed_tickets'], dept['total_tickets']),
            } for dept in departments]
            
            return Response(build_base_response(request, {
                'department_analytics': department_data,
            }), status=status.HTTP_200_OK)
        except Exception as e:
            return self.handle_exception(e)


class StepPerformanceView(BaseReportingView):
    """Step Performance - task counts per workflow step."""

    def get(self, request):
        try:
            queryset = apply_date_filter(Task.objects.all(), request)
            
            steps = queryset.filter(current_step__isnull=False).values(
                'current_step_id', 'current_step__name', 'workflow_id', 'workflow_id__name'
            ).annotate(
                total_tasks=Count('task_id'),
                completed_tasks=Count(Case(When(status='completed', then=1), output_field=IntegerField()))
            ).order_by('-total_tasks')
            
            step_data = [{
                'step_id': step['current_step_id'],
                'step_name': step['current_step__name'],
                'workflow_id': step['workflow_id'],
                'workflow_name': step['workflow_id__name'],
                'total_tasks': step['total_tasks'],
                'completed_tasks': step['completed_tasks'],
                'completion_rate': safe_percentage(step['completed_tasks'], step['total_tasks']),
            } for step in steps]
            
            return Response(build_base_response(request, {
                'step_performance': step_data,
            }), status=status.HTTP_200_OK)
        except Exception as e:
            return self.handle_exception(e)
