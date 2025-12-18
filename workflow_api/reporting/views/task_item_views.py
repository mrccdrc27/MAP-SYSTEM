from django.db.models import Count, F, Avg, Max, Min, Subquery, Value
from django.db.models.functions import Coalesce
from django.utils import timezone
from datetime import timedelta
from rest_framework.response import Response
from rest_framework import status

from reporting.views.base import BaseReportingView
from reporting.utils import (
    apply_date_filter, build_base_response, safe_percentage,
    get_latest_status_subquery
)

from task.models import TaskItem

# ==================== TASK ITEM ANALYTICS ENDPOINTS (NEW) ====================

class TaskItemStatusDistributionView(BaseReportingView):
    """Task Item Status Distribution - count of task items by current status."""

    def get(self, request):
        try:
            queryset = apply_date_filter(TaskItem.objects.all(), request, date_field='assigned_on')
            total_items = queryset.count()
            
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
            
            return Response(build_base_response(request, {
                'total_task_items': total_items,
                'status_distribution': status_data,
            }), status=status.HTTP_200_OK)
        except Exception as e:
            return self.handle_exception(e)


class TaskItemOriginDistributionView(BaseReportingView):
    """Task Item Origin Distribution - count of task items by origin type."""

    def get(self, request):
        try:
            queryset = apply_date_filter(TaskItem.objects.all(), request, date_field='assigned_on')
            total_items = queryset.count()
            
            origin_data = [{
                'origin': item['origin'],
                'count': item['count'],
                'percentage': safe_percentage(item['count'], total_items),
            } for item in queryset.values('origin').annotate(count=Count('task_item_id')).order_by('-count')]
            
            return Response(build_base_response(request, {
                'total_task_items': total_items,
                'origin_distribution': origin_data,
            }), status=status.HTTP_200_OK)
        except Exception as e:
            return self.handle_exception(e)


class TaskItemPerformanceView(BaseReportingView):
    """Task Item Performance - time to action, SLA compliance, active/overdue items."""

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

    def get(self, request):
        try:
            queryset = apply_date_filter(TaskItem.objects.all(), request, date_field='assigned_on')
            now = timezone.now()
            
            return Response(build_base_response(request, {
                'time_to_action_hours': self._get_time_to_action_hours(queryset),
                'sla_compliance': self._get_sla_compliance(queryset),
                'active_items': queryset.exclude(taskitemhistory_set__status__in=['resolved', 'reassigned', 'escalated']).count(),
                'overdue_items': queryset.filter(target_resolution__isnull=False, target_resolution__lt=now).exclude(
                    taskitemhistory_set__status__in=['resolved', 'reassigned', 'escalated']
                ).count(),
            }), status=status.HTTP_200_OK)
        except Exception as e:
            return self.handle_exception(e)


class UserPerformanceView(BaseReportingView):
    """User Performance - metrics for each user handling task items."""

    def get(self, request):
        try:
            queryset = apply_date_filter(TaskItem.objects.all(), request, date_field='assigned_on')
            now = timezone.now()
            
            user_perf_list = []
            unique_user_ids = set(queryset.values_list('role_user__user_id', flat=True).distinct())
            
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
            
            return Response(build_base_response(request, {
                'user_performance': user_perf_list,
            }), status=status.HTTP_200_OK)
        except Exception as e:
            return self.handle_exception(e)


class TransferAnalyticsView(BaseReportingView):
    """Transfer Analytics - transfer/escalation metrics."""

    def get(self, request):
        try:
            queryset = apply_date_filter(TaskItem.objects.all(), request, date_field='assigned_on')
            
            transferred_qs = queryset.filter(transferred_to__isnull=False)
            
            return Response(build_base_response(request, {
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
            }), status=status.HTTP_200_OK)
        except Exception as e:
            return self.handle_exception(e)
