from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from django.shortcuts import get_object_or_404
from .models import Ticket
from .serializers import TicketSerializer, TicketSerializer2
from .tasks import push_ticket_to_workflow
from rest_framework import generics

class TicketViewSet(viewsets.ModelViewSet):
    queryset = Ticket.objects.all()
    serializer_class = TicketSerializer

    @action(detail=True, methods=['post'])
    def push_to_workflow(self, request, pk=None):
        """Enqueue a single ticket to be pushed to workflow service asynchronously"""
        ticket = get_object_or_404(Ticket, pk=pk)
        push_ticket_to_workflow.delay(ticket.id)

        return Response(
            {"message": f"Ticket {ticket.ticket_id} enqueued for workflow push."},
            status=status.HTTP_202_ACCEPTED
        )

    @action(detail=False, methods=['post'])
    def push_multiple_to_workflow(self, request):
        """Enqueue multiple tickets to be pushed to workflow service"""
        ticket_ids = request.data.get('ticket_ids', [])

        if not ticket_ids:
            return Response(
                {'error': 'ticket_ids list is required'}, 
                status=status.HTTP_400_BAD_REQUEST
            )

        for ticket_id in ticket_ids:
            push_ticket_to_workflow.delay(ticket_id)

        return Response(
            {"message": f"Enqueued {len(ticket_ids)} tickets for workflow push."},
            status=status.HTTP_202_ACCEPTED
        )

    @action(detail=False, methods=['post'])
    def push_all_to_workflow(self, request):
        """Enqueue all tickets to be pushed to workflow service"""
        ticket_ids = Ticket.objects.values_list('id', flat=True)

        for ticket_id in ticket_ids:
            push_ticket_to_workflow.delay(ticket_id)

        return Response(
            {"message": f"Enqueued {len(ticket_ids)} tickets for workflow push."},
            status=status.HTTP_202_ACCEPTED
        )



class TicketListCreateView(generics.ListCreateAPIView):
    queryset = Ticket.objects.all().order_by('-created_at')
    serializer_class = TicketSerializer2


class TicketRetrieveUpdateDestroyView(generics.RetrieveUpdateDestroyAPIView):
    queryset = Ticket.objects.all()
    serializer_class = TicketSerializer2
    lookup_field = 'id'