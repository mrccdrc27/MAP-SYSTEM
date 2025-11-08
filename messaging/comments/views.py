from django.shortcuts import render, get_object_or_404
from django.http import HttpResponse, Http404
from django.db import transaction
from rest_framework import viewsets, status
from rest_framework.response import Response
from rest_framework.decorators import action, api_view, parser_classes
from rest_framework.parsers import MultiPartParser, FormParser, JSONParser
from drf_spectacular.utils import extend_schema, OpenApiParameter, OpenApiExample, OpenApiResponse
from drf_spectacular.types import OpenApiTypes
from channels.layers import get_channel_layer
from asgiref.sync import async_to_sync
from .models import Comment, CommentRating, DocumentStorage, CommentDocument
from .serializers import CommentSerializer, CommentRatingSerializer, DocumentStorageSerializer, CommentDocumentSerializer
from tickets.models import Ticket
from authentication import SystemRolePermission
import logging

logger = logging.getLogger(__name__)


class CommentViewSet(viewsets.ModelViewSet):
    """
    API endpoint for comments on tickets with document attachment support
    """
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
        Dynamic queryset
        """
        qs = Comment.objects.all()
        
        # Filter to top-level comments for list views
        if self.action == 'list':
            qs = qs.filter(parent=None)
            ticket_id = self.request.query_params.get('ticket_id')
            if ticket_id:
                qs = qs.filter(ticket__ticket_id=ticket_id)
        
        return qs.order_by('-created_at')
    
    @action(detail=False, methods=['get'], url_path='by-ticket/(?P<ticket_id>[^/.]+)')
    def comments_by_ticket(self, request, ticket_id=None):
        """
        Get all comments for a specific ticket ID
        """
        try:
            # Get the ticket by ticket_id
            ticket = Ticket.objects.get(ticket_id=ticket_id)
            
            # Get all top-level comments for this ticket
            comments = Comment.objects.filter(ticket=ticket, parent=None).order_by('-created_at')
            
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
            
            from django.http import FileResponse
            response = FileResponse(
                document.file_path.open('rb'),
                as_attachment=True,
                filename=document.original_filename
            )
            response['Content-Type'] = document.content_type
            return response
            
        except DocumentStorage.DoesNotExist:
            raise Http404("Document not found")
    
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
        rating_data['comment'] = comment.id  # Use comment field directly
        
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
        
        if (comment_id is not None):
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


@extend_schema(
    summary="Add a comment",
    description="Add a comment to a ticket. User information is extracted from JWT token automatically.",
    request={
        'multipart/form-data': {
            'type': 'object',
            'properties': {
                'ticket_id': {'type': 'integer', 'example': 12345},
                'text': {'type': 'string', 'example': 'This is a comment'},
                'attachments': {'type': 'array', 'items': {'type': 'string', 'format': 'binary'}}
            },
            'required': ['ticket_id', 'text']
        }
    },
    responses={
        201: OpenApiResponse(response=CommentSerializer),
        400: OpenApiResponse(description='Invalid request data')
    },
    tags=['Comments']
)
@api_view(['POST'])
@parser_classes([MultiPartParser, FormParser, JSONParser])
def add_comment(request):
    """Add a comment to a ticket - user info extracted from JWT"""
    # Check permissions
    permission = SystemRolePermission()
    if not permission.has_permission(request, None):
        return Response({'error': 'Permission denied'}, status=status.HTTP_403_FORBIDDEN)
    
    # Define system and role requirements for comments
    required_system_roles = {
        'tts': ['Admin', 'Agent'],
        'hdts': ['Employee', 'Ticket Coordinator', 'Admin']
    }
    
    # Check if user has required system roles
    user_has_access = False
    for system, roles in required_system_roles.items():
        for role in roles:
            if request.user.has_system_role(system, role):
                user_has_access = True
                break
        if user_has_access:
            break
    
    if not user_has_access:
        return Response({'error': 'Insufficient permissions'}, status=status.HTTP_403_FORBIDDEN)
    
    with transaction.atomic():
        # Handle both form data and JSON
        if request.content_type and request.content_type.startswith('multipart'):
            data = request.data.copy()
            files = request.FILES.getlist('attachments')
        else:
            data = request.data
            files = []
        
        # Extract user info from JWT token instead of request data
        user = request.user
        data['user_id'] = user.user_id
        data['firstname'] = user.full_name.split(' ')[0] if user.full_name else user.username
        data['lastname'] = user.full_name.split(' ', 1)[1] if user.full_name and ' ' in user.full_name else ''
        data['role'] = user.get_systems()[0] if user.get_systems() else 'User'  # Use first system as role
        
        serializer = CommentSerializer(data=data)
        if serializer.is_valid():
            # Create comment with JWT user data
            comment = Comment.objects.create(
                ticket_id=serializer.validated_data['ticket_id'],
                user_id=user.user_id,
                firstname=data['firstname'],
                lastname=data['lastname'],
                role=data['role'],
                text=serializer.validated_data['text']
            )
            
            # Handle attachments using the correct models
            for file in files:
                # Create or get existing document with deduplication
                document, created = DocumentStorage.create_from_file(
                    file, user.user_id, data['firstname'], data['lastname']
                )
                
                # Attach document to comment
                CommentDocument.objects.create(
                    comment=comment,
                    document=document,
                    attached_by_user_id=user.user_id,
                    attached_by_name=f"{data['firstname']} {data['lastname']}"
                )
            
            return Response(
                CommentSerializer(comment, context={'request': request}).data,
                status=status.HTTP_201_CREATED
            )
        
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


@extend_schema(
    summary="Get comments for a ticket",
    description="Retrieve all comments for a specific ticket ID",
    parameters=[
        OpenApiParameter(
            name='ticket_id',
            type=OpenApiTypes.INT,
            location=OpenApiParameter.PATH,
            description='Ticket ID to get comments for',
            examples=[OpenApiExample('Example ticket ID', value=12345)]
        ),
        OpenApiParameter(
            name='page',
            type=OpenApiTypes.INT,
            location=OpenApiParameter.QUERY,
            description='Page number for pagination'
        ),
        OpenApiParameter(
            name='page_size',
            type=OpenApiTypes.INT,
            location=OpenApiParameter.QUERY,
            description='Number of comments per page (max 100)'
        )
    ],
    responses={
        200: OpenApiResponse(response=CommentSerializer(many=True)),
        404: OpenApiResponse(description='Ticket not found')
    },
    tags=['Comments']
)
@api_view(['GET'])  
def get_comments(request, ticket_id):
    """Get all comments for a ticket with pagination"""
    # Check permissions
    permission = SystemRolePermission()
    if not permission.has_permission(request, None):
        return Response({'error': 'Permission denied'}, status=status.HTTP_403_FORBIDDEN)
    
    # Define system and role requirements for viewing comments
    required_system_roles = {
        'tts': ['Admin', 'Agent'],
        'hdts': ['Employee', 'Ticket Coordinator', 'Admin']
    }
    
    # Check if user has required system roles
    user_has_access = False
    for system, roles in required_system_roles.items():
        for role in roles:
            if request.user.has_system_role(system, role):
                user_has_access = True
                break
        if user_has_access:
            break
    
    if not user_has_access:
        return Response({'error': 'Insufficient permissions'}, status=status.HTTP_403_FORBIDDEN)
    
    # Get comments for the ticket
    comments = Comment.objects.filter(ticket_id=ticket_id).order_by('-created_at')
    
    # Simple pagination
    page = int(request.GET.get('page', 1))
    page_size = min(int(request.GET.get('page_size', 10)), 100)  # Max 100 per page
    
    start = (page - 1) * page_size
    end = start + page_size
    paginated_comments = comments[start:end]
    
    serializer = CommentSerializer(paginated_comments, many=True, context={'request': request})
    
    response_data = {
        'comments': serializer.data,
        'page': page,
        'page_size': page_size,
        'total_count': comments.count(),
        'has_next': end < comments.count()
    }
    
    return Response(response_data)


@extend_schema(
    summary="Update a comment",
    description="Update an existing comment. User must be the original author.",
    parameters=[
        OpenApiParameter(
            name='comment_id',
            type=OpenApiTypes.INT,
            location=OpenApiParameter.PATH,
            description='Comment ID to update'
        )
    ],
    request={
        'application/json': {
            'type': 'object',
            'properties': {
                'text': {'type': 'string', 'example': 'Updated comment text'}
            },
            'required': ['text']
        }
    },
    responses={
        200: OpenApiResponse(response=CommentSerializer),
        403: OpenApiResponse(description='Permission denied'),
        404: OpenApiResponse(description='Comment not found')
    },
    tags=['Comments']
)
@api_view(['PUT'])
def update_comment(request, comment_id):
    """Update a comment - only the original author can update"""
    # Check permissions
    permission = SystemRolePermission()
    if not permission.has_permission(request, None):
        return Response({'error': 'Permission denied'}, status=status.HTTP_403_FORBIDDEN)
    
    comment = get_object_or_404(Comment, id=comment_id)
    
    # Check if user is the original author
    if comment.user_id != request.user.user_id:
        return Response({'error': 'Can only update your own comments'}, status=status.HTTP_403_FORBIDDEN)
    
    if 'text' in request.data:
        comment.text = request.data['text']
        comment.save()
    
    return Response(CommentSerializer(comment, context={'request': request}).data)


@extend_schema(
    summary="Delete a comment", 
    description="Delete a comment. User must be the original author or have admin privileges.",
    parameters=[
        OpenApiParameter(
            name='comment_id',
            type=OpenApiTypes.INT,
            location=OpenApiParameter.PATH,
            description='Comment ID to delete'
        )
    ],
    responses={
        204: OpenApiResponse(description='Comment deleted successfully'),
        403: OpenApiResponse(description='Permission denied'),
        404: OpenApiResponse(description='Comment not found')
    },
    tags=['Comments']
)
@api_view(['DELETE'])
def delete_comment(request, comment_id):
    """Delete a comment - author or admin only"""
    # Check permissions
    permission = SystemRolePermission()
    if not permission.has_permission(request, None):
        return Response({'error': 'Permission denied'}, status=status.HTTP_403_FORBIDDEN)
    
    comment = get_object_or_404(Comment, id=comment_id)
    
    # Check if user is the original author or has admin role
    is_author = comment.user_id == request.user.user_id
    is_admin = (request.user.has_system_role('tts', 'Admin') or 
                request.user.has_system_role('hdts', 'Admin'))
    
    if not (is_author or is_admin):
        return Response({'error': 'Can only delete your own comments or need admin privileges'}, 
                       status=status.HTTP_403_FORBIDDEN)
    
    comment.delete()
    return Response(status=status.HTTP_204_NO_CONTENT)


@extend_schema(
    summary="Download comment attachment",
    description="Download a file attachment from a comment",
    parameters=[
        OpenApiParameter(
            name='attachment_id',
            type=OpenApiTypes.INT,
            location=OpenApiParameter.PATH,
            description='Attachment ID to download'
        )
    ],
    responses={
        200: OpenApiResponse(description='File download'),
        404: OpenApiResponse(description='Attachment not found')
    },
    tags=['Comments']
)
@api_view(['GET'])
def download_comment_attachment(request, attachment_id):
    """Download a comment attachment"""
    # Check permissions
    permission = SystemRolePermission()
    if not permission.has_permission(request, None):
        return Response({'error': 'Permission denied'}, status=status.HTTP_403_FORBIDDEN)
    
    document = get_object_or_404(DocumentStorage, id=attachment_id)
    
    from django.http import FileResponse
    response = FileResponse(
        document.file_path.open('rb'),
        as_attachment=True,
        filename=document.original_filename
    )
    response['Content-Type'] = document.content_type
    return response
