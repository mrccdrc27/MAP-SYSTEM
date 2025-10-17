from django.shortcuts import render, get_object_or_404
from rest_framework import viewsets, status
from rest_framework.response import Response
from rest_framework.decorators import action
from drf_spectacular.utils import extend_schema, OpenApiParameter, OpenApiExample
from drf_spectacular.types import OpenApiTypes
from .models import Comment, CommentRating
from .serializers import CommentSerializer, CommentRatingSerializer
from tickets.models import Ticket


class CommentViewSet(viewsets.ModelViewSet):
    """
    API endpoint for comments on tickets
    """
    # Allow access to all comments, but filter list views to top-level comments
    queryset = Comment.objects.all()
    serializer_class = CommentSerializer
    lookup_field = 'comment_id'  # Use comment_id instead of id for lookups
    
    def get_queryset(self):
        """
        For list views, returns only top-level comments.
        For detail views (like rating a comment), returns all comments.
        """
        # If this is a detail view (like accessing a specific comment), return all comments
        if self.action in ['retrieve', 'update', 'partial_update', 'destroy', 'rate', 'reply']:
            return Comment.objects.all()
        
        # For list views, only return top-level comments
        queryset = Comment.objects.filter(parent=None)
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
    
    @extend_schema(
        request={
            'application/json': {
                'type': 'object',
                'properties': {
                    'user_id': {'type': 'string'},
                    'firstname': {'type': 'string'},
                    'lastname': {'type': 'string'},
                    'role': {'type': 'string'},
                    'content': {'type': 'string', 'description': 'Content of the reply'},
                },
                'required': ['user_id', 'firstname', 'lastname', 'role', 'content']
            }
        },
        examples=[
            OpenApiExample(
                'Reply Example',
                value={
                    'user_id': '123',
                    'firstname': 'John',
                    'lastname': 'Doe',
                    'role': 'Customer',
                    'content': 'This is my reply to the comment.'
                },
                description="Example of replying to a comment"
            )
        ]
    )
    @action(detail=True, methods=['post'])
    def reply(self, request, comment_id=None):
        """
        Add a reply to an existing comment
        """
        parent_comment = self.get_object()
        
        # Create a new comment as a reply
        data = request.data.copy()
        data['ticket_id'] = parent_comment.ticket.ticket_id
        data['parent'] = parent_comment.id
        
        # Ensure required user information fields are present
        required_fields = ['user_id', 'firstname', 'lastname', 'role']
        missing_fields = [field for field in required_fields if field not in data]
        
        if missing_fields:
            return Response(
                {field: "This field is required" for field in missing_fields},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        serializer = CommentSerializer(data=data)
        if serializer.is_valid():
            serializer.save()
            return Response(serializer.data, status=status.HTTP_201_CREATED)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
    
    @extend_schema(
        request={
            'application/json': {
                'type': 'object',
                'properties': {
                    'user_id': {'type': 'string'},
                    'firstname': {'type': 'string'},
                    'lastname': {'type': 'string'},
                    'role': {'type': 'string'},
                    'rating': {'type': 'boolean', 'description': 'True (1) for thumbs up, False (0) for thumbs down'},
                },
                'required': ['user_id', 'firstname', 'lastname', 'role', 'rating']
            }
        },
        examples=[
            OpenApiExample(
                'Rating Example',
                value={
                    'user_id': '123',
                    'firstname': 'John',
                    'lastname': 'Doe',
                    'role': 'Customer',
                    'rating': 1  # 1 = thumbs up, 0 = thumbs down
                },
                description="Example of rating a comment with thumbs up"
            )
        ]
    )
    @action(detail=True, methods=['post'])
    def rate(self, request, comment_id=None):
        """
        Add or update a rating (thumbs up/down) for this comment
        rating: boolean (True/1 for thumbs up, False/0 for thumbs down)
        """
        comment = self.get_object()
        data = request.data
        
        # Check required fields
        required_fields = ['user_id', 'firstname', 'lastname', 'role', 'rating']
        missing_fields = [field for field in required_fields if field not in data]
        
        if missing_fields:
            return Response(
                {field: "This field is required" for field in missing_fields},
                status=status.HTTP_400_BAD_REQUEST
            )
            
        user_id = data.get('user_id')
        firstname = data.get('firstname')
        lastname = data.get('lastname')
        role = data.get('role')
        rating = data.get('rating')
        
        # Convert rating to boolean if it's an integer or string
        if isinstance(rating, str) and rating.lower() in ['1', 'true', 'yes']:
            rating = True
        elif isinstance(rating, str) and rating.lower() in ['0', 'false', 'no']:
            rating = False
        elif isinstance(rating, int):
            rating = bool(rating)
            
        # Validate that rating is boolean
        if not isinstance(rating, bool):
            return Response({'error': 'rating must be a boolean value (1/0, True/False)'}, 
                           status=status.HTTP_400_BAD_REQUEST)
        
        # Get or create the rating
        try:
            rating_obj = CommentRating.objects.get(comment=comment, user_id=user_id)
            # Update user info in case it has changed
            rating_obj.firstname = firstname
            rating_obj.lastname = lastname
            rating_obj.role = role
            rating_obj.rating = rating
            rating_obj.save()
        except CommentRating.DoesNotExist:
            rating_obj = CommentRating.objects.create(
                comment=comment,
                user_id=user_id,
                firstname=firstname,
                lastname=lastname,
                role=role,
                rating=rating
            )
        
        # Return updated comment
        serializer = CommentSerializer(comment)
        return Response(serializer.data)
