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


def get_ams_ticket_data_normalized(task):
    """
    Build ticket data for AMS external service response.
    Normalized to match /tickets/asset/resolved/ format.
    """
    ticket = task.ticket_id
    if not ticket:
        return None
    
    ticket_data = ticket.ticket_data or {}
    
    # Get dynamic_data early for fallback values
    dynamic_data = ticket_data.get('dynamic_data', {}) or {}
    
    # Build location_details - check multiple sources including dynamic_data.location_details
    dynamic_location = dynamic_data.get('location_details', {}) or {}
    location_id = (
        ticket_data.get('location_id') or 
        ticket_data.get('location') or
        dynamic_location.get('id')
    )
    location_name = (
        ticket_data.get('location_name') or 
        dynamic_location.get('name')
    )
    location_details = {
        'id': location_id,
        'name': location_name
    } if location_id or location_name else None
    
    # Build requestor_details
    employee_obj = ticket_data.get('employee', {}) or {}
    employee_id = (
        ticket_data.get('employee_id') or 
        ticket_data.get('employee_cookie_id') or
        employee_obj.get('id')
    )
    
    firstname = employee_obj.get('first_name', '')
    lastname = employee_obj.get('last_name', '')
    
    if not firstname and not lastname:
        approved_by = ticket_data.get('approved_by', '') or ''
        if approved_by:
            name_parts = approved_by.split(' ', 1)
            firstname = name_parts[0] if name_parts else ''
            lastname = name_parts[1] if len(name_parts) > 1 else ''
    
    employee_name = f"{firstname} {lastname}".strip()
    employee_email = employee_obj.get('email') or ticket_data.get('employee_email') or ''
    employee_company_id = employee_obj.get('company_id') or ticket_data.get('employee_company_id') or ''
    employee_department = employee_obj.get('department') or ticket_data.get('department') or ''
    
    requestor_details = {
        'id': employee_id,
        'name': employee_name,
        'firstname': firstname,
        'lastname': lastname,
        'email': employee_email,
        'company_id': employee_company_id,
        'department': employee_department
    } if employee_id else None
    
    # Check is_resolved status
    is_resolved = task.ams_executed if hasattr(task, 'ams_executed') else False
    
    # Get asset - check multiple sources including dynamic_data
    asset = (
        ticket_data.get('asset_id') or 
        ticket_data.get('asset') or 
        dynamic_data.get('assetId')
    )
    
    # Get checkout_date - check multiple sources including dynamic_data
    checkout_date = (
        ticket_data.get('checkout_date') or 
        dynamic_data.get('checkOutDate')
    )
    
    # Get return_date - check multiple sources including dynamic_data
    return_date = (
        ticket_data.get('return_date') or 
        ticket_data.get('expected_return_date') or
        dynamic_data.get('expectedReturnDate')
    )
    
    # Get checkin_date - check multiple sources including dynamic_data
    checkin_date = ticket_data.get('checkin_date') or dynamic_data.get('checkinDate')
    
    # Get subject for logging/response
    subject = ticket_data.get('subject') or ''
    
    # Fallback: if checkin_date is null, set it to SLA deadline + 1 day
    if not checkin_date and task.target_resolution:
        from datetime import timedelta
        # Calculate checkin_date as SLA deadline + 1 day
        checkin_deadline = task.target_resolution + timedelta(days=1)
        checkin_date = checkin_deadline.isoformat()
    
    # Get asset_checkout - check ticket_data first, then dynamic_data.assetCheckout
    asset_checkout = (
        ticket_data.get('asset_checkout') or 
        dynamic_data.get('assetCheckout')
    )
    
    # Get asset_checkin - check ticket_data first, then dynamic_data.assetCheckin
    asset_checkin = (
        ticket_data.get('asset_checkin') or 
        dynamic_data.get('assetCheckin')
    )
    
    return {
        'id': ticket.id,
        'location_details': location_details,
        'requestor_details': requestor_details,
        'ticket_number': ticket.ticket_number,
        'employee': employee_id,
        'asset': asset,
        'subject': subject,
        'location': location_id,
        'is_resolved': is_resolved,
        'created_at': ticket.created_at.isoformat() if ticket.created_at else None,
        'updated_at': ticket.updated_at.isoformat() if ticket.updated_at else None,
        'checkout_date': checkout_date,
        'return_date': return_date,
        'asset_checkout': asset_checkout,
        'checkin_date': checkin_date,
        'asset_checkin': asset_checkin,
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
    
    Response format matches /tickets/asset/resolved/ for consistency:
    Returns flat array of ticket objects.
    """
    try:
        # Get all tasks pending AMS resolution, ordered by most recent first
        pending_tasks = Task.objects.filter(
            workflow_id__end_logic='ams',
            status='pending_external'
        ).select_related('ticket_id', 'workflow_id').order_by('-ticket_id__created_at')
        
        # Build normalized response data (flat array matching /tickets/asset/resolved/)
        tickets_data = []
        for task in pending_tasks:
            ticket_data = get_ams_ticket_data_normalized(task)
            if ticket_data:
                tickets_data.append(ticket_data)
        
        # Return flat array (matching /tickets/asset/resolved/ format)
        return Response(tickets_data, status=status.HTTP_200_OK)
        
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
    The ticket is identified by either ticket_number or ticket_id (flexible).
    
    Request Body (minimal):
    {
        "ticket_number": "TX20260111123456"
    }
    
    OR (with ticket_id):
    {
        "ticket_id": "HD-2026-001"
    }
    
    OR (with full resolution details from BMS/external system):
    {
        "ticket_id": "HD-2026-001",        // OR "ticket_number"
        "status": "APPROVED",              // or "REJECTED" - optional
        "comment": "Approved for Q1.",     // Finance Manager's notes - optional
        "reviewed_by": "John Doe",         // Name of the approver - optional
        "reviewed_at": "2026-01-20T10:00:00Z", // ISO 8601 Timestamp - optional
        "order_number": "HD-2026-001"      // Reference for future use - optional
    }
    
    No authentication required - public endpoint for demonstration.
    """
    # Support both ticket_number and ticket_id (flexible)
    ticket_number = request.data.get('ticket_number')
    ticket_id = request.data.get('ticket_id')
    
    # Optional resolution details from external system
    external_status = request.data.get('status')  # APPROVED, REJECTED, etc.
    external_comment = request.data.get('comment')
    reviewed_by = request.data.get('reviewed_by')
    reviewed_at = request.data.get('reviewed_at')
    order_number = request.data.get('order_number')
    
    # Require at least one identifier
    if not ticket_number and not ticket_id:
        return Response({
            'status': 'error',
            'message': 'Either ticket_number or ticket_id is required'
        }, status=status.HTTP_400_BAD_REQUEST)
    
    try:
        task = None
        search_identifier = ticket_number or ticket_id
        
        # Try to find task by ticket_number first
        if ticket_number:
            task = Task.objects.filter(
                ticket_id__ticket_number=ticket_number
            ).select_related('ticket_id', 'workflow_id').first()
        
        # If not found and ticket_id provided, try to find by ticket_id in ticket_data
        if not task and ticket_id:
            # Search in ticket_data for matching ticket_id
            tasks = Task.objects.filter(
                status='pending_external'
            ).select_related('ticket_id', 'workflow_id')
            
            for t in tasks:
                if t.ticket_id and t.ticket_id.ticket_data:
                    # Check various possible fields where ticket_id might be stored
                    stored_ticket_id = (
                        t.ticket_id.ticket_data.get('ticket_id') or
                        t.ticket_id.ticket_data.get('external_ticket_id') or
                        t.ticket_id.ticket_data.get('original_ticket_id') or
                        t.ticket_id.ticket_data.get('source_ticket_id')
                    )
                    if stored_ticket_id == ticket_id:
                        task = t
                        search_identifier = ticket_id
                        break
            
            # Also try matching by ticket_number if ticket_id looks like one
            if not task:
                task = Task.objects.filter(
                    ticket_id__ticket_number=ticket_id
                ).select_related('ticket_id', 'workflow_id').first()
                if task:
                    search_identifier = ticket_id
        
        if not task:
            return Response({
                'status': 'error',
                'message': f'No task found for identifier: {search_identifier}',
                'searched_ticket_number': ticket_number,
                'searched_ticket_id': ticket_id
            }, status=status.HTTP_404_NOT_FOUND)
        
        # Get the actual ticket_number for logging and response
        actual_ticket_number = task.ticket_id.ticket_number if task.ticket_id else search_identifier
        
        # Check if task is in pending_external status
        if task.status != 'pending_external':
            return Response({
                'status': 'error',
                'message': f'Task is not pending external resolution. Current status: {task.status}',
                'task_id': task.task_id,
                'ticket_number': actual_ticket_number,
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
        
        # Build resolution details to store
        resolution_details = {}
        if external_status:
            resolution_details['external_status'] = external_status
        if external_comment:
            resolution_details['external_comment'] = external_comment
        if reviewed_by:
            resolution_details['reviewed_by'] = reviewed_by
        if reviewed_at:
            resolution_details['reviewed_at'] = reviewed_at
        if order_number:
            resolution_details['order_number'] = order_number
        
        # Update local WorkflowTicket status based on external response
        # APPROVED -> Resolved, REJECTED -> Rejected, anything else -> Resolved
        final_status = 'Resolved'
        if external_status and external_status.upper() == 'REJECTED':
            final_status = 'Rejected'
        
        try:
            if hasattr(task.ticket_id, 'ticket_data'):
                task.ticket_id.ticket_data['status'] = final_status
                # Store resolution details in ticket_data for reference
                if resolution_details:
                    task.ticket_id.ticket_data['resolution_details'] = resolution_details
                task.ticket_id.save()
                logger.info(f"Updated local ticket {actual_ticket_number} status to '{final_status}'")
                if resolution_details:
                    logger.info(f"Stored resolution details: {resolution_details}")
        except Exception as e:
            logger.error(f"Failed to update local ticket status: {str(e)}")
        
        # Sync ticket status back to HDTS
        try:
            from celery import current_app
            current_app.send_task(
                'send_ticket_status',
                args=[actual_ticket_number, final_status],
                queue='ticket_status-default'
            )
            logger.info(f"Sent status update to HDTS for ticket {actual_ticket_number}: {final_status}")
        except Exception as e:
            logger.error(f"Failed to sync ticket status to HDTS: {str(e)}")
        
        response_data = {
            'status': 'success',
            'message': f'Ticket resolved successfully by {end_logic.upper()}',
            'task_id': task.task_id,
            'ticket_number': actual_ticket_number,
            'resolved_by': end_logic,
            'resolution_time': task.resolution_time.isoformat() if task.resolution_time else None,
            'is_resolved': True,
            'final_status': final_status,
        }
        
        # Include resolution details in response if provided
        if resolution_details:
            response_data['resolution_details'] = resolution_details
        
        return Response(response_data, status=status.HTTP_200_OK)
        
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
