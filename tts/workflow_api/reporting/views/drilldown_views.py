from django.db.models import Q
from django.utils import timezone
from datetime import timedelta
from rest_framework.response import Response
from rest_framework import status

from reporting.views.base import BaseReportingView
from reporting.utils import (
    apply_date_filter, paginate_queryset, paginate_list,
    calculate_sla_status, calculate_task_item_sla_status,
    extract_ticket_data, extract_task_item_data,
    get_task_item_current_status
)

from task.models import Task, TaskItem
from workflow.models import Workflows
from step.models import Steps

# ==================== DRILLABLE ENDPOINTS ====================

class DrilldownTicketsByStatusView(BaseReportingView):
    """Drillable endpoint: Get detailed ticket list filtered by status."""

    def get(self, request):
        try:
            status_filter = request.query_params.get('status')
            priority_filter = request.query_params.get('priority')
            workflow_filter = request.query_params.get('workflow_id')

            queryset = Task.objects.select_related('ticket_id', 'workflow_id', 'current_step').all()
            
            if status_filter:
                queryset = queryset.filter(status=status_filter)
            if priority_filter:
                queryset = queryset.filter(ticket_id__priority=priority_filter)
            if workflow_filter:
                queryset = queryset.filter(workflow_id=workflow_filter)
            
            queryset = apply_date_filter(queryset, request)
            paginated, pagination = paginate_queryset(queryset, request)
            
            now = timezone.now()
            data = []
            for task in paginated:
                sla_status = calculate_sla_status(task, now)
                assigned_users = list(task.taskitem_set.values_list('role_user__user_full_name', flat=True))
                data.append({
                    **extract_ticket_data(task),
                    'department': task.workflow_id.department if task.workflow_id else None,
                    'current_step': task.current_step.name if task.current_step else None,
                    'target_resolution': task.target_resolution,
                    'resolution_time': task.resolution_time,
                    'assigned_users': assigned_users,
                    'sla_status': sla_status,
                })

            return Response({
                **pagination,
                'filters_applied': {
                    'status': status_filter,
                    'priority': priority_filter,
                    'workflow_id': workflow_filter,
                    'start_date': request.query_params.get('start_date'),
                    'end_date': request.query_params.get('end_date'),
                },
                'tickets': data,
            }, status=status.HTTP_200_OK)
        except Exception as e:
            return self.handle_exception(e)


class DrilldownTicketsByPriorityView(BaseReportingView):
    """Drillable endpoint: Get detailed ticket list filtered by priority."""

    def get(self, request):
        try:
            priority_filter = request.query_params.get('priority')
            status_filter = request.query_params.get('status')

            queryset = Task.objects.select_related('ticket_id', 'workflow_id', 'current_step').all()
            
            if priority_filter:
                queryset = queryset.filter(ticket_id__priority=priority_filter)
            if status_filter:
                queryset = queryset.filter(status=status_filter)
            
            queryset = apply_date_filter(queryset, request)
            paginated, pagination = paginate_queryset(queryset, request)
            
            now = timezone.now()
            data = [{
                **extract_ticket_data(task),
                'target_resolution': task.target_resolution,
                'sla_status': calculate_sla_status(task, now),
            } for task in paginated]

            return Response({**pagination, 'tickets': data}, status=status.HTTP_200_OK)
        except Exception as e:
            return self.handle_exception(e)


