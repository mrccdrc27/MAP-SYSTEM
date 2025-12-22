"""
BMS Permission Classes

This module provides flexible permission classes that work with the centralized
authentication system. Permissions can be configured at the view level using
class attributes.

Token structure from centralized auth:
{
    "roles": [
        {"system": "bms", "role": "ADMIN"},
        {"system": "bms", "role": "FINANCE_HEAD"},
        {"system": "tts", "role": "Agent"},
        ...
    ]
}

Usage Examples:
    # Simple BMS access check
    class MyView(APIView):
        permission_classes = [IsBMSUser]
    
    # Specific role check
    class MyView(APIView):
        permission_classes = [IsBMSAdmin]
    
    # Flexible system-role check
    class MyView(APIView):
        required_systems = ['bms']
        required_system_roles = {'bms': ['ADMIN', 'FINANCE_HEAD']}
        permission_classes = [SystemRolePermission]
"""
from rest_framework import permissions

# The service name slug for the Budget Management System
BMS_SERVICE_SLUG = 'bms'


class SystemRolePermission(permissions.BasePermission):
    """
    Flexible permission class that reads system and role requirements from view attributes.
    Compatible with centralized auth token structure.
    
    Usage on views:
    
    class MyView(APIView):
        # Allow any user with BMS system access
        required_systems = ['bms']
        
        # OR require specific roles in systems
        required_system_roles = {
            'bms': ['ADMIN', 'FINANCE_HEAD'],  # BMS ADMIN OR FINANCE_HEAD
        }
        
        # OR require ALL specified roles (AND logic)
        required_system_roles = {
            'bms': ['ADMIN'],
            'tts': ['Admin']
        }
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
                if not all(system in user_systems for system in required_systems):
                    return False
            else:
                # User must have access to ANY required system
                if not any(system in user_systems for system in required_systems):
                    return False
        
        # Check system-role requirements
        if required_system_roles:
            if require_all_systems:
                # User must have required roles in ALL specified systems
                for system, roles in required_system_roles.items():
                    if not any((system, role) in user_roles for role in roles):
                        return False
            else:
                # User must have required roles in ANY specified system
                has_any_required_role = False
                for system, roles in required_system_roles.items():
                    if any((system, role) in user_roles for role in roles):
                        has_any_required_role = True
                        break
                
                if not has_any_required_role:
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


class MultiSystemPermission(permissions.BasePermission):
    """
    Flexible permission class that can check access to one or more systems.
    Can be used in multiple ways:
    
    1. Allow any system access:
       permission_classes = [MultiSystemPermission]
    
    2. Require specific system(s):
       permission_classes = [MultiSystemPermission.require('bms')]
       permission_classes = [MultiSystemPermission.require(['bms', 'tts'])]
    
    3. Require specific role in system(s):
       permission_classes = [MultiSystemPermission.require_role('bms', 'ADMIN')]
       permission_classes = [MultiSystemPermission.require_roles([('bms', 'ADMIN'), ('bms', 'FINANCE_HEAD')])]
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
        if isinstance(self.required_roles, tuple) and len(self.required_roles) == 2 and isinstance(self.required_roles[0], str):
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
                has_systems = all(system in user_systems for system in self.required_systems)
            else:
                has_systems = any(system in user_systems for system in self.required_systems)
            
            if not has_systems:
                return False
        
        # Check role requirements
        if self.required_roles:
            if self.require_all:
                has_roles = all(
                    (system, role) in user_roles 
                    for system, role in self.required_roles
                )
            else:
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


# ============================================================================
# BMS-Specific Permission Classes (Using SystemRolePermission Pattern)
# ============================================================================

class IsBMSAdmin(permissions.BasePermission):
    """
    Permission check for BMS Administrator role.
    Admins have full access to all system features.
    """
    def has_permission(self, request, view):
        if not request.user or not hasattr(request.user, 'roles'):
            return False
        for role in request.user.roles:
            if isinstance(role, dict):
                if role.get('system') == BMS_SERVICE_SLUG and role.get('role') == 'ADMIN':
                    return True
            elif isinstance(role, str) and role == f"{BMS_SERVICE_SLUG}:ADMIN":
                return True
        return False


class IsBMSFinanceHead(permissions.BasePermission):
    """
    Permission check for BMS Finance Head role.
    Finance Heads can approve proposals, expenses, and allocations.
    They have global visibility across all departments.
    """
    def has_permission(self, request, view):
        if not request.user or not hasattr(request.user, 'roles'):
            return False
        for role in request.user.roles:
            if isinstance(role, dict):
                if role.get('system') == BMS_SERVICE_SLUG and role.get('role') == 'FINANCE_HEAD':
                    return True
            elif isinstance(role, str) and role == f"{BMS_SERVICE_SLUG}:FINANCE_HEAD":
                return True
        return False


