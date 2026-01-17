# File: bms/auth_service/users/serializers.py

from rest_framework import serializers
from django.contrib.auth import get_user_model, authenticate
from django.utils.translation import gettext_lazy as _
from django.utils import timezone
from drf_spectacular.utils import extend_schema_field
import re
import secrets  # For password generation
import string  # For password generation

# Models from the current app ('users')
from .models import LoginAttempt  # UserActivityLog will be used in views

# For password reset, from serializers_password_reset.py
from django.contrib.auth.tokens import default_token_generator
from django.utils.http import urlsafe_base64_encode, urlsafe_base64_decode
from django.utils.encoding import force_bytes, force_str
from django.core.mail import send_mail
from django.template.loader import render_to_string
from django.conf import settings  # For FRONTEND_URL, DEFAULT_FROM_EMAIL

# For simplejwt custom token claims
from rest_framework_simplejwt.serializers import TokenObtainPairSerializer as OriginalTokenObtainPairSerializer


User = get_user_model()

# --- User Serializers (Adapted for Auth Service) ---


class UserSerializer(serializers.ModelSerializer):
    """
    General User Serializer for auth service.
    Department is represented by department_id and department_name from the User model.
    """
    # department_name is already a field on the auth_service User model
    # department_id is also already a field on the auth_service User model
    role_display = serializers.SerializerMethodField()
    class Meta:
        model = User
        fields = [
            'id', 'email', 'username', 'first_name', 'last_name',
            'role', 'role_display',  # <-- add role_display
            'department_id', 'department_name',
            'phone_number', 'is_active', 'is_staff', 'is_superuser',
            'created_at', 'last_login', 'password'
        ]
        read_only_fields = [
            'id', 'created_at', 'last_login',
            'department_name'  # department_id can be written during creation/update
        ]
        extra_kwargs = {
            # Not required for GET/PATCH, but for POST
            'password': {'write_only': True, 'required': False},
            'phone_number': {'required': False, 'allow_blank': True, 'allow_null': True},
            'first_name': {'required': False, 'allow_blank': True},
            'last_name': {'required': False, 'allow_blank': True},
        }
    

    def create(self, validated_data):
        # department_id and department_name are directly on the User model now
        # No need to pop 'department_id' and look up Department object here
        # as the auth_service doesn't own the Department model.
        # It's assumed department_id and department_name are set if provided.
        password = validated_data.pop('password', None)
        user = User(**validated_data)
        if password:
            user.set_password(password)
        else:
            # Set a default random password if not provided during creation by admin
            # (e.g., if UserManagementViewSet uses this serializer for creation)
            import secrets
            import string
            temp_password = ''.join(secrets.choice(
                string.ascii_letters + string.digits) for _ in range(12))
            user.set_password(temp_password)
            # Consider how this temp_password is communicated if this is an admin action.
            # For self-registration, password would be required.

        user.save()
        return user

    def update(self, instance, validated_data):
        password = validated_data.pop('password', None)
        for attr, value in validated_data.items():
            setattr(instance, attr, value)
        if password:
            instance.set_password(password)
        instance.save()
        return instance
    
    def get_role_display(self, obj):
        return obj.get_role_display()


# Was UserUpdateSerializer
class UserProfileUpdateSerializer(serializers.ModelSerializer):
    """
    Serializer specifically for user self-updating their profile.
    Limits fields that a user can change for themselves.
    """
    class Meta:
        model = User
        # MODIFICATION START
        # Allow updating first name, last name, and phone number.
        fields = ['first_name', 'last_name', 'phone_number']
        # MODIFICATION END
        extra_kwargs = {
            'phone_number': {'required': False, 'allow_blank': True, 'allow_null': True},
            'first_name': {'required': True, 'allow_blank': False},
            'last_name': {'required': True, 'allow_blank': False},
        }

# --- Login Serializers ---


