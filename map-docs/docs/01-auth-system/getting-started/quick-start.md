---
title: Quick Start
sidebar_label: Quick Start
sidebar_position: 1
---

# Quick Start Guide

Get the Auth Service running in under 5 minutes.

## Prerequisites

| Requirement | Version | Required |
|-------------|---------|----------|
| Python | 3.10+ | ✅ |
| PostgreSQL | 14+ | ❌ (SQLite for dev) |
| RabbitMQ | 3.x | ❌ (for async tasks) |
| Node.js | 18+ | ❌ (for frontend) |

## 1. Clone & Setup Environment

```bash
# Navigate to auth service
cd auth

# Create virtual environment
python -m venv venv

# Activate (Windows PowerShell)
.\venv\Scripts\Activate.ps1

# Activate (Linux/Mac)
source venv/bin/activate

# Install dependencies
pip install -r requirements.txt
```

## 2. Configure Environment

```bash
# Copy the environment template
cp .env.example .env
```

For minimal development, the defaults work out of the box:
- **Database:** SQLite (no setup required)
- **Email:** Console output (prints to terminal)
- **Auth:** Development keys included

## 3. Initialize Database

```bash
# Run migrations
python manage.py migrate

# Seed systems (AMS, TTS, BMS, HDTS)
python manage.py seed_systems

# Seed test users and roles
python manage.py seed_tts
python manage.py seed_accounts
```

## 4. Start the Server

```bash
python manage.py runserver 0.0.0.0:8000
```

## 5. Verify Installation

### Check API Root

```bash
curl http://localhost:8000/api/v1/
```

Expected response:
```json
{
  "users": "http://localhost:8000/api/v1/users/",
  "roles": "http://localhost:8000/api/v1/roles/",
  "systems": "http://localhost:8000/api/v1/systems/",
  "system-roles": "http://localhost:8000/api/v1/system-roles/",
  "tts": "http://localhost:8000/api/v1/tts/",
  "hdts": "http://localhost:8000/api/v1/hdts/"
}
```

### Test Login

```bash
curl -X POST http://localhost:8000/api/v1/users/login/api/ \
  -H "Content-Type: application/json" \
  -d '{"email": "superadmin@example.com", "password": "admin"}'
```

### Access Admin Portal

- **Django Admin:** http://localhost:8000/admin/
- **Staff Login:** http://localhost:8000/staff/login/
- **API Docs:** http://localhost:8000/api/docs/ (development only)

## Default Test Credentials

| User | Email | Password | Access |
|------|-------|----------|--------|
| Superadmin | `superadmin@example.com` | `admin` | All systems |
| TTS Admin | `adminTTS@example.com` | `admin` | TTS only |
| AMS Admin | `adminAMS@example.com` | `admin` | AMS only |

:::warning Development Only
These credentials are for development/testing. Never use in production!
:::

## Next Steps

- [Configuration Guide](./configuration) - Database, email, and security setup
- [Seeding Data](./seeding) - Create test data and users
- [Testing Guide](./testing) - Run and write tests
- [Docker Setup](./docker) - Containerized development
