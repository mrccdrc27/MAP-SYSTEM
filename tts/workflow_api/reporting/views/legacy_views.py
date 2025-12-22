from django.db.models import Count, Q, F, Case, When, IntegerField, Avg, Max, Min, Subquery, Value
from django.db.models.functions import Coalesce
from django.utils import timezone
from datetime import timedelta
from rest_framework.response import Response
from rest_framework import status

from reporting.views.base import BaseReportingView
from reporting.utils import (
    apply_date_filter, get_date_range_display, safe_percentage,
    get_latest_status_subquery
)

from task.models import Task, TaskItem

# ==================== LEGACY AGGREGATED ENDPOINTS (DEPRECATED) ====================

class AggregatedTicketsReportView(BaseReportingView):
    """Aggregated tickets reporting endpoint with time filtering.
    
    DEPRECATED: This endpoint returns all ticket analytics in one call.
    Prefer using the individual endpoints for better performance:
    - /tickets/dashboard/ - KPI metrics
    - /tickets/status/ - Status summary
    - /tickets/priority/ - Priority distribution
    - /tickets/age/ - Ticket age buckets
    - /tickets/sla/ - SLA compliance by priority
    """

    def get(self, request):
        try:
            queryset = apply_date_filter(Task.objects.all(), request)
            total_tickets = queryset.count()
            now = timezone.now()
            
            # Dashboard metrics
            completed_tickets = queryset.filter(status='completed').count()
            pending_tickets = queryset.filter(status='pending').count()
            in_progress_tickets = queryset.filter(status='in progress').count()
            
            total_with_sla = queryset.filter(target_resolution__isnull=False).count()
            sla_met = queryset.filter(
                Q(status='completed'),
                Q(resolution_time__lte=F('target_resolution')) | Q(resolution_time__isnull=True),
                target_resolution__isnull=False
            ).count()
            
            total_users = queryset.values('taskitem__role_user__user_id').distinct().count()
            total_workflows = queryset.values('workflow_id').distinct().count()
            escalated_count = TaskItem.objects.filter(task__in=queryset, origin='Escalation').distinct().count()
            
            # Status summary
            status_summary_data = list(queryset.values('status').annotate(count=Count('task_id')).order_by('-count'))
            
            # SLA compliance by priority
            sla_compliance = queryset.filter(ticket_id__priority__isnull=False).values('ticket_id__priority').annotate(
                total_tasks=Count('task_id'),
                sla_met=Count(Case(
                    When(Q(resolution_time__lte=F('target_resolution')) | Q(resolution_time__isnull=True), then=1),
                    output_field=IntegerField()
                ))
            ).order_by('-total_tasks')
            
            sla_compliance_data = [{
                'priority': item['ticket_id__priority'],
                'total_tasks': item['total_tasks'],
                'sla_met': item['sla_met'],
                'sla_breached': item['total_tasks'] - item['sla_met'],
                'compliance_rate': safe_percentage(item['sla_met'], item['total_tasks']),
            } for item in sla_compliance]
            
            # Priority distribution
            priority_data = [{
                'priority': item['ticket_id__priority'],
                'count': item['count'],
                'percentage': safe_percentage(item['count'], total_tickets),
            } for item in queryset.values('ticket_id__priority').annotate(count=Count('task_id')).order_by('-count')]
            
            # Ticket age buckets
            age_buckets = [
                ('0-1 days', queryset.filter(created_at__gte=now - timedelta(days=1)).count()),
                ('1-7 days', queryset.filter(created_at__gte=now - timedelta(days=7), created_at__lt=now - timedelta(days=1)).count()),
                ('7-30 days', queryset.filter(created_at__gte=now - timedelta(days=30), created_at__lt=now - timedelta(days=7)).count()),
                ('30-90 days', queryset.filter(created_at__gte=now - timedelta(days=90), created_at__lt=now - timedelta(days=30)).count()),
                ('90+ days', queryset.filter(created_at__lt=now - timedelta(days=90)).count()),
            ]
            ticket_age_data = [{'age_bucket': bucket, 'count': count, 'percentage': safe_percentage(count, total_tickets)} for bucket, count in age_buckets]
            
            return Response({
                'date_range': get_date_range_display(request),
                'dashboard': {
                    'total_tickets': total_tickets,
                    'completed_tickets': completed_tickets,
                    'pending_tickets': pending_tickets,
                    'in_progress_tickets': in_progress_tickets,
                    'sla_compliance_rate': safe_percentage(sla_met, total_with_sla),
                    'total_users': total_users,
                    'total_workflows': total_workflows,
                    'escalation_rate': safe_percentage(escalated_count, total_tickets),
                },
                'status_summary': status_summary_data,
                'sla_compliance': sla_compliance_data,
                'priority_distribution': priority_data,
                'ticket_age': ticket_age_data,
            }, status=status.HTTP_200_OK)
        except Exception as e:
            return self.handle_exception(e)


