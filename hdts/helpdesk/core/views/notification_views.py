"""
Notification views for employee-side notifications in HDTS.
Provides API endpoints for listing, marking as read, and clearing notifications.
"""
from rest_framework import status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from django.utils import timezone
from django.utils.timesince import timesince
from ..models import EmployeeNotification


def get_notification_icon_type(notification_type):
    """Map notification type to icon identifier for frontend."""
    icon_map = {
        'ticket_submitted': 'document-add',
        'ticket_approved': 'check-circle',
        'ticket_rejected': 'x-circle',
        'ticket_in_progress': 'clock',
        'ticket_on_hold': 'pause',
        'ticket_resolved': 'check',
        'ticket_closed': 'archive',
        'ticket_withdrawn': 'arrow-left',
        'new_reply': 'chat',
        'owner_reply': 'chat',
    }
    return icon_map.get(notification_type, 'bell')


def serialize_notification(notification):
    """Serialize a notification object for API response."""
    time_ago = timesince(notification.created_at, timezone.now())
    # Simplify "X minutes, Y seconds" to just "X minutes"
    time_ago = time_ago.split(',')[0] + ' ago'
    
    return {
        'id': notification.id,
        'type': notification.notification_type,
        'icon': get_notification_icon_type(notification.notification_type),
        'title': notification.title,
        'message': notification.message,
        'time': time_ago,
        'timestamp': notification.created_at.isoformat(),
        'is_read': notification.is_read,
        'ticket_id': notification.ticket_id,
        'ticket_number': notification.ticket.ticket_number if notification.ticket else None,
        'link_type': notification.link_type,
    }


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def list_notifications(request):
    """
    List all notifications for the authenticated employee.
    Query params:
        - unread_only: if 'true', only return unread notifications
        - limit: max number of notifications to return (default 50)
    """
    employee_id = request.user.id
    
    unread_only = request.query_params.get('unread_only', '').lower() == 'true'
    limit = int(request.query_params.get('limit', 50))
    
    notifications = EmployeeNotification.objects.filter(employee_id=employee_id)
    
    if unread_only:
        notifications = notifications.filter(is_read=False)
    
    notifications = notifications.order_by('-created_at')[:limit]
    
    return Response({
        'notifications': [serialize_notification(n) for n in notifications],
        'unread_count': EmployeeNotification.objects.filter(
            employee_id=employee_id,
            is_read=False
        ).count()
    })


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def get_unread_count(request):
    """Get the count of unread notifications for the authenticated employee."""
    employee_id = request.user.id
    
    count = EmployeeNotification.objects.filter(
        employee_id=employee_id,
        is_read=False
    ).count()
    
    return Response({'unread_count': count})


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def mark_as_read(request, notification_id):
    """Mark a specific notification as read."""
    employee_id = request.user.id
    
    try:
        notification = EmployeeNotification.objects.get(
            id=notification_id,
            employee_id=employee_id
        )
        notification.mark_as_read()
        return Response({'status': 'ok', 'message': 'Notification marked as read'})
    except EmployeeNotification.DoesNotExist:
        return Response(
            {'error': 'Notification not found'},
            status=status.HTTP_404_NOT_FOUND
        )


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def mark_all_as_read(request):
    """Mark all notifications as read for the authenticated employee."""
    employee_id = request.user.id
    
    updated_count = EmployeeNotification.objects.filter(
        employee_id=employee_id,
        is_read=False
    ).update(is_read=True, read_at=timezone.now())
    
    return Response({
        'status': 'ok',
        'message': f'{updated_count} notifications marked as read'
    })


@api_view(['DELETE'])
@permission_classes([IsAuthenticated])
def delete_notification(request, notification_id):
    """Delete a specific notification."""
    employee_id = request.user.id
    
    try:
        notification = EmployeeNotification.objects.get(
            id=notification_id,
            employee_id=employee_id
        )
        notification.delete()
        return Response({'status': 'ok', 'message': 'Notification deleted'})
    except EmployeeNotification.DoesNotExist:
        return Response(
            {'error': 'Notification not found'},
            status=status.HTTP_404_NOT_FOUND
        )


@api_view(['DELETE'])
@permission_classes([IsAuthenticated])
def clear_all_notifications(request):
    """Delete all notifications for the authenticated employee."""
    employee_id = request.user.id
    
    deleted_count, _ = EmployeeNotification.objects.filter(
        employee_id=employee_id
    ).delete()
    
    return Response({
        'status': 'ok',
        'message': f'{deleted_count} notifications cleared'
    })
