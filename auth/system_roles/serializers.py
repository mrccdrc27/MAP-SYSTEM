from rest_framework import serializers
from .models import UserSystemRole
from users.models import User
from roles.models import Role
from systems.models import System
from django.utils.crypto import get_random_string
from django.core.mail import send_mail
from django.conf import settings


def send_invitation_email(user, temp_password, system_name, role_name):
    """Send invitation email with temporary credentials to new user."""
    subject = 'Welcome! Your Account has been Created'
    message = f'''
Hello {user.get_full_name() or user.email},

You have been invited to join the {system_name} system with the role of "{role_name}".

Your account has been created with the following details:

Email: {user.email}
Temporary Password: {temp_password}

For security reasons, please log in and change your password as soon as possible.

Login URL: Please contact your system administrator for the login URL.

If you have any questions or need assistance, please contact your system administrator.

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
        print(f"Failed to send invitation email to {user.email}: {str(e)}")
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
            'settings',
        ]
        read_only_fields = ['id', 'assigned_at', 'settings']

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

    def create(self, validated_data):
        role = validated_data.pop("role_id")
        email = validated_data.get("email")

        # Check if user already exists
        try:
            user = User.objects.get(email=email)
            created = False
            temp_password = None
        except User.DoesNotExist:
            # Create new user using the custom manager to ensure company_id is auto-generated
            temp_password = get_random_string(length=10)
            user = User.objects.create_user(
                email=email,
                password=temp_password,
                username=email.split('@')[0],
                first_name=validated_data.get('first_name', ''),
                middle_name=validated_data.get('middle_name', ''),
                last_name=validated_data.get('last_name', ''),
                suffix=validated_data.get('suffix', None),
                phone_number=validated_data.get('phone_number', None),
                department=validated_data.get('department', None),
                is_active=True,
            )
            created = True
            
            # Send invitation email with temporary password
            send_invitation_email(
                user=user,
                temp_password=temp_password,
                system_name=role.system.name,
                role_name=role.name
            )

        # Assign role and system
        usr_role, _ = UserSystemRole.objects.get_or_create(
            user=user,
            system=role.system,
            role=role
        )

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