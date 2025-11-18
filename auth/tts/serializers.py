from rest_framework import serializers
from users.models import User
from roles.models import Role
from system_roles.models import UserSystemRole
from systems.models import System


class RoleSerializer(serializers.ModelSerializer):
    class Meta:
        model = Role
        fields = ['id', 'name']


class TTSUserWithRoleSerializer(serializers.Serializer):
    """
    Serializer for displaying TTS users with their assigned roles.
    """
    user_id = serializers.IntegerField(source='user.id')
    first_name = serializers.CharField(source='user.first_name')
    last_name = serializers.CharField(source='user.last_name')
    email = serializers.EmailField(source='user.email')
    role_id = serializers.IntegerField(source='role.id')
    role_name = serializers.CharField(source='role.name')
    is_active = serializers.BooleanField(source='user.is_active')
    
    class Meta:
        fields = ['user_id', 'first_name', 'last_name', 'email', 'role_id', 'role_name', 'is_active']


class AssignAgentToRoleSerializer(serializers.ModelSerializer):
    """
    Serializer for assigning a TTS agent to a role.
    Used for form input in the browsable API with dropdowns.
    
    Filtering applied:
    - userID: Only active users from the TTS system
    - role: Only roles available in the TTS system
    """
    userID = serializers.PrimaryKeyRelatedField(
        queryset=User.objects.none(),
        source='user',
        help_text="Select an active TTS user to assign to the role"
    )
    role = serializers.PrimaryKeyRelatedField(
        queryset=Role.objects.none(),
        help_text="Select a TTS role from the dropdown"
    )
    
    class Meta:
        model = UserSystemRole
        fields = ['userID', 'role']
    
    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        
        # Filter users to only active users in TTS system
        try:
            tts_system = System.objects.get(slug='tts')
            tts_users = User.objects.filter(
                is_active=True,
                system_roles__system=tts_system
            ).distinct()
            self.fields['userID'].queryset = tts_users
        except System.DoesNotExist:
            self.fields['userID'].queryset = User.objects.filter(is_active=True)
        
        # Filter roles to only those in TTS system
        try:
            tts_system = System.objects.get(slug='tts')
            tts_roles = Role.objects.filter(
                user_assignments__system=tts_system
            ).distinct().order_by('name')
            self.fields['role'].queryset = tts_roles
        except System.DoesNotExist:
            self.fields['role'].queryset = Role.objects.all().order_by('name')