class LoginSerializer(serializers.Serializer):
    """
    Mirrors monolithic LoginSerializer for validating login input.
    """
    email = serializers.CharField(
        # Changed from EmailField to CharField to allow non-email as identifier
        required=False, allow_blank=True)
    phone_number = serializers.CharField(required=False, allow_blank=True)
    password = serializers.CharField(
        style={'input_type': 'password'}, trim_whitespace=False)

    def validate(self, attrs):
        # Using self.initial_data to get what was actually sent
        email_input = self.initial_data.get('email')
        phone_input = self.initial_data.get('phone_number')
        password = attrs.get('password')  # Password from validated data

        identifier = None
        if email_input:  # Prioritize email if both are sent
            identifier = email_input
        elif phone_input:
            identifier = phone_input

        if not identifier:
            raise serializers.ValidationError(
                _("Must include either 'email' or 'phone_number'."), code='authorization')

        if not password:
            raise serializers.ValidationError(
                _("Password is required."), code='authorization')

        # Validate phone format if phone_input was the identifier used
        if identifier == phone_input:
            pattern = r'^\+\d{10,15}$'  # E.164 like
            if not re.match(pattern, identifier):
                # This error might not be the best place if the identifier could be a username
                # but for email/phone only, it's okay.
                raise serializers.ValidationError(
                    _("Invalid phone number format. Use E.164 format e.g., +639123456789."),
                    code='authorization'
                )

        user = authenticate(
            request=self.context.get('request'),
            username=identifier,  # This 'username' is passed to EmailOrPhoneNumberBackend
            password=password
        )

        if not user:
            raise serializers.ValidationError(
                _('Invalid credentials'), code='authorization')

        if not user.is_active:
            raise serializers.ValidationError(
                _('User account is disabled.'), code='authorization')

        # last_login update is handled in the LoginView after successful token generation
        # user.last_login = timezone.now()
        # user.save(update_fields=['last_login'])
        attrs['user'] = user
        return attrs



class MyTokenObtainPairSerializer(OriginalTokenObtainPairSerializer):
    """
    Custom token serializer to add custom claims like role, department info.
    IMPORTANT: This adds roles in a nested dictionary structure for microservices.
    """
    @classmethod
    def get_token(cls, user):
        token = super().get_token(user)
        # Add custom claims from the auth_service User model
        token['username'] = user.username
        token['email'] = user.email
        token['first_name'] = user.first_name
        token['last_name'] = user.last_name
        token['user_id'] = user.id
        token['department_id'] = user.department_id
        token['department_name'] = user.department_name

        # Include full_name for compatibility
        token['full_name'] = f"{user.first_name} {user.last_name}".strip()
        
        # Include department as alias (BMS expects this)
        if user.department_name:
            token['department'] = user.department_name

        # CRITICAL: Budget service expects roles in nested dictionary
        # where each key is a service slug (e.g., 'bms' for Budget Management System)
        token['roles'] = {
            'bms': user.role  # Maps to 'ADMIN', 'FINANCE_HEAD', etc.
        }

        return token


class LogoutSerializer(serializers.Serializer):
    refresh = serializers.CharField(
        required=True, help_text="Refresh token to blacklist")


class LogoutResponseSerializer(serializers.Serializer):  # For Swagger
    success = serializers.CharField(help_text="Logout status message")


class LogoutErrorSerializer(serializers.Serializer):  # For Swagger
    error = serializers.CharField(help_text="Error message")


class LoginAttemptSerializer(serializers.ModelSerializer):
    username = serializers.CharField(
        source='user.username', read_only=True, allow_null=True)
    # username_input is already a field on LoginAttempt model

    class Meta:
        model = LoginAttempt
        fields = ['id', 'username', 'username_input',
                  'ip_address', 'user_agent', 'success', 'timestamp']


# --- Password Reset Serializers (from serializers_password_reset.py) ---

