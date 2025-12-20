from rest_framework import serializers
from .models import UserSystemRole
from users.models import User
from roles.models import Role
from systems.models import System
from django.utils.crypto import get_random_string
from django.conf import settings
from django.db import IntegrityError
from django.core.mail import send_mail
import re


def validate_phone_number_format(phone_number):
    """
    Validate phone number in E.164 format.
    E.164 format: +{country_code}{number} where country code is 1-3 digits and number is 10-14 digits.
    Returns (is_valid, error_message)
    """
    if not phone_number or not phone_number.strip():
        return True, None  # Phone is optional
    
    phone = phone_number.strip()
    
    # E.164 format pattern: +1-15 digits total
    e164_pattern = r'^\+\d{1,3}\d{10,14}$'
    
    if not re.match(e164_pattern, phone):
        return False, "Phone number must be in E.164 format (e.g., +15551234567). Include country code and 10-15 total digits."
    
    return True, None


def send_invitation_email(user, temp_password, system_name, role_name):
    """Send invitation email with temporary credentials to new user via Django mail."""
    try:
        subject = f'Invitation to {system_name}'
        message = (
            f"Hello {user.first_name},\n\n"
            f"You have been invited to join the {system_name} system with the role of {role_name}.\n\n"
            f"Your temporary password is: {temp_password}\n\n"
            "Please log in and change your password immediately."
        )
        
        send_mail(
            subject,
            message,
            settings.DEFAULT_FROM_EMAIL,
            [user.email],
            fail_silently=False
        )
        return True
    except Exception as e:
        # Log the error in production
        print(f"Failed to send invitation email to {user.email}: {str(e)}")
        return False


def send_system_addition_email(user, system_name, role_name):
    """Send notification email to existing user being added to a new system via Django mail."""
    try:
        subject = f'Access Granted to {system_name}'
        message = (
            f"Hello {user.first_name},\n\n"
            f"You have been granted access to the {system_name} system with the role of {role_name}.\n\n"
            "You can now access this system from your dashboard."
        )
        
        send_mail(
            subject,
            message,
            settings.DEFAULT_FROM_EMAIL,
            [user.email],
            fail_silently=False
        )
        return True
    except Exception as e:
        # Log the error in production
        print(f"Failed to send system addition email to {user.email}: {str(e)}")
        return False


# New: serializer to represent full user details safely (read-only)
class UserDetailSerializer(serializers.ModelSerializer):
    class Meta:
        model = User
        # include non-sensitive fields only
        fields = [
            'id',
            'email',
            'username',
            'first_name',
            'last_name',
            'is_active',
            'is_staff',
            'date_joined',
        ]
        read_only_fields = fields


class UserSystemRoleSerializer(serializers.ModelSerializer):
    """Serializer for listing User-System-Role assignments with display fields."""
    # Flattened user fields (top-level) instead of nested `user` object
    id = serializers.IntegerField(source='user.id', read_only=True)
    email = serializers.EmailField(source='user.email', read_only=True)
    username = serializers.CharField(source='user.username', read_only=True)
    first_name = serializers.CharField(source='user.first_name', read_only=True)
    last_name = serializers.CharField(source='user.last_name', read_only=True)
    is_active = serializers.BooleanField(source='user.is_active', read_only=True)
    is_staff = serializers.BooleanField(source='user.is_staff', read_only=True)
    date_joined = serializers.DateTimeField(source='user.date_joined', read_only=True)

    role = serializers.CharField(source='role.name', read_only=True)
    system_slug = serializers.SlugField(source='system.slug', read_only=True)

    class Meta:
        model = UserSystemRole
        fields = [
            'id',
            'email',
            'username',
            'first_name',
            'last_name',
            'is_active',
            'is_staff',
            'date_joined',
            'system_slug',
            'role',
            'assigned_at',
            'last_logged_on',
            'settings',
        ]
        read_only_fields = ['id', 'assigned_at', 'last_logged_on', 'settings']

    def validate(self, data):
        """
        Validate that the selected role belongs to the specified system.
        """
        role = data.get('role')
        system = data.get('system')

        if role and system:
            if role.system != system:
                raise serializers.ValidationError({
                    'role': f"The selected role '{role.name}' does not belong to the system '{system.name}'. "
                           f"This role belongs to '{role.system.name}' system."
                })

        return data


