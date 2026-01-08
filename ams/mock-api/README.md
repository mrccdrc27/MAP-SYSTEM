# AMS Mock API Server

A lightweight Node.js/Express mock API server for the AMS Ticket Tracking System. Perfect for frontend development without needing the full Django backend.

## Features

- ✅ Fully functional mock API endpoints
- ✅ CORS enabled for frontend access
- ✅ Realistic mock data with location and requestor details
- ✅ Network delay simulation (realistic responses)
- ✅ Support for both resolved and unresolved tickets
- ✅ Ticket filtering by asset, status, and ID
- ✅ Create, retrieve, and resolve tickets
- ✅ Comprehensive logging
- ✅ Statistics and health check endpoints

## Quick Start

### 1. Install Dependencies

```bash
cd ams/mock-api
npm install
```

### 2. Start the Server

**Production Mode:**
```bash
npm start
```

**Development Mode (with auto-reload):**
```bash
npm run dev
```

Server will start on `http://localhost:8010`

### 3. Configure Frontend

Update `ams/frontend/.env`:

```dotenv
VITE_INTEGRATION_TICKET_TRACKING_API_URL=http://localhost:8010/
```

## API Endpoints

### Health & Status

#### `GET /health`
Check server status.

**Response:**
```json
{
  "status": "ok",
  "service": "AMS Mock API Server",
  "timestamp": "2024-01-18T10:30:00.000Z"
}
```

#### `GET /stats`
Get API statistics and list all endpoints.

**Response:**
```json
{
  "unresolved_count": 3,
  "resolved_count": 4,
  "total_count": 7,
  "endpoints": [...]
}
```

---

### Tickets

#### `GET /tickets/unresolved`
Fetch all unresolved tickets.

**Query Parameters:**
- `include_details` (default: `true`) - Include enriched location/requestor details
- `limit` (optional) - Maximum number of results

**Example:**
```bash
curl http://localhost:8003/tickets/unresolved
curl http://localhost:8003/tickets/unresolved?limit=2
curl http://localhost:8003/tickets/unresolved?include_details=false
```

**Response:**
```json
[
  {
    "id": 1,
    "ticket_number": "000001",
    "ticket_type": "checkout",
    "subject": "Laptop screen flickering issue",
    "employee": 101,
    "asset": 1,
    "location": 1,
    "is_resolved": false,
    "created_at": "2024-01-15T09:00:00Z",
    "updated_at": "2024-01-15T08:30:00Z",
    "checkout_date": "2024-01-15",
    "return_date": "2024-01-20",
    "asset_checkout": 10,
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
      "id": 101,
      "name": "John Smith",
      "firstname": "John",
      "lastname": "Smith"
    }
  },
  ...
]
```

---

#### `GET /tickets/resolved`
Fetch all resolved tickets.

**Query Parameters:**
- `include_details` (default: `true`) - Include enriched location/requestor details
- `limit` (optional) - Maximum number of results

**Example:**
```bash
curl http://localhost:8003/tickets/resolved
curl http://localhost:8003/tickets/resolved?limit=2
```

**Response:**
Same structure as `/tickets/unresolved`, but with `is_resolved: true`

---

#### `GET /tickets/:id`
Fetch a single ticket by ID.

**Parameters:**
- `id` (required) - Ticket ID

**Example:**
```bash
curl http://localhost:8003/tickets/1
```

**Response:**
```json
{
  "id": 1,
  "ticket_number": "000001",
  ...
}
```

**Status Codes:**
- `200` - Success
- `404` - Ticket not found

---

#### `GET /tickets/by-asset/:asset_id`
Fetch ticket for a specific asset.

**Parameters:**
- `asset_id` (required) - Asset ID

**Query Parameters:**
- `status` (optional) - Filter by `resolved` or `unresolved`

**Example:**
```bash
curl http://localhost:8003/tickets/by-asset/1
curl http://localhost:8003/tickets/by-asset/1?status=resolved
curl http://localhost:8003/tickets/by-asset/1?status=unresolved
```

**Response:**
```json
{
  "id": 4,
  "ticket_number": "000004",
  ...
}
```

**Status Codes:**
- `200` - Success
- `404` - No ticket found for asset

---

#### `POST /tickets`
Create a new ticket.

**Request Body:**
```json
{
  "ticket_type": "checkout",
  "subject": "Laptop repair",
  "employee": 101,
  "asset": 5,
  "location": 1,
  "checkout_date": "2024-01-18",
  "return_date": "2024-01-25"
}
```

**Required Fields:**
- `ticket_type` - `"checkout"` or `"checkin"`
- `subject` - Brief description
- `employee` - Employee ID
- `asset` - Asset ID
- `location` - Location ID

