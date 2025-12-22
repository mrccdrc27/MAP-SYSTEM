# AMS (Asset Management System) - Architecture & Setup Guide

## 🏗️ System Overview

AMS is a **microservices-based Asset Management System** built with:
- **3 Django Backend Services** + **1 React Frontend**
- **Kong API Gateway** for routing and security
- **PostgreSQL** for persistent storage
- **Docker Compose** for orchestration

---

## 📊 Service Architecture

```
┌─────────────────────────────────────────────────────────────────────┐
│                        Kong API Gateway (Port 80)                   │
│  - Rate Limiting, CORS, Security Headers, Request Routing           │
└───────────────┬────────────────┬────────────────┬───────────────────┘
                │                │                │
     ┌──────────▼──────┐  ┌──────▼──────┐  ┌──────▼──────┐
     │   Frontend      │  │  Auth API   │  │ Assets API  │
     │   (React/Vite)  │  │  Port 8001  │  │  Port 8002  │
     │   Port 5173     │  └──────┬──────┘  └──────┬──────┘
     └─────────────────┘         │                │
                          ┌──────▼──────┐  ┌──────▼──────┐
                          │ Contexts API │  │  PostgreSQL │
                          │  Port 8003   │  │  Port 5432  │
                          └──────┬───────┘  └─────────────┘
                                 │
                                 ▼
                          ┌─────────────────────────────┐
                          │  3 Logical Databases:       │
                          │  - ams_authentication       │
                          │  - ams_assets               │
                          │  - ams_contexts             │
                          └─────────────────────────────┘
```

---

## 🔧 Service Responsibilities

| Service | Port | Database | Key Models |
|---------|------|----------|------------|
| **Authentication** | 8001 | `ams_authentication` | `CustomUser` - User auth & JWT |
| **Assets** | 8002 | `ams_assets` | `Product`, `Asset`, `AssetCheckout`, `Component`, `Repair` |
| **Contexts** | 8003 | `ams_contexts` | `Category`, `Supplier`, `Manufacturer`, `Status`, `Depreciation`, `Location`, `Ticket`, `Employee` |
| **Frontend** | 5173 | N/A | React SPA with Vite |

---

## 🚀 Setup & Startup Process

### 1. Database Initialization (`init-db.sh`)

The PostgreSQL container runs this script on first start to create separate databases:

```bash
#!/bin/bash
set -e

psql -v ON_ERROR_STOP=1 --username "$POSTGRES_USER" --dbname "$POSTGRES_DB" <<-EOSQL
    CREATE DATABASE ams_authentication;
    CREATE DATABASE ams_assets;
    CREATE DATABASE ams_contexts;
EOSQL
```

### 2. Start Development Environment

```bash
cd ams
docker-compose -f docker-compose.dev.yml up -d
```

This starts the following services:

| Service | Container Name | Port |
|---------|---------------|------|
| PostgreSQL | `postgres-db` | 5432 |
| Kong Gateway | `kong-gateway-dev` | 80, 8444 |
| Authentication | `authentication-service` | 8001 |
| Assets | `assets-service` | 8002 |
| Contexts | `contexts-service` | 8003 |
| Frontend | `frontend-dev` | 5173 |

### 3. Service Entrypoint Script (`entrypoint.sh`)

Each Django service runs this on container start:

```bash
#!/bin/bash
set -e

# 1. Wait for database to be ready
echo "Waiting for database..."
until python -c "
import psycopg2
import os
try:
    psycopg2.connect(
        host=os.getenv('ASSETS_DB_HOST', 'db'),
        port=os.getenv('ASSETS_DB_PORT', '5432'),
        user=os.getenv('ASSETS_DB_USER', 'postgres'),
        password=os.getenv('ASSETS_DB_PASSWORD', 'password'),
        dbname='postgres'
    )
    print('Database is ready!')
except psycopg2.OperationalError:
    print('Database not ready, waiting...')
    exit(1)
"; do
  sleep 2
done

# 2. Run migrations automatically
echo "Running migrations..."
python manage.py migrate --noinput

# 3. Start Django dev server
echo "Starting service..."
python manage.py runserver 0.0.0.0:800X
```

---

## 📦 Migration Process

Each service runs **independent Django migrations** on its own database:

| Service | Migration Path | Database |
|---------|---------------|----------|
| Authentication | `auth_service/migrations/` | `ams_authentication` |
| Assets | `assets_ms/migrations/` | `ams_assets` |
| Contexts | `contexts_ms/migrations/` | `ams_contexts` |

### Cross-Service References

Services are **completely decoupled** at the database level. Cross-service references use **integer IDs** (not foreign keys):

