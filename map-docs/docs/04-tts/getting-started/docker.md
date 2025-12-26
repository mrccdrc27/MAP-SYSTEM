---
title: Docker Setup
sidebar_label: Docker
sidebar_position: 4
---

# Docker Setup

Run TTS using Docker containers for easy deployment and consistency across environments.

## Prerequisites

- Docker 24+
- Docker Compose 2.20+

## Quick Start

### Using Docker Compose

```bash
cd tts/Docker
docker-compose up -d
```

This starts all TTS services:
- PostgreSQL database
- RabbitMQ message broker
- Workflow API
- Ticket Service
- Frontend
- Celery workers

### Verify Services

```bash
docker-compose ps
```

Expected output:
```
NAME                   STATUS    PORTS
tts-db-1              running   5432/tcp
tts-rabbitmq-1        running   5672/tcp, 15672/tcp
tts-workflow-api-1    running   8002/tcp
tts-ticket-service-1  running   8004/tcp
tts-frontend-1        running   1000/tcp
tts-celery-worker-1   running
```

## Docker Compose Files

### Development (`docker-compose-dev.yml`)

Optimized for development with:
- Volume mounts for live code reloading
- Debug mode enabled
- Exposed ports for debugging

```bash
docker-compose -f docker-compose-dev.yml up -d
```

### Production (`docker-compose.yml`)

Production-ready configuration with:
- Multi-stage builds for smaller images
- No volume mounts
- Security hardening

```bash
docker-compose -f docker-compose.yml up -d
```

## Service Configuration

### docker-compose.yml

```yaml
version: '3.8'

services:
  db:
    image: postgres:14
    environment:
      POSTGRES_USER: postgres
      POSTGRES_PASSWORD: postgres
      POSTGRES_DB: tts_db
    volumes:
      - postgres_data:/var/lib/postgresql/data
    ports:
      - "5432:5432"

  rabbitmq:
    image: rabbitmq:3-management
    environment:
      RABBITMQ_DEFAULT_USER: admin
      RABBITMQ_DEFAULT_PASS: admin
    ports:
      - "5672:5672"
      - "15672:15672"

  workflow-api:
    build:
      context: ../workflow_api
      dockerfile: Dockerfile
    environment:
      - DATABASE_URL=postgres://postgres:postgres@db:5432/workflow_db
      - DJANGO_CELERY_BROKER_URL=amqp://admin:admin@rabbitmq:5672/
      - DJANGO_AUTH_SERVICE=http://auth-service:8000
    ports:
      - "8002:8002"
    depends_on:
      - db
      - rabbitmq

  ticket-service:
    build:
      context: ../ticket_service
      dockerfile: Dockerfile
    environment:
      - DATABASE_URL=postgres://postgres:postgres@db:5432/ticket_db
      - DJANGO_CELERY_BROKER_URL=amqp://admin:admin@rabbitmq:5672/
    ports:
      - "8004:8004"
    depends_on:
      - db
      - rabbitmq

  celery-worker:
    build:
      context: ../workflow_api
      dockerfile: Dockerfile
    command: celery -A workflow_api worker --loglevel=info
    environment:
      - DATABASE_URL=postgres://postgres:postgres@db:5432/workflow_db
      - DJANGO_CELERY_BROKER_URL=amqp://admin:admin@rabbitmq:5672/
    depends_on:
      - db
      - rabbitmq
      - workflow-api

  frontend:
    build:
      context: ../frontend
      dockerfile: Dockerfile
    ports:
      - "1000:1000"
    depends_on:
      - workflow-api
      - ticket-service

volumes:
  postgres_data:
```

## Building Images

### Build All Services

```bash
docker-compose build
```

### Build Specific Service

```bash
docker-compose build workflow-api
```

### Force Rebuild (No Cache)

```bash
docker-compose build --no-cache
```

## Running Migrations

### Initial Setup

```bash
# Run migrations for Workflow API
docker-compose exec workflow-api python manage.py migrate

# Run migrations for Ticket Service
docker-compose exec ticket-service python manage.py migrate
```

### Seed Data

```bash
# Seed workflows
docker-compose exec workflow-api python manage.py seed_workflows2

# Seed tickets
docker-compose exec ticket-service python manage.py seed_tickets
```

## Viewing Logs

### All Services

```bash
docker-compose logs -f
```

### Specific Service

```bash
docker-compose logs -f workflow-api
```

### Celery Worker

```bash
docker-compose logs -f celery-worker
```

## Common Commands

### Start Services

```bash
docker-compose up -d
```

### Stop Services

```bash
docker-compose down
```

### Stop and Remove Volumes

```bash
docker-compose down -v
```

### Restart Service

```bash
docker-compose restart workflow-api
```

### Shell Access

```bash
docker-compose exec workflow-api bash
```

### Django Shell

```bash
docker-compose exec workflow-api python manage.py shell
```

## Development Workflow

### Live Code Reloading

Use `docker-compose-dev.yml` which mounts source code:

```yaml
services:
  workflow-api:
    volumes:
      - ../workflow_api:/app
```

Changes to Python files automatically reload the server.

### Running Tests

```bash
docker-compose exec workflow-api python manage.py test
```

### Installing New Dependencies

```bash
# Install in container
docker-compose exec workflow-api pip install new-package

# Update requirements.txt
docker-compose exec workflow-api pip freeze > requirements.txt

# Rebuild image
docker-compose build workflow-api
```

## Troubleshooting

### Container Won't Start

Check logs:
```bash
docker-compose logs workflow-api
```

Common issues:
- Database not ready (add `depends_on` with health check)
- Missing environment variables
- Port already in use

### Database Connection Error

1. Verify database is running:
```bash
docker-compose ps db
```

2. Check connection from service:
```bash
docker-compose exec workflow-api python -c "import django; django.setup(); from django.db import connection; cursor = connection.cursor()"
```

### RabbitMQ Connection Refused

1. Check RabbitMQ status:
```bash
docker-compose exec rabbitmq rabbitmqctl status
```

2. Verify connection URL in environment variables

### Celery Tasks Not Processing

1. Check worker is running:
```bash
docker-compose ps celery-worker
```

2. Check worker logs:
```bash
docker-compose logs celery-worker
```

3. Verify queue configuration

## Health Checks

Add health checks to docker-compose.yml:

```yaml
services:
  db:
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U postgres"]
      interval: 5s
      timeout: 5s
      retries: 5

  rabbitmq:
    healthcheck:
      test: ["CMD", "rabbitmq-diagnostics", "check_port_connectivity"]
      interval: 30s
      timeout: 10s
      retries: 5

  workflow-api:
    depends_on:
      db:
        condition: service_healthy
      rabbitmq:
        condition: service_healthy
```

## Production Deployment

### Environment Variables

Use `.env` file for production secrets:

```bash
# .env
SECRET_KEY=your-production-secret-key
DATABASE_URL=postgres://user:pass@prod-db:5432/tts
DJANGO_ENV=production
DEBUG=False
```

### SSL/TLS

Add nginx reverse proxy:

```yaml
services:
  nginx:
    image: nginx:alpine
    volumes:
      - ./nginx.conf:/etc/nginx/nginx.conf
      - ./certs:/etc/nginx/certs
    ports:
      - "443:443"
      - "80:80"
```

### Scaling Workers

```bash
docker-compose up -d --scale celery-worker=3
```
