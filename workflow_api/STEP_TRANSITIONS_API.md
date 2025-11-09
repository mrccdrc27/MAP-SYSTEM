## Step Transitions & Task Movement Endpoints

This documentation covers the new DRF endpoints for managing step transitions and moving tasks through workflow steps.

---

## 📋 Table of Contents

1. [List Available Transitions](#1-list-available-transitions)
2. [Move Task to Next Step](#2-move-task-to-next-step)
3. [Utility Functions](#3-utility-functions)
4. [Usage Examples](#4-usage-examples)
5. [Error Handling](#5-error-handling)

---

## 1. List Available Transitions

### Endpoint
```
GET /steps/transitions/?step_id=2
```

### Description
Lists all available transitions (edges) that a specific step can travel to. Returns all `StepTransition` objects where `from_step_id` matches the provided `step_id`.

### Authentication
**Required:** JWT Cookie Authentication

### Query Parameters
| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `step_id` | integer | ✅ Yes | The ID of the current step |

### Response (200 OK)
```json
{
    "current_step": {
        "step_id": 2,
        "name": "Request Submission",
        "description": "User submits the request",
        "role": "User"
    },
    "available_transitions": [
        {
            "transition_id": 1,
            "from_step_id": 2,
            "to_step_id": 3,
            "to_step_name": "Approval",
            "to_step_description": "Manager approval required",
            "to_step_instruction": "Review and approve the request",
            "to_step_order": 2,
            "to_step_role": "Manager",
            "name": null
        },
        {
            "transition_id": 2,
            "from_step_id": 2,
            "to_step_id": 4,
            "to_step_name": "Rejection",
            "to_step_description": "Request rejected",
            "to_step_instruction": "Notify user of rejection",
            "to_step_order": 3,
            "to_step_role": "Manager",
            "name": null
        }
    ],
    "count": 2
}
```

### Error Responses

**400 Bad Request** - Missing step_id:
```json
{
    "error": "step_id query parameter is required"
}
```

**404 Not Found** - Step doesn't exist:
```json
{
    "error": "Step with ID 999 not found"
}
```

### Example Usage
```bash
curl -H "Cookie: access_token=your_jwt_token" \
  "http://localhost:8000/steps/transitions/?step_id=2"
```

---

## 2. Move Task to Next Step

### Endpoint
```
POST /tasks/{task_id}/move-to-step/
```

### Description
Moves a task to the next step via a transition. This endpoint:
1. Validates the transition exists and is valid for the task's current step
2. Updates the task's `current_step` 
3. Fetches users for the new step's role from auth service
4. Assigns users using round-robin logic
5. Resets task status to 'pending'
6. Returns detailed response with previous step, new step, and assigned users

### Authentication
**Required:** JWT Cookie Authentication

### Path Parameters
| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `task_id` | integer | ✅ Yes | The ID of the task to move |

### Request Body
```json
{
    "transition_id": 1
}
```

### Response (200 OK)
```json
{
    "status": "success",
    "message": "Task moved to next step successfully",
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

### Error Responses

**400 Bad Request** - Missing transition_id:
```json
{
    "error": "transition_id field is required"
}
```

**400 Bad Request** - Invalid transition for current step:
```json
{
    "error": "Invalid transition: current step is 3, but transition starts from step 2",
    "current_step_id": 3,
    "transition_from_step": 2
}
```

**404 Not Found** - Task not found:
```json
{
    "error": "Not found."
}
```

**404 Not Found** - Transition doesn't exist:
```json
{
    "error": "Transition 999 not found"
}
```

**503 Service Unavailable** - No users available for the next step's role:
```json
{
    "error": "No users available for role Manager",
    "step_id": 3,
    "role": "Manager"
}
```

### Example Usage
```bash
curl -X POST -H "Cookie: access_token=your_jwt_token" \
  -H "Content-Type: application/json" \
  -d '{"transition_id": 1}' \
  http://localhost:8000/tasks/1/move-to-step/
```

### Workflow
1. User/system calls endpoint with task_id and transition_id
2. System validates transition is valid for current step
3. System fetches all users for the new step's role
4. System applies round-robin logic to select the next user
5. System updates task's current_step and users
6. System returns success response with all details

---

## 3. Utility Functions

### A. `fetch_users_for_role(role_name)`

**Location:** `task/utils/assignment.py`

**Purpose:** Fetches all users for a specific role from the auth service.

**Parameters:**
```python
role_name: str  # Name of the role (e.g., "Manager", "Admin")
```

**Returns:**
```python
List[int]  # List of user IDs [3, 6, 7, ...]
```

**Call Endpoint:**
```
GET http://auth-service:8002/api/v1/tts/round-robin/?role_name=Manager
```

**Example:**
```python
from task.utils.assignment import fetch_users_for_role

user_ids = fetch_users_for_role("Manager")
# Returns: [3, 6, 7, 10]
```

---

### B. `apply_round_robin_assignment(user_ids, role_name, max_assignments=1)`

**Location:** `task/utils/assignment.py`

**Purpose:** Applies round-robin logic to select the next user from a list, maintaining state persistence.

**Parameters:**
```python
user_ids: List[int]      # List of user IDs
role_name: str           # Role name for state tracking (persisted in DB)
max_assignments: int = 1 # Number of users to assign (default 1)
```

**Returns:**
```python
List[Dict]  # User assignment objects with status, role, and timestamp
[
    {
        "userID": 7,
        "username": "",
        "email": "",
        "status": "assigned",
        "assigned_on": "2025-11-10T10:30:00.000000+00:00",
        "role": "Manager"
    }
]
```

**How it works:**
1. Fetches/creates RoundRobin state for the role
2. Gets current index for this role
3. Calculates next user index: `current_index % len(user_ids)`
4. Assigns that user
5. Increments index for next assignment: `(current_index + 1) % len(user_ids)`
6. Persists state to database

**Example:**
```python
from task.utils.assignment import apply_round_robin_assignment

user_ids = [3, 6, 7, 10]
assigned_users = apply_round_robin_assignment(user_ids, "Manager")
# Returns: [{"userID": 3, "status": "assigned", ...}]
# Next call will return: [{"userID": 6, "status": "assigned", ...}]
# Then: [{"userID": 7, ...}]
# Then: [{"userID": 10, ...}]
# Then cycles back: [{"userID": 3, ...}]
```

---

### C. `assign_users_for_step(step, role_name)`

**Location:** `task/utils/assignment.py`

**Purpose:** High-level convenience function combining fetching users and round-robin assignment.

**Parameters:**
```python
step: Steps        # Steps model instance
role_name: str     # Name of the role
```

**Returns:**
```python
List[Dict]  # User assignment objects
```

**Example:**
```python
from task.utils.assignment import assign_users_for_step
from step.models import Steps

step = Steps.objects.get(step_id=3)
assigned_users = assign_users_for_step(step, "Manager")
# Returns: [{"userID": 7, "status": "assigned", ...}]
```

---

## 4. Usage Examples

### Example 1: Complete Workflow Transition

**Step 1:** Get available transitions from current step
```bash
curl -H "Cookie: access_token=your_jwt_token" \
  "http://localhost:8000/steps/transitions/?step_id=2"
```

Response shows 2 available transitions with IDs 1 and 2.

**Step 2:** Move task via transition 1
```bash
curl -X POST -H "Cookie: access_token=your_jwt_token" \
  -H "Content-Type: application/json" \
  -d '{"transition_id": 1}' \
  http://localhost:8000/tasks/5/move-to-step/
```

Task moves from step 2 → step 3, users updated automatically.

---

### Example 2: Python Integration

```python
from rest_framework.test import APIClient
from django.test import TestCase

class TaskTransitionTests(TestCase):
    def test_move_task_to_next_step(self):
        client = APIClient()
        
        # Authenticate
        client.cookies['access_token'] = 'your_jwt_token'
        
        # Get transitions for current step
        response = client.get('/steps/transitions/?step_id=2')
        transitions = response.data['available_transitions']
        
        # Move task via first transition
        response = client.post(
            '/tasks/1/move-to-step/',
            {'transition_id': transitions[0]['transition_id']}
        )
        
        assert response.status_code == 200
        assert response.data['status'] == 'success'
        print(f"Task moved! New step: {response.data['current_step']['name']}")
        print(f"Assigned to user: {response.data['assigned_users'][0]['userID']}")
```

---

### Example 3: Using Assignment Utilities Directly

```python
from task.utils.assignment import assign_users_for_step
from step.models import Steps
from task.models import Task

# Get step and assign users
step = Steps.objects.get(step_id=3)
assigned_users = assign_users_for_step(step, step.role_id.name)

# Update task manually if needed
task = Task.objects.get(task_id=1)
task.current_step = step
task.users = assigned_users
task.status = 'pending'
task.save()
```

---

## 5. Error Handling

### Common Error Scenarios

#### Scenario 1: Step doesn't exist
```
Request: GET /steps/transitions/?step_id=999
Response: 404 Not Found
{
    "error": "Step with ID 999 not found"
}
```

#### Scenario 2: No transitions available
```
Request: GET /steps/transitions/?step_id=5
Response: 200 OK
{
    "current_step": {...},
    "available_transitions": [],
    "count": 0
}
```

**Action:** This step is terminal - no further transitions available.

#### Scenario 3: Invalid transition for current step
```
Request: POST /tasks/1/move-to-step/
Body: {"transition_id": 1}

Current task step_id = 5
Transition from_step_id = 2
Transition to_step_id = 3

Response: 400 Bad Request
{
    "error": "Invalid transition: current step is 5, but transition starts from step 2",
    "current_step_id": 5,
    "transition_from_step": 2
}
```

**Action:** Use correct transition that starts from current step (5).

#### Scenario 4: No users available for role
```
Request: POST /tasks/1/move-to-step/
Body: {"transition_id": 1}

Auth service has no users with role "Manager"

Response: 503 Service Unavailable
{
    "error": "No users available for role Manager",
    "step_id": 3,
    "role": "Manager"
}
```

**Action:** Add users with Manager role to auth service or check auth service connectivity.

#### Scenario 5: Authentication failed
```
Request: GET /steps/transitions/?step_id=2
(No JWT token in cookie)

Response: 401 Unauthorized
{
    "error": "Authentication failed"
}
```

**Action:** Include valid JWT token in `access_token` cookie.

---

## Database Models Used

### RoundRobin Model
```python
# Stored in tickets app
class RoundRobin(models.Model):
    role_name = models.CharField(unique=True)
    current_index = models.IntegerField(default=0)
```

Tracks the current round-robin index for each role to ensure fair distribution.

---

## Integration Points

### Auth Service Integration
- **Endpoint:** `GET /api/v1/tts/round-robin/?role_name={role_name}`
- **Returns:** List of user IDs
- **Configuration:** `settings.AUTH_SERVICE_URL`

### Workflow Components
- **Steps:** Define workflow stages and required roles
- **StepTransition:** Define allowed transitions between steps
- **Task:** Holds current step and assigned users
- **Task.users:** JSON array of assigned user objects

---

## Best Practices

1. **Always validate transitions exist** before calling move-to-step
2. **Handle 503 errors** gracefully - retry or notify admin if users unavailable
3. **Log step transitions** for audit trails
4. **Check available transitions first** to provide UI options to users
5. **Use round-robin assignment** for fair load distribution
6. **Verify user has permission** before allowing transitions (can be added to views)

---

## Future Enhancements

- Add permission checks to prevent unauthorized transitions
- Add conditional routing logic for step transitions
- Add transition approval workflows
- Add metrics/analytics for workflow step duration
- Add rollback functionality to previous steps
