from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated, AllowAny
from django.db.models import Q, Count
from django.utils import timezone
from .models import WorkflowTicket
from .serializers import *
import logging

from rest_framework.views import APIView
from authentication import JWTCookieAuthentication

logger = logging.getLogger(__name__)

class WorkflowTicketViewSet(viewsets.ModelViewSet):
    queryset = WorkflowTicket.objects.all()
    
    def get_serializer_class(self):
        if self.action == 'create':
            return WorkflowTicketCreateSerializer
        return WorkflowTicketSerializer
    
    def get_queryset(self):
        """Enhanced queryset with filtering capabilities"""
        queryset = WorkflowTicket.objects.all()
        
        # Filter parameters
        status = self.request.query_params.get('status')
        priority = self.request.query_params.get('priority')
        employee = self.request.query_params.get('employee')
        department = self.request.query_params.get('department')
        category = self.request.query_params.get('category')
        search = self.request.query_params.get('search')
        
        if status:
            queryset = queryset.filter(ticket_data__status=status)
        if priority:
            queryset = queryset.filter(ticket_data__priority=priority)
        if employee:
            queryset = queryset.filter(ticket_data__employee__icontains=employee)
        if department:
            queryset = queryset.filter(ticket_data__department__icontains=department)
        if category:
            queryset = queryset.filter(ticket_data__category__icontains=category)
        if search:
            queryset = queryset.filter(
                Q(ticket_data__subject__icontains=search) |
                Q(ticket_data__description__icontains=search) |
                Q(ticket_data__ticket_id__icontains=search) |
                Q(ticket_number__icontains=search)
            )
        
        return queryset.order_by('-created_at')
    
    def create(self, request, *args, **kwargs):
        """Create a new workflow ticket from ticket service"""
        serializer = self.get_serializer(data=request.data)
        
        if serializer.is_valid():
            # Check for duplicates based on ticket_number
            ticket_number = request.data.get('ticket_number')
            if ticket_number:
                existing = WorkflowTicket.objects.filter(
                    ticket_number=ticket_number
                ).first()
                
                if existing:
                    logger.info(f"Workflow ticket {ticket_number} already exists")
                    response_serializer = WorkflowTicketSerializer(existing)
                    return Response(response_serializer.data, status=status.HTTP_200_OK)
            
            workflow_ticket = serializer.save()
            logger.info(f"Created workflow ticket {workflow_ticket.id} with number {workflow_ticket.ticket_number}")
            
            response_serializer = WorkflowTicketSerializer(workflow_ticket)
            return Response(response_serializer.data, status=status.HTTP_201_CREATED)
        else:
            logger.error(f"Failed to create workflow ticket: {serializer.errors}")
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
    
    @action(detail=False, methods=['get'])
    def health_check(self, request):
        """Health check endpoint for ticket service to verify availability"""
        return Response({
            'status': 'healthy',
            'timestamp': timezone.now(),
            'service': 'workflow_service',
            'total_tickets': WorkflowTicket.objects.count()
        })
    
    @action(detail=False, methods=['get'])
    def by_ticket_number(self, request):
        """Get workflow tickets by ticket number"""
        ticket_number = self.request.query_params.get('ticket_number')
        
        if not ticket_number:
            return Response(
                {'error': 'ticket_number parameter is required'}, 
                status=status.HTTP_400_BAD_REQUEST
            )
        
        tickets = self.queryset.filter(ticket_number=ticket_number)
        serializer = self.get_serializer(tickets, many=True)
        return Response(serializer.data)
    
    @action(detail=False, methods=['get'])
    def stats(self, request):
        """Get ticket statistics"""
        stats = {}
        
        # Count by status (from ticket_data)
        status_counts = WorkflowTicket.objects.values('ticket_data__status').annotate(count=Count('id'))
        for item in status_counts:
            status_val = item.get('ticket_data__status') or 'unknown'
            stats[f'status_{status_val.lower().replace(" ", "_")}'] = item['count']
        
        # Count by priority (from ticket_data)
        priority_counts = WorkflowTicket.objects.values('ticket_data__priority').annotate(count=Count('id'))
        for item in priority_counts:
            priority_val = item.get('ticket_data__priority') or 'unknown'
            stats[f'priority_{priority_val.lower()}'] = item['count']
        
        # Count by department (from ticket_data)
        dept_counts = WorkflowTicket.objects.values('ticket_data__department').annotate(count=Count('id'))[:10]  # Top 10
        stats['top_departments'] = {item['ticket_data__department']: item['count'] for item in dept_counts if item['ticket_data__department']}
        
        # Total count
        stats['total_tickets'] = WorkflowTicket.objects.count()
        
        # Recent tickets (last 24 hours)
        from datetime import datetime, timedelta
        yesterday = timezone.now() - timedelta(days=1)
        stats['recent_tickets'] = WorkflowTicket.objects.filter(created_at__gte=yesterday).count()
        
        return Response(stats)
    
    @action(detail=False, methods=['get'])
    def recent(self, request):
        """Get recent tickets"""
        limit = int(self.request.query_params.get('limit', 20))
        tickets = self.queryset.order_by('-created_at')[:limit]
        serializer = self.get_serializer(tickets, many=True)
        return Response(serializer.data)
    
    @action(detail=False, methods=['get'])
    def by_department(self, request):
        """Get tickets by department"""
        department = self.request.query_params.get('department')
        
        if not department:
            return Response(
                {'error': 'department parameter is required'}, 
                status=status.HTTP_400_BAD_REQUEST
            )
        
        tickets = self.queryset.filter(ticket_data__department__icontains=department)
        serializer = self.get_serializer(tickets, many=True)
        return Response(serializer.data)
    
    @action(detail=True, methods=['patch'])
    def update_status(self, request, pk=None):
        """Update ticket status"""
        ticket = self.get_object()
        new_status = request.data.get('status')
        
        if not new_status:
            return Response(
                {'error': 'status is required'}, 
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Update ticket_data status
        ticket.ticket_data['status'] = new_status
        ticket.save()
        
        logger.info(f"Updated ticket {ticket.id} status to {new_status}")
        serializer = self.get_serializer(ticket)
        return Response(serializer.data)


class ManualTaskAssignmentView(APIView):
    """Manual task assignment view - requires authentication via JWT cookie"""
    authentication_classes = [JWTCookieAuthentication]
    permission_classes = [IsAuthenticated]
    
    def post(self, request, ticket_id, workflow_id):
        try:
            ticket = WorkflowTicket.objects.get(id=ticket_id)
            workflow = Workflows.objects.get(workflow_id=workflow_id)
            logger.info(f"hello {ticket} {workflow}")
        except (WorkflowTicket.DoesNotExist, Workflows.DoesNotExist):
            return Response({"detail": "Ticket or workflow not found."}, status=404)

        success = manually_assign_task(ticket, workflow)
        if success:
            return Response({"detail": "Task manually assigned."}, status=200)
        else:
            return Response({"detail": "Task could not be assigned."}, status=400)


class TaskAssignmentView(APIView):
    """Task assignment view - requires authentication via JWT cookie"""
    authentication_classes = [JWTCookieAuthentication]
    permission_classes = [IsAuthenticated]
    
    def post(self, request):
        serializer = TaskAssignmentSerializer(data=request.data)
        if not serializer.is_valid():
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

        ticket_id = serializer.validated_data['ticket_id']
        workflow_id = serializer.validated_data['workflow_id']

        try:
            # Try ticket_id as ticket_number first, then search ticket_data
            try:
                ticket = WorkflowTicket.objects.get(ticket_number=ticket_id)
            except WorkflowTicket.DoesNotExist:
                ticket = WorkflowTicket.objects.get(ticket_data__ticket_id=ticket_id)
        except WorkflowTicket.DoesNotExist:
            return Response({"detail": f"Ticket not found: {ticket_id}"}, status=404)

        try:
            workflow = Workflows.objects.get(workflow_id=workflow_id)
        except Workflows.DoesNotExist:
            return Response({"detail": f"Workflow not found: {workflow_id}"}, status=404)

        success = manually_assign_task(ticket, workflow)

        if success:
            return Response({"detail": "Task manually assigned."}, status=200)
        else:
            return Response({"detail": "Task could not be assigned."}, status=400)

