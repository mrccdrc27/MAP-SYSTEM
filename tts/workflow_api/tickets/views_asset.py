"""
Asset Check-In/Check-Out Views for TTS Workflow API

This module provides endpoints to filter resolved tickets for asset checkin and checkout workflows.
These endpoints are consumed by AMS (Asset Management System) to display tickets ready for asset processing.

All endpoints are PUBLIC - no authentication required.
"""

from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from rest_framework.permissions import AllowAny
from django.db.models import Q
from django.views.decorators.csrf import csrf_exempt
from django.utils.decorators import method_decorator
from .models import WorkflowTicket
from task.models import Task
import logging

logger = logging.getLogger(__name__)

# Asset category constants (matching seed_workflows2.py)
ASSET_CHECKIN_CATEGORY = 'Asset Check In'
ASSET_CHECKOUT_CATEGORY = 'Asset Check Out'


@method_decorator(csrf_exempt, name='dispatch')
class ResolvedAssetTicketsView(APIView):
    """
    Get all resolved asset tickets (both check-in and check-out).
    
    Query Parameters:
        - type: 'checkin' or 'checkout' (optional, filters by type)
        - status: Filter by ticket status (default: 'Resolved')
        - limit: Maximum number of results (default: 100)
    
    Returns tickets with flattened structure for AMS consumption.
    Response format:
    [
        {
            "id": 80,
            "location_details": { "id": 7, "name": "San Juan" },
            "requestor_details": { "id": 17, "name": "Full Name", "firstname": "First", "lastname": "Last" },
            "ticket_number": "TKT080",
            "employee": 17,
            "asset": 80,
            "subject": "...",
            "location": 7,
            "is_resolved": false,
            "created_at": "2026-01-10T...",
            "updated_at": "2026-01-10T...",
            "checkout_date": null,
            "return_date": null,
            "asset_checkout": 40,
            "checkin_date": "2025-10-26",
            "asset_checkin": null
        }
    ]
    """
    authentication_classes = []  # No authentication required
    permission_classes = [AllowAny]  # Public endpoint
    
    def get(self, request):
        ticket_type = request.query_params.get('type', None)
        ticket_status = request.query_params.get('status', 'Resolved')
        limit = int(request.query_params.get('limit', 100))
        
        # Build category filter
        if ticket_type == 'checkin':
            categories = [ASSET_CHECKIN_CATEGORY]
        elif ticket_type == 'checkout':
            categories = [ASSET_CHECKOUT_CATEGORY]
        else:
            categories = [ASSET_CHECKIN_CATEGORY, ASSET_CHECKOUT_CATEGORY]
        
        # Query workflow tickets
        queryset = WorkflowTicket.objects.filter(
            ticket_data__category__in=categories,
            ticket_data__status=ticket_status
        ).order_by('-created_at')[:limit]
        
        # Build flattened response data
        tickets = []
        for ticket in queryset:
            ticket_data = ticket.ticket_data or {}
            
            # Build location_details
            # From HDTS: location is stored in ticket.location or dynamic_data.location_id
            location_id = ticket_data.get('location_id') or ticket_data.get('location')
            location_name = ticket_data.get('location_name') or ticket_data.get('location')
            location_details = {
                'id': location_id,
                'name': location_name
            } if location_id or location_name else None
            
            # Build requestor_details from HDTS Ticket
            # HDTS sends employee_cookie_id for external auth, or employee object for internal auth
            employee_obj = ticket_data.get('employee', {}) or {}
            
            # Get employee ID - check multiple possible fields
            employee_id = (
                ticket_data.get('employee_id') or 
                ticket_data.get('employee_cookie_id') or
                employee_obj.get('id')
            )
            
            # Get name from various sources:
            # 1. employee object (if HDTS sent it)
            # 2. approved_by field (contains approver name like "FirstName LastName")
            # 3. Fallback to empty
            firstname = employee_obj.get('first_name', '')
            lastname = employee_obj.get('last_name', '')
            
            # If no name from employee object, try approved_by (it has the user's name)
            if not firstname and not lastname:
                approved_by = ticket_data.get('approved_by', '') or ''
                if approved_by:
                    name_parts = approved_by.split(' ', 1)
                    firstname = name_parts[0] if name_parts else ''
                    lastname = name_parts[1] if len(name_parts) > 1 else ''
            
            employee_name = f"{firstname} {lastname}".strip()
            
            # Get additional employee details
            employee_email = (
                employee_obj.get('email') or 
                ticket_data.get('employee_email') or 
                ''
            )
            employee_company_id = (
                employee_obj.get('company_id') or 
                ticket_data.get('employee_company_id') or 
                ''
            )
            employee_department = (
                employee_obj.get('department') or 
                ticket_data.get('department') or 
                ''
            )
            
            requestor_details = {
                'id': employee_id,
                'name': employee_name,
                'firstname': firstname,
                'lastname': lastname,
                'email': employee_email,
                'company_id': employee_company_id,
                'department': employee_department
            } if employee_id else None
            
            # Get related task to check is_resolved status (ams_executed)
            try:
                task = Task.objects.filter(ticket_id=ticket).first()
                is_resolved = task.ams_executed if task and hasattr(task, 'ams_executed') else False
            except Exception:
                is_resolved = False
            
            tickets.append({
                'id': ticket.id,
                'location_details': location_details,
                'requestor_details': requestor_details,
                'ticket_number': ticket.ticket_number,
                'employee': employee_id,
                # Asset ID from dynamic_data (HDTS flattens this when pushing)
                'asset': ticket_data.get('asset_id') or ticket_data.get('asset'),
                'subject': ticket_data.get('subject'),
                'location': location_id,
                'is_resolved': is_resolved,
                'created_at': ticket.created_at.isoformat() if ticket.created_at else None,
                'updated_at': ticket.updated_at.isoformat() if ticket.updated_at else None,
                # Checkout fields (from HDTS dynamic_data, flattened in signal)
                'checkout_date': ticket_data.get('checkout_date'),
                'return_date': ticket_data.get('return_date') or ticket_data.get('expected_return_date'),
                'asset_checkout': ticket_data.get('asset_checkout'),  # Reference to checkout record for checkin
                # Checkin fields
                'checkin_date': ticket_data.get('checkin_date'),
                'asset_checkin': ticket_data.get('asset_checkin'),
            })
        
        # Return flat array (not wrapped in object)
        return Response(tickets)


