# Audit Logging System - Complete Implementation Summary

## ✅ What's Been Implemented

A production-ready audit logging system for the Workflow API that **automatically tracks user actions internally** without requiring external POST requests.

## Core Components

### 1. Models (`audit/models.py`)

**AuditEvent** - Full change tracking
```python
- user_id, username, email (from JWT)
- action (enum: create, update, delete, publish, deploy, etc.)
- target_type, target_id (what object was acted upon)
- changes (JSON: {field: {old: val, new: val}})
- description (human-readable summary)
- timestamp, ip_address, user_agent
```

**AuditLog** - Lightweight logging
```python
- user_id, username, action
- entity_type, entity_id
- details (JSON)
- timestamp
```

### 2. Core Utilities (`audit/utils.py`)

**Logging Functions** (Called from your business logic):
- `log_action()` - Log user action with optional change tracking
- `log_simple_action()` - Log without structured changes
- `compare_models()` - Auto-detect changes between instances
- `log_model_changes()` - Compare and log together

**Query Functions** (For retrieving audit history):
- `get_audit_events()` - Query with filters
- `get_object_audit_history()` - Get all events for an object
- `get_user_audit_trail()` - Get all events by a user

### 3. View Decorators (`audit/decorators.py`)

```python
@audit_action('create_workflow')  # Simple logging
@audit_action('update_workflow', get_target=..., get_changes=...)  # With extraction
@audit_model_changes('update_workflow', get_old_instance=...)  # Auto-compare
```

### 4. REST API (`audit/views.py` + `audit/urls.py`)

**Endpoints** (For querying logs):
- `GET /audit/events/` - List all events
- `GET /audit/events/by_object/?target_type=Workflow&target_id=5` - Object history
- `GET /audit/events/by_user/?user_id=123&days=7` - User's actions
- `GET /audit/events/by_action/?action=update_workflow` - Action type history
- `GET /audit/events/summary/?days=30` - Statistics

**Permissions**: Requires TTS system access

### 5. Admin Interface (`audit/admin.py`)

- Django admin at `/admin/audit/auditevent/`
- Read-only (prevents tampering)
- Search by username, email, action
- Filter by date, action type, target
- View detailed JSON changes

### 6. Serializers (`audit/serializers.py`)

- `AuditEventSerializer` - Full event with changes
- `AuditLogSerializer` - Simple log

## How to Use

### Scenario 1: Create Action

```python
from audit.utils import log_action

def create_workflow(user_data, workflow_data, request=None):
    workflow = Workflow.objects.create(**workflow_data)
    
    # Log automatically (no POST request needed!)
    log_action(
        user_data=user_data,
        action='create_workflow',
        target=workflow,
        request=request  # Captures IP, user-agent
    )
    
    return workflow
```

### Scenario 2: Update Action with Change Tracking

```python
from audit.utils import log_action, compare_models
from copy import deepcopy

def update_workflow(user_data, workflow_id, updates, request=None):
    workflow = Workflow.objects.get(id=workflow_id)
    old_workflow = deepcopy(workflow)
    
    # Apply changes
    for field, value in updates.items():
        setattr(workflow, field, value)
    workflow.save()
    
    # Auto-detect what changed
    changes = compare_models(old_workflow, workflow)
    
    # Log with structured changes
    log_action(
        user_data=user_data,
        action='update_workflow',
        target=workflow,
        changes=changes,
        request=request
    )
    
    return workflow
```

### Scenario 3: Delete Action

```python
def delete_workflow(user_data, workflow_id, request=None):
    workflow = Workflow.objects.get(id=workflow_id)
    
    log_action(
        user_data=user_data,
        action='delete_workflow',
        target=workflow,
        request=request
    )
    
    workflow.delete()
```

### Scenario 4: Query Audit History

```python
from audit.utils import get_object_audit_history

workflow = Workflow.objects.get(id=5)
history = get_object_audit_history(workflow)

for event in history:
    print(f"{event.timestamp}: {event.get_action_display()}")
    print(f"By: {event.username}")
    print(f"Changes: {event.changes}")
```

## Data Flow

```
User Request
    ↓
API View
    ↓
Business Logic (Service Layer)
    ↓
log_action(user_data, action, target, changes)
    ↓
AuditEvent created and saved to DB
    ↓
User can query via API:
    GET /audit/events/by_object/?target_type=Workflow&target_id=5
    ↓
AuditEventSerializer returns structured JSON
```

## Key Design Principles

### 1. **NO External POST Requests**
Logging is **internal** - you call `log_action()` from within your code, not via API POST.

### 2. **Zero Overhead**
Logging doesn't change your API response structure - it's transparent.

### 3. **Automatic User Attribution**
User data comes from JWT token in `request.user` - no manual assignment.

### 4. **Structured Change Tracking**
Changes stored as JSON for:
- Compliance auditing
- Historical comparisons
- Change analysis
- Automated alerting

### 5. **Query-Only API**
The audit API is read-only - you only GET/retrieve logs, never POST to create them.

