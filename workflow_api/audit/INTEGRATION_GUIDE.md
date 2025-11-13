# Audit System - Integration Guide

## Overview

Your audit logging system is now fully implemented and ready to use. It provides **automatic, transparent logging of user actions** without requiring external POST requests.

## Quick Integration (5 Minutes)

### 1. Run Migration
```bash
cd workflow_api
python manage.py migrate audit
```

### 2. Add to Your First Endpoint

In your workflow creation view:

```python
from audit.utils import log_action

def create_workflow_endpoint(request):
    workflow = Workflow.objects.create(**request.data)
    
    # Add this line
    log_action(
        user_data=request.user,
        action='create_workflow',
        target=workflow,
        request=request
    )
    
    return Response(...)
```

### 3. Test It

```bash
# Create a workflow via API
curl -X POST http://localhost:8000/workflows/ \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{"name": "Test Workflow"}'

# View audit log in admin
http://localhost:8000/admin/audit/auditevent/

# Query via API
curl http://localhost:8000/audit/events/
```

## Complete Integration Path

### Phase 1: Setup (Done ✓)

- ✓ Models created (AuditEvent, AuditLog)
- ✓ Utilities implemented (log_action, compare_models, queries)
- ✓ Decorators created (for auto-logging)
- ✓ API endpoints implemented (for querying logs)
- ✓ Admin interface configured
- ✓ Documentation written

### Phase 2: Add Logging (Next - 30 minutes)

Add logging calls to your existing views:

**Create endpoints:**
```python
log_action(request.user, 'create_workflow', target=workflow, request=request)
```

**Update endpoints:**
```python
changes = compare_models(old_workflow, workflow)
log_action(request.user, 'update_workflow', target=workflow, changes=changes, request=request)
```

**Delete endpoints:**
```python
log_action(request.user, 'delete_workflow', target=workflow, request=request)
```

### Phase 3: Query Logs (As needed)

Add audit history to your detail views:

```python
from audit.utils import get_object_audit_history

def workflow_detail(request, workflow_id):
    workflow = Workflow.objects.get(id=workflow_id)
    history = get_object_audit_history(workflow)
    
    return Response({
        'workflow': WorkflowSerializer(workflow).data,
        'audit_history': AuditEventSerializer(history, many=True).data
    })
```

## File by File Integration

### Step 1: Workflow Views (`workflow/views.py`)

```python
from audit.utils import log_action, compare_models
from copy import deepcopy

# In create view:
class CreateWorkflowView(APIView):
    def post(self, request):
        serializer = WorkflowSerializer(data=request.data)
        if serializer.is_valid():
            workflow = serializer.save(user_id=request.user.user_id)
            
            # ADD THIS:
            log_action(
                user_data=request.user,
                action='create_workflow',
                target=workflow,
                request=request
            )
            
            return Response(...)

# In update view:
class UpdateWorkflowView(APIView):
    def put(self, request, workflow_id):
        workflow = Workflow.objects.get(id=workflow_id)
        old_workflow = deepcopy(workflow)  # ADD THIS
        
        serializer = WorkflowSerializer(workflow, data=request.data, partial=True)
        if serializer.is_valid():
            workflow = serializer.save()
            
            # ADD THIS:
            changes = compare_models(old_workflow, workflow)
            if changes:
                log_action(
                    user_data=request.user,
                    action='update_workflow',
                    target=workflow,
                    changes=changes,
                    request=request
                )
            
            return Response(...)

# In delete view:
class DeleteWorkflowView(APIView):
    def delete(self, request, workflow_id):
        workflow = Workflow.objects.get(id=workflow_id)
        
        # ADD THIS:
        log_action(
            user_data=request.user,
            action='delete_workflow',
            target=workflow,
            request=request
        )
        
        workflow.delete()
        return Response({'message': 'Deleted'})
```

### Step 2: Step Views (`step/views.py`)

Similar pattern for steps:

```python
log_action(request.user, 'create_step', target=step, request=request)
log_action(request.user, 'update_step', target=step, changes=changes, request=request)
log_action(request.user, 'delete_step', target=step, request=request)
```

### Step 3: Task Views (`task/views.py`)

Similar pattern for tasks:

```python
log_action(request.user, 'create_task', target=task, request=request)
log_action(request.user, 'update_task', target=task, changes=changes, request=request)
log_action(request.user, 'assign_task', target=task, request=request)
```

## Implementation Checklist

### Workflows
- [ ] Add logging to create workflow
- [ ] Add logging to update workflow
- [ ] Add logging to delete workflow
- [ ] Add logging to publish workflow
- [ ] Add logging to deploy workflow
- [ ] Add logging to pause workflow
- [ ] Add logging to resume workflow

### Steps
- [ ] Add logging to create step
- [ ] Add logging to update step
- [ ] Add logging to delete step
- [ ] Add logging to reorder steps

### Tasks
- [ ] Add logging to create task
- [ ] Add logging to update task
- [ ] Add logging to delete task
- [ ] Add logging to assign task

