from rest_framework import serializers
from .models import Ticket, Message


class MessageSerializer(serializers.ModelSerializer):
    class Meta:
        model = Message
        fields = ['message_id', 'sender', 'message', 'created_at']
        read_only_fields = ['message_id', 'created_at']


class TicketSerializer(serializers.ModelSerializer):
    messages = MessageSerializer(many=True, read_only=True)
    
    class Meta:
        model = Ticket
        fields = ['ticket_id', 'status', 'created_at', 'updated_at', 'messages']
        read_only_fields = ['ticket_id', 'created_at', 'updated_at', 'messages']


class SendMessageSerializer(serializers.Serializer):
    ticket_id = serializers.CharField(max_length=20)
    sender = serializers.CharField(max_length=255)
    message = serializers.CharField()
    
    def validate_ticket_id(self, value):
        try:
            ticket = Ticket.objects.get(ticket_id=value, status='open')
            return value
        except Ticket.DoesNotExist:
            raise serializers.ValidationError("Ticket not found or is closed.")


class FetchMessagesSerializer(serializers.Serializer):
    ticket_id = serializers.CharField(max_length=20)
    after_message_id = serializers.CharField(max_length=20, required=False, allow_blank=True)
    
    def validate_ticket_id(self, value):
        try:
            ticket = Ticket.objects.get(ticket_id=value)
            return value
        except Ticket.DoesNotExist:
            raise serializers.ValidationError("Ticket not found.")


class CloseTicketSerializer(serializers.Serializer):
    ticket_id = serializers.CharField(max_length=20)
    
    def validate_ticket_id(self, value):
        try:
            ticket = Ticket.objects.get(ticket_id=value, status='open')
            return value
        except Ticket.DoesNotExist:
            raise serializers.ValidationError("Ticket not found or already closed.")