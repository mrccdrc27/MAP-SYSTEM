"""
Authentication views - handles user registration, login, token management,
and session/cookie-based authentication.
"""

from rest_framework import generics, serializers as drf_serializers, status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.response import Response
from rest_framework_simplejwt.views import TokenObtainPairView
from rest_framework_simplejwt.exceptions import TokenError
from rest_framework.exceptions import ValidationError
from rest_framework.permissions import AllowAny, IsAuthenticated
from drf_spectacular.utils import extend_schema, OpenApiResponse, inline_serializer

from django.contrib.auth import login
from django.shortcuts import redirect, render
from django.urls import reverse
from django.contrib import messages
from django.views.decorators.csrf import csrf_protect
from django.views.decorators.cache import never_cache
from django.utils.decorators import method_decorator
from django.views.generic import TemplateView, View
from django.urls import reverse_lazy
from django.conf import settings

from ..models import User
from ..serializers import (
    UserRegistrationSerializer,
    UserProfileSerializer,
    CustomTokenObtainPairSerializer,
)
from system_roles.models import UserSystemRole


class LogoutSerializer(drf_serializers.Serializer):
    """Simple serializer for logout - doesn't need any fields"""
    pass


@extend_schema(
    tags=['Authentication'],
    summary="Register a new user",
    description="Creates a new user account with an email, password, and other personal details. This endpoint is public and does not require authentication.",
    responses={
        201: OpenApiResponse(
            response=UserRegistrationSerializer,
            description="User created successfully. The response contains the new user's details (excluding the password)."
        ),
        400: OpenApiResponse(
            response=inline_serializer(
                name='RegistrationErrorResponse',
                fields={
                    'email': drf_serializers.ListField(child=drf_serializers.CharField()),
                    'username': drf_serializers.ListField(child=drf_serializers.CharField()),
                    'phone_number': drf_serializers.ListField(child=drf_serializers.CharField()),
                }
            ),
            description="Bad Request. This occurs when input data is invalid, such as a duplicate email or a password that is too short."
        )
    }
)
class RegisterView(generics.CreateAPIView):
    """API view for user registration."""
    queryset = User.objects.all()
    permission_classes = (AllowAny,)
    serializer_class = UserRegistrationSerializer


