from rest_framework_simplejwt.authentication import JWTAuthentication
from rest_framework_simplejwt.exceptions import InvalidToken, TokenError
from django.conf import settings
from hdts.models import Employees


class EmployeeUser:
    """
    A wrapper class that makes an Employee object compatible with DRF authentication.
    This allows Employee objects to work with IsAuthenticated permission class.
    """
    def __init__(self, employee):
        self.employee = employee
        self.id = employee.id
        self.pk = employee.id
        self.email = employee.email
        self.username = employee.email  # Use email as username
        self.is_authenticated = True
        self.is_active = employee.status == 'active'
        self.is_staff = False
        self.is_superuser = False
        self.user_type = 'employee'
    
    def __str__(self):
        return self.email
    
    @property
    def is_anonymous(self):
        return False


class CookieJWTAuthentication(JWTAuthentication):
    """
    Custom JWT authentication that reads tokens from cookies (e.g., 'access_token')
    and falls back to standard Authorization header if cookie is missing or invalid.

    - Uses configurable user_id_field and user_id_claim from settings.SIMPLE_JWT.
    - Gracefully handles invalid/missing cookie tokens.
    - Supports both staff (User) and employee (Employees) tokens.
    """

    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        simple_jwt_settings = getattr(settings, 'SIMPLE_JWT', {})
        self.user_id_field = simple_jwt_settings.get('USER_ID_FIELD', 'id')
        self.user_id_claim = simple_jwt_settings.get('USER_ID_CLAIM', 'user_id')

    def authenticate(self, request):
        # Try to get token from cookie first
        raw_token = request.COOKIES.get('access_token')

        # No cookie token → fallback to header
        if raw_token is None:
            return super().authenticate(request)

        try:
            # Validate the token from cookie
            validated_token = self.get_validated_token(raw_token)
            user = self.get_user(validated_token)
            return (user, validated_token)

        except (TokenError, InvalidToken):
            # Invalid or expired cookie token → fallback to header
            return super().authenticate(request)

    def get_user(self, validated_token):
        """
        Returns the user based on the validated token.
        Supports both staff (User model) and employee (Employees model) tokens.
        Checks the 'user_type' claim to determine which model to use.
        """
        user_type = validated_token.get('user_type', 'staff')
        
        # Handle employee tokens
        if user_type == 'employee':
            try:
                # For employee tokens, use employee_id claim
                employee_id = validated_token.get('employee_id')
                if employee_id is None:
                    # Fallback to user_id if employee_id not present
                    employee_id = validated_token.get(self.user_id_claim)
                
                if employee_id is None:
                    raise Employees.DoesNotExist("No employee_id in token")
                
                employee_id = int(employee_id) if not isinstance(employee_id, int) else employee_id
                employee = Employees.objects.get(id=employee_id)
                
                # Wrap the employee in EmployeeUser to make it compatible with DRF
                return EmployeeUser(employee)
            except (Employees.DoesNotExist, ValueError, KeyError) as e:
                raise Employees.DoesNotExist(f"No employee found with the given token: {str(e)}")
        
        # Handle staff tokens (default behavior)
        try:
            user_id = validated_token[self.user_id_claim]
            user_id = int(user_id) if not isinstance(user_id, int) else user_id
            user = self.user_model.objects.get(**{self.user_id_field: user_id})
            return user

        except (self.user_model.DoesNotExist, ValueError, KeyError) as e:
            raise self.user_model.DoesNotExist(f"No user found with the given token: {str(e)}")
