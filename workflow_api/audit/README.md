# Audit Logging System

Complete audit trail system for tracking user actions in the Workflow API.

## Key Features

✅ **Automatic Internal Logging** - Log actions transparently from your service layer
✅ **Structured Change Tracking** - Store what changed (old vs new values)
✅ **Zero External POST Requests** - No API calls needed to create logs
✅ **Rich Query API** - Retrieve audit history with flexible filtering
✅ **Admin Interface** - View and search logs in Django admin
✅ **User Attribution** - Every action linked to authenticated user
✅ **Request Context** - Captures IP address and user agent
✅ **Human-Readable Descriptions** - Auto-generate change summaries

## Quick Start

### 1. Make Migrations

```bash
python manage.py migrate audit
```

### 2. Log an Action

```python
from audit.utils import log_action

# In your business logic
log_action(
    user_data=request.user,  # From JWT authentication
    action='create_workflow',
    target=workflow,
    request=request
)
```

### 3. Query Audit Logs

```python
# Via API
GET /audit/events/?user_id=123&days=7

# Via code
from audit.utils import get_user_audit_trail
trail = get_user_audit_trail(user_id=123, days=7)
```

## Architecture

### Models

- **AuditEvent**: Full audit record with change tracking
  - User info (ID, username, email)
  - Action type (create, update, delete, etc.)
  - Target object reference
  - Structured changes (JSON)
  - Request metadata (IP, user-agent)
  - Timestamp

- **AuditLog**: Simplified audit record
  - User info
  - Action string
  - Entity reference
  - Details (JSON)

### Utilities

- `log_action()`: Log user action with optional change tracking
- `log_simple_action()`: Log simple action without change tracking
- `compare_models()`: Auto-detect changes between two model instances
- `get_audit_events()`: Query events with filters
- `get_object_audit_history()`: Get all events for an object
- `get_user_audit_trail()`: Get all events by a user

### Decorators

- `@audit_action()`: Auto-log view actions
- `@audit_model_changes()`: Compare and log model changes

### API Endpoints

- `GET /audit/events/` - List audit events
- `GET /audit/events/by_object/` - History for specific object
- `GET /audit/events/by_user/` - History for specific user
- `GET /audit/events/by_action/` - Events of specific action type
- `GET /audit/events/summary/` - Audit statistics

## File Structure

```
audit/
├── models.py           # AuditEvent and AuditLog models
├── utils.py           # Core logging and query functions
├── decorators.py      # View decorators for auto-logging
├── views.py           # REST API viewsets
├── serializers.py     # DRF serializers
├── urls.py            # API routes
├── admin.py           # Django admin interface
├── IMPLEMENTATION.md  # Detailed implementation guide
├── EXAMPLES.md        # Practical integration examples
└── README.md          # This file
```

## Usage Patterns

### Pattern 1: Service Layer Logging (Recommended)

```python
# workflows/services.py
from audit.utils import log_action, compare_models
from copy import deepcopy

class WorkflowService:
    @staticmethod
    def update_workflow(user_data, workflow_id, updates, request=None):
        workflow = Workflow.objects.get(id=workflow_id)
        old_workflow = deepcopy(workflow)
        
        for field, value in updates.items():
            setattr(workflow, field, value)
        workflow.save()
        
        changes = compare_models(old_workflow, workflow)
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

### Pattern 2: View-Level Logging

```python
from rest_framework.views import APIView
from audit.utils import log_action

class CreateWorkflowView(APIView):
    def post(self, request):
        workflow = Workflow.objects.create(**request.data)
        
        log_action(
            user_data=request.user,
            action='create_workflow',
            target=workflow,
            request=request
        )
        
        return Response(WorkflowSerializer(workflow).data)
```

### Pattern 3: Decorator-Based Logging

```python
from audit.decorators import audit_action

@audit_action('create_workflow')
def create_workflow_view(request):
    workflow = Workflow.objects.create(**request.data)
    return Response(WorkflowSerializer(workflow).data)
```

## Action Types

Pre-defined actions (add more to `AuditEvent.ACTION_CHOICES`):

```
Workflows:
  - create_workflow
  - update_workflow
  - delete_workflow
  - publish_workflow
  - deploy_workflow
  - pause_workflow
  - resume_workflow

Steps:
  - create_step
  - update_step
  - delete_step
  - reorder_steps

Tasks:
  - create_task
  - update_task
  - delete_task
  - assign_task

Versions:
  - create_version
  - update_version
  - publish_version

Other:
  - update_sla
  - update_category
  - other
```

## Querying Examples

### Get all workflow changes
```python
from audit.utils import get_object_audit_history

workflow = Workflow.objects.get(id=5)
history = get_object_audit_history(workflow)

for event in history:
    print(f"{event.timestamp}: {event.get_action_display()}")
    print(f"By: {event.username}")
    print(f"Changes: {event.changes}")
```

### Get user's recent actions
```python
from audit.utils import get_user_audit_trail

trail = get_user_audit_trail(user_id=123, days=7)
for event in trail:
    print(event.get_human_readable_description())
```

### Query via API
```bash
# Get user's last 7 days of activity
curl "http://localhost:8000/audit/events/by_user/?user_id=123&days=7"

# Get all updates to workflow #5
curl "http://localhost:8000/audit/events/by_object/?target_type=Workflow&target_id=5"

# Get workflow creation events
curl "http://localhost:8000/audit/events/by_action/?action=create_workflow"

# Get statistics
curl "http://localhost:8000/audit/events/summary/?days=30"
```

## Admin Interface

View and search audit logs at:
```
/admin/audit/auditevent/
/admin/audit/auditlog/
```

Features:
- Full-text search on username, email, action, description
- Filter by action type, date range, target type
- View detailed JSON changes
- Read-only interface (prevents audit tampering)

## Change Tracking Format

Changes are stored as structured JSON:

```json
{
  "name": {
    "old": "Old Workflow Name",
    "new": "New Workflow Name"
  },
  "status": {
    "old": "draft",
    "new": "published"
  },
  "description": {
    "old": "Old description",
    "new": "New description"
  }
}
```

This allows:
- Precise change tracking (field-level)
- Historical comparisons
- Compliance reporting
- Change analysis and insights

## Permissions

Audit API endpoints require TTS system access:

```python
permission_classes = [MultiSystemPermission.require('tts')]
```

- **Regular users**: See only their own audit logs
- **Admins**: See all audit logs (requires admin role)

## Performance Considerations

- Indexed on: user_id, timestamp, target_type/target_id
- Automatic cleanup: Consider archiving old records
- JSON indexing: For PostgreSQL, use JSONB for better performance

```sql
-- Create index for change tracking
CREATE INDEX idx_audit_changes ON audit_auditevent USING GIN(changes);
```

## No POST Requests Needed

⚠️ **Important**: You DO NOT make POST requests to log actions!

```python
# ❌ DON'T DO THIS
POST /audit/events/  # No endpoint for creating logs

# ✅ DO THIS
# Call from your service layer:
log_action(user_data, action, target=obj)

# Then query later:
GET /audit/events/  # Retrieve existing logs
```

## See Also

- `IMPLEMENTATION.md` - Complete implementation guide
- `EXAMPLES.md` - Practical code examples
- `/admin/audit/` - View logs in admin interface
- `/audit/events/` - Query logs via API

## Notes

- Logging is **automatic and transparent** - no explicit API calls
- User data comes from JWT authentication
- Request metadata (IP, user-agent) is captured automatically
- All audit records are **immutable** (read-only in admin)
- Use for compliance, security, troubleshooting, and auditing
