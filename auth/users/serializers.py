from rest_framework import serializers
from rest_framework_simplejwt.serializers import TokenObtainPairSerializer
from django.contrib.auth import authenticate
from django.core.mail import send_mail
from django.conf import settings
from .models import User, UserOTP, PasswordResetToken
from notification_client import notification_client
from system_roles.models import UserSystemRole
import hashlib
import requests


def check_password_pwned(password):
    """
    Check if password has been compromised using HaveIBeenPwned API.
    Returns True if password is compromised, False otherwise.
    """
    try:
        # Create SHA-1 hash of the password
        sha1_hash = hashlib.sha1(password.encode('utf-8')).hexdigest().upper()
        
        # Use k-anonymity - only send first 5 characters of hash
        prefix = sha1_hash[:5]
        suffix = sha1_hash[5:]
        
        # Query HaveIBeenPwned API
        url = f"https://api.pwnedpasswords.com/range/{prefix}"
        response = requests.get(url, timeout=5)
        
        if response.status_code == 200:
            # Check if our hash suffix appears in the results
            for line in response.text.splitlines():
                hash_suffix, count = line.split(':')
                if hash_suffix == suffix:
                    return True, int(count)  # Password is compromised
            return False, 0  # Password not found in breach database
        else:
            # If API is unavailable, don't block password creation
            return False, 0
            
    except Exception:
        # If there's any error (network, timeout, etc.), don't block password creation
        return False, 0
import hashlib
import requests

class UserRegistrationSerializer(serializers.ModelSerializer):
    password = serializers.CharField(write_only=True, required=True, style={'input_type': 'password'})
    company_id = serializers.CharField(read_only=True)  # Auto-generated, not user-editable
    status = serializers.CharField(read_only=True)  # Auto-set to 'Pending'
    class Meta:
        model = User
        fields = (
            'email', 'username', 'password', 'first_name', 'middle_name', 'last_name', 
            'suffix', 'phone_number', 'company_id', 'department', 'status', 'notified'
        )

    def validate_password(self, value):
        # NIST 800-63B password requirements
        min_length = 8
        max_length = 128
        if len(value) < min_length:
            raise serializers.ValidationError(f"Password must be at least {min_length} characters long.")
        if len(value) > max_length:
            raise serializers.ValidationError(f"Password must be at most {max_length} characters long.")

        # No composition rules (no need to check for digits, uppercase, etc.)

        # Check for username/email in password
        username = self.initial_data.get('username', '').lower()
        email = self.initial_data.get('email', '').lower()
        if username and username in value.lower():
            raise serializers.ValidationError("Password must not contain your username.")
        if email and email.split('@')[0] in value.lower():
            raise serializers.ValidationError("Password must not contain part of your email address.")

        # Check against HaveIBeenPwned API for breached passwords
        is_pwned, breach_count = check_password_pwned(value)
        if is_pwned:
            raise serializers.ValidationError(
                f"This password has been found in data breaches. Please choose a different password."
            )

        return value

    def create(self, validated_data):
        # This create method handles the password hashing.
        user = User.objects.create_user(
            email=validated_data['email'],
            username=validated_data.get('username'),
            password=validated_data['password'],
            first_name=validated_data.get('first_name', ''),
            middle_name=validated_data.get('middle_name', ''),
            last_name=validated_data.get('last_name', ''),
            suffix=validated_data.get('suffix'),
            phone_number=validated_data.get('phone_number'),
            department=validated_data.get('department'),
            notified=validated_data.get('notified', False)
        )
        return user

# Protected Profile endpoint (accessible if provided valid access token in the request header)
# Serializer to safely display user data (without showing password)
class UserProfileSerializer(serializers.ModelSerializer):
    system_roles = serializers.SerializerMethodField()
    profile_picture = serializers.SerializerMethodField()
    
    class Meta:
        model = User
        fields = (
            'id', 'email', 'username', 'first_name', 'middle_name', 'last_name', 
            'suffix', 'phone_number', 'company_id', 'department', 'status', 
            'notified', 'is_active', 'profile_picture', 'date_joined', 'otp_enabled', 'system_roles'
        )
    
    def get_profile_picture(self, obj):
        """Get the full URL for the profile picture."""
        if obj.profile_picture:
            request = self.context.get('request')
            if request:
                return request.build_absolute_uri(obj.profile_picture.url)
            return obj.profile_picture.url
        return None
    
    def get_system_roles(self, obj):
        """Get system roles for the user."""
        system_roles = UserSystemRole.objects.filter(user=obj).select_related('system', 'role')
        return [
            {
                'id': assignment.id,  # Include the UserSystemRole ID for updates
                'system_name': assignment.system.name,
                'system_slug': assignment.system.slug,
                'role_name': assignment.role.name,
                'assigned_at': assignment.assigned_at,
                'is_active': assignment.is_active  # System-specific is_active status
            }
            for assignment in system_roles
        ]
