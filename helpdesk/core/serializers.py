from rest_framework import serializers
from .models import Employee, Ticket, TicketAttachment, KnowledgeArticle, KnowledgeArticleVersion
from .models import ActivityLog
from rest_framework_simplejwt.serializers import TokenObtainPairSerializer
from rest_framework_simplejwt.views import TokenObtainPairView
from rest_framework_simplejwt.exceptions import AuthenticationFailed

class EmployeeSerializer(serializers.ModelSerializer):
    recent_logs = serializers.SerializerMethodField()
    class Meta:
        model = Employee
        fields = [
            'id',  # <-- Add this line
            'last_name', 'first_name', 'middle_name', 'suffix',
            'company_id', 'department', 'email', 'password', 
            'image', 'role', 'status', 'date_created', 'recent_logs'
        ]
        extra_kwargs = {
            'password': {'write_only': True},
            'image': {'required': False, 'allow_null': True}
        }

    def create(self, validated_data):
        password = validated_data.pop('password')
        employee = Employee(**validated_data)
        employee.set_password(password)
        employee.save()
        return employee

    def get_recent_logs(self, obj):
        # Return up to 4 recent logs for the employee
        logs = getattr(obj, 'logs', None)
        # If there are no explicit audit logs, provide a synthetic 'created' log
        # based on the employee's date_created so the frontend can display at
        # least one activity for the user.
        if logs is None:
            # No related manager found (model relationship not set up); fall back
            # to returning a single created event using date_created if present.
            if getattr(obj, 'date_created', None):
                return [
                    {
                        'action': 'created',
                        'details': 'Account created',
                        'performed_by': None,
                        'timestamp': obj.date_created,
                    }
                ]
            return []

        recent_qs = logs.all()[:4]
        if not recent_qs or recent_qs.count() == 0:
            # No actual logs; synthesize a created event from date_created
            if getattr(obj, 'date_created', None):
                return [
                    {
                        'action': 'created',
                        'details': 'Account created',
                        'performed_by': None,
                        'timestamp': obj.date_created,
                    }
                ]
            return []

        return [
            {
                'action': l.action,
                'details': l.details,
                'performed_by': l.performed_by.company_id if l.performed_by else None,
                'timestamp': l.timestamp,
            }
            for l in recent_qs
        ]

class CustomTokenObtainPairSerializer(TokenObtainPairSerializer):
    @classmethod
    def get_token(cls, user):
        token = super().get_token(user)
        token['email'] = user.email
        token['role'] = user.role
        token['first_name'] = user.first_name
        token['last_name'] = user.last_name
        
        return token

class MyTokenObtainPairSerializer(TokenObtainPairSerializer):
    def validate(self, attrs):
        try:
            data = super().validate(attrs)
        except AuthenticationFailed:
            raise serializers.ValidationError("Invalid credentials.")

        user = self.user

        if user.is_superuser or user.role in ["System Admin", "Ticket Coordinator"]:
            raise serializers.ValidationError("Invalid credentials.")

        if hasattr(user, 'status') and user.status != 'Approved':
            raise serializers.ValidationError("Account is pending for approval.")

        data['email'] = user.email
        data['role'] = user.role if hasattr(user, 'role') else 'Unknown'
        data['first_name'] = user.first_name
        data['middle_name'] = user.middle_name if hasattr(user, 'middle_name') else ''
        data['last_name'] = user.last_name
        data['suffix'] = user.suffix if hasattr(user, 'suffix') else ''
        data['company_id'] = user.company_id if hasattr(user, 'company_id') else ''
        data['department'] = user.department if hasattr(user, 'department') else ''
        data['dateCreated'] = user.date_created

        return data

class AdminTokenObtainPairSerializer(TokenObtainPairSerializer):
    def validate(self, attrs):
        data = super().validate(attrs)
        user = self.user

        if not user.is_superuser and user.role not in ["System Admin", "Ticket Coordinator"]:
            raise serializers.ValidationError("Invalid credentials.")

        # Add these to the response body (optional)
        data['email'] = user.email
        data['role'] = getattr(user, 'role', 'Unknown')
        data['first_name'] = user.first_name
        data['middle_name'] = getattr(user, 'middle_name', '')
        data['last_name'] = user.last_name
        data['suffix'] = getattr(user, 'suffix', '')
        data['company_id'] = getattr(user, 'company_id', '')
        data['department'] = getattr(user, 'department', '')

        return data

    @classmethod
    def get_token(cls, user):
        token = super().get_token(user)

        # ✅ Add custom claims to the JWT
        token['email'] = user.email
        token['role'] = user.role
        token['first_name'] = user.first_name
        token['last_name'] = user.last_name

        return token

class TicketAttachmentSerializer(serializers.ModelSerializer):
    file = serializers.SerializerMethodField()
    
    class Meta:
        model = TicketAttachment
        fields = ['id', 'file', 'file_name', 'file_type', 'file_size', 'upload_date']
        read_only_fields = ['id', 'upload_date', 'file_size']
    
    def get_file(self, obj):
        """Return the protected API URL for the file"""
        if obj.file:
            # Return API endpoint URL that requires authentication
            # Format: /api/media/ticket_attachments/filename.ext
            # Get the request from context to build absolute URL
            request = self.context.get('request')
            if request:
                return request.build_absolute_uri(f'/api/media/{obj.file.name}')
            # Fallback to relative URL
            return f'/api/media/{obj.file.name}'
        return None

