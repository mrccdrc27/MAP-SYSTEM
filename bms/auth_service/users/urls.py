# File: CapstoneBP/auth_service/users/urls.py
from django.urls import path, include
from .views import (
    LoginView, LogoutView, UserManagementViewSet, UserProfileView, CustomTokenRefreshView, LoginAttemptsView,
    PasswordResetRequestView, PasswordResetConfirmView, PasswordChangeView
)
from rest_framework.routers import DefaultRouter

from . import views

app_name = 'users_auth' # Namespace for the app

# Router for UserManagementViewSet
router = DefaultRouter()
router.register(r'management/users', UserManagementViewSet, basename='user-management')
# The 'management/' prefix is optional, just to group admin-like endpoints.

urlpatterns = [
    # Authentication endpoints
    path('login/', LoginView.as_view(), name='login'),
    path('logout/', LogoutView.as_view(), name='logout'),
    path('token/refresh/', CustomTokenRefreshView.as_view(), name='token_refresh'),

    # Password management endpoints
    path('password/request-reset/', PasswordResetRequestView.as_view(), name='password_reset_request'),
    path('password/reset/confirm/', PasswordResetConfirmView.as_view(), name='password_reset_confirm'),
    path('password/change/', PasswordChangeView.as_view(), name='password_change'),

    # User profile (self-service)
    path('profile/', UserProfileView.as_view(), name='user_profile'),

    # Security endpoint
    path('login-attempts/', LoginAttemptsView.as_view(), name='login_attempts'),

    # User Management (Admin) endpoints from the router
    path('', include(router.urls)), # This will add /management/users/, /management/users/{id}/ etc.
]

urlpatterns += [
    # ... existing URLs
    path('users/<int:user_id>/', views.UserInfoView.as_view(), name='user-info'),
]