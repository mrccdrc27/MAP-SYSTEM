# auth/hdts/urls.py

from django.urls import path
from rest_framework.decorators import api_view
from rest_framework.response import Response
from rest_framework.reverse import reverse
from . import views

app_name = 'hdts'


@api_view(['GET'])
def hdts_root(request, format=None):
    """API root for HDTS-related endpoints."""
    return Response({
        'register': reverse('hdts:register', request=request, format=format),
        'pending_users': reverse('hdts:manage_pending_users', request=request, format=format),
        'pending_users_api': reverse('hdts:pending_users_api', request=request, format=format),
        'all_users_api': reverse('hdts:all_users_api', request=request, format=format),
        'update_user_status': reverse('hdts:update_user_status', args=[1], request=request, format=format),  # example id=1
    })


urlpatterns = [
    path('', hdts_root, name='hdts_root'),
    path('register/', views.register_user_view, name='register'),
    path('user-management/pending/', views.manage_pending_users_view, name='manage_pending_users'),
    path('user-management/pending/api/', views.get_pending_users_api, name='pending_users_api'),
    path('user-management/users/api/', views.get_all_hdts_users_api, name='all_users_api'),
    path('user-management/update-status/<int:user_id>/', views.update_user_status_view, name='update_user_status'),
    # Read-only basic profile fetch for HDTS users by ID (for cross-system integrations like HDTS backend)
    path('users/<int:user_id>/', views.get_hdts_user_profile_by_id, name='hdts_user_profile_by_id'),
]
