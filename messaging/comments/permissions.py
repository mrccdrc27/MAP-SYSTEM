from rest_framework.permissions import BasePermission
import logging

logger = logging.getLogger(__name__)


class CommentPermission(BasePermission):
    """
    Custom permission class for comment operations
    """
    
    def has_permission(self, request, view):
        """Check basic authentication and system role permissions"""
        # Check if user is authenticated
        if not hasattr(request, 'user') or not request.user:
            print(f"[CommentPermission] DENIED: No user in request")
            return False
            
        if not getattr(request.user, 'is_authenticated', False):
            print(f"[CommentPermission] DENIED: User not authenticated")
            return False
        
        # Check if user has roles
        if not hasattr(request.user, 'roles') or not request.user.roles:
            print(f"[CommentPermission] DENIED: User {getattr(request.user, 'user_id', 'unknown')} has no roles")
            return False
        
        # Define system and role requirements for comments
        required_system_roles = {
            'tts': ['Admin', 'Agent', 'Budget Manager', 'Asset Manager'],
            'hdts': ['Employee', 'Ticket Coordinator', 'Admin']
        }
        
        # Check if user has required system roles
        has_permission = self._user_has_required_roles(request.user, required_system_roles)
        
        if has_permission:
            print(f"[CommentPermission] GRANTED for user {getattr(request.user, 'user_id', 'unknown')}")
        else:
            print(f"[CommentPermission] DENIED: User {getattr(request.user, 'user_id', 'unknown')} with roles {request.user.roles} does not have required roles")
        
        return has_permission
    
    def has_object_permission(self, request, view, obj):
        """Check object-level permissions"""
        # For read operations, basic permission is enough
        if request.method in ['GET', 'HEAD', 'OPTIONS']:
            return True
        
        # For actions that any authenticated user with basic permission can do
        # (like rating a comment or replying to it)
        action = getattr(view, 'action', None)
        if action in ['rate', 'reply']:
            print(f"[CommentPermission] has_object_permission: Allowing '{action}' action for user {getattr(request.user, 'user_id', 'unknown')}")
            return True
        
        # For write operations on comments (update/delete)
        if hasattr(obj, 'user_id'):
            # Author can always modify their own comments
            if obj.user_id == request.user.user_id:
                return True
            
            # Admins can modify any comments
            return self._user_is_admin(request.user)
        
        return False
    
    def _user_has_required_roles(self, user, required_system_roles):
        """Check if user has any of the required system roles.

        Compare system and role names case-insensitively and support both
        dict and string role representations from the JWT payload.
        """
        if not user or not getattr(user, 'roles', None):
            print("[CommentPermission] _user_has_required_roles: No user or no roles")
            return False

        user_roles = getattr(user, 'roles', [])
        print(f"[CommentPermission] Checking user roles: {user_roles}")

        for system, roles in required_system_roles.items():
            for required_role in roles:
                for user_role in user_roles:
                    # Normalize system and role names from different formats
                    sys_name = None
                    role_name = None
                    if isinstance(user_role, dict):
                        sys_name = user_role.get('system')
                        role_name = user_role.get('role')
                    elif isinstance(user_role, str) and ':' in user_role:
                        parts = user_role.split(':', 1)
                        sys_name = parts[0]
                        role_name = parts[1]

                    if sys_name and role_name:
                        sys_lower = str(sys_name).lower()
                        role_lower = str(role_name).lower()
                        system_lower = str(system).lower()
                        required_lower = str(required_role).lower()
                        
                        if sys_lower == system_lower and role_lower == required_lower:
                            print(f"[CommentPermission] Match found: {sys_name}:{role_name}")
                            return True

        print(f"[CommentPermission] No matching role found")
        return False
    
    def _user_is_admin(self, user):
        """Check if user has admin privileges"""
        # Use case-insensitive checks in case token stores roles in different casing
        if not user or not getattr(user, 'roles', None):
            return False

        for user_role in getattr(user, 'roles', []):
            sys_name = None
            role_name = None
            if isinstance(user_role, dict):
                sys_name = user_role.get('system')
                role_name = user_role.get('role')
            elif isinstance(user_role, str) and ':' in user_role:
                parts = user_role.split(':', 1)
                sys_name = parts[0]
                role_name = parts[1]

            if sys_name and role_name:
                if str(sys_name).lower() in ('tts', 'hdts') and str(role_name).lower() == 'admin':
                    return True

        return False


class CommentOwnerOrAdminPermission(BasePermission):
    """
    Permission class that allows access to comment owners or admins
    """
    
    def has_object_permission(self, request, view, obj):
        # Check if user is authenticated
        if not request.user or not getattr(request.user, 'is_authenticated', False):
            return False
        
        # Check if user is the original author
        is_author = str(obj.user_id) == str(getattr(request.user, 'user_id', None))
        
        # Check if user has admin role using the helper method
        is_admin = self._user_is_admin(request.user)
        
        return is_author or is_admin
    
    def _user_is_admin(self, user):
        """Check if user has admin privileges"""
        # Use case-insensitive checks in case token stores roles in different casing
        if not user or not getattr(user, 'roles', None):
            return False

        for user_role in getattr(user, 'roles', []):
            sys_name = None
            role_name = None
            if isinstance(user_role, dict):
                sys_name = user_role.get('system')
                role_name = user_role.get('role')
            elif isinstance(user_role, str) and ':' in user_role:
                parts = user_role.split(':', 1)
                sys_name = parts[0]
                role_name = parts[1]

            if sys_name and role_name:
                if str(sys_name).lower() in ('tts', 'hdts') and str(role_name).lower() == 'admin':
                    return True

        return False