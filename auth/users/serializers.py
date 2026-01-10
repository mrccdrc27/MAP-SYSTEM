from rest_framework import serializers
from rest_framework_simplejwt.serializers import TokenObtainPairSerializer
from django.contrib.auth import authenticate
from django.core.mail import send_mail
from django.conf import settings
from .models import User, UserOTP, PasswordResetToken
from emails.services import get_email_service
from system_roles.models import UserSystemRole
import hashlib
import requests
import re
import logging


def validate_phone_number(phone_number):
    """
    Validate phone number in E.164 format.
    Returns (is_valid, error_message)
    """
    if not phone_number or not phone_number.strip():
        return True, None  # Phone is optional
    
    phone = phone_number.strip()
    
    # E.164 format: +{country_code}{number}
    # Pattern: +1-3 digit country code + 10-14 digit number = 11-17 total
    e164_pattern = r'^\+\d{1,3}\d{10,14}$'
    
    if not re.match(e164_pattern, phone):
        return False, "Phone number must be in E.164 format (e.g., +15551234567). Ensure country code is included."
    
    return True, None


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

    def validate_username(self, value):
        """Validate that username is unique and not already taken."""
        if not value:
            raise serializers.ValidationError("Username is required.")
        if User.objects.filter(username__iexact=value).exists():
            raise serializers.ValidationError("This username is already taken. Please choose a different one.")
        return value

    def validate_phone_number(self, value):
        """Validate phone number: must be 11 digits starting with 09."""
        if not value:
            raise serializers.ValidationError("Phone number is required.")
        # Remove any non-digit characters for validation
        phone_digits = re.sub(r'\D', '', value)
        if len(phone_digits) != 11 or not phone_digits.startswith('09'):
            raise serializers.ValidationError("Phone number must be 11 digits starting with 09 (e.g., 09123456789).")
        return value

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
            'notified', 'is_active', 'profile_picture', 'date_joined', 'last_login',
            'otp_enabled', 'system_roles'
        )
    
    def get_profile_picture(self, obj):
        """Get the full URL for the profile picture."""
        from django.conf import settings
        
        if obj.profile_picture:
            # Use MEDIA_BASE_URL if configured (for Kong gateway routing)
            if getattr(settings, 'MEDIA_BASE_URL', ''):
                return f"{settings.MEDIA_BASE_URL.rstrip('/')}{obj.profile_picture.url}"
            
            # Fall back to request-based URL building
            request = self.context.get('request')
            if request:
                return request.build_absolute_uri(obj.profile_picture.url)
            return obj.profile_picture.url
        return None
    
    def get_system_roles(self, obj):
        """Get system roles for the user, filtered by current system from session."""
        request = self.context.get('request')
        system_roles = UserSystemRole.objects.filter(user=obj).select_related('system', 'role')
        
        # Filter by current system if available in session
        if request:
            current_system_slug = request.session.get('last_selected_system')
            if current_system_slug:
                system_roles = system_roles.filter(system__slug=current_system_slug)
        
        return [
            {
                'id': assignment.id,  # Include the UserSystemRole ID for updates
                'system_name': assignment.system.name,
                'system_slug': assignment.system.slug,
                'role_name': assignment.role.name,
                'assigned_at': assignment.assigned_at,
                'last_logged_on': assignment.last_logged_on,  # Last login timestamp for this system role
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
        # Reset file pointer before reading
        if hasattr(image, 'seek'):
            image.seek(0)
        img = Image.open(image)
        img.verify()  # Verify it's a valid image
        # Re-open after verify (verify() can only be called once)
        if hasattr(image, 'seek'):
            image.seek(0)
        img = Image.open(image)
        width, height = img.size
        if width > max_width or height > max_height:
            raise ValidationError(f"Profile picture dimensions must not exceed {max_width}x{max_height} pixels.")
        # Reset file pointer for Django to save
        if hasattr(image, 'seek'):
            image.seek(0)
    except ValidationError:
        raise
    except Exception as e:
        import logging
        logger = logging.getLogger(__name__)
        logger.error(f"Image validation error: {type(e).__name__}: {e}")
        raise ValidationError("Invalid image file.")

class UserProfileUpdateSerializer(serializers.ModelSerializer):
    """Serializer for updating user profile information."""
    email = serializers.EmailField(required=False)
    username = serializers.CharField(max_length=150, required=False)
    first_name = serializers.CharField(max_length=100, required=False, allow_blank=True)
    middle_name = serializers.CharField(max_length=100, required=False, allow_blank=True, allow_null=True)
    last_name = serializers.CharField(max_length=100, required=False, allow_blank=True)
    suffix = serializers.CharField(max_length=10, required=False, allow_blank=True, allow_null=True)
    phone_number = serializers.CharField(max_length=20, required=False, allow_blank=True, allow_null=True)
    otp_enabled = serializers.BooleanField(required=False)
    profile_picture = serializers.ImageField(
        required=False,
        allow_null=True,
        validators=[validate_profile_picture_file_size, validate_profile_picture_dimensions]
    )

    class Meta:
        model = User
        fields = ('email', 'username', 'first_name', 'middle_name', 'last_name', 'suffix', 'phone_number', 'profile_picture', 'otp_enabled')
    
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

    def validate_profile_picture(self, value):
        """Validate and log profile picture field."""
        print(f"[SERIALIZER] validate_profile_picture called")
        print(f"[SERIALIZER] profile_picture value: {value}")
        print(f"[SERIALIZER] profile_picture type: {type(value)}")
        if value:
            print(f"[SERIALIZER] profile_picture.name: {value.name}")
            print(f"[SERIALIZER] profile_picture.size: {value.size}")
            print(f"[SERIALIZER] profile_picture.content_type: {value.content_type}")
        return value

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
        """Validate phone number format (E.164) and uniqueness (excluding current user)."""
        if not value:
            return None  # Phone is optional
        
        phone = value.strip() if isinstance(value, str) else value
        
        # Validate E.164 format
        is_valid, error_msg = validate_phone_number(phone)
        if not is_valid:
            raise serializers.ValidationError(error_msg)
        
        # Check uniqueness (excluding current user)
        user = self.instance
        if User.objects.filter(phone_number=phone).exclude(pk=user.pk).exists():
            raise serializers.ValidationError("A user with this phone number already exists.")
        
        return phone

    def update(self, instance, validated_data):
        """Custom update method with logging."""
        print(f"[SERIALIZER] update() called")
        print(f"[SERIALIZER] Instance: {instance}")
        print(f"[SERIALIZER] Instance ID: {instance.id}")
        print(f"[SERIALIZER] Validated data keys: {list(validated_data.keys())}")
        
        for key, value in validated_data.items():
            if key == 'profile_picture':
                print(f"[SERIALIZER]   - {key}: <FILE OBJECT> {value.name if hasattr(value, 'name') else 'NO NAME'}")
            else:
                print(f"[SERIALIZER]   - {key}: {value}")
        
        # Call parent update
        print(f"[SERIALIZER] Calling parent update method...")
        instance = super().update(instance, validated_data)
        
        print(f"[SERIALIZER] Parent update completed")
        print(f"[SERIALIZER] instance.profile_picture after update: {instance.profile_picture}")
        if instance.profile_picture:
            print(f"[SERIALIZER] instance.profile_picture.name: {instance.profile_picture.name}")
            print(f"[SERIALIZER] instance.profile_picture.url: {instance.profile_picture.url}")
        
        return instance


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
        """Validate phone number format (E.164) and uniqueness (excluding current user)."""
        if not value:
            return None  # Phone is optional
        
        phone = value.strip() if isinstance(value, str) else value
        
        # Validate E.164 format
        is_valid, error_msg = validate_phone_number(phone)
        if not is_valid:
            raise serializers.ValidationError(error_msg)
        
        # Check uniqueness (excluding current user)
        user = self.instance
        if User.objects.filter(phone_number=phone).exclude(pk=user.pk).exists():
            raise serializers.ValidationError("A user with this phone number already exists.")
        
        return phone

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
        
        # Add issuer claim for Kong JWT validation
        # This MUST match the 'key' in Kong's jwt_secrets consumer config
        token['iss'] = 'tts-jwt-issuer'
        
        # Add custom claims
        token['email'] = user.email
        token['username'] = user.username
        token['full_name'] = user.get_full_name()
        token['user_type'] = 'staff'  # This is for Staff users (User model)
        
        # Add system-specific roles using the existing UserSystemRole model
        roles = []
        
        # Get all user roles across different systems
        user_system_roles = UserSystemRole.objects.filter(user=user).select_related('system', 'role').all()
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
                        try:
                            get_email_service().send_account_unlocked_email(
                                user_email=user.email,
                                user_name=user.get_full_name() or user.username,
                                ip_address=self.context.get('request').META.get('REMOTE_ADDR') if self.context.get('request') else None
                            )
                        except Exception as e:
                            logging.getLogger(__name__).error(f"Failed to send unlocked email: {e}")
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
                    else:
                        # Send failed login attempt notification for multiple attempts (but not locked yet)
                        if user.failed_login_attempts >= 5:  # Start notifying after 5 attempts
                            try:
                                get_email_service().send_failed_login_email(
                                    user_email=user.email,
                                    user_name=user.get_full_name() or user.username,
                                    ip_address=self.context.get('request').META.get('REMOTE_ADDR') if self.context.get('request') else None,
                                    attempt_time=timezone.now(),
                                    failed_attempts=user.failed_login_attempts
                                )
                            except Exception as e:
                                logging.getLogger(__name__).error(f"Failed to send failed login email: {e}")
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
                    # Auto-generate and send OTP if not provided
                    otp_instance = UserOTP.generate_for_user(user_auth, otp_type='email')
                    
                    # Send OTP email
                    try:
                        send_otp_email(user_auth, otp_instance.otp_code)
                        # Log success (without sensitive data)
                        logging.getLogger(__name__).info(f"OTP sent to {user_auth.email}")
                    except Exception as e:
                        logging.getLogger(__name__).error(f"Failed to send OTP email: {str(e)}")
                    
                    raise serializers.ValidationError(
                        'OTP code is required for this account. An OTP has been sent to your email.',
                        code='otp_required'
                    )

                # Get the most recent valid OTP for this user
                otp_instance = UserOTP.get_valid_otp_for_user(user_auth)
                if not otp_instance:
                    # Generate new OTP if expired
                    otp_instance = UserOTP.generate_for_user(user_auth, otp_type='email')
                    try:
                        send_otp_email(user_auth, otp_instance.otp_code)
                        logging.getLogger(__name__).info(f"New OTP sent to {user_auth.email}")
                    except Exception as e:
                        logging.getLogger(__name__).error(f"Failed to send OTP email: {str(e)}")
                    
                    raise serializers.ValidationError(
                        'Your previous OTP expired. A new OTP has been sent to your email.',
                        code='otp_expired'
                    )
                
                # Verify the provided OTP code
                if not otp_instance.verify(otp_code):
                    # OTP is invalid, but DON'T increment failed_login_attempts
                    # because the email/password were already validated
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
                "This password has been found in data breaches. Please choose a different password."
            )

        attrs['reset_token'] = reset_token
        return attrs


def send_otp_email(user, otp_code):
    """Send OTP code to user's email via email service."""
    try:
        success, _, _ = get_email_service().send_otp_email(
            user_email=user.email,
            user_name=user.get_full_name() or user.username,
            otp_code=otp_code
        )
        return success
    except Exception as e:
        # Log the error in production
        print(f"Failed to send OTP email to {user.email}: {str(e)}")
        return False


def send_password_reset_email(user, reset_token, request=None):
    """Send password reset email."""
    try:
        # Build reset URL - prefer configured URL over request host for user-facing links
        # This prevents internal Docker hostnames (e.g., auth-service:8000) from being used
        base_url = getattr(settings, 'FRONTEND_URL', None) or getattr(settings, 'PUBLIC_URL', None)
        
        if not base_url and request:
            # Fallback to request only if no configured URL
            base_url = f"{request.scheme}://{request.get_host()}"
        
        if not base_url:
            base_url = 'http://localhost:3000'  # Final fallback for development
        
        reset_url = f"{base_url}/reset-password?token={reset_token.token}"
        
        success, _, _ = get_email_service().send_password_reset_email(
            user_email=user.email,
            user_name=user.get_full_name() or user.username,
            reset_url=reset_url,
            reset_token=reset_token.token
        )
        return success
    except Exception as e:
        # Log the error in production
        print(f"Failed to initiate password reset email to {user.email}: {str(e)}")
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
                'new_password': "This password has been found in data breaches. Please choose a different password."
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


class LoginWithRecaptchaSerializer(serializers.Serializer):
    """
    Serializer for API-based login with reCAPTCHA v2 verification.
    Handles email/password authentication and validates reCAPTCHA response server-side.
    reCAPTCHA can be bypassed by setting RECAPTCHA_ENABLED=False in environment.
    """
    email = serializers.EmailField(required=True)
    password = serializers.CharField(write_only=True, required=True)
    g_recaptcha_response = serializers.CharField(required=False, write_only=True, allow_blank=True)
    
    def validate(self, attrs):
        """Authenticate user with email and password after reCAPTCHA v2 verification."""
        from datetime import timedelta
        from django.utils import timezone
        
        LOCKOUT_THRESHOLD = 10
        LOCKOUT_TIME = timedelta(minutes=15)
        
        email = attrs.get('email')
        password = attrs.get('password')
        recaptcha_response = attrs.get('g_recaptcha_response')
        
        # Check if reCAPTCHA is enabled
        recaptcha_enabled = getattr(settings, 'RECAPTCHA_ENABLED', True)
        
        # Verify reCAPTCHA only if enabled
        if recaptcha_enabled:
            if recaptcha_response:
                verify_url = 'https://www.google.com/recaptcha/api/siteverify'
                secret_key = settings.RECAPTCHA_SECRET_KEY
                
                try:
                    response = requests.post(
                        verify_url,
                        data={'secret': secret_key, 'response': recaptcha_response},
                        timeout=5
                    )
                    response.raise_for_status()
                    result = response.json()
                    
                    if not result.get('success', False):
                        raise serializers.ValidationError('reCAPTCHA verification failed.')
                        
                except requests.RequestException:
                    raise serializers.ValidationError('Failed to verify reCAPTCHA. Please try again.')
            else:
                raise serializers.ValidationError('reCAPTCHA verification is required.')
        
        if email and password:
            try:
                user = User.objects.get(email=email)
            except User.DoesNotExist:
                user = None
            
            if user:
                if user.is_locked:
                    if user.lockout_time and timezone.now() >= user.lockout_time + LOCKOUT_TIME:
                        user.is_locked = False
                        user.failed_login_attempts = 0
                        user.lockout_time = None
                        user.save(update_fields=["is_locked", "failed_login_attempts", "lockout_time"])
                        try:
                            get_email_service().send_account_unlocked_email(
                                user_email=user.email,
                                user_name=user.get_full_name() or user.username,
                                ip_address=self.context.get('request').META.get('REMOTE_ADDR') if self.context.get('request') else None
                            )
                        except Exception as e:
                            logging.getLogger(__name__).error(f"Failed to send unlocked email: {e}")
                    else:
                        raise serializers.ValidationError(
                            "Account is locked due to too many failed login attempts. Please try again later.",
                            code="account_locked"
                        )
            
            user_auth = authenticate(username=email, password=password)
            
            if not user_auth:
                if user:
                    user.failed_login_attempts += 1
                    if user.failed_login_attempts >= LOCKOUT_THRESHOLD:
                        user.is_locked = True
                        user.lockout_time = timezone.now()
                        try:
                            get_email_service().send_account_locked_email(
                                user_email=user.email,
                                user_name=user.get_full_name() or user.username,
                                locked_until=timezone.now() + LOCKOUT_TIME,
                                failed_attempts=user.failed_login_attempts,
                                lockout_duration="15 minutes",
                                ip_address=self.context.get('request').META.get('REMOTE_ADDR') if self.context.get('request') else None
                            )
                        except Exception as e:
                            logging.getLogger(__name__).error(f"Failed to send locked email: {e}")
                    else:
                        if user.failed_login_attempts >= 5:
                            try:
                                get_email_service().send_failed_login_email(
                                    user_email=user.email,
                                    user_name=user.get_full_name() or user.username,
                                    ip_address=self.context.get('request').META.get('REMOTE_ADDR') if self.context.get('request') else None,
                                    attempt_time=timezone.now(),
                                    failed_attempts=user.failed_login_attempts
                                )
                            except Exception as e:
                                logging.getLogger(__name__).error(f"Failed to send failed login email: {e}")
                    user.save(update_fields=["failed_login_attempts", "is_locked", "lockout_time"])
                
                raise serializers.ValidationError('Invalid email or password.')
            
            attrs['user'] = user_auth
        else:
            raise serializers.ValidationError('Email and password are required.')
        
        return attrs


class LoginProcessSerializer(LoginWithRecaptchaSerializer):
    """
    Extends LoginWithRecaptchaSerializer to handle full login process including:
    - HDTS permission checks
    - OTP generation/requirement check
    - Token generation
    - System role data aggregation
    """
    
    def validate(self, attrs):
        # First perform standard authentication
        attrs = super().validate(attrs)
        user = attrs['user']
        request = self.context.get('request')
        
        # HDTS Specific Checks
        is_hdts_employee = UserSystemRole.objects.filter(
            user=user,
            system__slug='hdts',
            role__name='Employee'
        ).exists()
        
        if is_hdts_employee and user.status != 'Approved':
            error_message = 'Your account is pending approval by the HDTS system administrator.'
            if user.status == 'Rejected':
                error_message = 'Your account has been rejected by the HDTS system administrator.'
            
            raise serializers.ValidationError(error_message)

        # 2FA Check
        if user.otp_enabled:
            # Generate OTP and send email
            otp_instance = UserOTP.generate_for_user(user, otp_type='email')
            
            try:
                get_email_service().send_otp_email(
                    user_email=user.email,
                    user_name=user.get_full_name() or user.username,
                    otp_code=otp_instance.otp_code
                )
            except Exception as e:
                logging.getLogger(__name__).warning(f"Failed to send OTP email to {user.email}: {str(e)}")
            
            # Generate temporary token
            from rest_framework_simplejwt.tokens import RefreshToken
            temp_token = RefreshToken.for_user(user)
            temp_token['temp_otp_login'] = True
            temp_token['otp_required'] = True
            
            return {
                'success': False,
                'otp_required': True,
                'message': 'OTP verification required. Check your email for the code.',
                'temporary_token': str(temp_token.access_token),
                'user': {
                    'id': user.id,
                    'email': user.email,
                    'first_name': user.first_name,
                }
            }

        # If no 2FA, process full login
        return self._generate_full_login_response(user)

    def _generate_full_login_response(self, user):
        from django.utils.timezone import now
        
        # Reset failed login attempts
        user.failed_login_attempts = 0
        user.is_locked = False
        user.lockout_time = None
        user.save(update_fields=["failed_login_attempts", "is_locked", "lockout_time"])
        
        # Update last_logged_on
        UserSystemRole.objects.filter(user=user).update(last_logged_on=now())
        
        # Generate tokens using CustomTokenObtainPairSerializer for custom claims
        # (email, username, full_name, user_type, roles)
        refresh = CustomTokenObtainPairSerializer.get_token(user)
        
        # Gather system roles
        system_roles_data = []
        user_system_roles = UserSystemRole.objects.filter(user=user).select_related('system', 'role')
        for role_assignment in user_system_roles:
            system_roles_data.append({
                'system_name': role_assignment.system.name,
                'system_slug': role_assignment.system.slug,
                'role_name': role_assignment.role.name,
                'assigned_at': role_assignment.assigned_at,
            })
            
        # Determine redirect
        primary_system = None
        redirect_url = settings.DEFAULT_SYSTEM_URL
        if system_roles_data:
            primary_system = system_roles_data[0]['system_slug']
            redirect_url = settings.SYSTEM_TEMPLATE_URLS.get(primary_system, settings.DEFAULT_SYSTEM_URL)
            
        available_systems = {
            role_data['system_slug']: settings.SYSTEM_TEMPLATE_URLS.get(role_data['system_slug'], settings.DEFAULT_SYSTEM_URL)
            for role_data in system_roles_data
        }

        return {
            'success': True,
            'otp_required': False,
            'message': 'Authentication successful',
            'access_token': str(refresh.access_token),
            'refresh_token': str(refresh),
            'user': user,
            'system_roles': system_roles_data,
            'redirect': {
                'primary_system': primary_system,
                'url': redirect_url,
                'available_systems': available_systems
            }
        }

class VerifyOTPLoginSerializer(serializers.Serializer):
    temporary_token = serializers.CharField(required=True)
    otp_code = serializers.CharField(required=True)
    
    def validate(self, attrs):
        from rest_framework_simplejwt.tokens import AccessToken
        from rest_framework_simplejwt.exceptions import TokenError, InvalidToken
        
        token_str = attrs.get('temporary_token')
        otp_code = attrs.get('otp_code')
        
        try:
            token = AccessToken(token_str)
            if not token.get('temp_otp_login'):
                raise serializers.ValidationError('Invalid token type.')
            
            user_id = token.get('user_id')
            user = User.objects.get(id=user_id)
        except (TokenError, InvalidToken, User.DoesNotExist):
            raise serializers.ValidationError('Invalid or expired token.')
            
        # Verify OTP
        otp_instance = UserOTP.get_valid_otp_for_user(user)
        if not otp_instance or not otp_instance.verify(otp_code):
            raise serializers.ValidationError('Invalid or expired OTP code.')
            
        # Process full login
        # Reuse logic from LoginProcessSerializer, but we can't easily inherit because inputs are different
        # So we duplicate the generation logic or extract it to a mixin/helper
        # For now, let's call the helper method from the class if we make it static or separate
        # But since I put it on the instance, let's just duplicate or extract.
        # Better: extract to a standalone helper function or method on User model?
        # Let's just instantiate LoginProcessSerializer temporarily to reuse the method? No, that's messy.
        
        # Re-implement generation logic here for now (it's clean enough)
        from django.utils.timezone import now
        
        user.failed_login_attempts = 0
        user.is_locked = False
        user.lockout_time = None
        user.save(update_fields=["failed_login_attempts", "is_locked", "lockout_time"])
        
        UserSystemRole.objects.filter(user=user).update(last_logged_on=now())
        
        # Use CustomTokenObtainPairSerializer for custom claims (email, username, full_name, user_type, roles)
        refresh = CustomTokenObtainPairSerializer.get_token(user)
        
        system_roles_data = []
        user_system_roles = UserSystemRole.objects.filter(user=user).select_related('system', 'role')
        for role_assignment in user_system_roles:
            system_roles_data.append({
                'system_name': role_assignment.system.name,
                'system_slug': role_assignment.system.slug,
                'role_name': role_assignment.role.name,
                'assigned_at': role_assignment.assigned_at,
            })
            
        primary_system = None
        redirect_url = settings.DEFAULT_SYSTEM_URL
        if system_roles_data:
            primary_system = system_roles_data[0]['system_slug']
            redirect_url = settings.SYSTEM_TEMPLATE_URLS.get(primary_system, settings.DEFAULT_SYSTEM_URL)
            
        available_systems = {
            role_data['system_slug']: settings.SYSTEM_TEMPLATE_URLS.get(role_data['system_slug'], settings.DEFAULT_SYSTEM_URL)
            for role_data in system_roles_data
        }
        
        return {
            'success': True,
            'message': 'OTP verification successful',
            'access_token': str(refresh.access_token),
            'refresh_token': str(refresh),
            'user': user,
            'system_roles': system_roles_data,
            'redirect': {
                'primary_system': primary_system,
                'url': redirect_url,
                'available_systems': available_systems
            }
        }


class LoginResponseSerializer(serializers.Serializer):
    success = serializers.BooleanField()
    otp_required = serializers.BooleanField(required=False)
    message = serializers.CharField()
    access_token = serializers.CharField(required=False)
    refresh_token = serializers.CharField(required=False)
    temporary_token = serializers.CharField(required=False)
    
    # Use SerializerMethodField to handle User object serialization safely
    user = serializers.SerializerMethodField()
    redirect = serializers.DictField(required=False)
    
    def get_user(self, instance):
        if 'user' not in instance:
            return None
            
        user = instance['user']
        if isinstance(user, dict):
            # Already serialized (e.g. in OTP required case where we pass a dict)
            return user
            
        # If it's a User model instance, serialize it manually
        # matching the structure expected by the frontend
        user_data = {
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
        }
        
        # Merge system_roles if present in the parent instance dict
        if 'system_roles' in instance:
            user_data['system_roles'] = instance['system_roles']
            
        return user_data