from channels.layers import get_channel_layer
from asgiref.sync import async_to_sync
from datetime import datetime
from .models import Comment, CommentDocument, DocumentStorage
from .serializers import CommentSerializer
import logging

logger = logging.getLogger(__name__)


class CommentNotificationService:
    """
    Service class for handling comment notifications via WebSocket
    """
    
    def __init__(self):
        self.channel_layer = get_channel_layer()
    
    def send_notification(self, comment, action='create', **kwargs):
        """Send WebSocket notification for comment updates"""
        if not self.channel_layer:
            logger.warning("Channel layer not available for WebSocket notifications")
            return
        
        try:
            ticket_id = comment.ticket.ticket_id
            room_group_name = f'comments_{ticket_id}'
            
            # Prepare the message data based on action type
            message_data = self._prepare_message_data(comment, action, **kwargs)
            
            # Send the message to the WebSocket group
            async_to_sync(self.channel_layer.group_send)(
                room_group_name,
                message_data
            )
            
            logger.info(f"WebSocket notification sent for {action} on comment {comment.id}")
            
        except Exception as e:
            logger.error(f"Failed to send WebSocket notification for {action}: {str(e)}")
    
    def _prepare_message_data(self, comment, action, **kwargs):
        """Prepare message data based on the action type"""
        base_data = {
            'type': f'comment_{action}',
            'timestamp': datetime.now().isoformat(),
        }
        
        # Handle different action types
        if action == 'delete':
            # For delete, we only need the comment ID since the object might be deleted
            base_data.update({
                'message': {
                    'id': comment.id,
                    'comment_id': getattr(comment, 'comment_id', comment.id),
                    'ticket_id': comment.ticket.ticket_id
                },
                'action': action,
                'deleted_comment_id': comment.id
            })
        
        elif action == 'rate':
            # For rating, include the updated comment with rating info
            serializer = CommentSerializer(comment)
            rating_data = kwargs.get('rating_data', {})
            base_data.update({
                'message': serializer.data,
                'action': action,
                'rating_data': rating_data
            })
        
        elif action in ['attach_document', 'detach_document']:
            # For document operations, include document info
            serializer = CommentSerializer(comment)
            document_info = kwargs.get('document_info', {})
            base_data.update({
                'message': serializer.data,
                'action': action,
                'document_info': document_info
            })
        
        else:
            # For create, update, reply - include full comment data
            serializer = CommentSerializer(comment)
            base_data.update({
                'message': serializer.data,
                'action': action
            })
        
        return base_data
    
    def send_comment_create(self, comment):
        """Send notification for comment creation"""
        self.send_notification(comment, 'create')
    
    def send_comment_update(self, comment):
        """Send notification for comment update"""
        self.send_notification(comment, 'update')
    
    def send_comment_delete(self, comment):
        """Send notification for comment deletion"""
        self.send_notification(comment, 'delete')
    
    def send_comment_reply(self, reply_comment):
        """Send notification for comment reply"""
        self.send_notification(reply_comment, 'reply')
    
    def send_comment_rate(self, comment, rating_data=None):
        """Send notification for comment rating"""
        self.send_notification(comment, 'rate', rating_data=rating_data)
    
    def send_document_attach(self, comment, document_info=None):
        """Send notification for document attachment"""
        self.send_notification(comment, 'attach_document', document_info=document_info)
    
    def send_document_detach(self, comment, document_info=None):
        """Send notification for document detachment"""
        self.send_notification(comment, 'detach_document', document_info=document_info)


class DocumentAttachmentService:
    """
    Service class for handling document attachments to comments
    """
    
    @staticmethod
    def attach_files_to_comment(comment, files, user_data):
        """
        Helper method to attach files to a comment after creation
        """
        user_id = user_data.get('user_id')
        firstname = user_data.get('firstname')
        lastname = user_data.get('lastname')
        
        attached_documents = []
        errors = []
        
        for file_obj in files:
            try:
                # Only process files with actual content
                if file_obj and hasattr(file_obj, 'size') and file_obj.size > 0:
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
                # Log error but don't fail the comment creation
                logger.error(f"Error attaching document {file_obj.name}: {str(e)}")
                errors.append(f"Error uploading {file_obj.name}: {str(e)}")
        
        return attached_documents, errors
    
    @staticmethod
    def handle_document_attachments(request, comment, data):
        """
        Helper method to handle document attachments for comments
        """
        files = request.FILES.getlist('documents')
        user_data = {
            'user_id': data.get('user_id'),
            'firstname': data.get('firstname'),
            'lastname': data.get('lastname')
        }
        
        return DocumentAttachmentService.attach_files_to_comment(comment, files, user_data)


class CommentService:
    """
    Service class for comment-related business logic
    """
    
    @staticmethod
    def extract_user_data_from_jwt(user):
        """Extract user data from JWT token"""
        return {
            'user_id': user.user_id,
            'firstname': user.full_name.split(' ')[0] if user.full_name else user.username,
            'lastname': user.full_name.split(' ', 1)[1] if user.full_name and ' ' in user.full_name else '',
            'role': user.get_systems()[0] if user.get_systems() else 'User'
        }
    
    @staticmethod
    def create_comment_with_attachments(validated_data, files, user_data):
        """Create a comment with file attachments"""
        # Create comment with JWT user data
        comment = Comment.objects.create(
            ticket_id=validated_data['ticket_id'],
            user_id=user_data['user_id'],
            firstname=user_data['firstname'],
            lastname=user_data['lastname'],
            role=user_data['role'],
            text=validated_data['text']
        )
        
        # Handle attachments using the correct models
        for file in files:
            # Create or get existing document with deduplication
            document, created = DocumentStorage.create_from_file(
                file, user_data['user_id'], user_data['firstname'], user_data['lastname']
            )
            
            # Attach document to comment
            CommentDocument.objects.create(
                comment=comment,
                document=document,
                attached_by_user_id=user_data['user_id'],
                attached_by_name=f"{user_data['firstname']} {user_data['lastname']}"
            )
        
        return comment