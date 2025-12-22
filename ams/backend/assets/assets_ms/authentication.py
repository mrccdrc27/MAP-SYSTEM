# assets_ms/authentication.py
"""
JWT Authentication for AMS Assets Service.

This module provides JWT authentication that is compatible with the centralized
auth service. It supports both cookie-based auth (for browser requests) and
header-based auth (for API requests with Bearer token).

The token structure from centralized auth contains:
{
    "user_id": int,
    "email": str,
    "username": str,
    "full_name": str,
    "roles": [
        {"system": "ams", "role": "Admin"},
        {"system": "tts", "role": "Agent"},
        ...
    ]
}
"""
import jwt
import logging
from django.conf import settings
from django.http import JsonResponse
from rest_framework.authentication import BaseAuthentication
from rest_framework.exceptions import AuthenticationFailed
from rest_framework.permissions import BasePermission
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
        self.ams_roles = user_data.get('ams_roles', [])
        self.is_authenticated = True
        
        # Additional fields that may be in the token
        self.department_id = user_data.get('department_id')
        self.department_name = user_data.get('department_name')
        
        # Standard Django properties
        self.is_active = True
        self.is_staff = False
        self.is_superuser = False
        
        # Build roles_dict for backward compatibility
        self._roles_dict = self._build_roles_dict()
    
    def _build_roles_dict(self):
        """
        Build a dictionary mapping system to role for backward compatibility.
        Converts array format [{"system": "ams", "role": "Admin"}] to {"ams": "Admin"}
        """
        roles_dict = {}
        for role in self.roles:
            system = self._get_system_name(role)
            role_name = self._get_role_name(role)
            if system and role_name:
                roles_dict[system] = role_name
        return roles_dict
    
    def get_role_for_system(self, system_name):
        """Get the role name for a specific system."""
        return self._roles_dict.get(system_name)
    
    def has_ams_role(self, role_name):
        """Check if user has specific AMS role"""
        return any(
            self._get_role_name(role) == role_name 
            for role in self.ams_roles
        )
    
    def has_system_access(self, system_name):
        """Check if user has access to a specific system"""
        return any(
            self._get_system_name(role) == system_name
            for role in self.roles
        )
    
    def has_system_role(self, system_name, role_name):
        """Check if user has a specific role in a specific system"""
        for role in self.roles:
            if (self._get_system_name(role) == system_name and 
                self._get_role_name(role) == role_name):
                return True
        return False
    
    def get_ams_role(self):
        """Get the user's AMS role (returns first AMS role found)"""
        for role in self.roles:
            if self._get_system_name(role) == 'ams':
                return self._get_role_name(role)
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
    Supports both cookie-based auth (for browser requests with credentials) and 
    header-based auth (for API requests with Bearer token).
    
    This is compatible with the centralized auth service token structure.
    """
    
    def authenticate(self, request):
        # Try to get JWT token from cookies first
        token = request.COOKIES.get('access_token')
        
        # If not in cookies, try Authorization header (Bearer token)
        if not token:
            auth_header = request.headers.get('Authorization', '')
            if auth_header.startswith('Bearer '):
                token = auth_header[7:]  # Remove 'Bearer ' prefix
        
        if not token:
            return None
            
        try:
            # Decode JWT token using the shared signing key
            payload = jwt.decode(
                token, 
                settings.JWT_SIGNING_KEY, 
                algorithms=['HS256']
            )
            
            # Extract user information
            user_id = payload.get('user_id')
            email = payload.get('email')
            username = payload.get('username')
            full_name = payload.get('full_name', '')
            roles = payload.get('roles', [])
            
            if not user_id:
                raise AuthenticationFailed('Invalid token: missing user_id')
            
            # Create a user object to store in request
            user_data = {
                'id': user_id,
                'user_id': user_id,
                'email': email,
                'username': username,
                'full_name': full_name,
                'roles': roles,
                'ams_roles': [self._extract_role_if_system(role, 'ams') for role in roles 
                             if self._extract_role_if_system(role, 'ams')],
                'department_id': payload.get('department_id'),
                'department_name': payload.get('department_name'),
            }
            
            return (AuthenticatedUser(user_data), token)
            
        except jwt.ExpiredSignatureError:
            raise AuthenticationFailed('Token has expired')
        except jwt.InvalidTokenError:
            raise AuthenticationFailed('Invalid token')
        except Exception as e:
            logger.error(f"Authentication error: {str(e)}")
            raise AuthenticationFailed('Authentication failed')
    
    def _extract_role_if_system(self, role, system_name):
        """Safely extract role if it matches the system, handling both dict and string formats"""
        if isinstance(role, dict):
            return role if role.get('system') == system_name else None
        elif isinstance(role, str):
            # Handle string format like "ams:Admin" or "tts:user"
            if role.startswith(f"{system_name}:"):
                return {'system': system_name, 'role': role.split(':', 1)[1]}
        return None


class AMSSystemPermission(BasePermission):
    """
    Permission class that requires user to have AMS system access.
    """
    
    def has_permission(self, request, view):
        if not request.user or not hasattr(request.user, 'roles'):
            return False
        
        return request.user.has_system_access('ams')


class AMSAdminPermission(BasePermission):
    """
    Permission class that requires user to have AMS Admin role.
    """
    
    def has_permission(self, request, view):
        if not request.user or not hasattr(request.user, 'roles'):
            return False
        
        return request.user.has_system_role('ams', 'Admin')


class AMSOperatorOrAdminPermission(BasePermission):
    """
    Permission class that allows AMS Admin or Operator roles.
    """
    
    def has_permission(self, request, view):
        if not request.user or not hasattr(request.user, 'roles'):
            return False
        
        return (request.user.has_system_role('ams', 'Admin') or 
                request.user.has_system_role('ams', 'Operator'))


class SystemRolePermission(BasePermission):
    """
    Flexible permission class that reads system and role requirements from view attributes.
    
    Usage on views:
    
    class MyView(APIView):
        # Allow any user with AMS system access
        required_systems = ['ams']
        
        # OR require specific roles in systems
        required_system_roles = {
            'ams': ['Admin', 'Operator'],  # AMS Admin OR Operator
        }
        
        # OR require ALL specified roles (AND logic)
        require_all_systems = True  # User must have access to ALL systems
        
        permission_classes = [SystemRolePermission]
    """
    
    def has_permission(self, request, view):
        if not request.user or not hasattr(request.user, 'roles'):
            return False
        
        # Get view's permission requirements
        required_systems = getattr(view, 'required_systems', [])
        required_system_roles = getattr(view, 'required_system_roles', {})
        require_all_systems = getattr(view, 'require_all_systems', False)
        
        # If no requirements specified, allow any authenticated user
        if not required_systems and not required_system_roles:
            return True
        
        user_systems = self._get_user_systems(request.user.roles)
        user_roles = self._get_user_roles(request.user.roles)
        
        # Check simple system access requirements
        if required_systems:
            if require_all_systems:
                # User must have access to ALL required systems
                if not all(sys in user_systems for sys in required_systems):
                    return False
            else:
                # User must have access to at least ONE required system
                if not any(sys in user_systems for sys in required_systems):
                    return False
        
        # Check system-role requirements
        if required_system_roles:
            matches = []
            for system, allowed_roles in required_system_roles.items():
                for role in allowed_roles:
                    if (system, role) in user_roles:
                        matches.append(True)
                        break
            
            if require_all_systems:
                # Must match ALL system requirements
                if len(matches) < len(required_system_roles):
                    return False
            else:
                # Must match at least ONE system requirement
                if not matches:
                    return False
        
        return True
    
    def has_object_permission(self, request, view, obj):
        return self.has_permission(request, view)
    
    def _get_user_systems(self, roles):
        """Extract all systems the user has access to"""
        systems = set()
        for role in roles:
            if isinstance(role, dict):
                systems.add(role.get('system'))
            elif isinstance(role, str) and ':' in role:
                systems.add(role.split(':', 1)[0])
        return systems
    
    def _get_user_roles(self, roles):
        """Extract all (system, role) combinations the user has"""
        user_roles = set()
        for role in roles:
            if isinstance(role, dict):
                user_roles.add((role.get('system'), role.get('role')))
            elif isinstance(role, str) and ':' in role:
                parts = role.split(':', 1)
                user_roles.add((parts[0], parts[1]))
        return user_roles


def jwt_required(view_func):
    """
    Decorator to require JWT authentication for view functions
    """
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
