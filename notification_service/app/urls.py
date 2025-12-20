from django.urls import path, include
from rest_framework.routers import DefaultRouter
from rest_framework.documentation import include_docs_urls
from rest_framework.decorators import api_view
from rest_framework.response import Response
from rest_framework.reverse import reverse
from .views import (
    # Original views with API key authentication
    InAppNotificationViewSet,
    UserNotificationsListView,
    UserUnreadNotificationsListView,
    UserReadNotificationsListView,
    NotificationDetailView,
    ReadNotificationView,
    MarkNotificationAsReadView,
    MarkAllUserNotificationsAsReadView,
    CreateNotificationView,
    
    # New JWT authenticated views
    MyNotificationsListView,
    MyUnreadNotificationsListView,
    MyReadNotificationsListView,
    MyNotificationDetailView,
    ReadMyNotificationView,
    MarkMyNotificationAsReadView,
    MarkAllMyNotificationsAsReadView,
    
    # New notification type views
    NotificationTypesView,
    MyNotificationsByTaskItemView
)

@api_view(['GET'])
def app_api_root(request, format=None):
    """
    Root API view for in-app notifications that lists all available endpoints.
    """
    return Response({
        'admin_endpoints': {
            'create_notification': reverse('create-notification', request=request, format=format),
            'all_notifications': reverse('in-app-notification-list', request=request, format=format),
            'user_notifications': {
                'all': reverse('user-notifications', request=request, format=format),
                'unread': reverse('user-unread-notifications', request=request, format=format),
                'read': reverse('user-read-notifications', request=request, format=format),
                'mark_all_read': reverse('mark-all-user-notifications-read', request=request, format=format),
            },
            'notification_specific': {
                'detail': reverse('notification-detail', request=request, format=format),
                'read': reverse('read-notification', request=request, format=format),
                'mark_read': reverse('mark-notification-read', request=request, format=format),
            }
        },
        'user_endpoints': {
            'description': 'JWT authentication required (via access_token cookie)',
            'my_notifications': {
                'all': reverse('my-notifications', request=request, format=format),
                'unread': reverse('my-unread-notifications', request=request, format=format),
                'read': reverse('my-read-notifications', request=request, format=format),
                'mark_all_read': reverse('mark-all-my-notifications-read', request=request, format=format),
            },
            'my_notification_specific': {
                'detail': reverse('my-notification-detail', request=request, format=format),
                'read': reverse('read-my-notification', request=request, format=format),
                'mark_read': reverse('mark-my-notification-read', request=request, format=format),
            }
        }
    })

# Keep router for backward compatibility
router = DefaultRouter()
router.register(r'notifications', InAppNotificationViewSet, basename='in-app-notification')

urlpatterns = [
    # Root API view
    path('', app_api_root, name='app-api-root'),
    
    # Router URLs for backward compatibility
    path('api/', include(router.urls)),
    
    # Admin endpoints (API key authenticated)
    # Create notification endpoint
    path('create/', CreateNotificationView.as_view(), name='create-notification'),
    
    # User-specific notification endpoints (API key authenticated, admin access)
    path('users/notifications/', UserNotificationsListView.as_view(), name='user-notifications'),
    path('users/notifications/unread/', UserUnreadNotificationsListView.as_view(), name='user-unread-notifications'),
    path('users/notifications/read/', UserReadNotificationsListView.as_view(), name='user-read-notifications'),
    path('users/notifications/mark-all-read/', MarkAllUserNotificationsAsReadView.as_view(), name='mark-all-user-notifications-read'),
    
    # Individual notification endpoints (API key authenticated, admin access)
    path('notification/detail/', NotificationDetailView.as_view(), name='notification-detail'),
    path('notification/read/', ReadNotificationView.as_view(), name='read-notification'),
    path('notification/mark-read/', MarkNotificationAsReadView.as_view(), name='mark-notification-read'),
    
    # User JWT authenticated endpoints for accessing own notifications
    path('my/notifications/', MyNotificationsListView.as_view(), name='my-notifications'),
    path('my/notifications/unread/', MyUnreadNotificationsListView.as_view(), name='my-unread-notifications'),
    path('my/notifications/read/', MyReadNotificationsListView.as_view(), name='my-read-notifications'),
    path('my/notifications/mark-all-read/', MarkAllMyNotificationsAsReadView.as_view(), name='mark-all-my-notifications-read'),
    path('my/notifications/task-item/<str:task_item_id>/', MyNotificationsByTaskItemView.as_view(), name='my-notifications-by-task-item'),
    path('my/notification/detail/', MyNotificationDetailView.as_view(), name='my-notification-detail'),
    path('my/notification/read/', ReadMyNotificationView.as_view(), name='read-my-notification'),
    path('my/notification/mark-read/', MarkMyNotificationAsReadView.as_view(), name='mark-my-notification-read'),
    
    # Notification types endpoint
    path('notification-types/', NotificationTypesView.as_view(), name='notification-types'),
]