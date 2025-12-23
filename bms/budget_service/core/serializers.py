from rest_framework import serializers
from django.contrib.auth import authenticate
from .models import FiscalYear, Department, ExpenseCategory, Expense
from drf_spectacular.utils import extend_schema_field
import re


class DepartmentSerializer(serializers.ModelSerializer):
    """
    Serializer for Department model.
    Used for retrieving department information for dropdowns in user management.
    """
    class Meta:
        model = Department
        fields = ['id', 'name', 'code', 'description']
        
       
        swagger_schema_fields = {
            "title": "Department",
            "description": "Represents a department within the organization",
            "example": {
                "id": 1,
                "name": "Finance Department",
                "code": "FIN",
                "description": "Handles company financial operations and budgeting"
            }
        }
        
class TopCategorySerializer(serializers.Serializer):
    """
    Serializer for top expense category with amount and percentage.
    """
    name = serializers.CharField()
    amount = serializers.DecimalField(max_digits=15, decimal_places=2)
    percentage = serializers.FloatField()
    
    
class DepartmentBudgetSerializer(serializers.ModelSerializer):
    """
    Serializer for displaying department budget allocation information
    """
    total_budget = serializers.DecimalField(max_digits=15, decimal_places=2, read_only=True)
    total_spent = serializers.DecimalField(max_digits=15, decimal_places=2, read_only=True)
    remaining_budget = serializers.DecimalField(max_digits=15, decimal_places=2, read_only=True)
    percentage_used = serializers.FloatField(read_only=True)
    
    class Meta:
        model = Department
        fields = ['id', 'name', 'code', 'total_budget', 'total_spent', 'remaining_budget', 'percentage_used']


class FiscalYearSerializer(serializers.ModelSerializer):
    """
    Serializer for fiscal year information
    """
    class Meta:
        model = FiscalYear
        fields = ['id', 'name', 'start_date', 'end_date', 'is_active', 'is_locked']


class ValidProjectAccountSerializer(serializers.Serializer):
    project_id = serializers.IntegerField()
    project_title = serializers.CharField()
    account_id = serializers.IntegerField()
    account_code = serializers.CharField()
    account_title = serializers.CharField()
    department_name = serializers.CharField()
    fiscal_year_name = serializers.CharField()


