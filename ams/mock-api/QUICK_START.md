# AMS Mock API - Quick Start Guide

## 3-Minute Setup

### Step 1: Install Dependencies
```bash
cd ams/mock-api
npm install
```

### Step 2: Start Mock API Server
```bash
npm start
```

You should see:
```
╔════════════════════════════════════════════╗
║     AMS Mock API Server - Running          ║
╚════════════════════════════════════════════╝

📍 Server listening on: http://localhost:8010
```

### Step 3: Configure Frontend
Update `ams/frontend/.env`:
```dotenv
VITE_INTEGRATION_TICKET_TRACKING_API_URL=http://localhost:8010/
```

### Step 4: Start Frontend
```bash
cd ams/frontend
npm run dev
```

Navigate to `http://localhost:5173/approved-tickets` and you should see mock tickets!

---

## Testing the API Manually

### Check Server Health
```bash
curl http://localhost:8003/health
```

### Fetch Unresolved Tickets
```bash
curl http://localhost:8003/tickets/unresolved
```

### Fetch Resolved Tickets
```bash
curl http://localhost:8003/tickets/resolved
```

### Get Single Ticket
```bash
curl http://localhost:8003/tickets/1
```

### Get Ticket by Asset
```bash
curl http://localhost:8003/tickets/by-asset/1
```

### Create a New Ticket
```bash
curl -X POST http://localhost:8003/tickets \
  -H "Content-Type: application/json" \
  -d '{
    "ticket_type": "checkout",
    "subject": "New laptop needed",
    "employee": 101,
    "asset": 10,
    "location": 1,
    "checkout_date": "2024-01-18",
    "return_date": "2024-01-25"
  }'
```

### Resolve a Ticket
```bash
curl -X PATCH http://localhost:8003/tickets/1/resolve
```

---

## Architecture Flow

```
Frontend (React)
    ↓
    ├─ http://localhost:5173 (Vite dev server)
    └─ Makes request to...
        ↓
API Service Layer
    ↓
    ├─ axiosInstance.get('tickets/unresolved/')
    └─ Makes request to...
        ↓
Mock API Server
    ↓
    ├─ Express on http://localhost:8003
    ├─ CORS enabled
    ├─ Returns JSON with mock data
    └─ Simulates realistic network delays
        ↓
Frontend (React)
    ↓
    └─ Displays tickets in Tickets.jsx component
```

---

## Mock Data Overview

### Unresolved Tickets (3)
```json
[
  { "id": 1, "ticket_number": "000001", "is_resolved": false, ... },
  { "id": 2, "ticket_number": "000002", "is_resolved": false, ... },
  { "id": 3, "ticket_number": "000003", "is_resolved": false, ... }
]
```

### Resolved Tickets (4)
```json
[
  { "id": 4, "ticket_number": "000004", "is_resolved": true, ... },
  { "id": 5, "ticket_number": "000005", "is_resolved": true, ... },
  { "id": 6, "ticket_number": "000006", "is_resolved": true, ... },
  { "id": 7, "ticket_number": "000007", "is_resolved": true, ... }
]
```

---

## Features of Mock API

✅ **Realistic Response Structure**
- Matches exact Django backend format
- Includes location_details and requestor_details
- Proper field types (dates, integers, booleans)

✅ **Network Simulation**
- 200-300ms for GET requests
- 400ms for PATCH requests  
- 500ms for POST requests
- Tests loading states in frontend

✅ **CORS Enabled**
- Frontend can make requests without issues
- No cross-origin blocking

✅ **Comprehensive Endpoints**
- All ticket operations supported
- Filter by status, asset, and ID
- Create, read, update operations

✅ **Development-Friendly**
- Detailed console logging
- Clear error messages
- Health check endpoint
- Statistics endpoint

---

## Switching to Real Backend

When you're ready to use the Django backend:

1. **Update Frontend .env:**
```dotenv
VITE_INTEGRATION_TICKET_TRACKING_API_URL=http://localhost:8003/
```
(Point to Django service URL instead)

2. **Stop Mock API Server:**
```bash
Ctrl+C in the terminal running npm start
```

3. **Start Django Services:**
```bash
cd ams/backend/contexts
python manage.py runserver 0.0.0.0:8003
```

4. **Frontend doesn't change!**
- All code remains the same
- API contract is identical
- Zero modifications needed

---

## Troubleshooting

### Port 8003 Already in Use?
```bash
PORT=8004 npm start
```
Then update `.env`:
```dotenv
VITE_INTEGRATION_TICKET_TRACKING_API_URL=http://localhost:8004/
```

### CORS Errors?
Make sure:
1. Mock API is running
2. Frontend .env has correct URL
3. Frontend is on `localhost:5173`

### No Data Showing?
1. Check browser console for errors (DevTools → Console)
2. Check network tab to see API response
3. Verify server is running: `curl http://localhost:8003/health`

### Changes Not Persisting?
Mock API stores data in memory. Restart the server to reset:
```bash
Ctrl+C
npm start
```

---

## File Structure

```
ams/mock-api/
├── server.js          ← Main Express server
├── package.json       ← Dependencies & scripts
├── README.md          ← Full documentation
├── setup.sh           ← Linux/Mac setup script
├── setup.bat          ← Windows setup script
├── .gitignore         ← Git ignore rules
└── QUICK_START.md     ← This file
```

---

## Key Endpoints Summary

| Method | Endpoint | Purpose |
|--------|----------|---------|
| GET | `/health` | Check server status |
| GET | `/stats` | View API statistics |
| GET | `/tickets/unresolved` | List unresolved tickets |
| GET | `/tickets/resolved` | List resolved tickets |
| GET | `/tickets/:id` | Get single ticket |
| GET | `/tickets/by-asset/:id` | Get ticket by asset |
| POST | `/tickets` | Create new ticket |
| PATCH | `/tickets/:id/resolve` | Mark as resolved |

---

## Next Steps

1. ✅ Start mock API: `npm start` (from `ams/mock-api`)
2. ✅ Update frontend .env
3. ✅ Start frontend: `npm run dev` (from `ams/frontend`)
4. ✅ Visit http://localhost:5173/approved-tickets
5. ✅ See mock tickets displayed!

Enjoy! 🎉
