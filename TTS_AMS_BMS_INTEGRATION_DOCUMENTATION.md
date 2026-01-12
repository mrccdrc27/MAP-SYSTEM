# TTS ↔ AMS ↔ BMS Integration Documentation

**Document Version:** 1.0.0  
**Last Updated:** January 12, 2026  
**Status:** Active

---

## Table of Contents

1. [TTS → AMS Integration](#tts--ams-integration)
2. [AMS → TTS Integration](#ams--tts-integration)
3. [TTS → BMS Integration](#tts--bms-integration)
4. [BMS → TTS Integration](#bms--tts-integration)

---

# TTS → AMS Integration

## Integration 1: TTS → AMS (Resolved Asset Checkout Tickets)

### 1. Integration
**System A ↔ System B:** TTS (Ticket Tracking System) → AMS (Asset Management System)

### 2. Purpose
To provide AMS with a list of resolved asset checkout tickets from TTS workflow system, allowing AMS Asset Managers to process asset checkout requests that have been approved through the workflow.

**Business Value:** When a ticket for asset checkout completes the TTS workflow approval process, it becomes visible to AMS for actual asset allocation and checkout processing.

### 3. API Endpoint
```
GET http://165.22.247.50:8002/api/tickets/asset/checkout/resolved/
```

### 4. Method
`GET` - Retrieve data

### 5. Request Format

**Headers:** Not required (Public endpoint)

**Query Parameters:**

| Field | Description | Type | Required |
|-------|-------------|------|----------|
| status | Filter by ticket status | string | No (default: 'Resolved') |
| limit | Maximum number of results | integer | No (default: 100) |
| approved_only | Return only approved tickets | boolean | No (default: false) |

**Example Request:**
```bash
curl -X GET "http://165.22.247.50:8002/api/tickets/asset/checkout/resolved/?status=Resolved&limit=50"
```

### 6. Response Format

**Success (200 OK):**
```json
{
  "count": 45,
  "category": "Asset Check Out",
  "status_filter": "Resolved",
  "tickets": [
    {
      "id": 80,
      "ticket_number": "TKT080",
      "ticket_id": 80,
      "category": "Asset Check Out",
      "sub_category": "Equipment Checkout",
      "asset_id_number": "AST-2024-001",
      "location": "San Juan Office",
      "request_date": "2026-01-10T08:00:00Z",
      "type": "checkout",
      "subject": "Laptop checkout for field work",
      "asset_name": "Dell Latitude 5420",
      "serial_number": "SN123456789",
      "employee_name": "John Doe",
      "employee_id": 17,
      "checkout_date": "2026-01-10",
      "expected_return_date": "2026-01-20",
      "condition": "Good",
      "notes": "Required for client site visit",
      "department": "IT Department",
      "attachments": [],
      "status": "Resolved",
      "priority": "High",
      "dynamic_data": {}
    }
  ]
}
```

**Error Response:**
```json
{
  "error": "No tickets found",
  "status": 404
}
```

### 7. Authentication
**Type:** None (Public endpoint)  
**Reason:** This is a system-to-system integration endpoint with no sensitive data exposure risk.

### 8. Error Codes

| HTTP Code | Description | Resolution |
|-----------|-------------|------------|
| 200 | Success | Process the tickets |
| 404 | No tickets found | Normal condition, no action needed |
| 500 | Internal server error | Retry after 30 seconds, contact support if persists |

### 9. SLA (Service Level Agreement)

**Availability:** 99.9% uptime  
**Response Time:** < 500ms per request (p95)  
**Timeout:** 30 seconds  
**Rate Limit:** 1000 requests/hour per IP

### 10. Version
`v1.0` (Current)

### 11. Change Log

**v1.0 (January 2026)** - Initial release
- Added resolved checkout tickets endpoint
- Support for filtering by status and limit
- Returns flattened ticket structure for AMS consumption

---

## Integration 2: TTS → AMS (Resolved Asset Check-In Tickets)

### 1. Integration
**System A ↔ System B:** TTS (Ticket Tracking System) → AMS (Asset Management System)

### 2. Purpose
To provide AMS with a list of resolved asset check-in tickets from TTS workflow system, allowing AMS Asset Managers to process asset returns that have been approved through the workflow.

**Business Value:** When an employee returns an asset and the check-in ticket completes TTS workflow approval, it becomes visible to AMS for processing the actual asset return and updating asset status.

### 3. API Endpoint
```
GET http://165.22.247.50:8002/api/tickets/asset/checkin/resolved/
```

### 4. Method
`GET` - Retrieve data

### 5. Request Format

**Headers:** Not required (Public endpoint)

**Query Parameters:**

| Field | Description | Type | Required |
|-------|-------------|------|----------|
| status | Filter by ticket status | string | No (default: 'Resolved') |
| limit | Maximum number of results | integer | No (default: 100) |
| approved_only | Return only approved tickets | boolean | No (default: false) |

**Example Request:**
```bash
curl -X GET "http://165.22.247.50:8002/api/tickets/asset/checkin/resolved/?status=Resolved&limit=50"
```

### 6. Response Format

**Success (200 OK):**
```json
{
  "count": 23,
  "category": "Asset Check In",
  "status_filter": "Resolved",
  "tickets": [
    {
      "id": 81,
      "ticket_number": "TKT081",
      "ticket_id": 81,
      "category": "Asset Check In",
      "sub_category": "Equipment Return",
      "asset_id_number": "AST-2024-001",
      "status": "Resolved",
      "checkin_date": "2026-01-20",
      "type": "checkin",
      "subject": "Laptop return after field work",
      "checkout_ticket_reference": "TKT080",
      "asset_name": "Dell Latitude 5420",
      "serial_number": "SN123456789",
      "location": "San Juan Office",
      "department": "IT Department",
      "condition": "Good",
      "notes": "Returned in good condition",
      "attachments": [],
      "priority": "Medium",
      "employee_name": "John Doe",
      "employee_id": 17,
      "dynamic_data": {}
    }
  ]
}
```

### 7. Authentication
**Type:** None (Public endpoint)

### 8. Error Codes

| HTTP Code | Description | Resolution |
|-----------|-------------|------------|
| 200 | Success | Process the tickets |
| 404 | No tickets found | Normal condition |
| 500 | Internal server error | Retry, contact support |

### 9. SLA (Service Level Agreement)

**Availability:** 99.9% uptime  
**Response Time:** < 500ms per request (p95)  
**Timeout:** 30 seconds

### 10. Version
`v1.0` (Current)

### 11. Change Log

**v1.0 (January 2026)** - Initial release
- Added resolved check-in tickets endpoint
- Links check-in tickets to original checkout tickets via `checkout_ticket_reference`

---

## Integration 3: TTS → AMS (All Resolved Asset Tickets)

### 1. Integration
**System A ↔ System B:** TTS (Ticket Tracking System) → AMS (Asset Management System)

### 2. Purpose
To provide AMS with a unified endpoint for fetching all resolved asset-related tickets (both check-in and check-out) in a single API call.

**Business Value:** Simplifies AMS integration by providing a single endpoint for all asset ticket types.

### 3. API Endpoint
```
GET http://165.22.247.50:8002/api/tickets/asset/resolved/
```

### 4. Method
`GET` - Retrieve data

### 5. Request Format

**Query Parameters:**

| Field | Description | Type | Required |
|-------|-------------|------|----------|
| id | Filter by ticket ID (exact match) | integer | No |
| ticket_number | Filter by ticket number (partial match) | string | No |
| type | Filter by type: 'checkin' or 'checkout' | string | No |
| status | Filter by ticket status | string | No (default: 'Resolved') |
| limit | Maximum number of results | integer | No (default: 100) |

**Example Request:**
```bash
curl -X GET "http://165.22.247.50:8002/api/tickets/asset/resolved/?type=checkout&limit=20"
```

### 6. Response Format

**Success (200 OK):** Returns flat array
```json
[
  {
    "id": 80,
    "location_details": {
      "id": 7,
      "name": "San Juan"
    },
    "requestor_details": {
      "id": 17,
      "name": "John Doe",
      "firstname": "John",
      "lastname": "Doe",
      "email": "john.doe@company.com",
      "company_id": "EMP001",
      "department": "IT Department"
    },
    "ticket_number": "TKT080",
    "employee": 17,
    "asset": 80,
    "subject": "Laptop checkout for field work",
    "location": 7,
    "is_resolved": false,
    "created_at": "2026-01-10T08:00:00Z",
    "updated_at": "2026-01-12T10:30:00Z",
    "checkout_date": "2026-01-10",
    "return_date": "2026-01-20",
    "asset_checkout": 40,
    "checkin_date": null,
    "asset_checkin": null
  }
]
```

### 7. Authentication
**Type:** None (Public endpoint)

### 8. Error Codes

| HTTP Code | Description | Resolution |
|-----------|-------------|------------|
| 200 | Success | Process tickets |
| 500 | Internal error | Retry, contact support |

### 9. SLA (Service Level Agreement)

**Availability:** 99.9% uptime  
**Response Time:** < 500ms per request (p95)

### 10. Version
`v1.0` (Current)

### 11. Change Log

**v1.0 (January 2026)** - Initial release
- Unified endpoint for all asset tickets
- Flattened response structure with nested location and requestor details

---

# AMS → TTS Integration

## Integration 4: AMS → TTS (Mark Ticket as Executed/Approved)

### 1. Integration
**System A ↔ System B:** AMS (Asset Management System) → TTS (Ticket Tracking System)

### 2. Purpose
To notify TTS when AMS has successfully processed an asset checkout or check-in action, marking the task as `ams_executed` in the TTS database.

**Business Value:** Provides bi-directional integration feedback loop. When AMS completes the physical asset allocation/return, TTS workflow system is notified and can close the workflow task accordingly.

### 3. API Endpoint
```
POST http://165.22.247.50:8002/api/tickets/asset/approve/
```

### 4. Method
`POST` - Create/Update data

### 5. Request Format

**Headers:**
```http
Content-Type: application/json
```

**Body:**
```json
{
  "ticket_id": 80,
  "ticket_number": "TKT080",
  "ams_executed": true
}
```

**Required Fields:**

| Field | Description | Type | Required |
|-------|-------------|------|----------|
| ticket_id | WorkflowTicket ID in TTS | integer | Yes (if ticket_number not provided) |
| ticket_number | Ticket number | string | Yes (if ticket_id not provided) |
| ams_executed | Set to true to mark as executed | boolean | No (default: true) |

### 6. Response Format

**Success (200 OK):**
```json
{
  "success": true,
  "message": "Ticket approved successfully",
  "ticket_id": 80,
  "ticket_number": "TKT080",
  "task_id": 123,
  "ams_executed": true
}
```

**Error Response (404 Not Found):**
```json
{
  "error": "Ticket not found: TKT080",
  "status": 404
}
```

**Error Response (400 Bad Request):**
```json
{
  "error": "Either ticket_id or ticket_number is required",
  "status": 400
}
```

### 7. Authentication
**Type:** None (Public endpoint - system-to-system)  
**Note:** This endpoint is designed for internal service communication. In production, consider adding API key authentication.

### 8. Error Codes

| HTTP Code | Description | Resolution |
|-----------|-------------|------------|
| 200 | Success | Ticket marked as executed |
| 400 | Bad request | Provide either ticket_id or ticket_number |
| 404 | Ticket not found | Verify ticket exists in TTS |
| 404 | Task not found | Ticket has no associated task in workflow |
| 500 | Internal error | Check TTS service logs, retry |

### 9. SLA (Service Level Agreement)

**Availability:** 99.9% uptime  
**Response Time:** < 300ms per request (p95)  
**Timeout:** 10 seconds

### 10. Version
`v1.0` (Current)

### 11. Change Log

**v1.0 (January 2026)** - Initial release
- Added single ticket approval endpoint
- Supports both ticket_id and ticket_number lookup
- Updates Task.ams_executed flag

---

## Integration 5: AMS → TTS (Bulk Mark Tickets as Executed)

### 1. Integration
**System A ↔ System B:** AMS (Asset Management System) → TTS (Ticket Tracking System)

### 2. Purpose
To notify TTS when AMS has processed multiple asset tickets in bulk, improving efficiency for batch operations.

**Business Value:** Allows AMS to process multiple asset operations and notify TTS in a single API call, reducing network overhead and improving performance.

### 3. API Endpoint
```
POST http://165.22.247.50:8002/api/tickets/asset/approve/bulk/
```

### 4. Method
`POST` - Create/Update data

### 5. Request Format

**Headers:**
```http
Content-Type: application/json
```

**Body (Option 1 - By IDs):**
```json
{
  "ticket_ids": [80, 81, 82],
  "ams_executed": true
}
```

**Body (Option 2 - By Ticket Numbers):**
```json
{
  "ticket_numbers": ["TKT080", "TKT081", "TKT082"],
  "ams_executed": true
}
```

**Required Fields:**

| Field | Description | Type | Required |
|-------|-------------|------|----------|
| ticket_ids | List of WorkflowTicket IDs | array[integer] | Yes (if ticket_numbers not provided) |
| ticket_numbers | List of ticket numbers | array[string] | Yes (if ticket_ids not provided) |
| ams_executed | Set to true to mark as executed | boolean | No (default: true) |

### 6. Response Format

**Success (200 OK):**
```json
{
  "success": true,
  "message": "3 tickets approved successfully",
  "approved": [
    {
      "ticket_id": 80,
      "ticket_number": "TKT080",
      "task_id": 123
    },
    {
      "ticket_id": 81,
      "ticket_number": "TKT081",
      "task_id": 124
    },
    {
      "ticket_id": 82,
      "ticket_number": "TKT082",
      "task_id": 125
    }
  ],
  "failed": []
}
```

**Partial Success (200 OK):**
```json
{
  "success": true,
  "message": "2 tickets approved successfully",
  "approved": [
    {
      "ticket_id": 80,
      "ticket_number": "TKT080",
      "task_id": 123
    },
    {
      "ticket_id": 81,
      "ticket_number": "TKT081",
      "task_id": 124
    }
  ],
  "failed": [
    {
      "ticket_id": 82,
      "error": "Ticket not found"
    }
  ]
}
```

### 7. Authentication
**Type:** None (Public endpoint - system-to-system)

### 8. Error Codes

| HTTP Code | Description | Resolution |
|-----------|-------------|------------|
| 200 | Success (full or partial) | Check approved/failed arrays |
| 400 | Bad request | Provide either ticket_ids or ticket_numbers |
| 500 | Internal error | Check service logs, retry failed items |

### 9. SLA (Service Level Agreement)

**Availability:** 99.9% uptime  
**Response Time:** < 1 second per request (p95)  
**Batch Size:** Maximum 100 tickets per request  
**Timeout:** 30 seconds

### 10. Version
`v1.0` (Current)

### 11. Change Log

**v1.0 (January 2026)** - Initial release
- Added bulk ticket approval endpoint
- Returns detailed success/failure breakdown
- Supports both ticket_ids and ticket_numbers

---

# TTS → BMS Integration

## Integration 6: TTS → BMS (Submit Budget Proposal)

### 1. Integration
**System A ↔ System B:** TTS (Ticket Tracking System) → BMS (Budget Management System)

### 2. Purpose
To automatically submit budget proposals to BMS when a budget request ticket completes the TTS workflow approval process and reaches the final "pending_external" status.

**Business Value:** When a budget proposal ticket is created in HDTS and goes through TTS workflow approval, it is automatically submitted to BMS for budget processing, eliminating manual data entry and ensuring seamless workflow integration.

### 3. API Endpoint
```
POST https://budget-pro.onrender.com/api/external-budget-proposals/
```

**Note:** This endpoint can be configured via `BMS_API_BASE_URL` setting in TTS.

### 4. Method
`POST` - Create new data

### 5. Request Format

**Headers:**
```http
Content-Type: application/json
X-API-Key: tts-live-key-112233445
```

**Body:**
```json
{
  "ticket_id": "TX20260112123456",
  "department_input": "IT",
  "title": "Q1 Equipment Budget Proposal",
  "project_summary": "New Budget Proposal",
  "project_description": "Budget for new laptops and network equipment for Q1 2026",
  "submitted_by_name": "John Doe",
  "fiscal_year": 4,
  "performance_start_date": "2026-01-01",
  "performance_end_date": "2026-03-31",
  "items": [
    {
      "cost_element": "Laptops",
      "description": "20 Dell Latitude 5420 laptops for new hires",
      "estimated_cost": 90000.00,
      "account": 3,
      "category_code": "CAPEX"
    },
    {
      "cost_element": "Network Equipment",
      "description": "Switches and routers for office expansion",
      "estimated_cost": 50000.00,
      "account": 3,
      "category_code": "CAPEX"
    }
  ]
}
```

**Required Fields:**

| Field | Description | Type | Required |
|-------|-------------|------|----------|
| ticket_id | Ticket number from HDTS/TTS | string | Yes |
| department_input | Department name | string | Yes |
| title | Budget proposal title | string | Yes |
| project_summary | Brief summary (category) | string | Yes |
| project_description | Detailed description | string | Yes |
| submitted_by_name | Full name of submitter | string | Yes |
| fiscal_year | Fiscal year ID | integer | Yes |
| items | Array of budget items | array[object] | Yes |

**Item Fields:**

| Field | Description | Type | Required |
|-------|-------------|------|----------|
| cost_element | Cost element name | string | Yes |
| description | Item description | string | Yes |
| estimated_cost | Cost amount (supports commas) | number | Yes |
| account | Account ID | integer | Yes |
| category_code | "CAPEX" or "OPEX" | string | Yes |

### 6. Response Format

**Success (201 Created):**
```json
{
  "id": 42,
  "external_system_id": "TX20260112123456",
  "title": "Q1 Equipment Budget Proposal",
  "status": "SUBMITTED",
  "department": {
    "id": 5,
    "name": "IT",
    "code": "IT"
  },
  "submitted_by_name": "John Doe",
  "fiscal_year": 4,
  "total_budget": 140000.00,
  "items": [
    {
      "id": 101,
      "cost_element": "Laptops",
      "description": "20 Dell Latitude 5420 laptops for new hires",
      "estimated_cost": "90000.00",
      "account": 3,
      "category_code": "CAPEX"
    },
    {
      "id": 102,
      "cost_element": "Network Equipment",
      "description": "Switches and routers for office expansion",
      "estimated_cost": "50000.00",
      "account": 3,
      "category_code": "CAPEX"
    }
  ],
  "created_at": "2026-01-12T16:00:00Z"
}
```

**Error Response (400 Bad Request - Validation Error):**
```json
{
  "error": "Validation error",
  "details": {
    "fiscal_year": ["Invalid fiscal year ID"],
    "items": [
      {
        "account": ["Invalid account ID"]
      }
    ]
  }
}
```

**Error Response (401 Unauthorized):**
```json
{
  "error": "Invalid API key"
}
```

### 7. Authentication

**Type:** API Key (X-API-Key header)  
**Key Value:** `tts-live-key-112233445` (configurable via `BMS_API_KEY` setting)  
**Security:** API key should be stored securely in environment variables, never in code

### 8. Error Codes

| HTTP Code | Description | Resolution |
|-----------|-------------|------------|
| 201 | Created successfully | Budget proposal created in BMS |
| 400 | Validation error | Check required fields and data types |
| 401 | Unauthorized | Verify API key is correct |
| 409 | Duplicate ticket_id | Ticket already submitted to BMS |
| 500 | Server error | BMS service issue, will retry automatically |
| 503 | Service unavailable | BMS temporarily down, will retry |
| Timeout | Request timeout after 30s | Network/BMS issue, will retry |

### 9. SLA (Service Level Agreement)

**Availability:** 99.5% uptime (external service)  
**Response Time:** < 2 seconds per request (p95)  
**Timeout:** 30 seconds  
**Retry Policy:**  
- Attempt 1: Immediate  
- Attempt 2: Wait 30 seconds (exponential backoff)  
- Attempt 3: Wait 60 seconds  
- Attempt 4: Wait 120 seconds  
- Attempt 5: Wait 240 seconds  
- Max attempts: 5

**Automatic Fallbacks:**
- If fiscal_year validation fails, TTS will retry with fallback fiscal year IDs [4, 3]
- If account validation fails, TTS will retry with fallback account ID (4 - General Expenses)

### 10. Version
`v1.0` (Current)

### 11. Change Log

**v1.0 (January 2026)** - Initial integration
- Added automatic budget proposal submission from TTS to BMS
- Implemented retry mechanism with exponential backoff
- Added automatic fallback for fiscal year and account validation errors
- Stores failed submissions in `FailedBMSSubmission` table for manual review
- Triggered via Celery task `task.submit_bms_budget_proposal`
- Workflow end_logic='bms' triggers submission when task reaches pending_external status

---

# BMS → TTS Integration

## Integration 7: BMS → TTS (Budget Proposal Status Update)

### 1. Integration
**System A ↔ System B:** BMS (Budget Management System) → TTS (Ticket Tracking System)

### 2. Purpose
To notify TTS (and consequently HDTS) when a budget proposal's status changes in BMS (e.g., approved, rejected, pending revision).

**Business Value:** Provides real-time feedback to ticket owners and requesters about the status of their budget proposals, closing the integration loop.

### 3. API Endpoint
```
POST http://165.22.247.50:8002/api/budget-status-update/
```

**Note:** This endpoint is planned but not yet implemented. When implemented, it will receive status updates from BMS.

### 4. Method
`POST` - Update data

### 5. Request Format

**Headers:**
```http
Content-Type: application/json
X-API-Key: bms-to-tts-key-secret
```

**Body:**
```json
{
  "ticket_id": "TX20260112123456",
  "proposal_id": 42,
  "status": "APPROVED",
  "approved_amount": 140000.00,
  "approved_by": "Jane Smith",
  "approved_at": "2026-01-15T10:30:00Z",
  "notes": "Approved with full budget allocation"
}
```

**Required Fields:**

| Field | Description | Type | Required |
|-------|-------------|------|----------|
| ticket_id | Original ticket number from TTS | string | Yes |
| proposal_id | BMS proposal ID | integer | Yes |
| status | New status: APPROVED, REJECTED, PENDING_REVISION | string | Yes |
| approved_amount | Approved budget amount | number | No |
| approved_by | Name of approver | string | No |
| approved_at | Approval timestamp | datetime | No |
| notes | Additional comments | string | No |

### 6. Response Format

**Success (200 OK):**
```json
{
  "success": true,
  "message": "Budget proposal status updated",
  "ticket_id": "TX20260112123456",
  "ticket_status": "Completed",
  "updated_at": "2026-01-15T10:30:00Z"
}
```

**Error Response (404 Not Found):**
```json
{
  "error": "Ticket not found: TX20260112123456",
  "status": 404
}
```

### 7. Authentication

**Type:** API Key (X-API-Key header)  
**Key Value:** To be configured (stored in TTS settings)  
**Security:** API key authentication required for system-to-system communication

### 8. Error Codes

| HTTP Code | Description | Resolution |
|-----------|-------------|------------|
| 200 | Success | Status updated in TTS and HDTS |
| 400 | Invalid request | Check required fields |
| 401 | Unauthorized | Verify API key |
| 404 | Ticket not found | Verify ticket_id exists in TTS |
| 500 | Internal error | Contact TTS support |

### 9. SLA (Service Level Agreement)

**Availability:** 99.9% uptime  
**Response Time:** < 500ms per request (p95)  
**Timeout:** 15 seconds

### 10. Version
`v1.0` (Planned - Not Yet Implemented)

### 11. Change Log

**v1.0 (Planned Q2 2026)** - Initial implementation planned
- Budget proposal status webhook from BMS to TTS
- Automatic ticket status update in HDTS when BMS proposal is approved/rejected
- Email notification to ticket owner and requester

---

## Notes and Best Practices

### Integration Flow Summary

```
┌──────────────────────────────────────────────────────────────────┐
│                     HDTS (Help Desk)                              │
│                     Port 8000                                     │
└────────────────┬─────────────────────────────────────────────────┘
                 │
                 │ Celery Queue (Ticket Created)
                 ▼
┌──────────────────────────────────────────────────────────────────┐
│                  TTS Workflow API                                 │
│                     Port 8002                                     │
│  • Process ticket through workflow                                │
│  • Assign tasks to approvers                                     │
└────────┬─────────────────────────────────────┬───────────────────┘
         │                                     │
         │ GET /api/tickets/asset/resolved/    │ POST /api/external-budget-proposals/
         │ (Public endpoint)                   │ (API Key auth)
         ▼                                     ▼
┌─────────────────────────────┐    ┌──────────────────────────────┐
│   AMS (Asset Management)    │    │  BMS (Budget Management)     │
│      Port 8001              │    │      External Service        │
│                             │    │                              │
│  1. Fetch resolved tickets  │    │  1. Receive budget proposal  │
│  2. Process asset actions   │    │  2. Route for approval       │
│  3. Mark as executed ───────┼────┤  3. Return status (planned)  │
│                             │    │                              │
│  POST /approve/ ────────────┘    └──────────────────────────────┘
│  (Notify TTS)
│
▼
Back to TTS (mark ams_executed=true)
```

### Configuration Requirements

#### TTS Configuration (Django settings)
```python
# BMS Integration
BMS_API_BASE_URL = 'https://budget-pro.onrender.com/api'
BMS_API_KEY = 'tts-live-key-112233445'

# Asset Integration Base URL (TTS serves AMS)
# No configuration needed - AMS calls TTS directly

# Celery Task Routing
CELERY_TASK_ROUTES = {
    'task.submit_bms_budget_proposal': {'queue': 'budget_submissions'},
}
```

#### AMS Configuration
```python
# TTS Ticket Tracking Integration
TICKET_TRACKING_API_URL = 'http://165.22.247.50:8002/'
# or for docker: 'http://workflow-api:8002/'
```

#### BMS Configuration
```python
# External Service API Keys
TTS_CLIENT_API_KEY_EXPECTED = 'tts-live-key-112233445'

# Service Authentication
TRUSTED_SERVICE_KEYS = {
    'TTS': 'tts-live-key-112233445',
    'DTS': 'dts-key-secret',
}
```

### Security Recommendations

1. **API Keys:** Store all API keys in environment variables, never commit to version control
2. **HTTPS:** Use HTTPS for all production endpoints (especially BMS external service)
3. **Rate Limiting:** Implement rate limiting on public endpoints (asset ticket endpoints)
4. **Input Validation:** Always validate and sanitize input data
5. **Audit Logging:** Log all integration API calls with timestamps and results
6. **Error Handling:** Implement graceful degradation when external services are unavailable
7. **Monitoring:** Set up alerts for failed integrations and high error rates

### Testing Endpoints

#### Test TTS to AMS
```bash
# Fetch resolved checkout tickets
curl -X GET "http://165.22.247.50:8002/api/tickets/asset/checkout/resolved/?limit=10"

# Fetch resolved check-in tickets
curl -X GET "http://165.22.247.50:8002/api/tickets/asset/checkin/resolved/?limit=10"
```

#### Test AMS to TTS
```bash
# Mark single ticket as executed
curl -X POST "http://165.22.247.50:8002/api/tickets/asset/approve/" \
  -H "Content-Type: application/json" \
  -d '{
    "ticket_number": "TKT080",
    "ams_executed": true
  }'

# Bulk approve tickets
curl -X POST "http://165.22.247.50:8002/api/tickets/asset/approve/bulk/" \
  -H "Content-Type: application/json" \
  -d '{
    "ticket_numbers": ["TKT080", "TKT081"],
    "ams_executed": true
  }'
```

#### Test TTS to BMS
```bash
# Submit budget proposal (manual test)
curl -X POST "https://budget-pro.onrender.com/api/external-budget-proposals/" \
  -H "Content-Type: application/json" \
  -H "X-API-Key: tts-live-key-112233445" \
  -d '{
    "ticket_id": "TX20260112123456",
    "department_input": "IT",
    "title": "Test Budget Proposal",
    "project_summary": "Test",
    "project_description": "Testing integration",
    "submitted_by_name": "Test User",
    "fiscal_year": 4,
    "items": [{
      "cost_element": "Test Item",
      "description": "Test",
      "estimated_cost": 1000,
      "account": 4,
      "category_code": "OPEX"
    }]
  }'
```

### Monitoring and Troubleshooting

#### Check TTS Failed BMS Submissions
```sql
-- Query failed BMS submissions
SELECT 
    failed_bms_id,
    ticket_number,
    status,
    error_type,
    error_message,
    retry_count,
    next_retry_at,
    created_at
FROM task_failedBMSsubmission
WHERE status IN ('pending', 'failed')
ORDER BY created_at DESC;
```

#### Check TTS Asset Ticket Status
```sql
-- Query asset tickets and their execution status
SELECT 
    wt.ticket_number,
    wt.ticket_data->>'category' as category,
    wt.ticket_data->>'status' as ticket_status,
    t.ams_executed,
    t.status as task_status,
    t.updated_at
FROM tickets_workflowticket wt
LEFT JOIN task_task t ON t.ticket_id_id = wt.id
WHERE wt.ticket_data->>'category' IN ('Asset Check In', 'Asset Check Out')
ORDER BY wt.created_at DESC
LIMIT 50;
```

---

**Document End**

For questions or integration support:
- **Technical Support:** tech-support@company.com
- **Integration Team:** #system-integration (Slack)
- **API Documentation:** 
  - TTS: http://165.22.247.50:8002/api/docs/
  - BMS: https://budget-pro.onrender.com/api/docs/

Last reviewed: January 12, 2026