| Asset Field | References |
|------------|------------|
| `Asset.status` | `Status.id` from Contexts service |
| `Asset.supplier` | `Supplier.id` from Contexts service |
| `Asset.location` | `Location.id` from Contexts service |
| `Product.category` | `Category.id` from Contexts service |
| `Product.manufacturer` | `Manufacturer.id` from Contexts service |

### Running Migrations Manually

```bash
# Assets Service
docker exec -it assets-service python manage.py makemigrations
docker exec -it assets-service python manage.py migrate

# Contexts Service
docker exec -it contexts-service python manage.py makemigrations
docker exec -it contexts-service python manage.py migrate

# Authentication Service
docker exec -it authentication-service python manage.py makemigrations
docker exec -it authentication-service python manage.py migrate
```

---

## 🌱 Seeding System

AMS has a comprehensive seeding system with Django management commands.

### Assets Service Seeders

Location: `backend/assets/assets_ms/management/commands/`

| Command | Records | Description |
|---------|---------|-------------|
| `seed_products` | 100 | IT equipment (laptops, monitors, network gear) |
| `seed_assets` | 100 | Assets linked to products (auto-seeds products if needed) |
| `seed_components` | 100 | RAM, storage, peripherals, cables |
| `seed_asset_checkouts` | 40 | Checkout transaction records |
| `seed_repairs` | 20 | Repair records for assets |
| `seed_all` | 360 | **Master command** - runs all seeders |

### Contexts Service Seeders

Location: `backend/contexts/contexts_ms/management/commands/`

| Command | Records | Description |
|---------|---------|-------------|
| `seed_categories` | 10 | Asset & component categories |
| `seed_suppliers` | 10 | Philippine IT suppliers |
| `seed_manufacturers` | 10 | Major IT brands (Dell, HP, Lenovo, etc.) |
| `seed_statuses` | 15 | 10 asset statuses + 5 repair statuses |
| `seed_depreciations` | 10 | Depreciation schedules |
| `seed_locations` | 10 | Metro Manila office locations |
| `seed_employees` | 20 | Employee records |
| `seed_tickets` | 80 | Checkout/checkin request tickets |
| `seed_all_contexts` | 165 | **Master command** - runs all seeders |

### Seeding Order (Important!)

**Contexts MUST be seeded FIRST** because Assets references Contexts data:

```bash
# Step 1: Seed Contexts FIRST (provides reference data)
docker exec -it contexts-service python manage.py seed_all_contexts --clear

# Step 2: Seed Assets SECOND (references contexts data)
docker exec -it assets-service python manage.py seed_all --clear
```

### Seeder Options

```bash
# Clear existing data before seeding
python manage.py seed_all --clear

# Seed only specific data types
python manage.py seed_all --products-only
python manage.py seed_all --assets-only
python manage.py seed_all --components-only
python manage.py seed_all --checkouts-only
python manage.py seed_all --repairs-only

# Contexts specific options
python manage.py seed_all_contexts --categories-only
python manage.py seed_all_contexts --suppliers-only
python manage.py seed_all_contexts --statuses-only
python manage.py seed_all_contexts --tickets-only
```

### Quick Seeding Scripts

#### Windows (PowerShell)
```powershell
.\seed.ps1
```

#### Linux/Mac (Bash)
```bash
chmod +x seed.sh
./seed.sh
```

Both scripts provide an interactive menu for seeding options.

### Auto-Dependency Handling

The `seed_assets` command automatically seeds products if they don't exist:

```python
# Check if products exist
products = Product.objects.filter(is_deleted=False)
if not products.exists():
    self.stdout.write('No products found. Auto-seeding products first...')
    call_command('seed_products')
```

---

## 🔀 Kong API Gateway

### Route Configuration (`kong/kong.yml`)

```yaml
services:
  # Authentication Service
  - name: authentication-service
    url: http://authentication:8001
    routes:
      - name: auth-route
        paths:
          - ~/api/auth
        strip_path: true
        preserve_host: true

  # Assets Service
  - name: assets-service
    url: http://assets:8002
    routes:
      - name: assets-route
        paths:
          - ~/api/assets
        strip_path: true
        preserve_host: true

  # Contexts Service
  - name: contexts-service
    url: http://contexts:8003
    routes:
      - name: contexts-route
        paths:
          - ~/api/contexts
        strip_path: true
        preserve_host: true

  # Frontend (catch-all, lowest priority)
  - name: frontend-service
    url: http://frontend:5173
    routes:
      - name: frontend-route
        paths:
          - /
        strip_path: false
        regex_priority: 0
```

### URL Mapping

