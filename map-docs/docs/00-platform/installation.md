---
title: Installation Guide
sidebar_label: Installation
sidebar_position: 5
---

# Installation Guide

This guide covers setting up the MAP Industry Platform for local development.

## Prerequisites

| Requirement | Version | Purpose |
|-------------|---------|---------|
| Python | 3.10+ | Django services |
| Node.js | 18+ | Frontend applications |
| PostgreSQL | 14+ | Database |
| RabbitMQ | 3.x | Message queue |
| Docker | 20+ | Container orchestration (optional) |

## Quick Start (Docker)

The fastest way to run the entire platform:

```bash
# Clone repository
git clone https://github.com/your-org/Ticket-Tracking-System.git
cd Ticket-Tracking-System

# Run Docker setup script
bash ./Scripts/docker.sh

# Or use docker-compose directly
cd Docker
docker-compose up -d
```

Access services at:
- Auth: http://localhost:8000
- TTS Frontend: http://localhost:1000
- RabbitMQ: http://localhost:15672

## Manual Setup (Development)

### 1. Set Up Python Virtual Environment

```bash
# Create virtual environment
python -m venv venv

# Activate (Windows PowerShell)
.\venv\Scripts\Activate.ps1

# Activate (Linux/Mac)
source venv/bin/activate
```

### 2. Set Up Auth Service

```bash
cd auth

# Install dependencies
pip install -r requirements.txt

# Copy environment file
cp .env.example .env

# Run migrations
python manage.py migrate

# Seed initial data
python manage.py seed_systems
python manage.py seed_tts
python manage.py seed_accounts

# Start server
python manage.py runserver 0.0.0.0:8000
```

### 3. Start RabbitMQ

```bash
# Using Docker
docker run -d --name rabbitmq \
  -p 5672:5672 -p 15672:15672 \
  rabbitmq:3-management

# Default credentials: admin/admin
```

### 4. Start Other Services

Each service follows a similar pattern:

```bash
cd <service_directory>
pip install -r requirements.txt
cp .env.example .env
python manage.py migrate
python manage.py runserver 0.0.0.0:<port>
```

### 5. Start Frontend

```bash
cd tts/frontend
npm install
npm run dev
```

## Environment Configuration

### Auth Service (.env)

```bash
DJANGO_ENV=development
DJANGO_SECRET_KEY=your-secret-key-here
DJANGO_DEBUG=True
DJANGO_ALLOWED_HOSTS=localhost,127.0.0.1

# Database
DATABASE_URL=postgres://user:pass@localhost:5432/auth_db

# JWT
DJANGO_JWT_SIGNING_KEY=shared-jwt-key-across-services

# Email (optional for dev)
SENDGRID_API_KEY=your-sendgrid-key

# Message Queue
DJANGO_CELERY_BROKER_URL=amqp://admin:admin@localhost:5672/
```

### Shared Environment Variables

All services should share:
- `DJANGO_JWT_SIGNING_KEY` - For token validation
- `DJANGO_CELERY_BROKER_URL` - For RabbitMQ access
- `AUTH_SERVICE_URL` - For auth API calls

## Starting Celery Workers

For async tasks (notifications, workflow processing):

```bash
# In auth directory
celery -A auth worker --pool=solo --loglevel=info

# In ticket_service directory
celery -A ticket_service worker --pool=solo -Q TICKET_TASKS --loglevel=info
```

## Verify Installation

### Check Auth Service

```bash
curl http://localhost:8000/api/v1/
```

Expected response:
```json
{
  "users": "http://localhost:8000/api/v1/users/",
  "roles": "http://localhost:8000/api/v1/roles/",
  "systems": "http://localhost:8000/api/v1/systems/"
}
```

### Check RabbitMQ

Visit http://localhost:15672 and log in with `admin/admin`.

### Test Login

```bash
curl -X POST http://localhost:8000/api/v1/users/login/api/ \
  -H "Content-Type: application/json" \
  -d '{"email": "superadmin@example.com", "password": "admin"}'
```

## Common Issues

| Issue | Solution |
|-------|----------|
| Port already in use | Kill process or use different port |
| Database connection failed | Check PostgreSQL is running and credentials are correct |
| RabbitMQ connection refused | Ensure RabbitMQ is running on port 5672 |
| JWT validation failed | Verify `DJANGO_JWT_SIGNING_KEY` matches across services |

## Next Steps

- [Authentication Flow](./authentication-flow) - Understand how auth works
- [Auth System Overview](../auth-system/overview) - Deep dive into auth service
- [Development Guide](../auth-system/service-documentation/development) - Detailed dev setup
