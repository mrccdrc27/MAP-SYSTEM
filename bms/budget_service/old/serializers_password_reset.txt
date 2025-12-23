from rest_framework import serializers
from django.contrib.auth import get_user_model
from django.contrib.auth.tokens import default_token_generator
from django.utils.http import urlsafe_base64_encode, urlsafe_base64_decode
from django.utils.encoding import force_bytes, force_str
from django.core.mail import send_mail
from django.template.loader import render_to_string
from django.conf import settings
import os

User = get_user_model()

class PasswordResetRequestSerializer(serializers.Serializer):
    """
    Serializer for requesting a password reset
    """
    email = serializers.EmailField(required=True)

    def validate_email(self, value):
        # Check if user exists with this email
        try:
            user = User.objects.get(email=value)
        except User.DoesNotExist:
            # Don't reveal whether a user exists or not
            # but validate silently
            pass
        return value

    def save(self):
        email = self.validated_data['email']
        try:
            user = User.objects.get(email=email)
            # Generate token and uid
            uid = urlsafe_base64_encode(force_bytes(user.pk))
            token = default_token_generator.make_token(user)
            
            # Create reset link (to be used by frontend)
            frontend_url = settings.FRONTEND_URL
            reset_url = f"{frontend_url}/reset-password/{uid}/{token}/"
            
            # Send email with HTML template
            subject = "Password Reset Request"
            context = {
                'user': user,
                'reset_url': reset_url
            }
            
            # Create HTML email
            html_message = render_to_string('email/password_reset_email.html', context)
            
            # Create plain text version as fallback
            plain_message = f"""
            Hello {user.first_name},

            You requested a password reset for your account. Please click the link below to reset your password:

            {reset_url}

            This link will expire in 24 hours.

            If you didn't request this, please ignore this email.

            Best regards,
            The BudgetPro Team
            """
            
            send_mail(
                subject=subject,
                message=plain_message,
                from_email=settings.DEFAULT_FROM_EMAIL,
                recipient_list=[email],
                fail_silently=False,
                html_message=html_message,
            )
            
            return True
        except User.DoesNotExist:
            # Don't reveal that the user doesn't exist
            return True


class PasswordResetConfirmSerializer(serializers.Serializer):
    """
    Serializer for confirming a password reset
    """
    password = serializers.CharField(
        min_length=8,
        max_length=64,
        write_only=True,
        style={'input_type': 'password'}
    )
    token = serializers.CharField(write_only=True)
    uid = serializers.CharField(write_only=True)

    def validate(self, attrs): 
        password = attrs.get('password')
        token = attrs.get('token')
        uid = attrs.get('uid')

        try:
            # Decode the uidb64 to get the user's ID
            uid = force_str(urlsafe_base64_decode(uid))
            self.user = User.objects.get(pk=uid)
        except (TypeError, ValueError, OverflowError, User.DoesNotExist):
            raise serializers.ValidationError({'uid': 'Invalid user ID'})

        # Check if the token is valid
        if not default_token_generator.check_token(self.user, token):
            raise serializers.ValidationError({'token': 'Invalid or expired token'})

        return attrs

    def save(self):
        password = self.validated_data['password']
        user = self.user
        user.set_password(password)
        user.save()
        return user


class PasswordChangeSerializer(serializers.Serializer):
    """
    Serializer for allowing authenticated users to change their password
    """
    current_password = serializers.CharField(
        style={'input_type': 'password'},
        write_only=True
    )
    new_password = serializers.CharField(
        min_length=8,
        max_length=64,
        style={'input_type': 'password'},
        write_only=True
    )

    def validate_current_password(self, value):
        user = self.context['request'].user
        if not user.check_password(value):
            raise serializers.ValidationError('Current password is incorrect')
        return value

    def save(self):
        user = self.context['request'].user
        user.set_password(self.validated_data['new_password'])
        user.save()
        return user
    