## Integration with Your Code

### Step 1: Make Migrations
```bash
python manage.py migrate audit
```

### Step 2: Import and Log
```python
from audit.utils import log_action

# In your create endpoint
log_action(request.user, 'create_workflow', target=workflow, request=request)

# In your update endpoint
log_action(request.user, 'update_workflow', target=workflow, changes=changes, request=request)

# In your delete endpoint
log_action(request.user, 'delete_workflow', target=workflow, request=request)
```

### Step 3: Query Audit History
```python
from audit.utils import get_object_audit_history

# In your detail view or export
history = get_object_audit_history(workflow)
return Response({'workflow': data, 'audit_history': history})
```

## Example: Complete Workflow Update

```python
# workflows/services.py
from audit.utils import log_action, compare_models
from copy import deepcopy

class WorkflowService:
    @staticmethod
    def update_workflow(user_data, workflow_id, updates, request=None):
        # Get workflow
        workflow = Workflows.objects.get(workflow_id=workflow_id)
        old_workflow = deepcopy(workflow)
        
        # Update
        for field, value in updates.items():
            if hasattr(workflow, field):
                setattr(workflow, field, value)
        workflow.save()
        
        # Detect changes
        changes = compare_models(old_workflow, workflow)
        
        # Log (automatic, no POST)
        if changes:
            log_action(
                user_data=user_data,
                action='update_workflow',
                target=workflow,
                changes=changes,
                request=request
            )
        
        return workflow

# workflows/views.py
class UpdateWorkflowView(APIView):
    def put(self, request, workflow_id):
        workflow = WorkflowService.update_workflow(
            user_data=request.user,
            workflow_id=workflow_id,
            updates=request.data,
            request=request
        )
        return Response(WorkflowSerializer(workflow).data)
```

## Files Created

```
audit/
├── models.py              # AuditEvent, AuditLog models
├── utils.py              # Core logging & query functions
├── decorators.py         # View decorators for auto-logging
├── views.py              # REST API viewsets
├── serializers.py        # DRF serializers
├── urls.py               # API routes
├── admin.py              # Django admin interface
├── README.md             # Overview
├── IMPLEMENTATION.md     # Detailed guide
├── EXAMPLES.md           # Code examples
└── migrations/
    └── (auto-generated)
```

## API Endpoints

All endpoints are **read-only** (GET only):

```
GET /audit/events/
  ?user_id=123
  &action=update_workflow
  &target_type=Workflow
  &target_id=5
  &days=7
  &search=name

GET /audit/events/by_object/?target_type=Workflow&target_id=5

GET /audit/events/by_user/?user_id=123&days=30

GET /audit/events/by_action/?action=update_workflow&days=7

GET /audit/events/summary/?days=30
```

## Example API Response

```json
{
  "id": 1,
  "user_id": 123,
  "username": "marc",
  "email": "marc@example.com",
  "action": "update_workflow",
  "action_display": "Updated Workflow",
  "target_type": "Workflow",
  "target_id": 5,
  "changes": {
    "name": {
      "old": "Old Name",
      "new": "New Workflow Name"
    },
    "status": {
      "old": "draft",
      "new": "published"
    }
  },
  "description": null,
  "human_readable": "marc updated Workflow #5: name: Old Name → New Workflow Name, status: draft → published",
  "timestamp": "2025-11-14T10:30:00Z",
  "ip_address": "192.168.1.100",
  "user_agent": "Mozilla/5.0..."
}
```

## Permissions

Audit API requires TTS system access:

```python
permission_classes = [MultiSystemPermission.require('tts')]
```

- **Regular users**: See only their own logs
- **Admins** (with admin role): See all logs

## Best Practices

1. **Log in service layer, not views**
   - Keep business logic in services
   - Views just call services

2. **Use compare_models() for updates**
   - Auto-detects changes
   - Reduces manual tracking

3. **Always include request object**
   - Enables IP tracking
   - Captures user-agent

4. **Use structured changes**
   - Better than unstructured descriptions
   - Queryable and comparable
   - Good for compliance

5. **One log per action**
   - Not per HTTP request
   - Only when something meaningful happens

## Testing

```python
from audit.models import AuditEvent

def test_create_workflow_is_audited():
    workflow = WorkflowService.create_workflow(user_data, data)
    
    # Check audit log exists
    event = AuditEvent.objects.filter(
        action='create_workflow',
        target_type='Workflow',
        target_id=workflow.id
    ).first()
    
    assert event is not None
    assert event.user_id == user_data['user_id']
    assert event.changes is not None
```

## Summary

✅ **Complete, production-ready audit system**
✅ **Zero external POST requests needed**
✅ **Automatic internal logging**
✅ **Rich query API for retrieving logs**
✅ **Structured change tracking**
✅ **Full admin interface**
✅ **User attribution from JWT**
✅ **Request metadata capture**
✅ **Compliance-ready**

Ready to integrate into your workflow views!