from django.core.exceptions import ValidationError
from PIL import Image

def validate_profile_picture_file_size(image):
    max_file_size = 2 * 1024 * 1024  # 2MB
    if image.size > max_file_size:
        raise ValidationError(f"Profile picture file size must be less than {max_file_size // (1024 * 1024)}MB.")

def validate_profile_picture_dimensions(image):
    max_width = 1024
    max_height = 1024
    try:
        img = Image.open(image)
        width, height = img.size
        if width > max_width or height > max_height:
            raise ValidationError(f"Profile picture dimensions must not exceed {max_width}x{max_height} pixels.")
    except Exception:
        raise ValidationError("Invalid image file.")

class UserProfileUpdateSerializer(serializers.ModelSerializer):
    """Serializer for updating user profile information."""
    email = serializers.EmailField(required=False)
    username = serializers.CharField(max_length=150, required=False)
    first_name = serializers.CharField(max_length=100, required=False, allow_blank=True)
    last_name = serializers.CharField(max_length=100, required=False, allow_blank=True)
    phone_number = serializers.CharField(max_length=20, required=False, allow_blank=True, allow_null=True)
    profile_picture = serializers.ImageField(
        required=False,
        allow_null=True,
        validators=[validate_profile_picture_file_size, validate_profile_picture_dimensions]
    )

    class Meta:
        model = User
        fields = ('email', 'username', 'first_name', 'last_name', 'phone_number', 'profile_picture')
    
    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        
        # Get the user from the request context
        request = self.context.get('request')
        if request and hasattr(request, 'user'):
            user = request.user
            
            # Check if user is admin or superuser
            is_admin_or_superuser = user.is_superuser or user.is_staff
            
            # If not admin/superuser, restrict editable fields
            if not is_admin_or_superuser:
                # Only allow these fields for regular users
                allowed_fields = {'username', 'phone_number', 'profile_picture'}
                
                # Remove fields that are not allowed
                fields_to_remove = set(self.fields.keys()) - allowed_fields
                for field_name in fields_to_remove:
                    self.fields.pop(field_name)

    def validate_email(self, value):
        """Validate that email is unique (excluding current user)."""
        user = self.instance
        if User.objects.filter(email=value).exclude(pk=user.pk).exists():
            raise serializers.ValidationError("A user with this email already exists.")
        return value

    def validate_username(self, value):
        """Validate that username is unique (excluding current user)."""
        user = self.instance
        if User.objects.filter(username=value).exclude(pk=user.pk).exists():
            raise serializers.ValidationError("A user with this username already exists.")
        return value

    def validate_phone_number(self, value):
        """Validate that phone number is unique (excluding current user)."""
        if value:  # Only validate if phone number is provided
            user = self.instance
            if User.objects.filter(phone_number=value).exclude(pk=user.pk).exists():
                raise serializers.ValidationError("A user with this phone number already exists.")
        return value


