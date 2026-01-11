# backend/core/authentication.py
"""
JWT Authentication for BMS Budget Service.

This module provides JWT authentication that is compatible with the centralized
auth service. It supports both cookie-based auth (for browser requests) and
header-based auth (for API requests with Bearer token).
"""
import jwt
import logging
from django.conf import settings
from django.http import JsonResponse
from rest_framework.authentication import BaseAuthentication
from rest_framework.exceptions import AuthenticationFailed
from rest_framework import status

logger = logging.getLogger(__name__)


class AuthenticatedUser:
    """
    User class to store authenticated user data from JWT token.
    Compatible with centralized auth service token structure.
    """
    def __init__(self, user_data):
        self.id = user_data.get('id')
        self.user_id = user_data.get('user_id')
        self.email = user_data.get('email')
        self.username = user_data.get('username')
        self.full_name = user_data.get('full_name', '')
        self.roles = user_data.get('roles', [])
        self.bms_roles = user_data.get('bms_roles', [])
        self.is_authenticated = True
        
        # Extract department from token
        self.department = user_data.get('department') or user_data.get('department_name')
        self.department_name = user_data.get('department_name') or user_data.get('department')
        self.department_id = user_data.get('department_id') or self._resolve_department_id()
        
        # Standard Django properties
        self.is_active = True
        self.is_staff = False
        self.is_superuser = False
        
        # Build roles_dict for backward compatibility
        self._roles_dict = self._build_roles_dict()
        
        # 🔍 DEBUG: Log user creation
        logger.info(f"🔐 Created AuthenticatedUser: {self.email}")
        logger.info(f"   Roles: {self.roles}")
        logger.info(f"   BMS Roles: {self.bms_roles}")
        logger.info(f"   BMS Role: {self.get_bms_role()}")
    
    def _resolve_department_id(self):
        """Resolve BMS department ID from department name"""
        if not self.department_name:
            return None
        
        try:
            from core.models import Department
            
            # Try exact match
            dept = Department.objects.filter(name__iexact=self.department_name).first()
            
            # Fallback to contains
            if not dept:
                dept = Department.objects.filter(name__icontains=self.department_name).first()
            
            if dept:
                logger.info(f"✅ Resolved department '{self.department_name}' to ID {dept.id}")
                return dept.id
            
            logger.warning(f"⚠️ Could not resolve department '{self.department_name}' in BMS database")
        except Exception as e:
            logger.error(f"Error resolving department: {e}")
        
        return None
    
    def _build_roles_dict(self):
        roles_dict = {}
        for role in self.roles:
            if isinstance(role, dict):
                system = role.get('system')
                role_name = role.get('role')
            elif isinstance(role, str) and ':' in role:
                system, role_name = role.split(':', 1)
            else:
                continue
            
            if system and role_name:
                roles_dict[system] = role_name
        return roles_dict
    
    def get_role_for_system(self, system_name):
        """
        Get the role name for a specific system.
        Backward compatible with the old roles.get('bms') pattern.
        """
        return self._roles_dict.get(system_name)
    
    def has_bms_role(self, role_name):
        """Check if user has specific BMS role"""
        result = any(
            self._get_role_name(role) == role_name 
            for role in self.bms_roles
        )
        logger.debug(f"has_bms_role({role_name}): {result} for {self.email}")
        return result
    
    def has_system_access(self, system_name):
        """Check if user has access to a specific system"""
        result = any(
            self._get_system_name(role) == system_name
            for role in self.roles
        )
        logger.debug(f"has_system_access({system_name}): {result} for {self.email}")
        return result
    
    def has_system_role(self, system_name, role_name):
        """Check if user has a specific role in a specific system"""
        for role in self.roles:
            if (self._get_system_name(role) == system_name and 
                self._get_role_name(role) == role_name):
                logger.debug(f"has_system_role({system_name}, {role_name}): True for {self.email}")
                return True
        logger.debug(f"has_system_role({system_name}, {role_name}): False for {self.email}")
        return False
    
    def get_bms_role(self):
        """Get the user's BMS role (returns first BMS role found)"""
        for role in self.roles:
            if self._get_system_name(role) == 'bms':
                bms_role = self._get_role_name(role)
                logger.debug(f"get_bms_role(): {bms_role} for {self.email}")
                return bms_role
        logger.debug(f"get_bms_role(): None for {self.email}")
        return None
    
    def get_systems(self):
        """Get list of all systems user has access to"""
        systems = set()
        for role in self.roles:
            system = self._get_system_name(role)
            if system:
                systems.add(system)
        return list(systems)
    
    def get_full_name(self):
        """Get the full name of the user"""
        return self.full_name or f"{self.username}"
    
    def _get_system_name(self, role):
        """Safely extract system name from role"""
        if isinstance(role, dict):
            return role.get('system')
        elif isinstance(role, str) and ':' in role:
            return role.split(':', 1)[0]
        return None
    
    def _get_role_name(self, role):
        """Safely extract role name from role"""
        if isinstance(role, dict):
            return role.get('role')
        elif isinstance(role, str) and ':' in role:
            return role.split(':', 1)[1]
        return None
    
    def __str__(self):
        return self.email or self.username or str(self.user_id)


