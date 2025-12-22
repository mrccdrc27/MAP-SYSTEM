"""
URL patterns for Notification Service v2 API
Using API key authentication instead of JWT
Simple pattern like messaging service: send/ and fetch/
"""
from django.urls import path
from rest_framework.decorators import api_view
from rest_framework.response import Response
from rest_framework.reverse import reverse
from . import views_v2

app_name = 'notifications_v2'

@api_view(['GET'])
def api_v2_root(request, format=None):
    """
    Root API view for v2 that lists all available v2 API endpoints.
    """
    return Response({
        'send_notification': reverse('api_v2:send_notification_v2', request=request, format=format),
        'send_flexible_email': reverse('api_v2:send_flexible_email_v2', request=request, format=format),
        'fetch_notifications': reverse('api_v2:fetch_notifications_v2', request=request, format=format),
        'health': reverse('api_v2:health_check_v2', request=request, format=format),
        'notification_types': reverse('api_v2:notification_types_v2', request=request, format=format),
    })

urlpatterns = [
    # API Root view
    path('', api_v2_root, name='root'),
    
    # Core endpoints (simple like messaging service)
    path('send/', views_v2.SendNotificationV2View.as_view(), name='send_notification_v2'),
    path('send-email/', views_v2.SendFlexibleEmailV2View.as_view(), name='send_flexible_email_v2'),
    path('fetch/', views_v2.FetchNotificationsV2View.as_view(), name='fetch_notifications_v2'),
    
    # Utility endpoints
    path('health/', views_v2.HealthCheckV2View.as_view(), name='health_check_v2'),
    path('types/', views_v2.NotificationTypesV2View.as_view(), name='notification_types_v2'),
]