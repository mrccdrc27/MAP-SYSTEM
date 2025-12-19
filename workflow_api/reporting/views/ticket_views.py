from django.db.models import Count, Q, F, Case, When, IntegerField
from django.utils import timezone
from datetime import timedelta
from rest_framework.response import Response
from rest_framework import status

from reporting.views.base import BaseReportingView
from reporting.utils import (
    apply_date_filter, build_base_response, safe_percentage
)

from task.models import Task, TaskItem

# ==================== TICKET ANALYTICS ENDPOINTS (NEW) ====================

class TicketDashboardView(BaseReportingView):
    """Ticket Dashboard KPIs - high-level metrics for tickets."""

    def get(self, request):
        try:
            queryset = apply_date_filter(Task.objects.all(), request)
            total_tickets = queryset.count()
            now = timezone.now()
            
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
            
            return Response(build_base_response(request, {
                'total_tickets': total_tickets,
                'completed_tickets': completed_tickets,
                'pending_tickets': pending_tickets,
                'in_progress_tickets': in_progress_tickets,
                'sla_compliance_rate': safe_percentage(sla_met, total_with_sla),
                'total_users': total_users,
                'total_workflows': total_workflows,
                'escalation_rate': safe_percentage(escalated_count, total_tickets),
            }), status=status.HTTP_200_OK)
        except Exception as e:
            return self.handle_exception(e)


class TicketStatusSummaryView(BaseReportingView):
    """Ticket Status Summary - count of tickets by status."""

    def get(self, request):
        try:
            queryset = apply_date_filter(Task.objects.all(), request)
            total_tickets = queryset.count()
            
            status_data = [{
                'status': item['status'],
                'count': item['count'],
                'percentage': safe_percentage(item['count'], total_tickets),
            } for item in queryset.values('status').annotate(count=Count('task_id')).order_by('-count')]
            
            return Response(build_base_response(request, {
                'total_tickets': total_tickets,
                'status_summary': status_data,
            }), status=status.HTTP_200_OK)
        except Exception as e:
            return self.handle_exception(e)


class TicketPriorityDistributionView(BaseReportingView):
    """Ticket Priority Distribution - count of tickets by priority."""

    def get(self, request):
        try:
            queryset = apply_date_filter(Task.objects.all(), request)
            total_tickets = queryset.count()
            
            priority_data = [{
                'priority': item['ticket_id__priority'],
                'count': item['count'],
                'percentage': safe_percentage(item['count'], total_tickets),
            } for item in queryset.values('ticket_id__priority').annotate(count=Count('task_id')).order_by('-count')]
            
            return Response(build_base_response(request, {
                'total_tickets': total_tickets,
                'priority_distribution': priority_data,
            }), status=status.HTTP_200_OK)
        except Exception as e:
            return self.handle_exception(e)


class TicketAgeDistributionView(BaseReportingView):
    """Ticket Age Distribution - tickets grouped by age buckets."""

    AGE_BUCKETS = [
        ('0-1 days', timedelta(days=1), None),
        ('1-7 days', timedelta(days=7), timedelta(days=1)),
        ('7-30 days', timedelta(days=30), timedelta(days=7)),
        ('30-90 days', timedelta(days=90), timedelta(days=30)),
        ('90+ days', None, timedelta(days=90)),
    ]

    def get(self, request):
        try:
            queryset = apply_date_filter(Task.objects.all(), request)
            total_tickets = queryset.count()
            now = timezone.now()
            
            age_data = []
            for bucket_name, start_delta, end_delta in self.AGE_BUCKETS:
                filters = {}
                if start_delta:
                    filters['created_at__gte'] = now - start_delta
                if end_delta:
                    filters['created_at__lt'] = now - end_delta
                count = queryset.filter(**filters).count()
                age_data.append({
                    'age_bucket': bucket_name,
                    'count': count,
                    'percentage': safe_percentage(count, total_tickets),
                })
            
            return Response(build_base_response(request, {
                'total_tickets': total_tickets,
                'ticket_age': age_data,
            }), status=status.HTTP_200_OK)
        except Exception as e:
            return self.handle_exception(e)


class TicketSLAComplianceView(BaseReportingView):
    """Ticket SLA Compliance - compliance metrics grouped by priority."""

    def get(self, request):
        try:
            queryset = apply_date_filter(Task.objects.all(), request)
            total_with_sla = queryset.filter(target_resolution__isnull=False).count()
            
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
            
            # Overall SLA metrics
            total_sla_met = sum(item['sla_met'] for item in sla_compliance_data)
            total_tasks = sum(item['total_tasks'] for item in sla_compliance_data)
            
            return Response(build_base_response(request, {
                'total_with_sla': total_with_sla,
                'overall_compliance_rate': safe_percentage(total_sla_met, total_tasks),
                'sla_compliance': sla_compliance_data,
            }), status=status.HTTP_200_OK)
        except Exception as e:
            return self.handle_exception(e)
