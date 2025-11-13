# Audit System - Quick Reference

## Copy-Paste Ready Code

### Basic Import
```python
from audit.utils import log_action, compare_models
from copy import deepcopy
```

### Log a Create Action
```python
log_action(
    user_data=request.user,
    action='create_workflow',
    target=workflow,
    request=request
)
```

### Log an Update with Changes
```python
workflow = Workflow.objects.get(id=workflow_id)
old_workflow = deepcopy(workflow)

# ... make changes to workflow ...
workflow.save()

changes = compare_models(old_workflow, workflow)
log_action(
    user_data=request.user,
    action='update_workflow',
    target=workflow,
    changes=changes,
    request=request
)
```

### Log a Delete
```python
log_action(
    user_data=request.user,
    action='delete_workflow',
    target=workflow,
    request=request
)

workflow.delete()
```

### Decorator Approach
```python
from audit.decorators import audit_action

@audit_action('create_workflow')
def create_workflow_view(request):
    workflow = Workflow.objects.create(**request.data)
    return Response(WorkflowSerializer(workflow).data)
```

### Query Audit History
```python
from audit.utils import get_object_audit_history, AuditEventSerializer

workflow = Workflow.objects.get(id=5)
history = get_object_audit_history(workflow)
serializer = AuditEventSerializer(history, many=True)
return Response(serializer.data)
```

### Manual Change Dict
```python
log_action(
    user_data=request.user,
    action='update_workflow',
    target=workflow,
    changes={
        'name': {'old': old_name, 'new': workflow.name},
        'status': {'old': old_status, 'new': workflow.status}
    },
    request=request
)
```

## API Endpoints Reference

```bash
# List all events
GET /audit/events/

# User's events (last 7 days)
GET /audit/events/by_user/?user_id=123&days=7

# All changes to specific workflow
GET /audit/events/by_object/?target_type=Workflow&target_id=5

# All create_workflow events
GET /audit/events/by_action/?action=create_workflow

# Statistics
GET /audit/events/summary/?days=30

# With search
GET /audit/events/?search=john&days=30
```

## Action Types

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

## Django Admin

View logs at: `/admin/audit/auditevent/`

- **Read-only** (can't modify)
- **Search** by username, email, action, description
- **Filter** by date, action type, target type
- **View** JSON changes

## Key Points

❌ **DON'T** POST to `/audit/events/` to create logs
✅ **DO** call `log_action()` from your code
✅ **DO** GET from `/audit/events/` to retrieve logs

## Most Common Patterns

### Pattern 1: Service Layer (Best)
```python
# service.py
class WorkflowService:
    @staticmethod
    def update_workflow(user_data, workflow_id, updates, request=None):
        workflow = Workflow.objects.get(id=workflow_id)
        old_workflow = deepcopy(workflow)
        
        for field, value in updates.items():
            setattr(workflow, field, value)
        workflow.save()
        
        changes = compare_models(old_workflow, workflow)
        log_action(user_data, 'update_workflow', target=workflow, 
                  changes=changes, request=request)
        return workflow

# views.py
workflow = WorkflowService.update_workflow(request.user, workflow_id, request.data, request)
```

### Pattern 2: Inline in View
```python
def update_workflow(request, workflow_id):
    workflow = Workflow.objects.get(id=workflow_id)
    old_status = workflow.status
    
    workflow.status = request.data['status']
    workflow.save()
    
    log_action(
        request.user, 'update_workflow', workflow,
        changes={'status': {'old': old_status, 'new': workflow.status}},
        request=request
    )
    return Response(...)
```

### Pattern 3: Decorator
```python
@audit_action('publish_workflow')
def publish_workflow(request, workflow_id):
    workflow = Workflow.objects.get(id=workflow_id)
    workflow.is_published = True
    workflow.save()
    return Response({'message': 'Published'})
```

## Changes Format

```python
changes = {
    'field_name': {'old': previous_value, 'new': new_value},
    'another_field': {'old': 'value1', 'new': 'value2'},
}
```

## User Data Formats

### From Request (JWT)
```python
log_action(user_data=request.user, ...)
# request.user has: user_id, username, email
```

### As Dictionary
```python
log_action(user_data={
    'user_id': 123,
    'username': 'marc',
    'email': 'marc@example.com'
}, ...)
```

## Common Queries

```python
from audit.utils import get_audit_events, get_user_audit_trail

# Get user's actions from last week
trail = get_user_audit_trail(user_id=123, days=7)

# Get all updates to workflow #5
events = get_audit_events(target_type='Workflow', target_id=5)

# Get workflow creates from last 30 days
events = get_audit_events(action='create_workflow', days=30)

# Get all by specific user
events = get_audit_events(user_id=123)
```

## Integration Checklist

- [ ] Run migration: `python manage.py migrate audit`
- [ ] Create workflow endpoint: add `log_action()` call
- [ ] Update workflow endpoint: add `compare_models()` + `log_action()` call
- [ ] Delete workflow endpoint: add `log_action()` call
- [ ] Test in admin: `/admin/audit/auditevent/`
- [ ] Test via API: `GET /audit/events/`
- [ ] Test via code: `get_object_audit_history(workflow)`

## Troubleshooting

### Logs not appearing?
1. Check migration ran: `python manage.py migrate audit`
2. Check `request.user` has `user_id` attribute
3. Check `action` string matches `AuditEvent.ACTION_CHOICES`

### Need to add custom action type?
Add to `audit/models.py` in `AuditEvent.ACTION_CHOICES`:
```python
ACTION_CHOICES = [
    ...
    ('my_custom_action', 'My Custom Action'),
    ...
]
```

### Want to exclude fields from comparison?
```python
changes = compare_models(old_obj, new_obj, 
                        exclude=['created_at', 'updated_at', 'id'])
```

### Need specific fields only?
```python
changes = compare_models(old_obj, new_obj, 
                        fields=['name', 'status', 'description'])
```

## Performance Tips

1. **Log in transaction** - happens within DB transaction
2. **Index on user_id, timestamp** - already indexed
3. **Archive old records** - consider moving 90+ day old logs
4. **Use async if heavy** - consider Celery for high-volume logging

## Testing Audit

```python
from audit.models import AuditEvent

def test_workflow_update_logged():
    workflow = Workflow.objects.create(name='Test')
    WorkflowService.update_workflow(
        user_data={'user_id': 1, 'username': 'test'},
        workflow_id=workflow.id,
        updates={'name': 'Updated'}
    )
    
    event = AuditEvent.objects.filter(
        action='update_workflow',
        target_type='Workflow',
        target_id=workflow.id
    ).first()
    
    assert event is not None
    assert event.changes['name']['new'] == 'Updated'
```

## Detailed Docs

- Full Implementation: `IMPLEMENTATION.md`
- Code Examples: `EXAMPLES.md`
- Overview: `README.md`
