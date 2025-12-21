from django.contrib.auth.backends import ModelBackend
from django.contrib.auth import get_user_model
from django.db.models import Q
import re
from django.core.exceptions import ValidationError
User = get_user_model()


#JWT info:
#Dashboard.jsx: Frontend component - consumes data from budget service APIs
#AuthContext.jsx: Frontend context - manages JWT storage locally
#api.js & authAPI.js: Frontend API clients - add JWT to requests

class EmailOrPhoneNumberBackend(ModelBackend):
    """
    Custom authentication backend that allows login with either email or phone number
    """
    def validate_phone_number(self, phone_number):
        if not phone_number:
            return False
        pattern = r'^\+\d{10,15}$'
        if not re.match(pattern, phone_number):
            raise ValidationError("Invalid phone number format. Use +<country code><number> (e.g., +639123456789).")
        return True
    
    def authenticate(self, request, username=None, password=None, **kwargs):
        # Get email and phone_number from kwargs, don't fallback to username
        email = kwargs.get('email')
        phone_number = kwargs.get('phone_number')
        
        # If neither email nor phone_number is provided, check if username looks like email or phone
        if not email and not phone_number and username:
            if '@' in username:
                email = username
            elif username.startswith('+'):
                phone_number = username
            else:
                # Could be either, try email first then phone
                email = username
        
        if not email and not phone_number:
            return None
        
        try:
            user = None
            
            # Vvlidate phone number format if phone_number is provided
            if phone_number:
                self.validate_phone_number(phone_number)
                try:
                    user = User.objects.get(phone_number=phone_number)
                except User.DoesNotExist:
                    pass
            
            # Try email if no user found via phone or if email was provided
            if not user and email:
                try:
                    user = User.objects.get(email=email)
                except User.DoesNotExist:
                    pass
            
            if user and user.check_password(password):
                return user
            return None
            
        except User.DoesNotExist:
            # Default password hasher
            User().set_password(password)
            return None
        except ValidationError:
            # Invalid phone number format
            return None