### Versions
- [ ] Add logging to create version
- [ ] Add logging to update version
- [ ] Add logging to publish version

### SLA/Category
- [ ] Add logging to SLA updates
- [ ] Add logging to category updates

## Testing Your Integration

### 1. Unit Test
```python
# workflow/tests.py
from audit.models import AuditEvent

def test_workflow_creation_is_logged(self):
    response = self.client.post('/workflows/', {
        'name': 'Test Workflow',
        'category': 'Test'
    })
    
    # Check audit log was created
    event = AuditEvent.objects.filter(
        action='create_workflow',
        target_type='Workflow'
    ).first()
    
    self.assertIsNotNone(event)
    self.assertEqual(event.user_id, self.user.id)
    self.assertEqual(response.status_code, 201)
```

### 2. Manual Test
```bash
# 1. Create workflow
curl -X POST http://localhost:8000/workflows/ \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"name":"Test","category":"test","sub_category":"test","department":"test"}'

# 2. Check admin
http://localhost:8000/admin/audit/auditevent/

# 3. Check API
curl http://localhost:8000/audit/events/

# 4. Check specific workflow
curl "http://localhost:8000/audit/events/by_object/?target_type=Workflow&target_id=1"
```

### 3. API Test
```python
# test_audit_api.py
def test_audit_events_api(self):
    response = self.client.get('/audit/events/')
    self.assertEqual(response.status_code, 200)
    
    # Test filtering
    response = self.client.get('/audit/events/by_user/?user_id=1&days=7')
    self.assertEqual(response.status_code, 200)
    
    # Test summary
    response = self.client.get('/audit/events/summary/')
    self.assertEqual(response.status_code, 200)
    self.assertIn('total_events', response.data)
```

## Troubleshooting

### Problem: Logs not appearing

**Check 1: Migration ran?**
```bash
python manage.py showmigrations audit
# Should show [X] 0001_initial
```

**Check 2: audit in INSTALLED_APPS?**
```python
# workflow_api/settings.py
INSTALLED_APPS = [
    ...
    'audit',  # Should be here
    ...
]
```

**Check 3: User data available?**
```python
# In your view
print(request.user)
print(request.user.user_id)
# Should have user_id attribute
```

### Problem: Changes not showing

**Make sure to pass compare_models() result:**
```python
changes = compare_models(old_obj, new_obj)
log_action(..., changes=changes)  # Pass it here
```

### Problem: API returning 403

**Check permissions:**
```python
# Make sure user has TTS system access
# Check your system roles configuration
```

## Common Modifications

### Add Custom Action Type

```python
# audit/models.py
ACTION_CHOICES = [
    ...
    ('my_custom_action', 'My Custom Action'),
]

# Then use:
log_action(request.user, 'my_custom_action', target=obj)
```

### Exclude Fields from Comparison

```python
changes = compare_models(
    old_obj, new_obj,
    exclude=['created_at', 'updated_at', 'viewed_count']
)
```

### Only Compare Specific Fields

```python
changes = compare_models(
    old_obj, new_obj,
    fields=['name', 'status', 'description']
)
```

### Custom Description

```python
log_action(
    request.user,
    'update_workflow',
    target=workflow,
    changes=changes,
    description="Updated workflow with new SLA settings"
)
```

## Performance Optimization

### For High-Volume Actions

Use async task if you have many creates/updates:

```python
from celery import shared_task

@shared_task
def log_action_async(user_id, action, target_type, target_id, changes=None):
    from audit.utils import log_action
    log_action(
        user_data={'user_id': user_id},
        action=action,
        target=None,  # Can't pass object in async
        changes=changes
    )

# In your view:
log_action_async.delay(user.id, 'create_workflow', 'Workflow', workflow.id)
```

### Archive Old Records

```python
# management/commands/archive_audit_logs.py
from django.core.management.base import BaseCommand
from audit.models import AuditEvent
from datetime import timedelta
from django.utils.timezone import now

class Command(BaseCommand):
    def handle(self, *args, **options):
        cutoff = now() - timedelta(days=90)
        old_events = AuditEvent.objects.filter(timestamp__lt=cutoff)
        count = old_events.count()
        old_events.delete()
        self.stdout.write(f"Archived {count} audit events")
```

## Documentation Reference

- **QUICK_REFERENCE.md** - Copy-paste code snippets
- **IMPLEMENTATION.md** - Detailed implementation guide
- **EXAMPLES.md** - Real-world integration examples
- **README.md** - System overview
- **IMPLEMENTATION_SUMMARY.md** - Architecture summary

## Next Steps

1. ✓ System is implemented
2. → Run migration: `python manage.py migrate audit`
3. → Add logging to create/update/delete endpoints
4. → Test via admin and API
5. → Add audit history views (optional)
6. → Set up scheduled archival (optional)

## Questions?

Refer to:
- Code examples in `EXAMPLES.md`
- Quick reference in `QUICK_REFERENCE.md`
- Full details in `IMPLEMENTATION.md`
