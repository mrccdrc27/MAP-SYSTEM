---
title: API Reference
sidebar_label: API Reference
sidebar_position: 4
---

# API Reference

**Base URL:** Workflow API runs on port `8002`, Ticket Service on port `8004`

**Authentication:** JWT token via `access_token` cookie or `Authorization: Bearer <token>` header

## API Root

```bash
GET http://localhost:8002/
```

Response:
```json
{
  "message": "Welcome to Workflow Management API",
  "version": "1.0",
  "workflows": "http://localhost:8002/workflows/",
  "tickets": "http://localhost:8002/tickets/",
  "tasks": "http://localhost:8002/tasks/",
  "transitions": "http://localhost:8002/transitions/",
  "roles": "http://localhost:8002/roles/",
  "steps": "http://localhost:8002/steps/",
  "analytics": "http://localhost:8002/analytics/",
  "docs": "http://localhost:8002/docs/"
}
```

---

## Workflows API (`/workflows/`)

### Workflow CRUD

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| `GET` | `/` | ✅ | List all workflows |
| `POST` | `/` | ✅👑 | Create workflow (with optional graph) |
| `GET` | `/{id}/` | ✅ | Get workflow details |
| `DELETE` | `/{id}/` | ✅👑 | Delete workflow |

### Workflow Management

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| `PUT` | `/{id}/update-details/` | ✅👑 | Update workflow metadata |
| `PUT` | `/{id}/update-graph/` | ✅👑 | Update workflow graph (nodes/edges) |
| `GET` | `/{id}/graph/` | ✅ | Get graph structure only |
| `GET` | `/{id}/detail/` | ✅ | Get complete workflow with graph |
| `POST` | `/{id}/initialize/` | ✅👑 | Initialize workflow for use |

### Create Workflow with Graph

```http
POST /workflows/
Content-Type: application/json

{
  "workflow": {
    "name": "IT Support Request",
    "description": "Standard IT support workflow",
    "category": "Technology",
    "sub_category": "Support",
    "department": "IT",
    "low_sla": "72:00:00",
    "medium_sla": "48:00:00",
    "high_sla": "24:00:00",
    "urgent_sla": "04:00:00"
  },
  "graph": {
    "nodes": [
      {
        "temp_id": "node_1",
        "name": "Triage",
        "role_id": 2,
        "is_start": true,
        "weight": 0.3
      },
      {
        "temp_id": "node_2",
        "name": "Resolution",
        "role_id": 3,
        "is_end": true,
        "weight": 0.7
      }
    ],
    "edges": [
      {
        "from_temp_id": "node_1",
        "to_temp_id": "node_2",
        "name": "Assign"
      }
    ]
  }
}
```

Response (201 Created):
```json
{
  "workflow_id": 5,
  "name": "IT Support Request",
  "status": "draft",
  "graph": {
    "nodes": [
      {
        "step_id": 10,
        "temp_id": "node_1",
        "name": "Triage",
        "role_id": 2,
        "role_name": "Agent"
      }
    ],
    "edges": [...]
  },
  "temp_id_mapping": {
    "node_1": 10,
    "node_2": 11
  }
}
```

---

## Steps API (`/steps/`)

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| `GET` | `/` | ✅ | List all steps |
| `POST` | `/` | ✅👑 | Create step |
| `GET` | `/{id}/` | ✅ | Get step details |
| `PUT` | `/{id}/` | ✅👑 | Update step |
| `DELETE` | `/{id}/` | ✅👑 | Delete step |

### Step Object

```json
{
  "step_id": 10,
  "workflow_id": 5,
  "name": "Triage",
  "description": "Initial ticket assessment",
  "instruction": "Review ticket and assign priority",
  "role_id": 2,
  "role_name": "Agent",
  "escalate_to": 5,
  "weight": 0.3,
  "order": 1,
  "is_start": true,
  "is_end": false,
  "design": {"x": 100, "y": 100}
}
```

---

## Transitions API (`/transitions/`)

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| `GET` | `/` | ✅ | List all transitions |
| `POST` | `/` | ✅👑 | Create transition |
| `GET` | `/{id}/` | ✅ | Get transition details |
| `DELETE` | `/{id}/` | ✅👑 | Delete transition |

### Execute Transition (Task)

```http
POST /transitions/{task_id}/transition/
Content-Type: application/json

{
  "transition_id": 5,
  "notes": "Completed initial assessment"
}
```

