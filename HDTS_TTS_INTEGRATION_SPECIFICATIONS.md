# HDTS ↔ TTS Integration Specifications

**Document Version:** 1.0.0  
**Last Updated:** January 12, 2026  
**Status:** Active

---

## Table of Contents

1. [Overview](#overview)
2. [HDTS → TTS Integration](#hdts--tts-integration)
3. [TTS → HDTS Integration](#tts--hdts-integration)
4. [Authentication & Security](#authentication--security)
5. [Error Handling](#error-handling)
6. [SLA & Performance](#sla--performance)
7. [Version History](#version-history)

---

## Overview

This document defines the formal integration specifications between:
- **HDTS** (Help Desk and Ticketing System) - Port 8000
- **TTS** (Ticket Tracking System / Workflow API) - Port 8002

### Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                        HDTS Frontend                             │
│                    (React/Vite - Port 1000)                      │
└────────────────────────┬────────────────────────────────────────┘
                         │ HTTP/REST
                         ▼
┌─────────────────────────────────────────────────────────────────┐
│                      HDTS Backend (Django)                       │
│                          Port 8000                               │
│  • Ticket CRUD                                                   │
│  • Employee Management                                           │
│  • CSAT Collection                                              │
└────────────┬────────────────────────────────────────────────────┘
             │                                          ▲
             │ Celery Queue                             │
             │ TICKET_TASKS_PRODUCTION                  │
             ▼                                          │
┌─────────────────────────────────────────────────────────────────┐
│                  TTS Workflow API (Django)                       │
│                        Port 8002                                 │
│  • Task Management                                              │
│  • Workflow Processing                                          │
│  • SLA Management                                               │
└─────────────────────────────────────────────────────────────────┘
```

---

## HDTS → TTS Integration

### 1. Ticket Creation & Workflow Initiation

#### Purpose
When a ticket is created in HDTS, it automatically triggers workflow processing in TTS via Celery queue.

#### API Endpoint
**Queue-based Communication (Asynchronous)**

- **Queue Name:** `TICKET_TASKS_PRODUCTION`
- **Task Name:** `tts.tasks.process_ticket`
- **Trigger:** `post_save` signal on HDTS Ticket model

#### Method
Asynchronous message queue (RabbitMQ/Celery)

#### Request Format
```json
{
  "ticket_number": "TX20260112123456",
  "subject": "Network connectivity issue",
  "description": "Unable to access VPN",
  "category": "IT Support",
  "sub_category": "Network Connectivity Issue",
  "department": "IT Department",
  "priority": "High",
  "employee_id": 101,
  "employee_name": "John Doe",
  "employee_email": "john.doe@company.com",
  "status": "Open",
  "created_at": "2026-01-12T10:30:00Z"
}
```

#### Response Format
Task creation is asynchronous. Success is indicated by:
- WorkflowTicket created in TTS database
- Task and TaskItem records created
- Status: `active`

#### Authentication
- **Type:** Service-to-service (Celery queue authentication)
- **Broker:** RabbitMQ with username/password
- **Credentials:** Configured in Django settings

#### Error Codes
| Code | Description | Action |
|------|-------------|--------|
| `QUEUE_CONNECTION_FAILED` | Cannot connect to RabbitMQ | Check broker status |
| `WORKFLOW_NOT_FOUND` | No matching workflow for category/department | Log warning, ticket remains in HDTS |
| `DUPLICATE_TICKET` | Ticket already exists in TTS | Skip processing |
| `INVALID_PAYLOAD` | Missing required fields | Log error, retry with backoff |

#### SLA
- **Queue Delivery:** < 1 second
- **Task Creation:** < 5 seconds
- **Initial Assignment:** < 10 seconds

---

### 2. Fetch Owned Tickets (Ticket Coordinator)

#### Purpose
HDTS Ticket Coordinators retrieve tickets assigned to them from TTS workflow system.

#### API Endpoint
```
GET http://165.22.247.50:8002/tasks/owned-tickets/
```

#### Method
GET

#### Request Format
**Headers:**
```http
Authorization: Bearer {jwt_token}
Cookie: access_token={jwt_token}
```

**Query Parameters:**
| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `page` | integer | No | Page number (default: 1) |
| `page_size` | integer | No | Items per page (default: 10, max: 100) |
| `status` | string | No | Filter by status: `active`, `in_progress`, `resolved`, `completed` |
| `priority` | string | No | Filter by priority: `Low`, `Medium`, `High` |
| `search` | string | No | Search in ticket subject/description |
| `category` | string | No | Filter by category |

**Example Request:**
```http
GET /tasks/owned-tickets/?status=active&page=1&page_size=20 HTTP/1.1
Host: 165.22.247.50:8002
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
Cookie: access_token=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

#### Response Format
**Success (200 OK):**
```json
{
  "count": 45,
  "next": "http://165.22.247.50:8002/tasks/owned-tickets/?page=2",
  "previous": null,
  "results": [
    {
      "task_id": 123,
      "ticket_number": "TX20260112123456",
      "ticket_subject": "Network connectivity issue",
      "ticket_description": "Unable to access VPN",
      "status": "in_progress",
      "priority": "High",
      "category": "IT Support",
      "sub_category": "Network Connectivity Issue",
      "department": "IT Department",
      "created_at": "2026-01-12T10:30:00Z",
      "updated_at": "2026-01-12T14:15:00Z",
      "target_resolution": "2026-01-12T18:30:00Z",
      "sla_breach_at": "2026-01-13T10:30:00Z",
      "time_remaining": "4h 15m",
      "is_breached": false,
      "current_step": "Review",
      "assigned_to": "Jane Smith",
      "owner_id": 456
    }
  ]
}
```

**Error Response:**
```json
{
  "error": "Authentication required",
  "code": "UNAUTHENTICATED",
  "status": 401
}
```

#### Authentication
- **Type:** JWT Bearer Token + Cookie-based
- **Required Role:** HDTS Ticket Coordinator
- **Token Location:** HTTP Header OR Cookie
- **Token Validation:** Against Auth Service (Port 8003)

#### Error Codes
| HTTP Code | Error Code | Description | Resolution |
|-----------|------------|-------------|------------|
| 401 | `UNAUTHENTICATED` | Missing or invalid JWT token | Refresh token or re-login |
| 403 | `FORBIDDEN` | User lacks Ticket Coordinator role | Contact administrator |
| 404 | `NOT_FOUND` | No tickets found | Normal condition |
| 500 | `INTERNAL_ERROR` | Database or service error | Retry, contact support |

#### SLA
- **Response Time:** < 500ms (p95)
- **Availability:** 99.9%
- **Max Response Size:** 10MB
- **Timeout:** 30 seconds

---

### 3. Get Ticket Details by Number

#### Purpose
Retrieve complete ticket information from HDTS by ticket number.

#### API Endpoint
```
GET http://165.22.247.50:8000/api/tickets/number/{ticket_number}/
```

#### Method
GET

#### Request Format
**Headers:**
```http
Authorization: Bearer {jwt_token}
Cookie: access_token={jwt_token}
```

**Path Parameters:**
| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `ticket_number` | string | Yes | Ticket number (e.g., TX20260112123456) |

**Example Request:**
```http
GET /api/tickets/number/TX20260112123456/ HTTP/1.1
Host: 165.22.247.50:8000
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

#### Response Format
**Success (200 OK):**
```json
{
  "id": 789,
  "ticket_number": "TX20260112123456",
  "subject": "Network connectivity issue",
  "description": "Unable to access VPN",
  "category": "IT Support",
  "sub_category": "Network Connectivity Issue",
  "department": "IT Department",
  "priority": "High",
  "status": "In Progress",
  "employee": {
    "id": 101,
    "name": "John Doe",
    "email": "john.doe@company.com",
    "department": "Engineering"
  },
  "ticket_owner_id": 456,
  "ticket_owner_name": "Jane Smith",
  "created_at": "2026-01-12T10:30:00Z",
  "updated_at": "2026-01-12T14:15:00Z",
  "date_completed": null,
  "csat_rating": null,
  "csat_feedback": null,
  "attachments": [
    {
      "id": 1,
      "filename": "screenshot.png",
      "url": "/media/tickets/TX20260112123456/screenshot.png",
      "uploaded_at": "2026-01-12T10:31:00Z"
    }
  ],
  "comments": [
    {
      "id": 1,
      "user_name": "Jane Smith",
      "comment": "Investigating the VPN connection",
      "created_at": "2026-01-12T11:00:00Z"
    }
  ]
}
```

#### Authentication
- **Type:** JWT Bearer Token + Cookie-based
- **Required Role:** Any authenticated user
- **Scope:** User can only view tickets they own or are assigned to (unless Admin)

#### Error Codes
| HTTP Code | Error Code | Description | Resolution |
|-----------|------------|-------------|------------|
| 401 | `UNAUTHENTICATED` | Missing or invalid JWT token | Refresh token |
| 403 | `FORBIDDEN` | User cannot access this ticket | Verify permissions |
| 404 | `TICKET_NOT_FOUND` | Ticket does not exist | Verify ticket number |
| 500 | `INTERNAL_ERROR` | Database error | Retry, contact support |

#### SLA
- **Response Time:** < 200ms (p95)
- **Availability:** 99.9%

---

### 4. Get Task Action Logs & History

#### Purpose
Retrieve complete workflow action history for a ticket, including all task assignments, transitions, and user actions.

#### API Endpoint
```
GET http://165.22.247.50:8002/tasks/logs/?ticket_number={ticket_number}
```

#### Method
GET

#### Request Format
**Headers:**
```http
Authorization: Bearer {jwt_token}
```

**Query Parameters:**
| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `ticket_number` | string | Yes | Ticket number |

**Example Request:**
```http
GET /tasks/logs/?ticket_number=TX20260112123456 HTTP/1.1
Host: 165.22.247.50:8002
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

#### Response Format
**Success (200 OK):**
```json
{
  "task_id": 123,
  "ticket_id": "TX20260112123456",
  "workflow_id": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
  "workflow_name": "IT Support Workflow",
  "logs": [
    {
      "task_item_id": 456,
      "user_id": 789,
      "user_full_name": "Jane Smith",
      "role": "Reviewer",
      "status": "resolved",
      "origin": "User Action",
      "notes": "VPN credentials reset and verified working",
      "assigned_on": "2026-01-12T11:00:00Z",
      "acted_on": "2026-01-12T14:15:00Z",
      "assigned_on_step_id": 2,
      "assigned_on_step_name": "Review Step",
      "task_history": [
        {
          "task_item_history_id": 1,
          "status": "new",
          "origin": "System",
          "notes": "Task assigned",
          "created_at": "2026-01-12T11:00:00Z"
        },
        {
          "task_item_history_id": 2,
          "status": "in_progress",
          "origin": "User Action",
          "notes": "Started investigation",
          "created_at": "2026-01-12T11:30:00Z"
        },
        {
          "task_item_history_id": 3,
          "status": "resolved",
          "origin": "User Action",
          "notes": "VPN credentials reset and verified working",
          "created_at": "2026-01-12T14:15:00Z"
        }
      ]
    }
  ]
}
```

#### Authentication
- **Type:** JWT Bearer Token
- **Required Role:** Authenticated user
- **Scope:** User can only view logs for tickets they are involved with (unless Admin)

#### Error Codes
| HTTP Code | Error Code | Description | Resolution |
|-----------|------------|-------------|------------|
| 401 | `UNAUTHENTICATED` | Missing or invalid JWT token | Refresh token |
| 403 | `FORBIDDEN` | User cannot access this ticket's logs | Verify permissions |
| 404 | `TASK_NOT_FOUND` | No task found for ticket | Verify ticket has entered workflow |
| 500 | `INTERNAL_ERROR` | Database error | Retry, contact support |

#### SLA
- **Response Time:** < 500ms (p95)
- **Availability:** 99.5%

---

### 5. Sync Ticket Status (HDTS → TTS)

#### Purpose
Synchronize ticket status changes from HDTS to TTS, especially for "Closed" status which only happens in HDTS.

#### API Endpoint
**Queue-based Communication (Asynchronous)**

- **Queue Name:** `TICKET_TASKS_PRODUCTION`
- **Task Name:** `tts.tasks.receive_hdts_ticket_status`
- **Trigger:** `post_save` signal on HDTS Ticket model (status change)

#### Method
Asynchronous message queue (Celery)

#### Request Format
```json
{
  "ticket_number": "TX20260112123456",
  "status": "Closed",
  "csat_rating": 5,
  "feedback": "Excellent service, issue resolved quickly",
  "date_completed": "2026-01-12T15:30:00Z",
  "time_closed": "2026-01-12T15:30:00Z"
}
```

**Required Fields:**
| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `ticket_number` | string | Yes | Ticket identifier |
| `status` | string | Yes | New status value |
| `csat_rating` | integer | No | Customer satisfaction (1-5) |
| `feedback` | string | No | Customer feedback text |
| `date_completed` | datetime | No | Completion timestamp |
| `time_closed` | datetime | No | Close timestamp |

#### Response Format
Queue acknowledgment (no direct response)

#### Authentication
- **Type:** Service-to-service (Celery queue)
- **Broker:** RabbitMQ authentication

#### Error Codes
| Code | Description | Action |
|------|-------------|--------|
| `TICKET_NOT_FOUND` | WorkflowTicket not found in TTS | Log warning |
| `QUEUE_ERROR` | Message delivery failed | Retry with exponential backoff |
| `INVALID_STATUS` | Invalid status value | Log error, skip update |

#### SLA
- **Queue Delivery:** < 2 seconds
- **Processing:** < 5 seconds
- **Retry Policy:** 3 attempts with exponential backoff

---

## TTS → HDTS Integration

### 1. Update Ticket Owner

#### Purpose
Assign a Ticket Coordinator as the owner of a ticket in HDTS when assigned through TTS workflow.

#### API Endpoint
**Queue-based Communication (Asynchronous)**

- **Queue Name:** `ticket_status-default`
- **Task Name:** `update_ticket_owner`
- **Trigger:** Task assignment in TTS workflow

#### Method
Asynchronous message queue (Celery)

#### Request Format
```json
{
  "ticket_number": "TX20260112123456",
  "owner_id": 456
}
```

#### Response Format
Queue acknowledgment (no direct response)

#### Authentication
- **Type:** Service-to-service (Celery queue)
- **Broker:** RabbitMQ authentication

#### Error Codes
| Code | Description | Action |
|------|-------------|--------|
| `TICKET_NOT_FOUND` | Ticket not found in HDTS | Log error |
| `INVALID_OWNER` | Owner ID does not exist | Log error, rollback |

#### SLA
- **Queue Delivery:** < 2 seconds
- **Processing:** < 3 seconds

---

### 2. Workflow Task Transitions

#### Purpose
Execute workflow transitions (approve, reject, escalate) on tasks.

#### API Endpoint
```
POST http://165.22.247.50:8002/transitions/
```

#### Method
POST

#### Request Format
**Headers:**
```http
Authorization: Bearer {jwt_token}
Content-Type: application/json
```

**Body:**
```json
{
  "task_item_id": 456,
  "transition_id": 789,
  "notes": "Approved after verification",
  "next_assignee_id": 101
}
```

**Required Fields:**
| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `task_item_id` | integer | Yes | TaskItem ID |
| `transition_id` | integer | Yes | Transition to execute |
| `notes` | string | Yes | Action notes/comments |
| `next_assignee_id` | integer | No | Next user to assign (if applicable) |

#### Response Format
**Success (200 OK):**
```json
{
  "status": "success",
  "task_item_id": 456,
  "new_status": "resolved",
  "next_step": "Quality Assurance",
  "next_assignee": "Bob Johnson",
  "message": "Transition completed successfully"
}
```

**Error Response:**
```json
{
  "status": "error",
  "code": "INVALID_TRANSITION",
  "message": "This transition is not available for the current step",
  "details": {
    "current_step": "Review",
    "attempted_transition": "reject",
    "available_transitions": ["approve", "escalate"]
  }
}
```

#### Authentication
- **Type:** JWT Bearer Token
- **Required Role:** Assigned user for the task
- **Permission Check:** User must be the assigned role user for the TaskItem

#### Error Codes
| HTTP Code | Error Code | Description | Resolution |
|-----------|------------|-------------|------------|
| 401 | `UNAUTHENTICATED` | Missing or invalid JWT token | Refresh token |
| 403 | `FORBIDDEN` | User not assigned to this task | Verify assignment |
| 404 | `TASK_NOT_FOUND` | TaskItem does not exist | Verify task_item_id |
| 400 | `INVALID_TRANSITION` | Transition not valid for current step | Use available transitions |
| 409 | `ALREADY_COMPLETED` | Task already resolved/completed | No action needed |
| 500 | `INTERNAL_ERROR` | Database or workflow error | Retry, contact support |

#### SLA
- **Response Time:** < 1 second (p95)
- **Availability:** 99.9%

---

### 3. Escalate Ticket Ownership

#### Purpose
Escalate ticket ownership from a Ticket Coordinator to an Admin.

#### API Endpoint
```
POST http://165.22.247.50:8002/tasks/ticket-owner/escalate/
```

#### Method
POST

#### Request Format
**Headers:**
```http
Authorization: Bearer {jwt_token}
Content-Type: application/json
```

**Body:**
```json
{
  "ticket_number": "TX20260112123456",
  "reason": "Requires admin intervention due to complexity",
  "urgency": "High"
}
```

#### Response Format
**Success (200 OK):**
```json
{
  "status": "success",
  "ticket_number": "TX20260112123456",
  "old_owner": "Jane Smith",
  "new_owner": "Admin Team",
  "escalated_at": "2026-01-12T15:45:00Z",
  "message": "Ticket escalated successfully"
}
```

#### Authentication
- **Type:** JWT Bearer Token
- **Required Role:** HDTS Ticket Coordinator

#### Error Codes
| HTTP Code | Error Code | Description | Resolution |
|-----------|------------|-------------|------------|
| 401 | `UNAUTHENTICATED` | Missing or invalid JWT token | Refresh token |
| 403 | `FORBIDDEN` | User not ticket owner | Verify ownership |
| 404 | `TICKET_NOT_FOUND` | Ticket does not exist | Verify ticket number |
| 409 | `ALREADY_ESCALATED` | Ticket already escalated | No action needed |

#### SLA
- **Response Time:** < 500ms (p95)
- **Availability:** 99.9%

---

### 4. Transfer Ticket Ownership

#### Purpose
Transfer ticket ownership from one coordinator to another (Admin only).

#### API Endpoint
```
POST http://165.22.247.50:8002/tasks/ticket-owner/transfer/
```

#### Method
POST

#### Request Format
**Headers:**
```http
Authorization: Bearer {jwt_token}
Content-Type: application/json
```

**Body:**
```json
{
  "ticket_number": "TX20260112123456",
  "new_owner_id": 789,
  "reason": "Workload balancing"
}
```

#### Response Format
**Success (200 OK):**
```json
{
  "status": "success",
  "ticket_number": "TX20260112123456",
  "old_owner": "Jane Smith",
  "new_owner": "Bob Johnson",
  "transferred_by": "Admin User",
  "transferred_at": "2026-01-12T16:00:00Z"
}
```

#### Authentication
- **Type:** JWT Bearer Token
- **Required Role:** HDTS Admin OR System Admin

#### Error Codes
| HTTP Code | Error Code | Description | Resolution |
|-----------|------------|-------------|------------|
| 401 | `UNAUTHENTICATED` | Missing or invalid JWT token | Refresh token |
| 403 | `INSUFFICIENT_PERMISSIONS` | User lacks admin role | Contact administrator |
| 404 | `TICKET_NOT_FOUND` | Ticket does not exist | Verify ticket number |
| 404 | `USER_NOT_FOUND` | New owner ID invalid | Verify user exists |
| 400 | `INVALID_TRANSFER` | Cannot transfer to same user | Choose different owner |

#### SLA
- **Response Time:** < 500ms (p95)
- **Availability:** 99.9%

---

## Authentication & Security

### Authentication Methods

#### 1. JWT Bearer Token (Primary)
```http
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

- **Token Type:** JWT (JSON Web Token)
- **Algorithm:** HS256
- **Expiration:** 1 hour (access token)
- **Refresh:** 7 days (refresh token)
- **Issuer:** Auth Service (Port 8003)

#### 2. Cookie-based (Fallback)
```http
Cookie: access_token=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

- **Cookie Name:** `access_token`
- **HttpOnly:** Yes
- **Secure:** Yes (production)
- **SameSite:** Lax
- **Domain:** .company.com

### Token Structure

```json
{
  "header": {
    "alg": "HS256",
    "typ": "JWT"
  },
  "payload": {
    "user_id": 123,
    "email": "user@company.com",
    "roles": [
      {
        "system": "hdts",
        "role": "Ticket Coordinator",
        "system_role_id": 5
      },
      {
        "system": "tts",
        "role": "Reviewer",
        "system_role_id": 8
      }
    ],
    "exp": 1705070400,
    "iat": 1705066800
  }
}
```

### Role-Based Access Control (RBAC)

#### System Roles

| System | Role | Permissions |
|--------|------|-------------|
| HDTS | Employee | Create tickets, view own tickets |
| HDTS | Ticket Coordinator | View owned tickets, update status, assign |
| HDTS | Admin | Full access, manage all tickets |
| TTS | Reviewer | Review and approve tasks |
| TTS | Approver | Final approval authority |
| TTS | Admin | Full workflow management |

#### Multi-System Permissions

Some endpoints require roles from multiple systems:

```python
# Example: User must have HDTS Ticket Coordinator OR TTS Admin role
permission_classes = [MultiSystemPermission.require_roles([
    ('hdts', 'Ticket Coordinator'),
    ('tts', 'Admin')
])]
```

### Security Best Practices

1. **HTTPS Only:** All production endpoints must use HTTPS
2. **Token Refresh:** Implement automatic token refresh before expiration
3. **CORS:** Whitelist only trusted domains
4. **Rate Limiting:** 1000 requests per hour per user
5. **Input Validation:** Sanitize all user inputs
6. **SQL Injection Prevention:** Use Django ORM parameterized queries
7. **XSS Prevention:** Escape all output
8. **CSRF Protection:** Enabled for state-changing operations

---

## Error Handling

### Standard Error Response Format

All API errors follow this format:

```json
{
  "status": "error",
  "code": "ERROR_CODE",
  "message": "Human-readable error message",
  "details": {
    "field": "Additional context",
    "trace_id": "uuid-for-tracking"
  },
  "timestamp": "2026-01-12T16:00:00Z"
}
```

### HTTP Status Codes

| Status Code | Meaning | Usage |
|-------------|---------|-------|
| 200 | OK | Successful request |
| 201 | Created | Resource created successfully |
| 204 | No Content | Successful deletion |
| 400 | Bad Request | Invalid input data |
| 401 | Unauthorized | Missing or invalid authentication |
| 403 | Forbidden | Insufficient permissions |
| 404 | Not Found | Resource does not exist |
| 409 | Conflict | Resource state conflict |
| 422 | Unprocessable Entity | Validation errors |
| 429 | Too Many Requests | Rate limit exceeded |
| 500 | Internal Server Error | Server error |
| 502 | Bad Gateway | Upstream service error |
| 503 | Service Unavailable | Service temporarily down |

### Common Error Codes

| Error Code | HTTP Status | Description | Resolution |
|------------|-------------|-------------|------------|
| `UNAUTHENTICATED` | 401 | Missing/invalid token | Login or refresh token |
| `FORBIDDEN` | 403 | Insufficient permissions | Request access from admin |
| `NOT_FOUND` | 404 | Resource not found | Verify identifier |
| `INVALID_INPUT` | 400 | Invalid request data | Check request format |
| `VALIDATION_ERROR` | 422 | Data validation failed | Fix validation errors |
| `DUPLICATE_RESOURCE` | 409 | Resource already exists | Use existing resource |
| `RATE_LIMIT_EXCEEDED` | 429 | Too many requests | Wait and retry |
| `SERVICE_UNAVAILABLE` | 503 | Service down | Retry later |
| `QUEUE_ERROR` | 500 | Message queue issue | Contact support |
| `DATABASE_ERROR` | 500 | Database connection issue | Contact support |

### Retry Strategy

For transient errors (500, 502, 503), implement exponential backoff:

```
Attempt 1: Wait 1 second
Attempt 2: Wait 2 seconds
Attempt 3: Wait 4 seconds
Attempt 4: Wait 8 seconds
Max attempts: 4
```

### Error Logging

All errors are logged with:
- Timestamp
- User ID (if authenticated)
- Request URL and method
- Error code and message
- Stack trace (for 500 errors)
- Trace ID for correlation

---

## SLA & Performance

### Service Level Agreements

#### Availability
| Service | Target | Measurement |
|---------|--------|-------------|
| HDTS API | 99.9% | Monthly uptime |
| TTS API | 99.9% | Monthly uptime |
| Message Queue | 99.95% | Monthly uptime |
| Auth Service | 99.95% | Monthly uptime |

#### Response Times (p95)

| Endpoint | Target | Notes |
|----------|--------|-------|
| GET /tasks/owned-tickets/ | 500ms | With 100 tickets |
| GET /api/tickets/number/{id}/ | 200ms | Single ticket |
| POST /transitions/ | 1000ms | Includes workflow logic |
| GET /tasks/logs/ | 500ms | Full history |
| Queue Processing | 5s | Ticket creation to task assignment |

#### Throughput

| Metric | Target | Notes |
|--------|--------|-------|
| Tickets Created/Hour | 1000 | Peak capacity |
| Concurrent Users | 500 | Simultaneous sessions |
| Queue Messages/Second | 100 | RabbitMQ throughput |
| API Requests/Second | 200 | Per service |

### Performance Monitoring

#### Metrics Tracked
- Response time (p50, p95, p99)
- Error rate (4xx, 5xx)
- Queue depth
- Database query time
- Memory usage
- CPU utilization

#### Alerting Thresholds
- Response time > 2 seconds (p95)
- Error rate > 1%
- Queue depth > 1000 messages
- Database connections > 80%
- CPU > 80% for 5 minutes
- Memory > 90%

### Capacity Planning

| Resource | Current | Max Capacity | Scale Trigger |
|----------|---------|--------------|---------------|
| Database Connections | 20 | 100 | > 80% usage |
| Worker Processes | 4 | 16 | Queue depth > 100 |
| API Servers | 2 | 8 | CPU > 70% |
| Message Queue | 1 | 3 (cluster) | Depth > 500 |

---

## Version History

### Version 1.0.0 (January 12, 2026)
**Status:** Active

**Initial Release:**
- HDTS → TTS ticket creation via Celery queue
- TTS → HDTS status synchronization
- Owned tickets API for Ticket Coordinators
- Task action logs and history
- Ticket ownership escalation and transfer
- JWT + Cookie authentication
- Role-based access control
- SLA definitions

**Endpoints:**
- GET /tasks/owned-tickets/
- GET /api/tickets/number/{ticket_number}/
- GET /tasks/logs/
- POST /transitions/
- POST /tasks/ticket-owner/escalate/
- POST /tasks/ticket-owner/transfer/

**Queue Tasks:**
- tts.tasks.process_ticket
- tts.tasks.receive_hdts_ticket_status
- update_ticket_owner

**Known Issues:**
- None

---

### Future Enhancements (Roadmap)

#### Version 1.1.0 (Planned: Q2 2026)
- Webhook support for real-time status updates
- GraphQL API for flexible querying
- Bulk ticket operations API
- Advanced search and filtering
- API rate limiting per endpoint
- Enhanced audit logging

#### Version 2.0.0 (Planned: Q4 2026)
- REST API versioning (v2)
- Async/await endpoints (long-running operations)
- Batch processing API
- Machine learning integration for auto-assignment
- Advanced analytics endpoints

---

## Change Log

### Upcoming Changes

No changes currently planned.

---

## Support & Contact

### Technical Support
- **Email:** tech-support@company.com
- **Slack:** #hdts-tts-integration
- **On-Call:** +1-555-0100

### Documentation
- **API Docs:** http://165.22.247.50:8002/api/docs/
- **Developer Portal:** https://docs.company.com/integration
- **GitHub:** https://github.com/mrccdrc27/MAP-SYSTEM

### Monitoring & Status
- **Status Page:** https://status.company.com
- **Metrics Dashboard:** https://metrics.company.com/hdts-tts
- **Logs:** https://logs.company.com

---

## Appendix

### Environment Configuration

#### HDTS Backend (Django Settings)
```python
# Celery Configuration
CELERY_BROKER_URL = 'amqp://guest:guest@localhost:5672//'
CELERY_RESULT_BACKEND = 'redis://localhost:6379/0'

# Task Routing
CELERY_TASK_ROUTES = {
    'hdts.tasks.sync_ticket_status_to_tts': {'queue': 'ticket_status-default'},
    'update_ticket_owner': {'queue': 'ticket_status-default'}
}

# TTS Integration
TTS_WORKFLOW_URL = 'http://165.22.247.50:8002'
```

#### TTS Workflow API (Django Settings)
```python
# Celery Configuration
CELERY_BROKER_URL = 'amqp://guest:guest@localhost:5672//'
CELERY_RESULT_BACKEND = 'redis://localhost:6379/0'

# Task Routing
CELERY_TASK_ROUTES = {
    'tts.tasks.receive_hdts_ticket_status': {'queue': 'TICKET_TASKS_PRODUCTION'},
    'tts.tasks.process_ticket': {'queue': 'TICKET_TASKS_PRODUCTION'}
}

# HDTS Integration
HDTS_BACKEND_URL = 'http://165.22.247.50:8000'
AUTH_SERVICE_URL = 'http://165.22.247.50:8003'
```

#### Frontend Environment Variables
```javascript
// HDTS Frontend (environment.js)
export const API_CONFIG = {
  BACKEND: {
    BASE_URL: 'http://165.22.247.50:8000',
  },
  AUTH: {
    BASE_URL: 'http://165.22.247.50:8003',
  },
  TTS_WORKFLOW: {
    BASE_URL: 'http://165.22.247.50:8002',
  }
};
```

### Testing Endpoints

#### Health Check
```bash
# HDTS Backend
curl http://165.22.247.50:8000/health

# TTS Workflow API
curl http://165.22.247.50:8002/health

# Auth Service
curl http://165.22.247.50:8003/health
```

#### Authentication Test
```bash
# Get JWT Token
curl -X POST http://165.22.247.50:8003/token/ \
  -H "Content-Type: application/json" \
  -d '{"email": "user@company.com", "password": "password"}'

# Response:
{
  "access": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "refresh": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

#### Test Integration
```bash
# Run integration test
python Scripts/testing/test_hdts_tts_integration.py --verbose

# PowerShell
.\Scripts\testing\test_hdts_tts_integration.ps1 -Verbose
```

---

**Document End**

For questions or feedback, contact the integration team at tech-support@company.com
