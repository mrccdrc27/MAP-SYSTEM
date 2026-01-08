# /tickets/resolved/ API Response Shape & Sample JSON

## API Endpoint Overview

**Endpoint:** `GET /tickets/resolved/`  
**Service:** Contexts Microservice (AMS Backend)  
**Port:** 8003 (or through Kong gateway)  
**Response Type:** JSON Array of Ticket Objects

---

## Response Shape

The `/tickets/resolved/` endpoint returns a JSON array where each ticket object has the following structure:

```typescript
interface TicketResponse {
  // Core ticket info
  id: number;
  ticket_number: string;  // e.g., "000001"
  ticket_type: string;    // "checkout" | "checkin"
  subject: string;
  
  // Relations (IDs, NOT populated objects)
  employee: number;       // Employee ID
  asset: number;          // Asset ID
  location: number;       // Location ID
  
  // Dates
  created_at: string;     // ISO 8601 timestamp
  updated_at: string;     // ISO 8601 timestamp
  
  // Status
  is_resolved: boolean;   // Always true for /resolved/ endpoint
  
  // Checkout-specific fields (can be null for checkin tickets)
  checkout_date: string | null;    // ISO date (YYYY-MM-DD)
  return_date: string | null;      // ISO date (YYYY-MM-DD)
  asset_checkout: number | null;   // Checkout record ID
  
  // Checkin-specific fields (can be null for checkout tickets)
  checkin_date: string | null;     // ISO date (YYYY-MM-DD)
  asset_checkin: number | null;    // Checkin record ID
  
  // Enriched data (from serializer methods)
  location_details: LocationDetails | {warning: string} | null;
  requestor_details: RequestorDetails | {warning: string} | null;
}

interface LocationDetails {
  id: number;
  city: string;
  state: string;
  zip_code: string;
  // ... other location fields from Help Desk service
}

interface RequestorDetails {
  id: number;
  name: string;
  firstname: string;
  lastname: string;
}
```

---

## Sample JSON Response

### Single Resolved Checkout Ticket (Checked In)

```json
{
  "id": 4,
  "ticket_number": "000004",
  "ticket_type": "checkout",
  "subject": "Battery not charging",
  "employee": 104,
  "asset": 4,
  "location": 2,
  "is_resolved": true,
  "created_at": "2024-01-10T09:00:00Z",
  "updated_at": "2024-01-14T15:30:00Z",
  "checkout_date": "2024-01-10",
  "return_date": "2024-01-15",
  "asset_checkout": 12,
  "checkin_date": null,
  "asset_checkin": null,
  "location_details": {
    "id": 2,
    "city": "Pasig",
    "state": "NCR",
    "zip_code": "1600",
    "country": "Philippines"
  },
  "requestor_details": {
    "id": 104,
    "name": "Sarah Wilson",
    "firstname": "Sarah",
    "lastname": "Wilson"
  }
}
```

### Array of Multiple Resolved Tickets (Complete /tickets/resolved/ Response)

```json
[
  {
    "id": 4,
    "ticket_number": "000004",
    "ticket_type": "checkout",
    "subject": "Battery not charging",
    "employee": 104,
    "asset": 4,
    "location": 2,
    "is_resolved": true,
    "created_at": "2024-01-10T09:00:00Z",
    "updated_at": "2024-01-14T15:30:00Z",
    "checkout_date": "2024-01-10",
    "return_date": "2024-01-15",
    "asset_checkout": 12,
    "checkin_date": null,
    "asset_checkin": null,
    "location_details": {
      "id": 2,
      "city": "Pasig",
      "state": "NCR",
      "zip_code": "1600",
      "country": "Philippines"
    },
    "requestor_details": {
      "id": 104,
      "name": "Sarah Wilson",
      "firstname": "Sarah",
      "lastname": "Wilson"
    }
  },
  {
    "id": 6,
    "ticket_number": "000006",
    "ticket_type": "checkin",
    "subject": "Return checked-out laptop",
    "employee": 105,
    "asset": 5,
    "location": 3,
    "is_resolved": true,
    "created_at": "2024-01-12T10:30:00Z",
    "updated_at": "2024-01-16T14:45:00Z",
    "checkout_date": null,
    "return_date": null,
    "asset_checkout": 11,
    "checkin_date": "2024-01-16",
    "asset_checkin": 8,
    "location_details": {
      "id": 3,
      "city": "Makati",
      "state": "NCR",
      "zip_code": "1200",
      "country": "Philippines"
    },
    "requestor_details": {
      "id": 105,
      "name": "Michael Brown",
      "firstname": "Michael",
      "lastname": "Brown"
    }
  },
  {
    "id": 8,
    "ticket_number": "000008",
    "ticket_type": "checkout",
    "subject": "Request keyboard replacement",
    "employee": 102,
    "asset": 2,
    "location": 1,
    "is_resolved": true,
    "created_at": "2024-01-14T13:00:00Z",
    "updated_at": "2024-01-17T11:20:00Z",
    "checkout_date": "2024-01-14",
    "return_date": "2024-01-18",
    "asset_checkout": 15,
    "checkin_date": null,
    "asset_checkin": null,
    "location_details": {
      "id": 1,
      "city": "Manila",
      "state": "NCR",
      "zip_code": "1010",
      "country": "Philippines"
    },
    "requestor_details": {
      "id": 102,
      "name": "Maria Garcia",
      "firstname": "Maria",
      "lastname": "Garcia"
    }
  }
]
```