class PasswordResetRequestSerializer(serializers.Serializer):
    email = serializers.EmailField(required=True)

    def validate_email(self, value):
        try:
            User.objects.get(email__iexact=value)  # Case-insensitive check
        except User.DoesNotExist:
            pass  # Don't reveal existence
        return value

    def save(self):
        email = self.validated_data['email']
        try:
            user = User.objects.get(email__iexact=email)  # Case-insensitive
            uid = urlsafe_base64_encode(force_bytes(user.pk))
            token = default_token_generator.make_token(user)

            frontend_url = settings.FRONTEND_URL
            # Ensure frontend route match
            reset_url = f"{frontend_url}/reset-password/{uid}/{token}/"

            subject = "Password Reset Request"
            context = {
                'user': user,  # Pass the whole user object if template needs more
                'username': user.get_full_name() or user.username,
                'reset_url': reset_url,
                'site_name': "MAP Active Budgeting Software"  # Or from settings
            }

            html_message = render_to_string(
                'email/password_reset_email.html', context)
            plain_message = render_to_string(
                'email/password_reset_email.txt', context)  # Create a .txt template too

            send_mail(
                subject=subject,
                message=plain_message,
                from_email=settings.DEFAULT_FROM_EMAIL,
                recipient_list=[user.email],  # Send to the user's actual email
                fail_silently=False,
                html_message=html_message,
            )
            return user  # Return user for logging purposes in the view
        except User.DoesNotExist:
            return None  # Indicate user not found, view can decide how to log


class PasswordResetConfirmSerializer(serializers.Serializer):
    password = serializers.CharField(
        min_length=8, max_length=64, write_only=True, style={'input_type': 'password'})
    token = serializers.CharField(write_only=True)
    uid = serializers.CharField(write_only=True)

    def validate(self, attrs):
        # Password validation (e.g. length) is done by field itself
        password = attrs.get('password')
        # and AUTH_PASSWORD_VALIDATORS will run on set_password
        token = attrs.get('token')
        # Renamed to avoid confusion with decoded uid
        uid_b64 = attrs.get('uid')

        try:
            uid = force_str(urlsafe_base64_decode(uid_b64))
            self.user = User.objects.get(pk=uid)
        # Catch generic Exception too
        except (TypeError, ValueError, OverflowError, User.DoesNotExist, Exception):
            raise serializers.ValidationError(
                {'uid': _('Invalid user ID or link.')})

        if not default_token_generator.check_token(self.user, token):
            raise serializers.ValidationError(
                {'token': _('Invalid or expired token.')})

        # Validate the new password against Django's validators
        from django.contrib.auth.password_validation import validate_password
        try:
            validate_password(password, self.user)
        except serializers.ValidationError as e:  # Django's ValidationError
            raise serializers.ValidationError(
                {'password': list(e.messages)})  # Convert to list for DRF

        return attrs

    def save(self):
        password = self.validated_data['password']
        # self.user is set during validation
        self.user.set_password(password)
        self.user.save()
        return self.user


class PasswordChangeSerializer(serializers.Serializer):
    current_password = serializers.CharField(
        style={'input_type': 'password'}, write_only=True)
    new_password = serializers.CharField(min_length=8, max_length=64, style={
                                         'input_type': 'password'}, write_only=True)

    def validate_current_password(self, value):
        user = self.context['request'].user
        if not user.check_password(value):
            raise serializers.ValidationError(
                _('Current password is incorrect.'))
        return value

    def validate_new_password(self, value):
        # Validate the new password against Django's validators
        from django.contrib.auth.password_validation import validate_password
        user = self.context['request'].user
        try:
            validate_password(value, user)
        except serializers.ValidationError as e:  # Django's ValidationError
            raise serializers.ValidationError(
                list(e.messages))  # Convert to list for DRF
        return value

    def save(self):
        user = self.context['request'].user
        user.set_password(self.validated_data['new_password'])
        user.save()
        return user
# --- User Management Specific Serializers ---


class AuthUserTableSerializer(serializers.ModelSerializer):
    """
    Serializer for listing users in the auth_service user management table.
    """
    full_name = serializers.SerializerMethodField()
    last_active = serializers.DateTimeField(
        source='last_login', read_only=True, allow_null=True)
    # department_name is directly on the User model in auth_service

    class Meta:
        model = User
        fields = ['id', 'full_name', 'email', 'username', 'role',
                  'department_name', 'last_active', 'is_active']

    @extend_schema_field(serializers.CharField())
    def get_full_name(self, obj):
        return f"{obj.first_name} {obj.last_name}".strip()


