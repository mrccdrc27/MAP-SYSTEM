"""
API views for employee authentication and profile management.
"""
import logging
from rest_framework import generics, status
from rest_framework.response import Response
from rest_framework.permissions import AllowAny, BasePermission
from rest_framework.parsers import MultiPartParser, FormParser, JSONParser
from rest_framework_simplejwt.tokens import RefreshToken
from rest_framework.views import APIView
from django.utils import timezone
from django.views.decorators.csrf import csrf_exempt
from django.utils.decorators import method_decorator

from .models import Employees, EmployeeOTP
from .serializers import (
    EmployeeRegistrationSerializer,
    EmployeeTokenObtainPairSerializer,
    EmployeeProfileSerializer,
    EmployeeProfileUpdateSerializer,
    EmployeeChangePasswordSerializer,
    RequestEmployeeOTPSerializer,
    VerifyEmployeeOTPSerializer,
    Enable2FASerializer,
    Disable2FASerializer,
)
from .utils import (
    decode_employee_token,
    generate_employee_tokens,
    set_employee_cookies,
    clear_employee_cookies,
    send_welcome_email,
    send_otp_email,
    send_password_change_email,
    send_2fa_enabled_email,
    send_2fa_disabled_email,
    send_password_reset_email,
)

logger = logging.getLogger(__name__)


# ==================== Custom Permissions ====================

class IsEmployeeAuthenticated(BasePermission):
    """
    Custom permission to check if the request is from an authenticated employee.
    Works with JWT tokens in cookies via the middleware.
    """
    def has_permission(self, request, view):
        # Check if employee is attached to request by middleware
        if hasattr(request, 'employee') and request.employee:
            return True
        
        # Fallback: check JWT token in Authorization header
        access_token = request.META.get('HTTP_AUTHORIZATION', '').replace('Bearer ', '')
        if access_token:
            is_valid, payload = decode_employee_token(access_token)
            if is_valid:
                employee_id = payload.get('employee_id')
                if employee_id:
                    try:
                        request.employee = Employees.objects.get(id=employee_id)
                        return True
                    except Employees.DoesNotExist:
                        return False
        
        return False


# ==================== API Views ====================

@method_decorator(csrf_exempt, name='dispatch')
class EmployeeRegisterView(generics.CreateAPIView):
    """
    API endpoint for employee registration.
    POST: Register a new employee
    """
    queryset = Employees.objects.all()
    serializer_class = EmployeeRegistrationSerializer
    permission_classes = (AllowAny,)
    parser_classes = (MultiPartParser, FormParser, JSONParser)

    def create(self, request, *args, **kwargs):
        """Create a new employee and send welcome notification."""
        serializer = self.get_serializer(data=request.data)
        if not serializer.is_valid():
            # Log detailed error messages for debugging
            logger = logging.getLogger(__name__)
            logger.error(f"Employee registration validation errors: {serializer.errors}")
            logger.error(f"Request data: {request.data}")
            # Return detailed error messages
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
        
        employee = serializer.save()

        # Send welcome notification
        send_welcome_email(employee)

        response_serializer = EmployeeProfileSerializer(employee)
        return Response(
            response_serializer.data,
            status=status.HTTP_201_CREATED
        )


