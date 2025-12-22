"""
Activity Logger Service

Helper functions to log activity events to the ActivityLog model.
"""

from ..models import ActivityLog


def log_activity(
    module: str,
    action: str,
    item_id: int,
    item_name: str = '',
    user_id: int = None,
    target_user_id: int = None,
    notes: str = '',
):
    """
    Create an ActivityLog entry.

    Args:
        module: Type of entity (Asset, Component, Audit, Repair)
        action: Type of action (Create, Update, Delete, Checkout, Checkin, Schedule, Perform)
        item_id: ID of the affected item
        item_name: Name of the item
        user_id: ID of the user who performed the action
        target_user_id: ID of the target user (for checkout/checkin)
        notes: Additional notes about the activity

    Returns:
        The created ActivityLog instance
    """
    # user_id is required by the model, default to 0 if not provided
    return ActivityLog.objects.create(
        user_id=user_id or 0,
        module=module,
        action=action.upper(),
        item_id=item_id,
        item_name=item_name or '',
        target_user_id=target_user_id,
        notes=notes or '',
    )


def log_asset_activity(
    action: str,
    asset,
    user_id: int = None,
    target_user_id: int = None,
    notes: str = '',
):
    """Log an activity for an Asset."""
    return log_activity(
        module='Asset',
        action=action,
        item_id=asset.id,
        item_name=asset.name or asset.asset_id or '',
        user_id=user_id,
        target_user_id=target_user_id,
        notes=notes,
    )


def log_component_activity(
    action: str,
    component,
    user_id: int = None,
    target_user_id: int = None,
    notes: str = '',
):
    """Log an activity for a Component."""
    return log_activity(
        module='Component',
        action=action,
        item_id=component.id,
        item_name=component.name or '',
        user_id=user_id,
        target_user_id=target_user_id,
        notes=notes,
    )


def log_audit_activity(
    action: str,
    audit_or_schedule,
    asset=None,
    user_id: int = None,
    notes: str = '',
):
    """Log an activity for an Audit or AuditSchedule."""
    # Get asset from audit_schedule if not provided
    if asset is None:
        if hasattr(audit_or_schedule, 'asset'):
            asset = audit_or_schedule.asset
        elif hasattr(audit_or_schedule, 'audit_schedule'):
            asset = audit_or_schedule.audit_schedule.asset

    item_name = f"Audit - {asset.name}" if asset else f"Audit {audit_or_schedule.id}"

    return log_activity(
        module='Audit',
        action=action,
        item_id=audit_or_schedule.id,
        item_name=item_name,
        user_id=user_id,
        notes=notes,
    )


def log_repair_activity(
    action: str,
    repair,
    user_id: int = None,
    notes: str = '',
):
    """Log an activity for a Repair."""
    return log_activity(
        module='Repair',
        action=action,
        item_id=repair.id,
        item_name=repair.name or '',
        user_id=user_id,
        notes=notes,
    )