@extend_schema(
    tags=['Tokens'],
    summary="Obtain JWT token",
    description="Authenticate user with email/password and OTP (if 2FA enabled) to obtain JWT access and refresh tokens as regular cookies (non-HTTP-only). If 2FA is enabled and no OTP is provided, an OTP will be automatically generated and sent to the user's email.",
    request=CustomTokenObtainPairSerializer,
    responses={
        200: OpenApiResponse(
            description="Authentication successful, tokens set as regular cookies",
        ),
        400: OpenApiResponse(
            description="Invalid credentials"
        ),
        401: OpenApiResponse(
            description="Authentication failed"
        ),
        403: OpenApiResponse(
            description="Valid credentials but invalid or missing OTP"
        ),
        428: OpenApiResponse(
            description="OTP required but not provided. An OTP has been sent to the user's email."
        )
    }
)
class CustomTokenObtainPairView(TokenObtainPairView):
    """Custom token obtain view that supports 2FA with OTP and sets JWT tokens as regular cookies (non-HTTP-only)."""

    serializer_class = CustomTokenObtainPairSerializer

    def post(self, request, *args, **kwargs):
        from ..captcha import CaptchaService
        
        serializer = self.get_serializer(data=request.data)
        email = request.data.get('email', '').lower()

        try:
            serializer.is_valid(raise_exception=True)
        except ValidationError as e:
            # Track failed login attempt
            if email:
                failed_attempts = CaptchaService.record_failed_attempt(email)
            
            # Extract error codes from validation error
            error_detail = e.detail
            error_codes = []
            
            # Handle different error detail formats
            if isinstance(error_detail, dict):
                for field, errors in error_detail.items():
                    if isinstance(errors, list):
                        for error in errors:
                            if hasattr(error, 'code'):
                                error_codes.append(error.code)
                            elif isinstance(error, str):
                                error_codes.append(error)
                    elif hasattr(errors, 'code'):
                        error_codes.append(errors.code)
            elif isinstance(error_detail, list):
                for error in error_detail:
                    if hasattr(error, 'code'):
                        error_codes.append(error.code)
                    elif isinstance(error, str):
                        error_codes.append(error)
            
            # Check for specific OTP-related errors
            if 'otp_required' in error_codes:
                pass  # Placeholder for existing code
            elif 'otp_invalid' in error_codes:
                pass  # Placeholder for existing code
            elif 'otp_expired' in error_codes:
                pass  # Placeholder for existing code

            # For other validation errors, return the original response
            raise e

        # --- Authentication successful ---
        
        # Clear failed login attempts on successful authentication
        if email:
            CaptchaService.clear_failed_attempts(email)

        # Get tokens from serializer
        tokens = serializer.validated_data
        access_token = tokens['access']
        refresh_token = tokens['refresh']

        # Get the authenticated user
        user = serializer.user

        # --- START: HDTS LOGIC ---
        # Check if the user is an 'Employee' in the 'HDTS' system.
        is_hdts_employee = UserSystemRole.objects.filter(
            user=user,
            system__slug='hdts',
            role__name='Employee'
        ).exists()
        
        # If they are an HDTS Employee, check their approval status
        if is_hdts_employee and user.status != 'Approved':
            error_message = 'Your account is pending approval by the HDTS system administrator.'
            if user.status == 'Rejected':
                error_message = 'Your account has been rejected by the HDTS system administrator.'
            
            # Return 403 Forbidden, blocking token issuance
            return Response(
                {'detail': error_message},
                status=status.HTTP_403_FORBIDDEN
            )
        # --- END: HDTS LOGIC ---

        # Log the user into Django's session framework
        login(request, user)

        # Update last_logged_on for all user system roles
        from django.utils.timezone import now
        UserSystemRole.objects.filter(user=user).update(last_logged_on=now())

        # Get system roles for the user
        system_roles_data = []
        user_system_roles = UserSystemRole.objects.filter(user=user).select_related('system', 'role')
        for role_assignment in user_system_roles:
            system_roles_data.append({
                'system_name': role_assignment.system.name,
                'system_slug': role_assignment.system.slug,
                'role_name': role_assignment.role.name,
                'assigned_at': role_assignment.assigned_at,
            })

        # Determine the primary system and redirect URL
        primary_system = None
        redirect_url = settings.DEFAULT_SYSTEM_URL  # Default fallback
        
        # If user has system roles, use the first one as primary
        if system_roles_data:
            primary_system = system_roles_data[0]['system_slug']
            redirect_url = settings.SYSTEM_TEMPLATE_URLS.get(primary_system, settings.DEFAULT_SYSTEM_URL)
        
        # Prepare available system URLs for frontend
        available_systems = {}
        for role_data in system_roles_data:
            system_slug = role_data['system_slug']
            available_systems[system_slug] = settings.SYSTEM_TEMPLATE_URLS.get(system_slug, settings.DEFAULT_SYSTEM_URL)

        response_data = {
            'message': 'Authentication successful',
            'user': {
                'id': user.id,
                'email': user.email,
                'first_name': user.first_name,
                'middle_name': user.middle_name,
                'last_name': user.last_name,
                'suffix': user.suffix,
                'username': user.username,
                'phone_number': user.phone_number,
                'company_id': user.company_id,
                'department': user.department,
                'status': user.status,
                'notified': user.notified,
                'is_staff': user.is_staff,
                'is_superuser': user.is_superuser,
                'otp_enabled': user.otp_enabled,
                'date_joined': user.date_joined,
                'system_roles': system_roles_data,
            },
            'redirect': {
                'primary_system': primary_system,
                'url': redirect_url,
                'available_systems': available_systems
            }
        }

        response = Response(response_data, status=status.HTTP_200_OK)

        # Use utility for consistent cookie settings across environments
        from ..utils import set_auth_cookies
        response = set_auth_cookies(response, access_token, refresh_token)

        return response


