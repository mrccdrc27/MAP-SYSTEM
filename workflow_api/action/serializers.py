from .models import *
from rest_framework import serializers

class ActionSerializer(serializers.ModelSerializer):
    class Meta:
        model = Actions
        fields = (
            "action_id",
            "name",
            "description"
        )

class ActionRegister(serializers.ModelSerializer):
    class Meta:
        model = Actions
        fields = (
            "name",
            "description"
        )

    def create(self, validated_data):
        return Actions.objects.create(**validated_data)