class AuthUserModalSerializer(serializers.ModelSerializer):
    """
    Serializer for the add/edit user modals in auth_service.
    Accepts department_id and department_name for user assignment.
    Password is handled separately (e.g., set on create, or via a different change password flow).
    """
    date_added = serializers.DateTimeField(source='created_at', read_only=True)
    last_active = serializers.DateTimeField(
        source='last_login', read_only=True, allow_null=True)
    # department_id and department_name are regular fields now, not foreign keys to a local Department model.

    class Meta:
        model = User
        fields = [
            'id', 'first_name', 'last_name', 'username', 'email',
            'role',
            'department_id',      # Writable
            # Writable (admin provides this, or it's synced)
            'department_name',
            'phone_number',       # Added phone_number
            'is_active', 'is_staff', 'is_superuser',  # Added is_staff, is_superuser
            'date_added', 'last_active',
            'password'  # Include for creation, make optional for update
        ]
        extra_kwargs = {
            'id': {'read_only': True},
            # Not required on update unless changing
            'password': {'write_only': True, 'required': False, 'allow_null': True},
            'phone_number': {'required': False, 'allow_blank': True, 'allow_null': True},
            'department_id': {'required': False, 'allow_null': True},
            'department_name': {'required': False, 'allow_blank': True, 'allow_null': True},
            # Make these required for creation
            'first_name': {'required': True, 'allow_blank': False},
            'last_name': {'required': True, 'allow_blank': False},
            'username': {'required': True, 'allow_blank': False},
            'email': {'required': True, 'allow_blank': False},
            'role': {'required': True, 'allow_blank': False},
        }

    def create(self, validated_data):
        password = validated_data.pop('password', None)

        # department_id and department_name are now direct fields
        # No need to look up a Department object as it doesn't exist in auth_service
        user = User(**validated_data)

        if password:
            user.set_password(password)
        else:
            # For admin user creation, a password should ideally be provided by the admin in the modal
            # Or, generate a secure temporary one and have a flow for the user to set it.
            # Your monolith UserModalSerializer generated a random one.
            temp_password = ''.join(secrets.choice(
                string.ascii_letters + string.digits) for _ in range(12))
            user.set_password(temp_password)
            # print(f"DEBUG: Temp password for {user.username}: {temp_password}") # For dev only!
            # Consider how this is communicated or if a "force password reset" flag is set.

        user.save()
        return user

    def update(self, instance, validated_data):
        password = validated_data.pop('password', None)

        # department_id and department_name are updated like any other field
        for attr, value in validated_data.items():
            setattr(instance, attr, value)

        if password:  # Only update password if provided
            instance.set_password(password)

        instance.save()
        return instance

# --- Login Serializers (already good from previous response) ---


class LoginSerializer(serializers.Serializer):
    email = serializers.CharField(required=False, allow_blank=True)
    phone_number = serializers.CharField(required=False, allow_blank=True)
    password = serializers.CharField(
        style={'input_type': 'password'}, trim_whitespace=False)

    def validate(self, attrs):
        email_input = self.initial_data.get('email')
        phone_input = self.initial_data.get('phone_number')
        password = attrs.get('password')
        identifier = email_input or phone_input

        if not identifier:
            raise serializers.ValidationError(
                _("Must include either 'email' or 'phone_number'."), code='authorization')
        if not password:
            raise serializers.ValidationError(
                _("Password is required."), code='authorization')

        if identifier == phone_input and phone_input:  # Check if phone_input is not None/empty
            pattern = r'^\+\d{10,15}$'
            if not re.match(pattern, identifier):
                raise serializers.ValidationError(
                    _("Invalid phone number format. Use E.164 format e.g., +639123456789."), code='authorization')

        user = authenticate(request=self.context.get(
            'request'), username=identifier, password=password)

        if not user:
            raise serializers.ValidationError(
                _('Invalid credentials'), code='authorization')
        if not user.is_active:
            raise serializers.ValidationError(
                _('User account is disabled.'), code='authorization')
        attrs['user'] = user
        return attrs


