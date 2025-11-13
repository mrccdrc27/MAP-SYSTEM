# Audit Logging System - Implementation Guide

## Overview

The audit logging system **automatically tracks user actions internally**. No explicit POST requests are needed to create logs - logging happens transparently when actions occur.

- **LOG ACTIONS**: Called internally from your service layer/views when actions happen
- **QUERY LOGS**: Use API endpoints to retrieve audit history

## Quick Start

### 1. Import in Your Service/View

```python
from audit.utils import log_action, compare_models
```

### 2. Log an Action

```python
from audit.utils import log_action

def create_workflow(user_data, workflow_data, request=None):
    # Your business logic
    workflow = Workflow.objects.create(**workflow_data)
    
    # Log the action automatically
    log_action(
        user_data=user_data,
        action='create_workflow',
        target=workflow,
        description="Created new workflow"
    )
    
    return workflow
```

### 3. Log with Change Tracking

```python
def update_workflow(user_data, workflow_id, updates, request=None):
    workflow = Workflow.objects.get(id=workflow_id)
    old_name = workflow.name
    old_status = workflow.status
    
    # Apply updates
    for field, value in updates.items():
        setattr(workflow, field, value)
    workflow.save()
    
    # Log with detailed changes
    log_action(
        user_data=user_data,
        action='update_workflow',
        target=workflow,
        changes={
            'name': {'old': old_name, 'new': workflow.name},
            'status': {'old': old_status, 'new': workflow.status}
        },
        request=request
    )
    
    return workflow
```

### 4. Auto-Detect Changes

```python
from copy import deepcopy
from audit.utils import log_action, compare_models

def update_workflow(user_data, workflow_id, updates, request=None):
    workflow = Workflow.objects.get(id=workflow_id)
    old_workflow = deepcopy(workflow)  # Save state before changes
    
    # Apply updates
    for field, value in updates.items():
        setattr(workflow, field, value)
    workflow.save()
    
    # Automatically generate changes dict
    changes = compare_models(old_workflow, workflow)
    
    log_action(
        user_data=user_data,
        action='update_workflow',
        target=workflow,
        changes=changes,
        request=request
    )
    
    return workflow
```

## Using Decorators

### Simple Action Logging

```python
from audit.decorators import audit_action

@audit_action('create_workflow')
def create_workflow_view(request):
    workflow = Workflow.objects.create(...)
    return Response({'id': workflow.id})
```

### With Dynamic Target/Changes

```python
from audit.decorators import audit_action

@audit_action(
    'update_workflow',
    get_target=lambda req, res: Workflow.objects.get(id=res.data['id']),
    get_changes=lambda req, res: res.data.get('changes')
)
def update_workflow_view(request):
    workflow = Workflow.objects.get(id=request.data['id'])
    # ... update logic ...
    return Response({'id': workflow.id, 'changes': {...}})
```

## Querying Audit Logs

### Via API Endpoints

The audit system provides REST API endpoints - **no need to create logs via API**:

```
GET /audit/events/
GET /audit/events/?user_id=123&days=7
GET /audit/events/by_object/?target_type=Workflow&target_id=5
GET /audit/events/by_user/?user_id=123&days=30
GET /audit/events/by_action/?action=update_workflow&days=7
GET /audit/events/summary/?days=30
```

### Via Code

```python
from audit.utils import (
    get_audit_events,
    get_object_audit_history,
    get_user_audit_trail
)

# Get all changes to workflow #5
history = get_object_audit_history(workflow)

# Get user's audit trail
trail = get_user_audit_trail(user_id=123, days=7)

# Advanced filtering
events = get_audit_events(
    action='update_workflow',
    target_type='Workflow',
    days=7
)
```

## Models

### AuditEvent (Full Change Tracking)

Stores structured audit data with change details:

```python
AuditEvent(
    user_id=123,
    username='marc',
    email='marc@example.com',
    action='update_workflow',
    target_type='Workflow',
    target_id=5,
    changes={'name': {'old': 'Old', 'new': 'New'}},
    timestamp=datetime.now(),
    ip_address='192.168.1.1',
    user_agent='Mozilla/5.0...'
)
```

### AuditLog (Simple Logging)

For lightweight logging without structured changes:

```python
from audit.utils import log_simple_action

log_simple_action(
    user_data=user_data,
    action='workflow_deployed',
    entity_type='Workflow',
    entity_id=5,
    details={'environment': 'production'}
)
```

## User Data Format

The system accepts user data in multiple formats:

### From JWT (AuthenticatedUser)
```python
# From request.user after JWT authentication
log_action(
    user_data=request.user,  # Has user_id, username, email
    action='create_workflow',
    target=workflow
)
```

### As Dictionary
```python
log_action(
    user_data={
        'user_id': 123,
        'username': 'marc',
        'email': 'marc@example.com'
    },
    action='create_workflow',
    target=workflow
)
```

## Action Types

Available action types (add more as needed):

```
create_workflow
update_workflow
delete_workflow
publish_workflow
deploy_workflow
pause_workflow
resume_workflow

create_step
update_step
delete_step
reorder_steps

create_task
update_task
delete_task
assign_task

create_version
update_version
publish_version

update_sla
update_category
other
```

## Admin Interface

View audit logs in Django admin:

```
/admin/audit/auditevent/
/admin/audit/auditlog/
```

Features:
- Read-only interface (cannot be modified)
- Search by username, email, action
- Filter by date, action type, target
- View detailed changes in JSON format

## Best Practices

1. **Always include request object** for IP tracking:
   ```python
   log_action(
       user_data=request.user,
       action='create_workflow',
       target=workflow,
       request=request  # Include this for IP/user-agent
   )
   ```

2. **Use structured changes, not descriptions**:
   ```python
   # Good - queryable
   changes={'name': {'old': 'A', 'new': 'B'}, 'status': {'old': 'draft', 'new': 'published'}}
   
   # Less useful - just a string
   description="Changed name and status"
   ```

3. **Log at the right level**:
   ```python
   # In service layer/business logic, NOT in every HTTP request handler
   # One log per meaningful action, not per request
   ```

4. **Use decorators for consistency**:
   ```python
   # Instead of manual logging in every view function
   @audit_action('create_workflow')
   def create_workflow_view(request):
       ...
   ```

## Migration

Run migrations to create audit tables:

```bash
python manage.py migrate audit
```

## Querying Examples

### Get all updates to a workflow
```python
from audit.utils import get_object_audit_history

workflow = Workflow.objects.get(id=5)
history = get_object_audit_history(workflow)

for event in history:
    print(f"{event.username} {event.get_action_display()}")
    print(f"Changes: {event.changes}")
    print(f"Time: {event.timestamp}")
```

### Get user's recent actions
```python
from audit.utils import get_user_audit_trail

trail = get_user_audit_trail(user_id=123, days=7)
for event in trail:
    print(event.get_human_readable_description())
```

### Audit statistics
```python
from audit.models import AuditEvent

total = AuditEvent.objects.count()
unique_users = AuditEvent.objects.values('user_id').distinct().count()
actions = AuditEvent.objects.values('action').annotate(Count('id'))
```

## API Endpoints

### List all audit events
```
GET /audit/events/
```

Query parameters:
- `user_id`: Filter by user
- `action`: Filter by action type
- `target_type`: Filter by object type
- `target_id`: Filter by object ID
- `days`: Last N days
- `search`: Full-text search

### Get history for specific object
```
GET /audit/events/by_object/?target_type=Workflow&target_id=5
```

### Get user's audit trail
```
GET /audit/events/by_user/?user_id=123&days=30
```

### Get events by action type
```
GET /audit/events/by_action/?action=update_workflow&days=7
```

### Get audit summary
```
GET /audit/events/summary/?days=30
```

Returns:
```json
{
    "days": 30,
    "total_events": 150,
    "unique_users": 5,
    "actions_count": {
        "create_workflow": 10,
        "update_workflow": 85,
        "publish_workflow": 55
    },
    "top_objects": [
        {"target_type": "Workflow", "target_id": 5, "event_count": 20},
        {"target_type": "Workflow", "target_id": 3, "event_count": 15}
    ]
}
```

## Permissions

Audit API endpoints require TTS system access:

```python
# In your views
permission_classes = [MultiSystemPermission.require('tts')]
```

Users see their own logs; admins see all (based on system roles).
