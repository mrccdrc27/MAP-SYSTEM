from rest_framework import serializers
from .models import Ticket

class TicketSerializer(serializers.ModelSerializer):
    class Meta:
        model = Ticket
        fields = '__all__'

from rest_framework import serializers
from .models import Ticket


class AttachmentSerializer(serializers.Serializer):
    id = serializers.IntegerField()
    file = serializers.URLField()
    file_name = serializers.CharField()
    file_type = serializers.CharField()
    file_size = serializers.IntegerField()
    upload_date = serializers.DateTimeField()


class EmployeeSerializer(serializers.Serializer):
    first_name = serializers.CharField()
    last_name = serializers.CharField()
    email = serializers.EmailField()
    company_id = serializers.CharField()
    department = serializers.CharField()
    image = serializers.URLField()


class TicketSerializer2(serializers.ModelSerializer):
    attachments = AttachmentSerializer(many=True, required=False)
    employee = EmployeeSerializer(required=False)

    class Meta:
        model = Ticket
        fields = [
            "id",
            "ticket_id",
            "original_ticket_id",
            "source_service",
            "employee",
            "subject",
            "category",
            "subcategory",
            "description",
            "scheduled_date",
            "submit_date",
            "update_date",
            "assigned_to",
            "priority",
            "status",
            "department",
            "response_time",
            "resolution_time",
            "time_closed",
            "rejection_reason",
            "attachments",
            "is_task_allocated",
            "fetched_at",
            "created_at",
            "updated_at",
        ]
        read_only_fields = ["id", "created_at", "updated_at"]

    def create(self, validated_data):
        attachments_data = validated_data.pop("attachments", [])
        employee_data = validated_data.pop("employee", None)

        ticket = Ticket.objects.create(
            **validated_data,
            attachments=attachments_data,
            employee=employee_data
        )
        return ticket
