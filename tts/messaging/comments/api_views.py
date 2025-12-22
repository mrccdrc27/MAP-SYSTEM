from django.shortcuts import get_object_or_404
from django.http import FileResponse
from django.db import transaction
from rest_framework import status
from rest_framework.response import Response
from rest_framework.decorators import api_view, parser_classes
from rest_framework.parsers import MultiPartParser, FormParser, JSONParser
from drf_spectacular.utils import extend_schema, OpenApiParameter, OpenApiExample, OpenApiResponse
from drf_spectacular.types import OpenApiTypes

from .models import Comment, DocumentStorage
from .serializers import CommentSerializer
from .permissions import CommentPermission, CommentOwnerOrAdminPermission
from .services import CommentService, CommentNotificationService


@extend_schema(
    summary="Add a comment",
    description="Add a comment to a ticket. User information is extracted from JWT token automatically.",
    request={
        'multipart/form-data': {
            'type': 'object',
            'properties': {
                'ticket_id': {'type': 'integer', 'example': 12345},
                'text': {'type': 'string', 'example': 'This is a comment'},
                'attachments': {'type': 'array', 'items': {'type': 'string', 'format': 'binary'}}
            },
            'required': ['ticket_id', 'text']
        }
    },
    responses={
        201: OpenApiResponse(response=CommentSerializer),
        400: OpenApiResponse(description='Invalid request data')
    },
    tags=['Comments']
)
@api_view(['POST'])
@parser_classes([MultiPartParser, FormParser, JSONParser])
def add_comment(request):
    """Add a comment to a ticket - user info extracted from JWT"""
    # Check permissions
    permission = CommentPermission()
    if not permission.has_permission(request, None):
        return Response({'error': 'Permission denied'}, status=status.HTTP_403_FORBIDDEN)
    
    notification_service = CommentNotificationService()
    
    with transaction.atomic():
        # Handle both form data and JSON
        if request.content_type and request.content_type.startswith('multipart'):
            data = request.data.copy()
            files = request.FILES.getlist('attachments')
        else:
            data = request.data
            files = []
        
        # Extract user info from JWT token
        user_data = CommentService.extract_user_data_from_jwt(request.user)
        data.update(user_data)
        
        serializer = CommentSerializer(data=data)
        if serializer.is_valid():
            # Create comment with attachments
            comment = CommentService.create_comment_with_attachments(
                serializer.validated_data, files, user_data
            )
            
            # Send specific create notification
            notification_service.send_comment_create(comment)
            
            return Response(
                CommentSerializer(comment, context={'request': request}).data,
                status=status.HTTP_201_CREATED
            )
        
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


@extend_schema(
    summary="Get comments for a ticket",
    description="Retrieve all comments for a specific ticket ID",
    parameters=[
        OpenApiParameter(
            name='ticket_id',
            type=OpenApiTypes.INT,
            location=OpenApiParameter.PATH,
            description='Ticket ID to get comments for',
            examples=[OpenApiExample('Example ticket ID', value=12345)]
        ),
        OpenApiParameter(
            name='page',
            type=OpenApiTypes.INT,
            location=OpenApiParameter.QUERY,
            description='Page number for pagination'
        ),
        OpenApiParameter(
            name='page_size',
            type=OpenApiTypes.INT,
            location=OpenApiParameter.QUERY,
            description='Number of comments per page (max 100)'
        )
    ],
    responses={
        200: OpenApiResponse(response=CommentSerializer(many=True)),
        404: OpenApiResponse(description='Ticket not found')
    },
    tags=['Comments']
)
@api_view(['GET'])
def get_comments(request, ticket_id):
    """Get all comments for a ticket with pagination"""
    # Check permissions
    permission = CommentPermission()
    if not permission.has_permission(request, None):
        return Response({'error': 'Permission denied'}, status=status.HTTP_403_FORBIDDEN)
    
    # Get comments for the ticket
    comments = Comment.objects.filter(ticket_id=ticket_id).order_by('-created_at')
    
    # Simple pagination
    page = int(request.GET.get('page', 1))
    page_size = min(int(request.GET.get('page_size', 10)), 100)  # Max 100 per page
    
    start = (page - 1) * page_size
    end = start + page_size
    paginated_comments = comments[start:end]
    
    serializer = CommentSerializer(paginated_comments, many=True, context={'request': request})
    
    response_data = {
        'comments': serializer.data,
        'page': page,
        'page_size': page_size,
        'total_count': comments.count(),
        'has_next': end < comments.count()
    }
    
    return Response(response_data)