class AdminUserProfileUpdateSerializer(serializers.ModelSerializer):
    """
    Serializer for admins to update user profile information.
    Allows admins to edit more fields than regular users, excluding ID fields.
    Admins can activate/deactivate agent accounts in their systems.
    """
    username = serializers.CharField(max_length=150, read_only=True)  # Read-only for display
    email = serializers.EmailField(read_only=True)  # Read-only for display
    first_name = serializers.CharField(max_length=100, required=False, allow_blank=True)
    middle_name = serializers.CharField(max_length=100, required=False, allow_blank=True, allow_null=True)
    last_name = serializers.CharField(max_length=100, required=False, allow_blank=True)
    suffix = serializers.ChoiceField(choices=[('Jr.', 'Jr.'), ('Sr.', 'Sr.'), ('II', 'II'), ('III', 'III'), ('IV', 'IV'), ('V', 'V')], required=False, allow_blank=True, allow_null=True)
    phone_number = serializers.CharField(max_length=20, required=False, allow_blank=True, allow_null=True)
    department = serializers.ChoiceField(choices=[('IT Department', 'IT Department'), ('Asset Department', 'Asset Department'), ('Budget Department', 'Budget Department')], required=False, allow_blank=True, allow_null=True)
    status = serializers.ChoiceField(choices=[('Pending', 'Pending'), ('Approved', 'Approved'), ('Rejected', 'Rejected')], required=False)
    system_role_is_active = serializers.BooleanField(required=False, write_only=True, help_text="Set to false to deactivate user's role in this system, true to activate")
    system_role_id = serializers.IntegerField(required=False, write_only=True, help_text="ID of the UserSystemRole to update")
    profile_picture = serializers.ImageField(
        required=False,
        allow_null=True,
        validators=[validate_profile_picture_file_size, validate_profile_picture_dimensions]
    )

    class Meta:
        model = User
        fields = (
            'username', 'email', 'first_name', 'middle_name', 'last_name', 'suffix', 
            'phone_number', 'department', 'status', 'system_role_is_active', 'system_role_id', 'profile_picture'
        )
        read_only_fields = ('username', 'email')  # Explicitly mark as read-only

    def validate_phone_number(self, value):
        """Validate that phone number is unique (excluding current user)."""
        if value:  # Only validate if phone number is provided
            user = self.instance
            if User.objects.filter(phone_number=value).exclude(pk=user.pk).exists():
                raise serializers.ValidationError("A user with this phone number already exists.")
        return value

    def update(self, instance, validated_data):
        """Custom update method to handle UserSystemRole is_active updates."""
        from system_roles.models import UserSystemRole
        
        # Extract system role specific fields
        system_role_is_active = validated_data.pop('system_role_is_active', None)
        system_role_id = validated_data.pop('system_role_id', None)
        
        # Update user fields normally
        instance = super().update(instance, validated_data)
        
        # Handle system role is_active update if provided
        if system_role_is_active is not None and system_role_id is not None:
            try:
                system_role = UserSystemRole.objects.get(id=system_role_id, user=instance)
                system_role.is_active = system_role_is_active
                system_role.save()
            except UserSystemRole.DoesNotExist:
                raise serializers.ValidationError("System role not found or access denied.")
        
        return instance


