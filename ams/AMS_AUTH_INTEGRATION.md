# AMS Authentication Integration Quick Start

This guide explains how to set up and test the AMS (Asset Management System) integration with the centralized authentication service.

## Prerequisites

1. **Python 3.10+** installed
2. **PostgreSQL** running (for AMS services)
3. **Centralized Auth Service** running at `http://localhost:8000`

## Quick Start

### 1. Start Required Services

```powershell
# Terminal 1: Auth Service
cd auth
python manage.py runserver 0.0.0.0:8000

# Terminal 2: Contexts Service (start first - provides reference data)
cd ams/backend/contexts
python manage.py runserver 0.0.0.0:8003

# Terminal 3: Assets Service
cd ams/backend/assets
python manage.py runserver 0.0.0.0:8002
```

### 2. Run Setup and Test Script

```powershell
# Full setup (install deps, migrate, seed, test)
cd Scripts
.\setup_and_test_ams.ps1

# Or just run tests (if already set up)
.\setup_and_test_ams.ps1 -TestOnly

# Verbose output
.\setup_and_test_ams.ps1 -Verbose
```

### 3. Manual Testing

```powershell
# Run only the API test script
python Scripts/test_ams_api.py --verbose
```

## Test Credentials

After seeding, you can use these credentials:

| User | Email | Password | Role |
|------|-------|----------|------|
| Admin | amsadmin@test.local | amsadmin123 | AMS Admin |
| Operator | amsoperator@test.local | amsoperator123 | AMS Operator |

## Authentication Flow

```
1. User logs in via Auth Service (http://localhost:8000)
   POST /api/v1/users/login/
   Body: {"email": "...", "password": "..."}
   
2. Auth Service returns JWT token with roles:
   {
     "access": "eyJ...",
     "user": {
       "roles": [{"system": "ams", "role": "Admin"}]
     }
   }

3. Frontend includes token in requests to AMS services:
   Authorization: Bearer eyJ...

4. AMS services decode token using shared JWT_SIGNING_KEY
   and verify user has 'ams' system access
```

## Environment Configuration

Both AMS services need the same JWT signing key as the Auth service:

**ams/backend/assets/.env:**
```
DJANGO_JWT_SIGNING_KEY=signing-key-1234
```

**ams/backend/contexts/.env:**
```
DJANGO_JWT_SIGNING_KEY=signing-key-1234
```

**auth/.env:**
```
DJANGO_JWT_SIGNING_KEY=signing-key-1234
```

## Troubleshooting

### 401 Unauthorized
- Token expired or invalid
- Check JWT_SIGNING_KEY matches across services

### 403 Forbidden
- User authenticated but no AMS system access
- Run `python manage.py seed_ams` in auth service to create AMS users
- Or manually assign AMS role via admin

### Service Not Available
- Check service is running on correct port
- Check database connection

### Token Decode Error
- JWT_SIGNING_KEY mismatch between services
- Ensure all services use the same key

## API Endpoints

### Contexts Service (http://localhost:8003)

| Endpoint | Description |
|----------|-------------|
| `/categories/` | Asset categories |
| `/suppliers/` | Suppliers |
| `/manufacturers/` | Manufacturers |
| `/statuses/` | Asset/repair statuses |
| `/depreciations/` | Depreciation schedules |
| `/locations/` | Locations |
| `/employees/` | Employees |
| `/tickets/` | Checkout/checkin tickets |

### Assets Service (http://localhost:8002)

| Endpoint | Description |
|----------|-------------|
| `/products/` | Product catalog |
| `/assets/` | Asset inventory |
| `/components/` | Components |
| `/asset-checkouts/` | Checkout records |
| `/asset-checkins/` | Checkin records |
| `/audits/` | Audit records |
| `/repairs/` | Repair records |
| `/dashboard/metrics/` | Dashboard stats |

## Files Created/Modified

### New Files
- `ams/backend/assets/assets_ms/authentication.py`
- `ams/backend/contexts/contexts_ms/authentication.py`
- `auth/users/management/commands/seed_ams.py`
- `Scripts/test_ams_api.py`
- `Scripts/setup_and_test_ams.ps1`
- `Scripts/setup_and_test_ams.sh`

### Modified Files
- `ams/backend/assets/assets/settings.py` - Added JWT auth
- `ams/backend/contexts/contexts/settings.py` - Added JWT auth
- `ams/backend/assets/assets_ms/views.py` - Imported auth classes
- `ams/backend/contexts/contexts_ms/views.py` - Imported auth classes
- `ams/backend/assets/.env` - Added JWT_SIGNING_KEY
- `ams/backend/contexts/.env` - Added JWT_SIGNING_KEY
- `ams/backend/contexts/requirements.txt` - Added PyJWT
