# TTS ↔ HDTS Integration Documentation

This document outlines the integration points, APIs, and responsibilities between the **Ticket Tracking System (TTS)** and **HelpDesk Tracking System (HDTS)**.

---

## Table of Contents

1. [System Overview](#system-overview)
2. [User Roles & Communication](#user-roles--communication)
3. [Integration Points](#integration-points)
   - [Owned Tickets](#1-owned-tickets)
   - [Department, Categories & Subcategories](#2-department-categories--subcategories)
   - [Ticket Action Logs & History](#3-ticket-action-logs--history)
   - [CSAT (Customer Satisfaction)](#4-csat-customer-satisfaction)
   - [Ticket Status Sync](#5-ticket-status-sync-tts--hdts)
   - [SLA (Service Level Agreements)](#6-sla-service-level-agreements)
   - [Escalation & Transfer](#7-escalation--transfer)
4. [API Reference](#api-reference)
5. [Data Flow Diagrams](#data-flow-diagrams)

---

## System Overview

| System | Purpose | Port | Key Components |
|--------|---------|------|----------------|
| **TTS (Ticket Tracking System)** | Workflow orchestration, task management, SLA enforcement | 8002 | `workflow_api` Django service |
| **HDTS (HelpDesk Tracking System)** | Ticket submission, coordinator management, employee interactions | 8000 | `helpdesk` Django backend + React frontend |

### Architecture

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                              HDTS Frontend                                  │
│                         (React/Vite - Port 1000)                            │
└─────────────────────┬───────────────────────────────────────────────────────┘
                      │
                      ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                           HDTS Backend                                      │
│                      (Django - Port 8000)                                   │
│  • Ticket CRUD                                                              │
│  • Employee Management                                                      │
│  • CSAT Collection                                                          │
│  • Ticket Comments                                                          │
└─────────────────────┬───────────────────────────────────────────────────────┘
                      │ (HTTP REST / Celery Tasks)
                      ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                           TTS Workflow API                                  │
│                      (Django - Port 8002)                                   │
│  • Workflow Orchestration                                                   │
│  • Task Assignment (Round-Robin)                                            │
│  • SLA Calculation & Monitoring                                             │
│  • Escalation & Transfer                                                    │
│  • Action Logs & Audit Trail                                                │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## User Roles & Communication

### Key Roles

| Role | System | Responsibilities |
|------|--------|------------------|
| **Employee** | HDTS | Submit tickets, view ticket status, rate resolved tickets (CSAT) |
| **Ticket Coordinator** | HDTS + TTS | Approve/reject tickets, manage owned tickets, communicate with TTS agents |
| **TTS Agent** | TTS | Work on assigned tasks, escalate/transfer tasks, resolve tickets |
| **Admin** | Both | System configuration, user management |

### Communication Flow

```
┌──────────────────┐                    ┌──────────────────┐
│  HDTS Ticket     │   WebSocket/API    │   TTS Agent      │
│  Coordinator     │◄──────────────────►│                  │
│                  │                    │                  │
│  • Views owned   │                    │  • Works on      │
│    tickets       │                    │    assigned      │
│  • Approves/     │                    │    tasks         │
│    rejects       │                    │  • Updates       │
│  • Monitors      │                    │    status        │
│    progress      │                    │  • Escalates     │
└──────────────────┘                    └──────────────────┘
```

**Real-time Messaging**: HDTS Coordinators and TTS Agents communicate via WebSocket messaging on owned tickets.

- **Messaging Service**: Port 8005
- **Hook**: `useMessaging` in HDTS frontend
- **Endpoint**: `/api/messages/ticket/{ticket_id}/`

---

## Integration Points

### 1. Owned Tickets

#### Overview
When a ticket is approved in HDTS, it becomes an "Owned Ticket" for the Ticket Coordinator. The ticket is pushed to TTS for workflow processing, and the Coordinator can monitor its progress.

#### Origin of Owned Tickets
1. **Employee** submits ticket in HDTS
2. **Ticket Coordinator** approves the ticket (sets priority, department)
3. HDTS **pushes ticket to TTS** via Celery task
4. TTS creates a **Task** and assigns **Ticket Owner** (Ticket Coordinator)
5. Coordinator sees ticket in "Owned Tickets" view

#### API Endpoints

| Direction | Endpoint | Method | Description |
|-----------|----------|--------|-------------|
| HDTS → TTS | `POST /tasks/owned-tickets/` | GET | Fetch tickets owned by current Ticket Coordinator |
| HDTS → TTS | `GET /tasks/?ticket_number={number}` | GET | Get specific task by ticket number |
| HDTS → HDTS | `GET /api/tickets/number/{ticket_number}/` | GET | Get full ticket details from HDTS backend |

#### HDTS Frontend Service
**File**: [ticketService.js](hdts/frontendfolder/src/services/backend/ticketService.js)

```javascript
// Get tickets owned by the current user (Ticket Coordinator)
async getOwnedTickets({ tab = '', search = '', page = 1, pageSize = 10 } = {}) {
  const params = new URLSearchParams();
  if (tab) params.append('tab', tab);        // 'active' or 'inactive'
  if (search) params.append('search', search);
  params.append('page', page.toString());
  params.append('page_size', pageSize.toString());
  
  const url = `${WORKFLOW_URL}/tasks/owned-tickets/?${params.toString()}`;
  // ... fetch with JWT auth
}
```

#### TTS Backend View
**File**: [task/views.py](tts/workflow_api/task/views.py) - `OwnedTicketsListView`

```python
class OwnedTicketsListView(ListAPIView):
    """
    View to list Tasks owned by the authenticated user (Ticket Coordinator).
    Returns tasks where the current user is assigned as ticket_owner.
    
    Permission: Requires HDTS Ticket Coordinator role.
    
    Query Parameters:
        - tab: 'active', 'inactive' - filters by task status
        - search: search term for ticket subject/description/number
        - page: page number
        - page_size: items per page (default 10, max 100)
    """
    required_system_roles = {
        'hdts': ['Ticket Coordinator']
    }
```

#### Response Format
```json
{
  "count": 15,
  "next": "http://localhost:8002/tasks/owned-tickets/?page=2",
  "previous": null,
  "results": [
    {
      "task_id": 1,
      "ticket_number": "TX20251222801173",
      "ticket_subject": "Network Issue",
      "ticket_description": "Unable to connect to VPN",
      "status": "in progress",
      "priority": "High",
      "category": "IT Support",
      "sub_category": "Network Connectivity Issue",
      "created_at": "2025-12-22T10:30:00Z",
      "updated_at": "2025-12-22T14:15:00Z",
      "target_resolution": "2025-12-22T18:30:00Z"
    }
  ]
}
```

---

### 2. Department, Categories & Subcategories

#### Overview
HDTS defines the available departments, categories, and subcategories for ticket submission. These values are used for workflow routing in TTS.

#### HDTS Definitions
**File**: [core/models.py](hdts/helpdesk/core/models.py)

```python
DEPARTMENT_CHOICES = [
    ('IT Department', 'IT Department'),
    ('Asset Department', 'Asset Department'),
    ('Budget Department', 'Budget Department'),
]

CATEGORY_CHOICES = [
    ('IT Support', 'IT Support'),
    ('Asset Check In', 'Asset Check In'),
    ('Asset Check Out', 'Asset Check Out'),
    ('New Budget Proposal', 'New Budget Proposal'),
    ('Others', 'Others'),
]

SUBCATEGORY_CHOICES = [
    ('Technical Assistance', 'Technical Assistance'),
    ('Software Installation/Update', 'Software Installation/Update'),
    ('Hardware Troubleshooting', 'Hardware Troubleshooting'),
    ('Email/Account Access Issue', 'Email/Account Access Issue'),
    ('Internet/Network Connectivity Issue', 'Internet/Network Connectivity Issue'),
    ('Printer/Scanner Setup or Issue', 'Printer/Scanner Setup or Issue'),
    ('System Performance Issue', 'System Performance Issue'),
    ('Virus/Malware Check', 'Virus/Malware Check'),
    ('IT Consultation Request', 'IT Consultation Request'),
    ('Data Backup/Restore', 'Data Backup/Restore'),
]
```

#### TTS Workflow Matching
TTS matches workflows based on `category` and `sub_category` from the ticket:

**File**: [workflow/models.py](tts/workflow_api/workflow/models.py)

```python
class Workflows(models.Model):
    category = models.CharField(max_length=64)
    sub_category = models.CharField(max_length=64)
    department = models.CharField(max_length=64)
    # ... SLA fields
```

#### Display Responsibility

| Component | Responsibility |
|-----------|----------------|
| HDTS Frontend | Renders dropdowns for Department, Category, Subcategory |
| HDTS Backend | Validates selections against `CHOICES` constants |
| TTS | Routes to appropriate workflow based on category/subcategory match |

---

### 3. Ticket Action Logs & History

#### Overview
TTS maintains comprehensive action logs for each task, tracking all user interactions, status changes, escalations, and transfers.

#### API Endpoint

| Direction | Endpoint | Method | Description |
|-----------|----------|--------|-------------|
| HDTS → TTS | `GET /tasks/logs/?ticket_id={ticket_number}` | GET | Fetch action logs for a ticket |

#### TTS Backend
**File**: [task/views.py](tts/workflow_api/task/views.py) - `TaskViewSet.logs`

```python
@action(detail=False, methods=['get'], url_path='logs')
def logs(self, request):
    """
    GET endpoint to retrieve comprehensive action logs for a task.
    
    Query Parameters:
        - task_id: (optional) The task ID (integer)
        - ticket_id: (optional) The ticket ID string (e.g., TX20251111322614)
    """
```

#### Response Format
```json
{
  "task_id": 1,
  "ticket_id": "TX20251111322614",
  "workflow_id": "uuid-string",
  "logs": [
    {
      "task_item_id": 1,
      "user_id": 123,
      "user_full_name": "John Doe",
      "role": "Reviewer",
      "status": "resolved",
      "origin": "System",
      "notes": "Approved",
      "assigned_on": "2025-11-11T10:30:00Z",
      "acted_on": "2025-11-11T11:15:00Z",
      "assigned_on_step_id": 1,
      "assigned_on_step_name": "Review Step",
      "task_history": [
        {
          "task_item_history_id": 1,
          "status": "new",
          "created_at": "2025-11-11T10:30:00Z"
        },
        {
          "task_item_history_id": 2,
          "status": "in progress",
          "created_at": "2025-11-11T10:45:00Z"
        },
        {
          "task_item_history_id": 3,
          "status": "resolved",
          "created_at": "2025-11-11T11:15:00Z"
        }
      ]
    }
  ]
}
```

#### Data Models

**TaskItem**: Represents a user's assignment to a task
```python
class TaskItem(models.Model):
    task = models.ForeignKey(Task, on_delete=models.CASCADE)
    role_user = models.ForeignKey('role.RoleUsers', on_delete=models.CASCADE)
    origin = models.CharField(choices=TASK_ITEM_ORIGIN_CHOICES)  # System, Transferred, Escalation
    notes = models.TextField(null=True, blank=True)
    assigned_on = models.DateTimeField(auto_now_add=True)
    acted_on = models.DateTimeField(null=True, blank=True)
    transferred_to = models.ForeignKey('role.RoleUsers', null=True)
    transferred_by = models.IntegerField(null=True)
```

**TaskItemHistory**: Status change history for each TaskItem
```python
class TaskItemHistory(models.Model):
    task_item = models.ForeignKey(TaskItem, on_delete=models.CASCADE)
    status = models.CharField(choices=TASK_ITEM_STATUS_CHOICES)
    created_at = models.DateTimeField(auto_now_add=True)
```

---

### 4. CSAT (Customer Satisfaction)

#### Overview
After a ticket is closed, the employee can submit a CSAT rating. CSAT data is stored in HDTS and can be aggregated for reports.

#### Flow
1. TTS marks ticket/task as **completed**
2. HDTS ticket status updated to **Closed**
3. Employee receives notification to rate the ticket
4. Employee submits CSAT rating (1-5 stars + feedback)
5. HDTS stores rating in `Ticket.csat_rating` field

#### API Endpoints (HDTS)

| Endpoint | Method | Description |
|----------|--------|-------------|
| `POST /api/tickets/{id}/csat/` | POST | Submit CSAT rating for a closed ticket |
| `GET /api/csat/feedback/` | GET | Retrieve CSAT feedback data for reports |

#### HDTS Backend
**File**: [core/views/ticket_views.py](hdts/helpdesk/core/views/ticket_views.py)

```python
@api_view(['POST'])
@permission_classes([IsAuthenticated, IsEmployeeOrAdmin])
def submit_csat_rating(request, ticket_id):
    ticket = get_object_or_404(Ticket, id=ticket_id)
    
    # Only ticket owner can rate
    is_ticket_owner = (ticket.employee_cookie_id == request.user.id) or (ticket.employee == request.user)
    if not is_ticket_owner:
        return Response({'error': 'You can only rate your own tickets'}, status=403)
    
    if ticket.status != 'Closed':
        return Response({'error': 'Can only rate closed tickets'}, status=400)
    
    rating = request.data.get('rating')  # 1-5
    feedback = request.data.get('feedback', '')
    
    ticket.csat_rating = rating
    ticket.feedback = feedback
    ticket.save()
```

#### HDTS Frontend Service
**File**: [ticketService.js](hdts/frontendfolder/src/services/backend/ticketService.js)

```javascript
async submitCSATRating(ticketId, rating, feedback = '') {
  const response = await fetch(`${BASE_URL}/api/tickets/${ticketId}/csat/`, {
    method: 'POST',
    headers: getAuthHeaders(),
    credentials: 'include',
    body: JSON.stringify({ rating, feedback }),
  });
  return await response.json();
}
```

#### Data Model
**File**: [core/models.py](hdts/helpdesk/core/models.py)

```python
class Ticket(models.Model):
    # ... other fields
    csat_rating = models.IntegerField(
        blank=True, 
        null=True, 
        help_text="Customer satisfaction rating (1-5 stars)"
    )
    feedback = models.TextField(blank=True, null=True)
```

---

### 5. Ticket Status Sync (TTS → HDTS)

#### Overview
TTS manages the workflow lifecycle and updates ticket status. These status changes need to be reflected in HDTS.

#### Status Mapping

| TTS Task Status | HDTS Ticket Status | Trigger |
|-----------------|-------------------|---------|
| `pending` | `Open` | Task created |
| `in progress` | `In Progress` | Agent starts working |
| `completed` | `Resolved` / `Closed` | Workflow finalized |

#### Sync Mechanism
When TTS completes a workflow step:
1. TTS updates Task status
2. TTS may trigger notification to HDTS (via Celery)
3. HDTS can poll TTS for status updates
4. HDTS Frontend displays updated status from both sources

#### HDTS Status Update API
**File**: [core/views/ticket_views.py](hdts/helpdesk/core/views/ticket_views.py)

```python
@api_view(['POST'])
def update_ticket_status(request, ticket_id):
    ticket = get_object_or_404(Ticket, id=ticket_id)
    
    new_status = request.data.get('status')
    valid_statuses = ['Open', 'In Progress', 'Resolved', 'Closed', 'On Hold', 'Rejected']
    
    if new_status == 'Closed':
        ticket.time_closed = timezone.now()
        ticket.date_completed = timezone.now()
        if ticket.submit_date:
            ticket.resolution_time = timezone.now() - ticket.submit_date
    
    ticket.status = new_status
    ticket.save()
```

---

### 6. SLA (Service Level Agreements)

#### Overview
TTS calculates and enforces SLA based on ticket priority. The SLA target is stored per-task and displayed to coordinators in HDTS.

#### SLA Configuration (TTS)
**File**: [workflow/models.py](tts/workflow_api/workflow/models.py)

```python
class Workflows(models.Model):
    low_sla = models.DurationField(null=True, help_text="SLA for low priority")
    medium_sla = models.DurationField(null=True, help_text="SLA for medium priority")
    high_sla = models.DurationField(null=True, help_text="SLA for high priority")
    urgent_sla = models.DurationField(null=True, help_text="SLA for urgent/critical priority")
```

#### SLA Calculation
**File**: [task/utils/target_resolution.py](tts/workflow_api/task/utils/target_resolution.py)

```python
def get_sla_for_priority(workflow, priority):
    """Get the SLA duration for a given priority level from the workflow."""
    priority_lower = priority.lower()
    
    sla_mapping = {
        'low': 'low_sla',
        'medium': 'medium_sla',
        'high': 'high_sla',
        'critical': 'urgent_sla',
        'urgent': 'urgent_sla',
    }
    
    sla_field = sla_mapping.get(priority_lower)
    return getattr(workflow, sla_field, None)

def calculate_target_resolution_for_task(ticket, workflow):
    """Calculate target_resolution = now + SLA based on ticket priority"""
    priority = ticket.ticket_data.get('priority', 'Low')
    sla = get_sla_for_priority(workflow, priority)
    return timezone.now() + sla if sla else None
```

#### Task Model
**File**: [task/models.py](tts/workflow_api/task/models.py)

```python
class Task(models.Model):
    target_resolution = models.DateTimeField(
        null=True, 
        blank=True, 
        help_text="Target date and time for task resolution"
    )
    
    def save(self, *args, **kwargs):
        if not self.target_resolution and self.ticket_id and self.workflow_id:
            from task.utils.target_resolution import calculate_target_resolution_for_task
            self.target_resolution = calculate_target_resolution_for_task(
                ticket=self.ticket_id,
                workflow=self.workflow_id
            )
        super().save(*args, **kwargs)
```

#### Display in HDTS
The HDTS frontend displays `target_resolution` from TTS Task data in the Owned Tickets view:

```javascript
// Response from /tasks/owned-tickets/
{
  "target_resolution": "2025-12-22T18:30:00Z",
  "status": "in progress"
  // SLA status can be calculated client-side
}
```

---

### 7. Escalation & Transfer

#### Overview
TTS agents can escalate tasks to higher-level roles or transfer tasks to other users. These actions are logged and tracked.

#### Escalation

**Endpoint**: `POST /tasks/escalate/`

**File**: [task/views.py](tts/workflow_api/task/views.py)

```python
@action(detail=False, methods=['post'], url_path='escalate')
def escalate_task(self, request):
    """
    Escalate a task item to the escalate_to role.
    
    Request Body:
    {
        "task_item_id": 10,
        "reason": "Task requires higher authority approval"
    }
    """
    # Validates current assignment status
    # Creates TaskItemHistory with status='escalated'
    # Assigns to escalate_to role via round-robin
```

**Escalation Configuration**:
Each workflow step can define an `escalate_to` role:

```python
class Steps(models.Model):
    escalate_to = models.ForeignKey(
        'role.Roles',
        null=True,
        blank=True,
        help_text="Role to escalate to if SLA is breached or manual escalation"
    )
```

#### Transfer

**Endpoint**: `POST /tasks/transfer/`

```python
@action(detail=False, methods=['post'], url_path='transfer')
def transfer_task(self, request):
    """
    Transfer a task to another user (Admin only).
    
    Request Body:
    {
        "user_id": 5,
        "task_item_id": 10,
        "notes": "Reason for transfer"
    }
    """
    # Validates task item can be transferred (not resolved/escalated)
    # Creates TaskItemHistory with status='reassigned'
    # Creates new TaskItem for target user
```

#### Status Indicators
The HDTS Owned Ticket detail view shows:
- `is_escalated`: Boolean - task has been escalated
- `is_transferred`: Boolean - task has been transferred

```json
{
  "is_escalated": true,
  "is_transferred": false,
  "current_owner": {
    "user_id": 123,
    "user_full_name": "Senior Manager",
    "role": "Admin",
    "status": "in progress"
  }
}
```

---

## API Reference

### TTS Workflow API (Port 8002)

| Endpoint | Method | Description | Auth |
|----------|--------|-------------|------|
| `/tasks/` | GET | List all tasks | JWT |
| `/tasks/{id}/` | GET | Get task details | JWT |
| `/tasks/owned-tickets/` | GET | Get tickets owned by current Ticket Coordinator | JWT + HDTS Ticket Coordinator role |
| `/tasks/my-tasks/` | GET | Get tasks assigned to current user | JWT |
| `/tasks/all-tasks/` | GET | Get all tasks (admin) | JWT |
| `/tasks/logs/` | GET | Get action logs for a task | JWT |
| `/tasks/detail/{task_item_id}/` | GET | Get detailed task item info | JWT |
| `/tasks/workflow-visualization/` | GET | Get workflow visualization data | JWT |
| `/tasks/escalate/` | POST | Escalate a task | JWT |
| `/tasks/transfer/` | POST | Transfer a task | JWT + Admin |
| `/transitions/` | POST | Execute workflow transition | JWT |

### HDTS Backend API (Port 8000)

| Endpoint | Method | Description | Auth |
|----------|--------|-------------|------|
| `/api/tickets/` | GET/POST | List/Create tickets | JWT |
| `/api/tickets/{id}/` | GET/PATCH/DELETE | Ticket CRUD | JWT |
| `/api/tickets/number/{ticket_number}/` | GET | Get ticket by number | JWT |
| `/api/tickets/{id}/approve/` | POST | Approve ticket | JWT + Coordinator |
| `/api/tickets/{id}/reject/` | POST | Reject ticket | JWT + Coordinator |
| `/api/tickets/{id}/update-status/` | POST | Update ticket status | JWT |
| `/api/tickets/{id}/csat/` | POST | Submit CSAT rating | JWT + Owner |
| `/api/csat/feedback/` | GET | Get CSAT feedback | JWT |
| `/api/tickets/{id}/comments/` | POST | Add ticket comment | JWT |

---

## Data Flow Diagrams

### Ticket Lifecycle

```
┌─────────────┐    Submit     ┌─────────────┐    Approve    ┌─────────────┐
│   Employee  │──────────────►│   HDTS      │──────────────►│   HDTS      │
│             │               │  (New)      │               │  (Open)     │
└─────────────┘               └─────────────┘               └──────┬──────┘
                                                                   │
                                                     Push to TTS   │
                                                    (Celery Task)  │
                                                                   ▼
┌─────────────┐    Complete   ┌─────────────┐    Work On    ┌─────────────┐
│   HDTS      │◄──────────────│   TTS       │◄──────────────│   TTS       │
│  (Closed)   │               │ (Completed) │               │  (Task)     │
└─────────────┘               └─────────────┘               └─────────────┘
       │
       │ CSAT Rating
       ▼
┌─────────────┐
│   HDTS      │
│  (Rated)    │
└─────────────┘
```

### Owned Tickets Data Fetch

```
┌─────────────────┐
│ HDTS Frontend   │
│ (Coordinator)   │
└────────┬────────┘
         │ 1. GET /tasks/owned-tickets/
         ▼
┌─────────────────┐
│ TTS Workflow    │
│ API (8002)      │
└────────┬────────┘
         │ 2. Returns Task list
         ▼
┌─────────────────┐
│ HDTS Frontend   │
│ (Display List)  │
└────────┬────────┘
         │ 3. GET /api/tickets/number/{number}/
         ▼
┌─────────────────┐
│ HDTS Backend    │
│ (8000)          │
└────────┬────────┘
         │ 4. Returns full ticket details
         ▼
┌─────────────────┐
│ HDTS Frontend   │
│ (Merged View)   │
└─────────────────┘
```

---

## Configuration

### Environment Variables

**HDTS Frontend** ([environment.js](hdts/frontendfolder/src/config/environment.js)):
```javascript
export const API_CONFIG = {
  BACKEND: {
    BASE_URL: import.meta.env.VITE_API_URL || 'http://localhost:8000',
  },
  AUTH: {
    BASE_URL: import.meta.env.VITE_AUTH_URL || 'http://localhost:8003',
  },
  TTS_WORKFLOW: {
    BASE_URL: import.meta.env.VITE_TTS_WORKFLOW_URL || 'http://localhost:8002',
  }
};
```

### Authentication

Both systems use **JWT-based authentication** with cookie support:

- Access token stored in cookies (`access_token`)
- Authorization header: `Bearer {token}`
- Refresh token endpoint: `/token/refresh/`

---

## Summary

| Integration Point | HDTS Responsibility | TTS Responsibility |
|------------------|---------------------|-------------------|
| **Owned Tickets** | Display, filter, search | Store, return owned tasks |
| **Categories/Departments** | Define choices, validate input | Route to matching workflow |
| **Action Logs** | Display logs in UI | Track all task history |
| **CSAT** | Collect and store ratings | Trigger completion events |
| **Status Sync** | Display unified status | Manage workflow status |
| **SLA** | Display target/breach status | Calculate and enforce SLA |
| **Escalation/Transfer** | Display indicators | Execute and log actions |
