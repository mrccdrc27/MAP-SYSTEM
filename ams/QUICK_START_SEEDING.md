# Quick Start: Database Seeding

## 🚀 Fastest Way to Seed Data

### Windows (PowerShell)
```powershell
.\seed.ps1
```

### Linux/Mac (Bash)
```bash
chmod +x seed.sh
./seed.sh
```

Then select an option from the menu!

---

## 📋 Manual Commands

### Seed 100 Components (Recommended)
```bash
docker exec -it backend-dev python manage.py seed_components
```

### Seed Everything (Products + 100 Components + Assets)
```bash
docker exec -it backend-dev python manage.py seed_all
```

### Bulk Seed Random Components (Custom Count)
```bash
# Default: 50 components
docker exec -it backend-dev python manage.py seed_components_bulk

# Custom count: 200 components
docker exec -it backend-dev python manage.py seed_components_bulk --count 200
```

### Clear and Reseed All Data
```bash
docker exec -it backend-dev python manage.py seed_all --clear
```

### Seed Specific Data Types
```bash
# Products only
docker exec -it backend-dev python manage.py seed_all --products-only

# Components only
docker exec -it backend-dev python manage.py seed_all --components-only

# Assets only
docker exec -it backend-dev python manage.py seed_all --assets-only
```

---

## 📦 What Gets Seeded?

### `seed_components` ⭐ **100 Components**
- **15 RAM modules** - Kingston, Corsair, Crucial, G.Skill, Samsung, HyperX, Patriot (4GB-16GB DDR4)
- **20 Storage devices** - Samsung, Crucial, WD, Seagate, Kingston, Intel (SSDs 240GB-1TB, HDDs 500GB-2TB)
- **20 Peripherals** - Logitech, Microsoft, HP, Dell (mice, keyboards, webcams, USB hubs, headsets)
- **15 Power supplies** - Dell, HP, Lenovo chargers, UPS units, power strips, USB-C adapters
- **15 Network equipment** - TP-Link, Netgear, Cisco switches, WiFi routers, access points, PoE
- **15 Cables & accessories** - CAT6, HDMI, DisplayPort, USB-C, cable management

### `seed_all` ⭐ **Complete Dataset**
- **4 Products** - Dell Latitude 5420, HP EliteDesk 800 G6, Dell UltraSharp U2720Q, Cisco Catalyst 2960-X
- **100 Components** - Calls `seed_components` command
- **6 Assets** - 3 assets each for 2 products with serial numbers and warranty info
- All with realistic prices, dates, and specifications

### `seed_components_bulk` ⭐ **Randomized Testing Data**
- **Customizable count** (default: 50, can be 100, 500, 1000+)
- **Random specifications** - Varied capacities, speeds, and features
- **Multiple categories** - RAM, Storage, Peripherals, Power, Network, Cables
- **Random quantities and prices** - Great for testing pagination, search, and filtering
- **Unique model numbers** - Auto-generated to prevent duplicates

---

## ⚠️ Important Notes

1. **Run migrations first:**
   ```bash
   docker exec -it backend-dev python manage.py migrate
   ```

2. **Context dependencies:**
   The seeders assume you have these IDs in your contexts service:
   - **Categories:** 1-6 (RAM, Storage, Peripherals, Power, Network, Cables)
   - **Manufacturers:** 1-33 (Kingston, Corsair, Samsung, Logitech, Dell, HP, etc.)
   - **Suppliers:** 1-2 (Primary, Secondary)
   - **Locations:** 1-2 (Main Warehouse, Secondary Storage)
   - **Statuses:** 1 (Available)
   - **Depreciations:** 1 (Standard)

3. **No duplicates:**
   Seeders use `get_or_create()` to prevent duplicate entries

4. **Container name:**
   Replace `backend-dev` with your actual container name if different
   - Check with: `docker ps`

---

## 🎯 Common Workflows

### First Time Setup
```bash
# 1. Start containers
docker-compose -f docker-compose.dev.yml up -d

# 2. Run migrations
docker exec -it backend-dev python manage.py migrate

# 3. Seed all data
docker exec -it backend-dev python manage.py seed_all
```

### Development Testing
```bash
# Clear and reseed for fresh start
docker exec -it backend-dev python manage.py seed_all --clear

# Or seed just components
docker exec -it backend-dev python manage.py seed_components --clear
```

### Large Dataset Testing
```bash
# Create 500 random components for performance testing
docker exec -it backend-dev python manage.py seed_components_bulk --count 500 --clear
```

### Incremental Seeding
```bash
# Add products without affecting existing data
docker exec -it backend-dev python manage.py seed_all --products-only

# Add more components
docker exec -it backend-dev python manage.py seed_components

# Add assets
docker exec -it backend-dev python manage.py seed_all --assets-only
```

---

## 🔧 Customization

Edit these files to customize sample data:
- `backend/assets/assets_ms/management/commands/seed_components.py` - 100 predefined components
- `backend/assets/assets_ms/management/commands/seed_all.py` - Products and assets
- `backend/assets/assets_ms/management/commands/seed_components_bulk.py` - Randomized bulk seeding

**What you can customize:**
- Component names, specifications, and notes
- Quantities and minimum quantities
- Purchase costs and dates
- Model numbers and order numbers
- Foreign key IDs (categories, manufacturers, suppliers, locations)

---

## 📚 Full Documentation

See `backend/assets/SEEDING_GUIDE.md` for:
- Complete list of all 100 components
- Detailed foreign key requirements
- Advanced seeding options
- Integration with entrypoint
- Performance tips

---

## 🐛 Troubleshooting

**Container not running?**
```bash
# Check container status
docker ps

# Start containers
docker-compose -f docker-compose.dev.yml up -d
```

**Wrong container name?**
```bash
# Find your container name
docker ps | grep backend

# Use the correct name
docker exec -it <your-container-name> python manage.py seed_all
```

**Foreign key errors?**
```bash
# The contexts service must have the required data
# Create categories, manufacturers, suppliers, and locations first
# Or update the seeder files to match your existing IDs
```

**Permission denied on seed.sh?**
```bash
chmod +x seed.sh
./seed.sh
```

**PowerShell execution policy error?**
```powershell
Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope CurrentUser
.\seed.ps1
```

**Migrations not applied?**
```bash
docker exec -it backend-dev python manage.py migrate
```

**Verify seeded data:**
```bash
# Enter Django shell
docker exec -it backend-dev python manage.py shell

# Check counts
from assets_ms.models import Component, Product, Asset
print(f"Components: {Component.objects.count()}")
print(f"Products: {Product.objects.count()}")
print(f"Assets: {Asset.objects.count()}")
```

---

## 💡 Pro Tips

1. **Use `--clear` flag** when you want to start fresh with clean data
2. **Run `seed_all`** for a complete demo-ready dataset
3. **Use `seed_components_bulk`** with high counts for performance testing
4. **Check foreign keys** in contexts service before seeding
5. **Seeders are idempotent** - safe to run multiple times (uses `get_or_create`)

---

## 🚀 Next Steps

After seeding:
1. ✅ Access Django admin to view seeded data
2. ✅ Test API endpoints with realistic data
3. ✅ Verify filtering, searching, and pagination
4. ✅ Create custom seeders for your specific needs

