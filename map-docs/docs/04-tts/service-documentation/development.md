---
title: Development Guide
sidebar_label: Development
sidebar_position: 6
---

# Development Guide

This guide covers setting up the TTS development environment, running tests, and common development workflows.

## Prerequisites

| Requirement | Version | Purpose |
|-------------|---------|---------|
| Python | 3.11+ | Backend runtime |
| Node.js | 18+ | Frontend build |
| PostgreSQL | 14+ | Database |
| RabbitMQ | 3.12+ | Message broker |
| Docker | 24+ | Containerization (optional) |

## Project Structure

```
tts/
├── frontend/              # React frontend (Vite)
│   ├── src/
│   │   ├── pages/         # Page components
│   │   ├── components/    # Shared components
│   │   ├── api/           # API client
│   │   └── hooks/         # Custom hooks
│   ├── package.json
│   └── vite.config.js
│
├── ticket_service/        # Ticket CRUD service
│   ├── tickets/           # Ticket app
│   ├── ticket_service/    # Django project settings
│   ├── manage.py
│   └── requirements.txt
│
├── workflow_api/          # Workflow orchestration
│   ├── workflow/          # Workflow definitions
│   ├── step/              # Steps and transitions
│   ├── task/              # Task management
│   ├── tickets/           # Ticket snapshots
│   ├── role/              # Role cache
│   ├── audit/             # Audit logging
│   ├── reporting/         # Analytics
│   ├── workflow_api/      # Django project settings
│   ├── manage.py
│   └── requirements.txt
│
├── messaging/             # WebSocket comments
│   ├── comments/          # Comment models
│   ├── messaging/         # Django settings
│   └── requirements.txt
│
├── notification_service/  # Notification delivery
│   ├── app/               # Notification app
│   └── requirements.txt
│
└── Docker/                # Docker configurations
    ├── docker-compose.yml
    └── docker-compose-dev.yml
```

## Local Setup

### 1. Clone and Setup Virtual Environment

```bash
# Clone repository
git clone <repo-url>
cd Ticket-Tracking-System/tts

# Create virtual environment
python -m venv venv
source venv/bin/activate  # Linux/Mac
# or
.\venv\Scripts\Activate.ps1  # Windows PowerShell
```

### 2. Install Dependencies

```bash
# Workflow API
cd workflow_api
pip install -r requirements.txt

# Ticket Service
cd ../ticket_service
pip install -r requirements.txt

# Frontend
cd ../frontend
npm install
```

### 3. Configure Environment

Copy example environment files:

```bash
# Workflow API
cp workflow_api/.env.example workflow_api/.env

# Ticket Service
cp ticket_service/.env.example ticket_service/.env
```

Edit `.env` files:

```env
# workflow_api/.env
DEBUG=True
DJANGO_ENV=development
SECRET_KEY=your-secret-key-here

# Database
DATABASE_URL=postgres://user:pass@localhost:5432/workflow_db
# Or individual settings:
POSTGRES_HOST=localhost
POSTGRES_PORT=5432
POSTGRES_DB=workflow_db
POSTGRES_USER=postgres
POSTGRES_PASSWORD=postgres

# RabbitMQ
DJANGO_CELERY_BROKER_URL=amqp://admin:admin@localhost:5672/

# Auth Service
DJANGO_AUTH_SERVICE=http://localhost:8000
```

### 4. Setup Database

```bash
# Workflow API
cd workflow_api
python manage.py migrate
python manage.py seed_workflows2  # Optional: seed sample workflows

# Ticket Service
cd ../ticket_service
python manage.py migrate
python manage.py seed_tickets  # Optional: seed sample tickets
```

### 5. Start Services

**Terminal 1 - Workflow API:**
```bash
cd workflow_api
python manage.py runserver 0.0.0.0:8002
```

**Terminal 2 - Ticket Service:**
```bash
cd ticket_service
python manage.py runserver 0.0.0.0:8004
```

**Terminal 3 - Celery Worker:**
```bash
cd workflow_api
celery -A workflow_api worker --pool=solo --loglevel=info -Q TICKET_TASKS_PRODUCTION,TTS_ROLE_SYNC_QUEUE
```

**Terminal 4 - Frontend:**
```bash
cd frontend
npm run dev
```

### 6. Access Services

| Service | URL |
|---------|-----|
| Frontend | http://localhost:1000 |
| Workflow API | http://localhost:8002 |
| Workflow Docs | http://localhost:8002/docs/ |
| Ticket Service | http://localhost:8004 |
| RabbitMQ UI | http://localhost:15672 |

## Docker Development

### Using Docker Compose

```bash
cd Docker
docker-compose -f docker-compose-dev.yml up -d
```

This starts:
- PostgreSQL
- RabbitMQ
- All TTS services

### Building Images

```bash
# Build all services
docker-compose build

# Build specific service
docker-compose build workflow-api
```

### Viewing Logs

```bash
# All services
docker-compose logs -f

# Specific service
docker-compose logs -f workflow-api
```

## Database Migrations

### Creating Migrations

```bash
cd workflow_api
python manage.py makemigrations workflow
python manage.py makemigrations step
python manage.py makemigrations task
python manage.py makemigrations role
```

### Applying Migrations

```bash
python manage.py migrate
```

### Resetting Database (Development)

```bash
# Drop and recreate
python manage.py flush --no-input
python manage.py migrate
python manage.py seed_workflows2
```

## Seeding Data

### Workflow Seeder

```bash
cd workflow_api
python manage.py seed_workflows2
```

Creates sample workflows:
- Asset Check-in
- Asset Check-out
- Budget Proposal
- IT Support Request

### Ticket Seeder

```bash
cd ticket_service
python manage.py seed_tickets
```