class EmployeeTokenObtainPairView(generics.GenericAPIView):
    """
    API endpoint for employee login with reCAPTCHA verification.
    POST: Login with email and password, returns JWT tokens
    """
    permission_classes = (AllowAny,)

    def get_serializer_class(self):
        """Return the appropriate serializer class."""
        from .serializers import EmployeeTokenObtainPairWithRecaptchaSerializer
        return EmployeeTokenObtainPairWithRecaptchaSerializer

    def post(self, request, *args, **kwargs):
        """Authenticate employee and return JWT tokens."""
        # Use the reCAPTCHA serializer for login
        from .serializers import EmployeeTokenObtainPairWithRecaptchaSerializer
        
        serializer = EmployeeTokenObtainPairWithRecaptchaSerializer(data=request.data)
        
        if not serializer.is_valid():
            # Return properly formatted error response
            return Response(
                {
                    'success': False,
                    'errors': serializer.errors
                },
                status=status.HTTP_400_BAD_REQUEST
            )

        # If 2FA is required
        if serializer.validated_data.get('requires_otp'):
            email = serializer.validated_data.get('email')
            # Generate OTP
            try:
                employee = Employees.objects.get(email=email)
                otp = EmployeeOTP.generate_for_employee(employee)
                
                # Send OTP via email
                send_otp_email(employee, otp.otp_code)
                
                return Response(
                    {
                        'requires_otp': True,
                        'email': email,
                        'message': 'OTP sent to your email. Please verify to complete login.'
                    },
                    status=status.HTTP_200_OK
                )
            except Exception as e:
                logger.error(f"Failed to send OTP for {email}: {str(e)}")
                return Response(
                    {
                        'success': False,
                        'errors': {'detail': 'Failed to send OTP. Please try again.'}
                    },
                    status=status.HTTP_500_INTERNAL_SERVER_ERROR
                )

        # Return tokens
        tokens = serializer.validated_data
        employee = tokens.get('employee')
        response = Response(
            {
                'success': True,
                'access': tokens['access'],
                'refresh': tokens['refresh'],
                'employee': EmployeeProfileSerializer(employee).data
            },
            status=status.HTTP_200_OK
        )
        
        # Set secure cookies
        response = set_employee_cookies(response, tokens['access'], tokens['refresh'])
        
        return response


class EmployeeTokenRefreshView(APIView):
    """
    API endpoint to refresh employee JWT tokens.
    POST: Refresh access token using refresh token
    """
    permission_classes = (AllowAny,)

    def post(self, request):
        """Refresh access token."""
        refresh_token = request.COOKIES.get('refresh_token')
        
        if not refresh_token:
            return Response(
                {'detail': 'Refresh token not found'},
                status=status.HTTP_401_UNAUTHORIZED
            )

        try:
            token = RefreshToken(refresh_token)
            access_token = str(token.access_token)
            
            response = Response(
                {'access': access_token},
                status=status.HTTP_200_OK
            )
            
            response.set_cookie(
                'access_token',
                access_token,
                httponly=True,
                secure=True,
                samesite='Strict',
                max_age=900
            )
            
            return response
        except Exception:
            return Response(
                {'detail': 'Invalid refresh token'},
                status=status.HTTP_401_UNAUTHORIZED
            )


class EmployeeLogoutView(APIView):
    """
    API endpoint for employee logout.
    POST: Clear JWT tokens from cookies
    """
    permission_classes = (AllowAny,)

    def post(self, request):
        """Logout employee and clear tokens."""
        response = Response(
            {'message': 'Successfully logged out'},
            status=status.HTTP_200_OK
        )
        
        response = clear_employee_cookies(response)
        return response


class EmployeeProfileView(generics.RetrieveUpdateAPIView):
    """
    API endpoint for employee profile management.
    GET: Retrieve profile information
    PATCH: Partially update only specified fields
    PUT: Fully update all profile fields
    """
    permission_classes = (IsEmployeeAuthenticated,)
    serializer_class = EmployeeProfileSerializer
    parser_classes = (MultiPartParser, FormParser, JSONParser)

    def get_object(self):
        """Get the authenticated employee."""
        if hasattr(self.request, 'employee'):
            return self.request.employee
        # Fallback
        return Employees.objects.get(id=self.request.user.id)

    def get_serializer_class(self):
        """Return different serializers for different HTTP methods."""
        if self.request.method in ('PATCH', 'PUT'):
            return EmployeeProfileUpdateSerializer
        return EmployeeProfileSerializer

    def patch(self, request, *args, **kwargs):
        """
        Partially update employee profile.
        Only fields provided in the request are updated (efficient partial updates).
        """
        employee = self.get_object()
        
        # Track which fields are being updated
        updated_fields = set(request.data.keys()) if request.data else set()
        
        serializer = self.get_serializer(employee, data=request.data, partial=True)
        serializer.is_valid(raise_exception=True)
        serializer.save()
        
        # Return updated profile with metadata about changes
        return Response(
            {
                'employee': EmployeeProfileSerializer(employee).data,
                'updated_fields': list(updated_fields),
                'message': f'Successfully updated {len(updated_fields)} field(s)'
            },
            status=status.HTTP_200_OK
        )

    def put(self, request, *args, **kwargs):
        """
        Fully update employee profile.
        All profile fields should be provided.
        """
        employee = self.get_object()
        serializer = self.get_serializer(employee, data=request.data, partial=False)
        serializer.is_valid(raise_exception=True)
        serializer.save()
        
        return Response(
            {
                'employee': EmployeeProfileSerializer(employee).data,
                'message': 'Profile fully updated successfully'
            },
            status=status.HTTP_200_OK
        )