"""
class UserSerializer(serializers.ModelSerializer):
    department_id = serializers.IntegerField(write_only=True, required=False)

    class Meta:
        model = User
        fields = [
        'id', 'email', 'username', 'first_name', 'last_name',
        'role', 'department', 'department_id', 'phone_number',
        'is_active', 'created_at', 'last_login'
        ]
        extra_kwargs = {
        'phone_number': {'required': False, 'allow_blank': True},
        'password':     {'write_only': True}
        }

    def create(self, validated_data):
        department_id = validated_data.pop('department_id', None)
        password = validated_data.pop('password', None)

        user = User(**validated_data)

        if department_id:
            try:
                department = Department.objects.get(id=department_id)
                user.department = department
            except Department.DoesNotExist:
                raise serializers.ValidationError({'department_id': 'Department not found'})
        
        if password:
            user.set_password(password)
        
        user.save()
        return user

    def update(self, instance, validated_data):
        department_id = validated_data.pop('department_id', None)
        password = validated_data.pop('password', None)
        
        for attr, value in validated_data.items():
            setattr(instance, attr, value)
        
        if department_id:
            try:
                 department = Department.objects.get(id=department_id)
                 instance.department = department
            except Department.DoesNotExist:
                 raise serializers.ValidationError({'department_id': 'Department not found'})
        
        if password:
             instance.set_password(password)
        
        instance.save()
        return instance

class UserTableSerializer(serializers.ModelSerializer):
    \"\"\"
    Serializer for listing users in the management table view.
    Only includes fields needed for the table display.
    \"\"\"
    full_name = serializers.SerializerMethodField()
    last_active = serializers.DateTimeField(source='last_login', read_only=True)
    
    class Meta:
        model = User
        fields = ['id', 'full_name', 'email', 'role', 'last_active', 'is_active']
        
    @extend_schema_field(serializers.CharField())
    def get_full_name(self, obj):
        return f"{obj.first_name} {obj.last_name}"

class UserModalSerializer(serializers.ModelSerializer):
    \"\"\"
    Serializer for the add/edit user modals.
    Includes all fields needed for creating or updating a user.
    \"\"\"
    department = DepartmentSerializer(read_only=True)
    department_id = serializers.IntegerField(write_only=True, required=False, allow_null=True)
    date_added = serializers.DateTimeField(source='created_at', read_only=True)
    last_active = serializers.DateTimeField(source='last_login', read_only=True)
    
    class Meta:
        model = User
        fields = [
            'id', 'first_name', 'last_name', 'username', 'email', 
            'role', 'department', 'department_id', 'is_active',
            'date_added', 'last_active'
        ]
        extra_kwargs = {
            'id': {'read_only': True}
        }

    def create(self, validated_data):
        department_id = validated_data.pop('department_id', None)
        
        user = User(**validated_data)
        
        if department_id:
            try:
                department = Department.objects.get(id=department_id)
                user.department = department
            except Department.DoesNotExist:
                raise serializers.ValidationError({'department_id': 'Department not found'})
        
        # Set a random secure password since the frontend doesn't handle it
        # In a real system, you might want to email this password to the user
        # or implement a "set password" flow
        import secrets
        import string
        temp_password = ''.join(secrets.choice(string.ascii_letters + string.digits) for _ in range(12))
        user.set_password(temp_password)
        
        user.save()
        return user

    def update(self, instance, validated_data):  
        department_id = validated_data.pop('department_id', None)
        
       
        for attr, value in validated_data.items():
            setattr(instance, attr, value)  # Use passed 'instance' instead of self.instance
        
        # Handle department assignment
        if department_id is not None:
            try:
                department = Department.objects.get(id=department_id)
                instance.department = department
            except Department.DoesNotExist:
                raise serializers.ValidationError({'department_id': 'Department not found'})
        elif department_id is None and 'department_id' in self.initial_data:
            instance.department = None
        
        # Save password only if it's being updated
        if 'password' in validated_data:
            instance.set_password(validated_data['password'])
        
        instance.save()
        return instance


class LoginSerializer(serializers.Serializer):
    email        = serializers.EmailField(required=False)
    phone_number = serializers.CharField(required=False, allow_blank=False)
    password     = serializers.CharField(style={'input_type':'password'},
                                         trim_whitespace=False)

    def validate(self, attrs):
        email = attrs.get('email')
        phone_number = attrs.get('phone_number')
        password = attrs.get('password')

        if not email and not phone_number:
            raise serializers.ValidationError("Either email or phone number is required.")
        if phone_number:
            pattern = '^\\+\\d{10,15}$'  # Escaped backslashes, but raw string is preferred
            if not re.match(pattern, phone_number):
                raise serializers.ValidationError("Invalid phone number format.")

        if not password:
            raise serializers.ValidationError("Password is required.")

        user = authenticate(
            request=self.context.get('request'),
            username=email or phone_number, password=password
        )
        if not user:
            raise serializers.ValidationError('Invalid credentials')
        if not user.is_active:
            raise serializers.ValidationError('Account is disabled')

        user.last_login = timezone.now()
        user.save(update_fields=['last_login'])

        attrs['user'] = user
        return attrs


class LoginAttemptSerializer(serializers.ModelSerializer):
    # Add type hint for the method using extend_schema_field
    @extend_schema_field(serializers.CharField())
    def get_username(self, obj) -> str:
        "Get username for the login attempt."
        return obj.user.username if obj.user else "Unknown"
    
    username = serializers.SerializerMethodField()
    
    class Meta:
        model = LoginAttempt
        fields = ['id', 'username', 'ip_address', 'user_agent', 'success', 'timestamp']
"""

# --- Budgeting/Department/Expense serializers below are still active ---