class DrilldownTicketsByAgeView(BaseReportingView):
    """Drillable endpoint: Get detailed ticket list filtered by age bucket."""

    AGE_BUCKET_FILTERS = {
        '0-1 days': lambda now: {'created_at__gte': now - timedelta(days=1)},
        '1-7 days': lambda now: {'created_at__gte': now - timedelta(days=7), 'created_at__lt': now - timedelta(days=1)},
        '7-30 days': lambda now: {'created_at__gte': now - timedelta(days=30), 'created_at__lt': now - timedelta(days=7)},
        '30-90 days': lambda now: {'created_at__gte': now - timedelta(days=90), 'created_at__lt': now - timedelta(days=30)},
        '90+ days': lambda now: {'created_at__lt': now - timedelta(days=90)},
    }

    def get(self, request):
        try:
            age_bucket = request.query_params.get('age_bucket')
            status_filter = request.query_params.get('status')
            now = timezone.now()

            queryset = Task.objects.select_related('ticket_id', 'workflow_id', 'current_step').all()
            
            if age_bucket and age_bucket in self.AGE_BUCKET_FILTERS:
                queryset = queryset.filter(**self.AGE_BUCKET_FILTERS[age_bucket](now))
            if status_filter:
                queryset = queryset.filter(status=status_filter)

            paginated, pagination = paginate_queryset(queryset, request, order_by='created_at')
            
            data = [{
                **extract_ticket_data(task),
                'age_days': (now - task.created_at).days if task.created_at else 0,
            } for task in paginated]

            return Response({**pagination, 'age_bucket': age_bucket, 'tickets': data}, status=status.HTTP_200_OK)
        except Exception as e:
            return self.handle_exception(e)


class DrilldownSLAComplianceView(BaseReportingView):
    """Drillable endpoint: Get detailed SLA compliance data."""

    def get(self, request):
        try:
            sla_status_filter = request.query_params.get('sla_status')
            priority_filter = request.query_params.get('priority')

            queryset = Task.objects.select_related('ticket_id', 'workflow_id').filter(target_resolution__isnull=False)
            if priority_filter:
                queryset = queryset.filter(ticket_id__priority=priority_filter)
            queryset = apply_date_filter(queryset, request)

            now = timezone.now()
            filtered_tasks = []
            
            for task in queryset:
                task_sla_status = calculate_sla_status(task, now)
                
                if not sla_status_filter or task_sla_status == sla_status_filter:
                    time_remaining = time_overdue = None
                    if task.status != 'completed' and task.target_resolution:
                        diff = (task.target_resolution - now).total_seconds() / 3600
                        if diff > 0:
                            time_remaining = round(diff, 2)
                        else:
                            time_overdue = round(abs(diff), 2)
                    
                    filtered_tasks.append({
                        'task_id': task.task_id,
                        'ticket_number': task.ticket_id.ticket_number if task.ticket_id else '',
                        'subject': task.ticket_id.ticket_data.get('subject', '') if task.ticket_id else '',
                        'priority': task.ticket_id.priority if task.ticket_id else None,
                        'status': task.status,
                        'target_resolution': task.target_resolution,
                        'resolution_time': task.resolution_time,
                        'sla_status': task_sla_status,
                        'time_remaining_hours': time_remaining,
                        'time_overdue_hours': time_overdue,
                    })

            paginated, pagination = paginate_list(filtered_tasks, request)
            return Response({**pagination, 'sla_status_filter': sla_status_filter, 'tickets': paginated}, status=status.HTTP_200_OK)
        except Exception as e:
            return self.handle_exception(e)


class DrilldownUserTasksView(BaseReportingView):
    """Drillable endpoint: Get detailed task items for a specific user."""

    def get(self, request):
        try:
            user_id = request.query_params.get('user_id')
            status_filter = request.query_params.get('status')

            if not user_id:
                return Response({'error': 'user_id is required'}, status=status.HTTP_400_BAD_REQUEST)

            queryset = TaskItem.objects.select_related(
                'task', 'task__ticket_id', 'role_user', 'assigned_on_step'
            ).filter(role_user__user_id=user_id)
            queryset = apply_date_filter(queryset, request, date_field='assigned_on')

            now = timezone.now()
            filtered_items = []

            for item in queryset:
                current_status = get_task_item_current_status(item)
                if status_filter and current_status != status_filter:
                    continue

                time_to_action = None
                if item.acted_on and item.assigned_on:
                    time_to_action = round((item.acted_on - item.assigned_on).total_seconds() / 3600, 2)

                filtered_items.append({
                    'user_id': user_id,
                    'user_name': item.role_user.user_full_name if item.role_user else f'User {user_id}',
                    'task_item_id': item.task_item_id,
                    'ticket_number': item.task.ticket_id.ticket_number if item.task and item.task.ticket_id else '',
                    'subject': item.task.ticket_id.ticket_data.get('subject', '') if item.task and item.task.ticket_id else '',
                    'status': current_status,
                    'origin': item.origin,
                    'assigned_on': item.assigned_on,
                    'acted_on': item.acted_on,
                    'target_resolution': item.target_resolution,
                    'resolution_time': item.resolution_time,
                    'time_to_action_hours': time_to_action,
                    'sla_status': calculate_task_item_sla_status(item, current_status, now),
                })

            paginated, pagination = paginate_list(filtered_items, request)
            return Response({**pagination, 'user_id': user_id, 'task_items': paginated}, status=status.HTTP_200_OK)
        except Exception as e:
            return self.handle_exception(e)