class EmployeeChangePasswordView(APIView):
    """
    API endpoint for changing employee password.
    POST: Change password with old password verification
    """
    permission_classes = (IsEmployeeAuthenticated,)

    def post(self, request):
        """Change employee password."""
        serializer = EmployeeChangePasswordSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        employee = request.employee if hasattr(request, 'employee') else Employees.objects.get(id=request.user.id)
        
        # Verify old password
        if not employee.check_password(serializer.validated_data['old_password']):
            return Response(
                {'detail': 'Old password is incorrect'},
                status=status.HTTP_400_BAD_REQUEST
            )

        # Set new password
        employee.set_password(serializer.validated_data['new_password'])
        employee.save()

        # Send password change notification
        send_password_change_email(employee)

        return Response(
            {'message': 'Password changed successfully'},
            status=status.HTTP_200_OK
        )


class RequestEmployeeOTPView(APIView):
    """
    API endpoint to request OTP for login (2FA).
    POST: Send OTP to employee email
    """
    permission_classes = (AllowAny,)

    def post(self, request):
        """Request OTP for login."""
        serializer = RequestEmployeeOTPSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        email = serializer.validated_data['email']
        employee = Employees.objects.get(email=email)

        # Generate OTP
        otp = EmployeeOTP.generate_for_employee(employee)

        # Send OTP via email
        send_otp_email(employee, otp.otp_code)

        return Response(
            {'message': 'OTP sent to your email'},
            status=status.HTTP_200_OK
        )


class VerifyEmployeeOTPView(APIView):
    """
    API endpoint to verify OTP and complete 2FA login.
    POST: Verify OTP and return JWT tokens
    """
    permission_classes = (AllowAny,)

    def post(self, request):
        """Verify OTP and return tokens."""
        from datetime import timedelta
        import jwt
        from django.conf import settings
        
        serializer = VerifyEmployeeOTPSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        email = serializer.validated_data['email']
        otp_code = serializer.validated_data['otp_code']

        try:
            employee = Employees.objects.get(email=email)
        except Employees.DoesNotExist:
            return Response(
                {'detail': 'Invalid email or OTP'},
                status=status.HTTP_400_BAD_REQUEST
            )

        # Get valid OTP
        otp = EmployeeOTP.get_valid_otp_for_employee(employee)
        
        if not otp or not otp.verify(otp_code):
            return Response(
                {'detail': 'Invalid or expired OTP'},
                status=status.HTTP_400_BAD_REQUEST
            )

        # Update last login
        employee.last_login = timezone.now()
        employee.save(update_fields=['last_login'])

        # Generate tokens manually (same as serializer) to avoid RefreshToken.for_user() issue
        now = timezone.now()
        access_exp = now + timedelta(minutes=15)
        refresh_exp = now + timedelta(days=7)
        
        access_payload = {
            'employee_id': employee.id,
            'email': employee.email,
            'first_name': employee.first_name,
            'last_name': employee.last_name,
            'company_id': employee.company_id,
            'token_type': 'access',
            'exp': access_exp.timestamp(),
            'iat': now.timestamp(),
        }
        
        refresh_payload = {
            'employee_id': employee.id,
            'email': employee.email,
            'token_type': 'refresh',
            'exp': refresh_exp.timestamp(),
            'iat': now.timestamp(),
        }
        
        algorithm = getattr(settings, 'SIMPLE_JWT', {}).get('ALGORITHM', 'HS256')
        secret = settings.SECRET_KEY
        
        access_token = jwt.encode(access_payload, secret, algorithm=algorithm)
        refresh_token = jwt.encode(refresh_payload, secret, algorithm=algorithm)
        
        response = Response(
            {
                'access': access_token,
                'refresh': refresh_token,
                'employee': EmployeeProfileSerializer(employee).data
            },
            status=status.HTTP_200_OK
        )
        
        # Set secure cookies
        response.set_cookie(
            'access_token',
            access_token,
            httponly=True,
            secure=True,
            samesite='Strict',
            max_age=900
        )
        response.set_cookie(
            'refresh_token',
            refresh_token,
            httponly=True,
            secure=True,
            samesite='Strict',
            max_age=86400
        )

        return response


