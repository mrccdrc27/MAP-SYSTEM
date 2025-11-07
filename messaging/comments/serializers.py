from rest_framework import serializers
from django.conf import settings
from .models import Comment, CommentRating, DocumentStorage, CommentDocument
from tickets.models import Ticket

class DocumentStorageSerializer(serializers.ModelSerializer):
    download_url = serializers.SerializerMethodField()
    image_info = serializers.SerializerMethodField()
    
    class Meta:
        model = DocumentStorage
        fields = ['id', 'file_hash', 'original_filename', 'file_size', 'content_type', 
                 'uploaded_at', 'uploaded_by_name', 'download_url', 'is_image', 
                 'image_width', 'image_height', 'image_ratio', 'image_info']
        read_only_fields = ['id', 'file_hash', 'uploaded_at', 'uploaded_by_name', 
                           'is_image', 'image_width', 'image_height', 'image_ratio']
    
    def get_download_url(self, obj):
        request = self.context.get('request')
        if request and obj.file_path:
            # Use request context when available (REST API calls)
            return request.build_absolute_uri(obj.file_path.url)
        elif obj.file_path:
            # Fallback for WebSocket messages - construct URL manually
            # You may need to adjust this based on your deployment setup
            base_url = getattr(settings, 'MEDIA_BASE_URL', 'http://localhost:8005')
            if hasattr(obj.file_path, 'url'):
                return f"{base_url}{obj.file_path.url}"
            else:
                # If file_path doesn't have url attribute, construct it manually
                return f"{base_url}/media/{obj.file_path}"
        return None
    
    def get_image_info(self, obj):
        """
        Provide formatted image information for display purposes
        """
        if not obj.is_image:
            return None
        
        info = {
            'dimensions': f"{obj.image_width}x{obj.image_height}" if obj.image_width and obj.image_height else None,
            'ratio': obj.image_ratio,
            'orientation': None
        }
        
        # Determine orientation
        if obj.image_ratio:
            if obj.image_ratio > 1:
                info['orientation'] = 'landscape'
            elif obj.image_ratio < 1:
                info['orientation'] = 'portrait'
            else:
                info['orientation'] = 'square'
        
        return info

class CommentDocumentSerializer(serializers.ModelSerializer):
    document = DocumentStorageSerializer(read_only=True)
    
    class Meta:
        model = CommentDocument
        fields = ['id', 'document', 'attached_at', 'attached_by_name']
        read_only_fields = ['id', 'attached_at', 'attached_by_name']

class CommentRatingSerializer(serializers.ModelSerializer):
    class Meta:
        model = CommentRating
        fields = ['id', 'user_id', 'firstname', 'lastname', 'role', 'rating', 'created_at']
        read_only_fields = ['created_at']
        
    def validate_rating(self, value):
        """
        Check that rating is a boolean value (True/1 or False/0)
        """
        if not isinstance(value, bool) and value not in [0, 1]:
            raise serializers.ValidationError("Rating must be a boolean value (True/1 or False/0)")
        return value

class ReplySerializer(serializers.ModelSerializer):
    ratings_summary = serializers.SerializerMethodField()
    ticket_id = serializers.SerializerMethodField()
    documents = CommentDocumentSerializer(many=True, read_only=True)
    
    class Meta:
        model = Comment
        fields = ['comment_id', 'ticket_id', 'user_id', 'firstname', 'lastname', 'role', 
                 'content', 'created_at', 'thumbs_up_count', 'thumbs_down_count', 'ratings_summary', 'documents']
        read_only_fields = ['comment_id', 'created_at', 'thumbs_up_count', 'thumbs_down_count', 'ticket_id', 'documents']
    
    def get_ratings_summary(self, obj):
        return {
            'thumbs_up': obj.thumbs_up_count,
            'thumbs_down': obj.thumbs_down_count
        }
        
    def get_ticket_id(self, obj):
        return obj.ticket.ticket_id if obj.ticket else None

class CommentSerializer(serializers.ModelSerializer):
    replies = ReplySerializer(many=True, read_only=True)
    ratings_summary = serializers.SerializerMethodField()
    ticket_id = serializers.CharField(required=False)
    parent = serializers.PrimaryKeyRelatedField(
        queryset=Comment.objects.all(),
        required=False,
        allow_null=True
    )
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
                 'replies', 'ratings_summary', 'documents', 
                 'document1', 'document2', 'document3', 'document4', 'document5']
        read_only_fields = ['comment_id', 'created_at', 'thumbs_up_count', 'thumbs_down_count', 'replies', 'documents']
    
    def get_ratings_summary(self, obj):
        return {
            'thumbs_up': obj.thumbs_up_count,
            'thumbs_down': obj.thumbs_down_count
        }
    
    def validate(self, data):
        # Ensure all required user fields are present
        required_fields = ['user_id', 'firstname', 'lastname', 'role']
        for field in required_fields:
            if field not in data:
                raise serializers.ValidationError({field: "This field is required"})
        return data
    
    def validate_parent(self, value):
        if value is not None:
            if value.parent is not None:
                raise serializers.ValidationError("Cannot reply to a reply")
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