class DrilldownWorkflowTasksView(BaseReportingView):
    """Drillable endpoint: Get detailed tasks for a specific workflow."""

    def get(self, request):
        try:
            workflow_id = request.query_params.get('workflow_id')
            status_filter = request.query_params.get('status')
            step_id = request.query_params.get('step_id')

            if not workflow_id:
                return Response({'error': 'workflow_id is required'}, status=status.HTTP_400_BAD_REQUEST)

            queryset = Task.objects.select_related('ticket_id', 'workflow_id', 'current_step').filter(workflow_id=workflow_id)
            if status_filter:
                queryset = queryset.filter(status=status_filter)
            if step_id:
                queryset = queryset.filter(current_step_id=step_id)
            queryset = apply_date_filter(queryset, request)

            paginated, pagination = paginate_queryset(queryset, request)
            workflow = Workflows.objects.filter(workflow_id=workflow_id).first()
            workflow_name = workflow.name if workflow else f'Workflow {workflow_id}'

            data = [{
                'workflow_id': int(workflow_id),
                'workflow_name': workflow_name,
                'task_id': task.task_id,
                'ticket_number': task.ticket_id.ticket_number if task.ticket_id else '',
                'subject': task.ticket_id.ticket_data.get('subject', '') if task.ticket_id else '',
                'status': task.status,
                'current_step': task.current_step.name if task.current_step else None,
                'created_at': task.created_at,
                'resolution_time': task.resolution_time,
            } for task in paginated]

            return Response({
                **pagination, 'workflow_id': workflow_id, 'workflow_name': workflow_name, 'tasks': data
            }, status=status.HTTP_200_OK)
        except Exception as e:
            return self.handle_exception(e)


class DrilldownStepTasksView(BaseReportingView):
    """Drillable endpoint: Get detailed tasks for a specific step."""

    def get(self, request):
        try:
            step_id = request.query_params.get('step_id')
            status_filter = request.query_params.get('status')

            if not step_id:
                return Response({'error': 'step_id is required'}, status=status.HTTP_400_BAD_REQUEST)

            queryset = Task.objects.select_related('ticket_id', 'workflow_id', 'current_step').filter(current_step_id=step_id)
            if status_filter:
                queryset = queryset.filter(status=status_filter)

            paginated, pagination = paginate_queryset(queryset, request)
            step = Steps.objects.filter(step_id=step_id).first()
            step_name = step.name if step else f'Step {step_id}'

            data = []
            for task in paginated:
                task_item = task.taskitem_set.first()
                data.append({
                    'step_id': int(step_id),
                    'step_name': step_name,
                    'task_id': task.task_id,
                    'ticket_number': task.ticket_id.ticket_number if task.ticket_id else '',
                    'status': task.status,
                    'assigned_user': task_item.role_user.user_full_name if task_item and task_item.role_user else None,
                    'entered_at': task.created_at,
                })

            return Response({**pagination, 'step_id': step_id, 'step_name': step_name, 'tasks': data}, status=status.HTTP_200_OK)
        except Exception as e:
            return self.handle_exception(e)