@method_decorator(csrf_exempt, name='dispatch')
class ResolvedAssetCheckoutTicketsView(APIView):
    """
    Get resolved asset checkout tickets only.
    
    Query Parameters:
        - status: Filter by ticket status (default: 'Resolved')
        - limit: Maximum number of results (default: 100)
        - approved_only: If 'true', only return approved tickets
    
    Table Columns (for AMS):
        - Ticket ID
        - Category
        - Sub-Category
        - Asset ID Number
        - Location
        - Request Date
        - Checkin/Checkout (type indicator)
        - Action (handled by frontend)
    """
    authentication_classes = []  # No authentication required
    permission_classes = [AllowAny]  # Public endpoint
    
    def get(self, request):
        ticket_status = request.query_params.get('status', 'Resolved')
        limit = int(request.query_params.get('limit', 100))
        approved_only = request.query_params.get('approved_only', 'false').lower() == 'true'
        
        queryset = WorkflowTicket.objects.filter(
            ticket_data__category=ASSET_CHECKOUT_CATEGORY,
            ticket_data__status=ticket_status
        ).order_by('-created_at')[:limit]
        
        tickets = []
        for ticket in queryset:
            ticket_data = ticket.ticket_data or {}
            
            tickets.append({
                'id': ticket.id,
                'ticket_number': ticket.ticket_number,
                'ticket_id': ticket_data.get('id') or ticket_data.get('ticket_id'),
                # Table columns
                'category': ticket_data.get('category'),
                'sub_category': ticket_data.get('sub_category'),
                'asset_id_number': ticket_data.get('asset_id_number'),
                'location': ticket_data.get('location'),
                'request_date': ticket_data.get('submit_date'),
                'type': 'checkout',
                # Full ticket details for View Page
                'subject': ticket_data.get('subject'),
                'asset_name': ticket_data.get('asset_name'),
                'serial_number': ticket_data.get('serial_number'),
                'employee_name': ticket_data.get('employee_name'),
                'employee_id': ticket_data.get('employee_id'),
                'checkout_date': ticket_data.get('checkout_date') or ticket_data.get('submit_date'),
                'expected_return_date': ticket_data.get('expected_return_date'),
                'condition': ticket_data.get('condition'),
                'notes': ticket_data.get('notes') or ticket_data.get('description'),
                'department': ticket_data.get('department'),
                'attachments': ticket_data.get('attachments', []),
                'status': ticket_data.get('status'),
                'priority': ticket_data.get('priority'),
                'dynamic_data': ticket_data.get('dynamic_data'),
            })
        
        return Response({
            'count': len(tickets),
            'category': ASSET_CHECKOUT_CATEGORY,
            'status_filter': ticket_status,
            'tickets': tickets
        })


