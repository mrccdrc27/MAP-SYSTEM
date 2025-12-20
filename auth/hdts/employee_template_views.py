"""
Template views for employee portal with protective routing.
These views serve HTML templates with automatic redirects based on authentication state.
All API calls are made via JavaScript from the client side.

Protected routing:
- Unauthenticated users accessing protected routes → redirect to /login/
- Authenticated users accessing /login/ → redirect to HDTS system
- Authenticated users accessing /staff/* → redirect to HDTS system
"""
from django.shortcuts import render, redirect
from django.views.generic import TemplateView
from django.contrib.auth.mixins import LoginRequiredMixin
from django.conf import settings
from django.urls import reverse
from rest_framework.permissions import AllowAny
from .models import Employees


# ==================== Authentication Mixins ====================

class EmployeeAuthenticationMixin:
    """
    Mixin to check if employee is authenticated.
    Sets self.is_authenticated_employee on the view instance.
    """
    
    def dispatch(self, request, *args, **kwargs):
        # Check if employee is attached to request by middleware
        self.is_authenticated_employee = hasattr(request, 'employee') and request.employee
        return super().dispatch(request, *args, **kwargs)


class EmployeeLoginRequiredMixin(EmployeeAuthenticationMixin):
    """
    Mixin that requires employee to be authenticated.
    If not authenticated, redirects to /login/
    """
    
    def dispatch(self, request, *args, **kwargs):
        super().dispatch(request, *args, **kwargs)
        
        if not self.is_authenticated_employee:
            return redirect('employee-login-shortcut')
        
        return super(EmployeeAuthenticationMixin, self).dispatch(request, *args, **kwargs)


class EmployeeNotAuthenticatedMixin(EmployeeAuthenticationMixin):
    """
    Mixin that redirects authenticated employees away from public pages.
    If already authenticated, redirects to HDTS system.
    """
    
    def dispatch(self, request, *args, **kwargs):
        super().dispatch(request, *args, **kwargs)
        
        if self.is_authenticated_employee:
            # Redirect to HDTS system URL
            hdts_url = settings.SYSTEM_TEMPLATE_URLS.get('hdts', 'http://localhost:3000/hdts')
            return redirect(hdts_url)
        
        return super(EmployeeAuthenticationMixin, self).dispatch(request, *args, **kwargs)


class EmployeeStaffBlockerMixin(EmployeeAuthenticationMixin):
    """
    Mixin that blocks authenticated employees from accessing /staff/* endpoints.
    Redirects to HDTS system if they somehow access these pages.
    """
    
    def dispatch(self, request, *args, **kwargs):
        super().dispatch(request, *args, **kwargs)
        
        if self.is_authenticated_employee:
            # Redirect to HDTS system URL
            hdts_url = settings.SYSTEM_TEMPLATE_URLS.get('hdts', 'http://localhost:3000/hdts')
            return redirect(hdts_url)
        
        return super(EmployeeAuthenticationMixin, self).dispatch(request, *args, **kwargs)


class EmployeeLoginView(EmployeeNotAuthenticatedMixin, TemplateView):
    """
    Serve the employee login template.
    - If not authenticated: show login page
    - If authenticated: redirect to HDTS system
    """
    template_name = 'public/hdts_login.html'
    permission_classes = [AllowAny]

    def get_context_data(self, **kwargs):
        context = super().get_context_data(**kwargs)
        # Get HDTS system URL from settings
        context['hdts_system_url'] = settings.SYSTEM_TEMPLATE_URLS.get('hdts', 'http://localhost:3000/hdts')
        # Pass reCAPTCHA settings to template
        context['recaptcha_enabled'] = getattr(settings, 'RECAPTCHA_ENABLED', True)
        context['recaptcha_site_key'] = getattr(settings, 'RECAPTCHA_SITE_KEY', '')
        return context


class EmployeeRegisterView(EmployeeNotAuthenticatedMixin, TemplateView):
    """
    Serve the employee registration template.
    - If not authenticated: show registration page
    - If authenticated: redirect to profile settings
    """
    template_name = 'public/hdts_register.html'
    permission_classes = [AllowAny]

    def get_context_data(self, **kwargs):
        from .forms import UserRegistrationForm
        context = super().get_context_data(**kwargs)
        context['form'] = UserRegistrationForm()
        return context


class EmployeeVerifyOTPView(EmployeeNotAuthenticatedMixin, TemplateView):
    """
    Serve the OTP verification template.
    - If not authenticated: show OTP verification page
    - If authenticated: redirect to profile settings
    """
    template_name = 'public/hdts_verify_otp.html'
    permission_classes = [AllowAny]

    def get_context_data(self, **kwargs):
        context = super().get_context_data(**kwargs)
        return context


class EmployeeResetPasswordView(EmployeeNotAuthenticatedMixin, TemplateView):
    """
    Serve the reset password template.
    - If not authenticated: show reset password page (with token)
    - If authenticated: redirect to profile settings
    """
    template_name = 'public/hdts_reset_password.html'
    permission_classes = [AllowAny]

    def get_context_data(self, **kwargs):
        context = super().get_context_data(**kwargs)
        # Get the token from query params
        token = self.request.GET.get('token', '')
        context['token'] = token
        context['valid'] = bool(token)  # Simple check - ideally validate on the API
        return context


class EmployeeDashboardView(EmployeeLoginRequiredMixin, TemplateView):
    """
    Serve the employee dashboard template.
    - If authenticated: show dashboard
    - If not authenticated: redirect to /login/
    """
    template_name = 'hdts/dashboard.html'

    def get_context_data(self, **kwargs):
        context = super().get_context_data(**kwargs)
        return context


class EmployeeProfileSettingsView(EmployeeLoginRequiredMixin, TemplateView):
    """
    Serve the employee profile settings template with employee data.
    - If authenticated: show profile settings
    - If not authenticated: redirect to /login/
    """
    template_name = 'hdts/profile.html'

    def get_context_data(self, **kwargs):
        context = super().get_context_data(**kwargs)
        
        # Get the employee from the authorization header or session
        try:
            # Try to get from the request's employee (if set by middleware)
            if hasattr(self.request, 'employee'):
                context['employee'] = self.request.employee
            else:
                # Try to get from user if available
                context['employee'] = None
        except Exception:
            context['employee'] = None
            
        return context


class EmployeeChangePasswordView(EmployeeLoginRequiredMixin, TemplateView):
    """
    Serve the employee change password template.
    - If authenticated: show change password page
    - If not authenticated: redirect to /login/
    """
    template_name = 'hdts/change_password.html'

    def get_context_data(self, **kwargs):
        context = super().get_context_data(**kwargs)
        return context


class EmployeeLogoutView(TemplateView):
    """
    Handle employee logout and redirect to login.
    Shows login template after logout.
    """
    template_name = 'public/hdts_login.html'

    def get(self, request, *args, **kwargs):
        # Clear any session data or cookies if needed
        return super().get(request, *args, **kwargs)


class EmployeeResetPasswordUIView(EmployeeNotAuthenticatedMixin, TemplateView):
    """
    Alias for EmployeeResetPasswordView for backward compatibility.
    - If not authenticated: show reset password page (with token)
    - If authenticated: redirect to profile settings
    """
    template_name = 'public/hdts_reset_password.html'

    def get_context_data(self, **kwargs):
        context = super().get_context_data(**kwargs)
        # Get the token from query params
        token = self.request.GET.get('token', '')
        context['token'] = token
        context['valid'] = bool(token)
        return context
