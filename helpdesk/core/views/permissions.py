from rest_framework.permissions import BasePermission
from ..authentication import ExternalUser


# Permission classes
class IsSystemAdmin(BasePermission):
    def has_permission(self, request, view):
        return hasattr(request.user, 'role') and request.user.role == "System Admin"


class IsAdminOrSystemAdmin(BasePermission):
    """Permission class that allows both Admin and System Admin roles"""
    def has_permission(self, request, view):
        if not hasattr(request.user, 'role'):
            return False
        return request.user.role in ["Admin", "System Admin"]


class IsAdminOrCoordinator(BasePermission):
    """Permission class that allows Admin, System Admin, and Ticket Coordinator"""
    def has_permission(self, request, view):
        if not hasattr(request.user, 'role'):
            return False
        return request.user.role in ["Admin", "System Admin", "Ticket Coordinator"]


class IsEmployee(BasePermission):
    """Permission class for HDTS employees (JWT employees or local Employee objects)"""
    def has_permission(self, request, view):
        if not hasattr(request.user, 'is_authenticated') or not request.user.is_authenticated:
            return False
        
        # Allow ExternalUser with user_type='employee'
        if isinstance(request.user, ExternalUser):
            return getattr(request.user, 'user_type', None) == 'employee'
        
        # Allow local Employee objects
        from ..models import Employee
        return isinstance(request.user, Employee)


class IsEmployeeOrAdmin(BasePermission):
    """Permission class that allows employees and admins/coordinators"""
    def has_permission(self, request, view):
        if not hasattr(request.user, 'is_authenticated') or not request.user.is_authenticated:
            return False
        
        # Allow ExternalUser employees
        if isinstance(request.user, ExternalUser):
            user_type = getattr(request.user, 'user_type', None)
            role = getattr(request.user, 'role', None)
            return user_type == 'employee' or role in ["Admin", "System Admin", "Ticket Coordinator"]
        
        # Allow local Employee or admin staff
        from ..models import Employee
        if isinstance(request.user, Employee):
            return True
        
        # Allow staff/admin
        return request.user.is_staff or getattr(request.user, 'role', None) in ['System Admin', 'Ticket Coordinator', 'Admin']
