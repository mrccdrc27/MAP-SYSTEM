"""
Internal audit logging utilities - automatically tracks user actions.

Usage:
  - Use decorators on views/services to auto-log actions
  - Query logs via API endpoints to RETRIEVE logs (no POST needed)

NO external POST requests to create logs - logging is transparent!
"""

from .models import AuditEvent, AuditLog
from django.utils.timezone import now
import logging

logger = logging.getLogger(__name__)


def log_action(user_data, action, target=None, changes=None, 
               description=None, request=None):
    """
    INTERNAL: Log a user action with optional change tracking.
    Call this from within your business logic when an action occurs.
    
    Args:
        user_data: Dict with user_id, username, email (from JWT/request.user)
        action: Action type string (from AuditEvent.ACTION_CHOICES)
        target: Optional target object (model instance)
        changes: Optional dict of changes {field: {old: val, new: val}}
        description: Optional human-readable description
        request: Optional Django request object for IP/user-agent
    
    Returns:
        AuditEvent instance (saved to DB automatically)
    
    Examples:
        # In your service layer or view
        def create_workflow(user_data, workflow_data, request=None):
            workflow = Workflow.objects.create(**workflow_data)
            
            # Log the action internally
            log_action(
                user_data=user_data,
                action='create_workflow',
                target=workflow,
                description="Created new workflow"
            )
            
            return workflow
        
        # With change tracking
        def update_workflow(user_data, workflow_id, updates, request=None):
            workflow = Workflow.objects.get(id=workflow_id)
            old_name = workflow.name
            
            for field, value in updates.items():
                setattr(workflow, field, value)
            workflow.save()
            
            log_action(
                user_data=user_data,
                action='update_workflow',
                target=workflow,
                changes={'name': {'old': old_name, 'new': workflow.name}},
                request=request
            )
            
            return workflow
    """
    try:
        # Ensure user_data is dict-like
        user_dict = _ensure_user_dict(user_data)
        logger.info(f"📝 Audit: Starting log_action for action='{action}', user={user_dict.get('username')}, target={type(target).__name__ if target else 'None'}")
        
        # Create audit event
        event = AuditEvent.create_from_changes(
            user_data=user_dict,
            action=action,
            target=target,
            changes=changes,
            description=description,
            request=request
        )
        
        # Save to database
        event.save()
        logger.info(f"✅ Audit: Successfully logged action '{action}' (ID: {event.id}) by {user_dict.get('username')}")
        
        return event
    
    except Exception as e:
        logger.error(f"❌ Audit: Error logging action '{action}': {str(e)}", exc_info=True)
        import traceback
        traceback.print_exc()
        return None


def log_simple_action(user_data, action, entity_type=None, entity_id=None, 
                     details=None):
    """
    INTERNAL: Log a simple action without structured change tracking.
    Uses AuditLog model for lightweight logging.
    
    Call from within your business logic.
    """
    try:
        user_dict = _ensure_user_dict(user_data)
        
        log = AuditLog.objects.create(
            user_id=user_dict.get('user_id'),
            username=user_dict.get('username'),
            action=action,
            entity_type=entity_type,
            entity_id=entity_id,
            details=details,
            timestamp=now()
        )
        
        logger.debug(f"Logged simple action: {action}")
        return log
    
    except Exception as e:
        logger.error(f"Error logging simple action {action}: {str(e)}")
        return None


def get_change_dict(field_name, old_value, new_value):
    """
    Helper to create a change dict for a single field.
    
    Returns:
        Dict suitable for changes parameter: {field_name: {old: val, new: val}}
    
    Example:
        changes = get_change_dict('status', 'draft', 'published')
    """
    return {field_name: {'old': old_value, 'new': new_value}}


def compare_models(old_instance, new_instance, fields=None, exclude=None):
    """
    Compare two model instances and generate a changes dict.
    
    Useful for auto-detecting what changed between versions.
    
    Args:
        old_instance: Original instance
        new_instance: Updated instance
        fields: List of field names to compare (if None, compares all)
        exclude: List of field names to exclude from comparison
    
    Returns:
        Dict of changes: {field: {old: val, new: val}, ...}
    
    Example:
        workflow = Workflow.objects.get(id=1)
        old_workflow = deepcopy(workflow)  # Save before changes
        workflow.name = "New Name"
        workflow.save()
        
        changes = compare_models(old_workflow, workflow)
        log_action(user_data, 'update_workflow', target=workflow, changes=changes)
    """
    changes = {}
    exclude = exclude or ['created_at', 'updated_at', 'id', 'pk']
    
    # Get all field names if not specified
    if fields is None:
        fields = [f.name for f in old_instance._meta.get_fields() 
                 if hasattr(old_instance, f.name)]
    
    for field in fields:
        if field in exclude:
            continue
        
        try:
            old_value = getattr(old_instance, field, None)
            new_value = getattr(new_instance, field, None)
            
            # Skip if unchanged
            if old_value == new_value:
                continue
            
            # Convert special types to JSON-serializable format
            old_value = _serialize_value(old_value)
            new_value = _serialize_value(new_value)
            
            changes[field] = {'old': old_value, 'new': new_value}
        
        except Exception as e:
            logger.debug(f"Skipping field {field}: {str(e)}")
            continue
    
    return changes


