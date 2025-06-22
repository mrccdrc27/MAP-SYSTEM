from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from django.db.models import Q, Count
from django.utils import timezone
from .models import WorkflowTicket
from .serializers import WorkflowTicketSerializer, WorkflowTicketCreateSerializer
import logging

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
            queryset = queryset.filter(status=status)
        if priority:
            queryset = queryset.filter(priority=priority)
        if employee:
            queryset = queryset.filter(employee__icontains=employee)
        if department:
            queryset = queryset.filter(department__icontains=department)
        if category:
            queryset = queryset.filter(category__icontains=category)
        if search:
            queryset = queryset.filter(
                Q(subject__icontains=search) |
                Q(description__icontains=search) |
                Q(ticket_id__icontains=search) |
                Q(employee__icontains=search)
            )
        
        return queryset.order_by('-created_at')
    
    def create(self, request, *args, **kwargs):
        """Create a new workflow ticket from ticket service"""
        serializer = self.get_serializer(data=request.data)
        
        if serializer.is_valid():
            # Check for duplicates based on original_ticket_id
            original_ticket_id = request.data.get('original_ticket_id')
            if original_ticket_id:
                existing = WorkflowTicket.objects.filter(
                    original_ticket_id=original_ticket_id
                ).first()
                
                if existing:
                    logger.info(f"Workflow ticket for original ticket {original_ticket_id} already exists")
                    response_serializer = WorkflowTicketSerializer(existing)
                    return Response(response_serializer.data, status=status.HTTP_200_OK)
            
            workflow_ticket = serializer.save()
            logger.info(f"Created workflow ticket {workflow_ticket.id} from original ticket {workflow_ticket.original_ticket_id}")
            
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
    def by_original_ticket(self, request):
        """Get workflow tickets by original ticket ID"""
        original_ticket_id = request.query_params.get('original_ticket_id')
        
        if not original_ticket_id:
            return Response(
                {'error': 'original_ticket_id parameter is required'}, 
                status=status.HTTP_400_BAD_REQUEST
            )
        
        tickets = self.queryset.filter(original_ticket_id=original_ticket_id)
        serializer = self.get_serializer(tickets, many=True)
        return Response(serializer.data)
    
    @action(detail=False, methods=['get'])
    def stats(self, request):
        """Get ticket statistics"""
        stats = {}
        
        # Count by status
        status_counts = WorkflowTicket.objects.values('status').annotate(count=Count('id'))
        for item in status_counts:
            stats[f'status_{item["status"].lower().replace(" ", "_")}'] = item['count']
        
        # Count by priority
        priority_counts = WorkflowTicket.objects.values('priority').annotate(count=Count('id'))
        for item in priority_counts:
            stats[f'priority_{item["priority"].lower()}'] = item['count']
        
        # Count by department
        dept_counts = WorkflowTicket.objects.values('department').annotate(count=Count('id'))[:10]  # Top 10
        stats['top_departments'] = {item['department']: item['count'] for item in dept_counts}
        
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
        limit = int(request.query_params.get('limit', 20))
        tickets = self.queryset.order_by('-created_at')[:limit]
        serializer = self.get_serializer(tickets, many=True)
        return Response(serializer.data)
    
    @action(detail=False, methods=['get'])
    def by_customer(self, request):
        """Get tickets by customer"""
        customer = request.query_params.get('customer')
        
        if not customer:
            return Response(
                {'error': 'customer parameter is required'}, 
                status=status.HTTP_400_BAD_REQUEST
            )
        
        tickets = self.queryset.filter(customer__icontains=customer)
        serializer = self.get_serializer(tickets, many=True)
        return Response(serializer.data)
    
    @action(detail=False, methods=['get'])
    def by_department(self, request):
        """Get tickets by department"""
        department = request.query_params.get('department')
        
        if not department:
            return Response(
                {'error': 'department parameter is required'}, 
                status=status.HTTP_400_BAD_REQUEST
            )
        
        tickets = self.queryset.filter(department__icontains=department)
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
        
        if new_status not in dict(WorkflowTicket.STATUS_CHOICES):
            return Response(
                {'error': 'Invalid status value'}, 
                status=status.HTTP_400_BAD_REQUEST
            )
        
        ticket.status = new_status
        ticket.save()
        
        logger.info(f"Updated ticket {ticket.id} status to {new_status}")
        serializer = self.get_serializer(ticket)
        return Response(serializer.data)