Response:
```json
{
  "success": true,
  "task": {
    "task_id": 123,
    "current_step": {
      "step_id": 11,
      "name": "Resolution"
    },
    "status": "in progress"
  },
  "message": "Task transitioned to Resolution"
}
```

---

## Tasks API (`/tasks/`)

### Task CRUD

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| `GET` | `/` | ✅ | List all tasks |
| `POST` | `/` | ✅👑 | Create task |
| `GET` | `/{id}/` | ✅ | Get task details |
| `PUT` | `/{id}/` | ✅ | Update task |
| `DELETE` | `/{id}/` | ✅👑 | Delete task |

### Task Views

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| `GET` | `/my-tasks/` | ✅ | Get current user's tasks |
| `GET` | `/all-tasks/` | ✅👑 | Get all tasks (admin view) |
| `GET` | `/owned-tickets/` | ✅🎫 | Get tickets owned by coordinator |

### Task Actions

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| `POST` | `/transfer/` | ✅👑 | Transfer task to another user |
| `POST` | `/escalate/` | ✅ | Escalate task |
| `GET` | `/{id}/visualization/` | ✅ | Get task progress visualization |
| `GET` | `/{id}/action-logs/` | ✅ | Get task action history |
| `POST` | `/{id}/update-user-status/` | ✅ | Update user's task status |

### My Tasks Query Parameters

```http
GET /tasks/my-tasks/?role=Agent&assignment_status=in+progress
```

| Param | Type | Description |
|-------|------|-------------|
| `role` | string | Filter by role name |
| `assignment_status` | string | Filter by status (`new`, `in progress`, `resolved`) |
| `task__workflow_id` | int | Filter by workflow |

### All Tasks Query Parameters

```http
GET /tasks/all-tasks/?tab=active&search=laptop&page=1&page_size=10
```

| Param | Type | Description |
|-------|------|-------------|
| `tab` | string | `active`, `inactive`, `unassigned` |
| `search` | string | Search ticket subject/description/assignee |
| `page` | int | Page number |
| `page_size` | int | Items per page (max 100) |

### Transfer Task

```http
POST /tasks/transfer/
Content-Type: application/json

{
  "task_item_id": 456,
  "new_user_id": 15,
  "notes": "Transferred to specialist"
}
```

### Escalate Task

```http
POST /tasks/escalate/
Content-Type: application/json

{
  "task_item_id": 456,
  "reason": "Customer requires manager involvement"
}
```

---

## Tickets API (`/tickets/`)

### Workflow API Tickets

Internal ticket snapshots within workflow service.

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| `GET` | `/` | ✅ | List ticket snapshots |
| `GET` | `/{id}/` | ✅ | Get ticket details |

### Ticket Service API (Port 8004)

External ticket CRUD.

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| `GET` | `/tickets/` | ✅ | List tickets |
| `POST` | `/tickets/` | ✅ | Create ticket |
| `GET` | `/tickets/{id}/` | ✅ | Get ticket |
| `PUT` | `/tickets/{id}/` | ✅ | Update ticket |
| `DELETE` | `/tickets/{id}/` | ✅👑 | Delete ticket |
| `POST` | `/send/` | ✅ | Submit ticket (external) |

### Create Ticket

```http
POST http://localhost:8004/tickets/
Content-Type: application/json

{
  "subject": "Laptop not turning on",
  "description": "My laptop shows no signs of power",
  "category": "Technology",
  "subcategory": "Hardware",
  "department": "IT",
  "priority": "High",
  "employee": {
    "id": 101,
    "name": "John Smith",
    "email": "john.smith@company.com"
  }
}
```

Response:
```json
{
  "id": 45,
  "ticket_id": "TX20240115123456",
  "subject": "Laptop not turning on",
  "status": "New",
  "priority": "High",
  "created_at": "2024-01-15T10:30:00Z"
}
```

---

## Roles API (`/roles/`)

Local role cache synchronized from Auth Service.

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| `GET` | `/` | ✅ | List all roles |
| `POST` | `/` | ✅👑 | Create role (synced from Auth) |
| `GET` | `/{id}/` | ✅ | Get role details |

---

## Audit API (`/audit/`)

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| `GET` | `/events/` | ✅👑 | List audit events |
| `GET` | `/events/{id}/` | ✅👑 | Get event details |
| `GET` | `/events/by-target/` | ✅👑 | Filter events by target |

### Query Audit Events

```http
GET /audit/events/?action=update_workflow&user_id=5&target_type=Workflow
```

