# Context Seeders - Quick Reference

## 🚀 Quick Commands

### Seed Everything (Recommended)
```bash
# Seed all context data (160 records total)
docker exec -it backend-dev python manage.py seed_all_contexts --clear
```

### Seed Specific Data
```bash
# Categories only (10 records)
docker exec -it backend-dev python manage.py seed_categories --clear

# Suppliers only (10 records)
docker exec -it backend-dev python manage.py seed_suppliers --clear

# Manufacturers only (10 records)
docker exec -it backend-dev python manage.py seed_manufacturers --clear

# Statuses only (10 records)
docker exec -it backend-dev python manage.py seed_statuses --clear

# Depreciations only (10 records)
docker exec -it backend-dev python manage.py seed_depreciations --clear

# Locations only (10 records)
docker exec -it backend-dev python manage.py seed_locations --clear

# Tickets only (100 records)
docker exec -it backend-dev python manage.py seed_tickets --clear
```

### Or Use Test Scripts

**Windows (PowerShell):**
```powershell
cd backend/contexts
.\test_seeders.ps1
```

**Linux/Mac (Bash):**
```bash
cd backend/contexts
chmod +x test_seeders.sh
./test_seeders.sh
```

---

## 📊 What You Get

| Seeder | Records | Description |
|--------|---------|-------------|
| Categories | 10 | 5 asset + 5 component |
| Suppliers | 10 | Philippine IT suppliers |
| Manufacturers | 10 | Major IT brands |
| Statuses | 10 | 2 per status type |
| Depreciations | 10 | Various schedules |
| Locations | 10 | Metro Manila offices |
| Tickets | 100 | 50 checkout + 50 checkin |
| **TOTAL** | **160** | **All context data** |

---

## ⚠️ Important

1. **Use `--clear` flag** to remove existing data before seeding
2. **No dependencies** - All seeders are independent
3. **Realistic data** - All data is realistic and ready to use
4. **Duplicate prevention** - Uses `get_or_create()` to prevent duplicates

---

## 🔧 Troubleshooting

**Duplicates?**
→ Use `--clear` flag

**Docker not running?**
→ Start Docker Desktop first

**Container not found?**
→ Make sure your Docker containers are running

---

## 📚 More Info

See `SEEDERS_README.md` for detailed documentation.