def log_model_changes(user_data, action, old_instance, new_instance, 
                     target=None, fields=None, exclude=None, 
                     description=None, request=None):
    """
    INTERNAL: Compare model instances and log the changes automatically.
    
    Use in your business logic when you already have old and new versions.
    """
    changes = compare_models(old_instance, new_instance, fields, exclude)
    
    if not changes and not description:
        # No changes detected
        return None
    
    return log_action(
        user_data=user_data,
        action=action,
        target=target or new_instance,
        changes=changes if changes else None,
        description=description,
        request=request
    )


# ============================================================================
# QUERY FUNCTIONS - Use these to FETCH audit logs
# ============================================================================

def get_audit_events(user_id=None, action=None, target_type=None, 
                    target_id=None, days=None, limit=100):
    """
    Query audit events with optional filters.
    Use in your API endpoints or services to RETRIEVE logs.
    
    Args:
        user_id: Filter by user ID
        action: Filter by action type
        target_type: Filter by target model name
        target_id: Filter by target ID
        days: Include only events from last N days
        limit: Maximum results (default 100)
    
    Returns:
        QuerySet of AuditEvent
    
    Example:
        # Get all changes to workflow #5
        events = get_audit_events(target_type='Workflow', target_id=5)
        
        # Get all actions by user #123 in last 7 days
        events = get_audit_events(user_id=123, days=7)
    """
    queryset = AuditEvent.objects.all()
    
    if user_id:
        queryset = queryset.filter(user_id=user_id)
    
    if action:
        queryset = queryset.filter(action=action)
    
    if target_type:
        queryset = queryset.filter(target_type=target_type)
    
    if target_id:
        queryset = queryset.filter(target_id=target_id)
    
    if days:
        from datetime import timedelta
        cutoff = now() - timedelta(days=days)
        queryset = queryset.filter(timestamp__gte=cutoff)
    
    return queryset[:limit]


def get_object_audit_history(obj):
    """
    Get all audit events related to a specific object.
    
    Example:
        workflow = Workflow.objects.get(id=1)
        history = get_object_audit_history(workflow)
    """
    return AuditEvent.objects.filter(
        target_type=type(obj).__name__,
        target_id=obj.pk
    ).order_by('-timestamp')


def get_user_audit_trail(user_id, limit=100, days=None):
    """
    Get all audit events for a specific user.
    """
    queryset = AuditEvent.objects.filter(user_id=user_id).order_by('-timestamp')
    
    if days:
        from datetime import timedelta
        cutoff = now() - timedelta(days=days)
        queryset = queryset.filter(timestamp__gte=cutoff)
    
    return queryset[:limit]


# ============================================================================
# HELPER FUNCTIONS
# ============================================================================

def _ensure_user_dict(user_data):
    """
    Convert user data to dict if it's an object.
    Handles both dict and AuthenticatedUser object from authentication.py
    """
    if isinstance(user_data, dict):
        return user_data
    
    # Handle AuthenticatedUser object from authentication.py
    if hasattr(user_data, 'user_id'):
        return {
            'user_id': user_data.user_id,
            'username': getattr(user_data, 'username', ''),
            'email': getattr(user_data, 'email', ''),
            'full_name': getattr(user_data, 'full_name', ''),
        }
    
    # Fallback for Django User model
    if hasattr(user_data, 'id'):
        return {
            'user_id': user_data.id,
            'username': getattr(user_data, 'username', ''),
            'email': getattr(user_data, 'email', ''),
        }
    
    return {
        'user_id': None,
        'username': 'Unknown',
        'email': '',
    }


def _serialize_value(value):
    """
    Convert Django model values to JSON-serializable format.
    """
    if value is None:
        return None
    
    # Handle datetime
    if hasattr(value, 'isoformat'):
        return value.isoformat()
    
    # Handle timedelta
    if hasattr(value, 'total_seconds'):
        return str(value)
    
    # Handle model instances
    if hasattr(value, 'pk'):
        return f"{type(value).__name__}({value.pk})"
    
    # Handle QuerySets
    if hasattr(value, 'model'):
        return [str(v) for v in value]
    
    # Handle other types
    try:
        # Test if serializable
        import json
        json.dumps(value)
        return value
    except (TypeError, ValueError):
        return str(value)
