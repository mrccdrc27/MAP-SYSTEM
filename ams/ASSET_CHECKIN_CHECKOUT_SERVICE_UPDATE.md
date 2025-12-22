# Asset Check-In/Check-Out Service Update

## ✅ Updated to Use Assets Service

Both CheckInAsset and CheckOutAsset pages now use the **Assets Service** for all operations.

---

## 🔧 Changes Made

### **1. CheckInAsset.jsx**

#### **Added Import:**
```javascript
import assetsService from "../../services/assets-service";
```

#### **Updated Context Fetching:**
**Before:**
```javascript
const [locations, setLocations] = useState([
  { id: 1, name: "Makati Office" },
  { id: 2, name: "Pasig Office" },
  // ... hardcoded locations
]);

useEffect(() => {
  const fetchStatuses = async () => {
    const response = await assetsService.fetchAssetContexts();
    setStatuses(response.statuses || []);
  };
  fetchStatuses();
}, []);
```

**After:**
```javascript
const [locations, setLocations] = useState([]);

useEffect(() => {
  const fetchContexts = async () => {
    setIsLoading(true);
    const response = await assetsService.fetchAssetContexts();
    setStatuses(response.statuses || []);
    setLocations(response.locations || []);  // ✅ Now fetched from API
    setIsLoading(false);
  };
  fetchContexts();
}, []);
```

#### **Updated Location Field:**
**Before:**
```javascript
<option key={location.id} value={location.name}>
  {location.name}
</option>
```

**After:**
```javascript
<option key={location.id} value={location.id}>
  {location.name}
</option>
```

**Reason:** Backend expects location ID, not name.

---

### **2. CheckOutAsset.jsx**

#### **Added Import:**
```javascript
import assetsService from "../../services/assets-service";
```

**Note:** This file was already using `assetsService.createAssetCheckout()` but was missing the import.

---

### **3. assets-service.js**

#### **Added New Function:**
```javascript
/* ===============================
          CONTEXTS PROXY
================================= */

// Fetch statuses and locations from contexts service via assets proxy
export async function fetchAssetContexts() {
  const [statusesRes, locationsRes] = await Promise.all([
    assetsAxios.get("contexts/statuses/"),
    assetsAxios.get("contexts/locations/")
  ]);
  
  return {
    statuses: statusesRes.data.results || statusesRes.data,
    locations: locationsRes.data.results || locationsRes.data
  };
}
```

**Features:**
- ✅ Fetches both statuses and locations in parallel
- ✅ Uses Assets Service proxy endpoints
- ✅ Handles both paginated and non-paginated responses

---

## 📊 Data Flow

### **Check-In Flow:**

```
CheckInAsset.jsx
    ↓
assetsService.fetchAssetContexts()
    ↓
Assets Service (Port 8002)
    ↓ (Proxy)
Contexts Service (Port 8003)
    ↓
Returns: { statuses: [...], locations: [...] }
```

### **Check-Out Flow:**

```
CheckOutAsset.jsx
    ↓
assetsService.createAssetCheckout(formData)
    ↓
Assets Service (Port 8002)
    ↓
POST /asset-checkout/
    ↓
Creates checkout record
```

---

## 🎯 API Endpoints Used

| Endpoint | Method | Purpose | Service |
|----------|--------|---------|---------|
| `/contexts/statuses/` | GET | Fetch statuses | Assets (proxy) |
| `/contexts/locations/` | GET | Fetch locations | Assets (proxy) |
| `/asset-checkout/` | POST | Create checkout | Assets |
| `/asset-checkin/` | POST | Create checkin | Assets |

---

## ✅ Benefits

1. **Centralized Service:** All asset operations go through Assets Service
2. **Dynamic Data:** Statuses and locations are fetched from Contexts Service
3. **No Hardcoded Data:** Removed hardcoded location list
4. **Consistent API:** Uses same service for all operations
5. **Proper Data Types:** Location field now sends ID instead of name

---

## 🧪 Testing

### **Test Check-In:**
1. Navigate to an asset
2. Click "Check-In" button
3. Verify statuses dropdown is populated from API
4. Verify locations dropdown is populated from API
5. Fill form and submit
6. Verify checkin is created successfully

### **Test Check-Out:**
1. Navigate to an asset
2. Click "Check-Out" button
3. Fill form and submit
4. Verify checkout is created successfully

---

## 📝 Summary

| Component | Before | After |
|-----------|--------|-------|
| **CheckInAsset** | Missing import, hardcoded locations | ✅ Uses assetsService, dynamic locations |
| **CheckOutAsset** | Missing import | ✅ Uses assetsService |
| **assets-service.js** | No context fetching | ✅ Added fetchAssetContexts() |
| **Location Field** | Sent name string | ✅ Sends ID integer |
| **Data Source** | Hardcoded | ✅ Contexts Service via Assets proxy |

**Both check-in and check-out now use the Assets Service for all operations!** 🎉