@extend_schema(
    tags=['Tokens'],
    summary="Refresh JWT token from cookie",
    description="Refresh JWT access token using refresh token from regular cookie (non-HTTP-only).",
    responses={
        200: OpenApiResponse(
            description="Token refreshed successfully, new access token set as regular cookie"
        ),
        401: OpenApiResponse(
            description="Invalid or expired refresh token"
        )
    }
)
class CookieTokenRefreshView(generics.GenericAPIView):
    """Refresh JWT access token using refresh token from regular cookie (non-HTTP-only)."""
    permission_classes = [AllowAny]
    
    def post(self, request, *args, **kwargs):
        # Get refresh token from cookie
        refresh_token = request.COOKIES.get('refresh_token')
        
        if not refresh_token:
            return Response(
                {'detail': 'No refresh token in cookies'},
                status=status.HTTP_401_UNAUTHORIZED
            )
        
        try:
            from rest_framework_simplejwt.tokens import RefreshToken
            import jwt
            
            # First decode the token to get user_id
            algorithm = getattr(settings, 'SIMPLE_JWT', {}).get('ALGORITHM', 'HS256')
            secret = getattr(settings, 'SIMPLE_JWT', {}).get('SIGNING_KEY', settings.SECRET_KEY)
            
            payload = jwt.decode(refresh_token, secret, algorithms=[algorithm])
            user_id = payload.get('user_id')
            
            if not user_id:
                return Response(
                    {'detail': 'Invalid token payload'},
                    status=status.HTTP_401_UNAUTHORIZED
                )
            
            # Get the user and generate token with custom claims (roles)
            from users.models import User
            user = User.objects.get(id=user_id)
            
            # Use CustomTokenObtainPairSerializer to include custom claims (email, username, full_name, roles)
            refresh = CustomTokenObtainPairSerializer.get_token(user)
            access_token = str(refresh.access_token)
            
            # Calculate expires_in
            access_lifetime = settings.SIMPLE_JWT.get('ACCESS_TOKEN_LIFETIME')
            expires_in = int(access_lifetime.total_seconds()) if access_lifetime else 300
            
            response = Response(
                {
                    'message': 'Token refreshed successfully',
                    'expires_in': expires_in
                },
                status=status.HTTP_200_OK
            )
            
            # Use utility for consistent cookie settings across environments
            from ..utils import set_auth_cookies
            response = set_auth_cookies(response, access_token)
            
            return response
            
        except User.DoesNotExist:
            return Response(
                {'detail': 'User not found'},
                status=status.HTTP_401_UNAUTHORIZED
            )
        except jwt.ExpiredSignatureError:
            return Response(
                {'detail': 'Refresh token has expired'},
                status=status.HTTP_401_UNAUTHORIZED
            )
        except jwt.InvalidTokenError as e:
            return Response(
                {'detail': f'Invalid refresh token: {str(e)}'},
                status=status.HTTP_401_UNAUTHORIZED
            )
        except TokenError as e:
            return Response(
                {'detail': str(e)},
                status=status.HTTP_401_UNAUTHORIZED
            )


@extend_schema(
    tags=['Tokens'],
    summary="Logout and clear cookies",
    description="Logout user by clearing JWT tokens from regular cookies (non-HTTP-only).",
    responses={
        200: OpenApiResponse(
            description="Logout successful, cookies cleared"
        )
    }
)
class CookieLogoutView(generics.GenericAPIView):
    """Logout by clearing JWT token cookies."""
    permission_classes = [AllowAny]
    serializer_class = LogoutSerializer
    
    def post(self, request, *args, **kwargs):
        from django.contrib.auth import logout as django_logout
        from django.conf import settings
        
        # Also logout from Django session
        django_logout(request)
        
        response_data = {'message': 'Logout successful'}
        response = Response(response_data, status=status.HTTP_200_OK)
        
        # Get the cookie domain from settings (should be 'localhost' for dev)
        cookie_domain = getattr(settings, 'COOKIE_DOMAIN', 'localhost')
        
        # Clear both access and refresh token cookies - must match domain used when setting
        response.delete_cookie('access_token', path='/', domain=cookie_domain, samesite='Lax')
        response.delete_cookie('refresh_token', path='/', domain=cookie_domain, samesite='Lax')
        
        # Also try without domain in case cookies were set differently
        response.delete_cookie('access_token', path='/', samesite='Lax')
        response.delete_cookie('refresh_token', path='/', samesite='Lax')
        
        # Also clear sessionid cookie just to be sure
        response.delete_cookie('sessionid', path='/', domain=cookie_domain, samesite='Lax')
        response.delete_cookie('sessionid', path='/', samesite='Lax')
        
        return response


