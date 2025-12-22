# A.6 Deployment and Infrastructure

## Table of Contents

1. [Overview](#overview)
2. [Architecture Overview](#architecture-overview)
3. [System Architecture Diagram](#system-architecture-diagram)
4. [Deployment Strategy](#deployment-strategy)
5. [Infrastructure-as-Code](#infrastructure-as-code)
6. [Server Specifications](#server-specifications)
7. [Containerization Details](#containerization-details)
8. [Database Architecture](#database-architecture)
9. [Message Queue Setup](#message-queue-setup)
10. [Deployment Environments](#deployment-environments)
11. [Scaling Considerations](#scaling-considerations)
12. [Monitoring and Health Checks](#monitoring-and-health-checks)

---

## Overview

The Ticket Tracking System is deployed as a containerized microservices architecture using Docker and Docker Compose for orchestration. The system is designed to run on cloud platforms like Railway.app with support for both development and production environments.

**Key Deployment Characteristics:**
- **Architecture**: Microservices-based with 5 independent Django services
- **Containerization**: Docker for all services and dependencies
- **Orchestration**: Docker Compose for local/development; Railway for cloud
- **Database**: Centralized PostgreSQL with logical separation per service
- **Message Queue**: RabbitMQ for asynchronous task processing
- **Task Processing**: Celery workers for background jobs
- **Frontend**: React with Vite, containerized separately

---

## Architecture Overview

### System Components

The Ticket Tracking System consists of the following components:

#### **Microservices**

1. **Authentication Service** (auth)
   - Port: `8000` (container) → `8003` (host in docker-compose)
   - Responsibility: User authentication, role/permission management, TTS/HDTS system data
   - Framework: Django 5.2.4 + Django REST Framework
   - Database: PostgreSQL (authservice db)

2. **Ticket Service** (ticket_service)
   - Port: `7000` (container) → `8004` (host in docker-compose)
   - Responsibility: Ticket CRUD operations, file attachments, Celery task enqueue
   - Framework: Django 5.2.1 + Django REST Framework
   - Database: PostgreSQL (ticketmanagement db)

3. **Workflow API Service** (workflow_api)
   - Port: `8000` (container) → `8002` (host in docker-compose)
   - Responsibility: Workflow orchestration, step execution, assignment notifications
   - Framework: Django 5.2.1 + Django REST Framework
   - Database: PostgreSQL (workflowmanagement db)
   - Celery Worker: Consumes tasks from multiple queues

4. **Messaging Service** (messaging)
   - Port: `8001` (container) → `8005` (host in docker-compose)
   - Responsibility: WebSocket comments, real-time messaging
   - Framework: Django 5.2+ with Django Channels
   - Database: PostgreSQL (messagingservice db)

5. **Notification Service** (notification_service)
   - Port: (internal)
   - Responsibility: Async notification delivery via Celery workers
   - Framework: Python 3.11 with Celery
   - Task Queues: notification-queue, inapp-notification-queue

#### **Infrastructure Services**

1. **RabbitMQ Message Broker**
   - Port: `5672` (AMQP) → `5672` (host)
   - Port: `15672` (Management UI) → `15672` (host)
   - Credentials: admin/admin (default, change in production)
   - Purpose: Asynchronous message queueing between services
   - Persistence: Docker volume (rabbitmq_data)

2. **PostgreSQL Database**
   - Port: `5432` (container) → `5433` (host in docker-compose)
   - Credentials: postgres/postgrespass (default, change in production)
   - Purpose: Centralized data store with logical database separation
   - Persistence: Docker volume (postgres_data)
   - Databases:
     - authservice
     - ticketmanagement
     - workflowmanagement
     - messagingservice
     - notificationservice

3. **React Frontend (Vite)**
   - Port: `1000` (development)
   - Framework: React 18.2.0 + Vite 7.1.3
   - Purpose: User interface for agents and administrators

---

## System Architecture Diagram

```
┌──────────────────────────────────────────────────────────────────────────┐
│                           Client Layer                                   │
│  ┌──────────────┐     ┌──────────────┐     ┌──────────────┐              │
│  │ Admin UI     │     │ Agent UI     │     │ Mobile App   │              │
│  └──────────────┘     └──────────────┘     └──────────────┘              │
└──────────────────────────────────────────────────────────────────────────┘
                                  ↓ HTTP/REST
┌──────────────────────────────────────────────────────────────────────────┐
│                        API Gateway / Load Balancer                        │
└──────────────────────────────────────────────────────────────────────────┘
                                  ↓
┌──────────────────────────────────────────────────────────────────────────┐
│                    Microservices Layer (Docker Containers)               │
│                                                                          │
│  ┌──────────────────┐  ┌──────────────────┐  ┌──────────────────┐       │
│  │ Auth Service     │  │ Ticket Service   │  │ Workflow API     │       │
│  │ (Port 8000)      │  │ (Port 7000)      │  │ (Port 8000)      │       │
│  │                  │  │                  │  │                  │       │
│  │ • JWT Auth       │  │ • CRUD Tickets   │  │ • Orchestration  │       │
│  │ • User Mgmt      │  │ • Attachments    │  │ • Step Exec      │       │
│  │ • Roles/Perms    │  │ • Task Queue     │  │ • Notifications  │       │
│  │                  │  │                  │  │ • Celery Worker  │       │
│  └──────────────────┘  └──────────────────┘  └──────────────────┘       │
│          ↓                     ↓                      ↓                   │
│  ┌──────────────────┐  ┌──────────────────────────────────────┐          │
│  │ Messaging Service│  │ Notification Service                 │          │
│  │ (Port 8001)      │  │ (Celery Workers)                     │          │
│  │                  │  │                                      │          │
│  │ • WebSocket      │  │ • Async Notifications                │          │
│  │ • Real-time Chat │  │ • Email/SMS Delivery                 │          │
│  │ • Comments       │  │ • In-app Notifications               │          │
│  └──────────────────┘  └──────────────────────────────────────┘          │
│                                                                          │
│  ┌─────────────────────────────────────────────────────────────────┐    │
│  │ Message Queue & Task Processing Layer                           │    │
│  │                                                                 │    │
│  │ ┌──────────────────┐           ┌──────────────────────────┐   │    │
│  │ │ RabbitMQ Broker  │           │ Celery Task Queues       │   │    │
│  │ │ (Port 5672)      │ ←------→  │ • TICKET_TASKS_...       │   │    │
│  │ │ • AMQP Protocol  │           │ • notification-queue     │   │    │
│  │ │ • Mgmt UI (15672)│           │ • tts.role.sync          │   │    │
│  │ │ • Persistence    │           │ • workflow_seed_queue    │   │    │
│  │ └──────────────────┘           └──────────────────────────┘   │    │
│  └─────────────────────────────────────────────────────────────────┘    │
└──────────────────────────────────────────────────────────────────────────┘
                                  ↓
┌──────────────────────────────────────────────────────────────────────────┐
│                    Data Persistence Layer                                │
│                                                                          │
│  ┌──────────────────────┐           ┌──────────────────────────┐        │
│  │ PostgreSQL Database  │           │ Docker Volumes           │        │
│  │ (Port 5432)          │           │                          │        │
│  │                      │           │ • postgres_data          │        │
│  │ • authservice        │           │ • rabbitmq_data          │        │
│  │ • ticketmanagement   │           │ • media_files            │        │
│  │ • workflowmanagement │           │                          │        │
│  │ • messagingservice   │           └──────────────────────────┘        │
│  │ • notificationservice│                                               │
│  │                      │                                               │
│  │ Replication:         │                                               │
│  │ • Connection pooling │                                               │
│  │ • Health checks      │                                               │
│  │ • Backups            │                                               │
│  └──────────────────────┘                                               │
└──────────────────────────────────────────────────────────────────────────┘
```

---

## Deployment Strategy

### Strategy Type: Blue-Green Deployment with Rolling Updates

The system uses a **hybrid deployment strategy** combining elements of Blue-Green and Rolling deployments:

#### **Local Development: Docker Compose**

```
docker-compose up -d
```

- All services start simultaneously with staggered sleep (10-20 seconds)
- Allows dependent services to initialize before dependents
- Automatic restart on failure
- Volume-based persistence for databases and media

#### **Production Deployment: Railway.app**

Railway uses a continuous deployment model:

1. **Code Push to Repository**
   ```
   git push origin <branch>
   ```

2. **GitHub Actions Trigger**
   - Runs test suite
   - Builds Docker images
   - Pushes to Railway registry

3. **Railway Auto-Deployment**
   - Deploys new image to production
   - Runs database migrations automatically
   - Blue-green deployment (old container runs until new is healthy)
   - Automatic rollback if health checks fail

#### **Service Update Sequence**

```
Phase 1: Infrastructure Services (Sequential)
├── PostgreSQL (must be running first)
└── RabbitMQ (must be running before services)

Phase 2: Backend Services (Parallel with stagger)
├── Auth Service (8 sec sleep)
├── Ticket Service (10 sec sleep)
├── Workflow API (10 sec sleep)
├── Messaging Service (10 sec sleep)
└── Notification Service (10 sec sleep)

Phase 3: Celery Workers (Dependent on infrastructure)
├── Workflow Worker (20 sec sleep, high priority)
└── Notification Worker (optional, scalable)

Phase 4: Frontend (Independent deployment)
└── React/Vite frontend
```

### Zero-Downtime Deployment

1. **Health Checks**: Services expose `/health` endpoints
2. **Connection Draining**: Existing connections complete before shutdown
3. **Database Migrations**: Run before service restart
4. **Load Balancer**: Routes traffic away from deploying services

---

## Infrastructure-as-Code

### Docker Compose Configuration

**File**: `Docker/docker-compose.yml`

#### **Service Definition Template**

```yaml
<service-name>:
  build:
    context: ../<service-directory>
    dockerfile: Dockerfile
  environment:
    # Database configuration
    DATABASE_URL: "postgres://user:pass@db:5432/dbname"
    # Broker configuration
    DJANGO_CELERY_BROKER_URL: "amqp://admin:admin@rabbitmq:5672/"
    # Django settings
    DJANGO_ENV: "production"
    DJANGO_DEBUG: "False"
  ports:
    - "host_port:container_port"
  depends_on:
    - rabbitmq
    - db
  volumes:
    - volume_name:/app/path
  command: >
    sh -c "sleep 10 && ./entrypoint.sh"
```

#### **Database Service Configuration**

```yaml
db:
  image: postgres:15
  container_name: postgres_db
  environment:
    POSTGRES_USER: postgres
    POSTGRES_PASSWORD: postgrespass
    POSTGRES_DB: postgres
  ports:
    - "5433:5432"
  volumes:
    - postgres_data:/var/lib/postgresql/data
    - ./db-init:/docker-entrypoint-initdb.d
```

#### **Message Broker Configuration**

```yaml
rabbitmq:
  image: rabbitmq:3-management
  container_name: rabbitmq
  ports:
    - "5672:5672"       # AMQP
    - "15672:15672"     # Management UI
  environment:
    RABBITMQ_DEFAULT_USER: admin
    RABBITMQ_DEFAULT_PASS: admin
  volumes:
    - rabbitmq_data:/var/lib/rabbitmq
```

### Dockerfile Standard

**Template**: All services use Python 3.11-slim base image

```dockerfile
FROM python:3.11-slim

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    PIP_NO_CACHE_DIR=off \
    PIP_DISABLE_PIP_VERSION_CHECK=on

WORKDIR /app

# System dependencies
RUN apt-get update && \
    apt-get install -y --no-install-recommends \
    build-essential \
    libpq-dev \
    && apt-get clean && \
    rm -rf /var/lib/apt/lists/*

# Python dependencies
COPY requirements.txt .
RUN pip install --upgrade pip && \
    pip install -r requirements.txt

# Application code
COPY . .
RUN chmod +x /app/entrypoint.sh

EXPOSE 8000
CMD ["/app/entrypoint.sh"]
```

**Benefits:**
- Minimal base image (275MB)
- Layer caching for faster builds
- Single stage (no multi-stage complexity for now)
- Proper cleanup (no apt cache)

### Railway Configuration

Railway uses a `railway.json` file (optional, auto-detected):

**Environment Detection**:
- `DJANGO_ENV=production` automatically set by Railway
- `DATABASE_URL` auto-generated for PostgreSQL service
- Service URLs configured via environment variables

**Deployment Configuration**:
```yaml
# .github/workflows/railway-deploy.yml
name: Deploy to Railway
on:
  push:
    branches: [main, pre-production]

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: railwayapp/railway-action@v1
        with:
          token: ${{ secrets.RAILWAY_TOKEN }}
```

---

## Server Specifications

### Development Environment

- **CPU**: No specific requirement (local machine)
- **RAM**: Minimum 4GB (8GB recommended)
- **Storage**: 20GB available for Docker images, volumes, and codebase
- **OS**: Windows 10+ / macOS 10.14+ / Linux (any modern distribution)
- **Docker**: Docker Desktop or Docker Engine version 20.10+
- **Docker Compose**: Version 2.0+

### Production Environment (Railway.app)

#### **Web Service (Django Application)**

| Parameter | Specification |
|-----------|---|
| **Compute** | Shared CPU (Railway starter plan) or Dedicated (pro plan) |
| **Memory** | 512MB minimum, 1GB recommended |
| **Ephemeral Storage** | 10GB (for media uploads, logs) |
| **Auto-scaling** | Enabled; Railway scales based on memory usage |
| **Restart Policy** | Always (restart on crash) |

#### **Database (PostgreSQL)**

| Parameter | Specification |
|-----------|---|
| **Version** | PostgreSQL 15+ |
| **Compute** | Managed by Railway |
| **Storage** | 10GB initial, auto-scaling available |
| **Memory** | 256MB-1GB allocated |
| **Backup** | Automatic daily backups (retained 7 days) |
| **HA** | Not enabled in starter plan; available in pro |

#### **Message Broker (RabbitMQ)**

| Parameter | Specification |
|-----------|---|
| **Deployment** | Self-managed in starter plan or managed service in pro |
| **Memory** | 512MB minimum |
| **Disk** | 5GB for message persistence |
| **Replicas** | 1 (no HA in starter) |

### Scaling Recommendations

| Component | Starter | Pro | Enterprise |
|-----------|---------|-----|-----------|
| Web Services | 1 instance | 2-5 instances | 5+ instances (auto) |
| Database | Shared | Dedicated 1GB | Dedicated 2GB+ |
| Cache/Queue | Shared | Dedicated | Dedicated with replicas |
| CDN | No | Optional | Included |
| Custom Domain | Railway domain | Yes | Multiple domains |

---

## Containerization Details

### Multi-Service Container Orchestration

#### **Service Dependencies**

```
postgresql ─────┬─→ auth-service
                ├─→ ticket-service
                ├─→ workflow-api
                ├─→ messaging-service
                └─→ notification-service

rabbitmq ───────┬─→ all services (as Celery broker)
                └─→ workflow-worker (consumes tasks)
```

#### **Startup Sequence**

1. **Infrastructure Layer** (no dependencies)
   - PostgreSQL starts and initializes
   - RabbitMQ starts and initializes

2. **Service Layer** (depends on infrastructure)
   - Services wait 10-20 seconds before starting
   - Prevents connection errors during initialization
   - Automatically retries failed connections

3. **Worker Layer** (depends on services)
   - Workflow-worker waits 20 seconds
   - Consumes tasks from multiple queues

#### **Health Checks**

Each service implements health checks:

```python
# Django health check endpoint
@api_view(['GET'])
@permission_classes([AllowAny])
def health_check(request):
    return Response({
        'status': 'healthy',
        'service': 'auth-service',
        'version': '1.0.0'
    })
```

Accessed at: `http://<service>:8000/health/`

### Container Networking

#### **Docker Network Configuration**

```yaml
networks:
  default:
    driver: bridge
    ipam:
      config:
        - subnet: 172.20.0.0/16
```

#### **Service Discovery**

Services communicate via Docker DNS:
- `http://auth-service:8000` (internal)
- `http://localhost:8003` (host machine)
- `http://ticket-service:7000` (internal)

#### **Volume Persistence**

```yaml
volumes:
  postgres_data:
    driver: local
  rabbitmq_data:
    driver: local
  media_files:
    driver: local
```

### Container Registry (Railway)

- **Registry**: Railway's private registry
- **Image Naming**: `railway/<service>:<tag>`
- **Tagging**: Automatic tagging by Git commit SHA
- **Storage**: 500MB free plan, unlimited pro

---

## Database Architecture

### PostgreSQL Setup

#### **Database Isolation**

Each service has its own logical database:

```
Server: postgres:5432
  ├── authservice (auth service models)
  ├── ticketmanagement (ticket service models)
  ├── workflowmanagement (workflow API models)
  ├── messagingservice (messaging service models)
  └── notificationservice (notification service models)
```

#### **Connection String Format**

```
DATABASE_URL=postgres://username:password@host:port/database
```

#### **Connection Pooling**

Django settings for production:

```python
DATABASES = {
    'default': dj_database_url.config(
        default=config('DATABASE_URL'),
        conn_max_age=600,  # 10 minutes
        conn_health_checks=True,
    )
}
```

**Features:**
- Connection timeout: 600 seconds (10 minutes)
- Health checks enabled: Verifies connection before use
- Persistent connections: Reduces connection overhead

#### **Backup Strategy**

- **Automated**: Daily backups by Railway
- **Retention**: 7-30 days (configurable)
- **Recovery**: Point-in-time recovery available
- **Testing**: Monthly restore drills recommended

#### **Schema Management**

Managed through Django migrations:

```bash
# Create migrations
python manage.py makemigrations

# Apply migrations
python manage.py migrate

# Rollback migrations
python manage.py migrate <app> <migration_number>
```

---

## Message Queue Setup

### RabbitMQ Configuration

#### **Architecture**

```
RabbitMQ Server (rabbitmq:3-management)
├── Exchanges (route messages)
│   └── celery (default)
├── Queues
│   ├── TICKET_TASKS_PRODUCTION
│   ├── notification-queue
│   ├── tts.role.sync
│   ├── tts.user_system_role.sync
│   ├── workflow_seed_queue
│   └── inapp-notification-queue
└── Connections
    ├── ticket-service (publisher)
    ├── workflow-api (publisher & consumer)
    ├── auth-service (publisher)
    └── notification-service (consumer)
```

#### **Queue Configuration**

**Ticket Task Queue**:
```python
# Produces: ticket-service (when ticket is created)
# Consumes: workflow-worker
# Routing: CELERY_TASK_ROUTES['TICKET_TASKS_PRODUCTION']
```

**Notification Queue**:
```python
# Produces: workflow-api (when assignment created)
# Consumes: notification-worker
# Routing: task.send_assignment_notification
```

**Synchronization Queues**:
```python
# TTS Role Sync
# Produces: auth-service (when role updated)
# Consumes: workflow-api-worker
# Routing: tts.role.sync, tts.user_system_role.sync
```

#### **Celery Configuration**

```python
CELERY_BROKER_URL = 'amqp://admin:admin@rabbitmq:5672/'
CELERY_ACCEPT_CONTENT = ['json']
CELERY_TASK_SERIALIZER = 'json'
CELERY_TASK_ACKS_LATE = True
CELERY_WORKER_PREFETCH_MULTIPLIER = 1
```

**Settings Explanation**:
- **ACKS_LATE**: Worker acknowledges task completion after execution
- **PREFETCH_MULTIPLIER = 1**: Worker processes one task at a time (prevents overload)
- **JSON Serialization**: Safe, language-agnostic message format

#### **Task Routing**

```python
CELERY_TASK_ROUTES = {
    'task.send_assignment_notification': {
        'queue': 'notification-queue-default'
    },
    'role.tasks.sync_role': {
        'queue': 'tts.role.sync'
    },
    'workflow.seed_workflows': {
        'queue': 'workflow_seed_queue'
    },
}
```

#### **Monitoring**

RabbitMQ Management UI: `http://localhost:15672`
- Credentials: admin/admin
- Monitor queue depths
- View active connections
- Diagnose stuck messages

---

## Deployment Environments

### Development Environment

**Configuration**:
```bash
# All services run locally via Docker Compose
docker-compose up -d

# Database: SQLite (local) or PostgreSQL (if specified)
DJANGO_ENV=development
DJANGO_DEBUG=True
```

**Characteristics**:
- All CORS origins allowed
- Email backend: console (prints to stdout)
- Verbose logging enabled
- Hot-reload for Django (if using watchdog)

### Staging Environment (Pre-production on Railway)

**Configuration**:
```bash
DJANGO_ENV=staging
DJANGO_DEBUG=False
DEBUG=False
```

**Branches**: `staging` or `pre-production`

**Characteristics**:
- Real PostgreSQL database
- Real RabbitMQ instance
- Email backend: SMTP (to staging email)
- Monitoring enabled
- Performance testing enabled

### Production Environment (Railway)

**Configuration**:
```bash
DJANGO_ENV=production
DEBUG=False
DJANGO_DEBUG=False
```

**Branches**: `main`

**Characteristics**:
- Real PostgreSQL with backups
- Real RabbitMQ with persistence
- Email backend: SMTP with real credentials
- Enhanced security (HTTPS, CSRF tokens)
- Error tracking (Sentry, if configured)
- Performance monitoring
- Rate limiting enabled
- API key validation required

**Environment-Specific Configurations**:

| Setting | Dev | Staging | Production |
|---------|-----|---------|-----------|
| DEBUG | True | False | False |
| ALLOWED_HOSTS | * | domain.app | domain.com |
| CORS_ALLOW_ALL | True | False | False |
| SESSION_COOKIE_SECURE | False | True | True |
| EMAIL_BACKEND | console | smtp | smtp |
| Database | SQLite | PostgreSQL | PostgreSQL + Backups |
| Celery Workers | 1 | 2-3 | 3-5+ |
| Log Level | DEBUG | INFO | WARNING |
| Error Tracking | Disabled | Enabled | Enabled |

---

## Scaling Considerations

### Horizontal Scaling

#### **Web Services**

```yaml
# Scale Docker containers (local)
docker-compose up -d --scale workflow-api=3

# Scale on Railway
# Adjust via Railway dashboard or railway.toml
```

**Considerations**:
- Session affinity not required (JWT-based)
- All replicas share PostgreSQL database
- All replicas connect to same RabbitMQ

#### **Celery Workers**

```bash
# Run multiple workers
celery -A workflow_api worker --pool=solo --concurrency=4

# Or via Docker
docker-compose up -d --scale workflow-worker=5
```

**Considerations**:
- Each worker independently consumes tasks
- `CELERY_WORKER_PREFETCH_MULTIPLIER=1` prevents overload
- Monitor queue depth to determine scaling needs

### Vertical Scaling

- Increase container memory allocation
- Increase database CPU/RAM
- Increase RabbitMQ resources

### Database Scaling

- **Connection Pooling**: PgBouncer (if needed)
- **Read Replicas**: PostgreSQL streaming replication (pro/enterprise)
- **Sharding**: Not recommended for current data volumes

### Caching Strategy

Not implemented yet, but recommended:
- Redis for session caching
- Redis for task result backend (optional)
- CloudFront CDN for static assets

---

## Monitoring and Health Checks

### Service Health Checks

#### **Health Check Endpoint**

All services should implement:

```python
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import AllowAny
from rest_framework.response import Response

@api_view(['GET'])
@permission_classes([AllowAny])
def health_check(request):
    return Response({
        'status': 'healthy',
        'service': 'auth-service',
        'database': 'connected',
        'version': '1.0.0'
    })
```

**URL**: `/api/v1/health/`

#### **Docker Health Check**

Add to docker-compose.yml:

```yaml
services:
  auth-service:
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:8000/api/v1/health/"]
      interval: 30s
      timeout: 10s
      retries: 3
      start_period: 40s
```

### Monitoring Tools

#### **Railway Built-in Monitoring**

- CPU usage
- Memory usage
- Network I/O
- Restart count
- Deployment history
- Logs streaming

**Access**: Railway dashboard

#### **Recommended Third-party Tools**

- **Error Tracking**: Sentry
- **Performance Monitoring**: NewRelic or Datadog
- **Logging**: CloudWatch or ELK stack
- **Alerts**: PagerDuty or Opsgenie

### Logging Strategy

#### **Log Levels**

```python
LOGGING = {
    'version': 1,
    'disable_existing_loggers': False,
    'handlers': {
        'console': {
            'class': 'logging.StreamHandler',
        },
    },
    'root': {
        'handlers': ['console'],
        'level': 'INFO',
    },
}
```

#### **Log Aggregation**

```bash
# View logs for service in Railway
railway logs auth-service

# View logs for Docker container
docker logs <container_name>

# Follow logs
docker logs -f <container_name>
```

### Performance Metrics

**Key Metrics to Monitor**:
- Response time (p50, p95, p99)
- Error rate (4xx, 5xx)
- Task queue depth (RabbitMQ)
- Worker availability
- Database connection pool usage
- Memory usage per service

---

## Conclusion

The Ticket Tracking System uses a modern, cloud-native deployment strategy with Docker containerization and Railway cloud hosting. The microservices architecture allows for independent scaling and deployment of services, while the centralized PostgreSQL and RabbitMQ infrastructure provides reliable data persistence and asynchronous task processing.

For production deployments, ensure:
1. All environment variables are properly configured
2. Database backups are tested
3. RabbitMQ persistence is enabled
4. Health checks are monitored
5. Celery workers are running (at least one)
6. SSL/TLS certificates are valid
7. Logging and monitoring are in place

---

## References

- Docker Documentation: https://docs.docker.com/
- Docker Compose: https://docs.docker.com/compose/
- Railway.app Documentation: https://docs.railway.app/
- Django Deployment: https://docs.djangoproject.com/en/5.2/howto/deployment/
- Celery Documentation: https://docs.celeryproject.org/
- RabbitMQ Documentation: https://www.rabbitmq.com/documentation.html
- PostgreSQL Documentation: https://www.postgresql.org/docs/
