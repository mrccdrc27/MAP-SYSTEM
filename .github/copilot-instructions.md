# Copilot Instructions for Ticket Tracking System

## System Overview

This is a **Django-based microservices architecture** with:
- **5 Django services**: `auth/`, `ticket_service/`, `workflow_api/`, `messaging/`, `notification_service/`
- **React frontend** (Vite) in `frontend/`
- **RabbitMQ** for async message queuing, **Celery** for background tasks
- **PostgreSQL** shared across services (separate logical DBs per service)
- **Docker Compose** orchestration in `Docker/`

### Service Responsibilities

| Service | Port | Key Responsibility |
|---------|------|---------------------|
| **auth** | 8000 | User auth, role/permission management, TTS/HDTS system data |
| **ticket_service** | 8004 | Ticket CRUD, file attachments, Celery task enqueue |
| **workflow_api** | 8002 | Workflow orchestration, step execution, assignment notifications |
| **messaging** | (internal) | WebSocket comments, real-time messaging |
| **notification_service** | (internal) | Async notification delivery via Celery workers |
| **frontend** | 1000 | React UI for agents & admins |

## Architecture Patterns

### Microservices Communication

1. **Synchronous**: Direct HTTP REST calls between services using service URLs from Docker network (e.g., `http://auth-service:8000`)
2. **Asynchronous**: Via RabbitMQ queues using Celery `shared_task`
   - Task routing configured in Django settings: `CELERY_TASK_ROUTES`
   - Services send inter-service tasks with `app.send_task(task_name, kwargs={...}, queue='queue_name')`
   - Example: `ticket_service` → enqueues to `TICKET_TASKS_PRODUCTION` queue → `workflow-worker` consumes

### Key Data Flows

**Ticket Creation Flow:**
```
Frontend (API POST) → ticket_service (save to DB) → enqueue Celery task 
  → RabbitMQ → workflow-worker (consumes) → workflow_api (process workflow)
```

**Role/User Sync:**
- TTS (Ticket Tracking System) and HDTS systems have separate role hierarchies
- `auth/tts/views.py` provides role-based user lookups via `UserIDsByRoleView`
- Round-robin user assignment uses `UserSystemRole` model for system-specific role memberships

### Database Pattern

- Single PostgreSQL instance with **logical databases** per service (Docker env vars set DB names)
- Service models are Django ORM; access is **NOT direct** between services—use HTTP or task queues
- `schema_models.py` in `workflow_api/` documents auto-generated legacy model schema

## Setup & Development Workflow

### Initial Setup

```bash
# Navigate to workspace root
cd /path/to/Ticket-Tracking-System

# Run Docker setup (builds images, starts all services)
bash ./Scripts/docker.sh

# Or manual start with docker-compose
cd Docker
docker-compose build
docker-compose up -d
```

### Service Startup (Local Development)

Each service has `start.sh` and migration scripts. Standard sequence:
```bash
cd <service_name>
python manage.py makemigrations
python manage.py migrate
python manage.py seed_<entity>  # seed_tickets, seed_workflows2, seed_accounts, seed_systems, seed_tts, etc.
python manage.py runserver 0.0.0.0:<port>
```

Celery workers (required for async tasks):
```bash
# In workflow_api or ticket_service directories
celery -A <service_name> worker --pool=solo --loglevel=info -Q <queue_names>
```

### Environment Variables

Each service reads from `.env` in its directory (auto-created from `.env.example`).

**Key vars** (defined in `ENVIRONMENT_STANDARDIZATION_REPORT.md`):
- `DJANGO_ENV`: `development` or `production` (affects debug mode, allowed hosts, DB behavior)
- `DATABASE_URL`: PostgreSQL URI (preferred for Railway/managed DBs)
- `DJANGO_CELERY_BROKER_URL`: RabbitMQ connection (e.g., `amqp://admin:admin@localhost:5672/`)
- `DJANGO_AUTH_SERVICE`, `DJANGO_USER_SERVICE`: Service discovery URLs

## Common Patterns & Conventions

### Django Views (REST Framework)

- Most views inherit from `APIView` (not ViewSets) for custom control
- Permission classes used: `IsAuthenticated`, `AllowAny`, custom `IsSystemAdminOrSuperUser` (`auth/permissions.py`)
- Auth via JWT (`rest_framework_simplejwt`); token in Authorization header

### Celery Task Naming

- **Shared tasks**: `@shared_task(name="module.tasks.task_name")`
- **Service-to-service**: Use full task path when sending: `app.send_task("notifications.tasks.create_assignment_notification", ...)`
- **Queue routing**: Define in `CELERY_TASK_ROUTES` in service settings; specific queues per task

### Role/Permission System

- `UserSystemRole` links users to roles within a system (TTS/HDTS/etc)
- `IsSystemAdminOrSuperUser` permission allows superusers and system admins (role='Admin' in UserSystemRole)
- Example permission check: `auth/permissions.py` restricts writes to custom roles only

### Serializers

- Located in each Django app's `serializers.py`
- Often extend `ModelSerializer` for CRUD; use custom Serializer for non-model data
- Token serializer: `CustomTokenObtainPairSerializer` extends `TokenObtainPairSerializer`

## Testing & Validation

- Test files: `test_*.py` at service root (e.g., `workflow_api/test_audit_logging.py`, `auth/test_invitation_email.py`)
- Run audit log tests: `python manage.py shell < test_audit_logging.py`
- Seed data commands are available for local testing; see `Scripts/` for full orchestration examples

## File Organization

```
.github/                          # Workflows & CI/CD
Docker/                           # docker-compose.yml, Dockerfile configs
Scripts/                          # Setup scripts (docker.sh, init.sh, reset.sh)
architecture/                     # PlantUML diagrams (use_cases, sequence, class diagrams)
auth/, ticket_service/, workflow_api/  # Django services (each has manage.py, requirements.txt, .env.example)
frontend/                         # React app (src/, package.json, vite.config.js)
```

## Debugging Tips

1. **Service not responding**: Check if Celery worker is running (logs in terminal)
2. **Database issues**: Verify `DATABASE_URL` or individual `PG*` vars; check migrations run with `python manage.py migrate`
3. **Message queue issues**: Check RabbitMQ at `http://localhost:15672` (default: admin/admin)
4. **JWT auth failures**: Ensure token in `Authorization: Bearer <token>` header; check token not expired
5. **CORS errors**: Verify `CORS_ALLOWED_ORIGINS` in service settings includes frontend URL

## Useful Commands

```bash
# Check user system access
python auth/check_access.py

# View environment variables loaded
python ticket_service/show_env.py

# Seed data (run from service directory)
python manage.py seed_tickets --force

# Docker logs for a service
docker logs <container_name>

# Celery task queue inspection (if redis/broker running)
celery -A workflow_api inspect active_queues
```

## When Adding New Features

1. **Inter-service call?** Use HTTP to `/api/` endpoint with service discovery URL + proper auth
2. **Background job?** Create `@shared_task` in service; add queue to `CELERY_TASK_ROUTES` if not default
3. **New role/permission?** Add to `UserSystemRole` in auth service; use `IsSystemAdminOrSuperUser` for gating
4. **Data migration?** Django models (each service), then `python manage.py makemigrations && migrate`
5. **Frontend change?** React in `frontend/src/`; API calls via `frontend/src/api/` (axios configured)
