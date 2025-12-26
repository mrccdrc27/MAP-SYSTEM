---
title: Configuration Guide
sidebar_label: Configuration
sidebar_position: 2
---

# Auth Service Configuration Guide

This guide provides a complete reference for configuring the Auth Service, covering all environment variables, database options, email providers, and system integrations.

## Quick Start

### 1. Copy Environment Template

```bash
cd auth
cp .env.example .env
```

### 2. Minimal Development Setup

For local development with SQLite and console email:

```bash
# .env (minimal)
DJANGO_ENV=development
DJANGO_DEBUG=True
DJANGO_SECRET_KEY=dev-secret-key-change-me
DJANGO_JWT_SIGNING_KEY=jwt-signing-key-change-me
```

That's it! The service will use SQLite and print emails to console.

### 3. Start the Service

```bash
python manage.py migrate
python manage.py seed_systems
python manage.py runserver 0.0.0.0:8000
```

---

## Complete Environment Reference

### Core Django Settings

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `DJANGO_ENV` | ✅ | `development` | `development` or `production` |
| `DJANGO_DEBUG` | ❌ | `True` (dev) | Enable debug mode |
| `DJANGO_SECRET_KEY` | ✅ | - | Django cryptographic key (50+ chars) |
| `DJANGO_ALLOWED_HOSTS` | ❌ | `localhost,127.0.0.1` | Comma-separated allowed hosts |

```bash
# Example
DJANGO_ENV=production
DJANGO_DEBUG=False
DJANGO_SECRET_KEY=your-super-secret-key-at-least-50-characters-long
DJANGO_ALLOWED_HOSTS=auth.yourdomain.com,api.yourdomain.com
```

:::warning Production Requirement
`DJANGO_SECRET_KEY` **must** be set in production. The service will refuse to start without it.
:::

---

### JWT Authentication

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `DJANGO_JWT_SIGNING_KEY` | ✅ | `SECRET_KEY` | Key for signing JWT tokens |

```bash
# Must be shared across all services that validate tokens
DJANGO_JWT_SIGNING_KEY=shared-jwt-signing-key-for-all-services
```

**Token Lifetimes (hardcoded in settings.py):**
- Access Token: 8 hours
- Refresh Token: 7 days

:::tip Cross-Service Token Validation
All downstream services (TTS, AMS, BMS) must use the **same** `DJANGO_JWT_SIGNING_KEY` to validate tokens.
:::

---

## Database Configuration

The Auth Service supports three database configurations, selected automatically based on environment.

### Option 1: SQLite (Development Default)

No configuration needed. Used automatically when `DJANGO_ENV=development` and no `DATABASE_URL` is set.

```bash
# Just set this (or omit DATABASE_URL)
DJANGO_ENV=development
```

Database file: `auth/db.sqlite3`

---

### Option 2: PostgreSQL via DATABASE_URL (Recommended)

Best for production and cloud platforms (Railway, Heroku, etc.)

```bash
DATABASE_URL=postgresql://username:password@hostname:5432/database_name
```

**Examples:**

```bash
# Local PostgreSQL
DATABASE_URL=postgresql://postgres:password@localhost:5432/auth_db

# Railway
DATABASE_URL=postgresql://postgres:xxxx@containers-us-west-xxx.railway.app:5432/railway

# Supabase
DATABASE_URL=postgresql://postgres:[password]@db.[project].supabase.co:5432/postgres

# AWS RDS
DATABASE_URL=postgresql://admin:password@mydb.xxxx.us-east-1.rds.amazonaws.com:5432/authdb
```

---

### Option 3: PostgreSQL via Individual Variables

Legacy approach using separate environment variables:

```bash
DJANGO_ENV=production
POSTGRES_DB=auth_db
POSTGRES_USER=postgres
POSTGRES_PASSWORD=your-secure-password
PGHOST=localhost
PGPORT=5432
```

:::note Priority
`DATABASE_URL` takes priority over individual variables if both are set.
:::

---

## Email Configuration

The service supports multiple email backends with automatic fallback.

### Priority Order

1. **SendGrid** (if `SENDGRID_ENABLED=True` and `SENDGRID_API_KEY` set)
2. **SMTP** (production fallback)
3. **Console** (development fallback - prints to terminal)

---

### Option 1: SendGrid (Recommended for Production)

```bash
# SendGrid Configuration
SENDGRID_API_KEY=SG.xxxxxxxxxxxxxxxxxxxx
SENDGRID_FROM_EMAIL=noreply@yourdomain.com
SENDGRID_FROM_NAME=TicketFlow
SENDGRID_ENABLED=True
SUPPORT_EMAIL=support@yourdomain.com

# Optional: Enable sandbox mode in debug (emails not actually sent)
SENDGRID_SANDBOX_MODE_IN_DEBUG=False
```