@extend_schema(
    tags=['Tokens'],
    summary="Validate JWT token",
    description="Validate a JWT token and return user information. Used by external systems for SSO validation.",
    responses={
        200: OpenApiResponse(
            response=UserProfileSerializer,
            description="Token is valid, user information returned"
        ),
        401: OpenApiResponse(
            description="Invalid or expired token"
        )
    }
)
class ValidateTokenView(generics.RetrieveAPIView):
    """Validate JWT token and return user information for SSO."""
    permission_classes = [IsAuthenticated]
    serializer_class = UserProfileSerializer
    
    def get_object(self):
        return self.request.user
    
    def retrieve(self, request, *args, **kwargs):
        """Return user profile if token is valid."""
        user = self.get_object()
        serializer = self.get_serializer(user)
        
        # Add token validation timestamp
        from django.utils import timezone
        data = serializer.data
        data['token_validated_at'] = timezone.now().isoformat()
        
        return Response(data, status=status.HTTP_200_OK)


class UILogoutView(TemplateView):
    """UI logout view that clears JWT cookies and redirects to login."""
    
    def get(self, request, *args, **kwargs):
        # Detect user type from JWT token before clearing
        user_type = None
        token_str = request.COOKIES.get('access_token')
        if token_str:
            try:
                from rest_framework_simplejwt.tokens import AccessToken
                access_token = AccessToken(token_str)
                user_type = access_token.payload.get('user_type', 'staff')
            except Exception:
                pass
        
        # Create redirect response to appropriate login page
        if user_type == 'employee':
            logout_url = reverse('employee-login-shortcut') + '?logout=1'
        else:
            logout_url = reverse('auth_login') + '?logout=1'
        
        response = redirect(logout_url)
        
        # Get the cookie domain from settings (should be 'localhost' for dev)
        from django.conf import settings
        cookie_domain = getattr(settings, 'COOKIE_DOMAIN', 'localhost')
        
        # Clear JWT cookies - must match domain used when setting
        response.delete_cookie('access_token', path='/', domain=cookie_domain, samesite='Lax')
        response.delete_cookie('refresh_token', path='/', domain=cookie_domain, samesite='Lax')
        response.delete_cookie('access_token', path='/', samesite='Lax')
        response.delete_cookie('refresh_token', path='/', samesite='Lax')
        
        return response


class EmployeeLogoutRedirectView(View):
    """Logout endpoint for employees that clears cookies and redirects to auth-frontend."""
    
    def get(self, request, *args, **kwargs):
        from django.conf import settings
        
        # Redirect to auth-frontend employee login
        auth_frontend_url = getattr(settings, 'AUTH_FRONTEND_URL', 'http://localhost:3001')
        response = redirect(f'{auth_frontend_url}/employee')
        
        # Get the cookie domain from settings
        cookie_domain = getattr(settings, 'COOKIE_DOMAIN', 'localhost')
        
        # Clear JWT cookies - try both with and without domain
        response.delete_cookie('access_token', path='/', domain=cookie_domain, samesite='Lax')
        response.delete_cookie('refresh_token', path='/', domain=cookie_domain, samesite='Lax')
        response.delete_cookie('access_token', path='/', samesite='Lax')
        response.delete_cookie('refresh_token', path='/', samesite='Lax')
        response.delete_cookie('sessionid', path='/', domain=cookie_domain, samesite='Lax')
        response.delete_cookie('sessionid', path='/', samesite='Lax')
        
        return response
