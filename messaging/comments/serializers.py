from rest_framework import serializers
from .models import Comment, CommentRating
from tickets.models import Ticket

class CommentRatingSerializer(serializers.ModelSerializer):
    class Meta:
        model = CommentRating
        fields = ['id', 'user_id', 'rating', 'created_at']
        read_only_fields = ['created_at']

class ReplySerializer(serializers.ModelSerializer):
    ratings_summary = serializers.SerializerMethodField()
    ticket_id = serializers.SerializerMethodField()
    
    class Meta:
        model = Comment
        fields = ['comment_id', 'ticket_id', 'user_id', 'content', 'created_at', 
                 'thumbs_up_count', 'thumbs_down_count', 'ratings_summary']
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
        fields = ['comment_id', 'ticket_id', 'user_id', 'content', 'created_at', 
                 'parent', 'thumbs_up_count', 'thumbs_down_count', 'replies', 'ratings_summary']
        read_only_fields = ['comment_id', 'created_at', 'thumbs_up_count', 'thumbs_down_count', 'replies']
    
    def get_ratings_summary(self, obj):
        return {
            'thumbs_up': obj.thumbs_up_count,
            'thumbs_down': obj.thumbs_down_count
        }
    
    def validate_parent(self, value):
        # Ensure parent comment exists and is not itself a reply
        if value is not None:
            if value.parent is not None:
                raise serializers.ValidationError("Cannot reply to a reply")
        return value
    
    def to_representation(self, instance):
        representation = super().to_representation(instance)
        # Replace ticket ID with ticket_id string
        representation['ticket_id'] = instance.ticket.ticket_id
        return representation
    
    def validate_ticket_id(self, value):
        # Ensure the ticket exists with the given ticket_id string
        try:
            Ticket.objects.get(ticket_id=value)
            return value
        except Ticket.DoesNotExist:
            raise serializers.ValidationError(f"Ticket with ID {value} not found")
    
    def create(self, validated_data):
        ticket_id_str = validated_data.pop('ticket_id', None)
        
        # Get the ticket object from the string ticket_id
        if ticket_id_str:
            try:
                ticket = Ticket.objects.get(ticket_id=ticket_id_str)
                validated_data['ticket'] = ticket
            except Ticket.DoesNotExist:
                raise serializers.ValidationError({"ticket_id": f"Ticket with ID {ticket_id_str} not found"})
        
        return super().create(validated_data)