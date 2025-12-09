"""
Authentication and routing middleware.

Handles:
1. JWT authentication from cookies
2. User type detection (Staff vs Employee)
3. Endpoint routing based on user type and authentication status
4. Redirects for invalid/mismatched endpoints
"""

from django.http import HttpResponseRedirect
from django.urls import reverse
from django.conf import settings
from rest_framework_simplejwt.tokens import AccessToken
from rest_framework_simplejwt.exceptions import InvalidToken, TokenError
import logging

logger = logging.getLogger(__name__)


class AuthenticationRoutingMiddleware:
    """
    Middleware that:
    1. Authenticates users via JWT cookies
    2. Detects if authenticated as Staff (User) or Employee
    3. Enforces endpoint-based routing rules
    4. Redirects invalid/mismatched endpoint access
    """

    # Paths that don't require authentication
    UNAUTHENTICATED_PATHS = {
        '/staff/login/',
        '/login/',
        '/register/',
        '/verify-otp/',
        '/forgot-password/',
        '/reset-password/',
        '/api/v1/users/login/api/',
        '/api/v1/users/register/',
        '/api/v1/hdts/employees/api/login/',
        '/api/v1/hdts/employees/api/register/',
        '/token/',
        '/admin/',
        '/api/schema/',
        '/api/docs/',
        '/docs/',
    }

    # Paths that should match the start (prefixes)
    UNAUTHENTICATED_PREFIXES = {
        '/api/',  # Allow all API routes first, then filter protected ones
        '/static/',
        '/media/',
    }

    # Staff-only endpoints
    STAFF_ENDPOINTS = {
        '/staff/',
        '/api/v1/users/',
        '/assign-role/',
        '/settings/profile/',
    }

    # Employee-only endpoints
    EMPLOYEE_ENDPOINTS = {
        '/login/',  # Employee login portal
        '/profile-settings/',
        '/change-password/',
        '/api/v1/hdts/employees/',
    }

    def __init__(self, get_response):
        self.get_response = get_response

    def __call__(self, request):
        # Try to authenticate from JWT cookie
        self.authenticate_from_jwt(request)

        # Check if path requires authentication
        if self._is_public_path(request.path):
            # Public paths - no routing rules
            return self.get_response(request)

        # If not authenticated, redirect to login with error
        if not hasattr(request, 'user_type'):
            return self._redirect_to_login(request, 'Session expired. Please log in.')

        # Apply routing rules based on user type
        redirect_response = self._apply_routing_rules(request)
        if redirect_response:
            return redirect_response

        return self.get_response(request)

    def authenticate_from_jwt(self, request):
        """
        Extract and validate JWT from cookies.
        Sets request.user_type and request.user_id on success.
        """
        token_str = request.COOKIES.get('access_token')
        if not token_str:
            return

        try:
            access_token = AccessToken(token_str)
            access_token.verify()

            user_id = access_token.payload.get('user_id')
            user_type = access_token.payload.get('user_type')  # 'staff' or 'employee'

            if not user_id:
                logger.warning('JWT token missing user_id claim')
                return

            # Default to 'staff' if user_type not specified (backward compatibility)
            if not user_type:
                user_type = 'staff'

            request.user_id = user_id
            request.user_type = user_type.lower()

            logger.debug(f'Authenticated {request.user_type} user {user_id}')

        except (InvalidToken, TokenError) as e:
            logger.debug(f'Invalid or expired JWT token: {e}')
            return
        except Exception as e:
            logger.warning(f'Unexpected error during JWT authentication: {e}')
            return

    def _is_public_path(self, path):
        """Check if path is publicly accessible without authentication."""
        # Exact matches
        if path in self.UNAUTHENTICATED_PATHS:
            return True

        # Check if path starts with any prefix (skip API routes for now)
        for prefix in self.UNAUTHENTICATED_PREFIXES:
            if path.startswith(prefix):
                # All static/media are public
                if prefix in {'/static/', '/media/'}:
                    return True
                # API routes need further checking below
                if prefix == '/api/':
                    # Allow specific public API endpoints
                    public_api_paths = {
                        '/api/v1/users/login/api/',
                        '/api/v1/users/register/',
                        '/api/v1/hdts/employees/api/login/',
                        '/api/v1/hdts/employees/api/register/',
                        '/api/v1/users/password/forgot/',
                        '/api/v1/users/password/reset/', # With trailing slash
                        '/api/v1/users/password/reset',  # Without trailing slash
                        '/api/v1/users/login/verify-otp/',
                    }
                    if path in public_api_paths:
                        return True

        return False

    def _redirect_to_login(self, request, error_message=''):
        """Redirect unauthenticated user to appropriate login page."""
        if error_message:
            # Store error message in session for display
            request.session['auth_error'] = error_message
            request.session.modified = True

        # For now, redirect to staff login (could be improved to detect intent)
        response = HttpResponseRedirect(reverse('auth_login'))
        response.delete_cookie('access_token', path='/')
        response.delete_cookie('refresh_token', path='/')
        return response

    def _apply_routing_rules(self, request):
        """
        Apply routing rules based on user type and endpoint.
        Returns HttpResponseRedirect if redirect needed, None otherwise.
        """
        user_type = request.user_type
        path = request.path

        # ============ STAFF USER ROUTING ============
        if user_type == 'staff':
            # Staff trying to access employee endpoints
            if self._is_employee_endpoint(path):
                # Redirect to staff profile settings
                return HttpResponseRedirect('/staff/settings/profile/')

            # Staff trying to access invalid endpoints
            if self._is_invalid_endpoint(path, user_type):
                # Redirect to HDTS system (fallback for invalid paths)
                hdts_url = settings.SYSTEM_TEMPLATE_URLS.get('hdts', 'http://localhost:3000/hdts')
                return HttpResponseRedirect(hdts_url)

        # ============ EMPLOYEE USER ROUTING ============
        elif user_type == 'employee':
            # Employee trying to access staff endpoints
            if self._is_staff_endpoint(path):
                # Redirect to employee profile settings
                return HttpResponseRedirect('/profile-settings/')

            # Employee trying to access invalid endpoints
            if self._is_invalid_endpoint(path, user_type):
                # Redirect to HDTS system
                hdts_url = settings.SYSTEM_TEMPLATE_URLS.get('hdts', 'http://localhost:3000/hdts')
                return HttpResponseRedirect(hdts_url)

        return None

    def _is_staff_endpoint(self, path):
        """Check if path is a staff-only endpoint."""
        for endpoint in self.STAFF_ENDPOINTS:
            if path.startswith(endpoint):
                return True
        return False

    def _is_employee_endpoint(self, path):
        """Check if path is an employee-only endpoint."""
        for endpoint in self.EMPLOYEE_ENDPOINTS:
            if path.startswith(endpoint):
                return True
        return False

    def _is_invalid_endpoint(self, path, user_type):
        """
        Check if path would result in 404/500 for this user type.
        
        This is a heuristic check. In production, you might want to:
        1. Check if URL exists in url patterns
        2. Check if view exists and is accessible
        3. Use a 404/500 handler to catch unmapped routes
        """
        # Django admin
        if path.startswith('/admin/'):
            # Only superusers can access admin
            # This will be caught by Django's permission system
            return False

        # API routes not in public list
        if path.startswith('/api/'):
            # API authentication is handled by DRF permissions
            # Don't redirect here
            return False

        # Template routes that don't exist for this user type
        # These are typically caught by Django's 404 handler
        # For now, we'll be permissive and let Django handle unknown routes
        return False
