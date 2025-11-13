"""
Decorators for automatic audit logging in Django views and API endpoints.

Usage:
  - Apply decorator to views to auto-log actions
  - Logging happens automatically - no manual calls needed
  - Query audit logs via API endpoints
"""

from functools import wraps
from .utils import log_action, log_model_changes
import logging

logger = logging.getLogger(__name__)


def audit_action(action, get_target=None, get_changes=None, description=None):
    """
    Decorator to automatically log user actions in views.
    
    Args:
        action: Action type string (from AuditEvent.ACTION_CHOICES)
        get_target: Optional callable(request, view_result) -> target_object
        get_changes: Optional callable(request, view_result) -> changes_dict
        description: Optional callable(request, view_result) -> description_string
    
    Usage:
        # Simple usage
        @audit_action('create_workflow')
        def create_workflow(request):
            workflow = Workflow.objects.create(...)
            return response
        
        # With target extraction
        @audit_action(
            'update_workflow',
            get_target=lambda req, res: Workflow.objects.get(id=res.data['id'])
        )
        def update_workflow(request):
            ...
        
        # With changes extraction
        @audit_action(
            'update_workflow',
            get_changes=lambda req, res: res.data.get('changes')
        )
        def update_workflow(request):
            ...
    """
    def decorator(view_func):
        @wraps(view_func)
        def wrapper(request, *args, **kwargs):
            try:
                # Call the original view
                result = view_func(request, *args, **kwargs)
                
                # Extract user data
                user_data = _get_user_data(request)
                
                # Extract target if provided
                target = None
                if get_target:
                    try:
                        target = get_target(request, result)
                    except Exception as e:
                        logger.warning(f"Could not extract target: {e}")
                
                # Extract changes if provided
                changes = None
                if get_changes:
                    try:
                        changes = get_changes(request, result)
                    except Exception as e:
                        logger.warning(f"Could not extract changes: {e}")
                
                # Extract description if provided
                desc = None
                if description:
                    try:
                        if callable(description):
                            desc = description(request, result)
                        else:
                            desc = description
                    except Exception as e:
                        logger.warning(f"Could not extract description: {e}")
                
                # Log the action
                log_action(
                    user_data=user_data,
                    action=action,
                    target=target,
                    changes=changes,
                    description=desc,
                    request=request
                )
                
                return result
            
            except Exception as e:
                logger.error(f"Error in audit_action decorator: {e}", exc_info=True)
                # Don't let audit logging break the view
                return view_func(request, *args, **kwargs)
        
        return wrapper
    return decorator


def audit_model_changes(action, get_target=None, get_old_instance=None):
    """
    Decorator to automatically compare model instances and log changes.
    
    Args:
        action: Action type string
        get_target: Callable(request, view_result) -> target_object
        get_old_instance: Callable(request) -> old_instance for comparison
    
    Usage:
        @audit_model_changes(
            'update_workflow',
            get_target=lambda req, res: Workflow.objects.get(id=res.data['id']),
            get_old_instance=lambda req: Workflow.objects.get(id=req.data['id'])
        )
        def update_workflow(request):
            ...
    """
    def decorator(view_func):
        @wraps(view_func)
        def wrapper(request, *args, **kwargs):
            try:
                # Get old instance before modification
                old_instance = None
                if get_old_instance:
                    try:
                        old_instance = get_old_instance(request)
                    except Exception as e:
                        logger.warning(f"Could not get old instance: {e}")
                
                # Call the original view
                result = view_func(request, *args, **kwargs)
                
                # Only log if we have old instance to compare
                if old_instance:
                    user_data = _get_user_data(request)
                    
                    # Extract new instance
                    new_instance = None
                    if get_target:
                        try:
                            new_instance = get_target(request, result)
                        except Exception as e:
                            logger.warning(f"Could not extract target: {e}")
                    
                    # Log the changes
                    if new_instance:
                        log_model_changes(
                            user_data=user_data,
                            action=action,
                            old_instance=old_instance,
                            new_instance=new_instance,
                            request=request
                        )
                
                return result
            
            except Exception as e:
                logger.error(f"Error in audit_model_changes decorator: {e}", exc_info=True)
                return view_func(request, *args, **kwargs)
        
        return wrapper
    return decorator


def audit_required_action(action_type):
    """
    Decorator to mark that a view requires audit logging of a specific action.
    Use with care - this is more of a marker for documentation/testing.
    
    The actual logging should be done in the view itself.
    """
    def decorator(view_func):
        view_func._audit_action = action_type
        return view_func
    return decorator


def _get_user_data(request):
    """
    Extract user data from request.
    Handles both Django User and AuthenticatedUser from JWT.
    """
    user = getattr(request, 'user', None)
    
    if not user:
        return {'user_id': None, 'username': 'Anonymous', 'email': ''}
    
    # Handle AuthenticatedUser from JWT
    if hasattr(user, 'user_id'):
        return {
            'user_id': user.user_id,
            'username': getattr(user, 'username', ''),
            'email': getattr(user, 'email', ''),
        }
    
    # Handle Django User model
    if hasattr(user, 'id'):
        return {
            'user_id': user.id,
            'username': getattr(user, 'username', ''),
            'email': getattr(user, 'email', ''),
        }
    
    return {'user_id': None, 'username': 'Unknown', 'email': ''}
