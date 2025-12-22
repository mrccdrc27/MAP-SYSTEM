# Quick Reseed Guide - Fixed Seeders

## 🚀 Quick Commands

### Option 1: Reseed Everything (Recommended)
```bash
# Step 1: Reseed contexts (statuses, locations, etc.)
docker exec -it contexts-service python manage.py seed_all_contexts --clear

# Step 2: Reseed assets (will auto-seed products if needed)
docker exec -it backend-dev python manage.py seed_assets --clear

# Step 3: Reseed tickets (matched to asset statuses)
docker exec -it contexts-service python manage.py seed_tickets --clear
```

### Option 2: Individual Commands
```bash
# Contexts service
docker exec -it contexts-service python manage.py seed_statuses --clear
docker exec -it contexts-service python manage.py seed_locations --clear
docker exec -it contexts-service python manage.py seed_suppliers --clear
docker exec -it contexts-service python manage.py seed_manufacturers --clear

# Assets service
docker exec -it backend-dev python manage.py seed_products --clear
docker exec -it backend-dev python manage.py seed_assets --clear

# Tickets (contexts service)
docker exec -it contexts-service python manage.py seed_tickets --clear
```

---

## 📊 What Gets Created

### Assets (100 Total)
- **40 Deployable** (Status IDs 1-2: "Ready to Deploy", "Available")
  - Assets 1-40
  - Each has a CHECKOUT ticket
  - Shows "Check-Out" button in UI

- **40 Deployed** (Status IDs 3-4: "In Use", "Checked Out")
  - Assets 41-80
  - Each has a CHECKIN ticket
  - Shows "Check-In" button in UI

- **10 Undeployable** (Status IDs 5-6: "Under Repair", "Broken")
  - Assets 81-90
  - No tickets
  - No buttons in UI

- **5 Pending** (Status IDs 7-8: "Pending Approval", "In Transit")
  - Assets 91-95
  - No tickets
  - No buttons in UI

- **5 Archived** (Status IDs 9-10: "Retired", "Lost/Stolen")
  - Assets 96-100
  - No tickets
  - No buttons in UI

### Tickets (80 Total)
- **40 Checkout Tickets** (TKT001-TKT040)
  - For assets 1-40 (deployable)
  - 30% resolved, 70% unresolved

- **40 Checkin Tickets** (TKT041-TKT080)
  - For assets 41-80 (deployed)
  - 30% resolved, 70% unresolved

---

## ✅ Verification

### Check Asset Distribution
```bash
docker exec -it backend-dev python manage.py shell
```

```python
from assets_ms.models import Asset
from django.db.models import Count

# Count by status
Asset.objects.values('status').annotate(count=Count('id')).order_by('status')

# Expected output:
# {'status': 1, 'count': ~20}  # Ready to Deploy
# {'status': 2, 'count': ~20}  # Available
# {'status': 3, 'count': ~20}  # In Use
# {'status': 4, 'count': ~20}  # Checked Out
# {'status': 5, 'count': ~5}   # Under Repair
# {'status': 6, 'count': ~5}   # Broken
# {'status': 7, 'count': ~3}   # Pending Approval
# {'status': 8, 'count': ~2}   # In Transit
# {'status': 9, 'count': ~3}   # Retired
# {'status': 10, 'count': ~2}  # Lost/Stolen
```

### Check Ticket Distribution
```bash
docker exec -it contexts-service python manage.py shell
```

```python
from contexts_ms.models import Ticket
from django.db.models import Count

# Count by ticket type
Ticket.objects.values('ticket_type').annotate(count=Count('id'))

# Expected output:
# {'ticket_type': 'checkout', 'count': 40}
# {'ticket_type': 'checkin', 'count': 40}
```

---

## 🎯 Expected UI Behavior

### Assets Page

**Asset #10** (Deployable)
- Status: "Available" or "Ready to Deploy"
- Ticket: CHECKOUT (TKT001-TKT040)
- Button: ✅ "Check-Out" button visible

**Asset #50** (Deployed)
- Status: "In Use" or "Checked Out"
- Ticket: CHECKIN (TKT041-TKT080)
- Button: ✅ "Check-In" button visible

**Asset #85** (Undeployable)
- Status: "Under Repair" or "Broken"
- Ticket: None
- Button: ❌ No buttons visible

**Asset #95** (Pending)
- Status: "Pending Approval" or "In Transit"
- Ticket: None
- Button: ❌ No buttons visible

**Asset #100** (Archived)
- Status: "Retired" or "Lost/Stolen"
- Ticket: None
- Button: ❌ No buttons visible

---

## 📝 Notes

- **Statuses must be seeded first** (they're referenced by assets)
- **Products are auto-seeded** when running `seed_assets` if they don't exist
- **Tickets reference assets** by ID (1-80 have tickets, 81-100 don't)
- **Status distribution is shuffled** so assets aren't in perfect order
- **70% of tickets are unresolved** to make buttons more visible in UI

---

## 🔧 Troubleshooting

### Issue: "No products found"
```bash
# Manually seed products first
docker exec -it backend-dev python manage.py seed_products --clear
```

### Issue: "Foreign key constraint failed"
```bash
# Seed in correct order:
# 1. Contexts (statuses, locations, etc.)
# 2. Products
# 3. Assets
# 4. Tickets
```

### Issue: "Tickets don't match asset statuses"
```bash
# Clear and reseed both assets and tickets
docker exec -it backend-dev python manage.py seed_assets --clear
docker exec -it contexts-service python manage.py seed_tickets --clear
```

---

**Status: READY TO USE** ✅

Run the commands above to populate your database with consistent, realistic data!

