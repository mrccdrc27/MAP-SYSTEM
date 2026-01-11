from rest_framework import serializers
from django.utils import timezone
from django.conf import settings
import re
import logging
import jwt
import requests
from .models import Employees, EmployeeOTP

logger = logging.getLogger(__name__)


def validate_phone_number(phone_number):
    """
    Validate phone number format.
    Accepts both E.164 format and local 11-digit format starting with 09.
    Returns (is_valid, error_message)
    """
    if not phone_number or not phone_number.strip():
        return True, None  # Phone is optional
    
    phone = phone_number.strip()
    
    # Accept E.164 format: +{country_code}{number}
    e164_pattern = r'^\+\d{1,3}\d{10,14}$'
    
    # Accept local 11-digit format starting with 09 (Philippine format)
    local_pattern = r'^09\d{9}$'
    
    if not (re.match(e164_pattern, phone) or re.match(local_pattern, phone)):
        return False, "Phone number must be in E.164 format (e.g., +15551234567) or local format (09XXXXXXXXX)."
    
    return True, None


class EmployeeRegistrationSerializer(serializers.ModelSerializer):
    """Serializer for employee registration."""
    password = serializers.CharField(write_only=True, required=True, style={'input_type': 'password'})
    company_id = serializers.CharField(required=False, allow_blank=True)  # Accept input; auto-generate if blank
    status = serializers.CharField(read_only=True)  # Auto-set to 'Pending'
    
    class Meta:
        model = Employees
        fields = (
            'email', 'username', 'password', 'first_name', 'middle_name', 'last_name',
            'suffix', 'phone_number', 'company_id', 'department', 'status', 'notified', 'profile_picture'
        )

    def validate_password(self, value):
        """Validate password requirements."""
        min_length = 8
        max_length = 128
        
        if len(value) < min_length:
            raise serializers.ValidationError(f"Password must be at least {min_length} characters long.")
        if len(value) > max_length:
            raise serializers.ValidationError(f"Password must be at most {max_length} characters long.")

        # Check for username/email in password
        username = self.initial_data.get('username', '').lower()
        email = self.initial_data.get('email', '').lower()
        
        if username and username in value.lower():
            raise serializers.ValidationError("Password must not contain your username.")
        if email and email.split('@')[0] in value.lower():
            raise serializers.ValidationError("Password must not contain part of your email address.")

        return value

    def validate_phone_number(self, value):
        """Validate phone number format and uniqueness."""
        is_valid, error_message = validate_phone_number(value)
        if not is_valid:
            raise serializers.ValidationError(error_message)
        
        # Check if phone number already exists (normalize to E.164 format for comparison)
        if value:
            # Convert local format to E.164 for comparison
            normalized_phone = value
            if value.startswith('09'):
                normalized_phone = '+63' + value[1:]
            
            # Check for existing phone numbers in both formats
            if Employees.objects.filter(phone_number=normalized_phone).exists():
                raise serializers.ValidationError("An employee with this phone number already exists.")
            if Employees.objects.filter(phone_number=value).exists():
                raise serializers.ValidationError("An employee with this phone number already exists.")
        
        return value

    def validate_email(self, value):
        """Check if email already exists."""
        if Employees.objects.filter(email=value).exists():
            raise serializers.ValidationError("An employee with this email already exists.")
        return value

    def validate_username(self, value):
        """Check if username already exists."""
        if value and Employees.objects.filter(username=value).exists():
            raise serializers.ValidationError("An employee with this username already exists.")
        return value

    def create(self, validated_data):
        """Create employee with hashed password and convert phone number to E.164 format."""
        password = validated_data.pop('password')
        
        # Convert local Philippine format (09XXXXXXXXX) to E.164 format (+639XXXXXXXXX)
        phone_number = validated_data.get('phone_number')
        if phone_number and phone_number.startswith('09'):
            # Remove leading 0 and add +63 prefix
            validated_data['phone_number'] = '+63' + phone_number[1:]
        
        # Handle company_id: if provided (4 digits), prefix with 'MA'; if blank, auto-generate
        company_id = validated_data.get('company_id', '')
        if company_id and company_id.strip():
            # User provided company_id (4 digits) - prefix with MA
            validated_data['company_id'] = 'MA' + company_id.strip()
        else:
            # Auto-generate company_id using model manager
            validated_data['company_id'] = None  # Let the model manager generate it
        
        employee = Employees(**validated_data)
        employee.set_password(password)
        
        # If company_id is None, the model's save() should auto-generate it
        # If not, we generate it here
        if not employee.company_id:
            from django.db.models import Max
            max_id = Employees.objects.filter(company_id__startswith='MA').aggregate(Max('company_id'))['company_id__max']
            if max_id:
                # Extract number part and increment
                num = int(max_id[2:]) + 1
                employee.company_id = f'MA{num:04d}'
            else:
                employee.company_id = 'MA0001'
        
        employee.save()
        return employee