class SystemRoleListSerializer(serializers.ModelSerializer):
    """Serializer for listing roles that belong to a specific system."""
    
    class Meta:
        model = Role
        fields = ['id', 'name', 'description', 'is_custom', 'created_at']
        read_only_fields = ['id', 'created_at']


class CreateUserSystemRoleSerializer(serializers.ModelSerializer):
    """
    Enhanced serializer for creating User-System-Role assignments.
    Includes dynamic role filtering based on selected system.
    """
    available_roles = SystemRoleListSerializer(many=True, read_only=True)

    class Meta:
        model = UserSystemRole
        fields = [
            'id',
            'user',
            'system',
            'role',
            'available_roles',
            'assigned_at',
        ]
        read_only_fields = ['id', 'assigned_at', 'available_roles']

    def validate(self, data):
        """
        Validate that the selected role belongs to the specified system.
        """
        role = data.get('role')
        system = data.get('system')

        if role and system:
            if role.system != system:
                raise serializers.ValidationError({
                    'role': f"The selected role '{role.name}' does not belong to the system '{system.name}'. "
                           f"This role belongs to '{role.system.name}' system."
                })

        return data

    def to_representation(self, instance):
        """
        Include available roles for the system when returning the data.
        """
        representation = super().to_representation(instance)
        if instance and instance.system:
            available_roles = Role.objects.filter(system=instance.system)
            representation['available_roles'] = SystemRoleListSerializer(available_roles, many=True).data
        return representation


