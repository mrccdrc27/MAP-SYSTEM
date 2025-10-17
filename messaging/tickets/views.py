from rest_framework import status
from rest_framework.decorators import api_view
from rest_framework.response import Response
from django.shortcuts import get_object_or_404
from drf_spectacular.utils import extend_schema, OpenApiParameter, OpenApiExample
from drf_spectacular.types import OpenApiTypes
from .models import Ticket, Message
from .serializers import (
    TicketSerializer, MessageSerializer, SendMessageSerializer,
    FetchMessagesSerializer, CloseTicketSerializer
)


@extend_schema(
    summary="Open a new ticket",
    description="Start a new conversation by creating a ticket. Returns a unique ticket ID.",
    responses={
        201: {
            'description': 'Ticket created successfully',
            'examples': {
                'application/json': {
                    "ticket_id": "T12345",
                    "status": "open"
                }
            }
        }
    },
    tags=['Tickets']
)
@api_view(['POST'])
def open_ticket(request):
    """
    Open a new ticket (start a conversation)
    """
    ticket = Ticket.objects.create()
    
    return Response({
        "ticket_id": ticket.ticket_id,
        "status": ticket.status
    }, status=status.HTTP_201_CREATED)


@extend_schema(
    summary="Send a message",
    description="Send a message to an existing open ticket. Multiple users can send messages to the same ticket.",
    request={
        'application/json': {
            'type': 'object',
            'properties': {
                'ticket_id': {'type': 'string', 'example': 'T12345'},
                'sender': {'type': 'string', 'example': 'UserA'},
                'message': {'type': 'string', 'example': 'Hello, I need help with my account.'}
            },
            'required': ['ticket_id', 'sender', 'message']
        }
    },
    responses={
        201: {
            'description': 'Message sent successfully',
            'examples': {
                'application/json': {
                    "ticket_id": "T12345",
                    "message_id": "M001",
                    "status": "delivered"
                }
            }
        },
        400: {
            'description': 'Invalid request or ticket closed',
            'examples': {
                'application/json': {
                    "error": "Ticket not found or is closed."
                }
            }
        }
    },
    tags=['Messages']
)
@api_view(['POST'])
def send_message(request):
    """
    Send a message to an existing ticket
    """
    serializer = SendMessageSerializer(data=request.data)
    if serializer.is_valid():
        ticket = Ticket.objects.get(ticket_id=serializer.validated_data['ticket_id'])
        
        message = Message.objects.create(
            ticket=ticket,
            sender=serializer.validated_data['sender'],
            message=serializer.validated_data['message']
        )
        
        # Update ticket timestamp
        ticket.save()
        
        return Response({
            "ticket_id": ticket.ticket_id,
            "message_id": message.message_id,
            "status": "delivered"
        }, status=status.HTTP_201_CREATED)
    
    return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


@extend_schema(
    summary="Fetch messages from ticket",
    description="Retrieve all messages from a ticket, optionally filtering messages after a specific message ID.",
    request={
        'application/json': {
            'type': 'object',
            'properties': {
                'ticket_id': {'type': 'string', 'example': 'T12345'},
                'after_message_id': {'type': 'string', 'example': 'M001', 'required': False}
            },
            'required': ['ticket_id']
        }
    },
    responses={
        200: {
            'description': 'Messages retrieved successfully',
            'examples': {
                'application/json': {
                    "ticket_id": "T12345",
                    "messages": [
                        {
                            "message_id": "M002",
                            "sender": "SupportAgent", 
                            "message": "Hello! Can you provide more details?",
                            "created_at": "2025-09-27T10:30:00Z"
                        }
                    ]
                }
            }
        },
        400: {
            'description': 'Invalid request',
            'examples': {
                'application/json': {
                    "error": "Ticket not found."
                }
            }
        }
    },
    tags=['Messages']
)
@api_view(['POST'])
def fetch_messages(request):
    """
    Fetch messages for a ticket, optionally after a specific message_id
    """
    serializer = FetchMessagesSerializer(data=request.data)
    if serializer.is_valid():
        ticket = Ticket.objects.get(ticket_id=serializer.validated_data['ticket_id'])
        messages = ticket.messages.all()
        
        # Filter messages after the specified message_id if provided
        after_message_id = serializer.validated_data.get('after_message_id')
        if after_message_id:
            try:
                after_message = messages.get(message_id=after_message_id)
                messages = messages.filter(created_at__gt=after_message.created_at)
            except Message.DoesNotExist:
                pass  # If message_id doesn't exist, return all messages
        
        message_serializer = MessageSerializer(messages, many=True)
        
        return Response({
            "ticket_id": ticket.ticket_id,
            "messages": message_serializer.data
        }, status=status.HTTP_200_OK)
    
    return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


@extend_schema(
    summary="Close a ticket",
    description="Close an existing open ticket to end the conversation.",
    request={
        'application/json': {
            'type': 'object',
            'properties': {
                'ticket_id': {'type': 'string', 'example': 'T12345'}
            },
            'required': ['ticket_id']
        }
    },
    responses={
        200: {
            'description': 'Ticket closed successfully',
            'examples': {
                'application/json': {
                    "ticket_id": "T12345",
                    "status": "closed"
                }
            }
        },
        400: {
            'description': 'Invalid request or ticket not found',
            'examples': {
                'application/json': {
                    "error": "Ticket not found or already closed."
                }
            }
        }
    },
    tags=['Tickets']
)
@api_view(['POST'])
def close_ticket(request):
    """
    Close an existing ticket
    """
    serializer = CloseTicketSerializer(data=request.data)
    if serializer.is_valid():
        ticket = Ticket.objects.get(ticket_id=serializer.validated_data['ticket_id'])
        ticket.status = 'closed'
        ticket.save()
        
        return Response({
            "ticket_id": ticket.ticket_id,
            "status": ticket.status
        }, status=status.HTTP_200_OK)
    
    return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


@extend_schema(
    summary="Get ticket details",
    description="Retrieve complete ticket information including all messages.",
    parameters=[
        OpenApiParameter(
            name='ticket_id',
            type=OpenApiTypes.STR,
            location=OpenApiParameter.PATH,
            description='Unique ticket identifier',
            examples=[
                OpenApiExample('Example ticket ID', value='T12345')
            ]
        )
    ],
    responses={
        200: {
            'description': 'Ticket details retrieved successfully',
            'examples': {
                'application/json': {
                    "ticket_id": "T12345",
                    "status": "open",
                    "created_at": "2025-09-27T10:00:00Z",
                    "updated_at": "2025-09-27T10:30:00Z",
                    "messages": [
                        {
                            "message_id": "M001",
                            "sender": "UserA",
                            "message": "Hello, I need help with my account.",
                            "created_at": "2025-09-27T10:15:00Z"
                        },
                        {
                            "message_id": "M002", 
                            "sender": "SupportAgent",
                            "message": "Hello! Can you provide more details?",
                            "created_at": "2025-09-27T10:30:00Z"
                        }
                    ]
                }
            }
        },
        404: {
            'description': 'Ticket not found',
            'examples': {
                'application/json': {
                    "error": "Ticket not found"
                }
            }
        }
    },
    tags=['Tickets']
)
@api_view(['GET'])
def get_ticket_details(request, ticket_id):
    """
    Get full ticket details including all messages
    """
    try:
        ticket = Ticket.objects.get(ticket_id=ticket_id)
        serializer = TicketSerializer(ticket)
        return Response(serializer.data, status=status.HTTP_200_OK)
    except Ticket.DoesNotExist:
        return Response({"error": "Ticket not found"}, status=status.HTTP_404_NOT_FOUND)
