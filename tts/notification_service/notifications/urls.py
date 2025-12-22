from django.urls import path
from rest_framework.decorators import api_view
from rest_framework.response import Response
from rest_framework.reverse import reverse
from . import views
from .health import health_check as health_check_detailed, readiness_check, liveness_check

app_name = 'notifications'

@api_view(['GET'])
def api_v1_root(request, format=None):
    """
    Root API view for v1 that lists all available v1 API endpoints.
    """
    return Response({
        'send_notification': reverse('api_v1:send_notification', request=request, format=format),
        'create_notification': reverse('api_v1:create_notification', request=request, format=format),
        'notification_history': reverse('api_v1:notification_history', request=request, format=format),
        'templates': reverse('api_v1:template_list', request=request, format=format),
        'logs': reverse('api_v1:notification_logs', request=request, format=format),
        'health': reverse('api_v1:health_check', request=request, format=format),
        'notification_types': reverse('api_v1:notification_types', request=request, format=format),
    })

urlpatterns = [
    # API Root view
    path('', api_v1_root, name='root'),
    
    # Core notification endpoints
    path('send/', views.SendNotificationView.as_view(), name='send_notification'),
    path('create/', views.CreateNotificationView.as_view(), name='create_notification'),
    path('history/', views.NotificationHistoryView.as_view(), name='notification_history'),
    
    # Template management
    path('templates/', views.NotificationTemplateListView.as_view(), name='template_list'),
    path('templates/<uuid:pk>/', views.NotificationTemplateDetailView.as_view(), name='template_detail'),
    
    # Logs
    path('logs/', views.NotificationLogListView.as_view(), name='notification_logs'),
    
    # Utility endpoints
    path('health/', views.health_check, name='health_check'),
    path('types/', views.notification_types, name='notification_types'),
    
    # Production health checks for Railway
    path('healthz/', health_check_detailed, name='health_check_detailed'),
    path('readyz/', readiness_check, name='readiness_check'),
    path('livez/', liveness_check, name='liveness_check'),
]