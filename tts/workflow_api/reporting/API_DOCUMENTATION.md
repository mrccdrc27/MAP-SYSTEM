# Reporting & Analytics API Endpoints

The Reporting App provides comprehensive analytics and reporting endpoints for the Ticket Tracking System. All endpoints require authentication via JWT token.

## Base URL
```
http://localhost:8002/analytics/
```

## Authentication
All endpoints require a valid JWT token from the auth service. The token can be passed in two ways:

### Method 1: Cookie-Based (Recommended)
The JWT token is automatically sent as a cookie with your browser/client requests:
```
Cookie: access_token=eyJ0eXAiOiJKV1QiLCJhbGc...
```

### Method 2: Authorization Header
Include the token in the Authorization header:
```
Authorization: Bearer <your_jwt_token>
```

### Getting a JWT Token

To obtain a JWT token, authenticate with the auth service:

```bash
curl -X POST http://localhost:8000/api/token/ \
  -H "Content-Type: application/json" \
  -d '{
    "email": "user@example.com",
    "password": "password"
  }' \
  -c cookies.txt

Response:
{
  "access": "<jwt_token>",
  "refresh": "<refresh_token>"
}
```

The `-c cookies.txt` flag saves the token as a cookie for subsequent requests.

### Using the Token with Cookies
```bash
# Token is automatically sent in cookie
curl -b cookies.txt \
  http://localhost:8002/analytics/dashboard/
```

### Using the Token with Authorization Header
```bash
curl -H "Authorization: Bearer eyJ0eXAiOiJKV1QiLCJhbGc..." \
  http://localhost:8002/analytics/dashboard/
```

### Token Expiration

- **Access tokens**: Valid for 5 minutes
- **Refresh tokens**: Valid for 24 hours
- When access token expires, use the refresh token to get a new one

### Refreshing Expired Token

```bash
curl -X POST http://localhost:8000/api/token/refresh/ \
  -H "Content-Type: application/json" \
  -d '{"refresh": "<refresh_token>"}'

Response:
{
  "access": "eyJ0eXAiOiJKV1QiLCJhbGc..." # New access token
}
```

### Authentication Errors

- **401 Unauthorized**: Missing or invalid token
- **403 Forbidden**: User lacks required permissions

**Error Response:**
```json
{
  "detail": "Authentication credentials were not provided."
}
```

---

## Endpoints

### 1. Dashboard Summary
**Endpoint:** `GET /analytics/dashboard/`

Returns a high-level overview of the entire system with key metrics.

**Response:**
```json
{
  "total_tickets": 150,
  "completed_tickets": 95,
  "pending_tickets": 30,
  "in_progress_tickets": 25,
  "sla_compliance_rate": 92.15,
  "avg_resolution_time_hours": 18.5,
  "total_users": 12,
  "total_workflows": 8,
  "escalation_rate": 5.33
}
```

**Metrics Explained:**
- `total_tickets`: Total number of tasks/tickets in the system
- `completed_tickets`: Number of completed tasks
- `pending_tickets`: Tasks waiting to be assigned
- `in_progress_tickets`: Currently being worked on
- `sla_compliance_rate`: % of tasks meeting SLA targets (0-100)
- `avg_resolution_time_hours`: Average hours to complete a task
- `total_users`: Number of unique users with assignments
- `total_workflows`: Number of workflows in the system
- `escalation_rate`: % of tasks that were escalated

---

### 2. Status Summary
**Endpoint:** `GET /analytics/status-summary/`

Breakdown of tickets by status.

**Response:**
```json
[
  {
    "status": "completed",
    "count": 95,
    "percentage": 63.33
  },
  {
    "status": "in progress",
    "count": 25,
    "percentage": 16.67
  },
  {
    "status": "pending",
    "count": 30,
    "percentage": 20.0
  }
]
```

---

### 3. SLA Compliance
**Endpoint:** `GET /analytics/sla-compliance/`

SLA compliance metrics broken down by ticket priority.

**Query Parameters:**
- `priority` (optional): Filter by specific priority (e.g., "High", "Critical", "Low", "Medium")

**Response:**
```json
[
  {
    "priority": "Critical",
    "total_tasks": 20,
    "sla_met": 18,
    "sla_breached": 2,
    "compliance_rate": 90.0,
    "avg_resolution_hours": 4.5
  },
  {
    "priority": "High",
    "total_tasks": 35,
    "sla_met": 33,
    "sla_breached": 2,
    "compliance_rate": 94.29,
    "avg_resolution_hours": 8.2
  }
]
```

**Example Request:**
```
GET /analytics/sla-compliance/?priority=Critical
```

---

### 4. Team Performance
**Endpoint:** `GET /analytics/team-performance/`

Individual user/agent performance metrics. Results sorted by completion rate (highest first).

**Query Parameters:**
- `role` (optional): Filter by role (if needed)

