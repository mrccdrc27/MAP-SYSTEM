# Tickets Page - API Integration Update

## ✅ Changes Made

Updated the Tickets page (`frontend/src/pages/Tickets/Tickets.jsx`) to fetch tickets from the **Contexts Service API** using `fetchAllTickets()` instead of using mock data.

---

## 📝 Summary of Changes

### 1. **Removed Mock Data Import**
```diff
- import TicketsMockupData from "../../data/mockData/tickets/tickets-mockup-data.json";
```

### 2. **Added Loading State**
```javascript
const [isLoading, setIsLoading] = useState(true);
```

### 3. **Updated `loadTickets` Function**

**Before (Mock Data):**
```javascript
const loadTickets = () => {
  try {
    const mappedTickets = TicketsMockupData.map((ticket) => {
      // ... mapping logic
    });
    setTicketItems(mappedTickets);
    setFilteredData(mappedTickets);
  } catch (error) {
    console.error("Error loading tickets:", error);
  }
};
```

**After (API Call):**
```javascript
const loadTickets = async () => {
  try {
    setIsLoading(true);
    setErrorMessage("");
    
    // Fetch tickets from API
    const response = await fetchAllTickets();
    
    // Handle paginated response
    const ticketsData = response.results || response;
    
    // Map API response to component format
    const mappedTickets = ticketsData.map((ticket) => {
      // ... mapping logic
    });
    
    setTicketItems(mappedTickets);
    setFilteredData(mappedTickets);
  } catch (error) {
    console.error("Error loading tickets:", error);
    setErrorMessage("Failed to load tickets from server.");
  } finally {
    setIsLoading(false);
  }
};
```

### 4. **Updated Data Mapping**

Maps API response fields to component format:

| API Field | Component Field | Notes |
|-----------|----------------|-------|
| `ticket_number` | `id` | Ticket identifier (TKT001, TKT002, etc.) |
| `asset` | `assetId` | Asset ID (integer) |
| `employee` | `requestor` | Employee name |
| `location` | `requestorLocation` | Office location |
| `subject` | `subject` | Ticket subject |
| `checkout_date` | `checkoutDate` | Checkout date (for checkout tickets) |
| `return_date` | `returnDate` | Expected return date |
| `checkin_date` | `checkinDate` | Check-in date (for checkin tickets) |
| `asset_checkout` | `assetCheckout` | Reference to checkout record |
| `is_resolved` | `isResolved` | Ticket resolution status |
| `ticket_type` | `ticketType` | "checkout" or "checkin" |

### 5. **Added Loading Indicator**

```javascript
{isLoading ? (
  <tr>
    <td colSpan={8} className="no-data-message">
      Loading tickets...
    </td>
  </tr>
) : paginatedTickets.length > 0 ? (
  // ... render tickets
) : (
  <tr>
    <td colSpan={8} className="no-data-message">
      No tickets found.
    </td>
  </tr>
)}
```

---

## 🔄 Data Flow

```
┌─────────────────────┐
│  Tickets.jsx        │
│  (Frontend)         │
└──────────┬──────────┘
           │
           │ fetchAllTickets()
           ▼
┌─────────────────────┐
│ contexts-service.js │
│ (API Service)       │
└──────────┬──────────┘
           │
           │ GET /tickets/
           ▼
┌─────────────────────┐
│ Contexts Service    │
│ (Backend API)       │
│ Port 8003           │
└──────────┬──────────┘
           │
           │ Query Database
           ▼
┌─────────────────────┐
│ Contexts Database   │
│ (PostgreSQL)        │
└─────────────────────┘
```

---

## 📊 API Response Format

### Expected Response from `fetchAllTickets()`:

```json
{
  "results": [
    {
      "ticket_number": "TKT001",
      "ticket_type": "checkout",
      "employee": "John Smith",
      "asset": 15,
      "subject": "Laptop needed for remote work",
      "location": "Makati Office",
      "is_resolved": false,
      "checkout_date": "2024-11-20",
      "return_date": "2024-12-20",
      "asset_checkout": null,
      "checkin_date": null,
      "created_at": "2024-11-15T10:30:00Z",
      "updated_at": "2024-11-15T10:30:00Z"
    },
    {
      "ticket_number": "TKT002",
      "ticket_type": "checkin",
      "employee": "Maria Garcia",
      "asset": 8,
      "subject": "Returning laptop after project completion",
      "location": "Pasig Office",
      "is_resolved": true,
      "checkout_date": null,
      "return_date": null,
      "asset_checkout": 45,
      "checkin_date": "2024-11-18",
      "created_at": "2024-11-10T14:20:00Z",
      "updated_at": "2024-11-18T09:15:00Z"
    }
  ],
  "count": 100
}
```

---

## 🎯 Features Maintained

All existing features continue to work:

✅ **Search** - Search by ticket number, subject, requestor, or asset name
✅ **Filtering** - Filter by ticket number, asset, requestor, subject, location, check-in/out
✅ **Pagination** - Page through tickets with configurable page size
✅ **Selection** - Select individual or all tickets for bulk operations
✅ **Delete** - Delete single or multiple tickets
✅ **View** - Navigate to ticket detail page
✅ **Check-In/Out Actions** - Navigate to check-in or check-out pages from tickets
✅ **Export** - Export tickets as Excel, PDF, or CSV (UI ready)

---

## 🔧 Configuration

The API endpoint is configured in `frontend/src/api/contextsAxios.js`:

```javascript
const contextsAxios = axios.create({
  baseURL: import.meta.env.VITE_CONTEXTS_API_URL,
  timeout: 10000,
});
```

**Environment Variable:**
```env
VITE_CONTEXTS_API_URL=http://localhost:8003/
```

---

## 🧪 Testing

To test the integration:

1. **Start the Contexts service:**
   ```bash
   docker exec -it contexts-dev python manage.py runserver 0.0.0.0:8003
   ```

2. **Seed tickets (optional):**
   ```bash
   docker exec -it contexts-dev python manage.py seed_tickets --clear
   ```

3. **Start the frontend:**
   ```bash
   cd frontend
   npm run dev
   ```

4. **Navigate to Tickets page:**
   ```
   http://localhost:8000/tickets
   ```

---

## 📌 Notes

1. **Asset Names**: Currently displays `Asset #<id>` since the API only returns asset IDs. To show actual asset names, you would need to:
   - Fetch asset details from the Assets service
   - Or have the Contexts service include asset details in the response

2. **Employee IDs**: Using employee name as ID since the API doesn't return a separate employee ID field

3. **Ticket Type Logic**: 
   - Checkout tickets: `ticket_type === "checkout"`
   - Checkin tickets: `ticket_type === "checkin"`
   - Shows action button only if ticket is not resolved

4. **Error Handling**: Shows user-friendly error message if API call fails

---

## ✅ Result

The Tickets page now fetches real data from the Contexts Service API instead of using mock data! 🎉

