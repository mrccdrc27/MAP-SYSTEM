"""
Notification Service v2 Views with API Key Authentication
Simple, flexible endpoints similar to messaging service structure
"""
from rest_framework import status
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework import serializers
from django.utils import timezone
from django.conf import settings
from django.db import connection
from .models import NotificationTemplate, NotificationLog, NotificationRequest
from .serializers import (
    NotificationCreateSerializer,  # Use the form-friendly serializer
    NotificationLogSerializer,
    NotificationTemplateSerializer,
    FlexibleEmailSerializer,
    FetchNotificationsSerializer,
    HealthCheckSerializer
)
from .services import NotificationService
from .authentication import APIKeyAuthentication
import logging

logger = logging.getLogger(__name__)


class SendNotificationV2View(APIView):
    """
    Send a notification/email (v2 with API key auth)
    Supports both template-based and flexible email sending
    Simple like messaging service send endpoint with form-friendly fields
    """
    authentication_classes = [APIKeyAuthentication]
    permission_classes = [IsAuthenticated]  # Require valid API key authentication
    serializer_class = NotificationCreateSerializer  # Use form-friendly serializer
    
    def get_serializer_class(self):
        """
        Return the serializer class for DRF form rendering
        """
        return NotificationCreateSerializer  # Use notification create for form fields
    
    def get_serializer(self, *args, **kwargs):
        """
        Return the serializer instance for DRF browsable API
        """
        return self.get_serializer_class()(*args, **kwargs)
    
    def post(self, request):
        # Use the notification create serializer for validation and form rendering
        serializer = NotificationCreateSerializer(data=request.data)
        if serializer.is_valid():
            try:
                # The serializer's create method handles the proper data transformation
                notification_request = serializer.save()
                
                # Process the notification using the service
                success = NotificationService.process_notification_request(notification_request)
                
                if success:
                    return Response({
                        'success': True,
                        'message': 'Notification sent successfully',
                        'notification_id': str(notification_request.id),
                        'type': notification_request.notification_type
                    }, status=status.HTTP_201_CREATED)
                else:
                    return Response({
                        'success': False,
                        'message': 'Failed to send notification'
                    }, status=status.HTTP_400_BAD_REQUEST)
                    
            except Exception as e:
                logger.error(f"Error in send_notification_v2: {str(e)}")
                return Response({
                    'success': False,
                    'message': 'Internal server error'
                }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
        else:
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


class FetchNotificationsV2View(APIView):
    """
    Fetch notification history (v2 with API key auth)
    Simple like messaging service fetch endpoint
    """
    authentication_classes = [APIKeyAuthentication]
    permission_classes = [IsAuthenticated]  # Require valid API key authentication
    serializer_class = FetchNotificationsSerializer
    
    def get_serializer_class(self):
        """
        Return serializer for DRF browsable API form fields
        """
        return FetchNotificationsSerializer
    
    def get_serializer(self, *args, **kwargs):
        """
        Return serializer instance for DRF browsable API
        """
        return self.get_serializer_class()(*args, **kwargs)
    
    def post(self, request):
        data = request.data
        
        user_email = data.get('user_email')
        notification_type = data.get('notification_type')
        limit = int(data.get('limit', 50))
        after_notification_id = data.get('after_notification_id')
        
        if not user_email:
            return Response({
                'error': 'user_email is required'
            }, status=status.HTTP_400_BAD_REQUEST)
        
        try:
            notifications = NotificationService.get_notification_history(
                user_id=None,
                user_email=user_email,
                notification_type=notification_type,
                limit=limit
            )
            
            # Filter notifications after specific ID if provided
            if after_notification_id:
                try:
                    after_notification = NotificationLog.objects.get(id=after_notification_id)
                    notifications = notifications.filter(created_at__gt=after_notification.created_at)
                except NotificationLog.DoesNotExist:
                    pass  # If notification_id doesn't exist, return all notifications
            
            serialized_notifications = NotificationLogSerializer(notifications, many=True)
            
            return Response({
                'user_email': user_email,
                'notifications': serialized_notifications.data,
                'count': len(serialized_notifications.data)
            }, status=status.HTTP_200_OK)
            
        except Exception as e:
            logger.error(f"Error in fetch_notifications_v2: {str(e)}")
            return Response({
                'success': False,
                'message': 'Internal server error'
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

    def get(self, request):
        """
        Handle GET request to show the form in DRF browsable API
        """
        return Response({
            'info': 'POST to this endpoint to fetch notification history',
            'example': {
                'user_email': 'user@example.com',
                'limit': 10,
                'notification_type': 'password_reset',
                'after_notification_id': 'optional-uuid'
            }
        })


class HealthCheckV2View(APIView):
    """
    Health check endpoint for the notification service v2
    """
    permission_classes = [AllowAny]  # No authentication required for health check
    
    def get(self, request):
        try:
            # Check database connection
            with connection.cursor() as cursor:
                cursor.execute("SELECT 1")
                db_status = "healthy"
        except Exception:
            db_status = "unhealthy"
        
        health_data = {
            'status': 'healthy' if db_status == 'healthy' else 'unhealthy',
            'timestamp': timezone.now(),
            'version': '2.0.0',
            'database': db_status,
            'email_backend': settings.EMAIL_BACKEND,
            'authentication': 'API Key'
        }
        
        serializer = HealthCheckSerializer(health_data)
        return Response(serializer.data, status=status.HTTP_200_OK)


class NotificationTypesV2View(APIView):
    """
    Get available notification types (v2 with API key auth)
    """
    authentication_classes = [APIKeyAuthentication]
    permission_classes = [IsAuthenticated]  # Require valid API key authentication
    
    def get(self, request):
        types = [
            {'value': choice[0], 'label': choice[1]} 
            for choice in NotificationTemplate.NOTIFICATION_TYPES
        ]
        # Add flexible email type
        types.append({'value': 'flexible_email', 'label': 'Flexible Email'})
        
        return Response({
            'notification_types': types
        }, status=status.HTTP_200_OK)


# Function-based view aliases for URL patterns
# Create function-based views from class-based views for URL configuration
send_notification_v2 = SendNotificationV2View.as_view()
fetch_notifications_v2 = FetchNotificationsV2View.as_view()


class SendFlexibleEmailV2View(APIView):
    """
    Send a flexible email (v2 with API key auth)
    Uses form-friendly serializer with individual fields for better HTML form rendering
    """
    authentication_classes = [APIKeyAuthentication]
    permission_classes = [IsAuthenticated]  # Require valid API key authentication
    serializer_class = FlexibleEmailSerializer
    
    def get_serializer_class(self):
        """
        Return the serializer class for DRF form rendering
        """
        return FlexibleEmailSerializer
    
    def get_serializer(self, *args, **kwargs):
        """
        Return the serializer instance for DRF browsable API
        """
        return self.get_serializer_class()(*args, **kwargs)
    
    def post(self, request):
        serializer = FlexibleEmailSerializer(data=request.data)
        if serializer.is_valid():
            try:
                validated_data = serializer.validated_data
                
                # Create notification log entry
                notification_log = NotificationLog.objects.create(
                    user_id=None,
                    user_email=validated_data['recipient_email'],
                    notification_type='flexible_email',
                    recipient_email=validated_data['recipient_email'],
                    subject=validated_data['subject'],
                    message=validated_data['message'],
                    context_data={
                        'priority': validated_data.get('priority', 'normal'),
                        'send_immediately': validated_data.get('send_immediately', True)
                    },
                    status='pending'
                )
                
                # Send email directly
                success = NotificationService.send_email_direct(
                    recipient_email=validated_data['recipient_email'],
                    subject=validated_data['subject'],
                    message=validated_data['message'],
                    html_message=validated_data.get('html_message')
                )
                
                # Update notification log status
                if success:
                    notification_log.status = 'sent'
                    notification_log.sent_at = timezone.now()
                else:
                    notification_log.status = 'failed'
                    notification_log.error_message = 'Failed to send email'
                
                notification_log.save()
                
                if success:
                    return Response({
                        'success': True,
                        'message': 'Email sent successfully',
                        'notification_id': str(notification_log.id),
                        'type': 'flexible_email'
                    }, status=status.HTTP_201_CREATED)
                else:
                    return Response({
                        'success': False,
                        'message': 'Failed to send email'
                    }, status=status.HTTP_400_BAD_REQUEST)
                    
            except Exception as e:
                logger.error(f"Error in send_flexible_email_v2: {str(e)}")
                return Response({
                    'success': False,
                    'message': 'Internal server error'
                }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
        else:
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


# Create function-based view from class-based view
send_flexible_email_v2 = SendFlexibleEmailV2View.as_view()
health_check_v2 = HealthCheckV2View.as_view()
notification_types_v2 = NotificationTypesV2View.as_view()
from rest_framework import status
from rest_framework.decorators import api_view, authentication_classes, permission_classes
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework.permissions import IsAuthenticated
from django.utils import timezone
from django.conf import settings
from django.db import connection
from .models import NotificationTemplate, NotificationLog, NotificationRequest
from .serializers import (
    NotificationRequestSerializer, 
    NotificationLogSerializer,
    NotificationTemplateSerializer,
    FlexibleEmailSerializer,
    HealthCheckSerializer
)
from .services import NotificationService
from .authentication import APIKeyAuthentication
import logging

logger = logging.getLogger(__name__)


@api_view(['POST'])
@authentication_classes([APIKeyAuthentication])
@permission_classes([IsAuthenticated])
def send_notification_v2(request):
    """
    Send a notification/email (v2 with API key auth)
    Supports both template-based and flexible email sending
    Simple like messaging service send endpoint
    """
    data = request.data
    
    # Check if this is a flexible email (has subject and message directly)
    if 'subject' in data and 'message' in data and 'recipient_email' in data:
        # Flexible email mode
        serializer = FlexibleEmailSerializer(data=data)
        if serializer.is_valid():
            try:
                validated_data = serializer.validated_data
                
                # Create notification log entry
                notification_log = NotificationLog.objects.create(
                    user_id=validated_data.get('user_id'),
                    user_email=validated_data['recipient_email'],
                    notification_type='flexible_email',
                    recipient_email=validated_data['recipient_email'],
                    subject=validated_data['subject'],
                    message=validated_data['message'],
                    context_data=validated_data.get('context_data', {}),
                    status='pending'
                )
                
                # Send email directly
                success = NotificationService.send_email_direct(
                    recipient_email=validated_data['recipient_email'],
                    subject=validated_data['subject'],
                    message=validated_data['message'],
                    html_message=validated_data.get('html_message')
                )
                
                # Update notification log status
                if success:
                    notification_log.status = 'sent'
                    notification_log.sent_at = timezone.now()
                else:
                    notification_log.status = 'failed'
                    notification_log.error_message = 'Failed to send email'
                
                notification_log.save()
                
                if success:
                    return Response({
                        'success': True,
                        'message': 'Email sent successfully',
                        'notification_id': str(notification_log.id),
                        'type': 'flexible_email'
                    }, status=status.HTTP_201_CREATED)
                else:
                    return Response({
                        'success': False,
                        'message': 'Failed to send email'
                    }, status=status.HTTP_400_BAD_REQUEST)
                    
            except Exception as e:
                logger.error(f"Error in send_notification_v2 (flexible): {str(e)}")
                return Response({
                    'success': False,
                    'message': 'Internal server error'
                }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
        else:
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
    
    else:
        # Template-based notification mode
        serializer = NotificationRequestSerializer(data=data)
        if serializer.is_valid():
            try:
                success = NotificationService.process_notification_request(serializer.validated_data)
                
                if success:
                    return Response({
                        'success': True,
                        'message': 'Notification sent successfully',
                        'type': 'template_based'
                    }, status=status.HTTP_201_CREATED)
                else:
                    return Response({
                        'success': False,
                        'message': 'Failed to send notification'
                    }, status=status.HTTP_400_BAD_REQUEST)
                    
            except Exception as e:
                logger.error(f"Error in send_notification_v2 (template): {str(e)}")
                return Response({
                    'success': False,
                    'message': 'Internal server error'
                }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
        else:
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


@api_view(['POST'])
@authentication_classes([APIKeyAuthentication])
@permission_classes([IsAuthenticated])
def fetch_notifications_v2(request):
    """
    Fetch notification history (v2 with API key auth)
    Simple like messaging service fetch endpoint
    """
    data = request.data
    
    user_id = data.get('user_id')
    user_email = data.get('user_email')
    notification_type = data.get('notification_type')
    limit = int(data.get('limit', 50))
    after_notification_id = data.get('after_notification_id')
    
    if not user_id and not user_email:
        return Response({
            'error': 'Either user_id or user_email is required'
        }, status=status.HTTP_400_BAD_REQUEST)
    
    try:
        notifications = NotificationService.get_notification_history(
            user_id=user_id,
            user_email=user_email,
            notification_type=notification_type,
            limit=limit
        )
        
        # Filter notifications after specific ID if provided
        if after_notification_id:
            try:
                after_notification = NotificationLog.objects.get(id=after_notification_id)
                notifications = notifications.filter(created_at__gt=after_notification.created_at)
            except NotificationLog.DoesNotExist:
                pass  # If notification_id doesn't exist, return all notifications
        
        serialized_notifications = NotificationLogSerializer(notifications, many=True)
        
        return Response({
            'user_id': user_id,
            'user_email': user_email,
            'notifications': serialized_notifications.data,
            'count': len(serialized_notifications.data)
        }, status=status.HTTP_200_OK)
        
    except Exception as e:
        logger.error(f"Error in fetch_notifications_v2: {str(e)}")
        return Response({
            'success': False,
            'message': 'Internal server error'
        }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


@api_view(['GET'])
@authentication_classes([APIKeyAuthentication])
@permission_classes([IsAuthenticated])
def health_check_v2(request):
    """
    Health check endpoint for the notification service v2
    """
    try:
        # Check database connection
        with connection.cursor() as cursor:
            cursor.execute("SELECT 1")
            db_status = "healthy"
    except Exception:
        db_status = "unhealthy"
    
    health_data = {
        'status': 'healthy' if db_status == 'healthy' else 'unhealthy',
        'timestamp': timezone.now(),
        'version': '2.0.0',
        'database': db_status,
        'email_backend': settings.EMAIL_BACKEND,
        'authentication': 'API Key'
    }
    
    serializer = HealthCheckSerializer(health_data)
    return Response(serializer.data, status=status.HTTP_200_OK)


@api_view(['GET'])
@authentication_classes([APIKeyAuthentication])
@permission_classes([IsAuthenticated])
def notification_types_v2(request):
    """
    Get available notification types (v2 with API key auth)
    """
    types = [
        {'value': choice[0], 'label': choice[1]} 
        for choice in NotificationTemplate.NOTIFICATION_TYPES
    ]
    # Add flexible email type
    types.append({'value': 'flexible_email', 'label': 'Flexible Email'})
    
    return Response({
        'notification_types': types
    }, status=status.HTTP_200_OK)