class AggregatedWorkflowsReportView(BaseReportingView):
    """Aggregated workflows reporting endpoint with time filtering."""

    def get(self, request):
        try:
            queryset = apply_date_filter(Task.objects.all(), request)
            
            # Workflow metrics
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
            
            # Department analytics
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
            
            # Step performance
            steps = queryset.filter(current_step__isnull=False).values(
                'current_step_id', 'current_step__name', 'workflow_id'
            ).annotate(
                total_tasks=Count('task_id'),
                completed_tasks=Count(Case(When(status='completed', then=1), output_field=IntegerField()))
            ).order_by('-total_tasks')
            
            step_data = [{
                'step_id': step['current_step_id'],
                'step_name': step['current_step__name'],
                'workflow_id': step['workflow_id'],
                'total_tasks': step['total_tasks'],
                'completed_tasks': step['completed_tasks'],
            } for step in steps]
            
            return Response({
                'date_range': get_date_range_display(request),
                'workflow_metrics': workflow_data,
                'department_analytics': department_data,
                'step_performance': step_data,
            }, status=status.HTTP_200_OK)
        except Exception as e:
            return self.handle_exception(e)


class AggregatedTasksReportView(BaseReportingView):
    """Aggregated task items reporting endpoint with time filtering."""

    def _get_time_to_action_hours(self, queryset):
        """Calculate time to action statistics."""
        time_to_action = queryset.filter(
            assigned_on__isnull=False, acted_on__isnull=False
        ).annotate(time_delta=F('acted_on') - F('assigned_on')).aggregate(
            average=Avg('time_delta'), minimum=Min('time_delta'), maximum=Max('time_delta')
        )
        return {
            key: float(val / timedelta(hours=1)) if val else None
            for key, val in time_to_action.items()
        }

    def _get_sla_compliance(self, queryset):
        """Calculate SLA compliance data."""
        sla_items = queryset.filter(target_resolution__isnull=False)
        sla_items_with_status = sla_items.annotate(
            latest_status=Coalesce(Subquery(get_latest_status_subquery()), Value('new'))
        )
        
        all_statuses = ['new', 'in progress', 'resolved', 'escalated', 'reassigned']
        now = timezone.now()
        status_breakdown = {}
        
        for status_name in all_statuses:
            status_items = sla_items_with_status.filter(latest_status=status_name)
            count = status_items.count()
            
            if status_name in ['resolved', 'completed', 'escalated', 'reassigned']:
                status_breakdown[status_name] = {'total': count, 'met_sla': count, 'missed_sla': 0}
            else:
                on_track = status_items.filter(target_resolution__gt=now).count() if count > 0 else 0
                status_breakdown[status_name] = {'total': count, 'on_track': on_track, 'breached': count - on_track}
        
        tasks_on_track = sla_items_with_status.filter(
            latest_status__in=['resolved', 'completed', 'escalated', 'reassigned']
        ).count() + sla_items_with_status.filter(
            latest_status__in=['new', 'in progress'], target_resolution__gt=now
        ).count()
        
        tasks_breached = sla_items_with_status.filter(
            latest_status__in=['new', 'in progress'], target_resolution__lte=now
        ).count()
        
        total_sla = sla_items.count()
        return {
            'summary': {
                'total_tasks_with_sla': total_sla,
                'tasks_on_track': tasks_on_track,
                'tasks_breached': tasks_breached,
                'current_compliance_rate_percent': round(safe_percentage(tasks_on_track, total_sla), 1),
            },
            'by_current_status': status_breakdown
        }

    def _get_user_performance(self, queryset):
        """Calculate user performance metrics."""
        user_perf_list = []
        unique_user_ids = set(queryset.values_list('role_user__user_id', flat=True).distinct())
        now = timezone.now()
        
        for user_id in unique_user_ids:
            user_items = queryset.filter(role_user__user_id=user_id)
            first_item = user_items.first()
            user_name = first_item.role_user.user_full_name if first_item and first_item.role_user else f'User {user_id}'
            total = user_items.count()
            
            user_items_with_status = user_items.annotate(
                latest_status=Coalesce(Subquery(get_latest_status_subquery()), Value('new'))
            )
            
            counts = {
                'new': user_items_with_status.filter(latest_status='new').count(),
                'in_progress': user_items_with_status.filter(latest_status='in progress').count(),
                'resolved': user_items_with_status.filter(latest_status='resolved').count(),
                'reassigned': user_items_with_status.filter(latest_status='reassigned').count(),
                'escalated': user_items_with_status.filter(latest_status='escalated').count(),
                'breached': user_items_with_status.filter(
                    target_resolution__isnull=False, target_resolution__lt=now
                ).exclude(latest_status__in=['resolved', 'reassigned', 'escalated']).count(),
            }
            
            user_perf_list.append({
                'user_id': user_id,
                'user_name': user_name,
                'total_items': total,
                **counts,
                'resolution_rate': safe_percentage(counts['resolved'], total),
                'escalation_rate': safe_percentage(counts['escalated'], total),
                'breach_rate': safe_percentage(counts['breached'], total),
            })
        
        return user_perf_list

    def get(self, request):
        try:
            queryset = apply_date_filter(TaskItem.objects.all(), request, date_field='assigned_on')
            total_items = queryset.count()
            now = timezone.now()
            
            # Status distribution
            queryset_with_status = queryset.annotate(
                latest_status=Coalesce(Subquery(get_latest_status_subquery()), Value('new'))
            )
            status_data = [{
                'status': item['latest_status'],
                'count': item['count'],
                'percentage': safe_percentage(item['count'], total_items),
            } for item in queryset_with_status.values('latest_status').annotate(
                count=Count('task_item_id', distinct=True)
            ).order_by('-count') if item['latest_status']]
            
            # Origin distribution
            origin_data = [{
                'origin': item['origin'],
                'count': item['count'],
                'percentage': safe_percentage(item['count'], total_items),
            } for item in queryset.values('origin').annotate(count=Count('task_item_id')).order_by('-count')]
            
            # Performance data
            performance_data = {
                'time_to_action_hours': self._get_time_to_action_hours(queryset),
                'resolution_time_hours': {'average': None, 'minimum': None, 'maximum': None},
                'sla_compliance': self._get_sla_compliance(queryset),
                'active_items': queryset.exclude(taskitemhistory_set__status__in=['resolved', 'reassigned', 'escalated']).count(),
                'overdue_items': queryset.filter(target_resolution__isnull=False, target_resolution__lt=now).exclude(
                    taskitemhistory_set__status__in=['resolved', 'reassigned', 'escalated']
                ).count(),
            }
            
            # Transfer analytics
            transferred_qs = queryset.filter(transferred_to__isnull=False)
            transfer_analytics = {
                'total_transfers': transferred_qs.count(),
                'top_transferrers': list(transferred_qs.values(
                    'role_user__user_id', 'role_user__user_full_name'
                ).annotate(transfer_count=Count('task_item_id')).order_by('-transfer_count')[:10]),
                'top_transfer_recipients': list(transferred_qs.values(
                    'transferred_to__user_id', 'transferred_to__user_full_name'
                ).annotate(received_count=Count('task_item_id')).order_by('-received_count')[:10]),
                'total_escalations': queryset.filter(origin='Escalation').count(),
                'escalations_by_step': list(queryset.filter(origin='Escalation').values(
                    'assigned_on_step__name'
                ).annotate(escalation_count=Count('task_item_id')).order_by('-escalation_count')),
            }
            
            return Response({
                'date_range': get_date_range_display(request),
                'summary': {'total_task_items': total_items},
                'status_distribution': status_data,
                'origin_distribution': origin_data,
                'performance': performance_data,
                'user_performance': self._get_user_performance(queryset),
                'transfer_analytics': transfer_analytics,
            }, status=status.HTTP_200_OK)
        except Exception as e:
            return self.handle_exception(e)
