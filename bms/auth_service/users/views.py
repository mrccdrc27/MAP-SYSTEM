# File: CapstoneBP/auth_service/users/views.py

import os
import re

# Django core imports
from django.http import JsonResponse
from django.conf import settings
from django.utils import timezone
from django.contrib.auth import get_user_model
from django_filters.rest_framework import DjangoFilterBackend # For filtering
from django.db import connection # To check DB connection
from django.db.utils import OperationalError

# Third-party imports
from rest_framework import status, generics, serializers as drf_serializers,  viewsets, filters
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework.permissions import IsAuthenticated, AllowAny
from rest_framework.decorators import action  # For custom actions in viewset

from rest_framework_simplejwt.tokens import RefreshToken
from rest_framework_simplejwt.exceptions import TokenError
from rest_framework_simplejwt.views import TokenRefreshView as OriginalTokenRefreshView
from rest_framework_simplejwt.serializers import TokenRefreshSerializer
import logging 


from drf_spectacular.utils import (
    extend_schema, OpenApiExample, OpenApiResponse, inline_serializer,
    extend_schema_view, OpenApiParameter
)
from drf_spectacular.types import OpenApiTypes

from django_ratelimit.decorators import ratelimit
from django.utils.decorators import method_decorator
from django.views.decorators.csrf import csrf_exempt
from django.views.decorators.http import require_http_methods

# Import from local app
from .permissions import IsFinanceHead, IsAdmin
from .serializers import (
    UserSerializer, UserProfileUpdateSerializer, LoginSerializer,
    LogoutSerializer, LogoutResponseSerializer, LogoutErrorSerializer,
    MyTokenObtainPairSerializer, LoginAttemptSerializer,
    PasswordResetRequestSerializer, PasswordResetConfirmSerializer, PasswordChangeSerializer,
    AuthUserTableSerializer, AuthUserModalSerializer # User Management Serializers
)
from .models import LoginAttempt, UserActivityLog
User = get_user_model()



logger = logging.getLogger(__name__) 

def get_client_ip(request):
    x_forwarded_for = request.META.get('HTTP_X_FORWARDED_FOR')
    return x_forwarded_for.split(',')[0] if x_forwarded_for else request.META.get('REMOTE_ADDR')

@csrf_exempt
@require_http_methods(["GET", "HEAD"])
def auth_health_check_view(request):
    """
    Health check endpoint for Railway deployment.
    Returns 200 if service is healthy, 503 if degraded, 500 if error.
    """
    request_host = request.get_host()
    logger.info(f"Health check initiated from host: {request_host}")

    app_status = {
        "status": "healthy",
        "service": "auth_service",
        "timestamp": timezone.now().isoformat(), 
        "host_received": request_host,
        "database_status": "not_checked",
        "debug_info": {
            "allowed_hosts": list(settings.ALLOWED_HOSTS),
            "debug_mode": settings.DEBUG,
            "railway_env": bool(os.getenv('RAILWAY_ENVIRONMENT'))
        }
    }
    
    # Check if request host is in ALLOWED_HOSTS
    host_allowed = any(
        request_host == host or 
        (host.startswith('.') and request_host.endswith(host[1:])) or
        request_host == host
        for host in settings.ALLOWED_HOSTS
    )
    
    app_status["host_allowed"] = host_allowed
    
    if not host_allowed:
        logger.warning(f"Host '{request_host}' not in ALLOWED_HOSTS: {settings.ALLOWED_HOSTS}")
    
    # Database health check with timeout
    try:
        logger.info("Testing database connection...")
        
        # Use a simple query with timeout
        with connection.cursor() as cursor:
            cursor.execute("SELECT 1")
            result = cursor.fetchone()
            
            if result and result[0] == 1:
                app_status["database_status"] = "healthy"
                logger.info("Database connection successful")
            else:
                app_status["database_status"] = "query_failed"
                app_status["status"] = "degraded"
                logger.error("Database query failed - unexpected result")
                
    except OperationalError as e:
        app_status["database_status"] = f"connection_error: {str(e)[:100]}"
        app_status["status"] = "degraded"
        logger.error(f"Database connection failed: {e}")
        
    except Exception as e:
        app_status["database_status"] = f"error: {str(e)[:100]}"  
        app_status["status"] = "error"
        logger.error(f"Health check error: {e}", exc_info=True)
    
    # Determine response status code
    if app_status["status"] == "healthy":
        status_code = 200
    elif app_status["status"] == "degraded":
        status_code = 503  # Service temporarily unavailable
    else:
        status_code = 500  # Internal server error
    
    logger.info(f"Health check complete: {app_status['status']} (HTTP {status_code})")
    
    # For HEAD requests (often used by load balancers), return empty response
    if request.method == "HEAD":
        response = JsonResponse({}, status=status_code)
    else:
        response = JsonResponse(app_status, status=status_code)
    
    # Add headers for health check monitoring
    response['X-Health-Status'] = app_status['status']
    response['X-Service-Name'] = 'auth_service'
    
    return response




