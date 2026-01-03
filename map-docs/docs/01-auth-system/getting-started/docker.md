---
title: Docker Development
sidebar_label: Docker
sidebar_position: 5
---

# Docker Development

Run the Auth Service in containers for consistent development and deployment.

## Quick Start with Docker Compose

### Start All Services

```bash
cd Docker
docker-compose up -d
```

### Start Auth Service Only

```bash
cd Docker
docker-compose up auth-service -d
```

### View Logs

```bash
docker logs auth-service -f
```

### Stop Services

```bash
docker-compose down
```

---

## Docker Compose Configuration

The main `docker-compose.yml` is in the `Docker/` directory:

```yaml
version: '3.8'

services:
  auth-service:
    build:
      context: ../auth
      dockerfile: Dockerfile
    ports:
      - "8000:8000"
    environment:
      - DJANGO_ENV=development
      - DATABASE_URL=postgresql://postgres:password@db:5432/auth_db
      - DJANGO_CELERY_BROKER_URL=amqp://admin:admin@rabbitmq:5672/
    depends_on:
      - db
      - rabbitmq
    volumes:
      - ../auth:/app

  db:
    image: postgres:14
    environment:
      - POSTGRES_DB=auth_db
      - POSTGRES_USER=postgres
      - POSTGRES_PASSWORD=password
    ports:
      - "5432:5432"
    volumes:
      - postgres_data:/var/lib/postgresql/data

  rabbitmq:
    image: rabbitmq:3-management
    environment:
      - RABBITMQ_DEFAULT_USER=admin
      - RABBITMQ_DEFAULT_PASS=admin
    ports:
      - "5672:5672"
      - "15672:15672"

volumes:
  postgres_data:
```

---

## Dockerfile

The Auth Service Dockerfile (`auth/Dockerfile`):

```dockerfile
FROM python:3.10-slim

WORKDIR /app

# Install system dependencies
RUN apt-get update && apt-get install -y \
    libpq-dev \
    gcc \
    && rm -rf /var/lib/apt/lists/*

# Install Python dependencies
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy application code
COPY . .

# Collect static files
RUN python manage.py collectstatic --noinput

# Run migrations and start server
EXPOSE 8000
CMD ["sh", "-c", "python manage.py migrate && python manage.py runserver 0.0.0.0:8000"]
```

---

## Common Docker Commands

### Build Image

```bash
cd auth
docker build -t auth-service .
```

### Run Container

```bash
docker run -p 8000:8000 \
  -e DJANGO_ENV=development \
  -e DJANGO_SECRET_KEY=dev-secret \
  auth-service
```

### Run Migrations in Container

```bash
docker exec auth-service python manage.py migrate
```

### Seed Data in Container

```bash
docker exec auth-service python manage.py seed_systems
docker exec auth-service python manage.py seed_tts
docker exec auth-service python manage.py seed_accounts
```

### Access Django Shell

```bash
docker exec -it auth-service python manage.py shell
```

### Run Tests in Container

```bash
docker exec auth-service python manage.py test
```

---

## Development with Volumes

Mount local code for live reloading:

```bash
docker run -p 8000:8000 \
  -v $(pwd):/app \
  -e DJANGO_ENV=development \
  auth-service
```

Or in `docker-compose.yml`:

```yaml
services:
  auth-service:
    volumes:
      - ../auth:/app
```

---

## Celery Worker Container

Run Celery worker alongside the main service:

```yaml
# docker-compose.yml
services:
  auth-service:
    # ... main service config

  auth-worker:
    build:
      context: ../auth
      dockerfile: Dockerfile
    command: celery -A auth worker --loglevel=info
    environment:
      - DJANGO_ENV=development
      - DATABASE_URL=postgresql://postgres:password@db:5432/auth_db
      - DJANGO_CELERY_BROKER_URL=amqp://admin:admin@rabbitmq:5672/
    depends_on:
      - db
      - rabbitmq
```

Start both:

```bash
docker-compose up auth-service auth-worker -d
```

---

## Production Dockerfile

For production, use `Dockerfile.prod`:

```dockerfile
FROM python:3.10-slim

WORKDIR /app

# Install system dependencies
RUN apt-get update && apt-get install -y \
    libpq-dev \
    gcc \
    && rm -rf /var/lib/apt/lists/*

# Create non-root user
RUN useradd -m appuser

# Install Python dependencies
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt gunicorn

# Copy application code
COPY . .

# Collect static files
RUN python manage.py collectstatic --noinput

# Change ownership
RUN chown -R appuser:appuser /app

# Switch to non-root user
USER appuser

EXPOSE 8000

# Use gunicorn for production
CMD ["gunicorn", "--bind", "0.0.0.0:8000", "auth.wsgi:application"]
```

Build and run:

```bash
docker build -f Dockerfile.prod -t auth-service:prod .
docker run -p 8000:8000 -e DJANGO_ENV=production auth-service:prod
```

---

## Environment Variables in Docker

### Via docker-compose.yml

```yaml
services:
  auth-service:
    environment:
      - DJANGO_ENV=development
      - DJANGO_SECRET_KEY=${DJANGO_SECRET_KEY}
```

### Via .env file

Create `Docker/.env`:

```bash
DJANGO_SECRET_KEY=your-secret-key
DATABASE_URL=postgresql://postgres:password@db:5432/auth_db
SENDGRID_API_KEY=SG.xxx
```

Reference in docker-compose:

```yaml
services:
  auth-service:
    env_file:
      - .env
```

---

## Troubleshooting

### Container won't start

```bash
# Check logs
docker logs auth-service

# Check if port is in use
netstat -an | grep 8000
```

### Database connection refused

```bash
# Ensure db container is running
docker ps | grep db

# Check db logs
docker logs db

# Wait for db to be ready
docker-compose up -d db
sleep 5
docker-compose up -d auth-service
```

### Migrations fail

```bash
# Run migrations manually
docker exec auth-service python manage.py migrate --run-syncdb
```

### Volume permissions

```bash
# Fix permissions on Linux
sudo chown -R $USER:$USER ./auth
```

---

## Health Checks

Add health check to docker-compose:

```yaml
services:
  auth-service:
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:8000/api/v1/"]
      interval: 30s
      timeout: 10s
      retries: 3
      start_period: 40s
```

Check health:

```bash
docker inspect auth-service --format='{{.State.Health.Status}}'
```
