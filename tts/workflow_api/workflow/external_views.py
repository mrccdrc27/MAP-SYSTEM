"""
External Service Views for End Logic (AMS/BMS)

These views provide public endpoints for external systems (AMS, BMS) to:
1. Fetch tickets awaiting their resolution
2. Mark tickets as resolved

No authentication required - these are demonstration endpoints.
"""

from rest_framework import status
from rest_framework.decorators import api_view, permission_classes, authentication_classes
from rest_framework.permissions import AllowAny
from rest_framework.response import Response
from django.utils import timezone
import logging

from task.models import Task
from tickets.models import WorkflowTicket
from workflow.models import Workflows

logger = logging.getLogger(__name__)


def get_ticket_data_for_external(task):
    """
    Build ticket data for external service response.
    Includes all relevant ticket info plus is_resolved status.
    """
    ticket = task.ticket_id
    workflow = task.workflow_id
    
    return {
        'task_id': task.task_id,
        'ticket_number': ticket.ticket_number if ticket else None,
        'ticket_data': ticket.ticket_data if ticket else {},
        'subject': ticket.subject if ticket else None,
        'description': ticket.description if ticket else None,
        'priority': ticket.priority if ticket else None,
        'department': ticket.department if ticket else None,
        'status': ticket.ticket_data.get('status') if ticket and ticket.ticket_data else None,
        'workflow': {
            'workflow_id': workflow.workflow_id if workflow else None,
            'name': workflow.name if workflow else None,
            'end_logic': workflow.end_logic if workflow else None,
        },
        'is_resolved': task.status == 'completed',
        'task_status': task.status,
        'created_at': task.created_at.isoformat() if task.created_at else None,
        'updated_at': task.updated_at.isoformat() if task.updated_at else None,
    }