class CustomTokenObtainPairSerializer(TokenObtainPairSerializer):
    """Custom token serializer that supports 2FA with OTP and system-specific roles."""
    otp_code = serializers.CharField(max_length=6, required=False, allow_blank=True)

    @classmethod
    def get_token(cls, user):
        token = super().get_token(user)
        
        # Add custom claims
        token['email'] = user.email
        token['username'] = user.username
        
        # Add system-specific roles using the existing UserSystemRole model
        roles = []
        
        # Get all user roles across different systems
        user_system_roles = user.system_roles.select_related('system', 'role').all()
        for user_role in user_system_roles:
            roles.append({
                'system': user_role.system.slug,  # Using system slug as identifier
                'role': user_role.role.name
            })
        
        token['roles'] = roles
        return token

    def validate(self, attrs):
        from django.utils import timezone
        from datetime import timedelta
        LOCKOUT_THRESHOLD = 10  # Number of allowed failed attempts
        LOCKOUT_TIME = timedelta(minutes=15)  # Lockout duration

        email = attrs.get(self.username_field)
        password = attrs.get('password')
        otp_code = attrs.get('otp_code', '')

        if email and password:
            try:
                user = User.objects.get(email=email)
            except User.DoesNotExist:
                user = None

            # If user exists, check lockout status
            if user:
                if user.is_locked:
                    # Check if lockout period has expired
                    if user.lockout_time and timezone.now() >= user.lockout_time + LOCKOUT_TIME:
                        user.is_locked = False
                        user.failed_login_attempts = 0
                        user.lockout_time = None
                        user.save(update_fields=["is_locked", "failed_login_attempts", "lockout_time"])
                        # Send account unlocked notification via microservice
                        notification_client.send_account_unlocked_notification(
                            user=user,
                            ip_address=self.context.get('request').META.get('REMOTE_ADDR') if self.context.get('request') else None,
                            user_agent=self.context.get('request').META.get('HTTP_USER_AGENT') if self.context.get('request') else None
                        )
                    else:
                        raise serializers.ValidationError(
                            "Account is locked due to too many failed login attempts. Please try again later.",
                            code="account_locked"
                        )

            user_auth = authenticate(
                request=self.context.get('request'),
                username=email,
                password=password
            )

            if not user_auth:
                # Increment failed attempts if user exists
                if user:
                    user.failed_login_attempts += 1
                    if user.failed_login_attempts >= LOCKOUT_THRESHOLD:
                        user.is_locked = True
                        user.lockout_time = timezone.now()
                        # Send account locked notification via microservice
                        notification_client.send_account_locked_notification(
                            user=user,
                            failed_attempts=user.failed_login_attempts,
                            ip_address=self.context.get('request').META.get('REMOTE_ADDR') if self.context.get('request') else None,
                            user_agent=self.context.get('request').META.get('HTTP_USER_AGENT') if self.context.get('request') else None
                        )
                    else:
                        # Send failed login attempt notification for multiple attempts (but not locked yet)
                        if user.failed_login_attempts >= 5:  # Start notifying after 5 attempts
                            notification_client.send_failed_login_notification(
                                user=user,
                                ip_address=self.context.get('request').META.get('REMOTE_ADDR') if self.context.get('request') else None,
                                user_agent=self.context.get('request').META.get('HTTP_USER_AGENT') if self.context.get('request') else None
                            )
                    user.save(update_fields=["failed_login_attempts", "is_locked", "lockout_time"])
                raise serializers.ValidationError(
                    'Invalid email or password.',
                    code='authorization'
                )

            # Reset failed attempts on successful login
            if user:
                user.failed_login_attempts = 0
                user.is_locked = False
                user.lockout_time = None
                user.save(update_fields=["failed_login_attempts", "is_locked", "lockout_time"])

            # Check if 2FA is enabled for this user
            if user_auth.otp_enabled:
                # Check if OTP code is empty or missing
                if not otp_code or otp_code.strip() == '':
                    raise serializers.ValidationError(
                        'OTP code is required for this account. Please provide the OTP code.',
                        code='otp_required'
                    )

                # Get the most recent valid OTP for this user
                otp_instance = UserOTP.get_valid_otp_for_user(user_auth)
                if not otp_instance:
                    raise serializers.ValidationError(
                        'No valid OTP found. Please request a new OTP code.',
                        code='otp_expired'
                    )
                
                # Verify the provided OTP code
                if not otp_instance.verify(otp_code):
                    raise serializers.ValidationError(
                        'Invalid OTP code. Please check your code and try again.',
                        code='otp_invalid'
                    )

            # Standard JWT token generation
            self.user = user_auth
            refresh = self.get_token(user_auth)

            return {
                'refresh': str(refresh),
                'access': str(refresh.access_token),
            }

        raise serializers.ValidationError(
            'Must include "email" and "password".',
            code='authorization'
        )


class OTPRequestSerializer(serializers.Serializer):
    """Serializer for requesting OTP generation."""
    email = serializers.EmailField()
    password = serializers.CharField()

    def validate(self, attrs):
        email = attrs.get('email')
        password = attrs.get('password')

        user = authenticate(
            request=self.context.get('request'),
            username=email,
            password=password
        )

        if not user:
            raise serializers.ValidationError(
                'Invalid credentials',
                code='authorization'
            )

        if not user.otp_enabled:
            raise serializers.ValidationError(
                '2FA is not enabled for this account',
                code='2fa_not_enabled'
            )

        attrs['user'] = user
        return attrs


class Enable2FASerializer(serializers.Serializer):
    """Serializer for enabling 2FA on user account."""
    password = serializers.CharField()

    def validate_password(self, value):
        user = self.context['request'].user
        if not user.check_password(value):
            raise serializers.ValidationError('Invalid password')
        return value


class Disable2FASerializer(serializers.Serializer):
    """Serializer for disabling 2FA on user account."""
    password = serializers.CharField()
    otp_code = serializers.CharField(max_length=6)

    def validate(self, attrs):
        user = self.context['request'].user
        password = attrs.get('password')
        otp_code = attrs.get('otp_code')

        if not user.check_password(password):
            raise serializers.ValidationError('Invalid password')

        if not user.otp_enabled:
            raise serializers.ValidationError('2FA is not enabled for this account')

        # Get the most recent valid OTP for this user
        otp_instance = UserOTP.get_valid_otp_for_user(user)
        if not otp_instance or not otp_instance.verify(otp_code):
            raise serializers.ValidationError('Invalid or expired OTP code')

        return attrs


