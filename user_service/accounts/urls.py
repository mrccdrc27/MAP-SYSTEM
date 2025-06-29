from django.urls import path, include
from . import views
from .views import *




auth_patterns = [
    path("login/", UserLoginAPIView.as_view(), name="login-user"),
    path("login/verify-otp/", VerifyLoginOTPAPIView.as_view(), name="verify-login-otp"),
    path("logout/", UserLogoutAPIView.as_view(), name="logout-user"),
    path("me/", Me.as_view(), name="me"),
    path("change-password/", ChangePasswordAPIView.as_view(), name="change-password"),
    path("verify/", Verify.as_view(), name="verify-user"),
]

password_patterns = [
    path("reset/", RequestPasswordResetAPIView.as_view(), name="password_reset"),
    path("reset/confirm/", PasswordResetConfirmAPIView.as_view(), name="password_reset_confirm"),
    path('reset/confirm/<uidb64>/<token>/', PasswordResetConfirmAPIView.as_view(), name='password_reset_confirm'),
    path("reset-complete/", PasswordResetCompleteAPIView.as_view(), name="password_reset_complete"),
    path('validate-reset-token/<uidb64>/<token>/', ValidatePasswordResetTokenAPIView.as_view(), name='validate_reset_token'),
]

registration_patterns = [
    path("invite/", InviteUserView.as_view(), name="invite-user"),
    path("pending-invites/", PendingRegistrationListView.as_view(), name="pending-invites"),
    path('pending-invites/<int:id>/', PendingRegistrationDeleteView.as_view()),
    path("register/<uuid:token>/", RegisterUserView.as_view(), name="register-user"),
    path("validate-token/", validate_registration_token),
]

user_patterns = [
    path("", UserListView.as_view(), name="user-list"),
    path("<int:id>/", UserDetailView.as_view(), name="user-detail"),
    path("<int:user_id>/activate/", ToggleUserActivationAPIView.as_view(), name="toggle-user-activation"),
    path("roles/<str:role_id>/", UsersByRoleView.as_view(), name="users-by-role"),
]

bypass_patterns = [
    path("", AccountCreateView.as_view(), name="bypass-account-create"),
    path("<int:id>", AccountDetailView.as_view(), name="bypass-account-update"),
]

urlpatterns = [
    path("auth/", include(auth_patterns)),
    path("password/", include(password_patterns)),
    path("registration/", include(registration_patterns)),
    path("users/", include(user_patterns)),
    path("account/", include(bypass_patterns)),
    path('round-robin', UserIDsByRoleView.as_view()),
]
