# Database Seeders Summary

## 📊 Overview

This project includes **6 separate seeder commands** to populate your database with realistic sample data for development and testing.

### Total Records Available:
- **10 Products** (laptops, desktops, monitors, network equipment, printers)
- **10 Assets** (2 assets per product for first 5 products)
- **100 Components** (RAM, storage, peripherals, power, network, cables)
- **100 Tickets** (60 checkout requests, 40 checkin requests)
- **220+ Total Records** when using `seed_all`

---

## 🚀 Quick Start

### Seed Everything at Once
```bash
# Assets service (products + assets + components)
docker exec -it backend-dev python manage.py seed_all --clear

# Contexts service (tickets)
docker exec -it contexts-dev python manage.py seed_tickets --clear
```

### Seed Individual Data Types
```bash
# Products (10 records)
docker exec -it backend-dev python manage.py seed_products

# Assets (10 records)
docker exec -it backend-dev python manage.py seed_assets

# Components (100 records)
docker exec -it backend-dev python manage.py seed_components

# Tickets (100 records)
docker exec -it contexts-dev python manage.py seed_tickets
```

---

## 📁 Seeder Files Location

### Assets Service (`backend/assets/assets_ms/management/commands/`)
- `seed_products.py` - 10 products
- `seed_assets.py` - 10 assets
- `seed_components.py` - 100 components
- `seed_components_bulk.py` - Randomized components (custom count)
- `seed_all.py` - Orchestrates all seeders

### Contexts Service (`backend/contexts/contexts_ms/management/commands/`)
- `seed_tickets.py` - 100 tickets (checkout and checkin requests)

---

## 📋 Detailed Breakdown

### 1. Products Seeder (`seed_products.py`)
**Records:** 10 products

**Categories:**
- 3 Laptops (Dell, HP, Lenovo) - $1,299 - $1,799
- 2 Desktops (HP, Dell) - $899 - $1,099
- 2 Monitors (Dell, LG) - $499 - $549
- 2 Network Equipment (Cisco, Ubiquiti) - $379 - $1,899
- 1 Printer (HP) - $299

**Features:**
- Complete specifications (CPU, GPU, RAM, storage, OS)
- Realistic pricing
- End-of-life dates (3-7 years)
- Minimum quantity thresholds

**Usage:**
```bash
docker exec -it backend-dev python manage.py seed_products --clear
```

---

### 2. Assets Seeder (`seed_assets.py`)
**Records:** 10 assets

**Details:**
- 2 assets created for each of the first 5 products
- Auto-generated asset IDs: `AST-YYYYMMDD-XXXXX-RAND`
- Serial numbers: `SN000001` - `SN000010`
- Order numbers: `ORD-2024-0001` - `ORD-2024-0010`
- Warranty: 1-3 years from purchase
- Purchase dates: Staggered over last 10 months
- Locations: Split between 2 locations
- Suppliers: Alternating between 2 suppliers

**Prerequisites:**
- Products must be seeded first

**Usage:**
```bash
docker exec -it backend-dev python manage.py seed_assets --clear
```

---

### 3. Components Seeder (`seed_components.py`)
**Records:** 100 components

**Breakdown:**
- 15 RAM modules (4GB-16GB DDR4)
- 20 Storage devices (SSDs 240GB-1TB, HDDs 500GB-2TB)
- 20 Peripherals (mice, keyboards, webcams, USB hubs, headsets)
- 15 Power supplies (laptop chargers, UPS, power strips, USB-C adapters)
- 15 Network equipment (switches, routers, access points, PoE)
- 15 Cables & accessories (Ethernet, HDMI, USB-C, DisplayPort, cable management)

**Features:**
- Realistic brands (Kingston, Corsair, Samsung, Logitech, Dell, HP, Cisco, etc.)
- Varied specifications and capacities
- Realistic pricing ($4.99 - $1,899.99)
- Quantity and minimum quantity tracking
- Unique model numbers and order numbers

**Usage:**
```bash
docker exec -it backend-dev python manage.py seed_components --clear
```

---

### 4. Tickets Seeder (`seed_tickets.py`)
**Records:** 100 tickets

**Breakdown:**
- 60 Checkout requests (60%)
- 40 Checkin requests (40%)
- 70% resolved, 30% unresolved

**Features:**
- Ticket numbers: `TKT001` - `TKT100`
- 20 different employee names
- 10 different office locations
- Random asset assignments (IDs 1-50)
- Created dates: Random within last 90 days
- Realistic subjects for each ticket type

**Checkout Tickets Include:**
- checkout_date
- return_date
- Subjects like "Laptop needed for remote work", "Desktop for new employee"

**Checkin Tickets Include:**
- checkin_date
- asset_checkout reference (links to checkout record)
- Subjects like "Returning laptop after project", "Equipment return - resignation"

**Usage:**
```bash
docker exec -it contexts-dev python manage.py seed_tickets --clear
```

---

### 5. Components Bulk Seeder (`seed_components_bulk.py`)
**Records:** Custom count (default: 50)

