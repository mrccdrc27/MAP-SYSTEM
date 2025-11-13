# Target Resolution - API Display Guide

## Changes Made

Updated all task-related serializers to include `target_resolution` field in API responses.

## Updated Serializers

### 1. TaskItemSerializer
**New fields**:
- `target_resolution` - DateTime: When this user's assignment is due
- `resolution_time` - DateTime: When the user actually resolved it

```python
{
    "task_item_id": 1,
    "user_id": 6,
    "username": "john_doe",
    "email": "john@example.com",
    "status": "assigned",
    "role": "Admin",
    "assigned_on": "2025-11-13T10:00:00Z",
    "target_resolution": "2025-11-14T02:15:30Z",  ← NEW
    "resolution_time": null                        ← NEW
}
```

### 2. TaskSerializer
**New fields**:
- `target_resolution` - DateTime: Target resolution for the task
- `resolution_time` - DateTime: Actual resolution time

```python
{
    "task_id": 1,
    "ticket_id": 1,
    "workflow_id": "uuid",
    "status": "pending",
    "created_at": "2025-11-13T10:00:00Z",
    "target_resolution": "2025-11-14T02:15:30Z",  ← NEW
    "resolution_time": null,                      ← NEW
    "assigned_users_count": 1
}
```

### 3. UserTaskListSerializer
**New field**:
- `target_resolution` - DateTime: Task deadline at task level

```python
{
    "task_id": 1,
    "ticket_subject": "System Down",
    "status": "pending",
    "target_resolution": "2025-11-14T02:15:30Z",  ← NEW
    "user_assignment": {
        "user_id": 6,
        "status": "assigned",
        "target_resolution": "2025-11-14T02:15:30Z",  ← INCLUDED
        "assigned_on": "2025-11-13T10:00:00Z"
    }
}
```

## API Endpoints Affected

### 1. List User Tasks
**GET** `/tasks/my-tasks/`

Returns tasks with target_resolution:
```json
{
    "results": [
        {
            "task_id": 1,
            "ticket_subject": "System Issue",
            "status": "pending",
            "target_resolution": "2025-11-14T02:15:30Z",
            "user_assignment": {
                "target_resolution": "2025-11-14T02:15:30Z",
                "assigned_on": "2025-11-13T10:00:00Z"
            }
        }
    ]
}
```

### 2. Task List
**GET** `/tasks/`

Returns all tasks with target_resolution:
```json
{
    "results": [
        {
            "task_id": 1,
            "status": "pending",
            "target_resolution": "2025-11-14T02:15:30Z",
            "assigned_users": [
                {
                    "user_id": 6,
                    "target_resolution": "2025-11-14T02:15:30Z"
                }
            ]
        }
    ]
}
```

### 3. Task Details
**GET** `/tasks/details/?task_id=1`

Now includes target_resolution in task object:
```json
{
    "task": {
        "task_id": 1,
        "target_resolution": "2025-11-14T02:15:30Z",
        "workflow_id": "uuid"
    }
}
```

### 4. User Task Status Update
**POST** `/tasks/{id}/update-user-status/`

Response includes updated target_resolution:
```json
{
    "task_id": 1,
    "status": "in_progress",
    "target_resolution": "2025-11-14T02:15:30Z",
    "user_assignment": {
        "status": "in_progress",
        "target_resolution": "2025-11-14T02:15:30Z"
    }
}
```

## Frontend Usage Examples

### Get Task Deadline
```javascript
// From UserTaskListSerializer
const task = response.data.results[0];
const deadline = task.target_resolution;  // "2025-11-14T02:15:30Z"

// From user_assignment (per user deadline)
const userDeadline = task.user_assignment.target_resolution;
```

### Display Time Remaining
```javascript
const deadline = new Date(task.target_resolution);
const now = new Date();
const msRemaining = deadline - now;
const hoursRemaining = msRemaining / (1000 * 60 * 60);

if (hoursRemaining < 0) {
    console.log("⚠️ OVERDUE");
} else if (hoursRemaining < 1) {
    console.log("🔴 URGENT - Less than 1 hour");
} else if (hoursRemaining < 4) {
    console.log("🟠 SOON - Less than 4 hours");
} else {
    console.log(`🟢 ${hoursRemaining.toFixed(1)} hours remaining`);
}
```

### Filter Tasks by Deadline
```javascript
// Tasks due within 24 hours
const urgentTasks = tasks.filter(task => {
    const deadline = new Date(task.target_resolution);
    const day = 24 * 60 * 60 * 1000;
    return deadline - Date.now() <= day;
});

// Overdue tasks
const overdue = tasks.filter(task => 
    new Date(task.target_resolution) < Date.now()
);
```

### Sort by Deadline
```javascript
const sortedByDeadline = tasks.sort((a, b) => 
    new Date(a.target_resolution) - new Date(b.target_resolution)
);
```

## Query Parameters

All existing endpoints support the same query parameters:
- `status` - Filter by task status
- `workflow_id` - Filter by workflow
- `ticket_id` - Filter by ticket
- `search` - Search in subject/description
- `ordering` - Sort results
- `page` - Pagination

**Target resolution is now automatically included in all responses.**

## Data Types

| Field | Type | Nullable | Example |
|-------|------|----------|---------|
| target_resolution | DateTime (ISO 8601) | Yes | "2025-11-14T02:15:30Z" |
| resolution_time | DateTime (ISO 8601) | Yes | null (until resolved) |

## Backend Data Flow

```
Task created
  ↓
task.save() → auto-calculates target_resolution
  ↓
TaskItem created
  ↓
apply_round_robin_assignment() → sets target_resolution on TaskItem
  ↓
Serializer returns both values in API response
```

## Error Handling

If calculation fails:
- `target_resolution` will be `null`
- Task will still be created successfully
- Check logs for calculation errors

Example response with missing SLA:
```json
{
    "task_id": 1,
    "status": "pending",
    "target_resolution": null,  ← No SLA configured
    "user_assignment": {
        "status": "assigned",
        "target_resolution": null
    }
}
```

## What This Enables

### For Frontend
- ✅ Display deadline next to task title
- ✅ Color-code tasks by urgency
- ✅ Sort tasks by deadline
- ✅ Show time remaining countdown
- ✅ Alert when deadline approaches
- ✅ Filter tasks by due date

### For Users
- ✅ See when assignment is due
- ✅ Prioritize by deadline
- ✅ Manage workload better
- ✅ Track SLA compliance

### For Reporting
- ✅ Query tasks nearing deadline
- ✅ Report on SLA breaches
- ✅ Analyze step timing
- ✅ Track resolution accuracy

## Example API Call

```bash
# Get user's tasks with target resolution
curl -H "Cookie: auth_token=..." \
  "http://localhost:8001/api/tasks/my-tasks/"

# Response
{
    "count": 10,
    "results": [
        {
            "task_id": 1,
            "ticket_subject": "Database Issue",
            "status": "pending",
            "created_at": "2025-11-13T10:00:00Z",
            "target_resolution": "2025-11-14T02:15:30Z",
            "user_assignment": {
                "user_id": 6,
                "assigned_on": "2025-11-13T10:00:00Z",
                "target_resolution": "2025-11-14T02:15:30Z",
                "status": "assigned"
            }
        }
    ]
}
```

## Summary

✅ **target_resolution** now appears in:
- Task list responses
- User task list responses
- Task detail responses
- User assignment objects
- All serialized TaskItem objects

**Status**: Ready for Frontend Integration
