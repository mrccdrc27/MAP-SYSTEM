from django.shortcuts import render, get_object_or_404
from rest_framework import viewsets, status, permissions, generics
from rest_framework.response import Response
from rest_framework.decorators import action, schema, api_view
from rest_framework.schemas import AutoSchema
from rest_framework.views import APIView
from django.utils import timezone
from rest_framework.permissions import IsAuthenticated

from .models import InAppNotification
from .serializers import (
    InAppNotificationSerializer,
    InAppNotificationCreateSerializer,
    InAppNotificationUpdateSerializer,
    MarkNotificationAsReadSerializer
)
from .authentication import APIKeyAuthentication, JWTCookieAuthentication, RequireAPIKey

# Keep ViewSet for backward compatibility and basic operations
# This still uses API key for admin/system operations
class InAppNotificationViewSet(viewsets.ModelViewSet):
    """
    API endpoints for managing in-app notifications (admin access).
    """
    queryset = InAppNotification.objects.all()
    serializer_class = InAppNotificationSerializer
    authentication_classes = [APIKeyAuthentication]
    permission_classes = [RequireAPIKey]  # Require API key
    
    def get_serializer_class(self):
        """Return appropriate serializer class based on action"""
        if self.action == 'create':
            return InAppNotificationCreateSerializer
        elif self.action in ['update', 'partial_update']:
            return InAppNotificationUpdateSerializer
        return InAppNotificationSerializer


# Custom permission class for user-specific endpoints
class IsOwnerOrAdmin(permissions.BasePermission):
    """
    Custom permission to allow users to only access their own notifications.
    """
    def has_object_permission(self, request, view, obj):
        # Check if the user_id from the JWT token matches the notification's user_id
        return str(obj.user_id) == str(request.user.id)


# User-specific views with JWT authentication
class MyNotificationsListView(generics.ListAPIView):
    """
    List all notifications for the authenticated user.
    
    Uses JWT authentication from cookie to identify the user.
    No query parameters needed - user is identified from JWT token.
    
    Query Parameters (optional):
    - notification_type: Filter by notification type (e.g., 'task_assignment', 'task_transfer_in')
    - related_ticket_number: Filter by related ticket number
    """
    serializer_class = InAppNotificationSerializer
    authentication_classes = [JWTCookieAuthentication]
    permission_classes = [IsAuthenticated]
    
    def get_queryset(self):
        user_id = self.request.user.id
        queryset = InAppNotification.objects.filter(user_id=user_id).order_by('-created_at')
        
        # Optional filtering by notification type
        notification_type = self.request.query_params.get('notification_type')
        if notification_type:
            queryset = queryset.filter(notification_type=notification_type)
        
        # Optional filtering by related ticket number
        related_ticket_number = self.request.query_params.get('related_ticket_number')
        if related_ticket_number:
            queryset = queryset.filter(related_ticket_number=related_ticket_number)
        
        return queryset


class MyUnreadNotificationsListView(generics.ListAPIView):
    """
    List all unread notifications for the authenticated user.
    
    Uses JWT authentication from cookie to identify the user.
    No query parameters needed - user is identified from JWT token.
    
    Query Parameters (optional):
    - notification_type: Filter by notification type (e.g., 'task_assignment', 'task_transfer_in')
    """
    serializer_class = InAppNotificationSerializer
    authentication_classes = [JWTCookieAuthentication]
    permission_classes = [IsAuthenticated]
    
    def get_queryset(self):
        user_id = self.request.user.id
        queryset = InAppNotification.objects.filter(
            user_id=user_id,
            is_read=False
        ).order_by('-created_at')
        
        # Optional filtering by notification type
        notification_type = self.request.query_params.get('notification_type')
        if notification_type:
            queryset = queryset.filter(notification_type=notification_type)
        
        return queryset


class MyReadNotificationsListView(generics.ListAPIView):
    """
    List all read notifications for the authenticated user.
    
    Uses JWT authentication from cookie to identify the user.
    No query parameters needed - user is identified from JWT token.
    
    Query Parameters (optional):
    - notification_type: Filter by notification type (e.g., 'task_assignment', 'task_transfer_in')
    """
    serializer_class = InAppNotificationSerializer
    authentication_classes = [JWTCookieAuthentication]
    permission_classes = [IsAuthenticated]
    
    def get_queryset(self):
        user_id = self.request.user.id
        queryset = InAppNotification.objects.filter(
            user_id=user_id,
            is_read=True
        ).order_by('-created_at')
        
        # Optional filtering by notification type
        notification_type = self.request.query_params.get('notification_type')
        if notification_type:
            queryset = queryset.filter(notification_type=notification_type)
        
        return queryset


class MyNotificationDetailView(APIView):
    """
    Retrieve a specific notification owned by the authenticated user.
    
    Query Parameters:
    - notification_id: The UUID of the notification to retrieve (required)
    """
    authentication_classes = [JWTCookieAuthentication]
    permission_classes = [IsAuthenticated]
    
    def get(self, request):
        notification_id = request.query_params.get('notification_id')
        if not notification_id:
            return Response(
                {'error': 'notification_id is required'}, 
                status=status.HTTP_400_BAD_REQUEST
            )
        
        notification = get_object_or_404(InAppNotification, pk=notification_id)
        
        # Check if this notification belongs to the authenticated user
        if str(notification.user_id) != str(request.user.id):
            return Response(
                {'error': 'You do not have permission to access this notification'}, 
                status=status.HTTP_403_FORBIDDEN
            )
            
        serializer = InAppNotificationSerializer(notification)
        return Response(serializer.data)


