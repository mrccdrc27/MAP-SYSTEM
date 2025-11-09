# Automatic Task Creation Workflow

## Overview

This system automatically creates and assigns tasks when a ticket is received. The workflow follows these steps:

1. **Ticket Reception** - A ticket is received via Celery task `receive_ticket`
2. **Workflow Matching** - The system finds the matching workflow based on department-category
3. **Step Resolution** - Gets the first step from the workflow
4. **User Assignment** - Fetches users for the step's role and applies round-robin logic
5. **Task Creation** - Creates a task with assigned users in JSON format
6. **Ticket Allocation** - Marks the ticket as task-allocated

## Architecture

### Celery Tasks

#### 1. `receive_ticket(ticket_data)`
- **Location**: `tickets/tasks.py`
- **Purpose**: Receives and processes incoming tickets
- **Behavior**: 
  - Validates and parses ticket data
  - Creates/updates the ticket in the database
  - Triggers `create_task_for_ticket` for new tickets
- **Returns**: Status object with ticket ID and action

#### 2. `create_task_for_ticket(ticket_id)`
- **Location**: `tickets/tasks.py`
- **Purpose**: Automatically creates a task for a new ticket
- **Process**:
  1. Retrieves the ticket
  2. Finds matching workflow (department-category match)
  3. Gets the first step ordered by step order
  4. Fetches users for the step's role from TTS service
  5. Applies round-robin assignment
  6. Creates the task with assigned users
  7. Marks ticket as `is_task_allocated = True`

### Helper Functions

#### `find_matching_workflow(department, category, sub_category)`
Finds an active, published workflow matching:
- First tries: exact match (department + category + sub_category)
- Falls back to: department + category (without sub_category)
- Only returns workflows with `is_published=True` and `status='deployed'`

#### `fetch_users_for_role(role_name)`
Calls the TTS round-robin endpoint:
- **Endpoint**: `GET /api/v1/tts/round-robin/?role_name={role_name}`
- **Parameters**: `role_name` (string, not ID)
- **Response**: `[user_id1, user_id2, user_id3, ...]` (array of user IDs)
- **Configuration**: Uses `TTS_SERVICE_URL` from settings

#### `apply_round_robin_assignment(user_ids, role_name, max_assignments=3)`
Distributes users fairly across tasks:
- Takes user IDs array and role name
- Maintains state per role using `_round_robin_state` dict
- Assigns up to `max_assignments` users (default 3)
- Returns structured assignment objects

**Assignment Object Structure**:
```json
{
  "userID": 3,
  "status": "assigned",
  "assigned_on": "2025-11-10T14:30:00Z",
  "role": "IT Support Technician"
}
```

## Data Models

### Task Model
**Location**: `task/models.py`

**Key Fields**:
```python
task_id: AutoField (primary key)
ticket_id: ForeignKey(WorkflowTicket)
workflow_id: ForeignKey(Workflows)
current_step: ForeignKey(Steps)
users: JSONField - Array of user assignments
status: CharField - pending, in_progress, completed, on_hold, cancelled
created_at: DateTimeField (auto)
updated_at: DateTimeField (auto)
fetched_at: DateTimeField (manual)
```

**Users JSON Format**:
```json
[
  {
    "userID": 3,
    "status": "assigned",
    "assigned_on": "2025-11-10T14:30:00Z",
    "role": "IT Support Technician"
  },
  {
    "userID": 6,
    "status": "in_progress",
    "assigned_on": "2025-11-10T14:30:00Z",
    "role": "IT Support Technician"
  }
]
```

**Task Methods**:
- `get_assigned_user_ids()` - Returns list of userIDs
- `get_assigned_users_by_status(status)` - Filters users by status
- `update_user_status(user_id, new_status)` - Updates user's task status
- `add_user_assignment(user_data)` - Adds new user to task
- `mark_as_completed()` - Completes task and triggers end logic
- `move_to_next_step()` - Moves task to next workflow step

## Configuration

### Environment Variables

Add these to your `.env` file:

```env
# TTS Service for round-robin assignment
TTS_SERVICE_URL=http://localhost:8002

# Celery broker for task queue
DJANGO_CELERY_BROKER_URL=redis://localhost:6379/0
```

### Django Settings

In `workflow_api/settings.py`:

```python
# TTS (Ticket Tracking Service) Configuration for round-robin assignment
TTS_SERVICE_URL = os.getenv('TTS_SERVICE_URL', 'http://localhost:8002')
```

## API Endpoints

### Task Management

**Base URL**: `/tasks/api/tasks/`

#### List all tasks
```
GET /tasks/api/tasks/
```

**Query Parameters**:
- `status` - Filter by task status
- `ticket_id` - Filter by ticket
- `workflow_id` - Filter by workflow

#### Create task manually (for testing)
```
POST /tasks/api/tasks/create_task_for_ticket/
Content-Type: application/json

{
  "ticket_id": 123
}
```

#### Assign user to task
```
POST /tasks/api/tasks/{id}/assign_user/
Content-Type: application/json

{
  "userID": 3,
  "username": "john_doe",
  "email": "john@example.com",
  "role": "IT Support Technician"
}
```

