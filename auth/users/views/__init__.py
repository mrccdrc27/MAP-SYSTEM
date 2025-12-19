"""
Views package - organized by functionality/category.

This package organizes views into logical modules:
- auth_views: User registration, token management, and authentication
- profile_views: User profile retrieval and updates
- otp_views: Two-factor authentication and OTP handling
- password_views: Password reset and change flows
- user_management_views: User CRUD operations and agent management
- login_views: Login flow, OTP for login, and system welcome
- role_management_views: Role creation, viewing, and assignment management
- staff_routing_mixins: Protective routing mixins for staff portal pages
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

# User Profile
from .profile_views import (
    ProfileView,
    profile_settings_view,
)

# OTP and 2FA
from .otp_views import (
    RequestOTPView,
    Enable2FAView,
    Disable2FAView,
    request_otp_authenticated_view,
    verify_disable_otp_view,
)

# Password Management
from .password_views import (
    ForgotPasswordView,
    ResetPasswordView,
    ProfilePasswordResetView,
    ChangePasswordUIView,
)

# User Management
from .user_management_views import (
    UserViewSet,
    agent_management_view,
    invite_agent_view,
)

# Login Flow
from .login_views import (
    LoginView,
    request_otp_for_login,
    SystemWelcomeView,
    VerifyOTPLoginView,
)

# Role Management
from .role_management_views import (
    CreateRoleView,
    UpdateAssignmentView,
    role_management_view,
)

# Staff Portal Routing
from .staff_routing_mixins import (
    StaffAuthenticationMixin,
    StaffLoginRequiredMixin,
    StaffNotAuthenticatedMixin,
    StaffEmployeeBlockerMixin,
    StaffSystemRedirectMixin,
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
    'ProfileView',
    'profile_settings_view',
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
    'ChangePasswordUIView',
    # User Management
    'UserViewSet',
    'agent_management_view',
    'invite_agent_view',
    # Login
    'LoginView',
    'request_otp_for_login',
    'SystemWelcomeView',
    'VerifyOTPLoginView',
    # Role Management
    'CreateRoleView',
    'UpdateAssignmentView',
    'role_management_view',
    # Staff Portal Routing
    'StaffAuthenticationMixin',
    'StaffLoginRequiredMixin',
    'StaffNotAuthenticatedMixin',
    'StaffEmployeeBlockerMixin',
    'StaffSystemRedirectMixin',
]
