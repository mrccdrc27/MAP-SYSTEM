from datetime import datetime, timedelta
from django.utils import timezone
from django.db.models import OuterRef
from task.models import TaskItemHistory

# ==================== HELPER UTILITIES ====================

def parse_date(date_str, end_of_day=False):
    """Parse date string to timezone-aware datetime. Returns None if invalid."""
    if not date_str:
        return None
    try:
        dt = datetime.strptime(date_str, '%Y-%m-%d').date()
        time_part = datetime.max.time() if end_of_day else datetime.min.time()
        return timezone.make_aware(datetime.combine(dt, time_part))
    except ValueError:
        return None


def apply_date_filter(queryset, request, date_field='created_at'):
    """Apply start/end date filters to queryset."""
    start_date = parse_date(request.query_params.get('start_date'))
    end_date = parse_date(request.query_params.get('end_date'), end_of_day=True)
    
    if start_date:
        queryset = queryset.filter(**{f'{date_field}__gte': start_date})
    if end_date:
        queryset = queryset.filter(**{f'{date_field}__lte': end_date})
    return queryset


def get_date_params(request):
    """Extract date parameters from request for passing to sub-endpoints."""
    return {
        'start_date': request.query_params.get('start_date'),
        'end_date': request.query_params.get('end_date'),
    }


def get_date_range_display(request):
    """Get date range display values for response."""
    return {
        'start_date': request.query_params.get('start_date') or 'all time',
        'end_date': request.query_params.get('end_date') or 'all time',
    }


def build_base_response(request, data):
    """Build standard response with date range info."""
    return {
        'date_range': get_date_range_display(request),
        **data
    }


def paginate_queryset(queryset, request, order_by='-created_at'):
    """Apply pagination and return (paginated_queryset, pagination_info)."""
    page = int(request.query_params.get('page', 1))
    page_size = int(request.query_params.get('page_size', 20))
    total_count = queryset.count() if hasattr(queryset, 'count') else len(queryset)
    
    start_idx = (page - 1) * page_size
    end_idx = start_idx + page_size
    
    if hasattr(queryset, 'order_by'):
        paginated = queryset.order_by(order_by)[start_idx:end_idx]
    else:
        paginated = queryset[start_idx:end_idx]
    
    return paginated, {
        'total_count': total_count,
        'page': page,
        'page_size': page_size,
        'total_pages': (total_count + page_size - 1) // page_size,
    }


def paginate_list(items, request):
    """Paginate a list and return (paginated_list, pagination_info)."""
    page = int(request.query_params.get('page', 1))
    page_size = int(request.query_params.get('page_size', 20))
    total_count = len(items)
    
    start_idx = (page - 1) * page_size
    end_idx = start_idx + page_size
    
    return items[start_idx:end_idx], {
        'total_count': total_count,
        'page': page,
        'page_size': page_size,
        'total_pages': (total_count + page_size - 1) // page_size,
    }


def calculate_sla_status(task, now=None):
    """Calculate SLA status for a task."""
    now = now or timezone.now()
    if not task.target_resolution:
        return 'no_sla'
    
    if task.status == 'completed':
        if task.resolution_time and task.resolution_time <= task.target_resolution:
            return 'met'
        return 'breached'
    
    return 'on_track' if task.target_resolution > now else 'at_risk'


def calculate_task_item_sla_status(item, current_status, now=None):
    """Calculate SLA status for a task item."""
    now = now or timezone.now()
    if not item.target_resolution:
        return 'no_sla'
    
    if current_status in ['resolved', 'escalated', 'reassigned']:
        return 'met'
    
    return 'on_track' if item.target_resolution > now else 'at_risk'


def get_latest_status_subquery():
    """Get subquery for latest task item status."""
    return TaskItemHistory.objects.filter(
        task_item_id=OuterRef('task_item_id')
    ).order_by('-created_at').values('status')[:1]


def get_task_item_current_status(item):
    """Get current status from task item's history."""
    latest_history = item.taskitemhistory_set.order_by('-created_at').first()
    return latest_history.status if latest_history else 'new'


def safe_percentage(value, total):
    """Calculate percentage safely, returning 0 if total is 0."""
    return (value / total * 100) if total > 0 else 0


def extract_ticket_data(task):
    """Extract common ticket data from a task."""
    return {
        'task_id': task.task_id,
        'ticket_number': task.ticket_id.ticket_number if task.ticket_id else '',
        'subject': task.ticket_id.ticket_data.get('subject', '') if task.ticket_id else '',
        'status': task.status,
        'priority': task.ticket_id.priority if task.ticket_id else None,
        'workflow_name': task.workflow_id.name if task.workflow_id else None,
        'created_at': task.created_at,
    }


def extract_task_item_data(item, include_status=True):
    """Extract common task item data."""
    data = {
        'task_item_id': item.task_item_id,
        'ticket_number': item.task.ticket_id.ticket_number if item.task and item.task.ticket_id else '',
        'subject': item.task.ticket_id.ticket_data.get('subject', '') if item.task and item.task.ticket_id else '',
        'user_name': item.role_user.user_full_name if item.role_user else None,
        'origin': item.origin,
        'assigned_on': item.assigned_on,
        'step_name': item.assigned_on_step.name if item.assigned_on_step else None,
    }
    if include_status:
        data['status'] = get_task_item_current_status(item)
    return data
