from rest_framework import status, viewsets
from rest_framework.decorators import action
from rest_framework.parsers import MultiPartParser, FormParser, JSONParser
from rest_framework.response import Response
from django.db import transaction
from django.http import FileResponse
from drf_spectacular.utils import extend_schema
from .models import Ticket, Message, MessageAttachment, MessageReaction
from .serializers import (
    MessageSerializer, MessageAttachmentSerializer, 
    MessageReactionSerializer, CreateMessageSerializer
)

try:
    from authentication import SystemRolePermission
except ImportError:
    # Fallback for cases where authentication module is not available
    from rest_framework.permissions import BasePermission
    
    class SystemRolePermission(BasePermission):
        """Fallback permission class"""
        def has_permission(self, request, view):
            return bool(request.user and getattr(request.user, 'is_authenticated', False))


class MessageViewSet(viewsets.ModelViewSet):
    """
    ViewSet for managing messages - send, retrieve, edit, and delete messages
    """
    queryset = Message.objects.filter(is_deleted=False).prefetch_related('reactions', 'attachments')
    serializer_class = MessageSerializer
    lookup_field = 'message_id'
    permission_classes = [SystemRolePermission]
    parser_classes = [MultiPartParser, FormParser, JSONParser]
    
    # Define system and role requirements for this viewset
    required_system_roles = {
        'tts': ['Admin', 'Agent', 'Budget Manager', 'Asset Manager'],
        'hdts': ['Employee', 'Ticket Coordinator', 'Admin']
    }

    def get_serializer_class(self):
        """Return different serializers for different actions"""
        if self.action == 'create':
            return CreateMessageSerializer
        return MessageSerializer

    @extend_schema(
        summary="Create a message",
        description="Create a message in a ticket. If ticket doesn't exist, it will be created automatically.",
        request=CreateMessageSerializer,
        responses={201: MessageSerializer},
        tags=['Messages']
    )
    def create(self, request, *args, **kwargs):
        """Create a message with automatic ticket creation if needed"""
        # Use CreateMessageSerializer to validate input
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        
        with transaction.atomic():
            ticket_id = serializer.validated_data['ticket_id']
            message_text = serializer.validated_data['message']
            
            # Get or create ticket
            ticket, created = Ticket.objects.get_or_create(
                ticket_id=ticket_id,
                defaults={
                    'created_by': getattr(request.user, 'full_name', request.user.username)
                }
            )
            
            # Get user's primary role for storage
            user_role = None
            roles = getattr(request.user, 'roles', [])
            if roles:
                # Get the first relevant role for this system
                for role in roles:
                    if isinstance(role, dict):
                        if role.get('system') in ['tts', 'hdts']:  # Only store relevant system roles
                            user_role = f"{role.get('system', '').upper()}: {role.get('role', '')}"
                            break
                    elif isinstance(role, str) and ':' in role:
                        parts = role.split(':', 1)
                        if parts[0] in ['tts', 'hdts']:
                            user_role = f"{parts[0].upper()}: {parts[1]}"
                            break
            
            # Create message
            message = Message.objects.create(
                ticket_id=ticket,
                sender=getattr(request.user, 'full_name', request.user.username),
                sender_role=user_role,
                user_id=getattr(request.user, 'user_id', getattr(request.user, 'id', None)),
                message=message_text
            )
            
            # Handle file attachments
            files = request.FILES.getlist('attachments')
            for file in files:
                attachment = MessageAttachment.objects.create(
                    filename=file.name,
                    file=file,
                    content_type=file.content_type or 'application/octet-stream',
                    user_id=str(getattr(request.user, 'user_id', getattr(request.user, 'id', None)))
                )
                message.attachments.add(attachment)
            
            # Update ticket timestamp
            ticket.save()
            
            # Broadcast via WebSocket
            try:
                from .websocket_utils import broadcast_message
                broadcast_message(ticket.ticket_id, {
                    'type': 'message_sent',
                    'message': MessageSerializer(message, context={'request': request}).data
                })
            except ImportError:
                pass  # WebSocket utils not available
            
            # Return response using MessageSerializer
            response_serializer = MessageSerializer(message, context={'request': request})
            return Response(response_serializer.data, status=status.HTTP_201_CREATED)

    @extend_schema(
        summary="Get messages by ticket ID",
        description="Retrieve all messages for a specific ticket.",
        responses={200: MessageSerializer(many=True)},
        tags=['Messages']
    )
    @action(detail=False, methods=['get'], url_path='by-ticket')
    def by_ticket(self, request):
        """Get messages by ticket ID"""
        ticket_id = request.query_params.get('ticket_id')
        
        if not ticket_id:
            return Response(
                {'error': 'ticket_id parameter is required'}, 
                status=status.HTTP_400_BAD_REQUEST
            )
        
        try:
            ticket = Ticket.objects.get(ticket_id=ticket_id)
            messages = ticket.messages.filter(is_deleted=False)
            serializer = MessageSerializer(messages, many=True, context={'request': request})
            
            return Response({
                "ticket_id": ticket.ticket_id,
                "ticket_status": ticket.status,
                "messages": serializer.data
            }, status=status.HTTP_200_OK)
            
        except Ticket.DoesNotExist:
            return Response(
                {'error': 'Ticket not found'}, 
                status=status.HTTP_404_NOT_FOUND
            )

    @extend_schema(
        summary="Edit a message",
        description="Edit the content of an existing message. Only the message author can edit their own messages.",
        responses={200: MessageSerializer},
        tags=['Messages']
    )
    def update(self, request, *args, **kwargs):
        """Edit an existing message"""
        message = self.get_object()
        
        # Check if user is the author of the message
        if message.sender != getattr(request.user, 'full_name', request.user.username):
            return Response(
                {'error': 'You can only edit your own messages'}, 
                status=status.HTTP_403_FORBIDDEN
            )
        
        new_message = request.data.get('message')
        if not new_message:
            return Response(
                {'error': 'message field is required'}, 
                status=status.HTTP_400_BAD_REQUEST
            )
        
        message.edit_message(
            new_message=new_message,
            edited_by=getattr(request.user, 'full_name', request.user.username),
            edited_by_email=getattr(request.user, 'email', '')
        )
        
        # Broadcast via WebSocket
        try:
            from .websocket_utils import broadcast_message
            broadcast_message(message.ticket_id.ticket_id, {
                'type': 'message_edited',
                'message': MessageSerializer(message, context={'request': request}).data
            })
        except ImportError:
            pass  # WebSocket utils not available
        
        serializer = MessageSerializer(message, context={'request': request})
        return Response(serializer.data)

    @extend_schema(
        summary="Delete a message",
        description="Soft delete a message. Only the message author can delete their own messages.",
        responses={200: {'description': 'Message deleted successfully'}},
        tags=['Messages']
    )
    def destroy(self, request, *args, **kwargs):
        """Soft delete a message"""
        message = self.get_object()
        
        # Check if user is the author of the message
        if message.sender != getattr(request.user, 'full_name', request.user.username):
            return Response(
                {'error': 'You can only delete your own messages'}, 
                status=status.HTTP_403_FORBIDDEN
            )
        
        message.soft_delete(
            deleted_by=getattr(request.user, 'full_name', request.user.username),
            deleted_by_email=getattr(request.user, 'email', '')
        )
        
        # Broadcast via WebSocket
        try:
            from .websocket_utils import broadcast_message
            broadcast_message(message.ticket_id.ticket_id, {
                'type': 'message_deleted',
                'message_id': message.message_id
            })
        except ImportError:
            pass  # WebSocket utils not available
        
        return Response({"status": "Message deleted successfully"})


