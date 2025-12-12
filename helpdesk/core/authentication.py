from rest_framework_simplejwt.authentication import JWTAuthentication
from rest_framework_simplejwt.exceptions import InvalidToken, TokenError
from django.conf import settings
import requests
import jwt


class ExternalUser:
    """
    Represents an external user from cookie authentication.
    Mimics basic user attributes for DRF compatibility.
    """
    def __init__(self, user_id, email, role, first_name=None, last_name=None, department=None, company_id=None, user_type='user'):
        self.id = user_id
        self.email = email
        self.role = role
        self.first_name = first_name
        self.last_name = last_name
        self.department = department
        self.company_id = company_id
        self.user_type = user_type  # 'user' or 'employee'
        self.is_authenticated = True
        self.is_staff = False
        self.is_superuser = False
        self.pk = user_id  # For DRF compatibility

    def __str__(self):
        if self.first_name and self.last_name:
            return f"{self.first_name} {self.last_name}"
        return self.email


class CookieJWTAuthentication(JWTAuthentication):
    """
    Custom JWT authentication that reads tokens from cookies (e.g., 'access_token')
    and falls back to standard Authorization header if cookie is missing or invalid.
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
            # First, check if this is an employee token (custom format)
            employee_user = self._try_decode_employee_token(raw_token)
            if employee_user:
                return (employee_user, raw_token)
            
            # Not an employee token, try standard DRF simplejwt
            validated_token = self.get_validated_token(raw_token)
            
            # Try to access 'roles' field - if it exists, treat as external token
            try:
                roles = validated_token['roles']
                
                # External token with roles - create ExternalUser
                if not isinstance(roles, list):
                    raise ValueError('roles must be a list')
                
                hdts_role = None
                for role_obj in roles:
                    if isinstance(role_obj, dict) and role_obj.get('system') == 'hdts':
                        hdts_role = role_obj.get('role')
                        break
                
                if hdts_role is None:
                    raise ValueError('No valid role found for system hdts')
                
                user = ExternalUser(
                    user_id=validated_token['user_id'],
                    email=validated_token['email'],
                    role=hdts_role,
                    first_name=validated_token.get('first_name'),
                    last_name=validated_token.get('last_name'),
                    # department=validated_token.get('department'),
                    # company_id=validated_token.get('company_id'),
                    user_type='user'
                )
            except (KeyError, AttributeError, TypeError) as e:
                # No 'roles' field - simple token, use standard user from DB
                user = self.get_user(validated_token)
            
            return (user, validated_token)

        except (TokenError, InvalidToken):
            # Invalid or expired cookie token → fallback to header
            return super().authenticate(request)

    def get_user(self, validated_token):
        """
        Returns the user based on the validated token.
        Ensures correct type conversion for user_id.
        
        Handles three types of tokens:
        1. Employee tokens from auth2 (have employee_id)
        2. External user tokens with roles from auth service (have roles claim)
        3. Local Employee tokens from backend DB (standard JWT)
        """
        # Check if this is an employee token from auth2 (has employee_id field)
        if 'employee_id' in validated_token:
            try:
                employee_id = validated_token.get('employee_id')
                email = validated_token.get('email', '')
                first_name = validated_token.get('first_name', '')
                last_name = validated_token.get('last_name', '')
                company_id = validated_token.get('company_id')
                
                user = ExternalUser(
                    user_id=employee_id,
                    email=email,
                    role='Employee',
                    first_name=first_name,
                    last_name=last_name,
                    company_id=company_id,
                    user_type='employee'
                )
                return user
            except Exception as e:
                raise self.user_model.DoesNotExist(f"Invalid employee token: {str(e)}")

        # Check if this token comes from the external auth service
        # which includes a `roles` claim. If so, construct and return an
        # ExternalUser rather than attempting a DB lookup.
        try:
            roles = validated_token['roles']
        except (KeyError, TypeError):
            roles = None

        if roles:
            # Find HDTS role in the roles list
            hdts_role = None
            try:
                for role_obj in roles:
                    if isinstance(role_obj, dict) and role_obj.get('system') == 'hdts':
                        hdts_role = role_obj.get('role')
                        break
            except Exception:
                hdts_role = None

            if hdts_role is None:
                # No HDTS role found; fall back to DB lookup below
                roles = None
            else:
                # Build ExternalUser from token fields
                try:
                    user_id = validated_token.get('user_id') if hasattr(validated_token, 'get') else validated_token[self.user_id_claim]
                except Exception:
                    user_id = validated_token[self.user_id_claim]

                try:
                    email = validated_token.get('email') if hasattr(validated_token, 'get') else validated_token['email']
                except Exception:
                    email = None

                return ExternalUser(user_id=user_id, email=email, role=hdts_role, user_type='user')

        # Fallback: token corresponds to local DB user — perform normal lookup
        try:
            user_id = validated_token[self.user_id_claim]
            user_id = int(user_id) if not isinstance(user_id, int) else user_id
            user = self.user_model.objects.get(**{self.user_id_field: user_id})
            return user

        except (self.user_model.DoesNotExist, ValueError, KeyError) as e:
            raise self.user_model.DoesNotExist(f"No user found with the given token: {str(e)}")
    
    def _try_decode_employee_token(self, token_str):
        """
        Try to decode and validate an employee JWT token.
        Returns ExternalUser if valid, None otherwise.
        
        Employee tokens have shape:
        {
          "employee_id": 3,
          "email": "robert.johnson@example.com",
          "first_name": "Robert",
          "last_name": "Johnson",
          "company_id": null,
          "token_type": "access",
          "exp": 1765193018.211683,
          "iat": 1765192118.211683
        }
        """
        try:
            payload = jwt.decode(
                token_str,
                settings.SECRET_KEY,
                algorithms=['HS256']
            )
            
            # Check if this is an employee token (has employee_id and token_type)
            if 'employee_id' in payload and payload.get('token_type') == 'access':
                employee_id = payload.get('employee_id')
                email = payload.get('email')
                first_name = payload.get('first_name', '')
                last_name = payload.get('last_name', '')
                company_id = payload.get('company_id')
                
                # Create ExternalUser for employee
                user = ExternalUser(
                    user_id=employee_id,
                    email=email,
                    role='Employee',
                    first_name=first_name,
                    last_name=last_name,
                    company_id=company_id,
                    user_type='employee'
                )
                return user
                
        except jwt.ExpiredSignatureError:
            pass
        except jwt.InvalidSignatureError:
            pass
        except (jwt.DecodeError, ValueError):
            pass
        except Exception:
            pass
        
        return None

