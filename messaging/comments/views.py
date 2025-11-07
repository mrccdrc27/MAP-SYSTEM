from django.shortcuts import render, get_object_or_404
from django.http import HttpResponse, Http404
from rest_framework import viewsets, status
from rest_framework.response import Response
from rest_framework.decorators import action
from rest_framework.parsers import MultiPartParser, FormParser, JSONParser
from drf_spectacular.utils import extend_schema, OpenApiParameter, OpenApiExample
from drf_spectacular.types import OpenApiTypes
from channels.layers import get_channel_layer
from asgiref.sync import async_to_sync
from .models import Comment, CommentRating, DocumentStorage, CommentDocument
from .serializers import CommentSerializer, CommentRatingSerializer, DocumentStorageSerializer, CommentDocumentSerializer
from tickets.models import Ticket


class CommentViewSet(viewsets.ModelViewSet):
    """
    API endpoint for comments on tickets with document attachment support
    """
    # Allow access to all comments, but filter list views to top-level comments
    queryset = Comment.objects.all()
    serializer_class = CommentSerializer
    lookup_field = 'comment_id'  # Use comment_id instead of id for lookups
    # Support both JSON and file uploads for proper DRF browsable API
    parser_classes = [JSONParser, MultiPartParser, FormParser]
    
    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        self.channel_layer = get_channel_layer()
    
    def _send_websocket_notification(self, comment, action='create'):
        """Send WebSocket notification for comment updates"""
        if self.channel_layer:
            ticket_id = comment.ticket.ticket_id
            room_group_name = f'comments_{ticket_id}'
            
            serializer = CommentSerializer(comment)
            
            async_to_sync(self.channel_layer.group_send)(
                room_group_name,
                {
                    'type': 'comment_message',
                    'message': serializer.data,
                    'action': action
                }
            )
    
    def get_queryset(self):
        """
        For list views, returns only top-level comments with proper pagination.
        For detail views (like rating a comment), returns all comments.
        """
        # If this is a detail view (like accessing a specific comment), return all comments
        if self.action in ['retrieve', 'update', 'partial_update', 'destroy', 'rate', 'reply', 'attach_document', 'detach_document']:
            return Comment.objects.all()
        
        # For list views, only return top-level comments with proper ordering for pagination
        queryset = Comment.objects.filter(parent=None).select_related('ticket').prefetch_related('documents__document', 'replies')
        ticket_id = self.request.query_params.get('ticket_id', None)
        
        if ticket_id is not None:
            try:
                ticket = Ticket.objects.get(ticket_id=ticket_id)
                queryset = queryset.filter(ticket=ticket)
            except Ticket.DoesNotExist:
                queryset = Comment.objects.none()
                
        return queryset.order_by('-created_at')  # Ensure consistent ordering for pagination
    
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
            'multipart/form-data': {
                'type': 'object',
                'properties': {
                    'user_id': {'type': 'string'},
                    'firstname': {'type': 'string'},
                    'lastname': {'type': 'string'},
                    'role': {'type': 'string'},
                    'content': {'type': 'string', 'description': 'Content of the reply'},
                    'documents': {'type': 'array', 'items': {'type': 'string', 'format': 'binary'}, 'description': 'Optional file attachments'},
                },
                'required': ['user_id', 'firstname', 'lastname', 'role', 'content']
            }
        },
        examples=[
            OpenApiExample(
                'Reply with Attachment',
                value={
                    'user_id': '123',
                    'firstname': 'John',
                    'lastname': 'Doe',
                    'role': 'Customer',
                    'content': 'This is my reply with an attachment.'
                },
                description="Example of replying to a comment with optional file attachments"
            )
        ]
    )
    @action(detail=True, methods=['post'])
    def reply(self, request, comment_id=None):
        """
        Add a reply to an existing comment with optional document attachments
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
            reply = serializer.save()
            
            # Handle document attachments
            self._handle_document_attachments(request, reply, data)
            
            # Send WebSocket notification
            self._send_websocket_notification(reply, action='reply')
            
            # Return updated reply with documents
            reply_serializer = CommentSerializer(reply, context={'request': request})
            return Response(reply_serializer.data, status=status.HTTP_201_CREATED)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
    
    def create(self, request, *args, **kwargs):
        """
        Override create to handle document attachments
        """
        # Extract files from request before serializing
        uploaded_files = []
        if 'documents' in request.FILES:
            uploaded_files = request.FILES.getlist('documents')
        
        # Create comment without file validation issues
        serializer = self.get_serializer(data=request.data)
        if serializer.is_valid():
            comment = serializer.save()
            
            # Handle file attachments after comment is created
            if uploaded_files:
                self._attach_files_to_comment(comment, uploaded_files, request.data)
            
            # Send WebSocket notification
            self._send_websocket_notification(comment, action='create')
            
            # Return updated comment with documents
            comment_serializer = CommentSerializer(comment, context={'request': request})
            return Response(comment_serializer.data, status=status.HTTP_201_CREATED)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
    
    def _attach_files_to_comment(self, comment, files, data):
        """
        Helper method to attach files to a comment after creation
        """
        user_id = data.get('user_id')
        firstname = data.get('firstname')
        lastname = data.get('lastname')
        
        for file_obj in files:
            try:
                # Only process files with actual content
                if file_obj and hasattr(file_obj, 'size') and file_obj.size > 0:
                    # Create or get existing document with deduplication
                    document, created = DocumentStorage.create_from_file(
                        file_obj, user_id, firstname, lastname
                    )
                    
                    # Attach document to comment (if not already attached)
                    CommentDocument.objects.get_or_create(
                        comment=comment,
                        document=document,
                        defaults={
                            'attached_by_user_id': user_id,
                            'attached_by_name': f"{firstname} {lastname}"
                        }
                    )
            except Exception as e:
                # Log error but don't fail the comment creation
                print(f"Error attaching document {file_obj.name}: {str(e)}")
    
    def _handle_document_attachments(self, request, comment, data):
        """
        Helper method to handle document attachments for comments
        """
        files = request.FILES.getlist('documents')
        user_id = data.get('user_id')
        firstname = data.get('firstname')
        lastname = data.get('lastname')
        
        for file_obj in files:
            try:
                # Create or get existing document with deduplication
                document, created = DocumentStorage.create_from_file(
                    file_obj, user_id, firstname, lastname
                )
                
                # Attach document to comment (if not already attached)
                CommentDocument.objects.get_or_create(
                    comment=comment,
                    document=document,
                    defaults={
                        'attached_by_user_id': user_id,
                        'attached_by_name': f"{firstname} {lastname}"
                    }
                )
            except Exception as e:
                # Log error but don't fail the comment creation
                print(f"Error attaching document {file_obj.name}: {str(e)}")
    
    @extend_schema(
        request={
            'multipart/form-data': {
                'type': 'object',
                'properties': {
                    'user_id': {'type': 'string'},
                    'firstname': {'type': 'string'},
                    'lastname': {'type': 'string'},
                    'role': {'type': 'string'},
                    'documents': {'type': 'array', 'items': {'type': 'string', 'format': 'binary'}, 'description': 'Files to attach'},
                },
                'required': ['user_id', 'firstname', 'lastname', 'role', 'documents']
            }
        }
    )
    @action(detail=True, methods=['post'], parser_classes=[MultiPartParser, FormParser])
    def attach_document(self, request, comment_id=None):
        """
        Attach documents to an existing comment
        """
        comment = self.get_object()
        
        # Check required fields
        required_fields = ['user_id', 'firstname', 'lastname', 'role']
        missing_fields = [field for field in required_fields if field not in request.data]
        
        if missing_fields:
            return Response(
                {field: "This field is required" for field in missing_fields},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        files = request.FILES.getlist('documents')
        if not files:
            return Response(
                {"documents": "At least one file is required"},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        user_id = request.data.get('user_id')
        firstname = request.data.get('firstname')
        lastname = request.data.get('lastname')
        
        attached_documents = []
        errors = []
        
        for file_obj in files:
            try:
                # Create or get existing document with deduplication
                document, created = DocumentStorage.create_from_file(
                    file_obj, user_id, firstname, lastname
                )
                
                # Attach document to comment (if not already attached)
                comment_doc, doc_created = CommentDocument.objects.get_or_create(
                    comment=comment,
                    document=document,
                    defaults={
                        'attached_by_user_id': user_id,
                        'attached_by_name': f"{firstname} {lastname}"
                    }
                )
                
                if doc_created:
                    attached_documents.append({
                        'filename': document.original_filename,
                        'size': document.file_size,
                        'hash': document.file_hash,
                        'newly_uploaded': created
                    })
                else:
                    errors.append(f"Document '{document.original_filename}' is already attached to this comment")
                    
            except Exception as e:
                errors.append(f"Error uploading {file_obj.name}: {str(e)}")
        
        # Send WebSocket notification
        self._send_websocket_notification(comment, action='attach_document')
        
        # Return updated comment
        comment_serializer = CommentSerializer(comment, context={'request': request})
        response_data = comment_serializer.data
        response_data['attachment_results'] = {
            'attached': attached_documents,
            'errors': errors
        }
        
        return Response(response_data, status=status.HTTP_200_OK)
    
    @action(detail=True, methods=['delete'], url_path='detach-document/(?P<document_id>[^/.]+)')
    def detach_document(self, request, comment_id=None, document_id=None):
        """
        Detach a document from a comment
        """
        comment = self.get_object()
        
        try:
            comment_doc = CommentDocument.objects.get(
                comment=comment,
                document_id=document_id
            )
            
            # Check if user has permission to detach (same user who attached it)
            user_id = request.query_params.get('user_id')
            if user_id and comment_doc.attached_by_user_id != user_id:
                return Response(
                    {"error": "You can only detach documents you attached"},
                    status=status.HTTP_403_FORBIDDEN
                )
            
            document_name = comment_doc.document.original_filename
            comment_doc.delete()
            
            # Send WebSocket notification
            self._send_websocket_notification(comment, action='detach_document')
            
            return Response({
                "message": f"Document '{document_name}' detached successfully"
            }, status=status.HTTP_200_OK)
            
        except CommentDocument.DoesNotExist:
            return Response(
                {"error": "Document attachment not found"},
                status=status.HTTP_404_NOT_FOUND
            )
    
    @action(detail=False, methods=['get'], url_path='download-document/(?P<document_id>[^/.]+)')
    def download_document(self, request, document_id=None):
        """
        Download a document by ID
        """
        try:
            document = DocumentStorage.objects.get(id=document_id)
            
            if not document.file_path:
                raise Http404("File not found")
            
            response = HttpResponse(
                document.file_path.read(),
                content_type=document.content_type
            )
            response['Content-Disposition'] = f'attachment; filename="{document.original_filename}"'
            response['Content-Length'] = document.file_size
            
            return response
            
        except DocumentStorage.DoesNotExist:
            raise Http404("Document not found")
        except Exception as e:
            return Response(
                {"error": f"Error downloading file: {str(e)}"},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )

    @extend_schema(
        request=CommentRatingSerializer,
        examples=[
            OpenApiExample(
                'Rate Comment',
                value={
                    'user_id': '123',
                    'firstname': 'John',
                    'lastname': 'Doe',
                    'role': 'Customer',
                    'rating': True
                },
                description="Example of rating a comment (True for thumbs up, False for thumbs down)"
            )
        ]
    )
    @action(detail=True, methods=['post'])
    def rate(self, request, comment_id=None):
        """
        Rate a comment (thumbs up/down)
        """
        comment = self.get_object()
        
        # Create the rating data
        rating_data = request.data.copy()
        rating_data['comment'] = comment.id
        
        # Check if user has already rated this comment
        try:
            existing_rating = CommentRating.objects.get(
                comment=comment,
                user_id=rating_data.get('user_id')
            )
            # Update existing rating
            serializer = CommentRatingSerializer(existing_rating, data=rating_data, partial=True)
        except CommentRating.DoesNotExist:
            # Create new rating
            serializer = CommentRatingSerializer(data=rating_data)
        
        if serializer.is_valid():
            serializer.save()
            
            # Send WebSocket notification
            self._send_websocket_notification(comment, action='rate')
            
            # Return updated comment with new rating counts
            comment_serializer = CommentSerializer(comment, context={'request': request})
            return Response({
                'message': 'Rating updated successfully',
                'comment': comment_serializer.data
            }, status=status.HTTP_200_OK)
        
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


class CommentRatingViewSet(viewsets.ModelViewSet):
    """
    API endpoint for comment ratings
    """
    queryset = CommentRating.objects.all()
    serializer_class = CommentRatingSerializer
    
    def get_queryset(self):
        """
        Filter ratings by comment if comment_id is provided
        """
        queryset = CommentRating.objects.all()
        comment_id = self.request.query_params.get('comment_id', None)
        
        if comment_id is not None:
            try:
                comment = Comment.objects.get(comment_id=comment_id)
                queryset = queryset.filter(comment=comment)
            except Comment.DoesNotExist:
                queryset = CommentRating.objects.none()
                
        return queryset
    
    @action(detail=False, methods=['get'], url_path='by-comment/(?P<comment_id>[^/.]+)')
    def ratings_by_comment(self, request, comment_id=None):
        """
        Get all ratings for a specific comment ID
        """
        try:
            # Get the comment by comment_id
            comment = Comment.objects.get(comment_id=comment_id)
            
            # Get all ratings for this comment
            ratings = CommentRating.objects.filter(comment=comment)
            
            # Serialize and return the ratings
            serializer = self.get_serializer(ratings, many=True)
            return Response({
                'comment_id': comment_id,
                'total_ratings': ratings.count(),
                'thumbs_up_count': ratings.filter(rating=True).count(),
                'thumbs_down_count': ratings.filter(rating=False).count(),
                'ratings': serializer.data
            })
        except Comment.DoesNotExist:
            return Response(
                {"error": f"Comment with ID {comment_id} not found"}, 
                status=status.HTTP_404_NOT_FOUND
            )
