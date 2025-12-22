from .models import Roles
from rest_framework import serializers
from django.contrib.auth import authenticate

#display class?
class RoleSerializer(serializers.ModelSerializer):
    class Meta:
        model = Roles
        fields = ('__all__')
        read_only_fields = ('role_id', 'createdAt', 'updatedAt')

class PositionRegister(serializers.ModelSerializer):
    class Meta:
        model = Roles
        fields = (
            "id",
            "user_id",
            "name",
            "description"
        )
    
    # Validation logic

    def validate(self, attrs):
        name = attrs.get("name") 
        if len(name) < 4:
            raise serializers.ValidationError(
                "name must be greater than 8 characters"
            )
        return attrs
    
    # Create the model
    def create(self, validated_data):
        return Roles.objects.create(**validated_data)