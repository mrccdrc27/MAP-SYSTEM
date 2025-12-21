from rest_framework import permissions

# The service name slug for the Budget Management System
BMS_SERVICE_SLUG = 'bms' 

class IsBMSAdmin(permissions.BasePermission):
    """
    Permission check for BMS Administrator role.
    Admins have full access to all system features.
    """
    def has_permission(self, request, view):
        user_roles = getattr(request.user, 'roles', {})
        bms_role = user_roles.get(BMS_SERVICE_SLUG)
        return bms_role == 'ADMIN'


class IsBMSFinanceHead(permissions.BasePermission):
    """
    Permission check for BMS Finance Head role.
    Finance Heads can approve proposals, expenses, and allocations.
    They have global visibility across all departments.
    """
    def has_permission(self, request, view):
        user_roles = getattr(request.user, 'roles', {})
        bms_role = user_roles.get(BMS_SERVICE_SLUG)
        return bms_role == 'FINANCE_HEAD'


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
        user_roles = getattr(request.user, 'roles', {})
        bms_role = user_roles.get(BMS_SERVICE_SLUG)
        return bms_role == 'GENERAL_USER'


class IsBMSUser(permissions.BasePermission):
    """
    Permission check for ANY valid BMS user.
    Allows: Admin, Finance Head, OR Department Head (GENERAL_USER).
    Use this for endpoints that all authenticated BMS users can access.
    """
    def has_permission(self, request, view):
        user_roles = getattr(request.user, 'roles', {})
        bms_role = user_roles.get(BMS_SERVICE_SLUG)
        return bms_role in ['ADMIN', 'FINANCE_HEAD', 'GENERAL_USER']


class IsBMSFinanceHeadOrAdmin(permissions.BasePermission):
    """
    Permission for actions that require approval authority.
    Only Finance Heads and Admins can approve/reject proposals and expenses.
    """
    def has_permission(self, request, view):
        user_roles = getattr(request.user, 'roles', {})
        bms_role = user_roles.get(BMS_SERVICE_SLUG)
        return bms_role in ['ADMIN', 'FINANCE_HEAD']


class CanSubmitForApproval(permissions.BasePermission):
    """
    Permission for submitting items that require Finance approval.
    Department Heads and above can submit.
    """
    def has_permission(self, request, view):
        user_roles = getattr(request.user, 'roles', {})
        bms_role = user_roles.get(BMS_SERVICE_SLUG)
        return bms_role in ['ADMIN', 'FINANCE_HEAD', 'GENERAL_USER']


class CanViewGlobalData(permissions.BasePermission):
    """
    Permission for viewing data across all departments.
    Only Admins and Finance Heads have global visibility.
    Department Heads are restricted to their own department.
    """
    def has_permission(self, request, view):
        user_roles = getattr(request.user, 'roles', {})
        bms_role = user_roles.get(BMS_SERVICE_SLUG)
        return bms_role in ['ADMIN', 'FINANCE_HEAD']


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
                request.user.service_name in ["DTS", "TTS"])