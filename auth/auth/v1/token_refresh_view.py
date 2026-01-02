"""
Unified Token Refresh View for both User and Employee models.
Reads refresh_token from cookies only (not from request body).
"""
import logging
import jwt
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import AllowAny
from rest_framework import status
from django.conf import settings
from drf_spectacular.utils import extend_schema, OpenApiResponse

logger = logging.getLogger(__name__)


@extend_schema(
    tags=['Tokens'],
    summary="Unified Token Refresh (Cookie-based)",
    description="""
    Refresh JWT access token using refresh token from HTTP-only cookie.
    Works for both User (staff) and Employee (HDTS) tokens.
    
    The endpoint reads the refresh_token from cookies only - it does NOT
    accept refresh tokens in the request body for security reasons.
    
    On success, sets a new access_token cookie and returns success message.
    """,
    responses={
        200: OpenApiResponse(description="Token refreshed successfully, new access_token set in cookie"),
        401: OpenApiResponse(description="Invalid or expired refresh token, or no refresh token in cookies"),
    }
)
class UnifiedTokenRefreshView(APIView):
    """
    Unified token refresh endpoint for both User and Employee models.
    Reads refresh_token from cookies only (not from request body).
    """
    permission_classes = [AllowAny]
    
    def post(self, request, *args, **kwargs):
        """Refresh access token using refresh token from cookie."""
        refresh_token = request.COOKIES.get('refresh_token')
        
        if not refresh_token:
            logger.warning("Token refresh attempted without refresh_token cookie")
            return Response(
                {'detail': 'No refresh token in cookies'},
                status=status.HTTP_401_UNAUTHORIZED
            )
        
        try:
            # Decode the refresh token to determine type (user vs employee)
            algorithm = getattr(settings, 'SIMPLE_JWT', {}).get('ALGORITHM', 'HS256')
            secret = getattr(settings, 'SIMPLE_JWT', {}).get('SIGNING_KEY', settings.SECRET_KEY)
            
            payload = jwt.decode(refresh_token, secret, algorithms=[algorithm])
            
            # Check if token is a refresh token
            if payload.get('token_type') != 'refresh':
                return Response(
                    {'detail': 'Invalid token type'},
                    status=status.HTTP_401_UNAUTHORIZED
                )
            
            user_type = payload.get('user_type', 'user')
            
            if user_type == 'employee':
                # Handle employee token refresh
                return self._refresh_employee_token(payload, request)
            else:
                # Handle staff user token refresh
                return self._refresh_user_token(payload, request)
                
        except jwt.ExpiredSignatureError:
            logger.warning("Expired refresh token used")
            return Response(
                {'detail': 'Refresh token has expired'},
                status=status.HTTP_401_UNAUTHORIZED
            )
        except jwt.InvalidTokenError as e:
            logger.warning(f"Invalid refresh token: {str(e)}")
            return Response(
                {'detail': 'Invalid refresh token'},
                status=status.HTTP_401_UNAUTHORIZED
            )
        except Exception as e:
            logger.error(f"Token refresh error: {str(e)}")
            return Response(
                {'detail': 'Token refresh failed'},
                status=status.HTTP_401_UNAUTHORIZED
            )
    
    def _refresh_employee_token(self, payload, request):
        """Refresh access token for an employee."""
        import uuid
        from django.utils import timezone
        from hdts.models import Employees
        
        employee_id = payload.get('employee_id') or payload.get('user_id')
        
        if not employee_id:
            return Response(
                {'detail': 'Invalid token payload'},
                status=status.HTTP_401_UNAUTHORIZED
            )
        
        try:
            employee = Employees.objects.get(id=employee_id)
        except Employees.DoesNotExist:
            return Response(
                {'detail': 'Employee not found'},
                status=status.HTTP_401_UNAUTHORIZED
            )
        
        # Generate new access token
        now = timezone.now()
        access_lifetime = getattr(settings, 'SIMPLE_JWT', {}).get('ACCESS_TOKEN_LIFETIME')
        if access_lifetime:
            access_exp = now + access_lifetime
        else:
            from datetime import timedelta
            access_exp = now + timedelta(minutes=5)  # Default 5 minutes
        
        full_name = f"{employee.first_name} {employee.middle_name or ''} {employee.last_name}".replace('  ', ' ').strip()
        
        access_payload = {
            'token_type': 'access',
            'exp': int(access_exp.timestamp()),
            'iat': int(now.timestamp()),
            'jti': uuid.uuid4().hex,
            'user_id': employee.id,
            'employee_id': employee.id,
            'email': employee.email,
            'username': employee.username or employee.email.split('@')[0],
            'full_name': full_name,
            'user_type': 'employee',
            'roles': [{'system': 'hdts', 'role': 'Employee'}]
        }
        
        algorithm = getattr(settings, 'SIMPLE_JWT', {}).get('ALGORITHM', 'HS256')
        secret = getattr(settings, 'SIMPLE_JWT', {}).get('SIGNING_KEY', settings.SECRET_KEY)
        
        access_token = jwt.encode(access_payload, secret, algorithm=algorithm)
        
        # Calculate expires_in in seconds
        expires_in = int(access_lifetime.total_seconds()) if access_lifetime else 300
        
        # Create response and set cookie
        response = Response(
            {
                'message': 'Token refreshed successfully',
                'user_type': 'employee',
                'expires_in': expires_in  # Token expiration in seconds
            },
            status=status.HTTP_200_OK
        )
        
        use_secure = not settings.DEBUG
        response.set_cookie(
            'access_token',
            access_token,
            httponly=True,
            secure=use_secure,
            samesite='Lax',
            max_age=expires_in,
            path='/'
        )
        
        logger.info(f"Token refreshed for employee: {employee.email}")
        return response
    
    def _refresh_user_token(self, payload, request):
        """Refresh access token for a staff user."""
        from users.models import User
        from users.serializers import CustomTokenObtainPairSerializer
        
        user_id = payload.get('user_id')
        
        if not user_id:
            return Response(
                {'detail': 'Invalid token payload'},
                status=status.HTTP_401_UNAUTHORIZED
            )
        
        try:
            user = User.objects.get(id=user_id)
        except User.DoesNotExist:
            return Response(
                {'detail': 'User not found'},
                status=status.HTTP_401_UNAUTHORIZED
            )
        
        # Generate new access token using CustomTokenObtainPairSerializer
        # This includes custom claims: email, username, full_name, roles
        refresh = CustomTokenObtainPairSerializer.get_token(user)
        access_token = str(refresh.access_token)
        
        access_lifetime = getattr(settings, 'SIMPLE_JWT', {}).get('ACCESS_TOKEN_LIFETIME')
        expires_in = int(access_lifetime.total_seconds()) if access_lifetime else 300
        
        # Create response and set cookie
        response = Response(
            {
                'message': 'Token refreshed successfully',
                'user_type': 'user',
                'expires_in': expires_in  # Token expiration in seconds
            },
            status=status.HTTP_200_OK
        )
        
        use_secure = not settings.DEBUG
        
        response.set_cookie(
            'access_token',
            access_token,
            httponly=True,
            secure=use_secure,
            samesite='Lax',
            max_age=expires_in,
            path='/'
        )
        
        logger.info(f"Token refreshed for user: {user.email}")
        return response
