from rest_framework import serializers
from django.conf import settings
from .models import Comment, CommentRating, DocumentStorage, CommentDocument
from tickets.models import Ticket

class DocumentStorageSerializer(serializers.ModelSerializer):
    download_url = serializers.SerializerMethodField()
    
    class Meta:
        model = DocumentStorage
        fields = ['id', 'original_filename', 'file_size', 'content_type', 
                 'uploaded_at', 'uploaded_by_name', 'is_image', 'image_width', 
                 'image_height', 'image_ratio', 'download_url']
    
    def get_download_url(self, obj):
        """Generate download URL for the document"""
        # Always use MEDIA_BASE_URL to ensure URLs go through Kong gateway
        # This avoids issues with request.build_absolute_uri() returning internal host URLs
        media_base_url = getattr(settings, 'MEDIA_BASE_URL', 'http://localhost:8080/messaging')
        return f"{media_base_url}/media/document/{obj.id}/"

class CommentDocumentSerializer(serializers.ModelSerializer):
    document = DocumentStorageSerializer(read_only=True)
    
    class Meta:
        model = CommentDocument
        fields = ['id', 'document', 'attached_at', 'attached_by_name']
        read_only_fields = ['id', 'attached_at', 'attached_by_name']

class CommentRatingSerializer(serializers.ModelSerializer):
    class Meta:
        model = CommentRating
        fields = ['id', 'comment', 'user_id', 'firstname', 'lastname', 'role', 'rating', 'created_at']
        read_only_fields = ['id', 'created_at']
    
    def create(self, validated_data):
        # Ensure comment is properly set from comment_id if provided
        if 'comment_id' in validated_data:
            validated_data['comment_id'] = validated_data.pop('comment_id')
        return super().create(validated_data)
        
    def validate_rating(self, value):
        """
        Check that rating is a boolean value (True/1 or False/0) or None for deletion
        """
        if value is None:
            return value  # Allow None for deletion
        if not isinstance(value, bool) and value not in [0, 1]:
            raise serializers.ValidationError("Rating must be a boolean value (True/1 or False/0) or null to remove")
        return value

class ReplySerializer(serializers.ModelSerializer):
    ratings_summary = serializers.SerializerMethodField()
    ratings = serializers.SerializerMethodField()  # Include individual ratings for frontend
    ticket_id = serializers.CharField(required=False)  # Add this to handle ticket_id input
    documents = CommentDocumentSerializer(many=True, read_only=True)
    # Add fields for reply creation - parent should be CharField, not FK
    parent = serializers.CharField(max_length=50, required=False, allow_null=True, help_text="Parent comment_id for replies")
    
    class Meta:
        model = Comment
        fields = ['comment_id', 'ticket_id', 'user_id', 'firstname', 'lastname', 'role', 
                 'content', 'created_at', 'parent', 'thumbs_up_count', 'thumbs_down_count', 
                 'ratings_summary', 'ratings', 'documents']
        read_only_fields = ['comment_id', 'created_at', 'thumbs_up_count', 'thumbs_down_count', 'documents']
    
    def get_ratings_summary(self, obj):
        return {
            'thumbs_up': obj.thumbs_up_count,
            'thumbs_down': obj.thumbs_down_count
        }
    
    def get_ratings(self, obj):
        """Return individual ratings for tracking user reactions"""
        # Use fresh query to avoid cached/stale data after rating changes
        from .models import CommentRating
        ratings = CommentRating.objects.filter(comment=obj)
        return CommentRatingSerializer(ratings, many=True).data
    
    def validate(self, data):
        # Only validate required fields if they're not already set
        if not data.get('content', '').strip():
            raise serializers.ValidationError({'content': 'This field is required'})
        return data
    
    def validate_parent(self, value):
        """Validate that parent comment_id exists and is not a reply itself"""
        if value:
            try:
                parent_comment = Comment.objects.get(comment_id=value)
                if parent_comment.parent:
                    raise serializers.ValidationError("Cannot reply to a reply. Parent comment must be a top-level comment.")
            except Comment.DoesNotExist:
                raise serializers.ValidationError(f"Parent comment with comment_id '{value}' does not exist.")
        return value
    
    def create(self, validated_data):
        """Create a reply comment"""
        ticket_id_str = validated_data.pop('ticket_id', None)
        
        if not ticket_id_str:
            raise serializers.ValidationError({"ticket_id": "This field is required"})
        
        # Get the ticket
        try:
            ticket = Ticket.objects.get(ticket_id=ticket_id_str)
        except Ticket.DoesNotExist:
            raise serializers.ValidationError({"ticket_id": f"Ticket with ID {ticket_id_str} not found"})
        
        validated_data['ticket'] = ticket
        return super().create(validated_data)