class IsBMSDepartmentHead(permissions.BasePermission):
    """
    Permission check for Department Head role (GENERAL_USER).
    Department Heads can:
    - Submit proposals (for Finance approval)
    - Request budget adjustments (forwarded)
    - Submit expenses (for Finance approval)
    - View their own department's data only
    """
    def has_permission(self, request, view):
        if not request.user or not hasattr(request.user, 'roles'):
            return False
        for role in request.user.roles:
            if isinstance(role, dict):
                if role.get('system') == BMS_SERVICE_SLUG and role.get('role') == 'GENERAL_USER':
                    return True
            elif isinstance(role, str) and role == f"{BMS_SERVICE_SLUG}:GENERAL_USER":
                return True
        return False


class IsBMSUser(permissions.BasePermission):
    """
    Permission check for ANY valid BMS user.
    Allows: Admin, Finance Head, OR Department Head (GENERAL_USER).
    Use this for endpoints that all authenticated BMS users can access.
    """
    def has_permission(self, request, view):
        if not request.user or not hasattr(request.user, 'roles'):
            return False
        valid_roles = ['ADMIN', 'FINANCE_HEAD', 'GENERAL_USER']
        for role in request.user.roles:
            if isinstance(role, dict):
                if role.get('system') == BMS_SERVICE_SLUG and role.get('role') in valid_roles:
                    return True
            elif isinstance(role, str):
                for valid_role in valid_roles:
                    if role == f"{BMS_SERVICE_SLUG}:{valid_role}":
                        return True
        return False


class IsBMSFinanceHeadOrAdmin(permissions.BasePermission):
    """
    Permission for actions that require approval authority.
    Only Finance Heads and Admins can approve/reject proposals and expenses.
    """
    def has_permission(self, request, view):
        if not request.user or not hasattr(request.user, 'roles'):
            return False
        valid_roles = ['ADMIN', 'FINANCE_HEAD']
        for role in request.user.roles:
            if isinstance(role, dict):
                if role.get('system') == BMS_SERVICE_SLUG and role.get('role') in valid_roles:
                    return True
            elif isinstance(role, str):
                for valid_role in valid_roles:
                    if role == f"{BMS_SERVICE_SLUG}:{valid_role}":
                        return True
        return False


class CanSubmitForApproval(permissions.BasePermission):
    """
    Permission for submitting items that require Finance approval.
    Department Heads and above can submit.
    """
    def has_permission(self, request, view):
        if not request.user or not hasattr(request.user, 'roles'):
            return False
        valid_roles = ['ADMIN', 'FINANCE_HEAD', 'GENERAL_USER']
        for role in request.user.roles:
            if isinstance(role, dict):
                if role.get('system') == BMS_SERVICE_SLUG and role.get('role') in valid_roles:
                    return True
            elif isinstance(role, str):
                for valid_role in valid_roles:
                    if role == f"{BMS_SERVICE_SLUG}:{valid_role}":
                        return True
        return False


class CanViewGlobalData(permissions.BasePermission):
    """
    Permission for viewing data across all departments.
    Only Admins and Finance Heads have global visibility.
    Department Heads are restricted to their own department.
    """
    def has_permission(self, request, view):
        if not request.user or not hasattr(request.user, 'roles'):
            return False
        valid_roles = ['ADMIN', 'FINANCE_HEAD']
        for role in request.user.roles:
            if isinstance(role, dict):
                if role.get('system') == BMS_SERVICE_SLUG and role.get('role') in valid_roles:
                    return True
            elif isinstance(role, str):
                for valid_role in valid_roles:
                    if role == f"{BMS_SERVICE_SLUG}:{valid_role}":
                        return True
        return False


class IsTrustedService(permissions.BasePermission):
    """
    Allows access only to authenticated services (via API Key).
    Used for service-to-service communication (e.g., DTS, TTS).
    """
    def has_permission(self, request, view):
        from .service_authentication import ServicePrincipal
        
        return (request.user and
                request.user.is_authenticated and
                isinstance(request.user, ServicePrincipal) and
                request.user.service_name in ["DTS", "TTS", "HDS", "AMS"])


# ============================================================================
# Backward Compatibility - Legacy Permission Classes
# ============================================================================

class BMSSystemPermission(MultiSystemPermission):
    """Legacy BMS system permission - use MultiSystemPermission.require('bms') instead"""
    
    def __init__(self):
        super().__init__(required_systems=['bms'])