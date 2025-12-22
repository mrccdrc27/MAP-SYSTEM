# Django Services Environment Variable Standardization Report

## Summary
All 5 Django microservices have been standardized to use a consistent set of environment variables with proper fallbacks and production environment detection.

## Services Updated
1. **auth** - Authentication Service
2. **ticket_service** - Ticket Management Service
3. **workflow_api** - Workflow Management Service
4. **messaging** - Messaging/WebSocket Service
5. **notification_service** - Notification Service

---

## Standardized Environment Variables

### Core Django Settings (All Services)

| Variable | Purpose | Development Default | Production Default | Required |
|----------|---------|---------------------|--------------------| --- |
| `DJANGO_ENV` | Environment trigger | `development` | `production` | No |
| `DJANGO_DEBUG` | Debug mode | `True` | `False` | No |
| `DJANGO_SECRET_KEY` | Django secret key | `insecure-test-key` | Required | Yes (prod) |
| `DJANGO_ALLOWED_HOSTS` | Allowed hosts | `localhost,127.0.0.1,...` | `localhost` | No |

### Database Settings

| Variable | Purpose | Default | Notes |
|----------|---------|---------|-------|
| `DATABASE_URL` | PostgreSQL connection string | (None) | Used for Railway and managed databases |
| `PGHOST` | PostgreSQL host | `localhost` | Fallback for legacy setup |
| `PGPORT` | PostgreSQL port | `5432` | Fallback for legacy setup |
| `POSTGRES_DB` | Database name | `service_db` | Fallback for legacy setup |
| `POSTGRES_USER` | Database user | `postgres` | Fallback for legacy setup |
| `POSTGRES_PASSWORD` | Database password | (Empty) | Fallback for legacy setup |

**Database Behavior:**
- **Priority 1:** Uses `DATABASE_URL` if provided (Railway, managed services)
- **Priority 2:** In production with `DJANGO_ENV=production`, uses individual PostgreSQL variables
- **Fallback:** Development uses SQLite (`db.sqlite3`)

### Email Configuration (Auth, Notification, Messaging)

| Variable | Purpose | Development Default |
|----------|---------|---------------------|
| `DJANGO_EMAIL_BACKEND` | Email backend | `console.EmailBackend` |
| `DJANGO_EMAIL_HOST` | SMTP host | `smtp.gmail.com` |
| `DJANGO_EMAIL_PORT` | SMTP port | `587` |
| `DJANGO_EMAIL_HOST_USER` | SMTP user | (Empty) |
| `DJANGO_EMAIL_HOST_PASSWORD` | SMTP password | (Empty) |
| `DJANGO_EMAIL_USE_TLS` | Use TLS | `True` |
| `DJANGO_DEFAULT_FROM_EMAIL` | Default sender | `noreply@service.com` |

### CORS Configuration (All Services)

| Variable | Purpose | Development Default |
|----------|---------|---------------------|
| `DJANGO_CORS_ALLOWED_ORIGINS` | Allowed origins | Varies by service |
| `DJANGO_CORS_ALLOW_ALL_ORIGINS` | Allow all origins | `False` (except ticket_service) |
| `DJANGO_CORS_ALLOW_CREDENTIALS` | Allow credentials | `True` |

**Service-Specific CORS Defaults:**
- **auth, workflow_api, notification_service:** `http://localhost:1000,http://127.0.0.1:1000,http://localhost:3000,http://127.0.0.1:3000`
- **messaging:** Includes additional dev ports (8000, 5173)
- **ticket_service:** Allows all origins in development

### Celery Configuration (All Services)

| Variable | Purpose | Default |
|----------|---------|---------|
| `DJANGO_CELERY_BROKER_URL` | Message broker | `amqp://admin:admin@localhost:5672/` |
| `DJANGO_NOTIFICATION_QUEUE` | Default queue | `notification-queue` |
| `DJANGO_INAPP_NOTIFICATION_QUEUE` | In-app queue | `inapp-notification-queue` |

### Service-Specific Variables

