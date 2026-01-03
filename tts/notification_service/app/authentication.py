import jwt
from rest_framework import authentication, exceptions
from django.conf import settings
from django.contrib.auth.models import User
from rest_framework.authentication import BaseAuthentication
from rest_framework.exceptions import AuthenticationFailed
from rest_framework import permissions
import hmac
import hashlib

# Create a proper SimpleUser class instead of dynamically creating it
class SimpleUser:
    """
    A lightweight user class that mimics Django's User model
    but only contains information from the JWT token.
    """
    def __init__(self, user_id, email, username, roles=None):
        self.id = user_id
        self.email = email
        self.username = username
        self.roles = roles or []
        self.is_authenticated = True
        
    def __str__(self):
        """String representation for better display in DRF"""
        return f"{self.username} (ID: {self.id})"
    
    def __repr__(self):
        """Formal representation for debugging"""
        return f"<SimpleUser: {self.username} ({self.email})>"
    
    # Additional methods that might be expected by DRF
    @property
    def is_active(self):
        return True

    @property
    def is_anonymous(self):
        return False


class JWTCookieAuthentication(BaseAuthentication):
    """
    Custom authentication class for JWT token stored in cookies or Authorization header.
    
    Gateway Mode (KONG_TRUSTED=True):
        - Decodes JWT without signature verification (Kong already verified at gateway)
        - Better performance, no redundant crypto operations
    
    Direct Mode (KONG_TRUSTED=False or unset):
        - Full JWT signature verification
        - Use for direct service access or local development without Kong
    """
    
    def authenticate(self, request):
        # Priority 1: Authorization header (Bearer token)
        auth_header = request.headers.get('Authorization', '')
        if auth_header.startswith('Bearer '):
            token = auth_header[7:]  # Remove 'Bearer ' prefix
        else:
            # Priority 2: Cookie (backward compatibility)
            token = request.COOKIES.get('access_token')
        
        if not token:
            # No token found, authentication fails
            return None
        
        try:
            # Check if running behind Kong (gateway-trusted mode)
            kong_trusted = getattr(settings, 'KONG_TRUSTED', False)
            
            if kong_trusted:
                # Kong already verified signature - just decode for user context
                payload = jwt.decode(
                    token,
                    options={"verify_signature": False}
                )
            else:
                # Full verification for direct access
                # Decode the JWT token with signature verification
                payload = jwt.decode(
                    token, 
                    settings.JWT_SHARED_SECRET_KEY,  # Use the shared secret key for verification
                    algorithms=['HS256']  # Specify the algorithm used by the auth service
                )
            
            # Get user information from the token payload
            user_id = payload.get('user_id')
            email = payload.get('email')
            username = payload.get('username')
            roles = payload.get('roles', [])
            
            if not user_id:
                raise exceptions.AuthenticationFailed('Invalid token payload')
                
            # Create a SimpleUser instance instead of a dynamic type
            user = SimpleUser(user_id, email, username, roles)
            
            # Return the user object and the raw token
            return (user, token)
            
        except jwt.ExpiredSignatureError:
            raise exceptions.AuthenticationFailed('Token has expired')
        except jwt.InvalidTokenError:
            raise exceptions.AuthenticationFailed('Invalid token')
        except Exception as e:
            raise exceptions.AuthenticationFailed(f'Authentication failed: {str(e)}')
    
    def authenticate_header(self, request):
        return 'Bearer'


class APIKeyAuthentication(BaseAuthentication):
    """
    Custom authentication class for API key authentication
    
    Authenticates requests using API key in X-API-Key header.
    For admin functionality, checks against NOTIFICATION_API_KEYS list.
    For regular in-app notifications, checks against API_KEY.
    """
    def authenticate(self, request):
        # Get the API key from request header
        api_key = request.META.get('HTTP_X_API_KEY')
        if not api_key:
            return None
        
        # Check if the request path is for admin functionality
        path = request.path
        is_admin_path = (
            '/users/notifications/' in path or 
            '/notification/detail/' in path or 
            '/notification/read/' in path or 
            '/notification/mark-read/' in path or
            '/create/' in path
        )
        
        if is_admin_path:
            # For admin endpoints, verify against the list of API keys
            valid = api_key in settings.NOTIFICATION_API_KEYS
        else:
            # For regular endpoints, verify against the single API key
            valid = hmac.compare_digest(api_key, settings.API_KEY)
            
        if not valid:
            raise AuthenticationFailed('Invalid API key')
        
        # Authentication successful, but no user is associated
        return (None, None)
    
    def authenticate_header(self, request):
        return 'X-API-Key'

# New permission class to require API key for admin endpoints
class RequireAPIKey(permissions.BasePermission):
    """
    Permission class that requires a valid API key for admin endpoints.
    """
    def has_permission(self, request, view):
        # Check if the path is an admin path
        path = request.path
        is_admin_path = (
            '/users/notifications/' in path or 
            '/notification/detail/' in path or 
            '/notification/read/' in path or 
            '/notification/mark-read/' in path or
            '/create/' in path
        )
        
        if not is_admin_path:
            # Not an admin path, so don't enforce API key
            return True
            
        # For admin paths, require X-API-Key header
        api_key = request.META.get('HTTP_X_API_KEY')
        if not api_key:
            return False
            
        # API key validation is done by APIKeyAuthentication
        # This just ensures the header exists
        return True