Creates sample tickets with various priorities and statuses.

### Role Seeder

```bash
cd workflow_api
python manage.py seed_role
```

Creates default roles:
- Admin
- Agent
- Technician
- Manager
- Ticket Coordinator

## Testing

### Running Tests

```bash
# Workflow API tests
cd workflow_api
python manage.py test

# Specific app
python manage.py test task

# With coverage
coverage run manage.py test
coverage report
```

### Test Files

```python
# workflow_api/task/tests.py
from django.test import TestCase
from rest_framework.test import APITestCase
from .models import Task, TaskItem

class TaskModelTest(TestCase):
    def setUp(self):
        # Setup test data
        pass
    
    def test_task_creation(self):
        # Test task creation
        pass

class TaskAPITest(APITestCase):
    def test_my_tasks_endpoint(self):
        response = self.client.get('/tasks/my-tasks/')
        self.assertEqual(response.status_code, 200)
```

### Audit Log Testing

```bash
cd workflow_api
python manage.py shell < test_audit_logging.py
```

## API Documentation

### OpenAPI Schema

Access at: http://localhost:8002/schema/

### Swagger UI

Access at: http://localhost:8002/docs/

### ReDoc

Access at: http://localhost:8002/redoc/

## Celery Development

### Starting Workers

```bash
# Single worker
celery -A workflow_api worker --loglevel=info

# With specific queues
celery -A workflow_api worker --pool=solo --loglevel=info \
  -Q TICKET_TASKS_PRODUCTION,WORKFLOW_TASKS_PRODUCTION

# Windows (solo pool required)
celery -A workflow_api worker --pool=solo --loglevel=info
```

### Monitoring (Flower)

```bash
pip install flower
celery -A workflow_api flower --port=5555
```

Access at: http://localhost:5555

### Testing Tasks

```python
# Django shell
from tickets.tasks import receive_ticket

# Synchronous execution (for debugging)
receive_ticket({'ticket_id': 'TEST001', 'subject': 'Test'})

# Async execution
receive_ticket.delay({'ticket_id': 'TEST001', 'subject': 'Test'})
```

## Frontend Development

### Project Setup

```bash
cd frontend
npm install
npm run dev
```

### Environment Variables

```env
# frontend/.env
VITE_API_URL=http://localhost:8002
VITE_TICKET_API_URL=http://localhost:8004
VITE_AUTH_API_URL=http://localhost:8000
```

### Building for Production

```bash
npm run build
```

### Linting

```bash
npm run lint
npm run lint:fix
```

## Debugging

### Django Debug Toolbar

Already configured in development:

```python
# settings.py
if DEBUG:
    INSTALLED_APPS += ['debug_toolbar']
    MIDDLEWARE += ['debug_toolbar.middleware.DebugToolbarMiddleware']
```

### Logging Configuration

```python
# settings.py
LOGGING = {
    'version': 1,
    'handlers': {
        'console': {
            'class': 'logging.StreamHandler',
        },
        'file': {
            'class': 'logging.FileHandler',
            'filename': 'logs/debug.log',
        },
    },
    'loggers': {
        'workflow': {
            'handlers': ['console', 'file'],
            'level': 'DEBUG',
        },
        'task': {
            'handlers': ['console', 'file'],
            'level': 'DEBUG',
        },
    },
}
```

### Common Issues

#### RabbitMQ Connection Refused

```bash
# Check RabbitMQ is running
sudo systemctl status rabbitmq-server

# Start if needed
sudo systemctl start rabbitmq-server
```

#### Database Connection Error

```bash
# Check PostgreSQL
sudo systemctl status postgresql

# Verify credentials in .env
```

#### JWT Validation Failing

1. Ensure Auth Service is running on port 8000
2. Check `DJANGO_AUTH_SERVICE` URL
3. Verify cookies are being sent

## Code Style

### Python

Follow PEP 8 with these tools:

```bash
# Install
pip install black flake8 isort

# Format
black workflow_api/
isort workflow_api/

# Lint
flake8 workflow_api/
```

### JavaScript

ESLint configuration in `frontend/eslint.config.js`:

```bash
npm run lint
npm run format
```

## Git Workflow

### Branch Naming

```
feature/add-sla-alerts
bugfix/fix-task-transition
hotfix/security-patch
```

### Commit Messages

```
feat(task): add escalation support
fix(workflow): correct SLA calculation
docs(api): update endpoint documentation
test(task): add transition tests
```

## Environment Variables Reference

### Workflow API

| Variable | Default | Description |
|----------|---------|-------------|
| `DEBUG` | `False` | Django debug mode |
| `DJANGO_ENV` | `production` | Environment name |
| `SECRET_KEY` | - | Django secret key |
| `DATABASE_URL` | - | PostgreSQL connection string |
| `DJANGO_CELERY_BROKER_URL` | - | RabbitMQ connection string |
| `DJANGO_AUTH_SERVICE` | `http://localhost:8000` | Auth service URL |
| `ALLOWED_HOSTS` | `*` | Comma-separated allowed hosts |
| `CORS_ALLOWED_ORIGINS` | - | Comma-separated CORS origins |

### Ticket Service

| Variable | Default | Description |
|----------|---------|-------------|
| `DEBUG` | `False` | Django debug mode |
| `DATABASE_URL` | - | PostgreSQL connection string |
| `DJANGO_CELERY_BROKER_URL` | - | RabbitMQ connection string |
| `MEDIA_ROOT` | `media/` | File upload directory |

### Frontend

| Variable | Default | Description |
|----------|---------|-------------|
| `VITE_API_URL` | - | Workflow API base URL |
| `VITE_TICKET_API_URL` | - | Ticket Service base URL |
| `VITE_AUTH_API_URL` | - | Auth Service base URL |