**Setup Steps:**
1. Create account at [sendgrid.com](https://sendgrid.com)
2. Go to Settings → API Keys → Create API Key
3. Select "Full Access" or "Restricted Access" with Mail Send permission
4. Copy the key (starts with `SG.`)
5. Verify your sender email address

---

### Option 2: Gmail SMTP

```bash
# Disable SendGrid first
SENDGRID_ENABLED=False

# Gmail SMTP Settings
DJANGO_EMAIL_BACKEND=django.core.mail.backends.smtp.EmailBackend
DJANGO_EMAIL_HOST=smtp.gmail.com
DJANGO_EMAIL_PORT=587
DJANGO_EMAIL_USE_TLS=True
DJANGO_EMAIL_HOST_USER=your-email@gmail.com
DJANGO_EMAIL_HOST_PASSWORD=your-app-password
DJANGO_DEFAULT_FROM_EMAIL=your-email@gmail.com
```

**Gmail App Password Setup:**
1. Enable 2-Step Verification on your Google account
2. Go to [App Passwords](https://myaccount.google.com/apppasswords)
3. Generate a new app password for "Mail"
4. Use this 16-character password (not your regular password)

---

### Option 3: Console Backend (Development)

Emails are printed to the terminal instead of being sent.

```bash
DJANGO_ENV=development
SENDGRID_ENABLED=False
# No other email config needed
```

---

### Option 4: Custom SMTP Server

```bash
SENDGRID_ENABLED=False
DJANGO_EMAIL_BACKEND=django.core.mail.backends.smtp.EmailBackend
DJANGO_EMAIL_HOST=mail.yourdomain.com
DJANGO_EMAIL_PORT=587
DJANGO_EMAIL_USE_TLS=True
DJANGO_EMAIL_HOST_USER=noreply@yourdomain.com
DJANGO_EMAIL_HOST_PASSWORD=smtp-password
DJANGO_DEFAULT_FROM_EMAIL=noreply@yourdomain.com
```

---

## System URLs Configuration

Configure URLs for downstream systems (used for redirects after login):

```bash
# Frontend URLs for each system
TTS_SYSTEM_URL=http://localhost:1000
AMS_SYSTEM_URL=http://localhost:3001
HDTS_SYSTEM_URL=http://localhost:5173/employee/home
BMS_SYSTEM_URL=http://localhost:3002

# Fallback URL if system is unknown
DEFAULT_SYSTEM_URL=http://localhost:3000/dashboard
```

**Production Example:**

```bash
TTS_SYSTEM_URL=https://tts.yourdomain.com
AMS_SYSTEM_URL=https://ams.yourdomain.com
HDTS_SYSTEM_URL=https://helpdesk.yourdomain.com
BMS_SYSTEM_URL=https://budget.yourdomain.com
DEFAULT_SYSTEM_URL=https://app.yourdomain.com/dashboard
```

---

## Frontend & Cookie Configuration

```bash
# Frontend URL (for email links, CORS)
FRONTEND_URL=http://localhost:3000

# Cookie domain (set to your domain in production)
COOKIE_DOMAIN=localhost

# Cookie security (set to True with HTTPS in production)
DJANGO_SESSION_COOKIE_SECURE=False
DJANGO_CSRF_COOKIE_SECURE=False
```

**Production Example:**

```bash
FRONTEND_URL=https://app.yourdomain.com
COOKIE_DOMAIN=.yourdomain.com
DJANGO_SESSION_COOKIE_SECURE=True
DJANGO_CSRF_COOKIE_SECURE=True
```

:::tip Subdomain Cookies
Use `.yourdomain.com` (with leading dot) for `COOKIE_DOMAIN` to share cookies across subdomains.
:::

---

## CORS & Security

```bash
# Allowed origins for CORS (comma-separated)
DJANGO_CORS_ALLOWED_ORIGINS=http://localhost:1000,http://localhost:3000

# Trusted origins for CSRF (comma-separated)
DJANGO_CSRF_TRUSTED_ORIGINS=http://localhost:1000,http://localhost:3000
```

**Production Example:**

```bash
DJANGO_CORS_ALLOWED_ORIGINS=https://tts.yourdomain.com,https://ams.yourdomain.com
DJANGO_CSRF_TRUSTED_ORIGINS=https://tts.yourdomain.com,https://ams.yourdomain.com
```

---

## Message Queue (Celery/RabbitMQ)

Required for background tasks (user sync, email queuing):

```bash
# RabbitMQ connection URL
DJANGO_CELERY_BROKER_URL=amqp://admin:admin@localhost:5672/

# Or with virtual host
DJANGO_CELERY_BROKER_URL=amqp://user:password@rabbitmq.yourdomain.com:5672/vhost
```

**CloudAMQP (Managed RabbitMQ):**

```bash
DJANGO_CELERY_BROKER_URL=amqps://user:password@fox.rmq.cloudamqp.com/vhost
```

**Start Worker:**

```bash
# Linux/Mac
celery -A auth worker --loglevel=info

# Windows (use solo pool)
celery -A auth worker --pool=solo --loglevel=info
```

---

## reCAPTCHA Configuration

Protects login forms from bots:

```bash
# Google reCAPTCHA v2 keys
RECAPTCHA_SITE_KEY=6LdbGyMsAAAAAxxxxxxxxxxxxxxxxxxxxxxx
RECAPTCHA_SECRET_KEY=6LdbGyMsAAAAAxxxxxxxxxxxxxxxxxxxxxxx

# Disable for development/testing
RECAPTCHA_ENABLED=False
```

**Setup Steps:**
1. Go to [Google reCAPTCHA Admin](https://www.google.com/recaptcha/admin)
2. Register a new site with reCAPTCHA v2 ("I'm not a robot" Checkbox)
3. Add your domains
4. Copy Site Key and Secret Key

---

## Complete Configuration Examples

### Development (Minimal)

```bash
# .env
DJANGO_ENV=development
DJANGO_DEBUG=True
DJANGO_SECRET_KEY=dev-only-secret-key-not-for-production
DJANGO_JWT_SIGNING_KEY=dev-jwt-key-share-with-other-services

# Optional: Enable email sending in dev
# SENDGRID_API_KEY=SG.xxx
# SENDGRID_FROM_EMAIL=dev@yourdomain.com
```

### Development (Full Features)

```bash
# .env
DJANGO_ENV=development
DJANGO_DEBUG=True
DJANGO_SECRET_KEY=dev-secret-key-change-in-production
DJANGO_JWT_SIGNING_KEY=shared-jwt-signing-key

# PostgreSQL (local)
DATABASE_URL=postgresql://postgres:password@localhost:5432/auth_db

# Email (SendGrid)
SENDGRID_API_KEY=SG.your-api-key
SENDGRID_FROM_EMAIL=noreply@yourdomain.com
SENDGRID_ENABLED=True

# RabbitMQ
DJANGO_CELERY_BROKER_URL=amqp://admin:admin@localhost:5672/

# reCAPTCHA (disabled for dev)
RECAPTCHA_ENABLED=False

# Frontend
FRONTEND_URL=http://localhost:3000
TTS_SYSTEM_URL=http://localhost:1000
```

### Production

```bash
# .env
DJANGO_ENV=production
DJANGO_DEBUG=False
DJANGO_SECRET_KEY=your-production-secret-key-minimum-50-characters
DJANGO_JWT_SIGNING_KEY=production-jwt-signing-key-shared-across-services
DJANGO_ALLOWED_HOSTS=auth.yourdomain.com,api.yourdomain.com

# PostgreSQL
DATABASE_URL=postgresql://user:password@db.yourdomain.com:5432/auth_prod

# Email
SENDGRID_API_KEY=SG.production-api-key
SENDGRID_FROM_EMAIL=noreply@yourdomain.com
SENDGRID_FROM_NAME=YourApp
SUPPORT_EMAIL=support@yourdomain.com

# RabbitMQ
DJANGO_CELERY_BROKER_URL=amqps://user:password@rmq.yourdomain.com:5672/

# reCAPTCHA
RECAPTCHA_SITE_KEY=your-production-site-key
RECAPTCHA_SECRET_KEY=your-production-secret-key
RECAPTCHA_ENABLED=True

# Security
DJANGO_SESSION_COOKIE_SECURE=True
DJANGO_CSRF_COOKIE_SECURE=True
COOKIE_DOMAIN=.yourdomain.com

# CORS
DJANGO_CORS_ALLOWED_ORIGINS=https://tts.yourdomain.com,https://ams.yourdomain.com
DJANGO_CSRF_TRUSTED_ORIGINS=https://tts.yourdomain.com,https://ams.yourdomain.com

# System URLs
FRONTEND_URL=https://app.yourdomain.com
TTS_SYSTEM_URL=https://tts.yourdomain.com
AMS_SYSTEM_URL=https://ams.yourdomain.com
HDTS_SYSTEM_URL=https://helpdesk.yourdomain.com
BMS_SYSTEM_URL=https://budget.yourdomain.com
```

---

## Next Steps

- [Seeding Data](./seeding) - Create test data and users
- [Testing Guide](./testing) - Run and write tests
- [Docker Setup](./docker) - Containerized development
- [Troubleshooting](./troubleshooting) - Common issues and solutions