class EmployeeInfoSerializer(serializers.ModelSerializer):
    class Meta:
        model = Employee
        fields = ['first_name', 'last_name', 'email', 'company_id', 'department', 'image']

class TicketSerializer(serializers.ModelSerializer):
    attachments = TicketAttachmentSerializer(many=True, read_only=True)
    scheduled_date = serializers.DateField(required=False, allow_null=True)
    assigned_to = serializers.StringRelatedField(read_only=True)
    employee = EmployeeInfoSerializer(read_only=True)
    # Allow arbitrary JSON from the frontend
    dynamic_data = serializers.JSONField(required=False, allow_null=True)
    asset_name = serializers.CharField(required=False, allow_blank=True, allow_null=True)
    serial_number = serializers.CharField(required=False, allow_blank=True, allow_null=True)
    location = serializers.CharField(required=False, allow_blank=True, allow_null=True)
    expected_return_date = serializers.DateField(required=False, allow_null=True)
    issue_type = serializers.CharField(required=False, allow_blank=True, allow_null=True)
    other_issue = serializers.CharField(required=False, allow_blank=True, allow_null=True)
    performance_start_date = serializers.DateField(required=False, allow_null=True)
    performance_end_date = serializers.DateField(required=False, allow_null=True)
    approved_by = serializers.CharField(required=False, allow_blank=True, allow_null=True)
    rejected_by = serializers.CharField(required=False, allow_blank=True, allow_null=True)
    cost_items = serializers.JSONField(required=False, allow_null=True)
    requested_budget = serializers.DecimalField(required=False, allow_null=True, max_digits=12, decimal_places=2)

    class Meta:
        model = Ticket
        fields = [
            'id', 'ticket_number', 'subject', 'category', 'sub_category',
            'description', 'scheduled_date', 'priority', 'department',
                'asset_name', 'serial_number', 'location', 'expected_return_date',
                'issue_type', 'other_issue', 'performance_start_date', 'performance_end_date',
                'approved_by', 'cost_items', 'requested_budget', 'fiscal_year', 'department_input',
                'dynamic_data', 'status', 'submit_date', 'update_date', 'assigned_to', 'attachments',
        'employee', 'rejected_by', 'date_completed', 'csat_rating', 'feedback'
        ]
        read_only_fields = [
            'id', 'ticket_number', 'submit_date', 'update_date',
            'response_time', 'resolution_time', 'time_closed', 'date_completed', 'assigned_to',
            'employee'
        ]

    def create(self, validated_data):
        user = self.context['request'].user
        # Pop dynamic_data if present and pass to model
        dynamic = validated_data.pop('dynamic_data', None)

        # Map commonly used dynamic fields into explicit model fields if present
        if dynamic and isinstance(dynamic, dict):
            for key, field in [
                ('assetName', 'asset_name'),
                ('serialNumber', 'serial_number'),
                ('location', 'location'),
                ('expectedReturnDate', 'expected_return_date'),
                ('issueType', 'issue_type'),
                ('otherIssue', 'other_issue'),
                ('performanceStartDate', 'performance_start_date'),
                ('performanceEndDate', 'performance_end_date'),
                ('approvedBy', 'approved_by'),
                ('costItems', 'cost_items'),
                ('requestedBudget', 'requested_budget')
            ]:
                if key in dynamic and dynamic[key] is not None:
                    validated_data[field] = dynamic[key]

            # Map schedule fields from dynamic_data into the explicit scheduled_date field
            try:
                if isinstance(dynamic, dict):
                    # direct camelCase key
                    if 'scheduledDate' in dynamic and dynamic.get('scheduledDate'):
                        validated_data['scheduled_date'] = dynamic.get('scheduledDate')
                    # nested scheduleRequest object { date: 'YYYY-MM-DD', ... }
                    elif 'scheduleRequest' in dynamic and isinstance(dynamic.get('scheduleRequest'), dict):
                        sched = dynamic.get('scheduleRequest', {})
                        if sched.get('date'):
                            validated_data['scheduled_date'] = sched.get('date')
                    # snake_case variants
                    elif 'scheduled_date' in dynamic and dynamic.get('scheduled_date'):
                        validated_data['scheduled_date'] = dynamic.get('scheduled_date')
                    elif 'schedule_request' in dynamic and isinstance(dynamic.get('schedule_request'), dict):
                        sched = dynamic.get('schedule_request', {})
                        if sched.get('date'):
                            validated_data['scheduled_date'] = sched.get('date')
            except Exception:
                pass

        # Get employee from validated_data instead of assuming user
        employee = validated_data.pop('employee', None)
        ticket = Ticket.objects.create(employee=employee, dynamic_data=dynamic, **validated_data)
        
        # Set budget-specific defaults when category is "New Budget Proposal"
        if validated_data.get('category') == 'New Budget Proposal':
            if ticket.fiscal_year is None:
                ticket.fiscal_year = 2
            if ticket.department_input is None:
                ticket.department_input = 2
            ticket.save(update_fields=['fiscal_year', 'department_input'])
        
        return ticket


