from rest_framework import serializers
from .models import NotificationTemplate, NotificationLog, NotificationRequest


class NotificationRequestSerializer(serializers.Serializer):
    """
    Serializer for incoming notification requests with individual fields for HTML form compatibility
    """
    user_email = serializers.EmailField()
    user_name = serializers.CharField(max_length=255, required=False, allow_blank=True)
    notification_type = serializers.CharField(max_length=50)
    ip_address = serializers.IPAddressField(required=False, allow_null=True)
    user_agent = serializers.CharField(required=False, allow_blank=True)
    
    # Common context fields for different notification types
    failed_attempts = serializers.IntegerField(required=False, allow_null=True)
    reset_token = serializers.CharField(max_length=255, required=False, allow_blank=True)
    reset_url = serializers.URLField(required=False, allow_blank=True)
    otp_code = serializers.CharField(max_length=6, required=False, allow_blank=True)
    login_timestamp = serializers.DateTimeField(required=False, allow_null=True)
    previous_email = serializers.EmailField(required=False, allow_blank=True)
    previous_username = serializers.CharField(max_length=150, required=False, allow_blank=True)
    device_info = serializers.CharField(max_length=500, required=False, allow_blank=True)
    location = serializers.CharField(max_length=200, required=False, allow_blank=True)
    additional_message = serializers.CharField(max_length=1000, required=False, allow_blank=True)

    def validate_notification_type(self, value):
        """Validate that the notification type exists in templates"""
        if not NotificationTemplate.objects.filter(notification_type=value, is_active=True).exists():
            raise serializers.ValidationError(f"No active template found for notification type: {value}")
        return value

    def validate_failed_attempts(self, value):
        """Validate failed attempts is a positive number"""
        if value is not None and value < 0:
            raise serializers.ValidationError("Failed attempts must be a positive number")
        return value

    def validate_otp_code(self, value):
        """Validate OTP code format"""
        if value and (len(value) != 6 or not value.isdigit()):
            raise serializers.ValidationError("OTP code must be exactly 6 digits")
        return value

    def to_internal_value(self, data):
        """Convert individual fields back to context_data for internal processing"""
        validated_data = super().to_internal_value(data)
        
        # Extract context fields and build context_data
        context_fields = [
            'failed_attempts', 'reset_token', 'reset_url', 'otp_code', 
            'login_timestamp', 'previous_email', 'previous_username',
            'device_info', 'location', 'additional_message'
        ]
        
        context_data = {}
        for field in context_fields:
            if field in validated_data and validated_data[field] is not None:
                context_data[field] = validated_data.pop(field)
        
        validated_data['context_data'] = context_data
        return validated_data


class NotificationResponseSerializer(serializers.Serializer):
    """
    Response serializer for notification requests
    """
    success = serializers.BooleanField()
    message = serializers.CharField()
    notification_id = serializers.UUIDField(required=False)


class NotificationCreateSerializer(serializers.Serializer):
    """
    Serializer for creating notifications through HTML forms - similar to auth patterns
    """
    user_email = serializers.EmailField()
    user_name = serializers.CharField(max_length=255, required=False, allow_blank=True)
    notification_type = serializers.ChoiceField(choices=[
        ('account_locked', 'Account Locked'),
        ('account_unlocked', 'Account Unlocked'),
        ('failed_login_attempt', 'Failed Login Attempt'),
        ('password_reset', 'Password Reset'),
        ('login_success', 'Successful Login'),
        ('otp_generated', 'OTP Generated'),
        ('profile_updated', 'Profile Updated'),
        ('account_created', 'Account Created'),
    ])
    ip_address = serializers.IPAddressField(required=False, allow_null=True)
    user_agent = serializers.CharField(max_length=500, required=False, allow_blank=True)
    
    # Context fields as individual form fields
    failed_attempts = serializers.IntegerField(required=False, allow_null=True, min_value=0)
    reset_token = serializers.CharField(max_length=255, required=False, allow_blank=True)
    reset_url = serializers.URLField(required=False, allow_blank=True)
    otp_code = serializers.CharField(max_length=6, required=False, allow_blank=True)
    login_timestamp = serializers.DateTimeField(required=False, allow_null=True)
    previous_email = serializers.EmailField(required=False, allow_blank=True)
    previous_username = serializers.CharField(max_length=150, required=False, allow_blank=True)
    device_info = serializers.CharField(max_length=500, required=False, allow_blank=True)
    location = serializers.CharField(max_length=200, required=False, allow_blank=True)
    additional_message = serializers.CharField(
        max_length=1000, 
        required=False, 
        allow_blank=True,
        style={'base_template': 'textarea.html'},
        help_text="Additional message or context for the notification"
    )

    def validate_otp_code(self, value):
        """Validate OTP code format"""
        if value and (len(value) != 6 or not value.isdigit()):
            raise serializers.ValidationError("OTP code must be exactly 6 digits")
        return value

    def validate(self, attrs):
        """Validate notification type specific requirements"""
        notification_type = attrs.get('notification_type')
        
        # Validate required fields for specific notification types
        if notification_type == 'account_locked' and not attrs.get('failed_attempts'):
            raise serializers.ValidationError({
                'failed_attempts': 'Failed attempts count is required for account locked notifications'
            })
        
        if notification_type == 'password_reset' and not attrs.get('reset_token'):
            raise serializers.ValidationError({
                'reset_token': 'Reset token is required for password reset notifications'
            })
        
        if notification_type == 'otp_generated' and not attrs.get('otp_code'):
            raise serializers.ValidationError({
                'otp_code': 'OTP code is required for OTP generated notifications'
            })
        
        return attrs

    def create(self, validated_data):
        """Create notification request with proper context data structure"""
        # Extract context fields
        context_fields = [
            'failed_attempts', 'reset_token', 'reset_url', 'otp_code', 
            'login_timestamp', 'previous_email', 'previous_username',
            'device_info', 'location', 'additional_message'
        ]
        
        context_data = {}
        for field in context_fields:
            if field in validated_data and validated_data[field] is not None:
                context_data[field] = validated_data.pop(field)
        
        # Create the notification request
        from .models import NotificationRequest
        return NotificationRequest.objects.create(
            user_email=validated_data['user_email'],
            user_name=validated_data.get('user_name', ''),
            notification_type=validated_data['notification_type'],
            ip_address=validated_data.get('ip_address'),
            user_agent=validated_data.get('user_agent', ''),
            context_data=context_data
        )