@extend_schema(
    summary="Update a comment",
    description="Update an existing comment. User must be the original author.",
    parameters=[
        OpenApiParameter(
            name='comment_id',
            type=OpenApiTypes.INT,
            location=OpenApiParameter.PATH,
            description='Comment ID to update'
        )
    ],
    request={
        'application/json': {
            'type': 'object',
            'properties': {
                'text': {'type': 'string', 'example': 'Updated comment text'}
            },
            'required': ['text']
        }
    },
    responses={
        200: OpenApiResponse(response=CommentSerializer),
        403: OpenApiResponse(description='Permission denied'),
        404: OpenApiResponse(description='Comment not found')
    },
    tags=['Comments']
)
@api_view(['PUT'])
def update_comment(request, comment_id):
    """Update a comment - only the original author can update"""
    # Check permissions
    permission = CommentPermission()
    if not permission.has_permission(request, None):
        return Response({'error': 'Permission denied'}, status=status.HTTP_403_FORBIDDEN)
    
    comment = get_object_or_404(Comment, id=comment_id)
    
    # Check object-level permissions
    owner_permission = CommentOwnerOrAdminPermission()
    if not owner_permission.has_object_permission(request, None, comment):
        return Response({'error': 'Can only update your own comments'}, status=status.HTTP_403_FORBIDDEN)
    
    notification_service = CommentNotificationService()
    
    if 'text' in request.data:
        comment.text = request.data['text']
        comment.save()
        
        # Send specific update notification
        notification_service.send_comment_update(comment)
    
    return Response(CommentSerializer(comment, context={'request': request}).data)


@extend_schema(
    summary="Delete a comment",
    description="Delete a comment. User must be the original author or have admin privileges.",
    parameters=[
        OpenApiParameter(
            name='comment_id',
            type=OpenApiTypes.INT,
            location=OpenApiParameter.PATH,
            description='Comment ID to delete'
        )
    ],
    responses={
        204: OpenApiResponse(description='Comment deleted successfully'),
        403: OpenApiResponse(description='Permission denied'),
        404: OpenApiResponse(description='Comment not found')
    },
    tags=['Comments']
)
@api_view(['DELETE'])
def delete_comment(request, comment_id):
    """Delete a comment - author or admin only"""
    # Check permissions
    permission = CommentPermission()
    if not permission.has_permission(request, None):
        return Response({'error': 'Permission denied'}, status=status.HTTP_403_FORBIDDEN)
    
    comment = get_object_or_404(Comment, id=comment_id)
    
    # Check object-level permissions
    owner_permission = CommentOwnerOrAdminPermission()
    if not owner_permission.has_object_permission(request, None, comment):
        return Response({'error': 'Can only delete your own comments or need admin privileges'}, 
                       status=status.HTTP_403_FORBIDDEN)
    
    notification_service = CommentNotificationService()
    
    # Send delete notification before deletion
    notification_service.send_comment_delete(comment)
    
    comment.delete()
    return Response(status=status.HTTP_204_NO_CONTENT)


@extend_schema(
    summary="Download comment attachment",
    description="Download a file attachment from a comment",
    parameters=[
        OpenApiParameter(
            name='attachment_id',
            type=OpenApiTypes.INT,
            location=OpenApiParameter.PATH,
            description='Attachment ID to download'
        )
    ],
    responses={
        200: OpenApiResponse(description='File download'),
        404: OpenApiResponse(description='Attachment not found')
    },
    tags=['Comments']
)
@api_view(['GET'])
def download_comment_attachment(request, attachment_id):
    """Download a comment attachment"""
    # Check permissions
    permission = CommentPermission()
    if not permission.has_permission(request, None):
        return Response({'error': 'Permission denied'}, status=status.HTTP_403_FORBIDDEN)
    
    document = get_object_or_404(DocumentStorage, id=attachment_id)
    
    response = FileResponse(
        document.file_path.open('rb'),
        as_attachment=True,
        filename=document.original_filename
    )
    response['Content-Type'] = document.content_type
    return response