| Request URL | Routed To |
|------------|-----------|
| `http://localhost/api/auth/*` | `http://authentication:8001/*` |
| `http://localhost/api/assets/*` | `http://assets:8002/*` |
| `http://localhost/api/contexts/*` | `http://contexts:8003/*` |
| `http://localhost/*` | `http://frontend:5173/*` |

### Kong Plugins

#### Global Plugins (Applied to all routes)

| Plugin | Configuration |
|--------|--------------|
| **Rate Limiting** | 100 requests/min, 1000/hour |
| **CORS** | Allows localhost origins |
| **Security Headers** | X-Frame-Options, X-XSS-Protection, etc. |
| **Request Size** | Max 50MB payload |
| **File Logging** | Logs to stdout |
| **Correlation ID** | Adds X-Request-ID header |
| **Bot Detection** | Blocks curl/wget/python-requests |

#### Per-Service Plugins

| Service | Plugin | Configuration |
|---------|--------|--------------|
| Authentication | Rate Limiting | 30/min (brute-force protection) |
| Authentication | Request Transformer | Adds X-Forwarded-Service header |
| Assets | Proxy Cache | 60s cache for GET requests |

---

## 🔌 Frontend Integration

### Environment Configuration (`frontend/.env`)

```env
# All requests go through Kong Gateway on port 80
VITE_API_GATEWAY_URL=http://localhost
VITE_AUTH_API_URL=http://localhost/api/auth/
VITE_ASSETS_API_URL=http://localhost/api/assets/
VITE_CONTEXTS_API_URL=http://localhost/api/contexts/

# Integration APIs (for cross-system communication)
VITE_INTEGRATION_HELP_DESK_API_URL=http://localhost/api/contexts/
VITE_INTEGRATION_TICKET_TRACKING_API_URL=http://localhost/api/contexts/
VITE_INTEGRATION_AUTH_API_URL=http://localhost/api/contexts/
```

### Axios Instances

The frontend uses separate Axios instances per service:

#### `authAxios.js`
```javascript
import axios from "axios";

const authAxios = axios.create({
  baseURL: import.meta.env.VITE_AUTH_API_URL,
  timeout: 10000,
  headers: {
    "Content-Type": "application/json",
    accept: "application/json",
  }
});

export default authAxios;
```

#### `assetsAxios.js`
```javascript
import axios from "axios";

const assetsAxios = axios.create({
  baseURL: import.meta.env.VITE_ASSETS_API_URL,
  timeout: 10000,
});

export default assetsAxios;
```

#### `contextsAxios.js`
```javascript
import axios from "axios";

const contextsAxios = axios.create({
  baseURL: import.meta.env.VITE_CONTEXTS_API_URL,
  timeout: 10000,
});

export default contextsAxios;
```

---

## 🐳 Docker Configuration

### Development (`docker-compose.dev.yml`)

Features:
- Hot-reloading enabled via volume mounts
- Ports exposed directly for debugging
- PostgreSQL included
- Kong admin API enabled (port 8444)

```yaml
services:
  db:
    image: postgres:15
    environment:
      POSTGRES_USER: postgres
      POSTGRES_PASSWORD: capstone
      POSTGRES_MULTIPLE_DATABASES: ams_authentication,ams_assets,ams_contexts
    volumes:
      - postgres_data:/var/lib/postgresql/data
      - ./init-db.sh:/docker-entrypoint-initdb.d/init-db.sh

  assets:
    build:
      context: ./backend/assets
      target: development
    volumes:
      - ./backend/assets:/app  # Hot reload
    depends_on:
      - db
```

### Production (`docker-compose.yml`)

Features:
- Gunicorn WSGI server
- Static files via WhiteNoise
- Frontend served by Caddy
- No direct port exposure (Kong only)
- Kong admin API disabled

```yaml
services:
  assets:
    build:
      context: ./backend/assets
      target: production
    expose:
      - "8002"  # Internal only
    # No ports mapping - access via Kong only
```

### Dockerfile Pattern (Multi-stage)

```dockerfile
FROM python:3.11-slim as base
WORKDIR /app

# Development stage
FROM base as development
RUN pip install -r requirements.txt
COPY . .
CMD ["./entrypoint.sh"]

# Production stage
FROM base as production
RUN pip install -r requirements.txt
COPY . .
RUN python manage.py collectstatic --noinput
CMD ["gunicorn", "assets.wsgi:application", "--bind", "0.0.0.0:8002"]
```

---

## 📁 Project Structure