class EmployeeTokenObtainPairSerializer(serializers.Serializer):
    """Custom token serializer for employee login using email."""
    
    email = serializers.EmailField()
    password = serializers.CharField(write_only=True)

    def validate(self, attrs):
        """Authenticate employee using email and password."""
        from datetime import timedelta
        import jwt
        from django.conf import settings
        
        email = attrs.get('email')
        password = attrs.get('password')

        if not email or not password:
            raise serializers.ValidationError('Email and password are required.')

        try:
            employee = Employees.objects.get(email=email)
        except Employees.DoesNotExist:
            raise serializers.ValidationError('Invalid email or password.')

        # Check if employee account is locked
        if employee.is_locked:
            if employee.lockout_time and timezone.now() < employee.lockout_time:
                raise serializers.ValidationError('Account is temporarily locked. Please try again later.')
            else:
                # Unlock account if lockout duration has passed
                employee.is_locked = False
                employee.failed_login_attempts = 0
                employee.lockout_time = None
                employee.save(update_fields=['is_locked', 'failed_login_attempts', 'lockout_time'])

        # Verify password
        if not employee.check_password(password):
            employee.failed_login_attempts += 1
            
            # Lock account after 5 failed attempts
            if employee.failed_login_attempts >= 5:
                employee.is_locked = True
                employee.lockout_time = timezone.now() + timedelta(minutes=30)
                employee.save(update_fields=['failed_login_attempts', 'is_locked', 'lockout_time'])
                raise serializers.ValidationError('Account locked due to too many failed login attempts. Try again in 30 minutes.')
            
            employee.save(update_fields=['failed_login_attempts'])
            raise serializers.ValidationError('Invalid email or password.')

        # Reset failed attempts on successful login
        if employee.failed_login_attempts > 0:
            employee.failed_login_attempts = 0
            employee.save(update_fields=['failed_login_attempts'])

        # Check if 2FA is enabled
        if employee.otp_enabled:
            # Return a flag indicating OTP is required
            return {'requires_otp': True, 'email': email}

        # Update last login
        employee.last_login = timezone.now()
        employee.save(update_fields=['last_login'])

        # Manually create JWT tokens without RefreshToken model dependency
        import uuid
        now = timezone.now()
        access_exp = now + timedelta(minutes=15)
        refresh_exp = now + timedelta(days=7)
        
        # Build full name
        full_name = f"{employee.first_name} {employee.middle_name or ''} {employee.last_name}".replace('  ', ' ').strip()
        
        # Get JWT issuer for Kong compatibility (must match Kong JWT credential key)
        jwt_issuer = getattr(settings, 'SIMPLE_JWT', {}).get('ISSUER', 'tts-jwt-issuer')
        
        access_payload = {
            'token_type': 'access',
            'exp': int(access_exp.timestamp()),
            'iat': int(now.timestamp()),
            'jti': uuid.uuid4().hex,
            'iss': jwt_issuer,  # Required by Kong JWT plugin
            'user_id': employee.id,
            'employee_id': employee.id,  # Keep for backward compatibility
            'email': employee.email,
            'username': employee.username or employee.email.split('@')[0],
            'full_name': full_name,
            'user_type': 'employee',
            'roles': [
                {
                    'system': 'hdts',
                    'role': 'Employee'
                }
            ]
        }
        
        refresh_payload = {
            'token_type': 'refresh',
            'exp': int(refresh_exp.timestamp()),
            'iat': int(now.timestamp()),
            'jti': uuid.uuid4().hex,
            'iss': jwt_issuer,  # Required by Kong JWT plugin
            'user_id': employee.id,
            'employee_id': employee.id,  # Keep for backward compatibility
            'email': employee.email,
            'user_type': 'employee',
        }
        
        algorithm = getattr(settings, 'SIMPLE_JWT', {}).get('ALGORITHM', 'HS256')
        secret = getattr(settings, 'SIMPLE_JWT', {}).get('SIGNING_KEY', settings.SECRET_KEY)
        
        access_token = jwt.encode(access_payload, secret, algorithm=algorithm)
        refresh_token = jwt.encode(refresh_payload, secret, algorithm=algorithm)
        
        return {
            'refresh': refresh_token,
            'access': access_token,
            'employee': employee,
        }