class Enable2FAView(APIView):
    """
    API endpoint to enable 2FA for employee.
    POST: Enable 2FA with password verification
    """
    permission_classes = (IsEmployeeAuthenticated,)

    def post(self, request):
        """Enable 2FA."""
        serializer = Enable2FASerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        employee = request.employee if hasattr(request, 'employee') else Employees.objects.get(id=request.user.id)
        password = serializer.validated_data['password']

        # Verify password
        if not employee.check_password(password):
            return Response(
                {'detail': 'Password is incorrect'},
                status=status.HTTP_400_BAD_REQUEST
            )

        # Enable 2FA
        employee.otp_enabled = True
        employee.save(update_fields=['otp_enabled'])

        # Send notification
        send_2fa_enabled_email(employee)

        return Response(
            {'message': '2FA enabled successfully'},
            status=status.HTTP_200_OK
        )


class Disable2FAView(APIView):
    """
    API endpoint to disable 2FA for employee.
    POST: Disable 2FA with password verification
    """
    permission_classes = (IsEmployeeAuthenticated,)

    def post(self, request):
        """Disable 2FA."""
        serializer = Disable2FASerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        employee = request.employee if hasattr(request, 'employee') else Employees.objects.get(id=request.user.id)
        password = serializer.validated_data['password']

        # Verify password
        if not employee.check_password(password):
            return Response(
                {'detail': 'Password is incorrect'},
                status=status.HTTP_400_BAD_REQUEST
            )

        # Disable 2FA and clear OTPs
        employee.otp_enabled = False
        employee.save(update_fields=['otp_enabled'])
        EmployeeOTP.objects.filter(employee=employee).update(is_used=True)

        # Send notification
        send_2fa_disabled_email(employee)

        return Response(
            {'message': '2FA disabled successfully'},
            status=status.HTTP_200_OK
        )


class EmployeeForgotPasswordView(APIView):
    """API endpoint for requesting password reset."""
    permission_classes = [AllowAny]
    
    def post(self, request):
        """Request password reset email."""
        from .models import EmployeePasswordResetToken
        from .serializers import EmployeeForgotPasswordSerializer
        
        serializer = EmployeeForgotPasswordSerializer(data=request.data)
        if not serializer.is_valid():
            return Response({'error': 'Invalid email address.'}, status=status.HTTP_400_BAD_REQUEST)
        
        email = serializer.validated_data['email']
        try:
            employee = Employees.objects.get(email=email)
            reset_token = EmployeePasswordResetToken.generate_for_employee(employee)
            
            # Send reset email via notification service
            reset_link = request.build_absolute_uri(
                f"/employees/reset-password/?token={reset_token.token}"
            )
            
            send_password_reset_email(employee, reset_link)
            
            return Response({
                'success': True,
                'message': 'If an account with that email exists, you will receive password reset instructions.'
            }, status=status.HTTP_200_OK)
        except Employees.DoesNotExist:
            # Return same message for security (don't reveal if email exists)
            return Response({
                'success': True,
                'message': 'If an account with that email exists, you will receive password reset instructions.'
            }, status=status.HTTP_200_OK)


