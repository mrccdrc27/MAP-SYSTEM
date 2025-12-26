---
title: Quick Start
sidebar_label: Quick Start
sidebar_position: 1
---

# Quick Start Guide

Get TTS up and running in minutes.

## Prerequisites

- Python 3.11+
- Node.js 18+
- PostgreSQL 14+ (or SQLite for quick testing)
- RabbitMQ 3.12+

## 1. Clone the Repository

```bash
git clone <repository-url>
cd Ticket-Tracking-System/tts
```

## 2. Start Required Services

### RabbitMQ

```bash
# Using Docker
docker run -d --name rabbitmq -p 5672:5672 -p 15672:15672 rabbitmq:3-management

# Or install locally
# Ubuntu: sudo apt install rabbitmq-server
# Mac: brew install rabbitmq
```

### PostgreSQL (Optional - can use SQLite)

```bash
# Using Docker
docker run -d --name postgres -e POSTGRES_PASSWORD=postgres -p 5432:5432 postgres:14

# Create databases
createdb workflow_db
createdb ticket_db
```

## 3. Setup Workflow API

```bash
cd workflow_api

# Create virtual environment
python -m venv venv
source venv/bin/activate  # Linux/Mac
# .\venv\Scripts\Activate.ps1  # Windows

# Install dependencies
pip install -r requirements.txt

# Configure environment
cp .env.example .env
# Edit .env with your database credentials

# Run migrations
python manage.py migrate

# Seed sample data (optional)
python manage.py seed_workflows2

# Start server
python manage.py runserver 0.0.0.0:8002
```

## 4. Setup Ticket Service

```bash
cd ../ticket_service

# Activate same venv or create new
source ../workflow_api/venv/bin/activate

# Install dependencies
pip install -r requirements.txt

# Configure environment
cp .env.example .env

# Run migrations
python manage.py migrate

# Start server
python manage.py runserver 0.0.0.0:8004
```

## 5. Start Celery Worker

```bash
cd ../workflow_api

# Start worker for task processing
celery -A workflow_api worker --pool=solo --loglevel=info -Q TICKET_TASKS_PRODUCTION,TTS_ROLE_SYNC_QUEUE
```

## 6. Start Frontend

```bash
cd ../frontend

# Install dependencies
npm install

# Configure environment
cp .env.example .env

# Start development server
npm run dev
```

## 7. Access the Application

| Service | URL |
|---------|-----|
| **Frontend** | http://localhost:1000 |
| **Workflow API** | http://localhost:8002 |
| **API Docs** | http://localhost:8002/docs/ |
| **Ticket Service** | http://localhost:8004 |
| **RabbitMQ UI** | http://localhost:15672 (admin/admin) |

## Verify Installation

### Check Workflow API

```bash
curl http://localhost:8002/
```

Expected response:
```json
{
  "message": "Welcome to Workflow Management API",
  "version": "1.0",
  "workflows": "http://localhost:8002/workflows/",
  "tasks": "http://localhost:8002/tasks/"
}
```

### Check Celery Worker

The worker terminal should show:
```
[INFO] Connected to amqp://admin:**@localhost:5672//
[INFO] celery@hostname ready.
```

## Next Steps

- [Configuration Guide](./configuration) - Configure environment variables
- [Seeding Data](./seeding) - Populate with sample data
- [Development Guide](../service-documentation/development) - Full development setup