class EmployeeTokenObtainPairWithRecaptchaSerializer(serializers.Serializer):
    """
    Custom token serializer for employee login using email with reCAPTCHA v2 verification.
    Includes reCAPTCHA validation before authentication.
    reCAPTCHA can be bypassed by setting RECAPTCHA_ENABLED=False in environment.
    """
    
    email = serializers.EmailField()
    password = serializers.CharField(write_only=True)
    g_recaptcha_response = serializers.CharField(required=False, write_only=True, allow_blank=True)

    def validate(self, attrs):
        """Authenticate employee using email and password after reCAPTCHA verification."""
        from datetime import timedelta
        
        email = attrs.get('email')
        password = attrs.get('password')
        recaptcha_response = attrs.get('g_recaptcha_response')

        # Check if reCAPTCHA is enabled
        recaptcha_enabled = getattr(settings, 'RECAPTCHA_ENABLED', True)

        # Verify reCAPTCHA v2 response only if enabled
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
                    
                    is_valid = result.get('success', False)
                    
                    if not is_valid:
                        raise serializers.ValidationError('reCAPTCHA verification failed.')
                        
                except requests.RequestException as e:
                    raise serializers.ValidationError('Failed to verify reCAPTCHA. Please try again.')
            else:
                raise serializers.ValidationError('reCAPTCHA verification is required.')

        # Validate email and password are provided
        if not email or not password:
            raise serializers.ValidationError('Email and password are required.')

        # Attempt to authenticate employee
        try:
            employee = Employees.objects.get(email=email)
        except Employees.DoesNotExist:
            raise serializers.ValidationError('Invalid email or password.')

        # Check if employee account is locked
        if employee.is_locked:
            if employee.lockout_time and timezone.now() < employee.lockout_time:
                raise serializers.ValidationError('Account is temporarily locked. Please try again later.')
            else:
                # Unlock account if lockout duration has passed
                employee.is_locked = False
                employee.failed_login_attempts = 0
                employee.lockout_time = None
                employee.save(update_fields=['is_locked', 'failed_login_attempts', 'lockout_time'])

        # Verify password
        if not employee.check_password(password):
            employee.failed_login_attempts += 1
            
            # Lock account after 5 failed attempts
            if employee.failed_login_attempts >= 5:
                employee.is_locked = True
                employee.lockout_time = timezone.now() + timedelta(minutes=30)
                employee.save(update_fields=['failed_login_attempts', 'is_locked', 'lockout_time'])
                raise serializers.ValidationError('Account locked due to too many failed login attempts. Try again in 30 minutes.')
            
            employee.save(update_fields=['failed_login_attempts'])
            raise serializers.ValidationError('Invalid email or password.')

        # Reset failed attempts on successful login
        if employee.failed_login_attempts > 0:
            employee.failed_login_attempts = 0
            employee.save(update_fields=['failed_login_attempts'])

        # Check if employee account status is Pending
        if employee.status == 'Pending':
            raise serializers.ValidationError('Your account is pending approval. Please wait for admin approval before logging in.')

        # Check if 2FA is enabled
        if employee.otp_enabled:
            # Return a flag indicating OTP is required
            return {'requires_otp': True, 'email': email}

        # Update last login
        employee.last_login = timezone.now()
        employee.save(update_fields=['last_login'])

        # Manually create JWT tokens
        import uuid
        now = timezone.now()
        access_exp = now + timedelta(minutes=15)
        refresh_exp = now + timedelta(days=7)
        
        # Build full name
        full_name = f"{employee.first_name} {employee.middle_name or ''} {employee.last_name}".replace('  ', ' ').strip()
        
        # Get JWT issuer for Kong compatibility (must match Kong JWT credential key)
        jwt_issuer = getattr(settings, 'SIMPLE_JWT', {}).get('ISSUER', 'tts-jwt-issuer')
        
        access_payload = {
            'token_type': 'access',
            'exp': int(access_exp.timestamp()),
            'iat': int(now.timestamp()),
            'jti': uuid.uuid4().hex,
            'iss': jwt_issuer,  # Required by Kong JWT plugin
            'user_id': employee.id,
            'employee_id': employee.id,  # Keep for backward compatibility
            'email': employee.email,
            'username': employee.username or employee.email.split('@')[0],
            'full_name': full_name,
            'user_type': 'employee',
            'roles': [
                {
                    'system': 'hdts',
                    'role': 'Employee'
                }
            ]
        }
        
        refresh_payload = {
            'token_type': 'refresh',
            'exp': int(refresh_exp.timestamp()),
            'iat': int(now.timestamp()),
            'jti': uuid.uuid4().hex,
            'iss': jwt_issuer,  # Required by Kong JWT plugin
            'user_id': employee.id,
            'employee_id': employee.id,  # Keep for backward compatibility
            'email': employee.email,
            'user_type': 'employee',
        }
        
        algorithm = getattr(settings, 'SIMPLE_JWT', {}).get('ALGORITHM', 'HS256')
        secret = getattr(settings, 'SIMPLE_JWT', {}).get('SIGNING_KEY', settings.SECRET_KEY)
        
        access_token = jwt.encode(access_payload, secret, algorithm=algorithm)
        refresh_token = jwt.encode(refresh_payload, secret, algorithm=algorithm)
        
        return {
            'refresh': refresh_token,
            'access': access_token,
            'employee': employee,
        }


