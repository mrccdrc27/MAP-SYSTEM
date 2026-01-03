from django.urls import path, include
from rest_framework.response import Response
from rest_framework.decorators import api_view
from rest_framework import serializers
from rest_framework.routers import DefaultRouter
from drf_spectacular.utils import extend_schema

# Import directly from individual modules
from .views.auth_views import RegisterView, CustomTokenObtainPairView, CookieTokenRefreshView, CookieLogoutView, ValidateTokenView, UILogoutView
from .views.profile_views import ProfileView, profile_settings_view, UserByCompanyIdView, MeView
from .views.otp_views import RequestOTPView, Enable2FAView, Disable2FAView, request_otp_authenticated_view, verify_disable_otp_view
from .views.password_views import ForgotPasswordView, ResetPasswordView, ProfilePasswordResetView, ChangePasswordUIView, ChangePasswordView, VerifyPasswordView
from .views.user_management_views import UserViewSet, agent_management_view, invite_agent_view, UserByIdView
from .views.login_views import LoginView, request_otp_for_login, SystemWelcomeView, LoginAPIView, VerifyOTPLoginView

class PasswordResetSerializer(serializers.Serializer):
    forgot = serializers.URLField()
    reset = serializers.URLField()
    change = serializers.URLField()

class TwoFASerializer(serializers.Serializer):
    request_otp = serializers.URLField()
    enable = serializers.URLField()
    disable = serializers.URLField()

class CaptchaSerializer(serializers.Serializer):
    generate = serializers.URLField()
    verify = serializers.URLField()
    required = serializers.URLField()

class UsersRootSerializer(serializers.Serializer):
    register = serializers.URLField()
    profile = serializers.URLField()
    list_users = serializers.URLField()
    password_reset = PasswordResetSerializer()
    two_fa = TwoFASerializer(source='2fa')
    captcha = CaptchaSerializer()

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
        "captcha": {
            "generate": request.build_absolute_uri("captcha/generate/"),
            "verify": request.build_absolute_uri("captcha/verify/"),
            "required": request.build_absolute_uri("captcha/required/"),
        },
        # "settings": {
        #     "profile": request.build_absolute_uri("settings/profile/"),
        #     "agent_management": request.build_absolute_uri("agent-management/"),
        # }
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
    path('login/api/', LoginAPIView.as_view(), name='login-api'),
    path('login/verify-otp/', VerifyOTPLoginView.as_view(), name='verify-otp-login'),
    path('login/request-otp/', request_otp_for_login, name='auth_request_otp'),
    
    path('welcome/', SystemWelcomeView.as_view(), name='system-welcome'),
    path('token/refresh/', CookieTokenRefreshView.as_view(), name='cookie-token-refresh'),
    path('token/validate/', ValidateTokenView.as_view(), name='validate-token'),
    path('logout/', CookieLogoutView.as_view(), name='cookie-logout'),
    path('logout/ui/', UILogoutView.as_view(), name='root_logout'),
    
    # Me endpoint - check if user is authenticated
    path('me/', MeView.as_view(), name='user-me'),
    
    # User profile endpoints
    path('profile/', ProfileView.as_view(), name='user-profile-api'),
    path('profile/by-company/<str:company_id>/', UserByCompanyIdView.as_view(), name='user-profile-by-company'),
    path('profile/reset-password/', ProfilePasswordResetView.as_view(), name='profile-password-reset'),
    
    # Template-based Profile Settings and Agent Management URLs removed
    # These are now only accessible via root-level shortcuts:
    # /settings/profile/ and /agent-management/
    
    # 2FA endpoints
    path('2fa/request-otp/', RequestOTPView.as_view(), name='request-otp'),
    path('2fa/request-otp-authenticated/', request_otp_authenticated_view, name='request-otp-authenticated'),
    path('2fa/enable/', Enable2FAView.as_view(), name='enable-2fa'),
    path('2fa/disable/', Disable2FAView.as_view(), name='disable-2fa'),
    path('verify-disable-otp/', verify_disable_otp_view, name='verify-disable-otp'),
    
    # Password reset endpoints
    path('password/forgot/', ForgotPasswordView.as_view(), name='forgot-password'),
    path('password/reset', ResetPasswordView.as_view(), name='reset-password-no-slash'),  # Without trailing slash for token links
    path('password/reset/', ResetPasswordView.as_view(), name='reset-password'),
    path('password/change/', ProfilePasswordResetView.as_view(), name='change-password'),
    path('password/change/ui/', ChangePasswordUIView.as_view(), name='change-password-ui'),
    path('change-password/', ChangePasswordView.as_view(), name='api-change-password'),
    path('verify-password/', VerifyPasswordView.as_view(), name='api-verify-password'),
    
    # Invite agent endpoint (must come before router to have priority)
    path('invite-agent/', UserViewSet.as_view({'get': 'invite_agent', 'post': 'invite_agent'}), name='api-invite-agent'),
    
    # User listing endpoint
    path('list/', UserViewSet.as_view({'get': 'list'}), name='user-list'),
    
    # Internal endpoint for service-to-service lookups (no auth required)
    path('internal/<int:user_id>/', UserByIdView.as_view(), name='user-internal-by-id'),
    
    # Agent management endpoint
    path('agents/', UserViewSet.as_view({'get': 'list'}), name='user-agents'),
    
    # User management endpoints (for admins) - CRUD operations
    path('management/', include(router.urls)),
    
    # Router URLs - keep this at the end
    path('', include(router.urls)),
]