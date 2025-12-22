from rest_framework import status, generics
from rest_framework.decorators import api_view
from rest_framework.response import Response
from rest_framework.views import APIView
from django.utils import timezone
from django.conf import settings
from django.db import connection
from .models import NotificationTemplate, NotificationLog, NotificationRequest
from .serializers import (
    NotificationRequestSerializer, 
    NotificationResponseSerializer,
    NotificationCreateSerializer,
    NotificationTemplateSerializer,
    NotificationLogSerializer,
    NotificationHistorySerializer,
    HealthCheckSerializer
)
from .services import NotificationService
import logging

logger = logging.getLogger(__name__)


class SendNotificationView(APIView):
    """
    Send a notification email
    """
    
    def post(self, request):
        serializer = NotificationCreateSerializer(data=request.data)
        if serializer.is_valid():
            try:
                # Convert the validated data to the format expected by the service
                notification_data = {
                    'user_email': serializer.validated_data['user_email'],
                    'user_name': serializer.validated_data.get('user_name', ''),
                    'notification_type': serializer.validated_data['notification_type'],
                    'ip_address': serializer.validated_data.get('ip_address'),
                    'user_agent': serializer.validated_data.get('user_agent', ''),
                    'context_data': {}
                }
                
                # Build context_data from individual fields
                context_fields = [
                    'failed_attempts', 'reset_token', 'reset_url', 'otp_code', 
                    'login_timestamp', 'previous_email', 'previous_username',
                    'device_info', 'location', 'additional_message'
                ]
                
                for field in context_fields:
                    value = serializer.validated_data.get(field)
                    if value is not None:
                        notification_data['context_data'][field] = value
                
                success = NotificationService.process_notification_request(notification_data)
                
                if success:
                    return Response({
                        'success': True,
                        'message': 'Notification sent successfully'
                    }, status=status.HTTP_200_OK)
                else:
                    return Response({
                        'success': False,
                        'message': 'Failed to send notification'
                    }, status=status.HTTP_400_BAD_REQUEST)
                    
            except Exception as e:
                logger.error(f"Error in SendNotificationView: {str(e)}")
                return Response({
                    'success': False,
                    'message': 'Internal server error'
                }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
        
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


class NotificationHistoryView(APIView):
    """
    Get notification history for a user
    """
    
    def get(self, request):
        serializer = NotificationHistorySerializer(data=request.query_params)
        if serializer.is_valid():
            validated_data = serializer.validated_data
            
            notifications = NotificationService.get_notification_history(
                user_id=validated_data.get('user_id'),
                user_email=validated_data.get('user_email'),
                notification_type=validated_data.get('notification_type'),
                limit=validated_data.get('limit', 50)
            )
            
            serialized_notifications = NotificationLogSerializer(notifications, many=True)
            return Response(serialized_notifications.data, status=status.HTTP_200_OK)
        
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


class NotificationTemplateListView(generics.ListCreateAPIView):
    """
    List and create notification templates
    """
    queryset = NotificationTemplate.objects.all()
    serializer_class = NotificationTemplateSerializer


class NotificationTemplateDetailView(generics.RetrieveUpdateDestroyAPIView):
    """
    Retrieve, update, or delete a notification template
    """
    queryset = NotificationTemplate.objects.all()
    serializer_class = NotificationTemplateSerializer


class NotificationLogListView(generics.ListAPIView):
    """
    List notification logs
    """
    queryset = NotificationLog.objects.all()
    serializer_class = NotificationLogSerializer


class CreateNotificationView(generics.CreateAPIView):
    """
    Create a new notification using individual form fields (HTML form friendly)
    """
    serializer_class = NotificationCreateSerializer
    
    def perform_create(self, serializer):
        # The serializer's create method handles the notification creation
        notification_request = serializer.save()
        
        # Process the notification immediately
        notification_data = {
            'user_email': notification_request.user_email,
            'user_name': notification_request.user_name,
            'notification_type': notification_request.notification_type,
            'ip_address': str(notification_request.ip_address) if notification_request.ip_address else None,
            'user_agent': notification_request.user_agent,
            'context_data': notification_request.context_data
        }
        
        try:
            success = NotificationService.process_notification_request(notification_data)
            if success:
                notification_request.processed = True
                notification_request.processed_at = timezone.now()
                notification_request.save()
        except Exception as e:
            logger.error(f"Error processing notification: {str(e)}")


@api_view(['GET'])
def health_check(request):
    """
    Health check endpoint for the notification service
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
        'version': '1.0.0',
        'database': db_status,
        'email_backend': settings.EMAIL_BACKEND,
    }
    
    serializer = HealthCheckSerializer(health_data)
    return Response(serializer.data, status=status.HTTP_200_OK)


@api_view(['GET'])
def notification_types(request):
    """
    Get available notification types
    """
    types = [
        {'value': choice[0], 'label': choice[1]} 
        for choice in NotificationTemplate.NOTIFICATION_TYPES
    ]
    return Response({'notification_types': types}, status=status.HTTP_200_OK)
