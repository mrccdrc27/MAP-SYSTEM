from django.shortcuts import render
from rest_framework import viewsets, status
from rest_framework.response import Response
from rest_framework.decorators import action
from .models import Comment, CommentRating
from .serializers import CommentSerializer, CommentRatingSerializer
from tickets.models import Ticket


class CommentViewSet(viewsets.ModelViewSet):
    """
    API endpoint for comments on tickets
    """
    queryset = Comment.objects.filter(parent=None)  # Only top-level comments
    serializer_class = CommentSerializer
    
    def get_queryset(self):
        """
        Optionally restricts the returned comments to a given ticket
        """
        queryset = Comment.objects.filter(parent=None)  # Only top-level comments
        ticket_id = self.request.query_params.get('ticket_id', None)
        
        if ticket_id is not None:
            try:
                ticket = Ticket.objects.get(ticket_id=ticket_id)
                queryset = queryset.filter(ticket=ticket)
            except Ticket.DoesNotExist:
                queryset = Comment.objects.none()
                
        return queryset
    
    @action(detail=False, methods=['get'], url_path='by-ticket/(?P<ticket_id>[^/.]+)')
    def comments_by_ticket(self, request, ticket_id=None):
        """
        Get all comments for a specific ticket ID
        """
        try:
            # Get the ticket by ticket_id
            ticket = Ticket.objects.get(ticket_id=ticket_id)
            
            # Get all top-level comments for this ticket
            comments = Comment.objects.filter(ticket=ticket, parent=None)
            
            # Serialize and return the comments
            serializer = self.get_serializer(comments, many=True)
            return Response(serializer.data)
        except Ticket.DoesNotExist:
            return Response(
                {"error": f"Ticket with ID {ticket_id} not found"}, 
                status=status.HTTP_404_NOT_FOUND
            )
    
    @action(detail=True, methods=['post'])
    def reply(self, request, pk=None):
        """
        Add a reply to an existing comment
        """
        parent_comment = self.get_object()
        
        # Create a new comment as a reply
        data = request.data.copy()
        # Pass the ticket_id instead of the ticket object
        data['ticket_id'] = parent_comment.ticket.ticket_id
        data['parent'] = parent_comment.id
        
        serializer = CommentSerializer(data=data)
        if serializer.is_valid():
            serializer.save()
            return Response(serializer.data, status=status.HTTP_201_CREATED)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
    
    @action(detail=True, methods=['post'])
    def rate(self, request, pk=None):
        """
        Add or update a rating (thumbs up/down) for this comment
        """
        comment = self.get_object()
        user_id = request.data.get('user_id')
        rating = request.data.get('rating')
        
        if not user_id:
            return Response({'error': 'user_id is required'}, status=status.HTTP_400_BAD_REQUEST)
        
        if rating not in ['up', 'down']:
            return Response({'error': 'rating must be either "up" or "down"'}, status=status.HTTP_400_BAD_REQUEST)
        
        # Get or create the rating
        try:
            rating_obj = CommentRating.objects.get(comment=comment, user_id=user_id)
            rating_obj.rating = rating
            rating_obj.save()
        except CommentRating.DoesNotExist:
            rating_obj = CommentRating.objects.create(
                comment=comment,
                user_id=user_id,
                rating=rating
            )
        
        # Return updated comment
        serializer = CommentSerializer(comment)
        return Response(serializer.data)
