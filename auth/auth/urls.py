from django.contrib import admin
from django.urls import path, include
from django.conf import settings
from django.conf.urls.static import static
from django.shortcuts import redirect
from django.views.generic import TemplateView
from rest_framework.response import Response
from rest_framework.decorators import api_view
from rest_framework.reverse import reverse
from rest_framework import serializers
from drf_spectacular.views import SpectacularAPIView, SpectacularSwaggerView, SpectacularRedocView
from drf_spectacular.utils import extend_schema
from users.views import (
    LoginView,
    request_otp_for_login,
    profile_settings_view,
    agent_management_view,
    invite_agent_view,
    ChangePasswordUIView,
    CustomTokenObtainPairView,
    UILogoutView,
    StaffNotAuthenticatedMixin,
)
from tts.views import assign_agent_to_role_form
from hdts import views as hdts_views
from hdts.employee_template_views import (
    EmployeeLoginView,
    EmployeeRegisterView,
    EmployeeVerifyOTPView,
    EmployeeResetPasswordUIView,
    EmployeeProfileSettingsView,
    EmployeeChangePasswordView,
    EmployeeStaffBlockerMixin,
)
from hdts.employee_api_views import MeView
from users.views.role_management_views import role_management_view

def root_redirect(request):
    """Redirect root URL to login page"""
    return redirect('auth_login')

# ==================== Staff Blocker Views ====================
# These views block authenticated employees from accessing /staff/* endpoints
class StaffBlockerView(EmployeeStaffBlockerMixin, TemplateView):
    """Generic view that blocks authenticated employees from staff endpoints."""
    template_name = 'users/login.html'
    
    def get(self, request, *args, **kwargs):
        # If we get here, the employee is not authenticated
        # Let them pass through to the actual staff login view
        view = StaffNotAuthenticatedLoginView.as_view()
        return view(request, *args, **kwargs)


# ==================== Protected Staff Views ====================
# Wrap the existing LoginView with authentication mixins
class StaffNotAuthenticatedLoginView(StaffNotAuthenticatedMixin, LoginView):
    """
    Staff login page with protective routing.
    - If not authenticated: show login page
    - If authenticated (single system): redirect to system dashboard
    - If authenticated (multiple systems): redirect to system selection
    - If authenticated (no systems): redirect to welcome page
    """
    pass


class APIRootSerializer(serializers.Serializer):
    api_v1 = serializers.URLField()
    schema = serializers.URLField()
    docs = serializers.URLField()
    token_obtain = serializers.URLField()
    logout = serializers.URLField()

@extend_schema(responses=APIRootSerializer)
@api_view(['GET'])
def api_root(request, format=None):
    root_urls = {
        'api_v1': reverse('api-v1-root', request=request),
        'token_obtain': request.build_absolute_uri('token/'),
        'logout': request.build_absolute_uri('logout/'),
    }
    
    # Include API documentation URLs only in DEBUG mode
    if settings.DEBUG:
        root_urls.update({
            'schema': reverse('schema', request=request),
            'docs': reverse('swagger-ui', request=request),
        })
    
    return Response(root_urls)

urlpatterns = [
    path('', root_redirect, name='root-redirect'),  # Redirect root to login page
    path('api/', api_root, name='api-root'),  # API root moved to /api/
    path('admin/', admin.site.urls),
    path('api/v1/', include('auth.v1.urls')),

    # ==================== STAFF Portal (Protected & Guarded) ====================
    # Staff portal with protective routing:
    # - Unauthenticated → show login page
    # - Authenticated (1 system) → redirect to system dashboard
    # - Authenticated (>1 system) → redirect to system selection
    # - Employees → blocked, redirected to /login/
    
    path('staff/login/', StaffNotAuthenticatedLoginView.as_view(), name='auth_login'),
    path('staff/request-otp/', request_otp_for_login, name='auth_request_otp'),

    # Protected staff pages (require staff authentication)
    path('staff/settings/profile/', profile_settings_view, name='profile-settings'),
    path('staff/agent-management/', agent_management_view, name='agent-management'),
    path('staff/invite-agent/', invite_agent_view, name='invite-agent'),
    path('staff/password-change/', ChangePasswordUIView.as_view(), name='password-change-shortcut'),
    path('staff/role-management/', role_management_view, name='role_management_shortcut'),

    # Token and Logout (shared between staff and API)
    path('token/', CustomTokenObtainPairView.as_view(), name='root_token_obtain'),
    path('logout/', UILogoutView.as_view(), name='root_logout'),
    
    # Assign role form
    path('assign-role/', assign_agent_to_role_form, name='assign_role'),

    # ==================== EMPLOYEE Portal (Protected & Guarded) ====================
    # Employee portal with protective routing:
    # - Unauthenticated → show login/register/etc pages
    # - Authenticated → redirect to /profile-settings/
    # - Staff → blocked, redirected to /staff/login/ (via API permissions)
    
    path('login/', EmployeeLoginView.as_view(), name='employee-login-shortcut'),
    path('register/', EmployeeRegisterView.as_view(), name='employee-register-shortcut'),
    path('verify-otp/', EmployeeVerifyOTPView.as_view(), name='employee-verify-otp-shortcut'),
    path('profile-settings/', EmployeeProfileSettingsView.as_view(), name='employee-profile-settings-shortcut'),
    path('change-password/', EmployeeChangePasswordView.as_view(), name='employee-change-password-shortcut'),
    path('reset-password/', EmployeeResetPasswordUIView.as_view(), name='employee-reset-password-shortcut'),
    
    # API shortcut for current user profile (works for both staff and employees)
    path('api/me/', MeView.as_view(), name='api-me'),
]

# Include API documentation URLs only in DEBUG mode
if settings.DEBUG:
    urlpatterns += [
        path('api/schema/', SpectacularAPIView.as_view(), name='schema'),
        path('api/docs/', SpectacularSwaggerView.as_view(url_name='schema'), name='swagger-ui'),
        path('docs/', SpectacularRedocView.as_view(url_name='schema'), name='redoc-ui'),
    ]
    # Serve media files in development
    urlpatterns += static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)
