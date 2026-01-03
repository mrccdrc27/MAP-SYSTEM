---
title: Troubleshooting
sidebar_label: Troubleshooting
sidebar_position: 6
---

# Troubleshooting

Common issues and solutions when working with the Auth Service.

## Quick Diagnostics

```bash
cd auth

# Check Django can start
python manage.py check

# Verify database connection
python manage.py dbshell

# Check migrations status
python manage.py showmigrations
```

---

## Common Issues

### Authentication Errors

| Issue | Cause | Solution |
|-------|-------|----------|
| `401 Unauthorized` | Invalid/expired token | Re-login to get new tokens |
| `403 Forbidden` | User lacks permission | Check user's system roles |
| `No active account` | User not approved | Set `user.status = 'Approved'` |
| Cookie not sent | CORS/SameSite issue | Check CORS_ALLOWED_ORIGINS |

### Token Issues

**Symptoms:** "Token is invalid or expired"

```bash
# Check JWT settings in shell
python manage.py shell
```

```python
from django.conf import settings
print(settings.SIMPLE_JWT)
# Verify ACCESS_TOKEN_LIFETIME and REFRESH_TOKEN_LIFETIME
```

**Fix:** Ensure token is being refreshed before expiry:

```python
# Default token lifetime
ACCESS_TOKEN_LIFETIME = timedelta(minutes=60)
REFRESH_TOKEN_LIFETIME = timedelta(days=7)
```

---

### Database Issues

| Issue | Cause | Solution |
|-------|-------|----------|
| `relation does not exist` | Missing migrations | Run `python manage.py migrate` |
| `connection refused` | DB not running | Start PostgreSQL service |
| `authentication failed` | Wrong credentials | Check DATABASE_URL in .env |
| `no such table` (SQLite) | DB file missing | Run migrations |

**Reset Database (Development):**

```bash
# SQLite
rm db.sqlite3
python manage.py migrate

# PostgreSQL
python manage.py flush --no-input
python manage.py migrate
```

---

### Email Issues

| Issue | Cause | Solution |
|-------|-------|----------|
| Emails not sent | Console backend active | Set EMAIL_BACKEND properly |
| SendGrid 403 | Invalid API key | Check SENDGRID_API_KEY |
| Sender verification | Unverified sender | Verify sender in SendGrid |
| Timeout | Network issue | Check firewall/proxy |

**Debug Email Configuration:**

```bash
python manage.py shell
```

```python
from django.conf import settings
print('Backend:', settings.EMAIL_BACKEND)
print('From:', settings.DEFAULT_FROM_EMAIL)

# Test email
from django.core.mail import send_mail
send_mail(
    'Test',
    'Test message',
    settings.DEFAULT_FROM_EMAIL,
    ['your-email@example.com'],
    fail_silently=False
)
```

**Use Console Backend (Development):**

```bash
# .env
EMAIL_BACKEND=django.core.mail.backends.console.EmailBackend
```

---

### Celery Issues

| Issue | Cause | Solution |
|-------|-------|----------|
| Tasks not executing | Worker not running | Start Celery worker |
| Connection refused | RabbitMQ not running | Start RabbitMQ |
| Tasks stuck in queue | Worker crashed | Restart worker, check logs |

**Check RabbitMQ:**

```bash
# Access management UI
http://localhost:15672
# Default: admin/admin
```

**Start Worker (Windows):**

```bash
celery -A auth worker --pool=solo --loglevel=info
```

**Start Worker (Linux/Mac):**

```bash
celery -A auth worker --loglevel=info
```

---

### CORS Issues

**Symptoms:** "Access-Control-Allow-Origin" errors in browser

**Check Settings:**

```python
# auth/settings.py
CORS_ALLOWED_ORIGINS = [
    "http://localhost:1000",
    "http://localhost:3000",
]

CORS_ALLOW_CREDENTIALS = True
```

**Debug:**

```bash
python manage.py shell
```

```python
from django.conf import settings
print(settings.CORS_ALLOWED_ORIGINS)
print(settings.CORS_ALLOW_CREDENTIALS)
```

---

### Import Errors

| Issue | Solution |
|-------|----------|
| `ModuleNotFoundError` | Activate virtualenv: `source venv/bin/activate` |
| `No module named 'auth'` | Check PYTHONPATH includes project root |
| Circular import | Check import ordering in models |

---

## Debug Mode

### Enable Debug Mode

```bash
# .env
DJANGO_ENV=development
DJANGO_DEBUG=True
```

### Debug Logging

```python
# auth/settings.py - Add to LOGGING
LOGGING = {
    'version': 1,
    'disable_existing_loggers': False,
    'handlers': {
        'console': {
            'class': 'logging.StreamHandler',
        },
    },
    'loggers': {
        'django.request': {
            'handlers': ['console'],
            'level': 'DEBUG',
        },
        'django.db.backends': {
            'handlers': ['console'],
            'level': 'DEBUG',  # Shows SQL queries
        },
    },
}
```

### Debug Authentication

```bash
python testing/debug_auth.py
```

Or manually:

```python
from users.models import User
from rest_framework_simplejwt.tokens import RefreshToken

user = User.objects.get(email='superadmin@example.com')
print('User status:', user.status)
print('Is active:', user.is_active)

refresh = RefreshToken.for_user(user)
print('Access token:', str(refresh.access_token))
```

---

## Log Files

### Django Logs

Check console output or configure file logging:

```python
LOGGING = {
    'handlers': {
        'file': {
            'class': 'logging.FileHandler',
            'filename': 'debug.log',
        },
    },
    'root': {
        'handlers': ['file'],
        'level': 'DEBUG',
    },
}
```

### Celery Logs

```bash
celery -A auth worker --loglevel=debug
```

---

## Getting Help

### API Documentation

- Development: http://localhost:8000/api/docs/
- Swagger UI: http://localhost:8000/api/schema/swagger-ui/
- ReDoc: http://localhost:8000/api/schema/redoc/

### Check Current Settings

```python
python manage.py shell

from django.conf import settings
# Print any setting
print(settings.DEBUG)
print(settings.DATABASES)
print(settings.ALLOWED_HOSTS)
```

### Run Django System Check

```bash
python manage.py check
python manage.py check --deploy  # Production checks
```

---

## Factory Reset

If nothing works, complete reset:

```bash
cd auth

# Remove database
rm db.sqlite3

# Remove migrations (keep __init__.py)
find . -path "*/migrations/*.py" -not -name "__init__.py" -delete
find . -path "*/migrations/*.pyc" -delete

# Recreate migrations
python manage.py makemigrations users systems roles system_roles tts hdts ams

# Apply migrations
python manage.py migrate

# Re-seed
python manage.py seed_systems
python manage.py seed_tts
python manage.py seed_accounts

# Start fresh
python manage.py runserver
```

:::danger Destructive
This deletes all data and migrations! Only use in development.
:::
