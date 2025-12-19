from rest_framework.permissions import BasePermission

try:
    from authentication import SystemRolePermission
except ImportError:
    # Fallback for cases where authentication module is not available
    class SystemRolePermission(BasePermission):
        """Fallback permission class"""
        def has_permission(self, request, view):
            return bool(request.user and getattr(request.user, 'is_authenticated', False))


class CommentPermission(BasePermission):
    """
    Custom permission class for comment operations
    """
    
    def has_permission(self, request, view):
        """Check basic authentication and system role permissions"""
        # Check basic authentication
        permission = SystemRolePermission()
        if not permission.has_permission(request, view):
            return False
        
        # Define system and role requirements for comments
        required_system_roles = {
            'tts': ['Admin', 'Agent', 'Budget Manager', 'Asset Manager'],
            'hdts': ['Employee', 'Ticket Coordinator', 'Admin']
        }
        
        # Check if user has required system roles
        return self._user_has_required_roles(request.user, required_system_roles)
    
    def has_object_permission(self, request, view, obj):
        """Check object-level permissions"""
        # For read operations, basic permission is enough
        if request.method in ['GET', 'HEAD', 'OPTIONS']:
            return True
        
        # For write operations on comments
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
            return False

        for system, roles in required_system_roles.items():
            for required_role in roles:
                for user_role in getattr(user, 'roles', []):
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
                        if str(sys_name).lower() == str(system).lower() and \
                           str(role_name).lower() == str(required_role).lower():
                            return True

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
        # Check if user is the original author
        is_author = obj.user_id == request.user.user_id
        
        # Check if user has admin role
        is_admin = (request.user.has_system_role('tts', 'Admin') or 
                   request.user.has_system_role('hdts', 'Admin'))
        
        return is_author or is_admin