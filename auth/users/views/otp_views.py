"""
OTP (One-Time Password) and 2FA views - handles two-factor authentication.
Handles requesting OTP, enabling/disabling 2FA, and OTP verification.
"""

from rest_framework import generics, status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.response import Response
from rest_framework.permissions import AllowAny, IsAuthenticated
from drf_spectacular.utils import extend_schema, OpenApiResponse, inline_serializer
import rest_framework.serializers as drf_serializers

import logging

from ..models import User, UserOTP
from ..serializers import (
    OTPRequestSerializer,
    Enable2FASerializer,
    Disable2FASerializer,
)

logger = logging.getLogger(__name__)


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
            
            # Send OTP via SendGrid
            try:
                from emails.services import get_email_service
                
                success, _, _ = get_email_service().send_otp_email(
                    user_email=user.email,
                    user_name=user.get_full_name() or user.username,
                    otp_code=otp_instance.otp_code
                )
                
                if success:
                    return Response({
                        'message': 'OTP sent to your email address',
                        'expires_in_minutes': 5
                    }, status=status.HTTP_200_OK)
                else:
                    logger.error(f"Failed to send OTP email to {user.email}")
                    return Response({
                        'error': 'Failed to send email. Please try again later.'
                    }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
                    
            except Exception as e:
                logger.error(f"Exception sending OTP email to {user.email}: {str(e)}")
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
    tags=['2FA'],
    summary="Request OTP for authenticated user",
    description="Generate and send OTP code to the authenticated user's email. Used when user wants to disable 2FA.",
    responses={
        200: OpenApiResponse(
            response=inline_serializer(
                name='RequestOTPAuthenticatedResponse',
                fields={
                    'message': drf_serializers.CharField(),
                    'expires_in_minutes': drf_serializers.IntegerField()
                }
            ),
            description="OTP sent successfully"
        ),
        400: OpenApiResponse(description="Bad request - 2FA not enabled"),
        401: OpenApiResponse(description="Unauthorized")
    }
)
@api_view(['POST'])
@permission_classes([IsAuthenticated])
def request_otp_authenticated_view(request):
    """
    Generate and send OTP to authenticated user's email.
    Used for operations that require OTP verification (like disabling 2FA).
    """
    user = request.user
    
    if not user.otp_enabled:
        return Response({
            'error': '2FA is not enabled for this account'
        }, status=status.HTTP_400_BAD_REQUEST)
    
    # Generate OTP for the user
    otp_instance = UserOTP.generate_for_user(user, otp_type='email')
    
    # Send OTP via SendGrid
    try:
        from emails.services import get_email_service
        
        success, _, _ = get_email_service().send_otp_email(
            user_email=user.email,
            user_name=user.get_full_name() or user.username,
            otp_code=otp_instance.otp_code
        )
        
        if success:
            return Response({
                'message': 'OTP sent to your email address',
                'expires_in_minutes': 5
            }, status=status.HTTP_200_OK)
        else:
            logger.error(f"Failed to send OTP email to {user.email}")
            return Response({
                'error': 'Failed to send email. Please try again later.'
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
            
    except Exception as e:
        logger.error(f"Exception sending OTP email to {user.email}: {str(e)}")
        return Response({
            'error': 'Failed to send email. Please try again later.'
        }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


@extend_schema(
    tags=['2FA'],
    summary="Verify credentials for disabling OTP",
    description="Verify password and OTP code before allowing user to disable 2FA in profile settings. This endpoint does not actually disable 2FA, it only validates credentials.",
    request=Disable2FASerializer,
    responses={
        200: OpenApiResponse(
            response=inline_serializer(
                name='VerifyDisableOTPResponse',
                fields={'message': drf_serializers.CharField()}
            ),
            description="Credentials verified successfully"
        ),
        400: OpenApiResponse(description="Bad request - invalid password or OTP"),
        401: OpenApiResponse(description="Unauthorized")
    }
)
@api_view(['POST'])
@permission_classes([IsAuthenticated])
def verify_disable_otp_view(request):
    """
    Verify password and OTP for disabling 2FA in profile settings.
    This endpoint validates credentials but does not actually disable 2FA.
    The actual disabling happens when the profile form is saved.
    """
    serializer = Disable2FASerializer(data=request.data, context={'request': request})
    
    if serializer.is_valid():
        # If validation passes, credentials are correct
        # Mark the OTP as used since we verified it
        otp_code = serializer.validated_data.get('otp_code')
        otp_instance = UserOTP.get_valid_otp_for_user(request.user)
        if otp_instance and otp_instance.otp_code == otp_code:
            otp_instance.is_used = True
            otp_instance.save(update_fields=['is_used'])
        
        return Response({
            'message': 'Credentials verified successfully',
            'verified': True
        }, status=status.HTTP_200_OK)
    
    return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