#### Update user status
```
POST /tasks/api/tasks/{id}/update_user_status/
Content-Type: application/json

{
  "user_id": 3,
  "status": "in_progress"
}
```

#### Mark task completed
```
POST /tasks/api/tasks/{id}/complete_task/
```

#### Move to next step
```
POST /tasks/api/tasks/{id}/move_to_next_step/
```

#### Get workflow statistics
```
GET /tasks/api/tasks/workflow_statistics/
```

## Round-Robin Logic

The round-robin system maintains a state per role:

```python
_round_robin_state = {
    "IT Support Technician": 0,
    "Manager": 1,
    "Admin": 2
}
```

**Example Flow** with users `[3, 6, 7]`:

1. **First assignment**: Start at index 0
   - Assign: [3, 6, 7]
   - Next index: 0 (after 3 users, cycle completes)

2. **Second assignment**: Start at index 0
   - Assign: [3, 6, 7]
   - Next index: 0

3. If `max_assignments=1`:
   - **First**: Assign [3], next index: 1
   - **Second**: Assign [6], next index: 2
   - **Third**: Assign [7], next index: 0
   - **Fourth**: Assign [3], next index: 1

## Workflow Matching Algorithm

```
Input: ticket.department, ticket.category, ticket.sub_category

1. Try exact match:
   Workflows.objects.filter(
     department=ticket.department,
     category=ticket.category,
     sub_category=ticket.sub_category,
     is_published=True,
     status='deployed'
   ).first()

2. If not found, try without sub_category:
   Workflows.objects.filter(
     department=ticket.department,
     category=ticket.category,
     is_published=True,
     status='deployed'
   ).first()

3. Return workflow or None
```

## Error Handling

The system handles these scenarios gracefully:

| Scenario | Response |
|----------|----------|
| No matching workflow | Returns error, ticket marked but no task created |
| No steps in workflow | Returns error |
| No users for role | Returns error |
| Network error (TTS unreachable) | Returns empty array, error logged |
| Ticket not found | Returns 404 error |
| Invalid ticket data | Returns validation errors |

## Serializers

### TaskSerializer
**Location**: `task/serializers.py`

Provides read-only fields for easy frontend consumption:
- `ticket_subject` - From related ticket
- `workflow_name` - From related workflow
- `current_step_name` - From related step
- `current_step_role` - From step's role
- `assigned_users_count` - Calculated count

### UserAssignmentSerializer
For validating user assignment data:
- `userID` (required, integer)
- `username` (optional)
- `email` (optional)
- `status` (enum: assigned, in_progress, completed, on_hold)
- `role` (optional)

## Flow Diagram

```
Ticket Received (Celery)
        ↓
receive_ticket(ticket_data)
        ↓
Validate & Parse
        ↓
Create/Update Ticket
        ↓
Is New Ticket?
        ├─ NO → Return success
        └─ YES ↓
          create_task_for_ticket(ticket_id)
                  ↓
          Find Matching Workflow
                  ├─ NOT FOUND → Error
                  └─ FOUND ↓
            Get First Step (ordered by order)
                  ├─ NOT FOUND → Error
                  └─ FOUND ↓
            fetch_users_for_role(role_name)
            Call: GET /api/v1/tts/round-robin/?role_name=...
                  ├─ EMPTY → Error
                  └─ [3, 6, 7] ↓
            apply_round_robin_assignment([3, 6, 7], role_name)
                  ↓
            Create Task with assignments
                  ↓
            Mark ticket.is_task_allocated = True
                  ↓
            Return success with task_id
```

## Testing

Run the test script to demonstrate the workflow:

```bash
cd workflow_api
python test_workflow.py
```

This will:
1. Create test roles and workflows
2. Simulate ticket reception
3. Test automatic task creation
4. Test manual task creation
5. Test task operations
6. Display system statistics

## Integration Points

### With TTS Service
- Calls `/api/v1/tts/round-robin/?role_name={role_name}`
- Returns user IDs for round-robin assignment
- Must be running and accessible at `TTS_SERVICE_URL`

### With Celery/Redis
- Uses Celery for async task processing
- Requires Redis broker at `DJANGO_CELERY_BROKER_URL`
- Tasks are stored and executed asynchronously

### With Notification Service (Optional)
- When workflow has `end_logic='notification'`
- Triggers notification workflow on task completion
- Implements the `mark_as_completed()` method

## Troubleshooting

**Issue**: Tasks not being created automatically
- Check: Is Celery worker running?
- Check: Is Redis accessible?
- Check: Does matching workflow exist with `is_published=True` and `status='deployed'`?

**Issue**: Round-robin not working
- Check: Is TTS service running at configured URL?
- Check: Role name matches exactly (case-sensitive)
- Check: Endpoint returns valid user ID array

**Issue**: Workflow not found
- Check: Ticket has correct department, category, and sub_category
- Check: Workflow exists with matching values
- Check: Workflow status is 'deployed' and is_published is True

**Issue**: No users returned for role
- Check: Role name in workflow step matches TTS role names
- Check: Users are assigned to that role in auth service
- Check: Round-robin endpoint is responding correctly