class LogoutSerializer(serializers.Serializer):
    refresh = serializers.CharField(
        required=True, help_text="Refresh token to blacklist")


class LogoutResponseSerializer(serializers.Serializer):
    success = serializers.CharField(help_text="Logout status message")


class LogoutErrorSerializer(serializers.Serializer):
    error = serializers.CharField(help_text="Error message")


class LoginAttemptSerializer(serializers.ModelSerializer):
    username = serializers.CharField(
        source='user.username', read_only=True, allow_null=True)

    class Meta:
        model = LoginAttempt
        fields = ['id', 'username', 'username_input',
                  'ip_address', 'user_agent', 'success', 'timestamp']

# --- Password Reset Serializers


class PasswordResetRequestSerializer(serializers.Serializer):
    email = serializers.EmailField(required=True)

    def validate_email(self, value):
        try:
            User.objects.get(email__iexact=value)
        except User.DoesNotExist:
            pass
        return value

    def save(self):
        email = self.validated_data['email']
        try:
            user = User.objects.get(email__iexact=email)
            uid = urlsafe_base64_encode(force_bytes(user.pk))
            token = default_token_generator.make_token(user)
            reset_url = f"{settings.FRONTEND_URL}/reset-password/{uid}/{token}/"
            subject = "Password Reset Request"
            context = {'user': user, 'username': user.get_full_name(
            ) or user.username, 'reset_url': reset_url, 'site_name': "MAP Active Budgeting Software"}
            html_message = render_to_string(
                'email/password_reset_email.html', context)
            plain_message = render_to_string(
                'email/password_reset_email.txt', context)
            send_mail(subject, plain_message, settings.DEFAULT_FROM_EMAIL, [
                      user.email], fail_silently=False, html_message=html_message)
            return user
        except User.DoesNotExist:
            return None


class PasswordResetConfirmSerializer(serializers.Serializer):
    password = serializers.CharField(
        min_length=8, max_length=64, write_only=True, style={'input_type': 'password'})
    token = serializers.CharField(write_only=True)
    uid = serializers.CharField(write_only=True)

    def validate(self, attrs):
        token, uid_b64 = attrs.get('token'), attrs.get('uid')
        password = attrs.get('password')
        try:
            uid = force_str(urlsafe_base64_decode(uid_b64))
            self.user = User.objects.get(pk=uid)
        except:
            raise serializers.ValidationError(
                {'uid': _('Invalid user ID or link.')})
        if not default_token_generator.check_token(self.user, token):
            raise serializers.ValidationError(
                {'token': _('Invalid or expired token.')})
        from django.contrib.auth.password_validation import validate_password
        try:
            validate_password(password, self.user)
        except Exception as e:
            raise serializers.ValidationError(
                {'password': list(e.messages) if hasattr(e, 'messages') else [str(e)]})
        return attrs

    def save(self):
        self.user.set_password(self.validated_data['password'])
        self.user.save()
        return self.user


class PasswordChangeSerializer(serializers.Serializer):
    current_password = serializers.CharField(
        style={'input_type': 'password'}, write_only=True)
    new_password = serializers.CharField(min_length=8, max_length=64, style={
                                         'input_type': 'password'}, write_only=True)

    def validate_current_password(self, value):
        if not self.context['request'].user.check_password(value):
            raise serializers.ValidationError(
                _('Current password is incorrect.'))
        return value

    def validate_new_password(self, value):
        from django.contrib.auth.password_validation import validate_password
        try:
            validate_password(value, self.context['request'].user)
        except Exception as e:
            raise serializers.ValidationError(
                list(e.messages) if hasattr(e, 'messages') else [str(e)])
        return value

    def save(self):
        user = self.context['request'].user
        user.set_password(self.validated_data['new_password'])
        user.save()
        return user