class CommentSerializer(serializers.ModelSerializer):
    replies = ReplySerializer(many=True, read_only=True)
    ratings_summary = serializers.SerializerMethodField()
    ratings = serializers.SerializerMethodField()  # Include individual ratings for frontend
    ticket_id = serializers.CharField(required=False)
    parent = serializers.CharField(max_length=50, required=False, allow_null=True, help_text="Parent comment_id for replies")
    documents = CommentDocumentSerializer(many=True, read_only=True)
    # Replace ListField with individual FileFields for better HTML form compatibility
    document1 = serializers.FileField(write_only=True, required=False, help_text="Upload document 1 (optional)")
    document2 = serializers.FileField(write_only=True, required=False, help_text="Upload document 2 (optional)")
    document3 = serializers.FileField(write_only=True, required=False, help_text="Upload document 3 (optional)")
    document4 = serializers.FileField(write_only=True, required=False, help_text="Upload document 4 (optional)")
    document5 = serializers.FileField(write_only=True, required=False, help_text="Upload document 5 (optional)")
    
    class Meta:
        model = Comment
        fields = ['comment_id', 'ticket_id', 'user_id', 'firstname', 'lastname', 'role', 
                 'content', 'created_at', 'parent', 'thumbs_up_count', 'thumbs_down_count', 
                 'replies', 'ratings_summary', 'ratings', 'documents', 
                 'document1', 'document2', 'document3', 'document4', 'document5']
        read_only_fields = ['comment_id', 'created_at', 'thumbs_up_count', 'thumbs_down_count', 'replies', 'documents']
    
    def get_ratings_summary(self, obj):
        return {
            'thumbs_up': obj.thumbs_up_count,
            'thumbs_down': obj.thumbs_down_count
        }
    
    def get_ratings(self, obj):
        """Return individual ratings for tracking user reactions"""
        # Use fresh query to avoid cached/stale data after rating changes
        from .models import CommentRating
        ratings = CommentRating.objects.filter(comment=obj)
        return CommentRatingSerializer(ratings, many=True).data
    
    def validate(self, data):
        # More flexible validation - only check for required fields if they're missing
        # The viewset will inject user data, so we shouldn't always require them
        if not data.get('content', '').strip():
            raise serializers.ValidationError({'content': 'This field is required'})
        
        # Only validate user fields if they're provided but empty
        user_fields = ['user_id', 'firstname', 'lastname', 'role']
        missing_fields = []
        
        for field in user_fields:
            if field in data and not data[field]:
                missing_fields.append(field)
        
        if missing_fields:
            errors = {field: "This field cannot be empty" for field in missing_fields}
            raise serializers.ValidationError(errors)
            
        return data
    
    def validate_parent(self, value):
        """Validate that parent comment_id exists and is not a reply itself"""
        if value:
            try:
                parent_comment = Comment.objects.get(comment_id=value)
                if parent_comment.parent:
                    raise serializers.ValidationError("Cannot reply to a reply. Parent comment must be a top-level comment.")
            except Comment.DoesNotExist:
                raise serializers.ValidationError(f"Parent comment with comment_id '{value}' does not exist.")
        return value
    
    def to_representation(self, instance):
        representation = super().to_representation(instance)
        representation['ticket_id'] = instance.ticket.ticket_id
        # Remove document fields from output
        for i in range(1, 6):
            representation.pop(f'document{i}', None)
        return representation
    
    def validate_ticket_id(self, value):
        return value
    
    def create(self, validated_data):
        # Extract document fields before creating the comment
        document_files = []
        for i in range(1, 6):
            doc_field = f'document{i}'
            if doc_field in validated_data:
                doc_file = validated_data.pop(doc_field)
                if doc_file:
                    document_files.append(doc_file)
        
        ticket_id_str = validated_data.pop('ticket_id', None)
        
        if not ticket_id_str:
            raise serializers.ValidationError({"ticket_id": "This field is required"})
        
        ticket = None
        try:
            ticket = Ticket.objects.get(ticket_id=ticket_id_str)
        except Ticket.DoesNotExist:
            if not ticket_id_str.startswith('T'):
                ticket_id_str = f"T{ticket_id_str}"
            ticket = Ticket.objects.create(ticket_id=ticket_id_str, status='open')
        
        validated_data['ticket'] = ticket
        comment = super().create(validated_data)
        
        # Handle document uploads if any
        if document_files:
            user_id = validated_data.get('user_id')
            firstname = validated_data.get('firstname')
            lastname = validated_data.get('lastname')
            
            for file_obj in document_files:
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
        
        return comment