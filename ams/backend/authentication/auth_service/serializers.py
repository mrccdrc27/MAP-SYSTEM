from rest_framework import serializers
from .models import *
from django.contrib.auth import get_user_model

User = get_user_model()

class RegisterSerializer(serializers.ModelSerializer):
    class Meta:
        model = User
        fields = (
            'id', 'email', 'password', 'first_name', 'middle_name', 
            'last_name', 'role', 'contact_number', 'image',
        )
        extra_kwargs = {
            'password': {'write_only': True},
            'middle_name': {'required': False, 'allow_blank': True},
            # 'image': {'required': False, 'allow_null': True},
        }
    
    def create(self, validated_data):
        role = validated_data.get('role', 'operator')
        if role == 'admin':
            return User.objects.create_superuser(**validated_data)
        return User.objects.create_user(**validated_data)

class UserSerializer(serializers.ModelSerializer):
    class Meta:
        model = CustomUser
        fields = ('id', 'email')

class UserFullNameSerializer(serializers.ModelSerializer):
    full_name = serializers.SerializerMethodField()

    class Meta:
        model = CustomUser
        fields = ('id', 'full_name')

    def get_full_name(self, obj):
            return ' '.join(part for part in [obj.first_name, obj.middle_name, obj.last_name] if part)