class ForgotPasswordSerializer(serializers.Serializer):
    """Serializer for requesting password reset."""
    email = serializers.EmailField()

    def validate_email(self, value):
        try:
            user = User.objects.get(email=value, is_active=True)
        except User.DoesNotExist:
            # Don't reveal whether the email exists or not for security
            # Still return the email to proceed with the flow
            pass
        return value


class ResetPasswordSerializer(serializers.Serializer):
    """Serializer for resetting password with token."""
    token = serializers.CharField()
    password = serializers.CharField(min_length=8, write_only=True)
    password_confirm = serializers.CharField(write_only=True)

    def validate(self, attrs):
        token = attrs.get('token')
        password = attrs.get('password')
        password_confirm = attrs.get('password_confirm')

        if password != password_confirm:
            raise serializers.ValidationError('Passwords do not match')

        # NIST 800-63B password requirements (same as registration)
        min_length = 8
        max_length = 128
        if len(password) < min_length:
            raise serializers.ValidationError(f"Password must be at least {min_length} characters long.")
        if len(password) > max_length:
            raise serializers.ValidationError(f"Password must be at most {max_length} characters long.")

        # No composition rules

        # Check for username/email in password (if user can be determined from token)
        reset_token = PasswordResetToken.get_valid_token(token)
        if not reset_token:
            raise serializers.ValidationError('Invalid or expired reset token')
        user = getattr(reset_token, 'user', None)
        if user:
            username = getattr(user, 'username', '').lower()
            email = getattr(user, 'email', '').lower()
            if username and username in password.lower():
                raise serializers.ValidationError("Password must not contain your username.")
            if email and email.split('@')[0] in password.lower():
                raise serializers.ValidationError("Password must not contain part of your email address.")

        # Check against common passwords (placeholder)
        common_passwords = {"password", "12345678", "qwerty", "letmein", "admin", "welcome", "admin123", "password123"}
        if password.lower() in common_passwords:
            raise serializers.ValidationError("Password is too common.")

        # Check against HaveIBeenPwned API for breached passwords
        is_pwned, breach_count = check_password_pwned(password)
        if is_pwned:
            raise serializers.ValidationError(
                f"This password has been found in {breach_count:,} data breaches. Please choose a different password."
            )

        attrs['reset_token'] = reset_token
        return attrs


def send_otp_email(user, otp_code):
    """Send OTP code to user's email."""
    subject = 'Your Authentication Code'
    message = f'''
Hello {user.get_full_name() or user.email},

Your authentication code is: {otp_code}

This code will expire in 5 minutes. Please do not share this code with anyone.

If you did not request this code, please ignore this email.

Best regards,
Authentication Service Team
    '''
    
    try:
        send_mail(
            subject=subject,
            message=message.strip(),
            from_email=getattr(settings, 'DEFAULT_FROM_EMAIL', 'noreply@example.com'),
            recipient_list=[user.email],
            fail_silently=False,
        )
        return True
    except Exception as e:
        # Log the error in production
        print(f"Failed to send OTP email to {user.email}: {str(e)}")
        return False


def send_password_reset_email(user, reset_token, request=None):
    """Send password reset email to user."""
    # Build the reset URL
    if request:
        base_url = f"{request.scheme}://{request.get_host()}"
    else:
        base_url = getattr(settings, 'FRONTEND_URL', 'http://localhost:3000')
    
    reset_url = f"{base_url}/api/v1/users/password/reset?token={reset_token.token}"
    
    subject = 'Password Reset Request'
    message = f'''
Hello {user.get_full_name() or user.email},

We received a request to reset your password. If you made this request, please click the link below to reset your password:

{reset_url}

This link will expire in 1 hour.

If you did not request a password reset, please ignore this email. Your password will remain unchanged.

Best regards,
Authentication Service Team
    '''
    
    try:
        send_mail(
            subject=subject,
            message=message.strip(),
            from_email=getattr(settings, 'DEFAULT_FROM_EMAIL', 'noreply@example.com'),
            recipient_list=[user.email],
            fail_silently=False,
        )
        return True
    except Exception as e:
        # Log the error in production
        print(f"Failed to send password reset email to {user.email}: {str(e)}")
        return False


