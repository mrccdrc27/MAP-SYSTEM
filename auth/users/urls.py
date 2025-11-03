from django.urls import path, include
from rest_framework.response import Response
from rest_framework.decorators import api_view
from rest_framework import serializers
from rest_framework.routers import DefaultRouter
from drf_spectacular.utils import extend_schema
from .views import (
    RegisterView, 
    ProfileView, 
    CustomTokenObtainPairView,
    CookieTokenRefreshView,
    CookieLogoutView,
    ValidateTokenView,
    RequestOTPView, 
    Enable2FAView, 
    Disable2FAView,
    ForgotPasswordView,
    ForgotPasswordUIView,
    ResetPasswordView,
    UserViewSet,
    ProfilePasswordResetView,
    profile_settings_view,
    agent_management_view,
    LoginView,
    request_otp_for_login,
    SystemWelcomeView,
    UILogoutView,
    ChangePasswordUIView
)

class PasswordResetSerializer(serializers.Serializer):
    forgot = serializers.URLField()
    reset = serializers.URLField()
    change = serializers.URLField()

class TwoFASerializer(serializers.Serializer):
    request_otp = serializers.URLField()
    enable = serializers.URLField()
    disable = serializers.URLField()

class UsersRootSerializer(serializers.Serializer):
    register = serializers.URLField()
    profile = serializers.URLField()
    list_users = serializers.URLField()
    password_reset = PasswordResetSerializer()
    two_fa = TwoFASerializer(source='2fa')

@extend_schema(responses=UsersRootSerializer)
@api_view(['GET'])
def users_root(request):
    return Response({
        "register": request.build_absolute_uri("register/"),
        "profile": request.build_absolute_uri("profile/"),
        "list_users": request.build_absolute_uri("list/"),
        "password_reset": {
            "forgot": request.build_absolute_uri("password/forgot/"),
            "reset": request.build_absolute_uri("password/reset/"),
            "change": request.build_absolute_uri("password/change/"),
        },
        "2fa": {
            "request_otp": request.build_absolute_uri("2fa/request-otp/"),
            "enable": request.build_absolute_uri("2fa/enable/"),
            "disable": request.build_absolute_uri("2fa/disable/"),
        },
        "settings": {
            "profile": request.build_absolute_uri("settings/profile/"),
            "agent_management": request.build_absolute_uri("agent-management/"),
        }
    })

# Create router for UserViewSet
router = DefaultRouter()
router.register(r'', UserViewSet)

urlpatterns = [
    # Root endpoint for users API discovery 
    path('', users_root, name='users-root'),
    
    # Authentication endpoints
    path('register/', RegisterView.as_view(), name='user-register'),
    path('login/', CustomTokenObtainPairView.as_view(), name='token-obtain-pair'),
    path('login/ui/', LoginView.as_view(), name='auth_login'),
    path('login/request-otp/', request_otp_for_login, name='auth_request_otp'),
    path('forgot-password/', ForgotPasswordUIView.as_view(), name='forgot-password-ui'),
    path('welcome/', SystemWelcomeView.as_view(), name='system-welcome'),
    path('token/refresh/', CookieTokenRefreshView.as_view(), name='cookie-token-refresh'),
    path('token/validate/', ValidateTokenView.as_view(), name='validate-token'),
    path('logout/', CookieLogoutView.as_view(), name='cookie-logout'),
    path('logout/ui/', UILogoutView.as_view(), name='root_logout'),
    
    # User profile endpoints
    path('profile/', ProfileView.as_view(), name='user-profile-api'),
    path('profile/reset-password/', ProfilePasswordResetView.as_view(), name='profile-password-reset'),
    
    # Template-based Profile Settings URL
    path('settings/profile/', profile_settings_view, name='profile-settings'),
    
    # Agent Management URL - MUST come before router includes
    path('agent-management/', agent_management_view, name='agent-management'),
    
    # 2FA endpoints
    path('2fa/request-otp/', RequestOTPView.as_view(), name='request-otp'),
    path('2fa/enable/', Enable2FAView.as_view(), name='enable-2fa'),
    path('2fa/disable/', Disable2FAView.as_view(), name='disable-2fa'),
    
    # Password reset endpoints
    path('password/forgot/', ForgotPasswordView.as_view(), name='forgot-password'),
    path('password/reset/', ResetPasswordView.as_view(), name='reset-password'),
    path('password/change/', ProfilePasswordResetView.as_view(), name='change-password'),
    path('password/change/ui/', ChangePasswordUIView.as_view(), name='change-password-ui'),
    
    # User listing endpoint
    path('list/', UserViewSet.as_view({'get': 'list'}), name='user-list'),
    
    # User management endpoints (for admins) - CRUD operations
    path('management/', include(router.urls)),
    
    # Router URLs - keep this at the end
    path('', include(router.urls)),
]