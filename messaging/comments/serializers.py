from rest_framework import serializers
from .models import Comment, CommentRating
from tickets.models import Ticket

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
    
    class Meta:
        model = Comment
        fields = ['comment_id', 'ticket_id', 'user_id', 'firstname', 'lastname', 'role', 
                 'content', 'created_at', 'thumbs_up_count', 'thumbs_down_count', 'ratings_summary']
        read_only_fields = ['comment_id', 'created_at', 'thumbs_up_count', 'thumbs_down_count', 'ticket_id']
    
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
    
    class Meta:
        model = Comment
        fields = ['comment_id', 'ticket_id', 'user_id', 'firstname', 'lastname', 'role', 
                 'content', 'created_at', 'parent', 'thumbs_up_count', 'thumbs_down_count', 
                 'replies', 'ratings_summary']
        read_only_fields = ['comment_id', 'created_at', 'thumbs_up_count', 'thumbs_down_count', 'replies']
    
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
        return representation
    
    def validate_ticket_id(self, value):
        return value
    
    def create(self, validated_data):
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
        return super().create(validated_data)