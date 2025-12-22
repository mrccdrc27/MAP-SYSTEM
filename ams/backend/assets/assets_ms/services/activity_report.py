"""
Activity Report Service

Generates activity report data from the ActivityLog model.
Supports filtering by date range, activity type, action, and user.
"""

from typing import List, Dict, Optional
from datetime import datetime, date
from django.db.models import Q
from ..models import ActivityLog


def generate_activity_report(
    start_date: Optional[date] = None,
    end_date: Optional[date] = None,
    activity_type: Optional[str] = None,
    action: Optional[str] = None,
    user_id: Optional[int] = None,
    item_id: Optional[int] = None,
    search: Optional[str] = None,
    limit: Optional[int] = None,
) -> List[Dict]:
    """
    Generate activity report data from ActivityLog entries.
    
    Args:
        start_date: Filter activities from this date onwards
        end_date: Filter activities up to this date
        activity_type: Filter by activity type (Asset, Component, Audit, Repair)
        action: Filter by action (Create, Update, Delete, Checkout, Checkin, etc.)
        user_id: Filter by the user who performed the action
        item_id: Filter by the item ID affected
        search: Search term to filter by item name/identifier, user name, or notes
        limit: Maximum number of records to return
        
    Returns:
        List of activity log entries formatted for reporting
    """
    qs = ActivityLog.objects.filter(is_deleted=False)
    
    # Apply date filters
    if start_date:
        qs = qs.filter(datetime__date__gte=start_date)
    if end_date:
        qs = qs.filter(datetime__date__lte=end_date)
    
    # Apply type and action filters
    if activity_type:
        qs = qs.filter(activity_type=activity_type)
    if action:
        qs = qs.filter(action=action)
    
    # Apply user filter
    if user_id:
        qs = qs.filter(user_id=user_id)
    
    # Apply item filter
    if item_id:
        qs = qs.filter(item_id=item_id)
    
    # Apply search filter
    if search:
        search_term = search.strip()
        qs = qs.filter(
            Q(item_name__icontains=search_term) |
            Q(item_identifier__icontains=search_term) |
            Q(user_name__icontains=search_term) |
            Q(target_name__icontains=search_term) |
            Q(notes__icontains=search_term)
        )
    
    # Order by datetime descending (most recent first)
    qs = qs.order_by('-datetime')
    
    # Apply limit if specified
    if limit:
        qs = qs[:limit]
    
    # Format results
    results = []
    for log in qs:
        # Format datetime for display
        date_str = log.datetime.strftime('%Y-%m-%d %I:%M:%S %p') if log.datetime else ''
        
        # Format item display
        identifier = log.item_identifier or str(log.item_id)
        item_name = log.item_name or ''
        item_display = f"{identifier} - {item_name}" if item_name else identifier
        
        # Format user display
        if log.user_name:
            user_display = log.user_name
        elif log.user_id:
            user_display = f'User {log.user_id}'
        else:
            user_display = 'System'

        results.append({
            'id': log.id,
            'date': date_str,
            'datetime': log.datetime.isoformat() if log.datetime else '',
            'user': user_display,
            'user_id': log.user_id,
            'type': log.activity_type,
            'action': log.action,
            'item': item_display,
            'item_id': log.item_id,
            'item_identifier': log.item_identifier or '',
            'item_name': log.item_name or '',
            'to_from': log.target_name or '',
            'target_id': log.target_id,
            'target_name': log.target_name or '',
            'notes': log.notes or '',
        })
    
    return results


def get_activity_summary(
    start_date: Optional[date] = None,
    end_date: Optional[date] = None,
) -> Dict:
    """
    Get summary statistics for activity logs.
    
    Returns:
        Dictionary with counts by activity type and action
    """
    qs = ActivityLog.objects.filter(is_deleted=False)
    
    if start_date:
        qs = qs.filter(datetime__date__gte=start_date)
    if end_date:
        qs = qs.filter(datetime__date__lte=end_date)
    
    # Count by activity type
    type_counts = {}
    for choice in ActivityLog.ACTIVITY_TYPE_CHOICES:
        type_key = choice[0]
        type_counts[type_key] = qs.filter(activity_type=type_key).count()
    
    # Count by action
    action_counts = {}
    for choice in ActivityLog.ACTION_CHOICES:
        action_key = choice[0]
        action_counts[action_key] = qs.filter(action=action_key).count()
    
    return {
        'total': qs.count(),
        'by_type': type_counts,
        'by_action': action_counts,
    }

