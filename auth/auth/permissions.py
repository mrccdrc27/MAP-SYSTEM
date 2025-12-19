from rest_framework import permissions
from system_roles.models import UserSystemRole
from roles.models import Role
from systems.models import System


class IsSystemAdminOrSuperUser(permissions.BasePermission):
    """
    Custom permission to allow:
    - Superusers to perform all CRUD operations on everything
    - System admins to perform CRUD operations only on their system's data
    """
    
    def has_permission(self, request, view):
        # Require authentication
        if not request.user or not request.user.is_authenticated:
            return False
        
        # Superusers have full access
        if request.user.is_superuser:
            return True
        
        # Check if user is a system admin
        return self._is_system_admin(request.user)
    
    def has_object_permission(self, request, view, obj):
        # Superusers have full access to all CRUD operations
        if request.user.is_superuser:
            return True
        
        # Get user's administered systems
        admin_systems = self._get_user_admin_systems(request.user)
        
        # For write operations (POST, PUT, PATCH, DELETE), be more restrictive
        is_write_operation = request.method in ['POST', 'PUT', 'PATCH', 'DELETE']
        
        # Check object access based on object type
        if hasattr(obj, 'system'):
            # Object belongs to a system (Role, UserSystemRole)
            system_access = obj.system in admin_systems
            
            # Additional restrictions for write operations on certain objects
            if is_write_operation and isinstance(obj, Role):
                # Only allow editing custom roles, not system default roles
                if not obj.is_custom and obj.name == 'Admin':
                    return False
            
            return system_access
            
        elif isinstance(obj, System):
            # System object itself
            system_access = obj in admin_systems
            
            # System admins can only read/update their systems, not delete
            if is_write_operation and request.method == 'DELETE':
                return False
            
            return system_access
            
        elif hasattr(obj, 'system_roles'):
            # User object - check if admin of any system the user belongs to
            user_systems = set(usr.system for usr in obj.system_roles.all())
            return bool(admin_systems.intersection(user_systems))
        
        return False
    
    def _is_system_admin(self, user):
        """Check if user is an admin of any system"""
        return UserSystemRole.objects.filter(
            user=user,
            role__name='Admin'
        ).exists()
    
    def _get_user_admin_systems(self, user):
        """Get all systems where user is an admin"""
        admin_roles = UserSystemRole.objects.filter(
            user=user,
            role__name='Admin'
        ).select_related('system')
        return set(role.system for role in admin_roles)


class IsSystemAdminOrSuperUserForSystem(permissions.BasePermission):
    """
    Permission for system-specific endpoints.
    Allows access if user is superuser or admin of the specific system.
    """
    
    def has_permission(self, request, view):
        if not request.user or not request.user.is_authenticated:
            return False
        
        if request.user.is_superuser:
            return True
        
        # Get system from URL parameters
        system_slug = view.kwargs.get('system_slug') or view.kwargs.get('pk')
        if not system_slug:
            return False
        
        try:
            system = System.objects.get(slug=system_slug)
            return UserSystemRole.objects.filter(
                user=request.user,
                system=system,
                role__name='Admin'
            ).exists()
        except System.DoesNotExist:
            return False


class CanCreateForSystem(permissions.BasePermission):
    """
    Permission to check if user can create objects for a specific system.
    Used for validating create operations before they happen.
    """
    
    def has_permission(self, request, view):
        if not request.user or not request.user.is_authenticated:
            return False
        
        if request.user.is_superuser:
            return True
        
        # For POST requests, check if user can create for the specified system
        if request.method == 'POST':
            system_id = request.data.get('system')
            if system_id:
                try:
                    system = System.objects.get(id=system_id)
                    return UserSystemRole.objects.filter(
                        user=request.user,
                        system=system,
                        role__name='Admin'
                    ).exists()
                except System.DoesNotExist:
                    return False
        
        # For other methods, fall back to basic admin check
        return UserSystemRole.objects.filter(
            user=request.user,
            role__name='Admin'
        ).exists()


def filter_queryset_by_system_access(queryset, user, system_field='system'):
    """
    Filter queryset based on user's system access.
    
    Args:
        queryset: The queryset to filter
        user: The requesting user
        system_field: The field name that relates to System model
    
    Returns:
        Filtered queryset
    """
    if user.is_superuser:
        return queryset
    
    # Get systems where user is admin
    admin_systems = UserSystemRole.objects.filter(
        user=user,
        role__name='Admin'
    ).values_list('system_id', flat=True)
    
    # Filter by systems user can access
    filter_kwargs = {f'{system_field}__in': admin_systems}
    return queryset.filter(**filter_kwargs)


def filter_users_by_system_access(queryset, user):
    """
    Filter user queryset based on requesting user's system access.
    
    Args:
        queryset: User queryset to filter
        user: The requesting user
    
    Returns:
        Filtered queryset
    """
    if user.is_superuser:
        return queryset
    
    # Get systems where requesting user is admin
    admin_systems = UserSystemRole.objects.filter(
        user=user,
        role__name='Admin'
    ).values_list('system_id', flat=True)
    
    # Return users who have roles in these systems
    return queryset.filter(
        system_roles__system__in=admin_systems
    ).distinct()
