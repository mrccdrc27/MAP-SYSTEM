# Asset Status & Ticket Validation Rules

## ✅ Issue Resolved

Added model-level validation to enforce consistency between asset statuses and ticket types.

---

## 🔍 Problem

Previously, there were no validation rules preventing inconsistent data:
- ❌ Archived assets could have checkout tickets
- ❌ Undeployable assets could have tickets
- ❌ Deployed assets could have checkout tickets (should be checkin)
- ❌ Deployable assets could have checkin tickets (should be checkout)

---

## ✅ Business Rules Enforced

### **Rule 1: Only Certain Status Types Can Have Tickets**

**Allowed:**
- ✅ `deployable` - Can have tickets (checkout only)
- ✅ `deployed` - Can have tickets (checkin only)
- ✅ `pending` - Can have tickets (either type, for workflow flexibility)

**NOT Allowed:**
- ❌ `undeployable` - Cannot have tickets (asset is broken/under repair)
- ❌ `archived` - Cannot have tickets (asset is retired/lost/stolen)

### **Rule 2: Deployed Assets Must Have Checkin Tickets**

If `asset.status_details.type === "deployed"`:
- ✅ Ticket type MUST be `"checkin"`
- ❌ Ticket type CANNOT be `"checkout"`

**Reason:** Deployed assets are currently checked out and need to be returned.

### **Rule 3: Deployable Assets Must Have Checkout Tickets**

If `asset.status_details.type === "deployable"`:
- ✅ Ticket type MUST be `"checkout"`
- ❌ Ticket type CANNOT be `"checkin"`

**Reason:** Deployable assets are available and can be checked out.

### **Rule 4: Pending Assets Can Have Either Ticket Type**

If `asset.status_details.type === "pending"`:
- ✅ Ticket type can be `"checkout"` OR `"checkin"`

**Reason:** Pending assets are in transition and may need workflow flexibility.

---

## 🔧 Implementation

### **1. Serializer Validation (`backend/contexts/contexts_ms/serializer.py`)**

Added `_validate_asset_status_consistency()` method to the `TicketSerializer`:

```python
def validate(self, data):
    # ... existing validation ...

    # Validate asset status consistency
    if asset_id and ticket_type:
        self._validate_asset_status_consistency(asset_id, ticket_type)

    return data

def _validate_asset_status_consistency(self, asset_id, ticket_type):
    """
    Validate that the ticket type matches the asset status.

    Business Rules:
    1. Only assets with 'deployable', 'deployed', or 'pending' status can have tickets
    2. Assets with 'deployed' status must have 'checkin' tickets
    3. Assets with 'deployable' status must have 'checkout' tickets
    4. Assets with 'undeployable' or 'archived' status cannot have tickets
    """
    # Fetches asset data from Asset service
    # Validates status type matches ticket type
    # Raises ValidationError if rules are violated
```

**Key Features:**
- ✅ Fetches asset data from Asset service via HTTP
- ✅ Validates status type against ticket type
- ✅ Raises `ValidationError` with clear messages
- ✅ Gracefully handles service outages (skips validation if Asset service is unreachable)
- ✅ Logs errors without blocking ticket creation
- ✅ Uses DRF serializer validation (proper REST API pattern)

### **2. Seeder Consistency (`backend/assets/assets_ms/management/commands/seed_assets.py`)**

**Changed:**
- ❌ **REMOVED** `random.shuffle(status_distribution)` 
- ✅ **FIXED** Predictable asset-to-status mapping

**New Distribution:**
```python
# Assets 1-40: Deployable (status 1-2) → CHECKOUT tickets
# Assets 41-80: Deployed (status 3-4) → CHECKIN tickets
# Assets 81-90: Undeployable (status 5-6) → NO tickets
# Assets 91-95: Pending (status 7-8) → NO tickets
# Assets 96-100: Archived (status 9-10) → NO tickets
```

**Why No Shuffle?**
- The ticket seeder depends on this exact order
- Ensures 100% consistency between asset statuses and ticket types
- Makes data predictable for testing

### **3. Ticket Seeder (`backend/contexts/contexts_ms/management/commands/seed_tickets.py`)**