class NotificationTemplateSerializer(serializers.ModelSerializer):
    """
    Serializer for notification templates
    """
    class Meta:
        model = NotificationTemplate
        fields = ['id', 'notification_type', 'subject', 'body_text', 'body_html', 'is_active', 'created_at', 'updated_at']
        read_only_fields = ['id', 'created_at', 'updated_at']


class NotificationLogSerializer(serializers.ModelSerializer):
    """
    Serializer for notification logs with expanded context fields for HTML form compatibility
    """
    # Expanded context fields for better form display
    failed_attempts = serializers.SerializerMethodField()
    reset_token = serializers.SerializerMethodField()
    reset_url = serializers.SerializerMethodField()
    otp_code = serializers.SerializerMethodField()
    login_timestamp = serializers.SerializerMethodField()
    previous_email = serializers.SerializerMethodField()
    previous_username = serializers.SerializerMethodField()
    device_info = serializers.SerializerMethodField()
    location = serializers.SerializerMethodField()
    additional_message = serializers.SerializerMethodField()

    class Meta:
        model = NotificationLog
        fields = [
            'id', 'user_id', 'user_email', 'notification_type', 'recipient_email',
            'subject', 'message', 'status', 'error_message', 'sent_at', 'created_at',
            # Expanded context fields
            'failed_attempts', 'reset_token', 'reset_url', 'otp_code',
            'login_timestamp', 'previous_email', 'previous_username',
            'device_info', 'location', 'additional_message'
        ]
        read_only_fields = ['id', 'created_at']

    def get_failed_attempts(self, obj):
        return obj.context_data.get('failed_attempts')

    def get_reset_token(self, obj):
        return obj.context_data.get('reset_token')

    def get_reset_url(self, obj):
        return obj.context_data.get('reset_url')

    def get_otp_code(self, obj):
        return obj.context_data.get('otp_code')

    def get_login_timestamp(self, obj):
        return obj.context_data.get('login_timestamp')

    def get_previous_email(self, obj):
        return obj.context_data.get('previous_email')

    def get_previous_username(self, obj):
        return obj.context_data.get('previous_username')

    def get_device_info(self, obj):
        return obj.context_data.get('device_info')

    def get_location(self, obj):
        return obj.context_data.get('location')

    def get_additional_message(self, obj):
        return obj.context_data.get('additional_message')


class NotificationHistorySerializer(serializers.Serializer):
    """
    Serializer for notification history requests
    """
    user_email = serializers.EmailField()
    notification_type = serializers.CharField(max_length=50, required=False)
    limit = serializers.IntegerField(min_value=1, max_value=100, default=50)


class FlexibleEmailSerializer(serializers.Serializer):
    """
    Serializer for flexible email sending without templates - HTML form compatible
    """
    recipient_email = serializers.EmailField()
    subject = serializers.CharField(max_length=200)
    message = serializers.CharField(
        required=False, 
        allow_blank=True,
        style={'base_template': 'textarea.html'}
    )
    html_message = serializers.CharField(
        required=False, 
        allow_blank=True,
        style={'base_template': 'textarea.html'}
    )
    
    # Additional fields for better form experience
    priority = serializers.ChoiceField(
        choices=[('low', 'Low'), ('normal', 'Normal'), ('high', 'High')],
        default='normal',
        required=False
    )
    send_immediately = serializers.BooleanField(default=True, required=False)

    def validate(self, data):
        if not data.get('message') and not data.get('html_message'):
            raise serializers.ValidationError("Either 'message' or 'html_message' must be provided")
        return data


class FetchNotificationsSerializer(serializers.Serializer):
    """
    Serializer for fetching notification history
    """
    user_email = serializers.EmailField()
    notification_type = serializers.CharField(required=False, allow_blank=True)
    limit = serializers.IntegerField(default=50)
    after_notification_id = serializers.CharField(required=False, allow_blank=True)


class HealthCheckSerializer(serializers.Serializer):
    """
    Health check response serializer
    """
    status = serializers.CharField()
    timestamp = serializers.DateTimeField()
    version = serializers.CharField()
    database = serializers.CharField()
    email_backend = serializers.CharField()
    authentication = serializers.CharField(required=False)