class ActivityLogSerializer(serializers.ModelSerializer):
    actor = serializers.SerializerMethodField()
    user = serializers.SerializerMethodField()

    class Meta:
        model = ActivityLog
        fields = ['id', 'user', 'action_type', 'message', 'ticket', 'metadata', 'timestamp', 'actor']

    def get_actor(self, obj):
        if obj.actor:
            return getattr(obj.actor, 'company_id', None) or getattr(obj.actor, 'id', None)
        return None

    def get_user(self, obj):
        if obj.user:
            return getattr(obj.user, 'company_id', None) or getattr(obj.user, 'id', None)
        return None
    
def ticket_to_dict(ticket):
    # Gather all attachments for this ticket
    attachments = [
        {
            "id": att.id,
            "file": att.file.url if att.file else None,
            "file_name": att.file_name,
            "file_type": att.file_type,
            "file_size": att.file_size,
            "upload_date": att.upload_date.isoformat() if att.upload_date else None,
        }
        for att in TicketAttachment.objects.filter(ticket=ticket)
    ]

    # Gather customer (employee) info
    employee = ticket.employee
    customer = {
        "id": employee.id,
        "first_name": employee.first_name,
        "last_name": employee.last_name,
        "middle_name": employee.middle_name,
        "suffix": employee.suffix,
        "email": employee.email,
        "company_id": employee.company_id,
        "department": employee.department,
        "image": employee.image.url if employee.image else None,
    } if employee else None

    data = {
        "id": ticket.id,
        "ticket_id": ticket.ticket_number,
        "subject": ticket.subject,
        "category": ticket.category,
        "subcategory": ticket.sub_category,
        "description": ticket.description,
        "scheduled_date": ticket.scheduled_date.isoformat() if ticket.scheduled_date else None,
        "priority": ticket.priority,
        "department": ticket.department,
        "status": ticket.status,
        "submit_date": ticket.submit_date.isoformat() if ticket.submit_date else None,
        "update_date": ticket.update_date.isoformat() if ticket.update_date else None,
        "assigned_to": str(ticket.assigned_to) if ticket.assigned_to else None,
        "customer": customer,
        "attachments": attachments,
        "response_time": str(ticket.response_time) if hasattr(ticket, "response_time") and ticket.response_time else None,
        "resolution_time": str(ticket.resolution_time) if hasattr(ticket, "resolution_time") and ticket.resolution_time else None,
        "time_closed": ticket.time_closed.isoformat() if hasattr(ticket, "time_closed") and ticket.time_closed else None,
        "rejection_reason": ticket.rejection_reason if hasattr(ticket, "rejection_reason") else None,
        # Budget-specific metadata
        "fiscal_year": ticket.fiscal_year,
        "department_input": ticket.department_input,
    }

    print("Serialized ticket data:", data)  # <-- Debug print statement

    return data


class KnowledgeArticleSerializer(serializers.ModelSerializer):
    created_by_name = serializers.SerializerMethodField()
    versions = serializers.SerializerMethodField()

    class Meta:
        model = KnowledgeArticle
        fields = [
            'id', 'subject', 'category', 'visibility', 'description',
            'is_archived', 'created_by', 'created_by_name', 'created_at', 'updated_at', 'versions'
        ]
        read_only_fields = ['id', 'created_by', 'created_at', 'updated_at']

    def get_created_by_name(self, obj):
        # If the article has a local Employee linked, return their full name
        if obj.created_by:
            return f"{obj.created_by.first_name} {obj.created_by.last_name}"

        # If there is no local user (created_by is None) the article may have
        # been created by an external user authenticated via the external
        # auth service (represented by ExternalUser). The serializer has
        # access to the request via context; check the request user and if
        # their role indicates an admin, return a friendly "System Admin"
        # display name so the frontend shows the expected owner.
        request = self.context.get('request') if hasattr(self, 'context') else None
        if request is not None:
            try:
                user = getattr(request, 'user', None)
                role = getattr(user, 'role', None)
                if role and isinstance(role, str):
                    rl = role.strip().lower()
                    if 'system admin' in rl or rl == 'admin' or rl == 'system_admin':
                        return 'System Admin'
            except Exception:
                # If anything goes wrong while inspecting the request user,
                # fall through to the default behavior below.
                pass

        # Default: no creator information available
        return None

    def get_versions(self, obj):
        # Return a simple serialized list of versions for the frontend.
        vers = getattr(obj, 'versions', None)
        if vers is None:
            return []
        # Provide a compact representation
        return [
            {
                'id': v.id,
                'number': v.version_number,
                'author': getattr(v.editor, 'company_id', None) or getattr(v.editor, 'id', None),
                'date': v.modified_at.isoformat() if v.modified_at else None,
                'changes': v.changes,
                'metadata': v.metadata,
            }
            for v in vers.all()
        ]