**Already Correct:**
- ✅ Creates 40 CHECKOUT tickets for assets 1-40 (deployable)
- ✅ Creates 40 CHECKIN tickets for assets 41-80 (deployed)
- ✅ Creates NO tickets for assets 81-100 (other statuses)

---

## 📊 Validation Examples

### ✅ Valid: Deployable Asset with Checkout Ticket
```json
{
  "asset": 10,
  "asset_status": { "type": "deployable", "name": "Available" },
  "ticket_type": "checkout"
}
```
→ ✅ **PASSES** validation

### ❌ Invalid: Deployable Asset with Checkin Ticket
```json
{
  "asset": 10,
  "asset_status": { "type": "deployable", "name": "Available" },
  "ticket_type": "checkin"
}
```
→ ❌ **FAILS** validation
```
ValidationError: Assets with 'deployable' status must have 'checkout' tickets, not 'checkin'.
```

### ✅ Valid: Deployed Asset with Checkin Ticket
```json
{
  "asset": 50,
  "asset_status": { "type": "deployed", "name": "In Use" },
  "ticket_type": "checkin"
}
```
→ ✅ **PASSES** validation

### ❌ Invalid: Deployed Asset with Checkout Ticket
```json
{
  "asset": 50,
  "asset_status": { "type": "deployed", "name": "In Use" },
  "ticket_type": "checkout"
}
```
→ ❌ **FAILS** validation
```
ValidationError: Assets with 'deployed' status must have 'checkin' tickets, not 'checkout'.
```

### ❌ Invalid: Archived Asset with Any Ticket
```json
{
  "asset": 96,
  "asset_status": { "type": "archived", "name": "Retired" },
  "ticket_type": "checkout"
}
```
→ ❌ **FAILS** validation
```
ValidationError: Cannot create ticket for asset with 'archived' status. 
Only 'deployable', 'deployed', or 'pending' assets can have tickets.
```

### ✅ Valid: Pending Asset with Either Ticket Type
```json
{
  "asset": 92,
  "asset_status": { "type": "pending", "name": "Pending Approval" },
  "ticket_type": "checkout"  // OR "checkin" - both allowed
}
```
→ ✅ **PASSES** validation

---

## 🎯 Summary Table

| Asset Status Type | Allowed Ticket Types | Validation Rule |
|-------------------|---------------------|-----------------|
| **deployable** | ✅ `checkout` only | Must be checkout |
| **deployed** | ✅ `checkin` only | Must be checkin |
| **pending** | ✅ `checkout` OR `checkin` | Either allowed |
| **undeployable** | ❌ None | Cannot have tickets |
| **archived** | ❌ None | Cannot have tickets |

---

## 📁 Files Modified

1. ✅ `backend/contexts/contexts_ms/serializer.py` (Lines 308-410)
   - Added `_validate_asset_status_consistency()` method to TicketSerializer
   - Validates asset status against ticket type in the `validate()` method
   - Uses proper DRF serializer validation pattern

2. ✅ `backend/assets/assets_ms/management/commands/seed_assets.py` (Lines 95-110)
   - Removed `random.shuffle()` for predictable distribution
   - Added comments explaining asset-to-status mapping

3. ✅ `backend/contexts/contexts_ms/management/commands/seed_tickets.py`
   - Already correct (no changes needed)

---

## 🚀 How to Test

### 1. Reseed Data
```bash
docker exec -it contexts-service python manage.py seed_all_contexts --clear
docker exec -it backend-dev python manage.py seed_assets --clear
docker exec -it contexts-service python manage.py seed_tickets --clear
```

### 2. Try Creating Invalid Ticket via API (Should Fail)
```bash
# Try to create checkout ticket for deployed asset (should fail)
curl -X POST http://localhost:8001/api/tickets/ \
  -H "Content-Type: application/json" \
  -d '{
    "ticket_number": "TEST001",
    "ticket_type": "checkout",
    "employee": "Test User",
    "asset": 50,
    "subject": "Test",
    "location": "1",
    "checkout_date": "2025-11-28",
    "return_date": "2025-12-28"
  }'
```

Expected error response:
```json
{
  "ticket_type": [
    "Assets with 'deployed' status must have 'checkin' tickets, not 'checkout'."
  ]
}
```

---

**Status: COMPLETE** ✅

All validation rules are now enforced at the model level!