class DrilldownDepartmentTasksView(BaseReportingView):
    """Drillable endpoint: Get detailed tasks for a specific department."""

    def get(self, request):
        try:
            department = request.query_params.get('department')
            status_filter = request.query_params.get('status')

            if not department:
                return Response({'error': 'department is required'}, status=status.HTTP_400_BAD_REQUEST)

            queryset = Task.objects.select_related('ticket_id', 'workflow_id', 'current_step').filter(workflow_id__department=department)
            if status_filter:
                queryset = queryset.filter(status=status_filter)
            queryset = apply_date_filter(queryset, request)

            paginated, pagination = paginate_queryset(queryset, request)
            data = [{
                **extract_ticket_data(task),
                'current_step': task.current_step.name if task.current_step else None,
            } for task in paginated]

            return Response({**pagination, 'department': department, 'tasks': data}, status=status.HTTP_200_OK)
        except Exception as e:
            return self.handle_exception(e)


class DrilldownTransfersView(BaseReportingView):
    """Drillable endpoint: Get detailed transfer/escalation records."""

    def get(self, request):
        try:
            origin_filter = request.query_params.get('origin')
            user_id = request.query_params.get('user_id')

            queryset = TaskItem.objects.select_related(
                'task', 'task__ticket_id', 'role_user', 'transferred_to', 'assigned_on_step'
            ).exclude(origin='System')

            if origin_filter:
                queryset = queryset.filter(origin=origin_filter)
            if user_id:
                queryset = queryset.filter(Q(role_user__user_id=user_id) | Q(transferred_to__user_id=user_id))
            queryset = apply_date_filter(queryset, request, date_field='assigned_on')

            paginated, pagination = paginate_queryset(queryset, request, order_by='-assigned_on')
            data = [{
                'task_item_id': item.task_item_id,
                'ticket_number': item.task.ticket_id.ticket_number if item.task and item.task.ticket_id else '',
                'from_user': item.role_user.user_full_name if item.role_user else None,
                'to_user': item.transferred_to.user_full_name if item.transferred_to else None,
                'transferred_at': item.assigned_on,
                'origin': item.origin,
                'step_name': item.assigned_on_step.name if item.assigned_on_step else None,
            } for item in paginated]

            return Response({**pagination, 'origin_filter': origin_filter, 'transfers': data}, status=status.HTTP_200_OK)
        except Exception as e:
            return self.handle_exception(e)


class DrilldownTaskItemsByStatusView(BaseReportingView):
    """Drillable endpoint: Get detailed task items filtered by status."""

    def get(self, request):
        try:
            status_filter = request.query_params.get('status')
            queryset = TaskItem.objects.select_related('task', 'task__ticket_id', 'role_user', 'assigned_on_step').all()
            queryset = apply_date_filter(queryset, request, date_field='assigned_on')

            filtered_items = []
            for item in queryset:
                current_status = get_task_item_current_status(item)
                if status_filter and current_status != status_filter:
                    continue
                filtered_items.append({**extract_task_item_data(item, include_status=False), 'status': current_status})

            paginated, pagination = paginate_list(filtered_items, request)
            return Response({**pagination, 'status_filter': status_filter, 'task_items': paginated}, status=status.HTTP_200_OK)
        except Exception as e:
            return self.handle_exception(e)


class DrilldownTaskItemsByOriginView(BaseReportingView):
    """Drillable endpoint: Get detailed task items filtered by origin."""

    def get(self, request):
        try:
            origin_filter = request.query_params.get('origin')
            queryset = TaskItem.objects.select_related('task', 'task__ticket_id', 'role_user', 'assigned_on_step').all()
            if origin_filter:
                queryset = queryset.filter(origin=origin_filter)
            queryset = apply_date_filter(queryset, request, date_field='assigned_on')

            paginated, pagination = paginate_queryset(queryset, request, order_by='-assigned_on')
            data = [{**extract_task_item_data(item)} for item in paginated]

            return Response({**pagination, 'origin_filter': origin_filter, 'task_items': data}, status=status.HTTP_200_OK)
        except Exception as e:
            return self.handle_exception(e)