class EmployeeResetPasswordView(APIView):
    """API endpoint for resetting password with token."""
    permission_classes = [AllowAny]
    
    def post(self, request):
        """Reset password with valid token."""
        from .models import EmployeePasswordResetToken
        from .serializers import EmployeeResetPasswordSerializer
        
        serializer = EmployeeResetPasswordSerializer(data=request.data)
        if not serializer.is_valid():
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
        
        token_obj = serializer.validated_data['token_obj']
        new_password = serializer.validated_data['new_password']
        
        try:
            employee = token_obj.employee
            employee.set_password(new_password)
            employee.save()
            
            # Invalidate all OTPs
            EmployeeOTP.objects.filter(employee=employee, is_used=False).update(is_used=True)
            
            # Mark token as used
            token_obj.use_token()
            
            return Response({
                'success': True,
                'message': 'Password reset successfully. Please log in with your new password.'
            }, status=status.HTTP_200_OK)
        except Exception as e:
            logger.error(f"Error resetting password: {str(e)}")
            return Response({'error': 'An error occurred while resetting password.'}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


class MeView(APIView):
    """
    API endpoint to get current authenticated user's profile.
    Works with both User (staff) and Employee (HDTS employee) JWT tokens.
    Requires authentication - returns 401 if not authenticated.
    
    Supports authentication via:
    - Cookies (access_token)
    - Authorization header (Bearer token)
    
    GET: Returns the authenticated user's profile information
    """
    permission_classes = (AllowAny,)  # Allow unauthenticated to check, but will return 401 if not authed
    
    def get(self, request):
        """Retrieve current user profile based on JWT authentication."""
        # Check if employee is authenticated (HDTS employee) - from middleware
        if hasattr(request, 'employee') and request.employee:
            employee = request.employee
            serializer = EmployeeProfileSerializer(employee, context={'request': request})
            return Response(
                {
                    'type': 'employee',
                    'data': serializer.data
                },
                status=status.HTTP_200_OK
            )
        
        # Check if user is authenticated (staff user) - from middleware or DRF authentication
        if request.user and request.user.is_authenticated:
            from users.serializers import UserProfileSerializer
            user = request.user
            serializer = UserProfileSerializer(user, context={'request': request})
            return Response(
                {
                    'type': 'user',
                    'data': serializer.data
                },
                status=status.HTTP_200_OK
            )
        
        # Try to extract token from Authorization header for manual verification
        auth_header = request.META.get('HTTP_AUTHORIZATION', '')
        if auth_header.startswith('Bearer '):
            token_str = auth_header[7:]  # Remove 'Bearer ' prefix
            
            # Try employee token
            employee_payload = self._decode_custom_token(token_str)
            if employee_payload:
                employee_id = employee_payload.get('employee_id')
                if employee_id:
                    try:
                        employee = Employees.objects.get(id=employee_id)
                        serializer = EmployeeProfileSerializer(employee, context={'request': request})
                        return Response(
                            {
                                'type': 'employee',
                                'data': serializer.data
                            },
                            status=status.HTTP_200_OK
                        )
                    except Employees.DoesNotExist:
                        pass
            
            # Try DRF simplejwt token for staff users
            try:
                from rest_framework_simplejwt.tokens import AccessToken as DRFAccessToken
                token = DRFAccessToken(token_str)
                user_id = token.get('user_id')
                if user_id:
                    try:
                        from users.models import User
                        user = User.objects.get(id=user_id)
                        from users.serializers import UserProfileSerializer
                        serializer = UserProfileSerializer(user, context={'request': request})
                        return Response(
                            {
                                'type': 'user',
                                'data': serializer.data
                            },
                            status=status.HTTP_200_OK
                        )
                    except User.DoesNotExist:
                        pass
            except Exception:
                pass
        
        # Not authenticated
        return Response(
            {'detail': 'Authentication credentials were not provided.'},
            status=status.HTTP_401_UNAUTHORIZED
        )
    
    def _decode_custom_token(self, token_str):
        """Decode custom employee JWT token (not DRF simplejwt format)."""
        try:
            import jwt
            from django.conf import settings
            secret = getattr(settings, 'SIMPLE_JWT', {}).get('SIGNING_KEY', settings.SECRET_KEY)
            payload = jwt.decode(
                token_str,
                secret,
                algorithms=['HS256']
            )
            if payload.get('token_type') == 'access':
                return payload
        except Exception:
            pass
        return None


class EmployeeByIdView(generics.RetrieveAPIView):
    """
    Internal API endpoint to look up an employee by their ID.
    Used by helpdesk backend to resolve employee data for tickets.
    No authentication required - this is an internal service-to-service endpoint.
    """
    authentication_classes = []  # No authentication required
    permission_classes = [AllowAny]
    serializer_class = EmployeeProfileSerializer
    
    def get(self, request, employee_id):
        try:
            employee = Employees.objects.get(id=employee_id)
            serializer = self.serializer_class(employee, context={'request': request})
            return Response(serializer.data, status=status.HTTP_200_OK)
        except Employees.DoesNotExist:
            return Response(
                {'error': 'Employee not found'},
                status=status.HTTP_404_NOT_FOUND
            )