class JWTCookieAuthentication(BaseAuthentication):
    """
    JWT authentication via cookies OR Authorization header with system-level authorization.
    """
    
    def authenticate(self, request):
        # Try to get JWT token from cookies first
        token = request.COOKIES.get('access_token')
        
        # If not in cookies, try Authorization header (Bearer token)
        if not token:
            auth_header = request.headers.get('Authorization')
            
            # Fallback: Check META for HTTP_AUTHORIZATION (common in some WSGI envs)
            if not auth_header:
                auth_header = request.META.get('HTTP_AUTHORIZATION', '')
                
            if auth_header and auth_header.startswith('Bearer '):
                token = auth_header[7:]  # Remove 'Bearer ' prefix
        
        if not token:
            return None
            
        try:
            payload = jwt.decode(
                token, 
                settings.JWT_SIGNING_KEY, 
                algorithms=['HS256']
            )
            
            # 🔍 DEBUG: Log the full payload
            logger.info(f"🔓 JWT Payload decoded for request to {request.path}")
            logger.debug(f"   Full payload: {payload}")
            
            # Extract user information
            user_id = payload.get('user_id')
            email = payload.get('email')
            username = payload.get('username')
            full_name = payload.get('full_name', '')
            roles = payload.get('roles', [])
            
            # 🔍 DEBUG: Log roles
            logger.info(f"   User: {email}")
            logger.info(f"   Roles in token: {roles}")
            
            if not user_id:
                raise AuthenticationFailed('Invalid token: missing user_id')
            
            if not roles:
                logger.warning(f"⚠️ No roles found in token for user {email}")
            
            # Extract BMS-specific roles
            bms_roles = []
            for role in roles:
                extracted = self._extract_role_if_system(role, 'bms')
                if extracted:
                    bms_roles.append(extracted)
            
            # 🔍 DEBUG: Log BMS roles
            logger.info(f"   BMS roles extracted: {bms_roles}")
            
            # Create user data object
            user_data = {
                'id': user_id,
                'user_id': user_id,
                'email': email,
                'username': username,
                'full_name': full_name,
                'roles': roles,
                'bms_roles': bms_roles,
                'department': payload.get('department'),
                'department_name': payload.get('department_name') or payload.get('department'),
                'department_id': payload.get('department_id'),
            }
            
            user = AuthenticatedUser(user_data)
            
            # 🔍 DEBUG: Verify user has BMS access
            has_bms = user.has_system_access('bms')
            logger.info(f"   ✅ Authentication successful. Has BMS access: {has_bms}")
            
            if not has_bms:
                logger.error(f"❌ User {email} has no BMS access!")
                raise AuthenticationFailed('No BMS access')
            
            return (user, token)
            
        except jwt.ExpiredSignatureError:
            logger.warning("❌ Token has expired")
            raise AuthenticationFailed('Token has expired')
        except jwt.InvalidTokenError as e:
            logger.warning(f"❌ Invalid token: {str(e)}")
            raise AuthenticationFailed('Invalid token')
        except AuthenticationFailed:
            raise  # Re-raise AuthenticationFailed as-is
        except Exception as e:
            logger.error(f"❌ Authentication error: {str(e)}", exc_info=True)
            raise AuthenticationFailed('Authentication failed')
    
    def _extract_role_if_system(self, role, system_name):
        """Safely extract role if it matches the system"""
        if isinstance(role, dict):
            return role if role.get('system') == system_name else None
        elif isinstance(role, str):
            if role.startswith(f"{system_name}:"):
                return {'system': system_name, 'role': role.split(':', 1)[1]}
        return None


# Alias for backward compatibility
MicroserviceJWTAuthentication = JWTCookieAuthentication


def jwt_required(view_func):
    """Decorator to require JWT authentication for view functions"""
    def wrapper(request, *args, **kwargs):
        auth = JWTCookieAuthentication()
        try:
            user_auth = auth.authenticate(request)
            if user_auth is None:
                return JsonResponse(
                    {'error': 'Authentication required'}, 
                    status=status.HTTP_401_UNAUTHORIZED
                )
            
            user_data, token = user_auth
            request.user = user_data
            request.auth = token
            
            return view_func(request, *args, **kwargs)
            
        except AuthenticationFailed as e:
            return JsonResponse(
                {'error': str(e)}, 
                status=status.HTTP_403_FORBIDDEN
            )
    
    return wrapper