**Response:**
```json
[
  {
    "user_id": 5,
    "username": "john.doe",
    "total_tasks": 25,
    "completed_tasks": 24,
    "in_progress_tasks": 1,
    "completion_rate": 96.0,
    "avg_resolution_hours": 6.2,
    "escalation_count": 1
  },
  {
    "user_id": 8,
    "username": "jane.smith",
    "total_tasks": 30,
    "completed_tasks": 27,
    "in_progress_tasks": 3,
    "completion_rate": 90.0,
    "avg_resolution_hours": 7.8,
    "escalation_count": 3
  }
]
```

**Metrics Explained:**
- `completion_rate`: % of tasks completed by this user
- `avg_resolution_hours`: Average time user takes to complete tasks
- `escalation_count`: How many times tasks were escalated from this user

---

### 5. Workflow Metrics
**Endpoint:** `GET /analytics/workflow-metrics/`

Performance metrics for each workflow. Results sorted by completion rate.

**Query Parameters:**
- `department` (optional): Filter by department
- `workflow_id` (optional): Get metrics for a specific workflow

**Response:**
```json
[
  {
    "workflow_id": 1,
    "workflow_name": "Hardware Request Processing",
    "total_tasks": 45,
    "completed_tasks": 42,
    "pending_tasks": 2,
    "in_progress_tasks": 1,
    "completion_rate": 93.33,
    "avg_completion_hours": 12.5,
    "department": "IT",
    "category": "Asset Management"
  },
  {
    "workflow_id": 3,
    "workflow_name": "Budget Approval",
    "total_tasks": 28,
    "completed_tasks": 24,
    "pending_tasks": 3,
    "in_progress_tasks": 1,
    "completion_rate": 85.71,
    "avg_completion_hours": 24.3,
    "department": "Finance",
    "category": "Budget"
  }
]
```

**Example Requests:**
```
GET /analytics/workflow-metrics/?department=IT
GET /analytics/workflow-metrics/?workflow_id=1
```

---

### 6. Step Performance
**Endpoint:** `GET /analytics/step-performance/`

Performance metrics for workflow steps. Helps identify bottlenecks.

**Query Parameters:**
- `workflow_id` (optional): Filter steps by workflow

**Response:**
```json
[
  {
    "step_id": 1,
    "step_name": "Initial Review",
    "workflow_id": 1,
    "total_tasks": 45,
    "completed_tasks": 45,
    "escalated_tasks": 2,
    "avg_time_hours": 2.1,
    "role_name": "Reviewer"
  },
  {
    "step_id": 2,
    "step_name": "Manager Approval",
    "workflow_id": 1,
    "total_tasks": 45,
    "completed_tasks": 42,
    "escalated_tasks": 5,
    "avg_time_hours": 8.3,
    "role_name": "Manager"
  }
]
```

**Example Request:**
```
GET /analytics/step-performance/?workflow_id=1
```

---

### 7. Department Analytics
**Endpoint:** `GET /analytics/department-analytics/`

Performance metrics broken down by department.

**Response:**
```json
[
  {
    "department": "IT",
    "total_tickets": 85,
    "completed_tickets": 78,
    "completion_rate": 91.76,
    "avg_resolution_hours": 14.2
  },
  {
    "department": "Finance",
    "total_tickets": 65,
    "completed_tickets": 58,
    "completion_rate": 89.23,
    "avg_resolution_hours": 18.5
  }
]
```

---

### 8. Priority Distribution
**Endpoint:** `GET /analytics/priority-distribution/`

Distribution and metrics of tickets by priority level.

**Response:**
```json
[
  {
    "priority": "Critical",
    "count": 20,
    "percentage": 13.33,
    "avg_resolution_hours": 4.5
  },
  {
    "priority": "High",
    "count": 35,
    "percentage": 23.33,
    "avg_resolution_hours": 8.2
  },
  {
    "priority": "Medium",
    "count": 60,
    "percentage": 40.0,
    "avg_resolution_hours": 12.8
  },
  {
    "priority": "Low",
    "count": 35,
    "percentage": 23.34,
    "avg_resolution_hours": 24.1
  }
]
```

---

### 9. Ticket Age Analytics
**Endpoint:** `GET /analytics/ticket-age/`

Analyze aging tickets - helps identify stalled or overdue work.

**Response:**
```json
[
  {
    "age_bucket": "0-1 days",
    "count": 15,
    "percentage": 10.0
  },
  {
    "age_bucket": "1-7 days",
    "count": 45,
    "percentage": 30.0
  },
  {
    "age_bucket": "7-30 days",
    "count": 60,
    "percentage": 40.0
  },
  {
    "age_bucket": "30-90 days",
    "count": 25,
    "percentage": 16.67
  },
  {
    "age_bucket": "90+ days",
    "count": 5,
    "percentage": 3.33
  }
]
```

---

### 10. Assignment Analytics
**Endpoint:** `GET /analytics/assignment-analytics/`

Task assignment analytics by role - helpful for workload distribution and capacity planning.

**Response:**
```json
[
  {
    "role_name": "Reviewer",
    "total_assignments": 120,
    "avg_assignments_per_user": 3.75,
    "total_users_in_role": 8,
    "reassignment_count": 12
  },
  {
    "role_name": "Manager",
    "total_assignments": 95,
    "avg_assignments_per_user": 2.86,
    "total_users_in_role": 7,
    "reassignment_count": 8
  }
]
```

