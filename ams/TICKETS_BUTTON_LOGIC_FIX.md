# Tickets Page - Button Logic Fix

## ✅ Fixed Check-In/Check-Out Button Logic

Updated the logic for determining whether to show "Check-In" or "Check-Out" button based on the presence of `checkin_date` field (NOT based on `ticket_type`).

---

## 🔍 Problem

**Previous Logic (Incorrect):**
```javascript
const isCheckInOrOut =
  !ticket.is_resolved
    ? ticket.ticket_type === "checkin"  // ❌ Based on type
      ? "Check-In"
      : "Check-Out"
    : null;
```

**Issue:**
- Used `ticket_type` field to determine button type
- This doesn't match the actual business logic
- `ticket_type` is just a label, not the actual state

---

## ✅ Solution

**New Logic (Correct):**
```javascript
const isCheckInOrOut =
  !ticket.is_resolved
    ? ticket.checkin_date === null || ticket.checkin_date === undefined
      ? "Check-Out"  // If checkin_date is null → Checkout
      : "Check-In"   // If checkin_date has value → Checkin
    : null;
```

**Logic:**
- ✅ If `checkin_date` is **null** → Show **"Check-Out"** button
- ✅ If `checkin_date` has **value** → Show **"Check-In"** button
- ✅ If ticket is **resolved** → Show **no button** (null)

---

## 📊 How It Works

### Ticket States:

#### **1. Checkout Request (Unresolved)**
```json
{
  "ticket_number": "TKT001",
  "ticket_type": "checkout",
  "checkout_date": "2024-11-20",
  "return_date": "2024-12-20",
  "checkin_date": null,  // ← NULL = Checkout
  "asset_checkout": null,
  "is_resolved": false
}
```
**Result:** Shows **"Check-Out"** button ✅
**Reason:** `checkin_date` is `null`

---

#### **2. Checkin Request (Unresolved)**
```json
{
  "ticket_number": "TKT002",
  "ticket_type": "checkin",
  "checkout_date": null,
  "return_date": null,
  "checkin_date": "2024-11-18",  // ← Has value = Checkin
  "asset_checkout": 45,
  "is_resolved": false
}
```
**Result:** Shows **"Check-In"** button ✅
**Reason:** `checkin_date` has a value

---

#### **3. Resolved Ticket**
```json
{
  "ticket_number": "TKT050",
  "ticket_type": "checkout",
  "checkout_date": "2024-11-15",
  "return_date": "2024-12-15",
  "checkin_date": null,
  "is_resolved": true  // ← Resolved
}
```
**Result:** Shows **no button** ✅
**Reason:** `is_resolved` is `true`

---

## 🎯 Business Logic

### Checkout Workflow:
1. User creates a **checkout request** ticket
2. Ticket has: `checkout_date`, `return_date`
3. Ticket does NOT have: `checkin_date`
4. **Button shown:** "Check-Out"
5. When clicked → Navigate to check-out page
6. After checkout → Ticket is marked as resolved

### Checkin Workflow:
1. User creates a **checkin request** ticket
2. Ticket has: `checkin_date`, `asset_checkout` (reference to checkout)
3. Ticket does NOT have: `checkout_date`, `return_date`
4. **Button shown:** "Check-In"
5. When clicked → Navigate to check-in page
6. After checkin → Ticket is marked as resolved

---

## 📋 Complete Logic Flow

```javascript
// Step 1: Check if ticket is resolved
if (ticket.is_resolved) {
  return null; // No button for resolved tickets
}

// Step 2: Check if checkin_date exists
if (ticket.checkin_date) {
  return "Check-In"; // Show Check-In button
} else {
  return "Check-Out"; // Show Check-Out button
}
```

---

## 🔄 Data Mapping

| Field | Checkout Ticket | Checkin Ticket |
|-------|----------------|----------------|
| `ticket_type` | "checkout" | "checkin" |
| `checkout_date` | ✅ Has value | ❌ null |
| `return_date` | ✅ Has value | ❌ null |
| `checkin_date` | ❌ null | ✅ Has value |
| `asset_checkout` | ❌ null | ✅ Has value |
| **Button Shown** | "Check-Out" | "Check-In" |