**Features:**
- Randomized component names and specifications
- Random categories, manufacturers, suppliers
- Random quantities (1-100) and prices ($5-$2000)
- Random purchase dates
- Useful for performance testing with large datasets

**Usage:**
```bash
# Default 50 components
docker exec -it backend-dev python manage.py seed_components_bulk

# Custom count
docker exec -it backend-dev python manage.py seed_components_bulk --count 500 --clear
```

---

### 6. Seed All (`seed_all.py`)
**Records:** 220+ (10 products + 10 assets + 100 components + 100 tickets)

**Features:**
- Orchestrates all individual seeders
- Supports `--clear` flag to reset all data
- Supports selective seeding with flags:
  - `--products-only`
  - `--assets-only`
  - `--components-only`
  - `--tickets-only`

**Usage:**
```bash
# Seed everything
docker exec -it backend-dev python manage.py seed_all --clear

# Seed only products
docker exec -it backend-dev python manage.py seed_all --products-only

# Seed only assets
docker exec -it backend-dev python manage.py seed_all --assets-only
```

---

## ⚙️ Foreign Key Requirements

The seeders require the following data to exist in the **contexts service**:

### Categories (IDs 1-6)
1. Laptops/Computers
2. Desktops
3. Monitors/Displays
4. Network Equipment
5. Printers
6. Cables & Accessories

### Manufacturers (IDs 1-33)
1. Kingston, 2. Corsair, 3. Crucial, 4. G.Skill, 5. Samsung, 6. Patriot, 7. Western Digital, 8. Seagate, 9. SanDisk, 10. Toshiba, 11. Intel, 12. LG, 13. Logitech, 14. HP, 15. Dell, 16. Generic USB, 17. ASUS, 18. Cooler Master, 19. Lenovo, 20. Targus, 21. Belkin, 22. APC, 23. Anker, 24. EVGA, 25. TP-Link, 26. Netgear, 27. Cisco, 28. Ubiquiti, 29. Panduit, 30. Monoprice, 31. Cable Matters, 32. Aukey, 33. Cable Management Co.

### Suppliers (IDs 1-2)
1. Primary Supplier
2. Secondary Supplier

### Locations (IDs 1-2)
1. Main Warehouse
2. Secondary Storage

### Statuses (ID 1)
1. Available

### Depreciations (ID 1)
1. Standard Depreciation

---

## 🎯 Common Workflows

### First-Time Setup
```bash
# 1. Start containers
docker-compose -f docker-compose.dev.yml up -d

# 2. Run migrations
docker exec -it backend-dev python manage.py migrate
docker exec -it contexts-dev python manage.py migrate

# 3. Seed all data
docker exec -it backend-dev python manage.py seed_all --clear
docker exec -it contexts-dev python manage.py seed_tickets --clear
```

### Development Testing
```bash
# Clear and reseed for fresh start
docker exec -it backend-dev python manage.py seed_all --clear
docker exec -it contexts-dev python manage.py seed_tickets --clear
```

### Large Dataset Testing
```bash
# Create 1000 random components for performance testing
docker exec -it backend-dev python manage.py seed_components_bulk --count 1000 --clear
```

### Incremental Seeding
```bash
# Add products without affecting existing data
docker exec -it backend-dev python manage.py seed_products

# Add more components
docker exec -it backend-dev python manage.py seed_components

# Add assets
docker exec -it backend-dev python manage.py seed_assets

# Add tickets
docker exec -it contexts-dev python manage.py seed_tickets
```

---

## 🔧 Customization

To customize the sample data, edit these files:

**Assets Service:**
- `backend/assets/assets_ms/management/commands/seed_products.py`
- `backend/assets/assets_ms/management/commands/seed_assets.py`
- `backend/assets/assets_ms/management/commands/seed_components.py`
- `backend/assets/assets_ms/management/commands/seed_components_bulk.py`

**Contexts Service:**
- `backend/contexts/contexts_ms/management/commands/seed_tickets.py`

**What you can customize:**
- Product names, specifications, and pricing
- Asset serial numbers and warranty periods
- Component names, quantities, and prices
- Ticket subjects, employees, and locations
- Foreign key IDs to match your contexts data
- Purchase dates and order numbers

---

## 📚 Documentation

For complete documentation, see:
- `backend/assets/SEEDING_GUIDE.md` - Comprehensive seeding guide
- `QUICK_START_SEEDING.md` - Quick reference guide

---

## ✅ Summary

| Seeder | Service | Records | Command |
|--------|---------|---------|---------|
| Products | Assets | 10 | `docker exec -it backend-dev python manage.py seed_products` |
| Assets | Assets | 10 | `docker exec -it backend-dev python manage.py seed_assets` |
| Components | Assets | 100 | `docker exec -it backend-dev python manage.py seed_components` |
| Tickets | Contexts | 100 | `docker exec -it contexts-dev python manage.py seed_tickets` |
| Components Bulk | Assets | Custom | `docker exec -it backend-dev python manage.py seed_components_bulk --count N` |
| All Data | Assets | 220+ | `docker exec -it backend-dev python manage.py seed_all` |

**Total Sample Data:** 220+ records across products, assets, components, and tickets!