class AdminInviteUserSerializer(serializers.Serializer):
    """
    Serializer for inviting a user:
    - creates user if not exists,
    - assigns role + system,
    - returns temporary password if created.
    """
    email = serializers.EmailField()
    first_name = serializers.CharField(required=False, allow_blank=True)
    middle_name = serializers.CharField(required=False, allow_blank=True)
    last_name = serializers.CharField(required=False, allow_blank=True)
    suffix = serializers.ChoiceField(
        choices=[
            ('', 'None'),
            ('Jr.', 'Jr.'),
            ('Sr.', 'Sr.'),
            ('II', 'II'),
            ('III', 'III'),
            ('IV', 'IV'),
            ('V', 'V'),
        ],
        required=False,
        allow_null=True,
        allow_blank=True
    )
    phone_number = serializers.CharField(
        max_length=20,
        required=False,
        allow_blank=True,
        allow_null=True
    )
    department = serializers.ChoiceField(
        choices=[
            ('IT Department', 'IT Department'),
            ('Asset Department', 'Asset Department'),
            ('Budget Department', 'Budget Department'),
        ],
        required=False,
        allow_null=True,
        allow_blank=True
    )
    role_id = serializers.ChoiceField(choices=[])

    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        request = self.context.get('request')
        if (request and not request.user.is_superuser):
            from system_roles.models import UserSystemRole
            systems = UserSystemRole.objects.filter(user=request.user).values_list('system_id', flat=True)
            role_choices = Role.objects.filter(system_id__in=systems).values_list('id', 'name', 'system__name')
        else:
            role_choices = Role.objects.select_related('system').values_list('id', 'name', 'system__name')

        self.fields['role_id'].choices = [
            (str(role_id), f"{role_name} ({system_name})") 
            for role_id, role_name, system_name in role_choices
        ]

    def validate_role_id(self, value):
        try:
            role = Role.objects.select_related('system').get(id=value)
        except Role.DoesNotExist:
            raise serializers.ValidationError("Role does not exist.")
        return role

    def validate_email(self, value):
        """
        Validate email format and normalize it.
        Note: We don't check if email exists here because users can be invited
        to multiple systems with different roles. Duplicate check per system
        happens in the create() method.
        """
        return value.lower().strip()

    def validate_phone_number(self, value):
        """Validate phone number format (E.164) and uniqueness"""
        if not value or not value.strip():
            return None  # Phone is optional
        
        phone = value.strip()
        
        # Validate E.164 format
        is_valid, error_msg = validate_phone_number_format(phone)
        if not is_valid:
            raise serializers.ValidationError(error_msg)
        
        # Check uniqueness
        if User.objects.filter(phone_number=phone).exists():
            raise serializers.ValidationError(
                "This phone number is already registered in the system. Please use a different phone number."
            )
        
        return phone

    def create(self, validated_data):
        role = validated_data.pop("role_id")
        email = validated_data.get("email").lower().strip()

        # Check if user already exists
        existing_user = User.objects.filter(email=email).first()
        
        if existing_user:
            # User already exists, check if they already have a role in this system
            existing_role = UserSystemRole.objects.filter(
                user=existing_user,
                system=role.system
            ).first()
            
            if existing_role:
                # User already has a role in this system
                raise serializers.ValidationError(
                    f"User {email} already has the role '{existing_role.role.name}' in the {role.system.name} system. "
                    f"To change their role, please update their existing assignment instead of creating a new invitation."
                )
            
            # User exists but doesn't have a role in this system - just assign the role
            temp_password = None
            user = existing_user
            
            # Send notification email to existing user about new system access
            send_system_addition_email(
                user=user,
                system_name=role.system.name,
                role_name=role.name
            )
        else:
            # Create new user
            temp_password = 'password123'
            
            # Generate unique username from email with increment if needed
            base_username = email.split('@')[0].replace('.', '').replace('-', '')[:20]
            username = base_username
            counter = 1
            max_attempts = 100
            
            # Ensure unique username
            while User.objects.filter(username=username).exists() and counter < max_attempts:
                username = f"{base_username}{counter}"
                counter += 1
            
            if counter >= max_attempts:
                raise serializers.ValidationError(
                    "Unable to generate a unique username. Please contact support."
                )
            
            try:
                user = User.objects.create_user(
                    email=email,
                    password=temp_password,
                    username=username,
                    first_name=validated_data.get('first_name', '').strip(),
                    middle_name=validated_data.get('middle_name', '').strip(),
                    last_name=validated_data.get('last_name', '').strip(),
                    suffix=validated_data.get('suffix', None) or '',
                    phone_number=validated_data.get('phone_number') or None,  # Already validated and normalized
                    department=validated_data.get('department', None) or '',
                    is_active=True,
                    status='Approved',  # Set status to Approved
                )
                
                # Send invitation email with temporary password
                send_invitation_email(
                    user=user,
                    temp_password=temp_password,
                    system_name=role.system.name,
                    role_name=role.name
                )
            except IntegrityError as e:
                error_msg = str(e).lower()
                if 'email' in error_msg:
                    raise serializers.ValidationError(
                        "This email is already registered in the system."
                    )
                elif 'phone' in error_msg:
                    raise serializers.ValidationError(
                        "This phone number is already registered in the system. Please use a different phone number."
                    )
                elif 'username' in error_msg:
                    raise serializers.ValidationError(
                        "Unable to create user due to username conflict. Please contact support."
                    )
                else:
                    raise serializers.ValidationError(
                        "Unable to create user due to a database constraint violation. Please try again."
                    )

        # Assign role and system (get_or_create to handle edge cases)
        usr_role, created = UserSystemRole.objects.get_or_create(
            user=user,
            system=role.system,
            defaults={'role': role}
        )
        
        # If role assignment already existed, update it to the new role
        if not created and usr_role.role != role:
            usr_role.role = role
            usr_role.save()

        return {
            "user": user,
            "temporary_password": temp_password,
            "assigned_role": usr_role,
        }


class SystemUsersSerializer(serializers.ModelSerializer):
    """Serializer for listing users of a specific system with their roles."""
    id = serializers.IntegerField(source='user.id', read_only=True)
    email = serializers.EmailField(source='user.email', read_only=True)
    first_name = serializers.CharField(source='user.first_name', read_only=True)
    last_name = serializers.CharField(source='user.last_name', read_only=True)
    role = serializers.CharField(source='role.name', read_only=True)
    system_id = serializers.IntegerField(source='system.id', read_only=True)
    system_name = serializers.CharField(source='system.name', read_only=True)
    system_slug = serializers.SlugField(source='system.slug', read_only=True)

    class Meta:
        model = UserSystemRole
        fields = [
            'id',
            'id',
            'email',
            'first_name',
            'last_name',
            'role',
            'system_id',
            'system_name',
            'system_slug',
            'assigned_at',
        ]
        read_only_fields = ['id', 'assigned_at']