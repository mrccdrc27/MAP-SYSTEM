from rest_framework import generics, serializers as drf_serializers, status, viewsets, mixins
from rest_framework.decorators import api_view, permission_classes
from rest_framework.response import Response
from rest_framework.parsers import MultiPartParser, FormParser, JSONParser
from rest_framework_simplejwt.views import TokenObtainPairView
from rest_framework_simplejwt.tokens import RefreshToken
from rest_framework_simplejwt.exceptions import TokenError
from rest_framework.exceptions import ValidationError
from drf_spectacular.utils import extend_schema, OpenApiResponse, inline_serializer, extend_schema_view, OpenApiExample
from drf_spectacular.types import OpenApiTypes
from rest_framework.permissions import AllowAny, IsAuthenticated
from django.contrib.auth import authenticate
from .models import User, UserOTP, PasswordResetToken
from .serializers import (
    UserRegistrationSerializer, 
    UserProfileSerializer,
    UserProfileUpdateSerializer,
    CustomTokenObtainPairSerializer,
    OTPRequestSerializer,
    Enable2FASerializer,
    Disable2FASerializer,
    ForgotPasswordSerializer,
    ResetPasswordSerializer,
    ProfilePasswordResetSerializer,
    send_password_reset_email
)
from django.contrib.auth import login
from permissions import IsSystemAdminOrSuperUser, filter_users_by_system_access
from system_roles.models import UserSystemRole
from django.shortcuts import render, redirect
from django.contrib import messages
from .forms import ProfileSettingsForm
from .decorators import jwt_cookie_required # <-- IMPORT THE NEW DECORATOR

# Simple serializer for logout - doesn't need any fields
class LogoutSerializer(drf_serializers.Serializer):
    pass

# generics.CreateAPIView provides a POST method handler


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
    """
    API view for user registration.
    """
    queryset = User.objects.all()
    permission_classes = (AllowAny,)
    serializer_class = UserRegistrationSerializer