class EmployeeProfileSerializer(serializers.ModelSerializer):
    """Serializer for retrieving employee profile information."""
    full_name = serializers.SerializerMethodField()
    system_roles = serializers.SerializerMethodField()
    profile_picture = serializers.SerializerMethodField()
    
    class Meta:
        model = Employees
        fields = (
            'id', 'email', 'username', 'first_name', 'middle_name', 'last_name', 'suffix',
            'phone_number', 'company_id', 'department', 'status', 'profile_picture',
            'otp_enabled', 'last_login', 'created_at', 'updated_at', 'full_name', 'system_roles'
        )
        read_only_fields = ('id', 'company_id', 'status', 'created_at', 'updated_at', 'full_name', 'system_roles')

    def get_profile_picture(self, obj):
        """Get the full URL for the profile picture using MEDIA_BASE_URL."""
        if obj.profile_picture:
            # Use MEDIA_BASE_URL if configured (for Kong gateway routing)
            # Kong routes /media to auth-service, so no prefix needed
            media_base_url = getattr(settings, 'MEDIA_BASE_URL', '')
            if media_base_url:
                return f"{media_base_url.rstrip('/')}{obj.profile_picture.url}"
            
            # Fall back to request-based URL building
            request = self.context.get('request')
            if request:
                return request.build_absolute_uri(obj.profile_picture.url)
            return obj.profile_picture.url
        return None

    def get_full_name(self, obj):
        """Return full name of employee."""
        return obj.get_full_name()
    
    def get_system_roles(self, obj):
        """Return system roles for the employee. HDTS employees have the 'Employee' role."""
        return [
            {
                'id': obj.id,
                'system_name': 'Help Desk and Ticketing System',
                'system_slug': 'hdts',
                'role_name': 'Employee',
                'assigned_at': obj.created_at.isoformat() if obj.created_at else None,
                'last_logged_on': obj.last_login.isoformat() if obj.last_login else None,
                'is_active': True
            }
        ]


