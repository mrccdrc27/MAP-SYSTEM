from rest_framework.permissions import BasePermission
from authentication import SystemRolePermission


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
        """Check if user has any of the required system roles"""
        for system, roles in required_system_roles.items():
            for role in roles:
                if user.has_system_role(system, role):
                    return True
        return False
    
    def _user_is_admin(self, user):
        """Check if user has admin privileges"""
        return (user.has_system_role('tts', 'Admin') or 
                user.has_system_role('hdts', 'Admin'))


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