```
ams/
├── docker-compose.yml              # Production orchestration
├── docker-compose.dev.yml          # Development orchestration
├── init-db.sh                      # Multi-database init script
├── seed.ps1                        # Windows seeding script
├── seed.sh                         # Linux/Mac seeding script
├── package.json                    # Root dependencies (Redux, etc.)
│
├── kong/
│   ├── kong.yml                    # Development gateway config
│   └── kong.prod.yml               # Production gateway config
│
├── backend/
│   ├── authentication/             # Auth service (port 8001)
│   │   ├── auth_service/
│   │   │   ├── models.py           # CustomUser model
│   │   │   ├── views.py            # Auth endpoints
│   │   │   └── serializers.py
│   │   ├── authentication/
│   │   │   └── settings.py
│   │   ├── Dockerfile
│   │   ├── entrypoint.sh
│   │   ├── requirements.txt
│   │   └── .env
│   │
│   ├── assets/                     # Assets service (port 8002)
│   │   ├── assets_ms/
│   │   │   ├── models.py           # Product, Asset, Component, etc.
│   │   │   ├── views.py
│   │   │   ├── serializer.py
│   │   │   └── management/
│   │   │       └── commands/       # Seeder commands
│   │   │           ├── seed_all.py
│   │   │           ├── seed_products.py
│   │   │           ├── seed_assets.py
│   │   │           └── seed_components.py
│   │   ├── assets/
│   │   │   └── settings.py
│   │   ├── Dockerfile
│   │   ├── entrypoint.sh
│   │   ├── requirements.txt
│   │   └── .env
│   │
│   └── contexts/                   # Contexts service (port 8003)
│       ├── contexts_ms/
│       │   ├── models.py           # Category, Supplier, Status, etc.
│       │   ├── views.py
│       │   ├── serializer.py
│       │   └── management/
│       │       └── commands/       # Seeder commands
│       │           ├── seed_all_contexts.py
│       │           ├── seed_categories.py
│       │           └── seed_statuses.py
│       ├── contexts/
│       │   └── settings.py
│       ├── Dockerfile
│       ├── entrypoint.sh
│       ├── requirements.txt
│       └── .env
│
└── frontend/                       # React SPA (port 5173)
    ├── src/
    │   ├── api/
    │   │   ├── authAxios.js
    │   │   ├── assetsAxios.js
    │   │   └── contextsAxios.js
    │   ├── components/
    │   ├── pages/
    │   ├── features/
    │   └── App.jsx
    ├── Dockerfile
    ├── vite.config.js
    ├── package.json
    └── .env
```

---

## 🔄 Data Flow Examples

### Asset Checkout Flow

```
1. User submits checkout request
   Frontend → POST /api/contexts/tickets/
   
2. Kong routes to Contexts Service
   Kong → http://contexts:8003/tickets/
   
3. Contexts Service creates Ticket
   - ticket_type: "checkout"
   - asset: <asset_id from Assets>
   - employee: <user_id from Auth>
   - is_resolved: false

4. Admin approves ticket
   Frontend → PUT /api/contexts/tickets/{id}/
   - is_resolved: true
   
5. System creates checkout record
   Frontend → POST /api/assets/checkouts/
   
6. Assets Service records checkout
   - Creates AssetCheckout record
   - Updates Asset.status to "Deployed" (status_id=3)
```

### Creating a New Asset

```
1. Fetch reference data from Contexts
   GET /api/contexts/categories/
   GET /api/contexts/suppliers/
   GET /api/contexts/manufacturers/
   GET /api/contexts/statuses/
   GET /api/contexts/locations/

2. Fetch products from Assets
   GET /api/assets/products/

3. Submit new asset
   POST /api/assets/assets/
   {
     "product": 1,           // Product ID from Assets
     "status": 1,            // Status ID from Contexts
     "supplier": 3,          // Supplier ID from Contexts
     "location": 5,          // Location ID from Contexts
     "serial_number": "...",
     "purchase_cost": 50000
   }
```

---

## 🎯 Quick Reference Commands

### Docker Commands

```bash
# Start development environment
docker-compose -f docker-compose.dev.yml up -d

# View logs
docker logs -f assets-service
docker logs -f contexts-service
docker logs -f authentication-service
docker logs -f kong-gateway-dev

# Stop all services
docker-compose -f docker-compose.dev.yml down

# Reset everything (including database)
docker-compose -f docker-compose.dev.yml down -v
```

### Migration Commands

```bash
# Assets Service
docker exec -it assets-service python manage.py makemigrations
docker exec -it assets-service python manage.py migrate

# Contexts Service
docker exec -it contexts-service python manage.py makemigrations
docker exec -it contexts-service python manage.py migrate

# Authentication Service
docker exec -it authentication-service python manage.py makemigrations
docker exec -it authentication-service python manage.py migrate
```