@extend_schema_view(
    get=extend_schema(
        tags=['User Profile'],
        summary="Retrieve authenticated user's profile",
        description="Fetches the profile information for the user whose JWT is provided in the `Authorization: Bearer <token>` header.",
        responses={
            200: OpenApiResponse(
                response=UserProfileSerializer,
                description="Successfully retrieved the user's profile."
            ),
            401: OpenApiResponse(
                response=inline_serializer(
                    name='ProfileGetUnauthorizedError',
                    fields={'detail': drf_serializers.CharField()}
                ),
                description="Unauthorized. This occurs if the JWT is missing, invalid, or expired."
            )
        }
    ),
    patch=extend_schema(
        tags=['User Profile'],
        summary="Update authenticated user's profile",
        description="Partially update the profile information for the authenticated user. Only provided fields will be updated. Supports both JSON and multipart/form-data for file uploads.",
        request={
            'multipart/form-data': UserProfileUpdateSerializer,
            'application/json': UserProfileUpdateSerializer,
        },
        responses={
            200: OpenApiResponse(
                response=UserProfileSerializer,
                description="Successfully updated the user's profile."
            ),
            400: OpenApiResponse(
                response=inline_serializer(
                    name='ProfileUpdateErrorResponse',
                    fields={
                        'email': drf_serializers.ListField(child=drf_serializers.CharField(), required=False),
                        'username': drf_serializers.ListField(child=drf_serializers.CharField(), required=False),
                        'phone_number': drf_serializers.ListField(child=drf_serializers.CharField(), required=False),
                    }
                ),
                description="Bad Request. This occurs when input data is invalid, such as a duplicate email or username."
            ),
            401: OpenApiResponse(
                response=inline_serializer(
                    name='ProfileUpdateUnauthorizedError',
                    fields={'detail': drf_serializers.CharField()}
                ),
                description="Unauthorized. This occurs if the JWT is missing, invalid, or expired."
            )
        }
    )
)
class ProfileView(generics.RetrieveUpdateAPIView):
    """
    API view to retrieve and partially update the profile of the currently authenticated user.
    
    GET: Returns the user's profile information
    PATCH/PUT: Partially updates the user's profile information (only provided fields)
    """
    permission_classes = (IsAuthenticated,)
    serializer_class = UserProfileSerializer
    parser_classes = (MultiPartParser, FormParser, JSONParser)  # Support file uploads
    http_method_names = ['get', 'patch', 'put', 'head', 'options']  # Allow GET, PATCH, and PUT

    def get_object(self):
        # get_object is overridden to return the user attached to the request
        return self.request.user

    def get_serializer_class(self):
        """Return different serializers for different HTTP methods."""
        if self.request.method in ['PATCH', 'PUT']:
            return UserProfileUpdateSerializer
        return UserProfileSerializer

    def update(self, request, *args, **kwargs):
        """Handle profile updates with custom response."""
        partial = kwargs.get('partial', True)  # Default to partial update
        instance = self.get_object()
        
        # Check if user is admin or superuser
        user = request.user
        is_admin_or_superuser = user.is_superuser or user.is_staff
        
        # If not admin/superuser, restrict which fields can be updated
        if not is_admin_or_superuser:
            allowed_fields = {'username', 'phone_number', 'profile_picture'}
            restricted_fields = set(request.data.keys()) - allowed_fields
            
            if restricted_fields:
                return Response(
                    {
                        'error': 'Permission denied',
                        'detail': f'You can only update: {", ".join(allowed_fields)}. '
                                 f'Attempted to update restricted fields: {", ".join(restricted_fields)}'
                    },
                    status=status.HTTP_403_FORBIDDEN
                )
        
        serializer = self.get_serializer(instance, data=request.data, partial=partial)
        serializer.is_valid(raise_exception=True)
        self.perform_update(serializer)

        # Return the updated user profile using the read serializer with request context
        response_serializer = UserProfileSerializer(instance, context={'request': request})
        return Response(response_serializer.data, status=status.HTTP_200_OK)

    def perform_update(self, serializer):
        """Save the updated user instance."""
        serializer.save()


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
        serializer = self.get_serializer(data=request.data)

        try:
            serializer.is_valid(raise_exception=True)
        # ... (keep your existing exception handling for OTP etc.) ...
        except ValidationError as e:
             # ... (your existing OTP/error handling code) ...
             # If OTP is required but not provided...
             if 'otp_required' in error_codes:
                 # ... (your existing code to send OTP) ...
                 pass # Placeholder for existing code
             elif 'otp_invalid' in error_codes:
                 # ... (your existing code) ...
                 pass # Placeholder for existing code
             elif 'otp_expired' in error_codes:
                 # ... (your existing code) ...
                 pass # Placeholder for existing code

             # For other validation errors, return the original response
             raise e # Make sure to re-raise if it's not an OTP error handled here

        # --- Authentication successful ---

        # Get tokens from serializer
        tokens = serializer.validated_data
        access_token = tokens['access']
        refresh_token = tokens['refresh']

        # Get the authenticated user
        user = serializer.user

        # --- START: HDTS LOGIC ---
        # Check if the user is an 'Employee' in the 'HDTS' system.
        # We use system__slug='hdts' and role__name='Employee' for reverse lookup.
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
        # --- END: NEW LOGIC ---

        # *** NEW: Log the user into Django's session framework ***
        login(request, user)
        # **********************************************************

        # Get system roles for the user (keep existing code)
        system_roles_data = []
        # ... (your existing code to populate system_roles_data) ...
        user_system_roles = UserSystemRole.objects.filter(user=user).select_related('system', 'role')
        for role_assignment in user_system_roles:
            system_roles_data.append({
                'system_name': role_assignment.system.name,
                'system_slug': role_assignment.system.slug,
                'role_name': role_assignment.role.name,
                'assigned_at': role_assignment.assigned_at,
            })


        response_data = {
            'message': 'Authentication successful',
            'user': {
                # ... (your existing user data fields) ...
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

            }
        }

        response = Response(response_data, status=status.HTTP_200_OK)

        # Set JWT cookies (keep existing code)
        # ... (your existing response.set_cookie calls for access_token and refresh_token) ...
        from django.conf import settings

        # Set access token cookie
        response.set_cookie(
            'access_token',
            access_token,
            max_age=settings.SIMPLE_JWT['ACCESS_TOKEN_LIFETIME'].total_seconds(),
            httponly=False,  # Changed from True to False to make it a regular cookie
            secure=not settings.DEBUG,  # Use secure cookies in production
            samesite='Lax',
            path='/',  # Make cookie available for all paths
            domain=None  # None for localhost compatibility (works for both localhost and 127.0.0.1)
        )

        # Set refresh token cookie
        response.set_cookie(
            'refresh_token',
            refresh_token,
            max_age=settings.SIMPLE_JWT['REFRESH_TOKEN_LIFETIME'].total_seconds(),
            httponly=False,  # Changed from True to False to make it a regular cookie
            secure=not settings.DEBUG,  # Use secure cookies in production
            samesite='Lax',
            path='/',  # Make cookie available for all paths
            domain=None  # None for localhost compatibility (works for both localhost and 127.0.0.1)
        )


        return response