# --- Authentication Views ---

class UserInfoView(generics.RetrieveAPIView):
    """Endpoint for other services to get user info"""
    permission_classes = [AllowAny]  # Internal service call
    serializer_class = UserSerializer
    
    def get_object(self):
        user_id = self.kwargs.get('user_id')
        try:
            return User.objects.get(id=user_id)
        except User.DoesNotExist:
            return None
    
    def retrieve(self, request, *args, **kwargs):
        user = self.get_object()
        if not user:
            return Response(
                {"detail": "User not found", "code": "user_not_found"}, 
                status=404
            )
        
        serializer = self.get_serializer(user)
        return Response(serializer.data)
    
@method_decorator(ratelimit(key='ip', rate='10/m', method='POST', block=True), name='post')
class LoginView(APIView):
    permission_classes = [AllowAny]
    authentication_classes = []

    @extend_schema(
        request=LoginSerializer,
        tags=['Authentication'],
        summary="Login with email/phone and password",
        description="Authenticates a user and returns JWT access and refresh tokens, along with user details. Either provide email or phone number",
        responses={
            200: OpenApiResponse(
                description='Successful login',
                response=inline_serializer(
                    name='AuthServiceLoginSuccessResponse', # Renamed for uniqueness
                    fields={
                        'refresh': drf_serializers.CharField(),
                        'access': drf_serializers.CharField(),
                        'user': UserSerializer()
                    }
                )
            ),
            400: OpenApiResponse( # General error for invalid input or failed auth
                description="Invalid input or credentials",
                response=inline_serializer(
                    name='AuthServiceLoginErrorResponse',
                    fields={'detail': drf_serializers.ListField(child=drf_serializers.CharField())} # Or DictField
                )
            ),
            401: OpenApiResponse(description="Invalid credentials or inactive user (covered by 400 generally)"),
            429: OpenApiResponse(description="Rate limit exceeded")
        }
    )
    def post(self, request, *args, **kwargs):
        ip_address = get_client_ip(request)
        user_agent = request.META.get('HTTP_USER_AGENT', '')
        
        # Determine identifier for logging before validation
        login_identifier = request.data.get('email') or request.data.get('phone_number') or "unknown_identifier"

        login_validation_serializer = LoginSerializer(data=request.data, context={'request': request})

        if login_validation_serializer.is_valid():
            user = login_validation_serializer.validated_data['user']
            
            # Update last_login (was in monolith LoginSerializer, good to have in view)
            user.last_login = timezone.now()
            user.save(update_fields=['last_login'])

            refresh_token_obj = MyTokenObtainPairSerializer.get_token(user)
            tokens = {
                'refresh': str(refresh_token_obj),
                'access': str(refresh_token_obj.access_token),
            }

            LoginAttempt.objects.create(
                user=user, username_input=login_identifier,
                ip_address=ip_address, user_agent=user_agent, success=True
            )
            UserActivityLog.objects.create(
                user=user, log_type='LOGIN',
                action=f'User {user.username} logged in successfully.', status='SUCCESS',
                details={
                    'ip_address': ip_address, 'user_agent': user_agent,
                    'role': user.role, 'department_name': user.department_name
                }
            )
            return Response({
                'refresh': tokens['refresh'], 'access': tokens['access'],
                'user': UserSerializer(user, context={'request': request}).data
            }, status=status.HTTP_200_OK)
        else:
            # Log failed attempt
            # Try to find user if possible for more detailed logging, but don't expose existence
            failed_user_obj = None
            try:
                if '@' in login_identifier:
                    failed_user_obj = User.objects.filter(email__iexact=login_identifier).first()
                elif login_identifier.startswith('+'):
                     # Add phone number format validation here if desired before DB query
                    if re.match(r'^\+\d{10,15}$', login_identifier):
                        failed_user_obj = User.objects.filter(phone_number=login_identifier).first()
            except Exception: # Broad exception to avoid errors during logging
                pass


            LoginAttempt.objects.create(
                user=failed_user_obj, username_input=login_identifier,
                ip_address=ip_address, user_agent=user_agent, success=False
            )
            log_details = {
                'ip_address': ip_address, 'user_agent': user_agent,
                'errors': login_validation_serializer.errors
            }
            UserActivityLog.objects.create(
                user=failed_user_obj, log_type='LOGIN',
                action=f'Failed login attempt for identifier: {login_identifier}.', status='FAILED',
                details=log_details
            )
            # Return the validation errors from LoginSerializer
            return Response(login_validation_serializer.errors, status=status.HTTP_400_BAD_REQUEST)