### Seeding Commands

```bash
# Seed everything (correct order)
docker exec -it contexts-service python manage.py seed_all_contexts --clear
docker exec -it assets-service python manage.py seed_all --clear

# Seed specific data
docker exec -it assets-service python manage.py seed_products
docker exec -it assets-service python manage.py seed_assets
docker exec -it contexts-service python manage.py seed_categories
docker exec -it contexts-service python manage.py seed_statuses
```

### Django Shell

```bash
# Access Django shell
docker exec -it assets-service python manage.py shell

# Check record counts
docker exec -it assets-service python manage.py shell -c "
from assets_ms.models import Product, Asset
print(f'Products: {Product.objects.count()}')
print(f'Assets: {Asset.objects.count()}')
"
```

### Database Access

```bash
# Connect to PostgreSQL
docker exec -it postgres-db psql -U postgres

# List databases
\l

# Connect to specific database
\c ams_assets

# List tables
\dt
```

---

## 🔧 Environment Variables

### Assets Service (`.env`)

```env
# Django
ASSETS_DEBUG=True
ASSETS_SECRET_KEY=<secret-key>
ASSETS_ALLOWED_HOSTS=localhost,127.0.0.1,assets,assets-service

# Database
ASSETS_DB_NAME=ams_assets
ASSETS_DB_USER=postgres
ASSETS_DB_PASSWORD=capstone
ASSETS_DB_HOST=db
ASSETS_DB_PORT=5432

# CORS
ASSETS_CORS_ALLOWED_ORIGINS=http://localhost:5173,http://localhost:3000

# Integration
CONTEXTS_API_URL=http://contexts-service:8003
```

### Contexts Service (`.env`)

```env
# Django
CONTEXTS_DEBUG=True
CONTEXTS_SECRET_KEY=<secret-key>
CONTEXTS_ALLOWED_HOSTS=localhost,127.0.0.1,contexts,contexts-service

# Database
CONTEXTS_DB_NAME=ams_contexts
CONTEXTS_DB_USER=postgres
CONTEXTS_DB_PASSWORD=capstone
CONTEXTS_DB_HOST=db
CONTEXTS_DB_PORT=5432

# CORS
CONTEXTS_CORS_ALLOWED_ORIGINS=http://localhost:5173,http://localhost:3000
```

---

## 📊 Data Summary

### Total Seeded Records

| Service | Records | Details |
|---------|---------|---------|
| **Contexts** | 165 | 10 categories + 10 suppliers + 10 manufacturers + 15 statuses + 10 depreciations + 10 locations + 20 employees + 80 tickets |
| **Assets** | 360 | 100 products + 100 assets + 100 components + 40 checkouts + 20 repairs |
| **Total** | **525** | Complete database seeding |

### Status Distribution (Assets)

| Status Type | Status IDs | Count | Description |
|-------------|------------|-------|-------------|
| Deployable | 1-2 | 40 | Available for checkout |
| Deployed | 3-4 | 40 | Currently checked out |
| Undeployable | 5-6 | 10 | Under repair or broken |
| Pending | 7-8 | 5 | Pending approval or in transit |
| Archived | 9-10 | 5 | Retired or lost/stolen |

---

## 🐛 Troubleshooting

### Database Connection Issues

```bash
# Check if PostgreSQL is running
docker ps | grep postgres

# View PostgreSQL logs
docker logs postgres-db

# Test connection
docker exec -it postgres-db psql -U postgres -c "\l"
```

### Service Not Responding

```bash
# Check service logs
docker logs assets-service --tail 100

# Restart specific service
docker-compose -f docker-compose.dev.yml restart assets

# Check Kong routing
curl http://localhost:8444/services
curl http://localhost:8444/routes
```

### Migration Errors

```bash
# Reset migrations (development only)
docker exec -it assets-service python manage.py migrate assets_ms zero
docker exec -it assets-service python manage.py migrate
```

### Seeding Errors

```bash
# Clear all data first
docker exec -it assets-service python manage.py flush --no-input
docker exec -it contexts-service python manage.py flush --no-input

# Re-seed in correct order
docker exec -it contexts-service python manage.py seed_all_contexts
docker exec -it assets-service python manage.py seed_all
```

---

## 📚 Related Documentation

- `ALL_SEEDERS_OVERVIEW.md` - Complete seeders reference
- `QUICK_START_SEEDING.md` - Quick seeding guide
- `SEEDERS_SUMMARY.md` - Detailed seeder descriptions
- `backend/assets/SEEDERS_REFERENCE.md` - Assets seeder details
- `backend/contexts/SEEDERS_REFERENCE.md` - Contexts seeder details
