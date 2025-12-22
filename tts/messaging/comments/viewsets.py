from django.shortcuts import get_object_or_404
from django.http import Http404
from rest_framework import viewsets, status
from rest_framework.response import Response
from rest_framework.decorators import action
from rest_framework.parsers import MultiPartParser, FormParser, JSONParser
from drf_spectacular.utils import extend_schema, OpenApiExample
import logging

from .models import Comment, CommentRating, DocumentStorage, CommentDocument
from .serializers import CommentSerializer, CommentRatingSerializer
from .permissions import CommentPermission
from .services import CommentNotificationService, DocumentAttachmentService
from tickets.models import Ticket

logger = logging.getLogger(__name__)


class CommentViewSet(viewsets.ModelViewSet):
    """
    API endpoint for comments on tickets with document attachment support
    """
    queryset = Comment.objects.all()
    serializer_class = CommentSerializer
    lookup_field = 'comment_id'
    parser_classes = [JSONParser, MultiPartParser, FormParser]
    permission_classes = [CommentPermission]
    
    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        self.notification_service = CommentNotificationService()
    
    def check_permissions(self, request):
        """Override to add debug logging"""
        logger.info(f"check_permissions called for action: {self.action}")
        logger.info(f"Request user: {request.user}")
        logger.info(f"User authenticated: {getattr(request.user, 'is_authenticated', False)}")
        logger.info(f"User roles: {getattr(request.user, 'roles', None)}")
        
        for permission in self.get_permissions():
            logger.info(f"Checking permission: {permission.__class__.__name__}")
            if not permission.has_permission(request, self):
                logger.warning(f"Permission DENIED by {permission.__class__.__name__}")
                self.permission_denied(
                    request,
                    message=getattr(permission, 'message', None),
                    code=getattr(permission, 'code', None)
                )
            else:
                logger.info(f"Permission GRANTED by {permission.__class__.__name__}")
    
    def get_queryset(self):
        """Dynamic queryset filtering"""
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
        """Get all comments for a specific ticket ID"""
        try:
            ticket = Ticket.objects.get(ticket_id=ticket_id)
            comments = Comment.objects.filter(ticket=ticket, parent=None).order_by('-created_at')
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
                    'content': {'type': 'string', 'description': 'Content of the reply'},
                    'documents': {'type': 'array', 'items': {'type': 'string', 'format': 'binary'}},
                },
                'required': ['content']
            }
        }
    )
    @action(detail=True, methods=['get', 'post'], permission_classes=[CommentPermission])
    def reply(self, request, comment_id=None):
        """Get reply info or add a reply to an existing comment with optional document attachments"""
        logger.info(f"Reply action called. User: {request.user}, Authenticated: {getattr(request.user, 'is_authenticated', False)}")
        logger.info(f"User roles: {getattr(request.user, 'roles', None)}")
        parent_comment = self.get_object()
        
        if request.method == 'GET':
            # Return information about the parent comment for reply form
            return Response({
                'parent_comment': {
                    'comment_id': parent_comment.comment_id,
                    'content': parent_comment.content,
                    'author': f"{parent_comment.firstname} {parent_comment.lastname}",
                    'created_at': parent_comment.created_at
                },
                'ticket_id': parent_comment.ticket.ticket_id,
                'reply_endpoint': request.build_absolute_uri(),
                'required_fields': ['content']  # Only content is required now
            })
        
        elif request.method == 'POST':
            print(f"DEBUG: Reply endpoint called with data: {request.data}")
            print(f"DEBUG: Request user: {request.user}")
            print(f"DEBUG: User authenticated: {hasattr(request, 'user') and request.user.is_authenticated}")
            
            # Extract user information from JWT authentication
            if not hasattr(request, 'user') or not request.user.is_authenticated:
                print("DEBUG: Authentication failed")
                return Response(
                    {"error": "Authentication required"}, 
                    status=status.HTTP_401_UNAUTHORIZED
                )
            
            # Parse full_name to get firstname and lastname
            full_name = getattr(request.user, 'full_name', '') or ''
            name_parts = full_name.strip().split(' ', 1)
            firstname = name_parts[0] if name_parts else ''
            lastname = name_parts[1] if len(name_parts) > 1 else ''
            
            # If full_name is empty, try to use username or email
            if not firstname:
                firstname = getattr(request.user, 'username', '') or getattr(request.user, 'email', '').split('@')[0]
            
            # Extract user role - get the first TTS role or fallback to first role
            user_roles = getattr(request.user, 'tts_roles', []) or getattr(request.user, 'roles', [])
            role = 'User'  # Default role
            
            if user_roles:
                first_role = user_roles[0]
                if isinstance(first_role, dict):
                    role = first_role.get('role', 'User')
                elif isinstance(first_role, str) and ':' in first_role:
                    role = first_role.split(':', 1)[1]
                elif isinstance(first_role, str):
                    role = first_role
            
            print(f"DEBUG: Extracted user info - ID: {request.user.user_id}, Name: {firstname} {lastname}, Role: {role}")
            
            # Create a new reply with authenticated user data
            data = request.data.copy()
            data['ticket_id'] = parent_comment.ticket.ticket_id
            data['parent'] = parent_comment.comment_id  # Use comment_id instead of database id
            data['user_id'] = str(request.user.user_id)
            data['firstname'] = firstname
            data['lastname'] = lastname
            data['role'] = role
            
            print(f"DEBUG: Final data for serializer: {data}")
            
            # Validate that content is provided
            if 'content' not in data or not data['content'].strip():
                print("DEBUG: Content validation failed")
                return Response(
                    {"content": "This field is required"}, 
                    status=status.HTTP_400_BAD_REQUEST
                )
            
            serializer = CommentSerializer(data=data)
            if serializer.is_valid():
                print("DEBUG: Serializer is valid, saving reply")
                reply = serializer.save()
                
                # Handle document attachments
                DocumentAttachmentService.handle_document_attachments(request, reply, data)
                
                # Send specific reply notification
                self.notification_service.send_comment_reply(reply)
                
                reply_serializer = CommentSerializer(reply, context={'request': request})
                return Response(reply_serializer.data, status=status.HTTP_201_CREATED)
            else:
                print(f"DEBUG: Serializer errors: {serializer.errors}")
                return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
    
    def create(self, request, *args, **kwargs):
        """Override create to handle document attachments and extract user from JWT"""
        # Extract user information from JWT authentication
        if not hasattr(request, 'user') or not request.user.is_authenticated:
            return Response(
                {"error": "Authentication required"}, 
                status=status.HTTP_401_UNAUTHORIZED
            )
        
        # Parse full_name to get firstname and lastname
        full_name = getattr(request.user, 'full_name', '') or ''
        name_parts = full_name.strip().split(' ', 1)
        firstname = name_parts[0] if name_parts else ''
        lastname = name_parts[1] if len(name_parts) > 1 else ''
        
        # If full_name is empty, try to use username or email
        if not firstname:
            firstname = getattr(request.user, 'username', '') or getattr(request.user, 'email', '').split('@')[0]
        
        # Extract user role - get the first TTS role or fallback to first role
        user_roles = getattr(request.user, 'tts_roles', []) or getattr(request.user, 'roles', [])
        role = 'User'  # Default role
        
        if user_roles:
            first_role = user_roles[0]
            if isinstance(first_role, dict):
                role = first_role.get('role', 'User')
            elif isinstance(first_role, str) and ':' in first_role:
                role = first_role.split(':', 1)[1]
            elif isinstance(first_role, str):
                role = first_role
        
        # Add user information to request data
        data = request.data.copy()
        data['user_id'] = str(request.user.user_id)
        data['firstname'] = firstname
        data['lastname'] = lastname
        data['role'] = role
        
        uploaded_files = request.FILES.getlist('documents') if 'documents' in request.FILES else []
        
        serializer = self.get_serializer(data=data)
        if serializer.is_valid():
            comment = serializer.save()
            
            # Handle file attachments
            if uploaded_files:
                DocumentAttachmentService.attach_files_to_comment(
                    comment, uploaded_files, data
                )
            
            # Send specific create notification
            self.notification_service.send_comment_create(comment)
            
            comment_serializer = CommentSerializer(comment, context={'request': request})
            return Response(comment_serializer.data, status=status.HTTP_201_CREATED)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
    
    def update(self, request, *args, **kwargs):
        """Override update to send proper notifications"""
        partial = kwargs.pop('partial', False)
        instance = self.get_object()
        serializer = self.get_serializer(instance, data=request.data, partial=partial)
        
        if serializer.is_valid():
            comment = serializer.save()
            
            # Send specific update notification
            self.notification_service.send_comment_update(comment)
            
            if getattr(instance, '_prefetched_objects_cache', None):
                instance._prefetched_objects_cache = {}
            
            return Response(serializer.data)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
    
    def destroy(self, request, *args, **kwargs):
        """Override destroy to send proper notifications and check permissions"""
        instance = self.get_object()
        
        logger.info(f"[destroy] Comment: {instance.comment_id}, user_id: {instance.user_id}")
        logger.info(f"[destroy] Request user: {request.user}, user_id: {getattr(request.user, 'user_id', 'N/A')}")
        
        # Explicitly check object-level permissions for delete
        # get_object() should have already done this, but let's be explicit
        self.check_object_permissions(request, instance)
        
        # Send delete notification before deletion
        self.notification_service.send_comment_delete(instance)
        
        self.perform_destroy(instance)
        return Response(status=status.HTTP_204_NO_CONTENT)
    
    @extend_schema(
        request={
            'multipart/form-data': {
                'type': 'object',
                'properties': {
                    'documents': {'type': 'array', 'items': {'type': 'string', 'format': 'binary'}},
                },
                'required': ['documents']
            }
        }
    )
    @action(detail=True, methods=['post'], parser_classes=[MultiPartParser, FormParser], permission_classes=[CommentPermission])
    def attach_document(self, request, comment_id=None):
        """Attach documents to an existing comment"""
        comment = self.get_object()
        
        # Extract user information from JWT authentication
        if not hasattr(request, 'user') or not request.user.is_authenticated:
            return Response(
                {"error": "Authentication required"}, 
                status=status.HTTP_401_UNAUTHORIZED
            )
        
        # Parse full_name to get firstname and lastname
        full_name = getattr(request.user, 'full_name', '') or ''
        name_parts = full_name.strip().split(' ', 1)
        firstname = name_parts[0] if name_parts else ''
        lastname = name_parts[1] if len(name_parts) > 1 else ''
        
        # If full_name is empty, try to use username or email
        if not firstname:
            firstname = getattr(request.user, 'username', '') or getattr(request.user, 'email', '').split('@')[0]
        
        files = request.FILES.getlist('documents')
        if not files:
            return Response(
                {"documents": "At least one file is required"},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        user_data = {
            'user_id': str(request.user.user_id),
            'firstname': firstname,
            'lastname': lastname
        }
        
        attached_documents, errors = DocumentAttachmentService.attach_files_to_comment(
            comment, files, user_data
        )
        
        # Send specific document attachment notification
        self.notification_service.send_document_attach(comment, document_info={
            'attached': attached_documents,
            'errors': errors
        })
        
        # Return updated comment
        comment_serializer = CommentSerializer(comment, context={'request': request})
        response_data = comment_serializer.data
        response_data['attachment_results'] = {
            'attached': attached_documents,
            'errors': errors
        }
        
        return Response(response_data, status=status.HTTP_200_OK)
    
    @action(detail=True, methods=['delete'], url_path='detach-document/(?P<document_id>[^/.]+)', permission_classes=[CommentPermission])
    def detach_document(self, request, comment_id=None, document_id=None):
        """Detach a document from a comment"""
        comment = self.get_object()
        
        try:
            comment_doc = CommentDocument.objects.get(
                comment=comment,
                document_id=document_id
            )
            
            # Check permissions
            user_id = request.query_params.get('user_id')
            if user_id and comment_doc.attached_by_user_id != user_id:
                return Response(
                    {"error": "You can only detach documents you attached"},
                    status=status.HTTP_403_FORBIDDEN
                )
            
            document_name = comment_doc.document.original_filename
            comment_doc.delete()
            
            # Send specific document detachment notification
            self.notification_service.send_document_detach(comment, document_info={
                'detached_document': document_name,
                'document_id': document_id
            })
            
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
        """Download a document by ID"""
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
        request={
            'application/json': {
                'type': 'object',
                'properties': {
                    'rating': {'type': 'boolean', 'description': 'True for thumbs up, False for thumbs down'}
                },
                'required': ['rating']
            }
        }
    )
    @action(detail=True, methods=['post'], permission_classes=[CommentPermission])
    def rate(self, request, comment_id=None):
        """Rate a comment (thumbs up/down)"""
        logger.info(f"Rate action called. User: {request.user}, Authenticated: {getattr(request.user, 'is_authenticated', False)}")
        logger.info(f"User roles: {getattr(request.user, 'roles', None)}")
        comment = self.get_object()
        
        # Extract user information from JWT authentication
        if not hasattr(request, 'user') or not request.user.is_authenticated:
            return Response(
                {"error": "Authentication required"}, 
                status=status.HTTP_401_UNAUTHORIZED
            )
        
        # Parse full_name to get firstname and lastname
        full_name = getattr(request.user, 'full_name', '') or ''
        name_parts = full_name.strip().split(' ', 1)
        firstname = name_parts[0] if name_parts else ''
        lastname = name_parts[1] if len(name_parts) > 1 else ''
        
        # If full_name is empty, try to use username or email
        if not firstname:
            firstname = getattr(request.user, 'username', '') or getattr(request.user, 'email', '').split('@')[0]
        
        # Extract user role - get the first TTS role or fallback to first role
        user_roles = getattr(request.user, 'tts_roles', []) or getattr(request.user, 'roles', [])
        role = 'User'  # Default role
        
        if user_roles:
            first_role = user_roles[0]
            if isinstance(first_role, dict):
                role = first_role.get('role', 'User')
            elif isinstance(first_role, str) and ':' in first_role:
                role = first_role.split(':', 1)[1]
            elif isinstance(first_role, str):
                role = first_role
        
        rating_data = {
            'comment': comment.id,
            'user_id': str(request.user.user_id),
            'firstname': firstname,
            'lastname': lastname,
            'role': role,
            'rating': request.data.get('rating')
        }
        
        # Validate rating field is present
        if 'rating' not in request.data:
            return Response(
                {"rating": "This field is required"}, 
                status=status.HTTP_400_BAD_REQUEST
            )
        
        rating_value = request.data.get('rating')
        user_id = str(request.user.user_id)
        
        # Handle rating removal (null value)
        if rating_value is None:
            try:
                existing_rating = CommentRating.objects.get(
                    comment=comment,
                    user_id=user_id
                )
                existing_rating.delete()
                
                # Refresh comment to get updated counts
                comment.refresh_from_db()
                
                # Send notification for rating removal
                self.notification_service.send_comment_rate(comment, rating_data={
                    'user_id': user_id,
                    'rating': None,
                    'action': 'removed'
                })
                
                comment_serializer = CommentSerializer(comment, context={'request': request})
                return Response({
                    'message': 'Rating removed successfully',
                    'comment': comment_serializer.data
                }, status=status.HTTP_200_OK)
            except CommentRating.DoesNotExist:
                # No rating to remove, just return success with current state
                comment_serializer = CommentSerializer(comment, context={'request': request})
                return Response({
                    'message': 'No rating to remove',
                    'comment': comment_serializer.data
                }, status=status.HTTP_200_OK)
        
        # Check for existing rating (create or update)
        try:
            existing_rating = CommentRating.objects.get(
                comment=comment,
                user_id=user_id
            )
            serializer = CommentRatingSerializer(existing_rating, data=rating_data, partial=True)
            rating_action = 'updated'
        except CommentRating.DoesNotExist:
            serializer = CommentRatingSerializer(data=rating_data)
            rating_action = 'created'
        
        if serializer.is_valid():
            rating = serializer.save()
            
            # Refresh comment to get updated counts
            comment.refresh_from_db()
            
            # Send specific rating notification with rating data
            self.notification_service.send_comment_rate(comment, rating_data={
                'rating_id': rating.id,
                'user_id': rating.user_id,
                'rating': rating.rating,
                'action': rating_action
            })
            
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
    permission_classes = [CommentPermission]
    
    def get_queryset(self):
        """Filter ratings by comment if comment_id is provided"""
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
        """Get all ratings for a specific comment ID"""
        try:
            comment = Comment.objects.get(comment_id=comment_id)
            ratings = CommentRating.objects.filter(comment=comment)
            
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