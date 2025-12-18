from django.db.models import Count
from django.db.models.functions import TruncDate
from django.utils import timezone
from datetime import timedelta
from rest_framework.response import Response
from rest_framework import status

from reporting.views.base import BaseReportingView
from reporting.utils import safe_percentage, apply_date_filter

from task.models import Task, TaskItemHistory
from tickets.models import WorkflowTicket

# ==================== ANALYTICS VIEWS ====================

class TicketTrendAnalyticsView(BaseReportingView):
    """Ticket Trends Over Time - based on Task statuses."""

    def get(self, request):
        try:
            days = int(request.query_params.get('days', 30))
            cutoff_date = timezone.now() - timedelta(days=days)
            
            created_trends = Task.objects.filter(
                created_at__gte=cutoff_date
            ).annotate(date=TruncDate('created_at')).values('date').annotate(
                count=Count('task_id')
            ).order_by('date')
            
            resolved_trends = Task.objects.filter(
                status='completed', resolution_time__gte=cutoff_date
            ).annotate(date=TruncDate('resolution_time')).values('date').annotate(
                count=Count('task_id')
            ).order_by('date')
            
            # Merge trends by date
            data_by_date = {}
            for trend in created_trends:
                date_str = str(trend['date'])
                data_by_date.setdefault(date_str, {'created': 0, 'resolved': 0})
                data_by_date[date_str]['created'] = trend['count']
            
            for trend in resolved_trends:
                date_str = str(trend['date'])
                data_by_date.setdefault(date_str, {'created': 0, 'resolved': 0})
                data_by_date[date_str]['resolved'] = trend['count']
            
            data = [{'date': date, **values} for date, values in sorted(data_by_date.items())]
            
            return Response({
                'time_period_days': days,
                'summary': {
                    'total_created': sum(d['created'] for d in data),
                    'total_resolved': sum(d['resolved'] for d in data),
                },
                'trends': data,
            }, status=status.HTTP_200_OK)
        except Exception as e:
            return self.handle_exception(e)


class TaskItemTrendAnalyticsView(BaseReportingView):
    """Task Item Status Trends Over Time."""

    def get(self, request):
        try:
            days = int(request.query_params.get('days', 30))
            cutoff_date = timezone.now() - timedelta(days=days)
            tracked_statuses = ['new', 'in progress', 'escalated', 'reassigned', 'resolved']
            
            trends = TaskItemHistory.objects.filter(
                created_at__gte=cutoff_date, status__in=tracked_statuses
            ).annotate(date=TruncDate('created_at')).values('date', 'status').annotate(
                count=Count('task_item_history_id')
            ).order_by('date', 'status')
            
            # Organize by date
            data_by_date = {}
            for trend in trends:
                date_str = str(trend['date'])
                data_by_date.setdefault(date_str, {s: 0 for s in tracked_statuses})
                data_by_date[date_str][trend['status']] = trend['count']
            
            data = [{
                'date': date,
                'new': statuses.get('new', 0),
                'in_progress': statuses.get('in progress', 0),
                'escalated': statuses.get('escalated', 0),
                'transferred': statuses.get('reassigned', 0),
                'resolved': statuses.get('resolved', 0),
            } for date, statuses in sorted(data_by_date.items())]
            
            summary = {
                'new': sum(d['new'] for d in data),
                'in_progress': sum(d['in_progress'] for d in data),
                'escalated': sum(d['escalated'] for d in data),
                'transferred': sum(d['transferred'] for d in data),
                'reassigned': sum(d['transferred'] for d in data),
                'resolved': sum(d['resolved'] for d in data),
            }
            
            return Response({
                'time_period_days': days,
                'summary': summary,
                'trends': data,
            }, status=status.HTTP_200_OK)
        except Exception as e:
            return self.handle_exception(e)


class TicketCategoryAnalyticsView(BaseReportingView):
    """Ticket Category, Sub-Category, and Department Analytics."""

    def get(self, request):
        try:
            queryset = apply_date_filter(WorkflowTicket.objects.all(), request)
            
            category_counts = {}
            sub_category_counts = {}
            department_counts = {}
            category_sub_category_map = {}
            total_tickets = 0
            
            for ticket in queryset:
                ticket_data = ticket.ticket_data or {}
                total_tickets += 1
                
                category = ticket_data.get('category') or ticket_data.get('Category') or 'Uncategorized'
                sub_category = (ticket_data.get('sub_category') or ticket_data.get('subcategory') 
                               or ticket_data.get('SubCategory') or 'Uncategorized')
                department = ticket_data.get('department') or ticket_data.get('Department') or ticket.department or 'Unassigned'
                
                category_counts[category] = category_counts.get(category, 0) + 1
                sub_category_counts[sub_category] = sub_category_counts.get(sub_category, 0) + 1
                department_counts[department] = department_counts.get(department, 0) + 1
                
                category_sub_category_map.setdefault(category, {})
                category_sub_category_map[category][sub_category] = category_sub_category_map[category].get(sub_category, 0) + 1
            
            def to_sorted_list(counts, key_name):
                return [
                    {key_name: k, 'count': v, 'percentage': round(safe_percentage(v, total_tickets), 1)}
                    for k, v in sorted(counts.items(), key=lambda x: x[1], reverse=True)
                ]
            
            hierarchical_data = [
                {
                    'category': cat,
                    'total': sum(sub_cats.values()),
                    'sub_categories': [{'name': sc, 'count': cnt} for sc, cnt in sorted(sub_cats.items(), key=lambda x: x[1], reverse=True)]
                }
                for cat, sub_cats in sorted(category_sub_category_map.items(), key=lambda x: sum(x[1].values()), reverse=True)
            ]
            
            return Response({
                'total_tickets': total_tickets,
                'by_category': to_sorted_list(category_counts, 'category'),
                'by_sub_category': to_sorted_list(sub_category_counts, 'sub_category'),
                'by_department': to_sorted_list(department_counts, 'department'),
                'hierarchical': hierarchical_data,
            }, status=status.HTTP_200_OK)
        except Exception as e:
            return self.handle_exception(e)