@api_view(['GET'])
@authentication_classes([])  # No authentication
@permission_classes([AllowAny])  # Open to everyone
def ams_pending_tickets(request):
    """
    GET /external/ams/tickets/
    
    Returns all tickets that are pending resolution by AMS (Asset Management System).
    These are tickets where:
    - The workflow has end_logic='ams'
    - The task status is 'pending_external'
    
    No authentication required - public endpoint for demonstration.
    """
    try:
        # Get all tasks pending AMS resolution
        pending_tasks = Task.objects.filter(
            workflow_id__end_logic='ams',
            status='pending_external'
        ).select_related('ticket_id', 'workflow_id')
        
        tickets_data = [get_ticket_data_for_external(task) for task in pending_tasks]
        
        return Response({
            'status': 'success',
            'service': 'ams',
            'total_count': len(tickets_data),
            'tickets': tickets_data,
        }, status=status.HTTP_200_OK)
        
    except Exception as e:
        logger.error(f"Error fetching AMS pending tickets: {str(e)}")
        return Response({
            'status': 'error',
            'message': str(e)
        }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


@api_view(['GET'])
@authentication_classes([])  # No authentication
@permission_classes([AllowAny])  # Open to everyone
def bms_pending_tickets(request):
    """
    GET /external/bms/tickets/
    
    Returns all tickets that are pending resolution by BMS (Budget Management System).
    These are tickets where:
    - The workflow has end_logic='bms'
    - The task status is 'pending_external'
    
    No authentication required - public endpoint for demonstration.
    """
    try:
        # Get all tasks pending BMS resolution
        pending_tasks = Task.objects.filter(
            workflow_id__end_logic='bms',
            status='pending_external'
        ).select_related('ticket_id', 'workflow_id')
        
        tickets_data = [get_ticket_data_for_external(task) for task in pending_tasks]
        
        return Response({
            'status': 'success',
            'service': 'bms',
            'total_count': len(tickets_data),
            'tickets': tickets_data,
        }, status=status.HTTP_200_OK)
        
    except Exception as e:
        logger.error(f"Error fetching BMS pending tickets: {str(e)}")
        return Response({
            'status': 'error',
            'message': str(e)
        }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


@api_view(['POST'])
@authentication_classes([])  # No authentication
@permission_classes([AllowAny])  # Open to everyone
def external_resolve_ticket(request):
    """
    POST /external/resolve/
    
    Marks a ticket as resolved by an external service (AMS or BMS).
    The ticket is identified by ticket_number (unique), and the end_logic
    determines which service should have resolved it.
    
    Request Body:
    {
        "ticket_number": "TX20260111123456"
    }
    
    No authentication required - public endpoint for demonstration.
    """
    ticket_number = request.data.get('ticket_number')
    
    if not ticket_number:
        return Response({
            'status': 'error',
            'message': 'ticket_number is required'
        }, status=status.HTTP_400_BAD_REQUEST)
    
    try:
        # Find the task by ticket_number
        task = Task.objects.filter(
            ticket_id__ticket_number=ticket_number
        ).select_related('ticket_id', 'workflow_id').first()
        
        if not task:
            return Response({
                'status': 'error',
                'message': f'No task found for ticket_number: {ticket_number}'
            }, status=status.HTTP_404_NOT_FOUND)
        
        # Check if task is in pending_external status
        if task.status != 'pending_external':
            return Response({
                'status': 'error',
                'message': f'Task is not pending external resolution. Current status: {task.status}',
                'task_id': task.task_id,
                'ticket_number': ticket_number,
                'is_already_resolved': task.status == 'completed'
            }, status=status.HTTP_400_BAD_REQUEST)
        
        # Get the end_logic type for response
        end_logic = task.workflow_id.end_logic if task.workflow_id else 'unknown'
        
        if end_logic not in ['ams', 'bms']:
            return Response({
                'status': 'error',
                'message': f'Task workflow does not have valid end_logic. Found: {end_logic}',
                'task_id': task.task_id
            }, status=status.HTTP_400_BAD_REQUEST)
        
        # Mark task as completed
        task.status = 'completed'
        task.resolution_time = timezone.now()
        task.save()
        
        logger.info(f"Task {task.task_id} resolved by external service ({end_logic})")
        
        # Update local WorkflowTicket status to 'Resolved'
        try:
            if hasattr(task.ticket_id, 'ticket_data'):
                task.ticket_id.ticket_data['status'] = 'Resolved'
                task.ticket_id.save()
                logger.info(f"Updated local ticket {ticket_number} status to 'Resolved'")
        except Exception as e:
            logger.error(f"Failed to update local ticket status: {str(e)}")
        
        # Sync ticket status back to HDTS
        try:
            from celery import current_app
            current_app.send_task(
                'send_ticket_status',
                args=[ticket_number, 'Resolved'],
                queue='ticket_status-default'
            )
            logger.info(f"Sent status update to HDTS for ticket {ticket_number}: Resolved")
        except Exception as e:
            logger.error(f"Failed to sync ticket status to HDTS: {str(e)}")
        
        return Response({
            'status': 'success',
            'message': f'Ticket resolved successfully by {end_logic.upper()}',
            'task_id': task.task_id,
            'ticket_number': ticket_number,
            'resolved_by': end_logic,
            'resolution_time': task.resolution_time.isoformat() if task.resolution_time else None,
            'is_resolved': True,
        }, status=status.HTTP_200_OK)
        
    except Exception as e:
        logger.error(f"Error resolving ticket {ticket_number}: {str(e)}")
        return Response({
            'status': 'error',
            'message': str(e)
        }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


@api_view(['GET'])
@authentication_classes([])  # No authentication
@permission_classes([AllowAny])  # Open to everyone
def external_ticket_status(request, ticket_number):
    """
    GET /external/status/<ticket_number>/
    
    Get the current status of a ticket including whether it's resolved.
    
    No authentication required - public endpoint for demonstration.
    """
    try:
        # Find the task by ticket_number
        task = Task.objects.filter(
            ticket_id__ticket_number=ticket_number
        ).select_related('ticket_id', 'workflow_id').first()
        
        if not task:
            return Response({
                'status': 'error',
                'message': f'No task found for ticket_number: {ticket_number}'
            }, status=status.HTTP_404_NOT_FOUND)
        
        return Response({
            'status': 'success',
            'ticket': get_ticket_data_for_external(task),
        }, status=status.HTTP_200_OK)
        
    except Exception as e:
        logger.error(f"Error getting ticket status for {ticket_number}: {str(e)}")
        return Response({
            'status': 'error',
            'message': str(e)
        }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
