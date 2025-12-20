"""
Middleware for handling JWT authentication for both users and employees.
Extracts JWT tokens from cookies and adds the authenticated user/employee to the request.
"""

import logging
import jwt
from django.conf import settings
from rest_framework_simplejwt.tokens import AccessToken
from rest_framework_simplejwt.exceptions import TokenError, InvalidToken
from users.models import User
from hdts.models import Employees

logger = logging.getLogger(__name__)


class JWTAuthenticationMiddleware:
    """
    Middleware to authenticate requests using JWT tokens from cookies.
    Supports both User and Employee authentication.
    """

    def __init__(self, get_response):
        self.get_response = get_response

    def __call__(self, request):
        # Try to get JWT token from cookies OR Authorization header
        access_token = request.COOKIES.get('access_token')
        
        # If not in cookies, check Authorization header (Bearer token)
        if not access_token:
            auth_header = request.META.get('HTTP_AUTHORIZATION', '')
            if auth_header.startswith('Bearer '):
                access_token = auth_header[7:]  # Remove 'Bearer ' prefix
        
        if access_token:
            # First, try to decode as a custom employee token
            employee_payload = self._decode_custom_token(access_token)
            if employee_payload:
                employee_id = employee_payload.get('employee_id')
                if employee_id:
                    try:
                        request.employee = Employees.objects.get(id=employee_id)
                        logger.debug(f"JWT Employee authenticated: {request.employee.email}")
                    except Employees.DoesNotExist:
                        logger.warning(f"JWT token references non-existent employee: {employee_id}")
                return self.get_response(request)
            
            # If not a custom employee token, try DRF simplejwt format
            try:
                token = AccessToken(access_token)
                token.verify()
                
                user_id = token.get('user_id')
                
                # Try to get User
                if user_id:
                    try:
                        request.user = User.objects.get(id=user_id)
                        logger.debug(f"JWT User authenticated: {request.user.email}")
                    except User.DoesNotExist:
                        logger.warning(f"JWT token references non-existent user: {user_id}")
                        
            except (TokenError, InvalidToken) as e:
                logger.debug(f"Invalid JWT token: {str(e)}")
                # Clear invalid token from cookies if present
                request.COOKIES.pop('access_token', None)
        else:
            # No JWT token present - invalidate Django session to prevent session-only authentication
            # This ensures API endpoints require JWT tokens, not just valid sessions
            if request.session and request.session.session_key:
                logger.debug("No JWT token found - invalidating Django session")
                request.session.flush()
        
        response = self.get_response(request)
        return response
    
    def _decode_custom_token(self, token_str):
        """
        Decode custom employee JWT token without verification to check if it's a custom token.
        Returns payload if valid custom token, None otherwise.
        """
        try:
            algorithm = getattr(settings, 'SIMPLE_JWT', {}).get('ALGORITHM', 'HS256')
            # Use the same signing key as jwt_helpers.py for consistency
            secret = getattr(settings, 'SIMPLE_JWT', {}).get('SIGNING_KEY', settings.SECRET_KEY)
            
            payload = jwt.decode(token_str, secret, algorithms=[algorithm])
            
            # Check if this is a custom employee token (has employee_id)
            if 'employee_id' in payload:
                return payload
            
            return None
        except Exception as e:
            logger.debug(f"Custom token decode failed: {str(e)}")
            return None