#### Auth Service
- `TTS_SYSTEM_URL`, `AMS_SYSTEM_URL`, `HDTS_SYSTEM_URL`, `BMS_SYSTEM_URL` - System URLs
- `DJANGO_SESSION_COOKIE_SECURE`, `DJANGO_CSRF_COOKIE_SECURE` - Cookie security
- `DJANGO_CSRF_TRUSTED_ORIGINS` - CSRF trusted origins

#### Workflow API
- `DJANGO_AUTH_SERVICE_URL` - Auth service URL
- `DJANGO_NOTIFICATION_SERVICE_URL`, `DJANGO_NOTIFICATION_SERVICE_BROKER_URL` - Notification service URLs
- `DJANGO_TTS_SERVICE_URL` - TTS service URL
- `DJANGO_TICKET_STATUS_QUEUE` - Status queue

#### Messaging Service
- `DJANGO_MEDIA_BASE_URL` - Media base URL for WebSocket messages
- `FILE_UPLOAD_MAX_MEMORY_SIZE` - Max upload size

#### Notification Service
- `DJANGO_NOTIFICATION_SERVICE_PORT` - Service port
- `DJANGO_AUTH_SERVICE_URL` - Auth service URL
- `DJANGO_NOTIFICATION_API_KEYS` - API keys for authentication
- `DJANGO_API_KEY` - In-app notification API key
- `DJANGO_JWT_SHARED_SECRET_KEY` - JWT shared secret

---

## Code Changes Summary

### settings.py Changes Made to Each Service

#### 1. **Environment Detection**
```python
DJANGO_ENV = config('DJANGO_ENV', default='development')
IS_PRODUCTION = DJANGO_ENV.lower() == 'production'
```

#### 2. **SECRET_KEY with Production Validation**
```python
SECRET_KEY = config(
    'DJANGO_SECRET_KEY',
    default='insecure-test-secret-key-change-in-production' if not IS_PRODUCTION else None
)
if IS_PRODUCTION and not config('DJANGO_SECRET_KEY', default=None):
    raise ValueError('DJANGO_SECRET_KEY must be set in production environment')
```

#### 3. **DEBUG Mode with Environment-Based Defaults**
```python
DEBUG = config(
    'DJANGO_DEBUG', 
    default='False' if IS_PRODUCTION else 'True', 
    cast=lambda x: x.lower() in ('true', '1', 'yes')
)
```

#### 4. **Database Configuration with Multiple Fallbacks**
```python
if config('DATABASE_URL', default=''):
    # Use DATABASE_URL (Railway, managed services)
    DATABASES = { 'default': dj_database_url.config(...) }
elif DJANGO_ENV == 'production':
    # Production PostgreSQL
    DATABASES = { 'default': { 'ENGINE': 'django.db.backends.postgresql', ... } }
else:
    # Development SQLite
    DATABASES = { 'default': { 'ENGINE': 'django.db.backends.sqlite3', ... } }
```

#### 5. **CORS Settings with Dynamic Defaults**
```python
CORS_ALLOWED_ORIGINS = config(
    'DJANGO_CORS_ALLOWED_ORIGINS',
    default='http://localhost:1000,...' if not IS_PRODUCTION else 'https://yourdomain.com',
    cast=lambda v: [s.strip() for s in v.split(',')]
)
```

### .env.example Files Created/Updated

All `.env.example` files have been standardized with:
- Clear section headers
- Consistent variable naming with `DJANGO_` prefix
- Fallback/default values documented
- Production vs development guidance
- Service-specific configurations highlighted
- Example values with comments about when they're needed

---

## Production Deployment Checklist

When deploying to production (`DJANGO_ENV=production`), ensure:

1. ✅ Set `DJANGO_SECRET_KEY` to a strong, random value (required)
2. ✅ Set `DJANGO_DEBUG=False` 
3. ✅ Provide `DATABASE_URL` or individual PostgreSQL credentials
4. ✅ Configure `DJANGO_ALLOWED_HOSTS` with exact domains
5. ✅ Set `DJANGO_CORS_ALLOWED_ORIGINS` to specific frontend domains
6. ✅ Configure email settings with production SMTP
7. ✅ Set production API keys and secrets
8. ✅ Enable `DJANGO_SESSION_COOKIE_SECURE=True` and `DJANGO_CSRF_COOKIE_SECURE=True` with HTTPS
9. ✅ Configure RabbitMQ/Celery broker for production
10. ✅ Set all service-specific URLs to production endpoints

---

## Migration Guide for Existing Deployments

If you have existing `.env` files, update the variable names:

| Old Variable | New Variable | Services |
|--------------|--------------|----------|
| `SECRET_KEY` | `DJANGO_SECRET_KEY` | All |
| `DEBUG` | `DJANGO_DEBUG` | All |
| `ALLOWED_HOSTS` | `DJANGO_ALLOWED_HOSTS` | All |
| `ENVIRONMENT` | `DJANGO_ENV` | All |
| `EMAIL_BACKEND` | `DJANGO_EMAIL_BACKEND` | Auth, Notification, Messaging |
| `EMAIL_HOST` | `DJANGO_EMAIL_HOST` | Auth, Notification, Messaging |
| `EMAIL_PORT` | `DJANGO_EMAIL_PORT` | Auth, Notification, Messaging |
| `EMAIL_HOST_USER` | `DJANGO_EMAIL_HOST_USER` | Auth, Notification, Messaging |
| `EMAIL_HOST_PASSWORD` | `DJANGO_EMAIL_HOST_PASSWORD` | Auth, Notification, Messaging |
| `EMAIL_USE_TLS` | `DJANGO_EMAIL_USE_TLS` | Auth, Notification, Messaging |
| `DEFAULT_FROM_EMAIL` | `DJANGO_DEFAULT_FROM_EMAIL` | Auth, Notification, Messaging |
| `CORS_ALLOWED_ORIGINS` | `DJANGO_CORS_ALLOWED_ORIGINS` | All |
| `CELERY_BROKER_URL` | `DJANGO_CELERY_BROKER_URL` | All |

---

## Files Modified

### settings.py Files (5 total)
- ✅ `auth/auth/settings.py`
- ✅ `ticket_service/ticket_service/settings.py`
- ✅ `workflow_api/workflow_api/settings.py`
- ✅ `messaging/messaging/settings.py`
- ✅ `notification_service/notification_service/settings.py`

### .env.example Files (5 total)
- ✅ `auth/.env.example` - Updated
- ✅ `ticket_service/.env.example` - Created
- ✅ `workflow_api/.env.example` - Updated
- ✅ `messaging/.env.example` - Created
- ✅ `notification_service/.env.example` - Updated

---

## Key Features Implemented

### 1. ✅ Standardized Naming Convention
All services use `DJANGO_` prefix for core Django settings, making it clear which variables control the framework versus application-specific settings.

### 2. ✅ Environment-Based Defaults
- **Development defaults:** Insecure but convenient (debug=true, console email, sqlite db)
- **Production defaults:** Secure and require explicit configuration (debug=false, smtp required, postgresql required)

### 3. ✅ Fallback Mechanism
Multi-tier fallback for databases:
1. `DATABASE_URL` (ideal for managed services/Railway)
2. Individual PostgreSQL variables (for custom deployments)
3. SQLite (development default)

### 4. ✅ Production Safety Checks
Critical variables like `DJANGO_SECRET_KEY` will raise an error in production if not explicitly set, preventing accidental insecure deployments.

### 5. ✅ Clear Documentation
Every `.env.example` file includes:
- Section headers for logical grouping
- Development vs production guidance
- Service-specific configurations
- Example values with comments

---

## Next Steps

1. Update CI/CD pipelines to use new environment variable names
2. Update Docker/deployment configurations to set `DJANGO_ENV=production` for production builds
3. Update documentation to reference new variable names
4. Test each service with both `DJANGO_ENV=development` and `DJANGO_ENV=production`
5. Rotate or generate new `DJANGO_SECRET_KEY` values for production environments
