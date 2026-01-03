"""
Views package - organized by functionality/category.

This package organizes views into logical modules:
- auth_views: User registration, token management, and authentication
- profile_views: User profile retrieval and updates (API-only)
- otp_views: Two-factor authentication and OTP handling
- password_views: Password reset and change flows (API-only)
- user_management_views: User CRUD operations (API-only)
- login_views: API-based login flow with OTP verification
- role_management_views: Role creation, viewing, and assignment management
- superuser_admin_views: Superuser admin portal (session-based)
"""

# Authentication and Token Management
from .auth_views import (
    LogoutSerializer,
    RegisterView,
    CustomTokenObtainPairView,
    CookieTokenRefreshView,
    CookieLogoutView,
    ValidateTokenView,
    UILogoutView,
)

# User Profile (API-only)
from .profile_views import (
    MeView,
    ProfileView,
)

# OTP and 2FA
from .otp_views import (
    RequestOTPView,
    Enable2FAView,
    Disable2FAView,
    request_otp_authenticated_view,
    verify_disable_otp_view,
)

# Password Management (API-only)
from .password_views import (
    ForgotPasswordView,
    ResetPasswordView,
    ProfilePasswordResetView,
)

# User Management (API-only)
from .user_management_views import (
    UserViewSet,
)

# Login Flow (API-only)
from .login_views import (
    LoginAPIView,
    VerifyOTPLoginView,
)

# Role Management
from .role_management_views import (
    CreateRoleView,
    UpdateAssignmentView,
)

# Superuser Admin Portal (session-based, kept for admin functionality)
from .superuser_admin_views import (
    SuperuserRequiredMixin,
    IsSuperuserSessionAuth,
    SuperAdminLoginView,
    SuperAdminLogoutView,
    SuperAdminDashboardView,
    UserMasterlistView,
    UserCreateView,
    UserEditView,
    UserImportView,
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

__all__ = [
    # Auth
    'LogoutSerializer',
    'RegisterView',
    'CustomTokenObtainPairView',
    'CookieTokenRefreshView',
    'CookieLogoutView',
    'ValidateTokenView',
    'UILogoutView',
    # Profile
    'MeView',
    'ProfileView',
    # OTP
    'RequestOTPView',
    'Enable2FAView',
    'Disable2FAView',
    'request_otp_authenticated_view',
    'verify_disable_otp_view',
    # Password
    'ForgotPasswordView',
    'ResetPasswordView',
    'ProfilePasswordResetView',
    # User Management
    'UserViewSet',
    # Login (API-only)
    'LoginAPIView',
    'VerifyOTPLoginView',
    # Role Management
    'CreateRoleView',
    'UpdateAssignmentView',

    'UserEditView',
    'UserImportView',
    'UserListAPIView',
    'UserDetailAPIView',
    'UserCreateAPIView',
    'UserBulkActionAPIView',
    'UserImportAPIView',
    'UserExportAPIView',
    'SystemStatsAPIView',
    'SessionLoginAPIView',
    'SessionCheckAPIView',
    'SessionLogoutAPIView',
]
