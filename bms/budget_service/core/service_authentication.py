# File: backend/core/service_authentication.py
from rest_framework.authentication import BaseAuthentication
from rest_framework.exceptions import AuthenticationFailed
from django.conf import settings
from django.contrib.auth.models import AnonymousUser # Or a custom ServiceUser

# If you want to represent services as a specific user-like object:
class ServicePrincipal:
    def __init__(self, service_name):
        self.is_authenticated = True
        self.service_name = service_name
        self.username = f"service_account_{service_name.lower()}" # For logging
        # Add any other attributes your views might expect on request.user for services
        self.id = None # Services don't typically have user IDs in the same way
        self.role = "SERVICE" # A special role

    def __str__(self):
        return f"ServicePrincipal({self.service_name})"

class APIKeyAuthentication(BaseAuthentication):
    """
    Custom authentication class for service-to-service API key authentication.
    Expects an 'X-API-Key' header.
    """
    keyword = 'X-API-Key' # Or any header name you agree on, e.g., 'Service-Api-Key'

    def authenticate(self, request):
        api_key = request.headers.get(self.keyword)

        if not api_key:
            return None # No API key provided, let other auth methods try

        # Fetch keys from settings
        # SERVICE_API_KEYS should be a dict: ex {'key_value': 'SERVICE_NAME', ...}
        valid_keys = getattr(settings, 'SERVICE_API_KEYS', {})

        service_name = valid_keys.get(api_key)

        if not service_name:
            raise AuthenticationFailed('Invalid API Key.')

        # Successfully authenticated the service
        # You can return a custom user-like object representing the service
        # or just (AnonymousUser(), api_key) for only checking validity
        # For more structure, use a ServicePrincipal:
        service_principal = ServicePrincipal(service_name)
        return (service_principal, api_key) # (user, auth) tuple

    def authenticate_header(self, request):
        # Returned if authentication fails, prompting for credentials.
        # For API keys, often not strictly necessary to return a WWW-Authenticate header.
        return None