@method_decorator(ratelimit(key='user_or_ip', rate='10/m', method='POST', block=True), name='post')
class LogoutView(APIView):
    permission_classes = [IsAuthenticated]

    @extend_schema(
        request=LogoutSerializer, tags=['Authentication'], summary="Logout user",
        description="Blacklists the provided refresh token.",
        responses={ 200: LogoutResponseSerializer, 400: LogoutErrorSerializer, 401: OpenApiResponse(description="Unauthorized."), 429: OpenApiResponse(description="Rate limit exceeded.")}
    )
    def post(self, request):
        serializer = LogoutSerializer(data=request.data)
        if not serializer.is_valid():
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

        try:
            refresh_token = serializer.validated_data['refresh']
            token = RefreshToken(refresh_token)
            token.blacklist()

            UserActivityLog.objects.create(
                user=request.user, log_type='LOGOUT',
                action=f'User {request.user.username} logged out.', status='SUCCESS',
                details={'ip_address': get_client_ip(request)}
            )
            return Response({"success": "Logged out successfully"}, status=status.HTTP_200_OK)
        except TokenError as e:
            UserActivityLog.objects.create(
                user=request.user, log_type='LOGOUT',
                action=f'Logout failed for user {request.user.username}.', status='FAILED',
                details={'error': str(e), 'ip_address': get_client_ip(request)}
            )
            return Response({"error": "Invalid or expired token", "detail": str(e)}, status=status.HTTP_400_BAD_REQUEST)
        except Exception as e:
            UserActivityLog.objects.create(
                user=request.user, log_type='LOGOUT',
                action='Logout failed due to an unexpected error.', status='FAILED',
                details={'error': str(e), 'ip_address': get_client_ip(request)}
            )
            return Response({"error": "An unexpected error occurred during logout."}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


class CustomTokenRefreshView(OriginalTokenRefreshView):
    @extend_schema(
        tags=['Authentication'], summary="Refresh JWT access token",
        description="Takes a refresh token and returns a new access token.",
        request=TokenRefreshSerializer,
        responses={
            200: OpenApiResponse(description="New access token", response=inline_serializer(name='AuthServiceTokenRefreshResponse', fields={'access': drf_serializers.CharField()})),
            401: OpenApiResponse(description="Invalid/expired refresh token", response=inline_serializer(name='AuthServiceTokenErrorResponse', fields={'detail': drf_serializers.CharField(), 'code': drf_serializers.CharField()}))
        }
    )
    def post(self, request, *args, **kwargs):
        # Logic for logging token refresh attempts is good as previously discussed.
        response = super().post(request, *args, **kwargs)
        user_id_from_token = request.data.get('refresh_token_payload', {}).get('user_id') # Try to get from decoded if available
        user_for_log = None
        if user_id_from_token:
            try: user_for_log = User.objects.get(pk=user_id_from_token)
            except User.DoesNotExist: pass

        if response.status_code == 200:
            UserActivityLog.objects.create(
                user=user_for_log, log_type='TOKEN_REFRESH',
                action=f'Token refreshed for user ID {user_id_from_token if user_id_from_token else "unknown"}.', status='SUCCESS',
                details={'ip_address': get_client_ip(request)}
            )
        else:
            UserActivityLog.objects.create(
                user=user_for_log, log_type='TOKEN_REFRESH',
                action=f'Token refresh failed for user ID {user_id_from_token if user_id_from_token else "unknown"}.', status='FAILED',
                details={'ip_address': get_client_ip(request), 'response_status': response.status_code, 'errors': response.data if hasattr(response, 'data') else None}
            )
        return response

# --- User Profile View ---

class UserProfileView(generics.RetrieveUpdateAPIView):
    permission_classes = [IsAuthenticated]

    def get_serializer_class(self):
        if self.request.method in ['PUT', 'PATCH']:
            return UserProfileUpdateSerializer # Use the specific serializer for self-updates
        return UserSerializer # For GET

    def get_object(self):
        return self.request.user

    @extend_schema(
        tags=['User Profile'], summary="Retrieve or update authenticated user's profile",
        description="GET: retrieve profile. PUT/PATCH: update first_name, last_name, phone_number.",
        responses={ 200: UserSerializer, 400: OpenApiResponse(description="Invalid data."), 401: OpenApiResponse(description="Unauthorized.") }
    )
    def get(self, request, *args, **kwargs):
        UserActivityLog.objects.create(
            user=request.user, log_type='PROFILE_VIEW',
            action=f'User {request.user.username} viewed profile.', status='SUCCESS',
            details={'ip_address': get_client_ip(request)}
        )
        return super().get(request, *args, **kwargs)

    # MODIFICATION START
    # Override the update method to return the full user object
    def update(self, request, *args, **kwargs):
        partial = kwargs.pop('partial', False)
        instance = self.get_object()
        
        # Use the update serializer to validate and save
        update_serializer = self.get_serializer(instance, data=request.data, partial=partial)
        update_serializer.is_valid(raise_exception=True)
        self.perform_update(update_serializer)

        # Log the activity
        log_action = f'User {request.user.username} updated profile.'
        UserActivityLog.objects.create(
            user=request.user, log_type='PROFILE_UPDATE', action=log_action, status='SUCCESS',
            details={'ip_address': get_client_ip(request), 'data_sent': request.data}
        )
        
        # Use the full UserSerializer for the response
        response_serializer = UserSerializer(instance, context=self.get_serializer_context())
        return Response(response_serializer.data)
    # MODIFICATION END

    @extend_schema(tags=['User Profile'], description='Fully update user profile (fields in UserProfileUpdateSerializer).', request=UserProfileUpdateSerializer)
    def put(self, request, *args, **kwargs):
        return self.update(request, *args, **kwargs)

    @extend_schema(tags=['User Profile'], description='Partially update user profile (fields in UserProfileUpdateSerializer).', request=UserProfileUpdateSerializer)
    def patch(self, request, *args, **kwargs):
        return self.partial_update(request, *args, **kwargs)


# --- Login Attempts View (Security) ---
class LoginAttemptsView(generics.ListAPIView):
    serializer_class = LoginAttemptSerializer
    permission_classes = [IsAuthenticated, (IsAdmin | IsFinanceHead)] # Ensure IsAdmin/IsFinanceHead are in .permissions

    @extend_schema(
        tags=['Security'], operation_id='auth_service_list_login_attempts', summary="List login attempts",
        description='Admins/Finance Heads see all; others (if configured) see their own.'
    )
    def get_queryset(self):
        user = self.request.user
        if hasattr(user, 'role') and user.role in ['ADMIN', 'FINANCE_HEAD']:
            return LoginAttempt.objects.all().order_by('-timestamp')
        return LoginAttempt.objects.none() # Default: non-admins see nothing

# --- Password Management Views ---
# Ensure imports are correct and logging uses the auth_service's UserActivityLog.

@method_decorator(ratelimit(key='ip', rate='3/h', method='POST', block=True), name='post')
# Removed duplicate ratelimit decorator: ratelimit(key='user_or_ip', rate='5/h', method='POST', block=True)
# One is sufficient for IP, user_or_ip is more for authenticated endpoints or where user can be identified.
class PasswordResetRequestView(APIView):
    permission_classes = [AllowAny]

    @extend_schema(
        tags=["Password Management"], summary="Request password reset email",
        request=PasswordResetRequestSerializer,
        responses={ 200: OpenApiResponse(description="Password reset email sent (best effort)."), 400: OpenApiResponse(description="Invalid input."), 429: OpenApiResponse(description="Rate limit.")}
    )
    def post(self, request):
        serializer = PasswordResetRequestSerializer(data=request.data)
        if serializer.is_valid():
            user_obj = serializer.save() # Serializer now returns user object or None
            
            log_status = 'SUCCESS' if user_obj else 'ATTEMPTED' # If user found, email was attempted
            action_detail = f" for email: {request.data.get('email')}"
            if user_obj:
                 action_detail += f" (User: {user_obj.username})"


            UserActivityLog.objects.create(
                user=user_obj, # Can be None if email doesn't exist
                log_type='PASSWORD_RESET_REQUEST',
                action=f"Password reset requested{action_detail}",
                status=log_status,
                details={'ip_address': get_client_ip(request), 'email_provided': request.data.get('email')}
            )
            return Response(
                {"detail": "If an account with that email exists, a password reset link has been sent."},
                status=status.HTTP_200_OK
            )
        
        UserActivityLog.objects.create(
            user=None, log_type='PASSWORD_RESET_REQUEST',
            action=f"Password reset request failed validation for email: {request.data.get('email')}", status='FAILED',
            details={'ip_address': get_client_ip(request), 'email_provided': request.data.get('email'), 'errors': serializer.errors}
        )
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


@method_decorator(ratelimit(key='ip', rate='10/h', method='POST', block=True), name='post')
class PasswordResetConfirmView(APIView):
    permission_classes = [AllowAny]

    @extend_schema(
        tags=["Password Management"], summary="Confirm password reset",
        request=PasswordResetConfirmSerializer, # Serializer handles uid/token/password
        responses={ 200: OpenApiResponse(description="Password reset successful."), 400: OpenApiResponse(description="Invalid input/token."), 429: OpenApiResponse(description="Rate limit.")}
    )
    def post(self, request):
        serializer = PasswordResetConfirmSerializer(data=request.data)
        if serializer.is_valid():
            user = serializer.save()
            UserActivityLog.objects.create(
                user=user, log_type='PASSWORD_RESET_CONFIRM',
                action=f'Password reset for user {user.username}.', status='SUCCESS',
                details={'method': 'reset_confirm', 'ip_address': get_client_ip(request)}
            )
            return Response({"detail": "Password has been reset successfully."}, status=status.HTTP_200_OK)
        
        UserActivityLog.objects.create(
            user=getattr(serializer, 'user', None), # Try to get user if validation reached that far
            log_type='PASSWORD_RESET_CONFIRM',
            action='Password reset confirmation failed.', status='FAILED',
            details={'ip_address': get_client_ip(request), 'errors': serializer.errors}
        )
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


@method_decorator(ratelimit(key='user', rate='5/h', method='POST', block=True), name='post')
class PasswordChangeView(APIView):
    permission_classes = [IsAuthenticated]

    @extend_schema(
        tags=["Password Management"], summary="Change password (authenticated)",
        request=PasswordChangeSerializer,
        responses={ 200: OpenApiResponse(description="Password changed."), 400: OpenApiResponse(description="Invalid input."), 401: OpenApiResponse(description="Unauthorized."), 429: OpenApiResponse(description="Rate limit.")}
    )
    def post(self, request):
        serializer = PasswordChangeSerializer(data=request.data, context={'request': request})
        if serializer.is_valid():
            user = serializer.save()
            UserActivityLog.objects.create(
                user=user, log_type='PASSWORD_CHANGE',
                action=f'Password changed by user {user.username}.', status='SUCCESS',
                details={'method': 'change', 'ip_address': get_client_ip(request)}
            )
            return Response({"detail": "Password changed successfully."}, status=status.HTTP_200_OK)

        UserActivityLog.objects.create(
            user=request.user, log_type='PASSWORD_CHANGE',
            action=f'Password change attempt failed by user {request.user.username}.', status='FAILED',
            details={'ip_address': get_client_ip(request), 'errors': serializer.errors}
        )
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
    
# --- User Management ViewSet (Adapted from monolith) ---

@extend_schema_view(
    list=extend_schema(
        summary="List users (Admin)",
        description="Returns a paginated list of users. Supports search and filtering.",
        parameters=[
            OpenApiParameter(name="search", description="Search by name, email, username", type=OpenApiTypes.STR),
            OpenApiParameter(name="role", description="Filter by role", type=OpenApiTypes.STR, enum=[choice[0] for choice in User.ROLE_CHOICES]),
            OpenApiParameter(name="is_active", description="Filter by active status", type=OpenApiTypes.BOOL),
        ],
        responses={200: AuthUserTableSerializer(many=True)},
        tags=["User Management (Admin)"]
    ),
    create=extend_schema(
        summary="Create user (Admin)",
        request=AuthUserModalSerializer,
        responses={201: AuthUserModalSerializer},
        tags=["User Management (Admin)"]
    ),
    retrieve=extend_schema(
        summary="Get user details (Admin)",
        responses={200: AuthUserModalSerializer},
        tags=["User Management (Admin)"]
    ),
    update=extend_schema(
        summary="Update user (Full - Admin)",
        request=AuthUserModalSerializer,
        responses={200: AuthUserModalSerializer},
        tags=["User Management (Admin)"]
    ),
    partial_update=extend_schema(
        summary="Update user (Partial - Admin)",
        request=AuthUserModalSerializer, # Can still use modal serializer for partial
        responses={200: AuthUserModalSerializer},
        tags=["User Management (Admin)"]
    ),
    destroy=extend_schema(
        summary="Delete user (Admin)",
        responses={204: OpenApiResponse(description="User deleted")},
        tags=["User Management (Admin)"]
    )
)
class UserManagementViewSet(viewsets.ModelViewSet):
    """
    ViewSet for administrators to manage users in the auth_service.
    """
    queryset = User.objects.all().order_by('first_name', 'last_name')
    permission_classes = [IsAuthenticated, IsAdmin] # Ensure IsAdmin is correctly defined and imported
    filter_backends = [DjangoFilterBackend, filters.SearchFilter]
    filterset_fields = ['role', 'is_active'] # Fields on the auth_service.User model
    search_fields = ['first_name', 'last_name', 'email', 'username'] # Fields on the auth_service.User model

    def get_serializer_class(self):
        if self.action == 'list':
            return AuthUserTableSerializer
        # For create, retrieve, update, partial_update
        return AuthUserModalSerializer

    def perform_create(self, serializer):
        # Logic for creation (e.g., password handling) is in AuthUserModalSerializer.create
        user = serializer.save()
        UserActivityLog.objects.create(
            user=self.request.user, # Admin performing action
            log_type='CREATE', action=f'Admin created user: {user.username}', status='SUCCESS',
            details={'created_user_id': user.id, 'admin_user_id': self.request.user.id}
        )

    def perform_update(self, serializer):
        user = serializer.save()
        UserActivityLog.objects.create(
            user=self.request.user, # Admin performing action
            log_type='UPDATE', action=f'Admin updated user: {user.username}', status='SUCCESS',
            details={'updated_user_id': user.id, 'admin_user_id': self.request.user.id}
        )

    def perform_destroy(self, instance):
        username = instance.username # Get username before deletion
        instance.delete()
        UserActivityLog.objects.create(
            user=self.request.user, # Admin performing action
            log_type='DELETE', action=f'Admin deleted user: {username}', status='SUCCESS',
            details={'deleted_user_username': username, 'admin_user_id': self.request.user.id}
        )

    @extend_schema(
        summary="Toggle user active status (Admin)",
        description="Toggles the active status of a user.",
        responses={200: AuthUserTableSerializer}, # Or AuthUserModalSerializer if more detail needed
        tags=["User Management (Admin)"]
    )
    @action(detail=True, methods=['patch'], url_path='toggle-active')
    def toggle_active_status(self, request, pk=None): # Renamed for clarity
        user_to_toggle = self.get_object()
        old_status = user_to_toggle.is_active
        user_to_toggle.is_active = not user_to_toggle.is_active
        user_to_toggle.save(update_fields=['is_active'])
        
        UserActivityLog.objects.create(
            user=request.user, # Admin performing action
            log_type='UPDATE',
            action=f'Admin toggled active status for user {user_to_toggle.username} from {old_status} to {user_to_toggle.is_active}',
            status='SUCCESS',
            details={'target_user_id': user_to_toggle.id, 'new_status': user_to_toggle.is_active}
        )
        serializer = self.get_serializer(user_to_toggle) # Use appropriate serializer (Modal or Table)
        return Response(serializer.data)

    @extend_schema(
        summary="Get user role choices (Admin)",
        description="Returns available user roles for UI dropdowns.",
        responses={ 200: OpenApiResponse(
            response=inline_serializer(name="UserRoleChoices", fields={
                "value": drf_serializers.CharField(), "label": drf_serializers.CharField()
            }, many=True)
        )},
        tags=["User Management (Admin)"]
    )
    @action(detail=False, methods=['get'])
    def roles(self, request):
        """
        Return all available user roles defined in the auth_service.User model.
        """
        # Uses ROLE_CHOICES from the auth_service.users.User model
        roles_data = [{'value': code, 'label': label} for code, label in User.ROLE_CHOICES]
        return Response(roles_data)

# Note: DepartmentViewSet is NOT included here as Department model is not in auth_service.
# If the UI for user management needs a department dropdown, fetch that
# data from the budgeting service (or whichever service owns department master data).
# the AuthUserModalSerializer accepts department_id and department_name as text/integer inputs