@method_decorator(csrf_exempt, name='dispatch')
class ResolvedAssetCheckinTicketsView(APIView):
    """
    Get resolved asset check-in tickets only.
    
    Query Parameters:
        - status: Filter by ticket status (default: 'Resolved')
        - limit: Maximum number of results (default: 100)
        - approved_only: If 'true', only return approved tickets
    
    Table Columns (for AMS):
        - Ticket ID
        - Category
        - Sub-Category
        - Asset ID Number
        - Status
        - Checkin Date
        - Checkin/Checkout (type indicator)
        - Action (handled by frontend)
    """
    authentication_classes = []  # No authentication required
    permission_classes = [AllowAny]  # Public endpoint
    
    def get(self, request):
        ticket_status = request.query_params.get('status', 'Resolved')
        limit = int(request.query_params.get('limit', 100))
        approved_only = request.query_params.get('approved_only', 'false').lower() == 'true'
        
        queryset = WorkflowTicket.objects.filter(
            ticket_data__category=ASSET_CHECKIN_CATEGORY,
            ticket_data__status=ticket_status
        ).order_by('-created_at')[:limit]
        
        tickets = []
        for ticket in queryset:
            ticket_data = ticket.ticket_data or {}
            
            tickets.append({
                'id': ticket.id,
                'ticket_number': ticket.ticket_number,
                'ticket_id': ticket_data.get('id') or ticket_data.get('ticket_id'),
                # Table columns
                'category': ticket_data.get('category'),
                'sub_category': ticket_data.get('sub_category'),
                'asset_id_number': ticket_data.get('asset_id_number'),
                'status': ticket_data.get('status'),
                'checkin_date': ticket_data.get('checkin_date') or ticket_data.get('expected_return_date'),
                'type': 'checkin',
                # Full ticket details for View Page
                'subject': ticket_data.get('subject'),
                'checkout_ticket_reference': ticket_data.get('checkout_ticket_reference'),
                'asset_name': ticket_data.get('asset_name'),
                'serial_number': ticket_data.get('serial_number'),
                'location': ticket_data.get('location'),
                'department': ticket_data.get('department'),
                'condition': ticket_data.get('condition'),
                'notes': ticket_data.get('notes') or ticket_data.get('description'),
                'attachments': ticket_data.get('attachments', []),
                'priority': ticket_data.get('priority'),
                'employee_name': ticket_data.get('employee_name'),
                'employee_id': ticket_data.get('employee_id'),
                'dynamic_data': ticket_data.get('dynamic_data'),
            })
        
        return Response({
            'count': len(tickets),
            'category': ASSET_CHECKIN_CATEGORY,
            'status_filter': ticket_status,
            'tickets': tickets
        })


