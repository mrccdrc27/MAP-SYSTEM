"""
URL configuration for Superuser Admin Portal.

This module provides URL patterns for the superuser administration system:
- Session-based authentication (separate from JWT)
- User masterlist management
- User import/export functionality
"""

from django.urls import path
from users.views.superuser_admin_views import (
    # Template Views
    SuperAdminLoginView,
    SuperAdminLogoutView,
    SuperAdminDashboardView,
    UserMasterlistView,
    UserCreateView,
    UserEditView,
    UserImportView,
    # API Views
    UserListAPIView,
    UserDetailAPIView,
    UserCreateAPIView,
    UserBulkActionAPIView,
    UserImportAPIView,
    UserExportAPIView,
    SystemStatsAPIView,
    SessionLoginAPIView,
    SessionCheckAPIView,
    SessionLogoutAPIView,
)

urlpatterns = [
    # ==================== Authentication ====================
    path('login/', SuperAdminLoginView.as_view(), name='superadmin-login'),
    path('logout/', SuperAdminLogoutView.as_view(), name='superadmin-logout'),
    
    # ==================== Dashboard & Template Views ====================
    path('', SuperAdminDashboardView.as_view(), name='superadmin-dashboard'),
    path('users/', UserMasterlistView.as_view(), name='superadmin-user-masterlist'),
    path('users/create/', UserCreateView.as_view(), name='superadmin-user-create'),
    path('users/<int:user_id>/edit/', UserEditView.as_view(), name='superadmin-user-edit'),
    path('users/import/', UserImportView.as_view(), name='superadmin-user-import'),
    
    # ==================== API Endpoints ====================
    # Session Authentication API
    path('api/login/', SessionLoginAPIView.as_view(), name='superadmin-api-login'),
    path('api/logout/', SessionLogoutAPIView.as_view(), name='superadmin-api-logout'),
    path('api/session/', SessionCheckAPIView.as_view(), name='superadmin-api-session'),
    
    # User Management API
    path('api/users/', UserListAPIView.as_view(), name='superadmin-api-user-list'),
    path('api/users/create/', UserCreateAPIView.as_view(), name='superadmin-api-user-create'),
    path('api/users/bulk/', UserBulkActionAPIView.as_view(), name='superadmin-api-user-bulk'),
    path('api/users/import/', UserImportAPIView.as_view(), name='superadmin-api-user-import'),
    path('api/users/export/', UserExportAPIView.as_view(), name='superadmin-api-user-export'),
    path('api/users/<int:user_id>/', UserDetailAPIView.as_view(), name='superadmin-api-user-detail'),
    path('api/stats/', SystemStatsAPIView.as_view(), name='superadmin-api-stats'),
]
