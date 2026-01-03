"""
Gateway-Aware JWT Authentication for TTS Ecosystem

This module provides authentication classes that work with Kong API Gateway.
When running behind Kong, JWT signature is already validated at the gateway layer,
so services can skip redundant verification for performance.

Usage:
    - Use GatewayJWTAuthentication in DRF settings for gateway-protected services
    - Use JWTCookieAuthentication for backward compatibility (direct access + cookies)

Environment:
    - KONG_TRUSTED: Set to 'true' when service runs behind Kong gateway
    - If not behind Kong, falls back to full JWT verification
"""

import jwt
import logging
from django.conf import settings
from rest_framework.authentication import BaseAuthentication
from rest_framework.exceptions import AuthenticationFailed

logger = logging.getLogger(__name__)


class AuthenticatedUser:
    """
    Lightweight user object populated from JWT claims.
    Compatible with DRF's authentication system.
    """
    
    def __init__(self, user_data: dict):
        self.id = user_data.get('id') or user_data.get('user_id')
        self.user_id = self.id
        self.pk = self.id
        self.email = user_data.get('email', '')
        self.username = user_data.get('username', '')
        self.full_name = user_data.get('full_name', '')
        self.roles = user_data.get('roles', [])
        self.is_authenticated = True
        self.is_active = True
        self.is_anonymous = False
        
        # System-specific role extraction
        self._extract_system_roles()
    
    def _extract_system_roles(self):
        """Extract roles for specific systems (tts, hdts, etc.)"""
        self.tts_roles = []
        self.hdts_roles = []
        
        for role in self.roles:
            if isinstance(role, dict):
                system = role.get('system', '').lower()
                role_name = role.get('role', '')
                if system == 'tts':
                    self.tts_roles.append(role)
                elif system == 'hdts':
                    self.hdts_roles.append(role)
            elif isinstance(role, str) and ':' in role:
                system, role_name = role.split(':', 1)
                role_dict = {'system': system, 'role': role_name}
                if system == 'tts':
                    self.tts_roles.append(role_dict)
                elif system == 'hdts':
                    self.hdts_roles.append(role_dict)
    
    def get_full_name(self):
        return self.full_name
    
    def __str__(self):
        return f"AuthenticatedUser({self.email})"
    
    def __repr__(self):
        return f"<AuthenticatedUser id={self.id} email={self.email}>"


class GatewayJWTAuthentication(BaseAuthentication):
    """
    JWT authentication optimized for Kong API Gateway.
    
    When KONG_TRUSTED=true:
        - Decodes JWT without signature verification (Kong already verified)
        - Better performance, no redundant crypto operations
    
    When KONG_TRUSTED=false (or unset):
        - Falls back to full signature verification
        - Use for direct service access or local development
    
    Token Sources (in order):
        1. Authorization: Bearer <token> header
        2. access_token cookie (fallback for browser requests)
    """
    
    def authenticate(self, request):
        token = self._extract_token(request)
        
        if not token:
            return None
        
        try:
            # Check if we trust Kong's validation
            kong_trusted = getattr(settings, 'KONG_TRUSTED', False)
            
            if kong_trusted:
                # Kong already verified - just decode
                payload = jwt.decode(
                    token,
                    options={"verify_signature": False}
                )
                logger.debug("Token decoded (Kong trusted, signature skipped)")
            else:
                # Full verification for direct access
                payload = jwt.decode(
                    token,
                    settings.JWT_SIGNING_KEY,
                    algorithms=['HS256']
                )
                logger.debug("Token decoded with full signature verification")
            
            # Validate required claims
            user_id = payload.get('user_id')
            if not user_id:
                raise AuthenticationFailed('Invalid token: missing user_id')
            
            # Build user object from claims
            user_data = {
                'id': user_id,
                'user_id': user_id,
                'email': payload.get('email', ''),
                'username': payload.get('username', ''),
                'full_name': payload.get('full_name', ''),
                'roles': payload.get('roles', []),
            }
            
            return (AuthenticatedUser(user_data), token)
            
        except jwt.ExpiredSignatureError:
            raise AuthenticationFailed('Token has expired')
        except jwt.InvalidTokenError as e:
            logger.warning(f"Invalid token: {e}")
            raise AuthenticationFailed('Invalid token')
        except Exception as e:
            logger.error(f"Authentication error: {e}")
            raise AuthenticationFailed('Authentication failed')
    
    def _extract_token(self, request):
        """Extract JWT token from Authorization header or cookie."""
        # Priority 1: Authorization header
        auth_header = request.headers.get('Authorization', '')
        if auth_header.startswith('Bearer '):
            return auth_header[7:]
        
        # Priority 2: Cookie (backward compatibility)
        token = request.COOKIES.get('access_token')
        if token:
            return token
        
        return None


class GatewayOrCookieJWTAuthentication(GatewayJWTAuthentication):
    """
    Extends GatewayJWTAuthentication with explicit cookie support.
    Use this for services that need to support both gateway and direct browser access.
    """
    
    def _extract_token(self, request):
        # Try header first
        token = super()._extract_token(request)
        if token:
            return token
        
        # Also check for token in query params (WebSocket upgrade requests)
        token = request.GET.get('token')
        if token:
            return token
        
        return None
