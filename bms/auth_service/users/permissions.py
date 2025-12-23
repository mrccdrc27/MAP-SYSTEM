from rest_framework import permissions


class IsFinanceHead(permissions.BasePermission):
   
    # Permission check for Finance Head role.
   
    def has_permission(self, request, view):
        return request.user.is_authenticated and request.user.role == 'FINANCE_HEAD'

class IsAdmin(permissions.BasePermission):
   
    # Permission check for Finance Operator role.
   
    def has_permission(self, request, view):
        return request.user.is_authenticated and request.user.role == 'ADMIN'
    
class IsFinanceOperator(permissions.BasePermission):
   
    # Permission check for Finance Operator role.
   
    def has_permission(self, request, view):
        return request.user.is_authenticated and request.user.role == 'FINANCE_OPERATOR'


class IsFinanceUser(permissions.BasePermission):
   
    # Permission check for any finance user (Head or Operator).
   
    def has_permission(self, request, view):
        return request.user.is_authenticated and request.user.role in ['FINANCE_HEAD', 'ADMIN']


class IsOwnerOrFinanceHead(permissions.BasePermission):

    # Object-level permission to allow owners of an object or finance heads to access it.
    # Assumes the model instance has a `created_by` or `submitted_by` attribute.
 
    def has_object_permission(self, request, view, obj):
        if request.user.role == 'FINANCE_HEAD':
            return True
            
        # Check if object has a user relationship field
        user_field = None
        if hasattr(obj, 'created_by'):
            user_field = 'created_by'
        elif hasattr(obj, 'submitted_by'):
            user_field = 'submitted_by'
        elif hasattr(obj, 'user'):
            user_field = 'user'
            
        if user_field is not None:
            return getattr(obj, user_field) == request.user
            
        return False