@method_decorator(csrf_exempt, name='dispatch')
class AssetTicketDetailView(APIView):
    """
    Get detailed information about a specific asset ticket.
    
    URL: /api/tickets/asset/<ticket_number>/
    
    Returns full ticket data including all asset-related fields.
    """
    authentication_classes = []  # No authentication required
    permission_classes = [AllowAny]  # Public endpoint
    
    def get(self, request, ticket_number):
        try:
            ticket = WorkflowTicket.objects.get(ticket_number=ticket_number)
        except WorkflowTicket.DoesNotExist:
            # Try to find by ticket_data.id
            try:
                ticket = WorkflowTicket.objects.get(ticket_data__id=ticket_number)
            except WorkflowTicket.DoesNotExist:
                return Response(
                    {'error': f'Ticket not found: {ticket_number}'},
                    status=status.HTTP_404_NOT_FOUND
                )
        
        ticket_data = ticket.ticket_data or {}
        category = ticket_data.get('category', '')
        
        # Determine ticket type
        if category == ASSET_CHECKIN_CATEGORY:
            ticket_type = 'checkin'
        elif category == ASSET_CHECKOUT_CATEGORY:
            ticket_type = 'checkout'
        else:
            ticket_type = 'other'
        
        response_data = {
            'id': ticket.id,
            'ticket_number': ticket.ticket_number,
            'ticket_id': ticket_data.get('id') or ticket_data.get('ticket_id'),
            'type': ticket_type,
            # Common fields
            'category': category,
            'sub_category': ticket_data.get('sub_category'),
            'subject': ticket_data.get('subject'),
            'description': ticket_data.get('description'),
            'status': ticket_data.get('status'),
            'priority': ticket_data.get('priority'),
            'department': ticket_data.get('department'),
            # Asset fields
            'asset_id_number': ticket_data.get('asset_id_number'),
            'asset_name': ticket_data.get('asset_name'),
            'serial_number': ticket_data.get('serial_number'),
            'location': ticket_data.get('location'),
            'condition': ticket_data.get('condition'),
            # Employee fields
            'employee_name': ticket_data.get('employee_name'),
            'employee_id': ticket_data.get('employee_id'),
            'employee_company_id': ticket_data.get('employee_company_id'),
            # Dates
            'submit_date': ticket_data.get('submit_date'),
            'request_date': ticket_data.get('submit_date'),
            'checkout_date': ticket_data.get('checkout_date'),
            'checkin_date': ticket_data.get('checkin_date'),
            'expected_return_date': ticket_data.get('expected_return_date'),
            # Check-in specific
            'checkout_ticket_reference': ticket_data.get('checkout_ticket_reference'),
            # Additional
            'notes': ticket_data.get('notes'),
            'attachments': ticket_data.get('attachments', []),
            'dynamic_data': ticket_data.get('dynamic_data'),
            # Metadata
            'fetched_at': ticket.fetched_at.isoformat() if ticket.fetched_at else None,
            'created_at': ticket.created_at.isoformat() if ticket.created_at else None,
            'updated_at': ticket.updated_at.isoformat() if ticket.updated_at else None,
            'is_task_allocated': ticket.is_task_allocated,
        }
        
        return Response(response_data)


