"""
Password management views - handles password reset, change, and forgot password flows.
"""

from rest_framework import generics, status, serializers
from rest_framework.response import Response
from rest_framework.permissions import AllowAny, IsAuthenticated
from drf_spectacular.utils import extend_schema, OpenApiResponse, inline_serializer
import rest_framework.serializers as drf_serializers

from django.shortcuts import render, redirect
from django.views.decorators.csrf import csrf_protect
from django.views.decorators.cache import never_cache
from django.utils.decorators import method_decorator
from django.views.generic import FormView, TemplateView
from django.urls import reverse_lazy
from django.contrib import messages

from ..models import User, UserOTP, PasswordResetToken
from ..serializers import (
    ForgotPasswordSerializer,
    ResetPasswordSerializer,
    ProfilePasswordResetSerializer,
    send_password_reset_email,
)
from ..forms import ForgotPasswordForm


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
                email_sent = send_password_reset_email(user, reset_token, request)
                if email_sent:
                    print(f"✅ Password reset email sent successfully to {email}")
                else:
                    print(f"❌ Failed to send password reset email to {email}")
                
                message = 'If an account with that email exists, a password reset link has been sent.'
                    
            except User.DoesNotExist:
                # For security, don't reveal that the email doesn't exist
                print(f"⚠️  User with email {email} not found")
                message = 'If an account with that email exists, a password reset link has been sent.'
            except Exception as e:
                print(f"❌ Error in forgot password: {str(e)}")
                import traceback
                traceback.print_exc()
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
        token = request.query_params.get('token', '')
        
        # Check if token is valid before rendering the form
        reset_token = PasswordResetToken.get_valid_token(token)
        if not reset_token:
            context = {
                'error': 'Invalid or expired reset token. Please request a new password reset link.',
                'token_valid': False
            }
        else:
            context = {
                'token': token,
                'token_valid': True
            }
            
        return render(request, 'public/staff_reset_password.html', context)
        
    def post(self, request, *args, **kwargs):
        """Process the password reset API submission."""
        # Data comes from request.data for JSON requests
        serializer = self.get_serializer(data=request.data)
        
        if serializer.is_valid(raise_exception=True): # Raise exception to get DRF's default error handling
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
            
            return Response({
                'success': True,
                'message': 'Password has been reset successfully. You can now log in with your new password.'
            }, status=status.HTTP_200_OK)
        
        # If serializer.is_valid() returns False, it would have raised an exception due to raise_exception=True.
        # This part of the code should not be reached.


@extend_schema(
    tags=["User Profile"],
    summary="Reset password from profile",
    description="Authenticated user can reset their password by providing current and new password.",
    request=ProfilePasswordResetSerializer,
    responses={
        200: OpenApiResponse(description="Password reset successful"),
        400: OpenApiResponse(description="Validation error")
    }
)
class ProfilePasswordResetView(generics.GenericAPIView):
    """Allow authenticated user to reset their password."""
    permission_classes = [IsAuthenticated]
    serializer_class = ProfilePasswordResetSerializer

    def post(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data, context={'request': request})
        serializer.is_valid(raise_exception=True)
        user = request.user
        user.set_password(serializer.validated_data['new_password'])
        user.save()
        return Response({"detail": "Password reset successful."}, status=status.HTTP_200_OK)


class ChangePasswordSerializer(serializers.Serializer):
    """Serializer for changing password with only current_password and new_password."""
    current_password = serializers.CharField(write_only=True)
    new_password = serializers.CharField(write_only=True)

    def validate(self, attrs):
        user = self.context['request'].user
        current_password = attrs.get('current_password')
        new_password = attrs.get('new_password')

        if not user.check_password(current_password):
            raise serializers.ValidationError({'current_password': 'Current password is incorrect.'})

        # NIST 800-63B password requirements
        min_length = 8
        max_length = 128
        if len(new_password) < min_length:
            raise serializers.ValidationError({'new_password': f'Password must be at least {min_length} characters long.'})
        if len(new_password) > max_length:
            raise serializers.ValidationError({'new_password': f'Password must be at most {max_length} characters long.'})

        # Check for username/email in password
        username = user.username.lower() if user.username else ''
        email = user.email.lower() if user.email else ''
        if username and username in new_password.lower():
            raise serializers.ValidationError({'new_password': 'Password must not contain your username.'})
        if email and email.split('@')[0] in new_password.lower():
            raise serializers.ValidationError({'new_password': 'Password must not contain part of your email address.'})

        # Check against common passwords
        common_passwords = {"password", "12345678", "qwerty", "letmein", "admin", "welcome", "admin123", "password123"}
        if new_password.lower() in common_passwords:
            raise serializers.ValidationError({'new_password': 'Password is too common.'})

        return attrs


@extend_schema(
    tags=["User Profile"],
    summary="Change password (alternative endpoint)",
    description="Authenticated user can change their password. Used by external services.",
    request=ChangePasswordSerializer,
    responses={
        200: OpenApiResponse(description="Password changed successfully"),
        400: OpenApiResponse(description="Validation error")
    }
)
class ChangePasswordView(generics.GenericAPIView):
    """Allow authenticated user to change their password (alternative endpoint for external services)."""
    permission_classes = [IsAuthenticated]
    serializer_class = ChangePasswordSerializer

    def post(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data, context={'request': request})
        if not serializer.is_valid():
            print(f"[ChangePasswordView] Validation errors: {serializer.errors}")
            serializer.is_valid(raise_exception=True)
        user = request.user
        user.set_password(serializer.validated_data['new_password'])
        user.save()
        return Response({"detail": "Password changed successfully."}, status=status.HTTP_200_OK)


class VerifyPasswordSerializer(serializers.Serializer):
    """Serializer for verifying current password."""
    current_password = serializers.CharField(write_only=True)


@extend_schema(
    tags=["User Profile"],
    summary="Verify current password",
    description="Verify that the provided password matches the authenticated user's current password.",
    request=VerifyPasswordSerializer,
    responses={
        200: OpenApiResponse(description="Password verified successfully"),
        400: OpenApiResponse(description="Incorrect password")
    }
)
class VerifyPasswordView(generics.GenericAPIView):
    """Verify the current password for an authenticated user."""
    permission_classes = [IsAuthenticated]
    serializer_class = VerifyPasswordSerializer

    def post(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        
        current_password = serializer.validated_data['current_password']
        user = request.user
        
        if hasattr(user, 'check_password') and user.check_password(current_password):
            return Response({"detail": "Password verified."}, status=status.HTTP_200_OK)
        return Response({"detail": "Incorrect password."}, status=status.HTTP_400_BAD_REQUEST)


@method_decorator([never_cache], name='dispatch')  
class ChangePasswordUIView(TemplateView):
    """UI view for changing password that uses the existing API endpoint."""
    template_name = 'users/change_password.html'
    
    def dispatch(self, request, *args, **kwargs):
        # Check if user is authenticated via JWT token
        from ..authentication import CookieJWTAuthentication
        
        auth = CookieJWTAuthentication()
        try:
            user, validated_token = auth.authenticate(request)
            if user:
                request.user = user
                return super().dispatch(request, *args, **kwargs)
        except Exception:
            pass
        
        # If not authenticated, redirect to login
        return redirect('auth_login')
