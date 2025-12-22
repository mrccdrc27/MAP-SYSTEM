import jwt
from django.conf import settings
from django.http import JsonResponse
from rest_framework.authentication import BaseAuthentication
from rest_framework.exceptions import AuthenticationFailed
from rest_framework.permissions import BasePermission
from rest_framework import status
import logging

logger = logging.getLogger(__name__)


class JWTCookieAuthentication(BaseAuthentication):
    """
    JWT authentication via cookies or Authorization header with system-level authorization
    """
    
    def authenticate(self, request):
        # Try to get JWT token from Authorization header first (Bearer token)
        auth_header = request.headers.get('Authorization', '')
        logger.debug(f"Auth header received: {auth_header[:50] if auth_header else 'None'}...")
        
        if auth_header.startswith('Bearer '):
            token = auth_header[7:]  # Remove 'Bearer ' prefix
            logger.debug(f"Token from header (first 50 chars): {token[:50]}...")
        else:
            # Fall back to cookies
            token = request.COOKIES.get('access_token')
            logger.debug(f"Token from cookie: {'present' if token else 'None'}")
        
        if not token:
            logger.debug("No token found - returning None")
            return None
            
        try:
            # Log the signing key being used (first few chars only for security)
            signing_key = settings.JWT_SIGNING_KEY
            logger.debug(f"Using JWT_SIGNING_KEY (first 10 chars): {signing_key[:10] if signing_key else 'None'}...")
            
            # Decode JWT token
            payload = jwt.decode(
                token, 
                signing_key, 
                algorithms=['HS256']
            )
            
            logger.debug(f"Token decoded successfully. Payload keys: {list(payload.keys())}")
            logger.debug(f"User ID: {payload.get('user_id')}, Roles: {payload.get('roles')}")
            
            # Extract user information from JWT payload
            user_id = payload.get('user_id')
            email = payload.get('email')
            username = payload.get('username')
            full_name = payload.get('full_name')
            roles = payload.get('roles', [])
            
            if not user_id:
                raise AuthenticationFailed('Invalid token: missing user_id')
            
            # Create a simple user object to store in request
            user_data = {
                'id': user_id,
                'user_id': user_id,
                'email': email,
                'username': username,
                'full_name': full_name,
                'roles': roles,
                'tts_roles': [self._extract_role_if_system(role, 'tts') for role in roles 
                             if self._extract_role_if_system(role, 'tts')]
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
            # Handle string format like "tts:admin" or "hdts:user"
            if role.startswith(f"{system_name}:"):
                return {'system': system_name, 'role': role.split(':', 1)[1]}
        return None


class SystemRolePermission(BasePermission):
    """
    Flexible permission class that reads system and role requirements from view attributes.
    
    Usage on views:
    
    class MyView(APIView):
        # Allow any user with TTS system access
        required_systems = ['tts']
        
        # OR require specific roles in systems
        required_system_roles = {
            'tts': ['admin', 'agent'],     # TTS admin OR agent
            'hdts': ['employee']           # OR HDTS employee
        }
        
        # OR require ALL specified roles (AND logic)
        required_system_roles = {
            'tts': ['admin'],
            'hdts': ['employee']
        }
        require_all_systems = True  # User must have access to ALL systems
        
        permission_classes = [SystemRolePermission]
    """
    
    def has_permission(self, request, view):
        # Check if user is authenticated
        if not hasattr(request, 'user') or not request.user:
            return False
            
        # If user doesn't have is_authenticated attribute or it's False, deny access
        if not getattr(request.user, 'is_authenticated', False):
            return False
            
        # If user doesn't have roles, deny access
        if not hasattr(request.user, 'roles') or not request.user.roles:
            return False
        
        # Get view's permission requirements - if view is None (function-based view), allow access for authenticated users
        if view is None:
            return True
            
        required_systems = getattr(view, 'required_systems', [])
        required_system_roles = getattr(view, 'required_system_roles', {})
        require_all_systems = getattr(view, 'require_all_systems', False)
        
        # If no requirements specified, allow any authenticated user with roles
        if not required_systems and not required_system_roles:
            return True
        
        user_systems = self._get_user_systems(request.user.roles)
        user_roles = self._get_user_roles(request.user.roles)
        
        # Debug logging
        logger.debug(f"User systems: {user_systems}")
        logger.debug(f"User roles: {user_roles}")
        logger.debug(f"Required systems: {required_systems}")
        logger.debug(f"Required system roles: {required_system_roles}")
        
        # Check simple system access requirements
        if required_systems:
            if require_all_systems:
                # User must have access to ALL required systems
                if not all(system in user_systems for system in required_systems):
                    logger.debug(f"User missing required systems")
                    return False
            else:
                # User must have access to ANY required system
                if not any(system in user_systems for system in required_systems):
                    logger.debug(f"User has no access to any required systems")
                    return False
        
        # Check system-role requirements
        if required_system_roles:
            if require_all_systems:
                # User must have required roles in ALL specified systems
                for system, roles in required_system_roles.items():
                    if not any((system, role.lower()) in user_roles for role in roles):
                        logger.debug(f"User missing required role in system {system}")
                        return False
            else:
                # User must have required roles in ANY specified system
                has_any_required_role = False
                for system, roles in required_system_roles.items():
                    if any((system, role.lower()) in user_roles for role in roles):
                        has_any_required_role = True
                        break
                
                if not has_any_required_role:
                    logger.debug(f"User has no required roles in any system")
                    return False
        
        logger.debug(f"Permission granted")
        return True
    
    def has_object_permission(self, request, view, obj):
        return self.has_permission(request, view)
    
    def _get_user_systems(self, roles):
        """Extract all systems the user has access to"""
        systems = set()
        for role in roles:
            if isinstance(role, dict) and 'system' in role:
                systems.add(role['system'].lower())
            elif isinstance(role, str) and ':' in role:
                system = role.split(':', 1)[0]
                systems.add(system.lower())
        return systems
    
    def _get_user_roles(self, roles):
        """Extract all (system, role) combinations the user has"""
        user_roles = set()
        for role in roles:
            if isinstance(role, dict) and 'system' in role and 'role' in role:
                user_roles.add((role['system'].lower(), role['role'].lower()))
            elif isinstance(role, str) and ':' in role:
                parts = role.split(':', 1)
                if len(parts) == 2:
                    user_roles.add((parts[0].lower(), parts[1].lower()))
        return user_roles


class MultiSystemPermission(BasePermission):
    """
    Flexible permission class that can check access to one or more systems.
    Can be used in multiple ways:
    
    1. Allow any system access:
       permission_classes = [MultiSystemPermission]
    
    2. Require specific system(s):
       permission_classes = [MultiSystemPermission.require('tts')]
       permission_classes = [MultiSystemPermission.require(['tts', 'hdts'])]
    
    3. Require specific role in system(s):
       permission_classes = [MultiSystemPermission.require_role('tts', 'admin')]
       permission_classes = [MultiSystemPermission.require_roles([('tts', 'admin'), ('hdts', 'user')])]
    """
    
    def __init__(self, required_systems=None, required_roles=None, require_all=False):
        """
        Initialize permission checker
        
        Args:
            required_systems: List of system names that user must have access to
            required_roles: List of (system, role) tuples that user must have
            require_all: If True, user must have ALL specified systems/roles. If False, ANY will suffice
        """
        self.required_systems = required_systems or []
        self.required_roles = required_roles or []
        self.require_all = require_all
        
        # Convert single values to lists for uniform processing
        if isinstance(self.required_systems, str):
            self.required_systems = [self.required_systems]
        if isinstance(self.required_roles, tuple):
            self.required_roles = [self.required_roles]
    
    @classmethod
    def require(cls, systems, require_all=False):
        """
        Create permission that requires access to specific system(s)
        
        Args:
            systems: Single system name or list of system names
            require_all: If True, user must have access to ALL systems. If False, ANY system suffices
        """
        return cls(required_systems=systems, require_all=require_all)
    
    @classmethod
    def require_role(cls, system, role):
        """Create permission that requires specific role in a system"""
        return cls(required_roles=[(system, role)])
    
    @classmethod
    def require_roles(cls, roles, require_all=False):
        """
        Create permission that requires specific roles
        
        Args:
            roles: List of (system, role) tuples
            require_all: If True, user must have ALL roles. If False, ANY role suffices
        """
        return cls(required_roles=roles, require_all=require_all)
    
    def has_permission(self, request, view):
        if not request.user or not hasattr(request.user, 'roles'):
            return False
        
        user_systems = self._get_user_systems(request.user.roles)
        user_roles = self._get_user_roles(request.user.roles)
        
        # If no specific requirements, just check if user has any system access
        if not self.required_systems and not self.required_roles:
            return len(user_systems) > 0
        
        # Check system requirements
        if self.required_systems:
            if self.require_all:
                # User must have access to ALL required systems
                has_systems = all(system in user_systems for system in self.required_systems)
            else:
                # User must have access to ANY required system
                has_systems = any(system in user_systems for system in self.required_systems)
            
            if not has_systems:
                return False
        
        # Check role requirements
        if self.required_roles:
            if self.require_all:
                # User must have ALL required roles
                has_roles = all(
                    (system, role) in user_roles 
                    for system, role in self.required_roles
                )
            else:
                # User must have ANY required role
                has_roles = any(
                    (system, role) in user_roles 
                    for system, role in self.required_roles
                )
            
            if not has_roles:
                return False
        
        return True
    
    def has_object_permission(self, request, view, obj):
        return self.has_permission(request, view)
    
    def _get_user_systems(self, roles):
        """Extract all systems the user has access to"""
        systems = set()
        for role in roles:
            if isinstance(role, dict) and 'system' in role:
                systems.add(role['system'])
            elif isinstance(role, str) and ':' in role:
                system = role.split(':', 1)[0]
                systems.add(system)
        return systems
    
    def _get_user_roles(self, roles):
        """Extract all (system, role) combinations the user has"""
        user_roles = set()
        for role in roles:
            if isinstance(role, dict) and 'system' in role and 'role' in role:
                user_roles.add((role['system'], role['role']))
            elif isinstance(role, str) and ':' in role:
                parts = role.split(':', 1)
                if len(parts) == 2:
                    user_roles.add((parts[0], parts[1]))
        return user_roles


# Backward compatibility - keep the old permission classes
class TTSSystemPermission(MultiSystemPermission):
    """Legacy TTS system permission - use MultiSystemPermission.require('tts') instead"""
    
    def __init__(self):
        super().__init__(required_systems=['tts'])

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


class AuthenticatedUser:
    """
    Simple user class to store authenticated user data
    """
    def __init__(self, user_data):
        self.id = user_data.get('id')
        self.user_id = user_data.get('user_id')
        self.email = user_data.get('email')
        self.username = user_data.get('username')
        self.full_name = user_data.get('full_name')  # Add full_name attribute
        self.roles = user_data.get('roles', [])
        self.tts_roles = user_data.get('tts_roles', [])
        self.is_authenticated = True
    
    def has_tts_role(self, role_name):
        """Check if user has specific TTS role"""
        return any(
            self._get_role_name(role) == role_name 
            for role in self.tts_roles
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
    
    def get_systems(self):
        """Get list of all systems user has access to"""
        systems = set()
        for role in self.roles:
            system = self._get_system_name(role)
            if system:
                systems.add(system)
        return list(systems)
    
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