class ReadMyNotificationView(APIView):
    """
    Read a notification without marking it as read.
    Only notifications owned by the authenticated user can be accessed.
    
    Query Parameters:
    - notification_id: The UUID of the notification to read (required)
    """
    authentication_classes = [JWTCookieAuthentication]
    permission_classes = [IsAuthenticated]
    
    def get(self, request):
        notification_id = request.query_params.get('notification_id')
        if not notification_id:
            return Response(
                {'error': 'notification_id is required'}, 
                status=status.HTTP_400_BAD_REQUEST
            )
        
        notification = get_object_or_404(InAppNotification, pk=notification_id)
        
        # Check if this notification belongs to the authenticated user
        if str(notification.user_id) != str(request.user.id):
            return Response(
                {'error': 'You do not have permission to access this notification'}, 
                status=status.HTTP_403_FORBIDDEN
            )
            
        serializer = InAppNotificationSerializer(notification)
        return Response(serializer.data)


class MarkMyNotificationAsReadView(APIView):
    """
    Mark a notification as read.
    Only notifications owned by the authenticated user can be modified.
    """
    authentication_classes = [JWTCookieAuthentication]
    permission_classes = [IsAuthenticated]
    serializer_class = MarkNotificationAsReadSerializer  # Add serializer class for DRF docs
    
    def get_serializer(self):
        return self.serializer_class()
    
    def post(self, request):
        serializer = MarkNotificationAsReadSerializer(data=request.data)
        if not serializer.is_valid():
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
            
        notification_id = serializer.validated_data['notification_id']
        
        try:
            notification = get_object_or_404(InAppNotification, pk=notification_id)
        except Exception as e:
            return Response(
                {'error': f'Invalid notification ID: {str(e)}'}, 
                status=status.HTTP_404_NOT_FOUND
            )
        
        # Check if this notification belongs to the authenticated user
        if str(notification.user_id) != str(request.user.id):
            return Response(
                {'error': 'You do not have permission to modify this notification'}, 
                status=status.HTTP_403_FORBIDDEN
            )
            
        notification.mark_as_read()
        return Response({
            'status': 'notification marked as read',
            'notification_id': str(notification_id),
            'marked_at': notification.read_at
        })


class MarkAllMyNotificationsAsReadView(APIView):
    """
    Mark all notifications for the authenticated user as read.
    Uses JWT authentication from cookie to identify the user.
    
    No request body needed - user is identified from JWT token.
    """
    authentication_classes = [JWTCookieAuthentication]
    permission_classes = [IsAuthenticated]
    
    def post(self, request):
        user_id = request.user.id
        
        unread_notifications = InAppNotification.objects.filter(
            user_id=user_id,
            is_read=False
        )
        
        count = unread_notifications.count()
        now = timezone.now()
        
        unread_notifications.update(is_read=True, read_at=now)
        
        return Response({
            'status': f'{count} notifications marked as read',
            'count': count
        })


# Keep the original endpoints with API key authentication for admin/system operations

class UserNotificationsListView(generics.ListAPIView):
    """
    List all notifications for a specific user (admin access).
    
    Query Parameters:
    - user_id: The ID of the user to get notifications for (required)
    """
    serializer_class = InAppNotificationSerializer
    authentication_classes = [APIKeyAuthentication]
    permission_classes = [RequireAPIKey]
    
    def get_queryset(self):
        user_id = self.request.query_params.get('user_id')
        if not user_id:
            return InAppNotification.objects.none()
        return InAppNotification.objects.filter(user_id=user_id).order_by('-created_at')


class UserUnreadNotificationsListView(generics.ListAPIView):
    """
    List all unread notifications for a specific user (admin access).
    
    Query Parameters:
    - user_id: The ID of the user to get unread notifications for (required)
    """
    serializer_class = InAppNotificationSerializer
    authentication_classes = [APIKeyAuthentication]
    permission_classes = [RequireAPIKey]
    
    def get_queryset(self):
        user_id = self.request.query_params.get('user_id')
        if not user_id:
            return InAppNotification.objects.none()
        return InAppNotification.objects.filter(
            user_id=user_id,
            is_read=False
        ).order_by('-created_at')


class UserReadNotificationsListView(generics.ListAPIView):
    """
    List all read notifications for a specific user (admin access).
    
    Query Parameters:
    - user_id: The ID of the user to get read notifications for (required)
    """
    serializer_class = InAppNotificationSerializer
    authentication_classes = [APIKeyAuthentication]
    permission_classes = [RequireAPIKey]
    
    def get_queryset(self):
        user_id = self.request.query_params.get('user_id')
        if not user_id:
            return InAppNotification.objects.none()
        return InAppNotification.objects.filter(
            user_id=user_id,
            is_read=True
        ).order_by('-created_at')


