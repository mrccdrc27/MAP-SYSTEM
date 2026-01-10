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
    
    Returns tickets with their full ticket_data for AMS consumption.
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
        
        # Build response data
        tickets = []
        for ticket in queryset:
            ticket_data = ticket.ticket_data or {}
            tickets.append({
                'id': ticket.id,
                'ticket_number': ticket.ticket_number,
                'ticket_id': ticket_data.get('id') or ticket_data.get('ticket_id'),
                'category': ticket_data.get('category'),
                'sub_category': ticket_data.get('sub_category'),
                'subject': ticket_data.get('subject'),
                'description': ticket_data.get('description'),
                'status': ticket_data.get('status'),
                'priority': ticket_data.get('priority'),
                'department': ticket_data.get('department'),
                # Asset specific fields
                'asset_name': ticket_data.get('asset_name'),
                'asset_id_number': ticket_data.get('asset_id_number'),
                'serial_number': ticket_data.get('serial_number'),
                'location': ticket_data.get('location'),
                'condition': ticket_data.get('condition'),
                'expected_return_date': ticket_data.get('expected_return_date'),
                # Employee information
                'employee_name': ticket_data.get('employee_name'),
                'employee_id': ticket_data.get('employee_id'),
                'employee_company_id': ticket_data.get('employee_company_id'),
                # Dates
                'submit_date': ticket_data.get('submit_date'),
                'request_date': ticket_data.get('submit_date'),  # Alias for AMS
                'checkout_date': ticket_data.get('checkout_date'),
                'checkin_date': ticket_data.get('checkin_date'),
                # Additional data
                'notes': ticket_data.get('notes') or ticket_data.get('description'),
                'dynamic_data': ticket_data.get('dynamic_data'),
                'attachments': ticket_data.get('attachments', []),
                # Reference for checkin
                'checkout_ticket_reference': ticket_data.get('checkout_ticket_reference'),
                # Metadata
                'fetched_at': ticket.fetched_at.isoformat() if ticket.fetched_at else None,
                'created_at': ticket.created_at.isoformat() if ticket.created_at else None,
                'is_task_allocated': ticket.is_task_allocated,
            })
        
        return Response({
            'count': len(tickets),
            'type_filter': ticket_type,
            'status_filter': ticket_status,
            'tickets': tickets
        })


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
