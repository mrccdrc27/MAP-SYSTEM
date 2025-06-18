from django.urls import path
from . import views
from .views import *
from rest_framework_simplejwt.views import TokenRefreshView



urlpatterns = [
    path('hello/', views.HelloView.as_view(), name='hello'),
    path('admin/', views.AdminView.as_view(), name='admin'),
    path('verify/', views.Verify.as_view(), name='admin'),

   
    path("login/", UserLoginAPIView.as_view(), name="login-user"),
    path('login/verify-otp/', VerifyLoginOTPAPIView.as_view(), name='verify-login-otp'),
    path("logout/", UserLogoutAPIView.as_view(), name="logout-user"),
    path("token/refresh/", TokenRefreshView.as_view(), name="token-refresh"),

    # Forgot password routes
    path('password/reset/', RequestPasswordResetAPIView.as_view(), name='password_reset'),
    path('password/reset/confirm/', PasswordResetConfirmAPIView.as_view(), name='password_reset_confirm'),
    path('password/reset-complete/', PasswordResetCompleteAPIView.as_view(), name='password_reset_complete'),

    # Invite register agents routes
    path('invite/', InviteUserView.as_view(), name='invite-user'),

    # List users
    path('users/', UserListView.as_view(), name='user-list'),
    path('users/<int:id>/', UserDetailView.as_view(), name='user-detail'),

    #registration routes
    path('register/<uuid:token>/', RegisterUserView.as_view(), name='register-user'),
    path('validate-token/', validate_registration_token),

    #is_active toggle
    path('users/<int:user_id>/activate/', ToggleUserActivationAPIView.as_view(), name='toggle-user-activation'),


    # View pending registration invites
    path('pending-invites/', PendingRegistrationListView.as_view(), name='pending-invites'),

    # Change password route 
    path('auth/change-password/', ChangePasswordAPIView.as_view(), name='change-password'),

    # bypass accounts
    path('account/', AccountCreateView.as_view(), name='bypass-account-create'),
    path('account/<int:id>', AccountDetailView.as_view(), name='bypass-account-create-update-delete'),
    path("roles/<str:role_id>/", UsersByRoleView.as_view(), name="users-by-role"),

    # verify, display:
    path('me/', Me.as_view(), name='me'),
]