@method_decorator(csrf_exempt, name='dispatch')
class AssetTicketsByEmployeeView(APIView):
    """
    Get asset tickets allocated to a specific employee.
    Used for check-in flow where employee can only check-in assets allocated to them.
    
    Query Parameters:
        - employee_id: Employee ID to filter by (required)
        - type: 'checkin' or 'checkout' (optional)
        - status: Ticket status filter (default: all)
    """
    authentication_classes = []  # No authentication required
    permission_classes = [AllowAny]  # Public endpoint
    
    def get(self, request):
        employee_id = request.query_params.get('employee_id')
        if not employee_id:
            return Response(
                {'error': 'employee_id parameter is required'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        ticket_type = request.query_params.get('type', None)
        ticket_status = request.query_params.get('status', None)
        
        # Build category filter
        if ticket_type == 'checkin':
            categories = [ASSET_CHECKIN_CATEGORY]
        elif ticket_type == 'checkout':
            categories = [ASSET_CHECKOUT_CATEGORY]
        else:
            categories = [ASSET_CHECKIN_CATEGORY, ASSET_CHECKOUT_CATEGORY]
        
        # Query by employee_id in ticket_data
        queryset = WorkflowTicket.objects.filter(
            ticket_data__category__in=categories
        ).filter(
            Q(ticket_data__employee_id=employee_id) |
            Q(ticket_data__employee_company_id=employee_id)
        ).order_by('-created_at')
        
        if ticket_status:
            queryset = queryset.filter(ticket_data__status=ticket_status)
        
        tickets = []
        for ticket in queryset:
            ticket_data = ticket.ticket_data or {}
            tickets.append({
                'id': ticket.id,
                'ticket_number': ticket.ticket_number,
                'ticket_id': ticket_data.get('id') or ticket_data.get('ticket_id'),
                'category': ticket_data.get('category'),
                'sub_category': ticket_data.get('sub_category'),
                'asset_id_number': ticket_data.get('asset_id_number'),
                'asset_name': ticket_data.get('asset_name'),
                'serial_number': ticket_data.get('serial_number'),
                'status': ticket_data.get('status'),
                'expected_return_date': ticket_data.get('expected_return_date'),
                'checkout_date': ticket_data.get('checkout_date'),
                'checkin_date': ticket_data.get('checkin_date'),
                'type': 'checkin' if ticket_data.get('category') == ASSET_CHECKIN_CATEGORY else 'checkout',
            })
        
        return Response({
            'count': len(tickets),
            'employee_id': employee_id,
            'tickets': tickets
        })


@method_decorator(csrf_exempt, name='dispatch')
class ApproveResolvedTicketView(APIView):
    """
    Approve a resolved ticket from AMS (Asset Management System).
    
    This endpoint is for system-to-system communication only.
    No authentication or CORS headers required.
    
    When AMS executes an action on a resolved ticket, it calls this endpoint
    to mark the task as 'ams_executed' in TTS database.
    
    URL: POST /api/tickets/asset/approve/
    
    Request Body:
        {
            "ticket_id": 80,           # WorkflowTicket ID
            "ticket_number": "TKT080", # OR ticket_number (either works)
            "ams_executed": true       # Set to true to mark as executed
        }
    
    Returns:
        {
            "success": true,
            "message": "Ticket approved successfully",
            "ticket_id": 80,
            "ticket_number": "TKT080",
            "ams_executed": true
        }
    """
    authentication_classes = []  # No authentication required - system-to-system
    permission_classes = [AllowAny]  # Public endpoint for internal service calls
    
    def post(self, request):
        ticket_id = request.data.get('ticket_id')
        ticket_number = request.data.get('ticket_number')
        ams_executed = request.data.get('ams_executed', True)
        
        if not ticket_id and not ticket_number:
            return Response(
                {'error': 'Either ticket_id or ticket_number is required'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Find the ticket
        try:
            if ticket_id:
                ticket = WorkflowTicket.objects.get(id=ticket_id)
            else:
                ticket = WorkflowTicket.objects.get(ticket_number=ticket_number)
        except WorkflowTicket.DoesNotExist:
            return Response(
                {'error': f'Ticket not found: {ticket_id or ticket_number}'},
                status=status.HTTP_404_NOT_FOUND
            )
        
        # Find and update the associated task
        try:
            task = Task.objects.filter(ticket_id=ticket).first()
            if task:
                task.ams_executed = ams_executed
                task.save(update_fields=['ams_executed', 'updated_at'])
                
                logger.info(f"Task {task.task_id} for ticket {ticket.ticket_number} marked as ams_executed={ams_executed}")
                
                return Response({
                    'success': True,
                    'message': 'Ticket approved successfully',
                    'ticket_id': ticket.id,
                    'ticket_number': ticket.ticket_number,
                    'task_id': task.task_id,
                    'ams_executed': ams_executed
                })
            else:
                return Response(
                    {'error': f'No task found for ticket: {ticket.ticket_number}'},
                    status=status.HTTP_404_NOT_FOUND
                )
        except Exception as e:
            logger.error(f"Error approving ticket {ticket.ticket_number}: {str(e)}")
            return Response(
                {'error': f'Failed to approve ticket: {str(e)}'},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )


@method_decorator(csrf_exempt, name='dispatch')
class BulkApproveResolvedTicketsView(APIView):
    """
    Bulk approve multiple resolved tickets from AMS.
    
    This endpoint is for system-to-system communication only.
    No authentication or CORS headers required.
    
    URL: POST /api/tickets/asset/approve/bulk/
    
    Request Body:
        {
            "ticket_ids": [80, 81, 82],        # List of WorkflowTicket IDs
            "ams_executed": true               # Set to true to mark as executed
        }
    OR
        {
            "ticket_numbers": ["TKT080", "TKT081"],  # List of ticket numbers
            "ams_executed": true
        }
    
    Returns:
        {
            "success": true,
            "message": "3 tickets approved successfully",
            "approved": [{"ticket_id": 80, "ticket_number": "TKT080", "task_id": 1}],
            "failed": []
        }
    """
    authentication_classes = []  # No authentication required - system-to-system
    permission_classes = [AllowAny]  # Public endpoint for internal service calls
    
    def post(self, request):
        ticket_ids = request.data.get('ticket_ids', [])
        ticket_numbers = request.data.get('ticket_numbers', [])
        ams_executed = request.data.get('ams_executed', True)
        
        if not ticket_ids and not ticket_numbers:
            return Response(
                {'error': 'Either ticket_ids or ticket_numbers is required'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        approved = []
        failed = []
        
        # Process by IDs
        for tid in ticket_ids:
            try:
                ticket = WorkflowTicket.objects.get(id=tid)
                task = Task.objects.filter(ticket_id=ticket).first()
                if task:
                    task.ams_executed = ams_executed
                    task.save(update_fields=['ams_executed', 'updated_at'])
                    approved.append({
                        'ticket_id': ticket.id,
                        'ticket_number': ticket.ticket_number,
                        'task_id': task.task_id
                    })
                else:
                    failed.append({'ticket_id': tid, 'error': 'No task found'})
            except WorkflowTicket.DoesNotExist:
                failed.append({'ticket_id': tid, 'error': 'Ticket not found'})
            except Exception as e:
                failed.append({'ticket_id': tid, 'error': str(e)})
        
        # Process by ticket numbers
        for tnum in ticket_numbers:
            try:
                ticket = WorkflowTicket.objects.get(ticket_number=tnum)
                task = Task.objects.filter(ticket_id=ticket).first()
                if task:
                    task.ams_executed = ams_executed
                    task.save(update_fields=['ams_executed', 'updated_at'])
                    approved.append({
                        'ticket_id': ticket.id,
                        'ticket_number': ticket.ticket_number,
                        'task_id': task.task_id
                    })
                else:
                    failed.append({'ticket_number': tnum, 'error': 'No task found'})
            except WorkflowTicket.DoesNotExist:
                failed.append({'ticket_number': tnum, 'error': 'Ticket not found'})
            except Exception as e:
                failed.append({'ticket_number': tnum, 'error': str(e)})
        
        return Response({
            'success': len(approved) > 0,
            'message': f'{len(approved)} tickets approved successfully',
            'approved': approved,
            'failed': failed
        })