class EmployeeProfileUpdateSerializer(serializers.ModelSerializer):
    """
    Serializer for updating employee profile information.
    Supports partial updates - only provided fields are updated.
    """
    
    class Meta:
        model = Employees
        fields = (
            'first_name', 'middle_name', 'last_name', 'suffix',
            'phone_number', 'department', 'profile_picture'
        )

    def validate_phone_number(self, value):
        """Validate phone number format."""
        # Allow empty/null values for optional fields
        if not value:
            return value
        is_valid, error_message = validate_phone_number(value)
        if not is_valid:
            raise serializers.ValidationError(error_message)
        return value

    def validate_first_name(self, value):
        """Validate first name."""
        if value and len(value.strip()) == 0:
            raise serializers.ValidationError("First name cannot be empty.")
        return value

    def validate_last_name(self, value):
        """Validate last name."""
        if value and len(value.strip()) == 0:
            raise serializers.ValidationError("Last name cannot be empty.")
        return value

    def update(self, instance, validated_data):
        """
        Update only the fields that were actually provided (efficient partial update).
        Only modifies fields present in validated_data.
        """
        for attr, value in validated_data.items():
            setattr(instance, attr, value)
        instance.save(update_fields=list(validated_data.keys()))
        return instance


class EmployeeChangePasswordSerializer(serializers.Serializer):
    """Serializer for changing employee password."""
    old_password = serializers.CharField(write_only=True, required=True, style={'input_type': 'password'})
    new_password = serializers.CharField(write_only=True, required=True, style={'input_type': 'password'})
    confirm_password = serializers.CharField(write_only=True, required=True, style={'input_type': 'password'})

    def validate(self, attrs):
        """Validate password change request."""
        old_password = attrs.get('old_password')
        new_password = attrs.get('new_password')
        confirm_password = attrs.get('confirm_password')

        if new_password != confirm_password:
            raise serializers.ValidationError("New passwords do not match.")

        if old_password == new_password:
            raise serializers.ValidationError("New password must be different from old password.")

        # Validate password requirements
        min_length = 8
        if len(new_password) < min_length:
            raise serializers.ValidationError(f"Password must be at least {min_length} characters long.")

        return attrs


class RequestEmployeeOTPSerializer(serializers.Serializer):
    """Serializer for requesting OTP."""
    email = serializers.EmailField()

    def validate_email(self, value):
        """Check if employee exists."""
        try:
            Employees.objects.get(email=value)
        except Employees.DoesNotExist:
            raise serializers.ValidationError("Employee with this email does not exist.")
        return value


class VerifyEmployeeOTPSerializer(serializers.Serializer):
    """Serializer for verifying OTP."""
    email = serializers.EmailField()
    otp_code = serializers.CharField(max_length=6)

    def validate_otp_code(self, value):
        """Validate OTP code format."""
        if not value.isdigit() or len(value) != 6:
            raise serializers.ValidationError("OTP must be a 6-digit number.")
        return value


class Enable2FASerializer(serializers.Serializer):
    """Serializer for enabling 2FA."""
    password = serializers.CharField(write_only=True, required=True, style={'input_type': 'password'})


class Disable2FASerializer(serializers.Serializer):
    """Serializer for disabling 2FA."""
    password = serializers.CharField(write_only=True, required=True, style={'input_type': 'password'})


class EmployeeForgotPasswordSerializer(serializers.Serializer):
    """Serializer for forgot password requests."""
    email = serializers.EmailField(required=True)
    
    def validate_email(self, value):
        """Check if employee with this email exists."""
        try:
            Employees.objects.get(email=value)
        except Employees.DoesNotExist:
            # Don't reveal if email exists for security
            pass
        return value


class EmployeeResetPasswordSerializer(serializers.Serializer):
    """Serializer for resetting password with token."""
    token = serializers.CharField(required=True, write_only=True)
    new_password = serializers.CharField(required=True, write_only=True, style={'input_type': 'password'})
    confirm_password = serializers.CharField(required=True, write_only=True, style={'input_type': 'password'})
    
    def validate_new_password(self, value):
        """Validate password requirements."""
        if len(value) < 8:
            raise serializers.ValidationError("Password must be at least 8 characters long.")
        return value
    
    def validate(self, data):
        """Validate that passwords match and token is valid."""
        if data.get('new_password') != data.get('confirm_password'):
            raise serializers.ValidationError({"confirm_password": "Passwords do not match."})
        
        # Import here to avoid circular imports
        from .models import EmployeePasswordResetToken
        token_obj = EmployeePasswordResetToken.get_valid_token(data.get('token'))
        if not token_obj:
            raise serializers.ValidationError({"token": "Invalid or expired reset token."})
        
        data['token_obj'] = token_obj
        return data