class ProfilePasswordResetSerializer(serializers.Serializer):
    """Serializer for resetting password from user profile."""
    current_password = serializers.CharField(write_only=True)
    new_password = serializers.CharField(write_only=True)
    new_password_confirm = serializers.CharField(write_only=True)

    def validate(self, attrs):
        user = self.context['request'].user
        current_password = attrs.get('current_password')
        new_password = attrs.get('new_password')
        new_password_confirm = attrs.get('new_password_confirm')

        if not user.check_password(current_password):
            raise serializers.ValidationError({'current_password': 'Current password is incorrect.'})
        if new_password != new_password_confirm:
            raise serializers.ValidationError({'new_password_confirm': 'Passwords do not match.'})

        # NIST 800-63B password requirements (same as registration)
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

        # Check against common passwords (including "admin123" and others)
        common_passwords = {"password", "12345678", "qwerty", "letmein", "admin", "welcome", "admin123", "password123"}
        if new_password.lower() in common_passwords:
            raise serializers.ValidationError({'new_password': 'Password is too common.'})

        # Check against HaveIBeenPwned API for breached passwords
        is_pwned, breach_count = check_password_pwned(new_password)
        if is_pwned:
            raise serializers.ValidationError({
                'new_password': f"This password has been found in {breach_count:,} data breaches. Please choose a different password."
            })

        return attrs


class UserSystemRoleSerializer(serializers.ModelSerializer):
    """Serializer for viewing user's system roles using existing UserSystemRole model."""
    system_name = serializers.CharField(source='system.name', read_only=True)
    system_slug = serializers.CharField(source='system.slug', read_only=True)
    role_name = serializers.CharField(source='role.name', read_only=True)
    
    class Meta:
        from system_roles.models import UserSystemRole
        model = UserSystemRole
        fields = ('id', 'system_name', 'system_slug', 'role_name', 'assigned_at')
        read_only_fields = ('id', 'assigned_at')


class UserWithSystemRolesSerializer(serializers.ModelSerializer):
    """Serializer for viewing user's system roles."""
    system_roles = UserSystemRoleSerializer(many=True, read_only=True)
    
    class Meta:
        model = User
        fields = ('id', 'email', 'username', 'system_roles')


class AssignSystemRoleSerializer(serializers.Serializer):
    """Serializer for assigning a system role to a user using existing models."""
    user_email = serializers.EmailField()
    system_slug = serializers.CharField(max_length=255)
    role_name = serializers.CharField(max_length=150)

    def validate_user_email(self, value):
        try:
            user = User.objects.get(email=value, is_active=True)
        except User.DoesNotExist:
            raise serializers.ValidationError("User with this email does not exist or is inactive.")
        return value

    def validate_system_slug(self, value):
        from systems.models import System
        try:
            system = System.objects.get(slug=value)
        except System.DoesNotExist:
            raise serializers.ValidationError("System with this slug does not exist.")
        return value

    def validate(self, attrs):
        from systems.models import System
        from roles.models import Role
        from system_roles.models import UserSystemRole
        
        user_email = attrs.get('user_email')
        system_slug = attrs.get('system_slug')
        role_name = attrs.get('role_name')
        
        try:
            user = User.objects.get(email=user_email, is_active=True)
            system = System.objects.get(slug=system_slug)
            role = Role.objects.get(system=system, name=role_name)
            
            # Check if this assignment already exists
            if UserSystemRole.objects.filter(
                user=user, 
                system=system, 
                role=role
            ).exists():
                raise serializers.ValidationError(
                    f"User already has the role '{role_name}' in system '{system.name}'"
                )
            
            attrs['user'] = user
            attrs['system'] = system
            attrs['role'] = role
        except User.DoesNotExist:
            raise serializers.ValidationError("User with this email does not exist or is inactive.")
        except System.DoesNotExist:
            raise serializers.ValidationError("System with this slug does not exist.")
        except Role.DoesNotExist:
            raise serializers.ValidationError(f"Role '{role_name}' does not exist in system '{system_slug}'.")
        
        return attrs

    def create(self, validated_data):
        from system_roles.models import UserSystemRole
        user = validated_data.pop('user')
        system = validated_data.pop('system')
        role = validated_data.pop('role')
        return UserSystemRole.objects.create(user=user, system=system, role=role)