---

## 🧪 Testing

### Test Case 1: Checkout Ticket (Unresolved)
```javascript
{
  checkin_date: null,
  is_resolved: false
}
// Expected: "Check-Out" button
```

### Test Case 2: Checkin Ticket (Unresolved)
```javascript
{
  checkin_date: "2024-11-18",
  is_resolved: false
}
// Expected: "Check-In" button
```

### Test Case 3: Resolved Ticket
```javascript
{
  checkin_date: null,
  is_resolved: true
}
// Expected: No button (null)
```

---

## 📝 Code Changes

### File 1: `frontend/src/pages/Tickets/Tickets.jsx`

**Before:**
```javascript
const isCheckInOrOut =
  !ticket.is_resolved
    ? ticket.ticket_type === "checkin"  // ❌ Based on type
      ? "Check-In"
      : "Check-Out"
    : null;
```

**After:**
```javascript
// Logic: If checkin_date is null, it's a Check-Out ticket, otherwise Check-In
const isCheckInOrOut =
  !ticket.is_resolved
    ? ticket.checkin_date === null || ticket.checkin_date === undefined
      ? "Check-Out"  // ✅ checkin_date is null → Checkout
      : "Check-In"   // ✅ checkin_date has value → Checkin
    : null;
```

---

### File 2: `backend/contexts/contexts_ms/management/commands/seed_tickets.py`

**Updated to create proper variations:**

**Changes:**
1. ✅ Changed from 60/40 split to 50/50 split (alternating)
2. ✅ Checkout tickets: `checkin_date=None`, `checkout_date` has value
3. ✅ Checkin tickets: `checkin_date` has value, `checkout_date=None`
4. ✅ Explicitly set null values for clarity

**Key Updates:**
```python
# Odd ticket numbers (TKT001, TKT003, etc.) = Checkout
# Even ticket numbers (TKT002, TKT004, etc.) = Checkin
is_checkout = i % 2 == 1

if is_checkout:
    ticket_data = {
        'checkin_date': None,  # ← NULL for checkout
        'asset_checkout': None,
        'checkout_date': checkout_date,
        'return_date': return_date,
        # ...
    }
else:
    ticket_data = {
        'checkin_date': checkin_date,  # ← Has value for checkin
        'asset_checkout': asset_checkout_id,
        'checkout_date': None,
        'return_date': None,
        # ...
    }
```

---

## ✅ Summary

| Aspect | Before | After |
|--------|--------|-------|
| **Logic Based On** | `ticket_type` field | `checkin_date` field |
| **Checkout Button** | When `ticket_type === "checkout"` | When `checkin_date` is **null** |
| **Checkin Button** | When `ticket_type === "checkin"` | When `checkin_date` has **value** |
| **Resolved Tickets** | No button | No button |
| **Seeder Split** | 60% checkout, 40% checkin | 50% checkout, 50% checkin (alternating) |
| **Data Consistency** | ❌ Inconsistent | ✅ Consistent (explicit nulls) |
| **Accuracy** | ❌ Incorrect | ✅ Correct |

---

## 🎯 Verification

**Sample tickets from database:**
```
TKT049: checkin_date=None,       checkout_date=2025-10-08, type=checkout → "Check-Out" ✅
TKT050: checkin_date=2025-11-10, checkout_date=None,       type=checkin  → "Check-In" ✅
TKT051: checkin_date=None,       checkout_date=2025-10-15, type=checkout → "Check-Out" ✅
TKT052: checkin_date=2025-10-01, checkout_date=None,       type=checkin  → "Check-In" ✅
```

**Pattern:**
- Odd tickets (TKT001, TKT003, TKT005...) = Checkout (checkin_date=null)
- Even tickets (TKT002, TKT004, TKT006...) = Checkin (checkin_date has value)

---

**The button logic now correctly reflects the actual ticket state based on `checkin_date` being null or not!** 🎉