class ReactionViewSet(viewsets.ViewSet):
    """
    ViewSet for managing message reactions
    """
    permission_classes = [SystemRolePermission]
    
    # Define system and role requirements for this viewset
    required_system_roles = {
        'tts': ['Admin', 'Agent', 'Budget Manager', 'Asset Manager'],
        'hdts': ['Employee', 'Ticket Coordinator', 'Admin']
    }

    @extend_schema(
        summary="Add reaction to message",
        description="Add an emoji reaction to a message.",
        responses={201: MessageReactionSerializer},
        tags=['Reactions']
    )
    @action(detail=False, methods=['post'])
    def add(self, request):
        """Add a reaction to a message"""
        message_id = request.data.get('message_id')
        reaction = request.data.get('reaction')
        
        if not message_id or not reaction:
            return Response(
                {'error': 'message_id and reaction are required'}, 
                status=status.HTTP_400_BAD_REQUEST
            )
        
        try:
            message = Message.objects.get(message_id=message_id, is_deleted=False)
        except Message.DoesNotExist:
            return Response(
                {'error': 'Message not found'}, 
                status=status.HTTP_404_NOT_FOUND
            )
        
        user = getattr(request.user, 'full_name', request.user.username)
        user_id = str(getattr(request.user, 'user_id', getattr(request.user, 'id', None)))
        
        # Remove existing reaction of same type from same user (toggle behavior)
        MessageReaction.objects.filter(
            message=message,
            user_id=user_id,
            reaction=reaction
        ).delete()
        
        # Add new reaction
        reaction_obj = MessageReaction.objects.create(
            message=message,
            user=user,
            user_id=user_id,
            user_full_name=getattr(request.user, 'full_name', request.user.username),
            reaction=reaction
        )
        
        # Broadcast via WebSocket
        try:
            from .websocket_utils import broadcast_message
            broadcast_message(message.ticket_id.ticket_id, {
                'type': 'reaction_added',
                'message_id': message.message_id,
                'reaction': MessageReactionSerializer(reaction_obj).data
            })
        except ImportError:
            pass  # WebSocket utils not available
        
        return Response(MessageReactionSerializer(reaction_obj).data, status=status.HTTP_201_CREATED)

    @extend_schema(
        summary="Remove reaction from message",
        description="Remove an emoji reaction from a message.",
        responses={200: {'description': 'Reaction removed successfully'}},
        tags=['Reactions']
    )
    @action(detail=False, methods=['post'])
    def remove(self, request):
        """Remove a reaction from a message"""
        message_id = request.data.get('message_id')
        reaction = request.data.get('reaction')
        
        if not message_id or not reaction:
            return Response(
                {'error': 'message_id and reaction are required'}, 
                status=status.HTTP_400_BAD_REQUEST
            )
        
        try:
            message = Message.objects.get(message_id=message_id, is_deleted=False)
        except Message.DoesNotExist:
            return Response(
                {'error': 'Message not found'}, 
                status=status.HTTP_404_NOT_FOUND
            )
        
        user = getattr(request.user, 'full_name', request.user.username)
        user_id = str(getattr(request.user, 'user_id', getattr(request.user, 'id', None)))
        
        try:
            reaction_obj = MessageReaction.objects.get(
                message=message,
                user_id=user_id,
                reaction=reaction
            )
            reaction_obj.delete()
            
            # Broadcast via WebSocket
            try:
                from .websocket_utils import broadcast_message
                broadcast_message(message.ticket_id.ticket_id, {
                    'type': 'reaction_removed',
                    'message_id': message.message_id,
                    'user': user,
                    'reaction': reaction
                })
            except ImportError:
                pass  # WebSocket utils not available
            
            return Response({"status": "Reaction removed successfully"})
        except MessageReaction.DoesNotExist:
            return Response({"error": "Reaction not found"}, status=status.HTTP_404_NOT_FOUND)


class AttachmentViewSet(viewsets.ReadOnlyModelViewSet):
    """
    ViewSet for managing file attachments
    """
    queryset = MessageAttachment.objects.all()
    serializer_class = MessageAttachmentSerializer
    lookup_field = 'attachment_id'
    permission_classes = [SystemRolePermission]
    
    # Define system and role requirements for this viewset
    required_system_roles = {
        'tts': ['Admin', 'Agent', 'Budget Manager', 'Asset Manager'],
        'hdts': ['Employee', 'Ticket Coordinator', 'Admin']
    }

    @extend_schema(
        summary="Download attachment",
        description="Download a file attachment by attachment ID.",
        responses={200: {'description': 'File download'}},
        tags=['Attachments']
    )
    @action(detail=True, methods=['get'])
    def download(self, request, attachment_id=None):
        """Download a file attachment"""
        attachment = self.get_object()
        
        response = FileResponse(
            attachment.file.open('rb'),
            as_attachment=True,
            filename=attachment.filename
        )
        response['Content-Type'] = attachment.content_type
        return response
