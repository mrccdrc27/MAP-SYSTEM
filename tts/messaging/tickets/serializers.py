from rest_framework import serializers
from .models import Ticket, Message, MessageAttachment, MessageReaction


class MessageAttachmentSerializer(serializers.ModelSerializer):
    file_url = serializers.SerializerMethodField()
    
    class Meta:
        model = MessageAttachment
        fields = ['attachment_id', 'filename', 'file_url', 'file_size', 'content_type', 'user_id', 'created_at']
        read_only_fields = ['attachment_id', 'file_size', 'content_type', 'created_at']
    
    def get_file_url(self, obj):
        if obj.file:
            request = self.context.get('request')
            if request:
                return request.build_absolute_uri(obj.file.url)
            return obj.file.url
        return None


class MessageReactionSerializer(serializers.ModelSerializer):
    class Meta:
        model = MessageReaction
        fields = ['reaction', 'user', 'user_id', 'user_full_name', 'created_at']
        read_only_fields = ['created_at']


class MessageSerializer(serializers.ModelSerializer):
    ticket_id = serializers.CharField(source='ticket_id.ticket_id', read_only=True)
    attachments = MessageAttachmentSerializer(many=True, read_only=True)
    reactions = MessageReactionSerializer(many=True, read_only=True)
    reaction_counts = serializers.SerializerMethodField()
    sender_role = serializers.SerializerMethodField()
    
    class Meta:
        model = Message
        fields = [
            'message_id', 'ticket_id', 'sender', 'sender_role', 'user_id', 'message', 'created_at', 'updated_at',
            'is_edited', 'edited_at', 'is_deleted', 'deleted_at',
            'attachments', 'reactions', 'reaction_counts'
        ]
        read_only_fields = [
            'message_id', 'ticket_id', 'sender', 'sender_role', 'user_id', 'created_at', 'updated_at', 'is_edited', 
            'edited_at', 'is_deleted', 'deleted_at'
        ]
    
    def get_reaction_counts(self, obj):
        """Get count of each reaction type"""
        reactions = obj.reactions.all()
        counts = {}
        for reaction in reactions:
            emoji = reaction.reaction
            if emoji in counts:
                counts[emoji] += 1
            else:
                counts[emoji] = 1
        return counts

    def get_sender_role(self, obj):
        """Get the sender's role information from the stored field"""
        return obj.sender_role


class CreateMessageSerializer(serializers.Serializer):
    ticket_id = serializers.CharField(max_length=20)
    message = serializers.CharField()
    attachments = serializers.ListField(
        child=serializers.FileField(),
        required=False,
        allow_empty=True,
        write_only=True
    )
    
    def validate_ticket_id(self, value):
        # Just validate format, we'll create ticket if it doesn't exist
        if not value.strip():
            raise serializers.ValidationError("Ticket ID cannot be empty.")
        return value


class TicketMessageSerializer(serializers.ModelSerializer):
    messages = serializers.SerializerMethodField()
    
    class Meta:
        model = Ticket
        fields = ['ticket_id', 'status', 'created_by', 'created_at', 'updated_at', 'messages']
        read_only_fields = ['ticket_id', 'created_at', 'updated_at', 'messages']
    
    def get_messages(self, obj):
        # Filter out deleted messages for regular users
        messages = obj.messages.filter(is_deleted=False).order_by('created_at')
        return MessageSerializer(messages, many=True, context=self.context).data