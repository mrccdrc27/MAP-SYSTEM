# AMS Approved Tickets Analysis

## Frontend URL Route

**URL:** `http://localhost:5173/approved-tickets`

## Architecture Overview

### Frontend Layer
- **Port:** 5173 (Vite development server)
- **Framework:** React with React Router
- **Component:** `Tickets.jsx` (located at `ams/frontend/src/pages/Tickets/Tickets.jsx`)

### API Endpoint Chain

```
Frontend (React)
    ↓
API Service Layer
    ↓
Backend Django Service (Contexts Microservice)
```

---

## Complete Channel/API Flow

### 1. **Frontend Route Definition**
**File:** [ams/frontend/src/App.jsx](ams/frontend/src/App.jsx#L310)
```jsx
<Route path="/approved-tickets" element={<Tickets />} />
```

**Component:** [ams/frontend/src/pages/Tickets/Tickets.jsx](ams/frontend/src/pages/Tickets/Tickets.jsx#L1)
- Handles display, filtering, pagination, and user interactions
- Shows unresolved tickets (check-in/check-out requests)

---

### 2. **API Service Layer**
**File:** [ams/frontend/src/services/integration-ticket-tracking-service.js](ams/frontend/src/services/integration-ticket-tracking-service.js#L1)

```javascript
import ticketTrackingAxios from "../api/integrationTicketTracking";

export async function fetchAllTickets() {
  const res = await ticketTrackingAxios.get("tickets/unresolved/");
  return res.data;
}
```

**Axios Instance:** [ams/frontend/src/api/integrationTicketTracking.js](ams/frontend/src/api/integrationTicketTracking.js)

```javascript
const ticketTrackingAxios = axios.create({
  baseURL: import.meta.env.VITE_INTEGRATION_TICKET_TRACKING_API_URL,
  timeout: 10000,
});
```

---

### 3. **Environment Configuration**
**File:** [ams/frontend/.env](ams/frontend/.env)

#### Option 1: Direct Service Access (Development Mode)
```dotenv
VITE_INTEGRATION_TICKET_TRACKING_API_URL=http://localhost:8003/
```
- Direct connection to Contexts service running on port 8003

#### Option 2: API Gateway Mode (Docker Compose)
```dotenv
VITE_API_GATEWAY_URL=http://localhost
VITE_INTEGRATION_TICKET_TRACKING_API_URL=http://localhost/api/contexts/
```
- Routes through Kong API Gateway (port 80)
- Kong strips the `/api/contexts/` prefix and forwards to the contexts service

---

### 4. **Backend API Endpoint**
**Service:** Contexts Microservice
**Port:** 8003
**Technology:** Django REST Framework (DRF)

**File:** [ams/backend/contexts/contexts_ms/views.py](ams/backend/contexts/contexts_ms/views.py#L299)

```python
class TicketViewSet(viewsets.ModelViewSet):
    
    @action(detail=False, methods=['get'])
    def unresolved(self, request):
        """GET /tickets/unresolved/"""
        tickets = self.queryset.filter(is_resolved=False)
        serializer = self.get_serializer(tickets, many=True)
        return Response(serializer.data)
```

**URL Registration:** [ams/backend/contexts/contexts_ms/urls.py](ams/backend/contexts/contexts_ms/urls.py#L27)

```python
router.register('tickets', TicketViewSet, basename='tickets')
```

This creates the endpoint: `GET /tickets/unresolved/`

---

### 5. **Backend Data Model**
**File:** [ams/backend/contexts/contexts_ms/models.py](ams/backend/contexts/contexts_ms/models.py#L129)

```python
class Ticket(models.Model):
    class TicketType(models.TextChoices):
        CHECKOUT = 'checkout', 'Checkout'
        CHECKIN = 'checkin', 'Checkin'

    ticket_number = models.CharField(max_length=6, unique=True)
    ticket_type = models.CharField(max_length=10, choices=TicketType.choices)
    employee = models.PositiveIntegerField()
    asset = models.PositiveIntegerField()
    subject = models.CharField(max_length=255)
    location = models.PositiveIntegerField()
    is_resolved = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    checkout_date = models.DateField(null=True, blank=True)
    return_date = models.DateField(null=True, blank=True)
    asset_checkout = models.PositiveIntegerField(null=True, blank=True)
    checkin_date = models.DateField(null=True, blank=True)
    asset_checkin = models.PositiveIntegerField(null=True, blank=True)
```

---

### 6. **Serializer**
**File:** [ams/backend/contexts/contexts_ms/serializer.py](ams/backend/contexts/contexts_ms/serializer.py#L374)

```python
class TicketSerializer(serializers.ModelSerializer):
    # Serializes Ticket model to JSON
    # Returns all ticket fields to the frontend
```

---

## Complete Request/Response Flow

### Request Path
```
1. User navigates to http://localhost:5173/approved-tickets
2. React Router loads Tickets.jsx component
3. Tickets.jsx calls fetchAllTickets()
4. fetchAllTickets() sends GET request via ticketTrackingAxios
5. Request URL: http://localhost:8003/tickets/unresolved/ (or via Kong gateway)
6. Backend Contexts service receives request at /tickets/unresolved/ endpoint
7. TicketViewSet.unresolved() action executes
8. Queries database for tickets where is_resolved=False
9. TicketSerializer serializes results to JSON
```

### Response Path
```
10. Backend returns JSON array of unresolved tickets
11. Frontend receives response data
12. Tickets.jsx processes and displays tickets in a table
13. User can view, filter, check-in/check-out, and manage tickets
```

---

## Service Providers Summary

### Who Provides What

| Component | Provider | Location |
|-----------|----------|----------|
| **Frontend UI** | React Application | `ams/frontend/` (Port 5173) |
| **Routing** | React Router | `ams/frontend/src/App.jsx` |
| **API Client** | Axios | `ams/frontend/src/api/integrationTicketTracking.js` |
| **API Endpoint** | Django REST Framework | `ams/backend/contexts/` (Port 8003) |
| **Database** | SQLite/PostgreSQL | Managed by Contexts service |
| **API Gateway** | Kong (optional) | `ams/kong/` (Port 80/8080) |

### Current Setup
- **Frontend:** AMS Frontend (Vite, React, port 5173)
- **Backend API:** Contexts Microservice (Django, port 8003)
- **Database:** Contexts service database (SQLite in dev, PostgreSQL in prod)
- **Optional Gateway:** Kong API Gateway (strips `/api/contexts/` prefix and routes to port 8003)

---

## Key API Details

| Detail | Value |
|--------|-------|
| **Endpoint** | `GET /tickets/unresolved/` |
| **Service** | Contexts Microservice |
| **Port** | 8003 |
| **Authentication** | JWT (via Authorization header or Kong) |
| **Response Format** | JSON array of Ticket objects |
| **Filtering** | is_resolved=False |
| **Related Data** | Employee names, asset info (fetched separately) |

---

## Related APIs Called by Tickets Component

The Tickets component also calls these APIs to enrich ticket data:

1. **Fetch Employee Details**
   - Service: Auth Service (authentication microservice)
   - Endpoint: `GET /api/v1/employees/{id}/`
   - Used to display: Employee name, department

2. **Fetch Asset Details**
   - Service: Assets Service (assets microservice)
   - Endpoint: `GET /api/assets/{id}/`
   - Used to display: Asset information in ticket rows

---

## Environment Configuration Reference

### Development Mode (Direct Services)
```
Port 5173: Frontend React App
Port 8000: Centralized Auth Service
Port 8002: Assets Microservice
Port 8003: Contexts Microservice (provides /tickets/unresolved/)
```

### Docker Compose Mode (Kong Gateway)
```
Port 80/8080: Kong API Gateway
Port 5173: Frontend React App
Port 8000: Auth Service (direct)
Port 8002: Assets Service
Port 8003: Contexts Service (internal only)
```

---

## Summary

**URL:** `http://localhost:5173/approved-tickets`

**Channel:** 
- Frontend renders React component `Tickets.jsx`
- Makes API call to `GET /tickets/unresolved/`
- Via `ticketTrackingAxios` (axios instance)

**API:**
- HTTP GET endpoint: `/tickets/unresolved/`
- Service: **Contexts Microservice** (AMS)
- Port: **8003** (direct) or **80** (via Kong)

**Who Provides It:**
- **Frontend:** AMS Frontend (React/Vite)
- **Backend:** Contexts Django Microservice
- **Gateway (optional):** Kong API Gateway
- **Database:** Contexts service database

The "approved tickets" page displays unresolved tickets (check-in and check-out requests) for asset management workflow within the AMS system.