---

## Analytics API (`/analytics/`)

### Trend Analytics

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| `GET` | `/ticket-trends/` | ✅ | Ticket volume over time |
| `GET` | `/task-item-trends/` | ✅ | Task assignment trends |
| `GET` | `/ticket-categories/` | ✅ | Category distribution |

### Ticket Analytics

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| `GET` | `/tickets/dashboard/` | ✅ | Ticket KPI dashboard |
| `GET` | `/tickets/status/` | ✅ | Status distribution |
| `GET` | `/tickets/priority/` | ✅ | Priority distribution |
| `GET` | `/tickets/age/` | ✅ | Age distribution |
| `GET` | `/tickets/sla/` | ✅ | SLA compliance rates |

### Workflow Analytics

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| `GET` | `/workflows/metrics/` | ✅ | Workflow performance metrics |
| `GET` | `/workflows/departments/` | ✅ | Department analytics |
| `GET` | `/workflows/steps/` | ✅ | Step performance analysis |

### Task Analytics

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| `GET` | `/tasks/status/` | ✅ | Task status distribution |
| `GET` | `/tasks/origin/` | ✅ | Assignment origin breakdown |
| `GET` | `/tasks/performance/` | ✅ | Task performance metrics |
| `GET` | `/tasks/users/` | ✅ | User performance rankings |
| `GET` | `/tasks/transfers/` | ✅ | Transfer analytics |

### Operational Insights

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| `GET` | `/operational/` | ✅👑 | Operational insights summary |
| `GET` | `/workload/` | ✅👑 | Workload analysis |
| `GET` | `/sla-risk/` | ✅👑 | SLA risk report |
| `GET` | `/anomalies/` | ✅👑 | Anomaly detection |
| `GET` | `/service-health/` | ✅👑 | Service health summary |

### ML Forecasting

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| `GET` | `/forecast/volume/` | ✅👑 | Ticket volume forecast |
| `GET` | `/forecast/resolution/` | ✅👑 | Resolution time forecast |
| `GET` | `/forecast/category/` | ✅👑 | Category trend forecast |
| `GET` | `/forecast/sla-risk/` | ✅👑 | SLA breach risk forecast |
| `GET` | `/forecast/workload/` | ✅👑 | Workload forecast |
| `GET` | `/forecast/comprehensive/` | ✅👑 | All forecasts combined |

### Drilldown Endpoints

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| `GET` | `/drilldown/tickets/status/` | ✅ | Tickets by status |
| `GET` | `/drilldown/tickets/priority/` | ✅ | Tickets by priority |
| `GET` | `/drilldown/tickets/age/` | ✅ | Tickets by age bracket |
| `GET` | `/drilldown/tickets/sla/` | ✅ | SLA compliance details |
| `GET` | `/drilldown/tasks/status/` | ✅ | Tasks by status |
| `GET` | `/drilldown/tasks/origin/` | ✅ | Tasks by origin |
| `GET` | `/drilldown/user/{id}/` | ✅ | User task details |
| `GET` | `/drilldown/workflow/{id}/` | ✅ | Workflow task details |
| `GET` | `/drilldown/transfers/` | ✅ | Transfer details |

---

## Failed Notifications API

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| `GET` | `/tasks/failed-notifications/` | ✅👑 | List failed notifications |
| `POST` | `/tasks/failed-notifications/{id}/retry/` | ✅👑 | Retry failed notification |

---

## Authentication Legend

| Symbol | Meaning |
|--------|---------|
| ✅ | JWT token required |
| ✅👑 | JWT token + Admin role required |
| ✅🎫 | JWT token + Ticket Coordinator role required |

---

## Common Response Codes

| Code | Description |
|------|-------------|
| `200` | Success |
| `201` | Created |
| `400` | Bad Request (validation error) |
| `401` | Unauthorized (missing/invalid token) |
| `403` | Forbidden (insufficient permissions) |
| `404` | Not Found |
| `500` | Internal Server Error |

---

## Pagination

List endpoints return paginated results:

```json
{
  "count": 150,
  "next": "http://localhost:8002/tasks/?page=2",
  "previous": null,
  "results": [...]
}
```

Query parameters:
- `page`: Page number (default: 1)
- `page_size`: Items per page (default: 10, max: 100)

---

## Error Response Format

```json
{
  "error": "Validation failed",
  "details": {
    "name": ["This field is required."],
    "priority": ["Invalid priority value."]
  }
}
```
