"""
API Key Authentication for Notification Service v2
"""
from rest_framework.authentication import BaseAuthentication
from rest_framework.exceptions import AuthenticationFailed
from django.conf import settings
from django.contrib.auth.models import AnonymousUser


class APIKeyUser:
    """
    Simple user class for API key authentication
    """
    def __init__(self, api_key):
        self.api_key = api_key
        self.is_authenticated = True
        self.is_anonymous = False
        self.is_active = True
        self.username = f"api_key_{api_key[:8]}"
        
    def __str__(self):
        return f"APIKeyUser({self.username})"


class APIKeyAuthentication(BaseAuthentication):
    """
    Simple API key authentication.
    Clients should authenticate by passing the API key in the 'X-API-Key' header
    or in the 'Authorization' header as 'Bearer <api_key>'.
    """
    
    def authenticate(self, request):
        api_key = self.get_api_key(request)
        
        if not api_key:
            return None
            
        if self.is_valid_api_key(api_key):
            # Return a tuple of (user, token) to indicate successful authentication
            # Using custom APIKeyUser instead of AnonymousUser
            user = APIKeyUser(api_key)
            return (user, api_key)
        
        raise AuthenticationFailed('Invalid API key')
    
    def get_api_key(self, request):
        """
        Extract API key from request headers
        """
        # Try X-API-Key header first
        api_key = request.META.get('HTTP_X_API_KEY')
        
        if not api_key:
            # Try Authorization header with Bearer format
            auth_header = request.META.get('HTTP_AUTHORIZATION')
            if auth_header and auth_header.startswith('Bearer '):
                api_key = auth_header[7:]  # Remove 'Bearer ' prefix
        
        return api_key
    
    def is_valid_api_key(self, api_key):
        """
        Validate the API key against configured valid keys
        """
        valid_api_keys = getattr(settings, 'NOTIFICATION_API_KEYS', [])
        return api_key in valid_api_keys