**Metrics Explained:**
- `total_assignments`: Total number of task assignments to this role
- `avg_assignments_per_user`: Average tasks per user in the role
- `total_users_in_role`: Number of active users in this role
- `reassignment_count`: How many times tasks were reassigned within the role

---

### 11. Audit Activity
**Endpoint:** `GET /analytics/audit-activity/`

User and system activity audit data. Helps with compliance and troubleshooting.

**Query Parameters:**
- `days` (optional): Time period in days (default: 30)

**Response:**
```json
{
  "time_period_days": 30,
  "total_events": 1250,
  "user_activity": [
    {
      "user_id": 5,
      "username": "john.doe",
      "action_count": 125,
      "last_action": "2025-11-20T15:30:00Z"
    },
    {
      "user_id": 8,
      "username": "jane.smith",
      "action_count": 118,
      "last_action": "2025-11-20T14:15:00Z"
    }
  ],
  "action_activity": [
    {
      "action": "update_workflow",
      "count": 245
    },
    {
      "action": "assign_task",
      "count": 189
    }
  ]
}
```

**Example Request:**
```
GET /analytics/audit-activity/?days=7
```

---

## Error Handling

All endpoints return appropriate HTTP status codes:

- **200 OK**: Request successful
- **400 Bad Request**: Invalid query parameters
- **401 Unauthorized**: Missing or invalid JWT token
- **500 Internal Server Error**: Server error (check logs)

**Error Response Format:**
```json
{
  "error": "Error description"
}
```

---

## Usage Examples

### Step 1: Get JWT Token (from Auth Service)
```bash
curl -X POST http://localhost:8000/api/token/ \
  -H "Content-Type: application/json" \
  -d '{
    "email": "user@example.com",
    "password": "password123"
  }' \
  -c cookies.txt

Response:
{
  "access": "eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9...",
  "refresh": "eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9..."
}
```

The `-c cookies.txt` flag automatically saves the token as a cookie.

### Step 2: Use Token for Analytics (Cookie-Based)

All examples below automatically include the token from cookies.txt

### Get Dashboard Overview
```bash
curl -b cookies.txt \
  http://localhost:8002/analytics/dashboard/
```

### Get SLA Compliance for Critical Priority
```bash
curl -b cookies.txt \
  "http://localhost:8002/analytics/sla-compliance/?priority=Critical"
```

### Get Team Performance (Top Performers)
```bash
curl -b cookies.txt \
  http://localhost:8002/analytics/team-performance/
```

### Step 3: Refresh Token (if Expired)
```bash
curl -X POST http://localhost:8000/api/token/refresh/ \
  -H "Content-Type: application/json" \
  -d '{"refresh": "<your_refresh_token>"}' \
  -c cookies.txt
```

### Alternative: Use Authorization Header (Without Cookies)

If you prefer not to use cookies, extract the token and use the Authorization header:

```bash
# Get token and extract it
TOKEN=$(curl -s -X POST http://localhost:8000/api/token/ \
  -H "Content-Type: application/json" \
  -d '{
    "email": "user@example.com",
    "password": "password123"
  }' | jq -r '.access')

# Use token in Authorization header
curl -H "Authorization: Bearer $TOKEN" \
  http://localhost:8002/analytics/dashboard/
```

### Get Dashboard Overview
```bash
curl -b cookies.txt \
  http://localhost:8002/analytics/dashboard/
```

### Get SLA Compliance for Critical Priority
```bash
curl -b cookies.txt \
  "http://localhost:8002/analytics/sla-compliance/?priority=Critical"
```

### Get Team Performance (Top Performers)
```bash
curl -b cookies.txt \
  http://localhost:8002/analytics/team-performance/
```

### Get Workflow Metrics for IT Department
```bash
curl -b cookies.txt \
  "http://localhost:8002/analytics/workflow-metrics/?department=IT"
```

### Get Recent Audit Activity (Last 7 Days)
```bash
curl -b cookies.txt \
  "http://localhost:8002/analytics/audit-activity/?days=7"
```

---

## Performance Considerations

- Endpoints aggregate data across all tables (may take longer with large datasets)
- Consider implementing caching for dashboard endpoints if needed
- All queries are optimized with proper annotations and aggregations
- Filtering parameters can improve response times

---

## Frontend Integration

Example React fetch call:
```javascript
const getAnalytics = async (endpoint, params = {}) => {
  const queryString = new URLSearchParams(params).toString();
  const url = `http://localhost:8002/analytics/${endpoint}/?${queryString}`;
  
  const response = await fetch(url, {
    headers: {
      'Authorization': `Bearer ${localStorage.getItem('token')}`
    }
  });
  
  return response.json();
};

// Usage
const dashboard = await getAnalytics('dashboard/');
const slaMet = await getAnalytics('sla-compliance/', { priority: 'Critical' });
```