@extend_schema(
    tags=['2FA'],
    summary="Request OTP for 2FA",
    description="Generate and send OTP code via email for users with 2FA enabled.",
    request=OTPRequestSerializer,
    responses={
        200: OpenApiResponse(
            response=inline_serializer(
                name='OTPResponse',
                fields={'message': drf_serializers.CharField()}
            ),
            description="OTP sent successfully"
        ),
        400: OpenApiResponse(
            description="Bad request - invalid credentials or 2FA not enabled"
        )
    }
)
class RequestOTPView(generics.CreateAPIView):
    """Generate OTP for user with valid credentials and send via email."""
    permission_classes = [AllowAny]
    serializer_class = OTPRequestSerializer
    
    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        if serializer.is_valid():
            user = serializer.validated_data['user']
            otp_instance = UserOTP.generate_for_user(user, otp_type='email')
            
            # Send OTP via email
            try:
                from django.core.mail import send_mail
                from django.conf import settings
                
                send_mail(
                    subject='Your 2FA Code',
                    message=f'Your verification code is: {otp_instance.otp_code}\n\nThis code will expire in 5 minutes.',
                    from_email=settings.DEFAULT_FROM_EMAIL,
                    recipient_list=[user.email],
                    fail_silently=False,
                )
                
                return Response({
                    'message': 'OTP sent to your email address',
                    'expires_in_minutes': 5
                }, status=status.HTTP_200_OK)
            except Exception as e:
                return Response({
                    'error': 'Failed to send email. Please try again later.'
                }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
        
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


@extend_schema(
    tags=['2FA'],
    summary="Enable 2FA",
    description="Enable two-factor authentication for the authenticated user",
    request=Enable2FASerializer,
    responses={
        200: OpenApiResponse(
            response=inline_serializer(
                name='Enable2FAResponse',
                fields={'message': drf_serializers.CharField()}
            ),
            description="2FA enabled successfully"
        ),
        400: OpenApiResponse(description="Bad request - invalid password"),
        401: OpenApiResponse(description="Unauthorized")
    }
)
class Enable2FAView(generics.CreateAPIView):
    """Enable 2FA for the authenticated user."""
    permission_classes = [IsAuthenticated]
    serializer_class = Enable2FASerializer
    
    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        if serializer.is_valid():
            user = request.user
            user.otp_enabled = True
            user.save(update_fields=['otp_enabled'])
            return Response({'message': '2FA enabled successfully'}, status=status.HTTP_200_OK)
        
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


@extend_schema(
    tags=['2FA'],
    summary="Disable 2FA",
    description="Disable two-factor authentication for the authenticated user",
    request=Disable2FASerializer,
    responses={
        200: OpenApiResponse(
            response=inline_serializer(
                name='Disable2FAResponse',
                fields={'message': drf_serializers.CharField()}
            ),
            description="2FA disabled successfully"
        ),
        400: OpenApiResponse(description="Bad request - invalid password or OTP"),
        401: OpenApiResponse(description="Unauthorized")
    }
)
class Disable2FAView(generics.CreateAPIView):
    """Disable 2FA for the authenticated user."""
    permission_classes = [IsAuthenticated]
    serializer_class = Disable2FASerializer
    
    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        if serializer.is_valid():
            user = request.user
            user.otp_enabled = False
            user.save(update_fields=['otp_enabled'])
            
            # Invalidate all existing OTP codes for this user
            UserOTP.objects.filter(user=user, is_used=False).update(is_used=True)
            
            return Response({'message': '2FA disabled successfully'}, status=status.HTTP_200_OK)
        
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


@extend_schema(
    tags=['Password Reset'],
    summary="Request password reset",
    description="Send a password reset email to the user if the email exists in the system. For security reasons, this endpoint always returns success regardless of whether the email exists.",
    request=ForgotPasswordSerializer,
    responses={
        200: OpenApiResponse(
            response=inline_serializer(
                name='ForgotPasswordResponse',
                fields={'message': drf_serializers.CharField()}
            ),
            description="Password reset email sent (if email exists)"
        ),
        400: OpenApiResponse(description="Bad request - invalid email format")
    }
)
class ForgotPasswordView(generics.CreateAPIView):
    """Request password reset via email."""
    permission_classes = [AllowAny]
    serializer_class = ForgotPasswordSerializer
    
    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        if serializer.is_valid():
            email = serializer.validated_data['email']
            
            try:
                user = User.objects.get(email=email, is_active=True)
                reset_token = PasswordResetToken.generate_for_user(user)
                
                # Send password reset email
                if send_password_reset_email(user, reset_token, request):
                    message = 'If an account with that email exists, a password reset link has been sent.'
                else:
                    message = 'If an account with that email exists, a password reset link has been sent.'
                    # Note: We still return success even if email sending failed for security
                    
            except User.DoesNotExist:
                # For security, don't reveal that the email doesn't exist
                message = 'If an account with that email exists, a password reset link has been sent.'
            
            return Response({'message': message}, status=status.HTTP_200_OK)
        
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


@extend_schema(
    tags=['Password Reset'],
    summary="Reset password with token",
    description="Reset user's password using a valid reset token received via email. Token can be provided either as a URL parameter or in the request body.",
    request=ResetPasswordSerializer,
    responses={
        200: OpenApiResponse(
            response=inline_serializer(
                name='ResetPasswordResponse',
                fields={'message': drf_serializers.CharField()}
            ),
            description="Password reset successfully"
        ),
        400: OpenApiResponse(description="Bad request - invalid token or password validation errors")
    }
)
class ResetPasswordView(generics.GenericAPIView):
    """Reset password using reset token."""
    permission_classes = [AllowAny]
    serializer_class = ResetPasswordSerializer
    
    def get(self, request, *args, **kwargs):
        """Render the password reset form."""
        # Get token from URL parameter
        token = request.query_params.get('token', '')
        
        # Check if token is valid before rendering the form
        reset_token = PasswordResetToken.get_valid_token(token)
        if not reset_token:
            # If token is invalid, render an error page
            context = {
                'error': 'Invalid or expired reset token. Please request a new password reset link.',
                'token_valid': False
            }
        else:
            # Token is valid, render the form
            context = {
                'token': token,
                'token_valid': True
            }
            
        # Render the template with context - using correct path without 'templates/'
        from django.shortcuts import render
        return render(request, 'reset_password.html', context)
        
    def post(self, request, *args, **kwargs):
        """Process the password reset form submission."""
        # Check if form data is submitted
        token = request.POST.get('token') or request.query_params.get('token', '')
        password = request.POST.get('password', '')
        password_confirm = request.POST.get('password_confirm', '')
        
        # Create a data dict for serializer validation
        data = {
            'token': token,
            'password': password,
            'password_confirm': password_confirm
        }
        
        serializer = self.get_serializer(data=data)
        
        from django.shortcuts import render
        
        if serializer.is_valid():
            reset_token = serializer.validated_data['reset_token']
            password = serializer.validated_data['password']
            
            # Reset the password
            user = reset_token.user
            user.set_password(password)
            user.save(update_fields=['password'])
            
            # Mark token as used
            reset_token.use_token()
            
            # Invalidate all existing OTP codes for security
            UserOTP.objects.filter(user=user, is_used=False).update(is_used=True)
            
            # Render success page with correct path
            context = {
                'success': True,
                'message': 'Password has been reset successfully. You can now log in with your new password.'
            }
            return render(request, 'users/reset_password_success.html', context)
        
        # If validation fails, render the form again with errors
        context = {
            'token': token,
            'token_valid': True,  # We assume token is valid since validation errors may be for password
            'errors': serializer.errors
        }
        return render(request, 'reset_password.html', context)


class UserViewSet(viewsets.ModelViewSet):
    """
    ViewSet for managing users with CRUD operations.
    Superusers can see all users, system admins can only see users in their systems.
    """
    queryset = User.objects.all()
    serializer_class = UserProfileSerializer
    permission_classes = [IsSystemAdminOrSuperUser]

    def get_queryset(self):
        """Filter users based on requesting user's permissions for all operations"""
        queryset = User.objects.all()
        return filter_users_by_system_access(queryset, self.request.user)

    def list(self, request):
        """List users with filtering based on permissions"""
        queryset = self.get_queryset()
        serializer = self.get_serializer(queryset, many=True)
        return Response({
            'users_count': queryset.count(),
            'users': serializer.data
        })

    def retrieve(self, request, pk=None):
        """Retrieve a specific user if user has access"""
        try:
            user = self.get_queryset().get(pk=pk)
            serializer = self.get_serializer(user)
            return Response(serializer.data)
        except User.DoesNotExist:
            return Response(
                {"error": "User not found or access denied"}, 
                status=status.HTTP_404_NOT_FOUND
            )

    def create(self, request):
        """Create a new user - restricted for system admins"""
        # System admins cannot create users directly through this endpoint
        # They should use the AdminInviteUserViewSet instead
        if not request.user.is_superuser:
            return Response(
                {"error": "System admins should use the admin invite endpoint to create users"}, 
                status=status.HTTP_403_FORBIDDEN
            )
        
        serializer = UserRegistrationSerializer(data=request.data)
        if serializer.is_valid():
            serializer.save()
            return Response(serializer.data, status=status.HTTP_201_CREATED)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

    def update(self, request, pk=None):
        """Update a user if user has access"""
        try:
            user = self.get_queryset().get(pk=pk)
            
            # Users can only update themselves unless they're superuser
            if not request.user.is_superuser and user != request.user:
                # Check if requesting user is admin of any system the target user belongs to
                from system_roles.models import UserSystemRole
                admin_systems = UserSystemRole.objects.filter(
                    user=request.user,
                    role__name='Admin'
                ).values_list('system_id', flat=True)
                
                user_systems = UserSystemRole.objects.filter(
                    user=user
                ).values_list('system_id', flat=True)
                
                if not set(admin_systems).intersection(set(user_systems)):
                    return Response(
                        {"error": "Access denied to modify this user"}, 
                        status=status.HTTP_403_FORBIDDEN
                    )
            
            serializer = self.get_serializer(user, data=request.data)
            if serializer.is_valid():
                serializer.save()
                return Response(serializer.data)
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
        except User.DoesNotExist:
            return Response(
                {"error": "User not found or access denied"}, 
                status=status.HTTP_404_NOT_FOUND
            )

    def partial_update(self, request, pk=None):
        """Partial update a user if user has access"""
        try:
            user = self.get_queryset().get(pk=pk)
            
            # Users can only update themselves unless they're superuser
            if not request.user.is_superuser and user != request.user:
                # Check if requesting user is admin of any system the target user belongs to
                from system_roles.models import UserSystemRole
                admin_systems = UserSystemRole.objects.filter(
                    user=request.user,
                    role__name='Admin'
                ).values_list('system_id', flat=True)
                
                user_systems = UserSystemRole.objects.filter(
                    user=user
                ).values_list('system_id', flat=True)
                
                if not set(admin_systems).intersection(set(user_systems)):
                    return Response(
                        {"error": "Access denied to modify this user"}, 
                        status=status.HTTP_403_FORBIDDEN
                    )
            
            serializer = self.get_serializer(user, data=request.data, partial=True)
            if serializer.is_valid():
                serializer.save()
                return Response(serializer.data)
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
        except User.DoesNotExist:
            return Response(
                {"error": "User not found or access denied"}, 
                status=status.HTTP_404_NOT_FOUND
            )

    def destroy(self, request, pk=None):
        """Delete a user - restricted operation"""
        if not request.user.is_superuser:
            return Response(
                {"error": "Only superusers can delete users"}, 
                status=status.HTTP_403_FORBIDDEN
            )
        
        try:
            user = self.get_queryset().get(pk=pk)
            
            # Prevent deletion of superusers by other superusers
            if user.is_superuser and user != request.user:
                return Response(
                    {"error": "Cannot delete other superusers"}, 
                    status=status.HTTP_403_FORBIDDEN
                )
            
            user.delete()
            return Response(status=status.HTTP_204_NO_CONTENT)
        except User.DoesNotExist:
            return Response(
                {"error": "User not found or access denied"}, 
                status=status.HTTP_404_NOT_FOUND
            )


@extend_schema(
    tags=["User Profile"],
    summary="Reset password from profile",
    description="Authenticated user can reset their password by providing current and new password.",
    request=ProfilePasswordResetSerializer,
    responses={200: OpenApiResponse(description="Password reset successful"), 400: OpenApiResponse(description="Validation error")}
)
class ProfilePasswordResetView(generics.GenericAPIView):
    permission_classes = [IsAuthenticated]
    serializer_class = ProfilePasswordResetSerializer

    def post(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data, context={'request': request})
        serializer.is_valid(raise_exception=True)
        user = request.user
        user.set_password(serializer.validated_data['new_password'])
        user.save()
        return Response({"detail": "Password reset successful."}, status=200)


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
        from django.conf import settings
        
        # Get refresh token from cookie
        refresh_token = request.COOKIES.get('refresh_token')
        
        if not refresh_token:
            return Response(
                {'detail': 'Refresh token not found in cookies'}, 
                status=status.HTTP_401_UNAUTHORIZED
            )
        
        try:
            # Validate and refresh the token
            refresh = RefreshToken(refresh_token)
            access_token = str(refresh.access_token)
            
            # Create response
            response_data = {'message': 'Token refreshed successfully'}
            response = Response(response_data, status=status.HTTP_200_OK)
            
            # Set new access token as cookie
            response.set_cookie(
                'access_token',
                access_token,
                max_age=settings.SIMPLE_JWT['ACCESS_TOKEN_LIFETIME'].total_seconds(),
                httponly=False,  # Changed from True to False to make it a regular cookie
                secure=not settings.DEBUG,
                samesite='Lax',
                path='/',  # Make cookie available for all paths
                domain=settings.COOKIE_DOMAIN  # Use configurable domain from settings
            )
            
            # If rotation is enabled, also set new refresh token
            if settings.SIMPLE_JWT.get('ROTATE_REFRESH_TOKENS', False):
                new_refresh_token = str(refresh)
                response.set_cookie(
                    'refresh_token',
                    new_refresh_token,
                    max_age=settings.SIMPLE_JWT['REFRESH_TOKEN_LIFETIME'].total_seconds(),
                    httponly=False,  # Changed from True to False to make it a regular cookie
                    secure=not settings.DEBUG,
                    samesite='Lax',
                    path='/',  # Make cookie available for all paths
                    domain=settings.COOKIE_DOMAIN  # Use configurable domain from settings
                )
            
            return response
            
        except TokenError as e:
            return Response(
                {'detail': 'Invalid or expired refresh token'}, 
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
    permission_classes = [AllowAny]  # Allow anyone to logout
    serializer_class = LogoutSerializer  # Add the serializer class
    
    def post(self, request, *args, **kwargs):
        from django.conf import settings
        
        response_data = {'message': 'Logout successful'}
        response = Response(response_data, status=status.HTTP_200_OK)
        
        # Clear both access and refresh token cookies
        response.delete_cookie('access_token', path='/', domain=settings.COOKIE_DOMAIN, samesite='Lax')
        response.delete_cookie('refresh_token', path='/', domain=settings.COOKIE_DOMAIN, samesite='Lax')
        
        return response


# REPLACE @login_required with @jwt_cookie_required
@jwt_cookie_required 
def profile_settings_view(request):
    """
    Render and process the profile settings form for the authenticated user
    using JWT cookie authentication.

    Loosened version: non-admin users can only update allowed fields,
    but restricted fields are silently ignored instead of rejected.
    """
    # The decorator now ensures request.user is set if the JWT is valid
    user = request.user 
    is_admin_or_superuser = user.is_superuser or user.is_staff
    allowed_fields = {'username', 'phone_number', 'profile_picture'}

    if request.method == 'POST':
        post_data = request.POST.copy()
        file_data = request.FILES

        # --- Loosened restriction ---
        # For non-admin users, drop restricted fields instead of erroring
        if not is_admin_or_superuser:
            for key in list(post_data.keys()):
                if key not in allowed_fields and key != 'csrfmiddlewaretoken':
                    post_data.pop(key, None)

        # Pass request.user for form-level permission checks
        form = ProfileSettingsForm(post_data, file_data, instance=user, request_user=user)

        if form.is_valid():
            form.save()
            messages.success(request, 'Profile updated successfully!')
            return redirect('profile-settings') # Make sure 'profile-settings' is a valid URL name
        else:
            messages.error(request, 'Please correct the errors below.')

    else:
        # Pass the already authenticated user from the decorator
        form = ProfileSettingsForm(instance=user, request_user=user) 

    context = {
        'form': form,
        'user': user,
    }
    return render(request, 'users/profile_settings.html', context)