---

## Key Differences: /tickets/resolved/ vs /tickets/unresolved/

| Field | Unresolved | Resolved |
|-------|-----------|----------|
| `is_resolved` | Always `false` | Always `true` |
| `checkin_date` | Usually `null` | Can be populated if asset was checked in |
| `asset_checkin` | Usually `null` | Can be populated if asset was checked in |
| Filter | `filter(is_resolved=False)` | `filter(is_resolved=True)` |

---

## What Frontend Expects

Based on the current code and mock data, the frontend expects:

### 1. **Field Types**
- **IDs (employee, asset, location, asset_checkout, asset_checkin):** Numbers/Integers
- **Dates (checkout_date, return_date, checkin_date):** ISO date strings (YYYY-MM-DD)
- **Timestamps (created_at, updated_at):** ISO 8601 datetime strings
- **Booleans (is_resolved):** true/false
- **Strings:** ticket_number, ticket_type, subject

### 2. **Optional/Nullable Fields**
The following fields can be `null`:
- `checkout_date` (null for checkin tickets)
- `return_date` (null for checkin tickets)
- `asset_checkout` (null for checkin tickets)
- `checkin_date` (null for checkout tickets)
- `asset_checkin` (null for checkout tickets)
- `location_details` (if Help Desk service is unreachable)
- `requestor_details` (if Help Desk service is unreachable)

### 3. **Enriched Data**
The serializer automatically enriches the response with:
- **location_details:** Fetched from Help Desk service using the `location` ID
- **requestor_details:** Fetched from Help Desk service using the `employee` ID
  - If service is unreachable, returns: `{"warning": "Help Desk service unreachable for [locations|employees]."}`

### 4. **Data Structure**
- Response is always an **array** (even if empty)
- Each item is a complete ticket object with all fields
- No pagination in the basic endpoint (full list returned)

---

## Usage in Frontend

Currently, the frontend **DOES NOT** call `/tickets/resolved/`, only `/tickets/unresolved/`:

```javascript
// Current implementation in integration-ticket-tracking-service.js
export async function fetchAllTickets() {
  const res = await ticketTrackingAxios.get("tickets/unresolved/");
  return res.data;
}
```

To fetch resolved tickets, you would call:

```javascript
export async function fetchResolvedTickets() {
  const res = await ticketTrackingAxios.get("tickets/resolved/");
  return res.data;
}
```

---

## Field Mapping Reference

| Backend Model Field | Serializer Field | Frontend Use | Type |
|-------------------|------------------|-------------|------|
| `id` | `id` | Unique identifier | Integer |
| `ticket_number` | `ticket_number` | Display in table | String |
| `ticket_type` | `ticket_type` | Determine if checkout/checkin | String |
| `subject` | `subject` | Display subject line | String |
| `employee` | `employee` | ID reference | Integer |
| `asset` | `asset` | ID reference | Integer |
| `location` | `location` | ID reference | Integer |
| `is_resolved` | `is_resolved` | Filter/Status badge | Boolean |
| `created_at` | `created_at` | Display creation date | ISO Datetime |
| `updated_at` | `updated_at` | Track updates | ISO Datetime |
| `checkout_date` | `checkout_date` | Display for checkout tickets | ISO Date |
| `return_date` | `return_date` | Display expected return | ISO Date |
| `asset_checkout` | `asset_checkout` | Reference checkout record | Integer |
| `checkin_date` | `checkin_date` | Display for checkin tickets | ISO Date |
| `asset_checkin` | `asset_checkin` | Reference checkin record | Integer |
| N/A (method) | `location_details` | Display city/location info | Object |
| N/A (method) | `requestor_details` | Display employee name | Object |

---

## Validation Notes

The backend validates tickets based on their type:

### Checkout Ticket Requirements
- Must have: `checkout_date`, `return_date`
- Must NOT have: `checkin_date`, `return_date`
- Can have: `asset_checkout` (filled when resolved)

### Checkin Ticket Requirements
- Must have: `asset_checkout`, `checkin_date`
- Must NOT have: `checkout_date`, `return_date`
- Can have: `asset_checkin` (filled when resolved)

---

## Error Handling

If Help Desk service is unreachable:
- `location_details` returns: `{"warning": "Help Desk service unreachable for locations."}`
- `requestor_details` returns: `{"warning": "Help Desk service unreachable for employees."}`
- Ticket creation/update is NOT blocked

---

## HTTP Status Codes

| Code | Meaning |
|------|---------|
| `200` | Success - returns array of resolved tickets |
| `400` | Bad request - invalid query parameters |
| `401` | Unauthorized - missing/invalid JWT token |
| `500` | Server error - database or service error |
