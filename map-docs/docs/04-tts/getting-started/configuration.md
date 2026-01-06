---
title: Configuration
sidebar_label: Configuration
sidebar_position: 2
---

# Configuration Guide

TTS uses environment variables for configuration. Each service has its own `.env` file.

## Workflow API Configuration

### Location

```
tts/workflow_api/.env
```

### Required Variables

| Variable | Description | Example |
|----------|-------------|---------|
| `SECRET_KEY` | Django secret key | `your-secret-key-here` |
| `DEBUG` | Debug mode | `True` or `False` |
| `DJANGO_ENV` | Environment name | `development` or `production` |

### Database Configuration

**Option 1: DATABASE_URL (Recommended)**

```env
DATABASE_URL=postgres://user:password@localhost:5432/workflow_db
```

**Option 2: Individual Settings**

```env
POSTGRES_HOST=localhost
POSTGRES_PORT=5432
POSTGRES_DB=workflow_db
POSTGRES_USER=postgres
POSTGRES_PASSWORD=postgres
```

**Option 3: SQLite (Development Only)**

```env
# Leave DATABASE_URL empty to use SQLite
# Database will be created as db.sqlite3
```

### RabbitMQ Configuration

```env
DJANGO_CELERY_BROKER_URL=amqp://admin:admin@localhost:5672/
```

### Service URLs

```env
DJANGO_AUTH_SERVICE=http://localhost:8000
DJANGO_NOTIFICATION_SERVICE=http://localhost:8003
```

### Security Settings

```env
ALLOWED_HOSTS=localhost,127.0.0.1,0.0.0.0
CORS_ALLOWED_ORIGINS=http://localhost:1000,http://localhost:3000
CSRF_TRUSTED_ORIGINS=http://localhost:1000
```

### Complete Example

```env
# workflow_api/.env

# Django
SECRET_KEY=your-very-secure-secret-key-here
DEBUG=True
DJANGO_ENV=development
ALLOWED_HOSTS=localhost,127.0.0.1,0.0.0.0

# Database
DATABASE_URL=postgres://postgres:postgres@localhost:5432/workflow_db

# RabbitMQ
DJANGO_CELERY_BROKER_URL=amqp://admin:admin@localhost:5672/

# Service Discovery
DJANGO_AUTH_SERVICE=http://localhost:8000

# CORS
CORS_ALLOWED_ORIGINS=http://localhost:1000
```

---

## Ticket Service Configuration

### Location

```
tts/ticket_service/.env
```

### Variables

```env
# Django
SECRET_KEY=your-ticket-service-secret-key
DEBUG=True
DJANGO_ENV=development

# Database
DATABASE_URL=postgres://postgres:postgres@localhost:5432/ticket_db

# RabbitMQ
DJANGO_CELERY_BROKER_URL=amqp://admin:admin@localhost:5672/

# File Storage
MEDIA_ROOT=/path/to/media/
MEDIA_URL=/media/
```

---

## Frontend Configuration

### Location

```
tts/frontend/.env
```

### Variables

```env
# API URLs
VITE_API_URL=http://localhost:8002
VITE_TICKET_API_URL=http://localhost:8004
VITE_AUTH_API_URL=http://localhost:8000

# Optional: WebSocket
VITE_WS_URL=ws://localhost:8002
```

---

## Notification Service Configuration

### Location

```
tts/notification_service/.env
```

### Variables

```env
# Django
SECRET_KEY=your-notification-service-key
DEBUG=True

# Database
DATABASE_URL=postgres://postgres:postgres@localhost:5432/notification_db

# RabbitMQ
DJANGO_CELERY_BROKER_URL=amqp://admin:admin@localhost:5672/

# Email (SendGrid)
SENDGRID_API_KEY=your-sendgrid-api-key
DEFAULT_FROM_EMAIL=noreply@yourcompany.com
```

---

## Docker Configuration

When using Docker, environment variables are set in `docker-compose.yml`:

```yaml
services:
  workflow-api:
    environment:
      - SECRET_KEY=${SECRET_KEY}
      - DATABASE_URL=postgres://postgres:postgres@db:5432/workflow_db
      - DJANGO_CELERY_BROKER_URL=amqp://admin:admin@rabbitmq:5672/
      - DJANGO_AUTH_SERVICE=http://auth-service:8000
```

---

## Environment-Specific Settings

### Development

```env
DEBUG=True
DJANGO_ENV=development
ALLOWED_HOSTS=localhost,127.0.0.1,0.0.0.0
```

### Production

```env
DEBUG=False
DJANGO_ENV=production
ALLOWED_HOSTS=your-domain.com
SECURE_SSL_REDIRECT=True
SESSION_COOKIE_SECURE=True
CSRF_COOKIE_SECURE=True
```

---

## Validating Configuration

### Check Environment

```python
# Django shell
python manage.py shell

>>> from django.conf import settings
>>> settings.DEBUG
True
>>> settings.DATABASES['default']['HOST']
'localhost'
```

### Test Database Connection

```bash
python manage.py dbshell
```

### Test RabbitMQ Connection

```bash
python manage.py shell

>>> from workflow_api.celery import app
>>> app.control.ping()
[{'celery@hostname': {'ok': 'pong'}}]
```

---

## Troubleshooting

### Database Connection Failed

1. Verify PostgreSQL is running
2. Check credentials in `.env`
3. Ensure database exists

```bash
# Create database
createdb workflow_db
```

### RabbitMQ Connection Refused

1. Verify RabbitMQ is running
2. Check connection URL
3. Verify credentials

```bash
# Check RabbitMQ status
rabbitmqctl status
```

### CORS Errors

1. Add frontend URL to `CORS_ALLOWED_ORIGINS`
2. Restart the server after changes

```env
CORS_ALLOWED_ORIGINS=http://localhost:1000,http://localhost:3000
```
