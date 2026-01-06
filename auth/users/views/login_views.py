"""
Login and authentication flow views - handles API-based login with OTP verification.
Template-serving views have been removed - frontend now handles all UI.
"""

from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework.permissions import AllowAny
from django.views.decorators.csrf import csrf_exempt
from django.utils.decorators import method_decorator
import logging

from django.conf import settings

from ..models import User
from ..rate_limiting import (
    record_failed_login_attempt,
    record_successful_login,
)

logger = logging.getLogger(__name__)


@method_decorator(csrf_exempt, name='dispatch')
class LoginAPIView(APIView):
    """
    API endpoint for login with reCAPTCHA verification.
    POST /api/v1/users/login/api/
    {
        "email": "user@example.com",
        "password": "password",
        "g_recaptcha_response": "response-from-client"
    }
    
    Response: If OTP is required, returns temporary_token with otp_required flag.
    Must call /api/v1/users/verify-otp-login/ with temporary_token + otp_code.
    """
    permission_classes = [AllowAny]
    
    def post(self, request):
        from rest_framework import status
        from django.contrib.auth import login
        
        from ..serializers import LoginProcessSerializer, LoginResponseSerializer
        
        # Pass request context for session and IP access
        serializer = LoginProcessSerializer(data=request.data, context={'request': request})
        
        if serializer.is_valid():
            # The serializer validate() method handles authentication, 2FA checks,
            # token generation, and structuring the return data.
            response_data = serializer.validated_data
            
            # If login was successful (not just OTP step), perform Django login for session
            if response_data.get('success') and not response_data.get('otp_required'):
                user = response_data.get('user')
                if user:
                    login(request, user)
                    
                    # Record successful login (rate limiting)
                    record_successful_login(request, user_email=user.email)
            
            # Use Response Serializer to ensure consistent output format
            response_serializer = LoginResponseSerializer(response_data)
            response = Response(response_serializer.data, status=status.HTTP_200_OK)

            # Set cookies if tokens are present (for successful login)
            if response_data.get('access_token'):
                access_token = response_data.get('access_token')
                refresh_token = response_data.get('refresh_token')
                
                access_max_age = settings.SIMPLE_JWT['ACCESS_TOKEN_LIFETIME'].total_seconds()
                refresh_max_age = settings.SIMPLE_JWT['REFRESH_TOKEN_LIFETIME'].total_seconds()

                response.set_cookie(
                    'access_token',
                    access_token,
                    max_age=access_max_age,
                    httponly=False,
                    secure=settings.SESSION_COOKIE_SECURE,
                    samesite='Lax',
                    path='/',
                    domain=None
                )

                if refresh_token:
                    response.set_cookie(
                        'refresh_token',
                        refresh_token,
                        max_age=refresh_max_age,
                        httponly=False,
                        secure=settings.SESSION_COOKIE_SECURE,
                        samesite='Lax',
                        path='/',
                        domain=None
                    )

            return response
        else:
            email = request.data.get('email', '')
            if email:
                record_failed_login_attempt(request, user_email=email)
            
            return Response({
                'success': False,
                'otp_required': False,
                'errors': serializer.errors
            }, status=status.HTTP_400_BAD_REQUEST)


@method_decorator(csrf_exempt, name='dispatch')
class VerifyOTPLoginView(APIView):
    """
    API endpoint to verify OTP during login flow.
    POST /api/v1/users/verify-otp-login/
    {
        "temporary_token": "...",
        "otp_code": "123456"
    }
    
    Returns full authentication tokens if OTP is valid.
    """
    permission_classes = [AllowAny]
    
    def post(self, request):
        from rest_framework import status
        from django.contrib.auth import login
        
        from ..serializers import VerifyOTPLoginSerializer, LoginResponseSerializer
        
        serializer = VerifyOTPLoginSerializer(data=request.data, context={'request': request})
        
        if serializer.is_valid():
            response_data = serializer.validated_data
            
            # Log in the user to establish session
            user = response_data.get('user')
            if user:
                login(request, user)
                
                # Record successful login (rate limiting)
                record_successful_login(request, user_email=user.email)
                
                logger.info(f"User {user.email} successfully logged in with OTP verification")
            
            response_serializer = LoginResponseSerializer(response_data)
            response = Response(response_serializer.data, status=status.HTTP_200_OK)

            # Set cookies if tokens are present
            if response_data.get('access_token'):
                access_token = response_data.get('access_token')
                refresh_token = response_data.get('refresh_token')
                
                access_max_age = settings.SIMPLE_JWT['ACCESS_TOKEN_LIFETIME'].total_seconds()
                refresh_max_age = settings.SIMPLE_JWT['REFRESH_TOKEN_LIFETIME'].total_seconds()

                response.set_cookie(
                    'access_token',
                    access_token,
                    max_age=access_max_age,
                    httponly=False,
                    secure=settings.SESSION_COOKIE_SECURE,
                    samesite='Lax',
                    path='/',
                    domain=None
                )

                if refresh_token:
                    response.set_cookie(
                        'refresh_token',
                        refresh_token,
                        max_age=refresh_max_age,
                        httponly=False,
                        secure=settings.SESSION_COOKIE_SECURE,
                        samesite='Lax',
                        path='/',
                        domain=None
                    )

            return response
        
        return Response({
            'success': False,
            'errors': serializer.errors
        }, status=status.HTTP_400_BAD_REQUEST)