class NotificationDetailView(APIView):
    """
    Retrieve a specific notification by ID (admin access).
    
    Query Parameters:
    - notification_id: The UUID of the notification to retrieve (required)
    """
    authentication_classes = [APIKeyAuthentication]
    permission_classes = [RequireAPIKey]
    
    def get(self, request):
        notification_id = request.query_params.get('notification_id')
        if not notification_id:
            return Response(
                {'error': 'notification_id is required'}, 
                status=status.HTTP_400_BAD_REQUEST
            )
        
        notification = get_object_or_404(InAppNotification, pk=notification_id)
        serializer = InAppNotificationSerializer(notification)
        return Response(serializer.data)


class ReadNotificationView(APIView):
    """
    Read a notification without marking it as read (admin access).
    
    Query Parameters:
    - notification_id: The UUID of the notification to read (required)
    """
    authentication_classes = [APIKeyAuthentication]
    permission_classes = [RequireAPIKey]
    
    def get(self, request):
        notification_id = request.query_params.get('notification_id')
        if not notification_id:
            return Response(
                {'error': 'notification_id is required'}, 
                status=status.HTTP_400_BAD_REQUEST
            )
        
        notification = get_object_or_404(InAppNotification, pk=notification_id)
        serializer = InAppNotificationSerializer(notification)
        return Response(serializer.data)


class MarkNotificationAsReadView(APIView):
    """
    Mark a notification as read (admin access).
    """
    authentication_classes = [APIKeyAuthentication]
    permission_classes = [RequireAPIKey]
    serializer_class = MarkNotificationAsReadSerializer  # Add serializer class for DRF docs
    
    def get_serializer(self):
        return self.serializer_class()
    
    def post(self, request):
        serializer = MarkNotificationAsReadSerializer(data=request.data)
        if not serializer.is_valid():
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
            
        notification_id = serializer.validated_data['notification_id']
        
        try:
            notification = get_object_or_404(InAppNotification, pk=notification_id)
        except Exception as e:
            return Response(
                {'error': f'Invalid notification ID: {str(e)}'}, 
                status=status.HTTP_404_NOT_FOUND
            )
        
        notification.mark_as_read()
        return Response({
            'status': 'notification marked as read',
            'notification_id': str(notification_id),
            'marked_at': notification.read_at
        })


class MarkAllUserNotificationsAsReadView(APIView):
    """
    Mark all notifications for a specific user as read (admin access).
    
    Request Body:
    - user_id: The ID of the user whose notifications should be marked as read (required)
    """
    authentication_classes = [APIKeyAuthentication]
    permission_classes = [RequireAPIKey]
    
    def post(self, request):
        user_id = request.data.get('user_id')
        if not user_id:
            return Response(
                {'error': 'user_id is required'}, 
                status=status.HTTP_400_BAD_REQUEST
            )
        
        unread_notifications = InAppNotification.objects.filter(
            user_id=user_id,
            is_read=False
        )
        
        count = unread_notifications.count()
        now = timezone.now()
        
        unread_notifications.update(is_read=True, read_at=now)
        
        return Response({
            'status': f'{count} notifications marked as read',
            'count': count
        })


class CreateNotificationView(generics.CreateAPIView):
    """
    Create a new notification (admin access).
    
    Request Body:
    - user_id: The ID of the user to create the notification for (required)
    - subject: The notification subject/title (required)
    - message: The notification message content (required)
    - notification_type: Type of notification (optional, default: 'system')
    - related_task_id: Related task ID for navigation (optional)
    - related_ticket_number: Related ticket number for navigation (optional)
    - metadata: Additional metadata (optional)
    
    Authentication:
    - Requires valid API key in X-API-Key header
    """
    serializer_class = InAppNotificationCreateSerializer
    authentication_classes = [APIKeyAuthentication]
    permission_classes = [RequireAPIKey]  # Require API key


class NotificationTypesView(APIView):
    """
    Get list of available notification types.
    
    Returns all notification type choices that can be used for filtering.
    """
    authentication_classes = [JWTCookieAuthentication]
    permission_classes = [IsAuthenticated]
    
    def get(self, request):
        from .models import NOTIFICATION_TYPE_CHOICES
        
        notification_types = [
            {'value': choice[0], 'display': choice[1]} 
            for choice in NOTIFICATION_TYPE_CHOICES
        ]
        
        return Response({
            'notification_types': notification_types,
            'count': len(notification_types)
        })


class MyNotificationsByTicketView(generics.ListAPIView):
    """
    List all notifications for the authenticated user related to a specific ticket.
    
    Path Parameters:
    - ticket_number: The ticket number to filter notifications by
    """
    serializer_class = InAppNotificationSerializer
    authentication_classes = [JWTCookieAuthentication]
    permission_classes = [IsAuthenticated]
    
    def get_queryset(self):
        user_id = self.request.user.id
        ticket_number = self.kwargs.get('ticket_number')
        return InAppNotification.objects.filter(
            user_id=user_id,
            related_ticket_number=ticket_number
        ).order_by('-created_at')