**Optional Fields (for checkout):**
- `checkout_date` - ISO date string
- `return_date` - ISO date string

**Example:**
```bash
curl -X POST http://localhost:8003/tickets \
  -H "Content-Type: application/json" \
  -d '{
    "ticket_type": "checkout",
    "subject": "Monitor replacement",
    "employee": 101,
    "asset": 6,
    "location": 1,
    "checkout_date": "2024-01-18",
    "return_date": "2024-01-25"
  }'
```

**Response:**
```json
{
  "id": 8,
  "ticket_number": "000008",
  "ticket_type": "checkout",
  ...
}
```

**Status Codes:**
- `201` - Created successfully
- `400` - Missing required fields

---

#### `PATCH /tickets/:id/resolve`
Mark a ticket as resolved.

**Parameters:**
- `id` (required) - Ticket ID

**Example:**
```bash
curl -X PATCH http://localhost:8003/tickets/1/resolve
```

**Response:**
```json
{
  "id": 1,
  "ticket_number": "000001",
  "is_resolved": true,
  ...
}
```

**Status Codes:**
- `200` - Successfully resolved
- `404` - Ticket not found or already resolved

---

## Mock Data

The server comes with pre-populated mock data:

### Unresolved Tickets (3)
- `000001` - John Smith (Manila) - Checkout
- `000002` - Maria Garcia (Pasig) - Checkout
- `000003` - Robert Johnson (Makati) - Checkout

### Resolved Tickets (4)
- `000004` - Sarah Wilson (Pasig) - Checkout
- `000005` - Michael Brown (Makati) - Checkin
- `000006` - John Smith (Manila) - Checkout
- `000007` - Maria Garcia (Pasig) - Checkin

## Frontend Integration

### 1. Update Environment File

**File:** `ams/frontend/.env`

```dotenv
VITE_INTEGRATION_TICKET_TRACKING_API_URL=http://localhost:8003/
```

### 2. Use Existing API Service

The frontend already has a service layer configured. Just ensure it points to the mock API:

**File:** `ams/frontend/src/api/integrationTicketTracking.js`
```javascript
const ticketTrackingAxios = axios.create({
  baseURL: import.meta.env.VITE_INTEGRATION_TICKET_TRACKING_API_URL,
  timeout: 10000,
});
```

### 3. Call API from Frontend

**File:** `ams/frontend/src/services/integration-ticket-tracking-service.js`

```javascript
import ticketTrackingAxios from "../api/integrationTicketTracking";

export async function fetchAllTickets() {
  const res = await ticketTrackingAxios.get("tickets/unresolved/");
  return res.data;
}

export async function fetchResolvedTickets() {
  const res = await ticketTrackingAxios.get("tickets/resolved/");
  return res.data;
}
```

## Features & Behavior

### Network Delay Simulation
Each endpoint includes a realistic delay:
- `GET` requests: 200-300ms
- `PATCH` requests: 400ms
- `POST` requests: 500ms

This helps test loading states and user feedback in the frontend.

### CORS Support
The server enables CORS for all origins, allowing the frontend to make requests without issues.

### Data Persistence
**Note:** Mock data is stored in memory. Changes are only persistent during the current server session. Restarting the server resets all data.

To persist changes, you would need to add file storage or a database (future enhancement).

### Logging
All requests are logged to the console:
```
✓ GET /tickets/unresolved - returned 3 tickets
✓ PATCH /tickets/1/resolve - ticket resolved
✗ 404 - GET /invalid-endpoint
```

## Troubleshooting

### Port Already in Use

If port 8003 is already in use, specify a different port:

```bash
PORT=8004 npm start
```

Then update your frontend `.env`:
```dotenv
VITE_INTEGRATION_TICKET_TRACKING_API_URL=http://localhost:8004/
```

### CORS Errors

Make sure the mock API server is running and the frontend is configured to use the correct base URL.

### No Response from Server

1. Check if server is running: `curl http://localhost:8003/health`
2. Check console logs for errors
3. Ensure port 8003 is not blocked by firewall

## Development Tips

1. **Add More Mock Data:** Edit the `mockTickets` object in `server.js`
2. **Change Network Delay:** Modify the `delay()` function calls
3. **Test Different Scenarios:** Use different limit values or status filters
4. **Monitor Frontend Calls:** Watch the console logs to see what the frontend is requesting

## Next Steps

When you're ready to switch to the real Django backend:

1. Update the `.env` file to point to the Django service URL
2. The frontend code doesn't need to change (same API contract)
3. All existing frontend logic will work with the real backend

## Files

- `server.js` - Main Express server with all endpoints
- `package.json` - Dependencies and scripts
- `README.md` - This file

## License

ISC
