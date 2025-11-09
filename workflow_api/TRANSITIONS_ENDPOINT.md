## Task Transitions - Separate Endpoint

This document describes the dedicated transitions endpoint for moving tasks through workflow steps.

---

## Endpoint

### POST /transitions/

Dedicated endpoint for transitioning tasks to the next step via a workflow transition.

**Authentication:** Required (JWT Cookie)

---

## Request

```json
{
    "task_id": 1,
    "transition_id": 1
}
```

**Parameters:**

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `task_id` | integer | ✅ Yes | The task to transition |
| `transition_id` | integer | ✅ Yes | The transition to apply |

---

## Response (200 OK)

```json
{
    "status": "success",
    "message": "Task transitioned to next step successfully",
    "task_id": 1,
    "previous_step": {
        "step_id": 2,
        "name": "Request Submission",
        "order": 1,
        "role": "User"
    },
    "current_step": {
        "step_id": 3,
        "name": "Approval",
        "order": 2,
        "description": "Manager approval required",
        "instruction": "Review and approve the request",
        "role": "Manager"
    },
    "assigned_users": [
        {
            "userID": 7,
            "username": "",
            "email": "",
            "status": "assigned",
            "assigned_on": "2025-11-10T10:30:00.000000+00:00",
            "role": "Manager"
        }
    ],
    "task_details": {
        "task_id": 1,
        "ticket_id": 1,
        "ticket_subject": "Asset Checkout Request",
        "workflow_id": 1,
        "workflow_name": "Asset Checkout Workflow",
        "current_step": 3,
        "current_step_name": "Approval",
        "current_step_role": "Manager",
        "status": "pending",
        "users": [...],
        "created_at": "2025-11-09T20:00:00.000000+00:00",
        "updated_at": "2025-11-10T10:30:00.000000+00:00",
        "fetched_at": null
    }
}
```

---

## Error Responses

### 400 Bad Request - Missing task_id
```json
{
    "error": "task_id field is required"
}
```

### 400 Bad Request - Missing transition_id
```json
{
    "error": "transition_id field is required"
}
```

### 400 Bad Request - Invalid transition for current step
```json
{
    "error": "Invalid transition: current step is 3, but transition starts from step 2",
    "current_step_id": 3,
    "transition_from_step": 2
}
```

### 404 Not Found - Task doesn't exist
```json
{
    "error": "Task 999 not found"
}
```

### 404 Not Found - Transition doesn't exist
```json
{
    "error": "Transition 999 not found"
}
```

### 503 Service Unavailable - No users available for role
```json
{
    "error": "No users available for role Manager",
    "step_id": 3,
    "role": "Manager"
}
```

---

## What This Endpoint Does

1. **Validates inputs** - Checks that both task_id and transition_id are provided
2. **Validates task exists** - Returns 404 if task not found
3. **Validates transition exists** - Returns 404 if transition not found
4. **Validates transition is valid** - Ensures transition starts from the task's current step
5. **Fetches users** - Calls auth service to get users for the next step's role
6. **Applies round-robin** - Uses round-robin logic to select the next user to assign
7. **Updates task** - Sets new current_step, assigns new users, resets status to 'pending'
8. **Returns detailed response** - Includes both previous and current step info, assigned users, and full task details

---

## Usage Examples

### Example 1: Basic Transition
```bash
curl -X POST -H "Cookie: access_token=your_jwt_token" \
  -H "Content-Type: application/json" \
  -d '{
    "task_id": 1,
    "transition_id": 5
  }' \
  http://localhost:8000/transitions/
```

### Example 2: Using with JavaScript/Fetch
```javascript
const response = await fetch('http://localhost:8000/transitions/', {
    method: 'POST',
    headers: {
        'Content-Type': 'application/json',
        'Cookie': 'access_token=' + jwt_token
    },
    body: JSON.stringify({
        task_id: 1,
        transition_id: 5
    })
});

const result = await response.json();

if (result.status === 'success') {
    console.log(`Task moved from ${result.previous_step.name} to ${result.current_step.name}`);
    console.log(`Assigned to user: ${result.assigned_users[0].userID}`);
}
```

### Example 3: Python/Requests
```python
import requests

response = requests.post(
    'http://localhost:8000/transitions/',
    json={
        'task_id': 1,
        'transition_id': 5
    },
    cookies={'access_token': jwt_token}
)

result = response.json()

if result['status'] == 'success':
    print(f"Transitioned successfully!")
    print(f"Previous step: {result['previous_step']['name']}")
    print(f"Current step: {result['current_step']['name']}")
    print(f"New assigned user: {result['assigned_users'][0]['userID']}")
```

---

## Workflow

### Step 1: Get Available Transitions
First, get the list of available transitions for the current step:

```bash
curl -H "Cookie: access_token=your_jwt_token" \
  "http://localhost:8000/steps/transitions/?step_id=2"
```

This returns all possible transitions from step 2, each with a `transition_id`.

### Step 2: Choose a Transition
Select one of the available transitions (e.g., `transition_id: 5`).

### Step 3: Apply the Transition
Call the transitions endpoint:

```bash
curl -X POST -H "Cookie: access_token=your_jwt_token" \
  -H "Content-Type: application/json" \
  -d '{"task_id": 1, "transition_id": 5}' \
  http://localhost:8000/transitions/
```

### Step 4: Verify Success
Check the response:
- `status: "success"` means transition was successful
- `current_step` shows the new step
- `assigned_users` shows who was assigned
- `task_details` contains the full updated task

---

## Key Differences from Old Endpoint

| Feature | Old (`/tasks/{id}/move-to-step/`) | New (`/transitions/`) |
|---------|-----------------------------------|----------------------|
| Location | Within task routes | Separate route |
| Request method | Nested task ID | Include task_id in body |
| Clarity | Tied to task resource | Clear separation of concerns |
| Reusability | Task-specific | Can be reused for any operation |
| API design | REST-ish | Pure POST to endpoint |

---

## Implementation Details

**Location:** `task/transitions.py`
**View Class:** `TaskTransitionView` (extends `CreateAPIView`)
**URL Configuration:** `task/transitions_urls.py`
**Main Routes:** `workflow_api/urls.py`

---

## Integration Points

1. **Step Transitions** - Validates against `StepTransition` model
2. **Tasks** - Updates `Task.current_step` and `Task.users`
3. **Assignment Logic** - Uses `assign_users_for_step()` utility
4. **Auth Service** - Fetches users via round-robin endpoint
5. **Logging** - Logs all transitions for audit trail

---

## Best Practices

1. **Always validate transitions first** - Use `/steps/transitions/?step_id=X` to get available options
2. **Handle 503 errors** - Retry or notify admin if no users available
3. **Check task exists** - Verify task_id is correct before transitioning
4. **Log transitions** - Track workflow progress for audit purposes
5. **Error handling** - Implement retry logic for network failures

---

## Future Enhancements

- Add conditional routing based on task data
- Add approval workflows before transitions
- Add transition logging and history
- Add rollback functionality
- Add metrics/analytics for step duration
