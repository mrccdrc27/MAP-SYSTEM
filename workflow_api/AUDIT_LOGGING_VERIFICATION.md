# Audit Logging Integration - Verification & Troubleshooting

## Overview
We've successfully integrated audit logging into the Workflow, Step, and Task apps. The logging is **internal** (no external API calls) - it happens automatically when actions occur.

## What's Been Added

### 1. Workflow App (`workflow/views.py`)
- **create()** - Logs when workflows are created (with or without graph)
- **update_graph()** - Logs when workflow graph nodes/edges change
- **update_details()** - Logs when workflow metadata is updated

### 2. Step App (`step/views.py`)
- **StepWeightManagementView.put()** - Logs when step weights are updated

### 3. Task App (`task/views.py`)
- **create()** - Logs when tasks are created
- **update()** - Logs when tasks are updated
- **destroy()** - Logs when tasks are deleted
- **update_user_status()** - Logs when user task status changes

### 4. Audit Utils Enhanced
- Better error logging with timestamps and status indicators
- Try-catch blocks prevent errors from breaking functionality
- Improved debug messages to track logging flow

## Verification Steps

### Option 1: Run Django Shell Test
```bash
cd workflow_api
python manage.py shell < test_audit_logging.py
```

This will:
- Verify audit app is installed
- Show current audit event counts
- Create a test audit event
- Display the counts before/after
- Show the latest events

### Option 2: Check Database Directly
```bash
python manage.py dbshell
SELECT COUNT(*) FROM audit_auditevent;
SELECT * FROM audit_auditevent ORDER BY timestamp DESC LIMIT 5;
```

### Option 3: Make an API Call and Check Logs
1. Create/Update/Delete a workflow, step, or task
2. Check Django logs for messages like:
   ```
   📝 Audit: Starting log_action for action='create_workflow'...
   ✅ Audit: Successfully logged action 'create_workflow' (ID: 123)...
   ```

3. Query the audit log REST API:
   ```
   GET /api/audit/events/?action=create_workflow
   GET /api/audit/events/?user_id=1
   GET /api/audit/events/?limit=10&offset=0
   ```

## Debugging Logs

### Check for These Log Messages

**Success Indicators:**
- `📝 Audit: Starting log_action for action='...'`
- `✅ Audit: Successfully logged action '...' (ID: 123)`

**Error Indicators:**
- `❌ Audit: Error logging action '...': ...`
- `Failed to log audit for ...: ...`

### Enable Full Debug Logging

In `workflow_api/settings.py`, update logging config:
```python
LOGGING = {
    'version': 1,
    'disable_existing_loggers': False,
    'handlers': {
        'console': {
            'class': 'logging.StreamHandler',
        },
    },
    'root': {
        'handlers': ['console'],
        'level': 'DEBUG',  # Set to DEBUG for verbose output
    },
}
```

### Common Issues

**Issue: No logs are being created**
1. Check if audit app is installed in INSTALLED_APPS
2. Run migrations: `python manage.py migrate audit`
3. Check database connection is working
4. Verify log_action() is being called (check console logs for `📝` messages)

**Issue: Logs are created but views error out**
1. Check the try-catch blocks are working
2. Look for error messages like "Failed to log audit for..."
3. The endpoint should still work even if audit fails

**Issue: "audit.utils not found"**
1. Make sure audit/utils.py exists
2. Check imports: `from audit.utils import log_action, compare_models`

## What Gets Logged

Each audit event captures:
- **user_id**: ID of the user performing the action
- **username**: Username from JWT token
- **email**: Email from JWT token
- **action**: Type of action (create_workflow, update_task, etc.)
- **target_type**: Model type being acted on (Workflow, Task, Step, etc.)
- **target_id**: ID of the target object
- **changes**: Dict of field changes {field: {old: value, new: value}}
- **timestamp**: When the action occurred
- **ip_address**: Client IP (if request available)
- **user_agent**: Browser info (if request available)

## Query Audit Logs

### Via REST API
```
GET /api/audit/events/
GET /api/audit/events/?action=create_workflow
GET /api/audit/events/?user_id=1
GET /api/audit/events/?target_type=Workflow
```

### Via Django Admin
Visit: `/admin/audit/auditevent/`
- Read-only interface
- Filter by action, user, date range
- View full change details

### Via Django ORM
```python
from audit.models import AuditEvent

# All events
AuditEvent.objects.all()

# By action
AuditEvent.objects.filter(action='create_workflow')

# By user
AuditEvent.objects.filter(user_id=1)

# By date
from django.utils import timezone
today = timezone.now().date()
AuditEvent.objects.filter(timestamp__date=today)

# With changes
events = AuditEvent.objects.exclude(changes__isnull=True)
for event in events:
    print(event.changes)
```

## Expected Behavior

### When Creating a Workflow
```
POST /api/workflows/
→ Workflow created
→ log_action() called internally
→ AuditEvent record created in database
→ ✅ Audit endpoint shows this event
```

### When Updating a Task
```
PUT /api/tasks/1/
→ Task updated
→ Old values captured
→ New values compared
→ Changes detected
→ log_action() called internally
→ AuditEvent record created with changes
→ ✅ Audit endpoint shows action with change details
```

### When Deleting a Step
```
DELETE /api/steps/5/
→ log_action() called with step object
→ AuditEvent record created
→ Step deleted
→ ✅ Audit trail preserved even after deletion
```

## Testing Checklist

- [ ] Run test_audit_logging.py and see "✅ Audit app is installed"
- [ ] Create a workflow via API and see it logged
- [ ] Update a task and verify changes are tracked
- [ ] Delete a workflow and check audit trail is preserved
- [ ] Query /api/audit/events/ and see results
- [ ] Check console logs show `📝` and `✅` messages
- [ ] Verify database has AuditEvent records

## Next Steps

1. **Monitor**: Watch the logs during normal operations
2. **Test**: Create sample data and verify audits are created
3. **Query**: Use the audit API to retrieve and analyze logs
4. **Report**: Generate reports from audit data if needed
