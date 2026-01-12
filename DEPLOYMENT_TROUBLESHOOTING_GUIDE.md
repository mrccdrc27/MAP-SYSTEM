# MAP-SYSTEM Deployment Troubleshooting Guide

A comprehensive guide for diagnosing and resolving common deployment issues in the MAP-SYSTEM microservices architecture.

---

## Table of Contents

1. [System Overview](#system-overview)
2. [Pre-Deployment Checks](#pre-deployment-checks)
3. [Common Issues & Solutions](#common-issues--solutions)
4. [Docker Troubleshooting](#docker-troubleshooting)
5. [Service-Specific Issues](#service-specific-issues)
6. [Integration Issues](#integration-issues)
7. [Scripts CLI Reference](#scripts-cli-reference)
8. [GitHub Actions CI/CD](#github-actions-cicd)
9. [Logs & Debugging](#logs--debugging)
10. [Quick Reference Commands](#quick-reference-commands)

---

## System Overview

### Architecture Components

| Service | Port | Description |
|---------|------|-------------|
| Kong API Gateway | 8080 (proxy), 8001 (admin) | Routes all API requests |
| Auth Service | 8003 | Authentication & user management |
| Workflow API | 1001 | TTS ticket/task management |
| Helpdesk Service | 5001 | HDTS helpdesk tickets |
| Notification Service | 1003 | Email & in-app notifications |
| Messaging Service | 1002 | WebSocket real-time messaging |
| RabbitMQ | 5672, 15672 | Message broker for async tasks |
| PostgreSQL | 5433 | Shared database instance |
| Mailpit | 8025, 1025 | Email testing (dev only) |

### Service Dependencies

```
                    ┌─────────────┐
                    │    Kong     │ (API Gateway)
                    └──────┬──────┘
                           │
    ┌──────────────────────┼──────────────────────┐
    │                      │                      │
    ▼                      ▼                      ▼
┌─────────┐         ┌─────────────┐        ┌──────────────┐
│  Auth   │◄────────│ Workflow API│────────│   Helpdesk   │
│ Service │         │    (TTS)    │        │   Service    │
└────┬────┘         └──────┬──────┘        └──────┬───────┘
     │                     │                      │
     │              ┌──────┴──────┐               │
     │              │  RabbitMQ   │◄──────────────┘
     │              └──────┬──────┘
     │                     │
     │              ┌──────┴──────┐
     └─────────────►│ PostgreSQL  │
                    └─────────────┘
```

---

## Pre-Deployment Checks

### GitHub Actions Pre-Checks

The system uses GitHub Actions workflows for automated testing before deployment. Check these workflows on push/PR:

1. **Build and Test** (`.github/workflows/build-and-test.yml`)
   - Builds all Docker services
   - Runs unit tests for each service
   - Validates frontend builds

2. **Docker Compose Test** (`.github/workflows/docker-compose-test.yml`)
   - Full orchestration test
   - Validates service health checks
   - Tests inter-service communication

**How to check CI status:**
```bash
# View workflow runs in GitHub Actions tab
# Or use GitHub CLI:
gh run list --workflow=build-and-test.yml
gh run view <run-id> --log
```

### Environment Configuration

Use the Scripts CLI to configure your environment:

```bash
# Navigate to project root
cd /root/MAP-SYSTEM

# Run the CLI setup
node Scripts/cli/index.js menu

# Or directly setup environment
node Scripts/cli/setup-env.js
```

The CLI automatically:
- Detects available executables (bash, python, pm2, powershell)
- Creates `.env` configuration in `Scripts/cli/.env`
- Validates paths and commands

---

## Common Issues & Solutions

### 1. Service Won't Start

**Symptoms:** Container exits immediately or stays in "Restarting" state

**Diagnosis:**
```bash
# Check container status
docker ps -a

# View startup logs
docker logs <container_name> --tail 100

# For docker-compose
cd tts/Docker
docker compose logs <service_name>
```

**Common Causes & Solutions:**

| Cause | Solution |
|-------|----------|
| Missing environment variables | Check `.env` file in `tts/Docker/` |
| Database not ready | Increase sleep time in service command |
| Port already in use | Run `lsof -i :<port>` and kill process |
| Missing dependencies | Rebuild with `docker compose build --no-cache` |

### 2. Database Connection Errors

**Symptoms:** `connection refused`, `could not connect to server`

**Solutions:**
```bash
# Check PostgreSQL is running
docker exec docker_db_1 pg_isready -U postgres

# Verify database exists
docker exec docker_db_1 psql -U postgres -c "\l"

# Check network connectivity
docker network inspect docker_default
```

### 3. RabbitMQ Connection Issues

**Symptoms:** Celery workers failing, message queue errors

**Solutions:**
```bash
# Check RabbitMQ status
docker exec docker_rabbitmq_1 rabbitmq-diagnostics -q ping

# View queue status
docker exec docker_rabbitmq_1 rabbitmqctl list_queues

# Access management UI
# Navigate to http://165.22.247.50:15672 (admin/admin)
```

### 4. Authentication Failures

**Symptoms:** 401 Unauthorized, JWT errors, CORS issues

**Solutions:**
```bash
# Check auth service health
curl -s http://165.22.247.50:8003/api/health/

# Verify JWT signing key consistency
docker exec docker_auth-service_1 env | grep JWT

# Check CORS configuration
docker exec docker_auth-service_1 env | grep CORS
```

### 5. Kong Gateway Issues

**Symptoms:** 502 Bad Gateway, routes not found

**Solutions:**
```bash
# Check Kong configuration
docker exec docker_kong_1 kong config parse /kong/kong.docker.yml

# View Kong logs
docker logs docker_kong_1

# Test upstream services directly (bypass Kong)
curl http://165.22.247.50:8003/api/health/  # Auth
curl http://165.22.247.50:1001/api/health/  # Workflow
```

---

## Docker Troubleshooting

### Container Management Commands

```bash
# Navigate to Docker directory
cd tts/Docker

# View all containers
docker compose ps -a

# Restart specific service
docker compose restart <service_name>

# Rebuild and restart specific service
docker compose up -d --build <service_name>

# Full reset (removes volumes)
docker compose down -v && docker compose up -d --build

# View resource usage
docker stats
```

### Using Scripts CLI for Docker

```bash
# Interactive menu
node Scripts/cli/index.js menu

# Direct commands
node Scripts/cli/index.js run docker:tts:start   # Start all
node Scripts/cli/index.js run docker:tts:stop    # Stop all
node Scripts/cli/index.js run docker:tts:logs    # Follow logs
node Scripts/cli/index.js run docker:tts:reset   # Full reset
```

### Shell Scripts (Alternative)

```bash
# Located in Scripts/docker/tts/
./Scripts/docker/tts/start.sh    # Build & start
./Scripts/docker/tts/stop.sh     # Stop services
./Scripts/docker/tts/restart.sh  # Restart
./Scripts/docker/tts/reset.sh    # Reset with volume removal
./Scripts/docker/tts/logs.sh     # Follow logs
```

---

## Service-Specific Issues

### Auth Service

**Common Issues:**
- SendGrid email failures
- Session/cookie problems
- User sync failures

**Debug Commands:**
```bash
# Check user exists
docker exec docker_auth-service_1 python -c "
import os
os.environ['DJANGO_SETTINGS_MODULE'] = 'auth.settings'
import django
django.setup()
from django.contrib.auth import get_user_model
User = get_user_model()
print('Total users:', User.objects.count())
"

# View auth worker logs (for async tasks)
docker logs docker_auth-worker_1 --tail 50
```

### Workflow API (TTS)

**Common Issues:**
- Task not created from HDTS ticket
- Workflow transitions failing
- Role sync issues

**Debug Commands:**
```bash
# Check task creation
docker exec docker_workflow-api_1 python manage.py shell -c "
from api.models import Task
print('Tasks:', Task.objects.count())
"

# View Celery worker logs
docker logs docker_workflow-worker_1 --tail 100

# Check queue status
curl http://165.22.247.50:15672/api/queues -u admin:admin
```

### Helpdesk Service (HDTS)

**Common Issues:**
- Tickets not syncing to TTS
- Employee data missing

**Debug Commands:**
```bash
# Check ticket count
docker exec docker_helpdesk-service_1 python manage.py shell -c "
from tickets.models import Ticket
print('Tickets:', Ticket.objects.count())
"

# Verify Celery queue
docker logs docker_helpdesk-worker_1 --tail 100
```

### Notification Service

**Common Issues:**
- Emails not sending
- In-app notifications missing

**Debug Commands:**
```bash
# Check notification logs
docker logs docker_notification-service_1 --tail 100
docker logs docker_notification-worker_1 --tail 100

# Test SendGrid configuration
docker exec docker_notification-service_1 env | grep SENDGRID
```

---

## Integration Issues

### HDTS → TTS Integration

When tickets from HDTS don't appear in TTS:

1. **Check RabbitMQ queues:**
   ```bash
   # Verify TICKET_TASKS_PRODUCTION queue exists
   docker exec docker_rabbitmq_1 rabbitmqctl list_queues | grep TICKET
   ```

2. **Check Celery workers:**
   ```bash
   # HDTS worker (sends tickets)
   docker logs docker_helpdesk-worker_1 --tail 50
   
   # TTS worker (receives tickets)
   docker logs docker_workflow-worker_1 --tail 50
   ```

3. **Verify task creation signal:**
   ```bash
   # Check if ticket was created
   docker exec docker_helpdesk-service_1 python manage.py shell -c "
   from tickets.models import Ticket
   latest = Ticket.objects.last()
   print(f'Latest ticket: {latest.id} - {latest.subject}')
   "
   ```

### TTS → HDTS Status Sync

When status changes don't sync back:

1. **Check ticket_status queue:**
   ```bash
   docker exec docker_rabbitmq_1 rabbitmqctl list_queues | grep ticket_status
   ```

2. **Verify Celery task execution:**
   ```bash
   docker logs docker_workflow-worker_1 | grep "send_ticket_status"
   ```

### Auth ↔ Services Sync

When user/role changes don't propagate:

1. **Check auth-sync-queue:**
   ```bash
   docker exec docker_rabbitmq_1 rabbitmqctl list_queues | grep auth-sync
   ```

2. **Verify auth worker:**
   ```bash
   docker logs docker_auth-worker_1 --tail 50
   ```

### Running Integration Tests

Use the Scripts CLI to run integration tests:

```bash
# Full integration test
node Scripts/cli/index.js run testing:integration:hdts-tts

# Quick test (specific category)
node Scripts/cli/index.js run testing:integration:hdts-tts-quick

# With test infrastructure
node Scripts/cli/index.js run testing:integration:hdts-tts-infra

# Direct Python execution
python Scripts/testing/test_hdts_tts_integration.py --verbose
```

---

## Scripts CLI Reference

### Installation & Setup

```bash
# Navigate to CLI directory
cd Scripts/cli

# Install dependencies
npm install

# Run setup
node setup-env.js
```

### Available Commands

```bash
# Interactive menu (recommended)
node Scripts/cli/index.js menu

# List all available scripts
node Scripts/cli/index.js list

# Run specific script
node Scripts/cli/index.js run <category>:<script>
node Scripts/cli/index.js run <category>:<subcategory>:<script>
```

### Common Script Categories

| Category | Description | Example |
|----------|-------------|---------|
| `services` | Start individual services | `services:tts:workflow` |
| `docker` | Docker management | `docker:tts:start` |
| `setup` | Environment setup | `setup:seeding:workflow-hdts` |
| `testing` | Run tests | `testing:integration:hdts-tts` |
| `utils` | Utility scripts | `utils:seed-tickets` |
| `docker-utils` | Docker utilities | `docker-utils:bypass-transition` |
| `pm2` | Process management | `pm2:tts:start` |

### Environment Configuration

The CLI uses `.env` file in `Scripts/cli/`:

```env
BASH_CMD=/bin/bash
PYTHON_CMD=python3
PM2_CMD=pm2
POWERSHELL_CMD=pwsh
```

---

## GitHub Actions CI/CD

### Workflow Files

| File | Trigger | Purpose |
|------|---------|---------|
| `build-and-test.yml` | Push/PR to main, QA, develop | Unit tests & builds |
| `docker-compose-test.yml` | Changes to Docker/service code | Integration tests |
| `deploy-docs.yml` | Changes to docs | Deploy documentation |

### Checking Test Logs

1. **View in GitHub:**
   - Navigate to Actions tab
   - Select workflow run
   - Expand job steps for detailed logs

2. **Using GitHub CLI:**
   ```bash
   # List recent runs
   gh run list
   
   # View specific run
   gh run view <run-id>
   
   # Download logs
   gh run download <run-id>
   ```

### Test Job Summary

The `test-summary` job aggregates results:
- Docker Build status
- Auth Service Tests
- Workflow API Tests
- Messaging Service Tests
- Notification Service Tests
- Frontend Build
- Integration Tests

---

## Logs & Debugging

### Viewing Docker Logs

```bash
# Follow all logs
cd tts/Docker && docker compose logs -f

# Specific service
docker compose logs -f <service_name>

# Last N lines
docker compose logs --tail 100 <service_name>

# With timestamps
docker compose logs -f -t <service_name>
```

### Common Log Locations

| Service | Log Command |
|---------|-------------|
| Auth Service | `docker logs docker_auth-service_1` |
| Auth Worker | `docker logs docker_auth-worker_1` |
| Workflow API | `docker logs docker_workflow-api_1` |
| Workflow Worker | `docker logs docker_workflow-worker_1` |
| Helpdesk | `docker logs docker_helpdesk-service_1` |
| Helpdesk Worker | `docker logs docker_helpdesk-worker_1` |
| Notification | `docker logs docker_notification-service_1` |
| Notification Worker | `docker logs docker_notification-worker_1` |
| Kong | `docker logs docker_kong_1` |
| RabbitMQ | `docker logs docker_rabbitmq_1` |
| PostgreSQL | `docker logs docker_db_1` |

### Django Debug Shell

```bash
# Access Django shell in any service
docker exec -it <container_name> python manage.py shell

# Example: Check database state
docker exec -it docker_workflow-api_1 python manage.py shell
>>> from api.models import Task
>>> Task.objects.count()
```

### Database Inspection

```bash
# Connect to PostgreSQL
docker exec -it docker_db_1 psql -U postgres

# List databases
\l

# Connect to specific database
\c workflowmanagement

# List tables
\dt

# Query example
SELECT COUNT(*) FROM api_task;
```

---

## Quick Reference Commands

### Health Checks

```bash
# All services status
docker ps --format "table {{.Names}}\t{{.Status}}\t{{.Ports}}"

# PostgreSQL
docker exec docker_db_1 pg_isready -U postgres

# RabbitMQ
docker exec docker_rabbitmq_1 rabbitmq-diagnostics -q ping

# Individual services
curl -s http://165.22.247.50:8003/api/health/   # Auth
curl -s http://165.22.247.50:1001/api/health/   # Workflow
curl -s http://165.22.247.50:5001/api/health/   # Helpdesk
curl -s http://165.22.247.50:1003/api/health/   # Notification
```

### Quick Fixes

```bash
# Restart all services
cd tts/Docker && docker compose restart

# Rebuild specific service
docker compose up -d --build <service_name>

# Clear and restart
docker compose down && docker compose up -d

# Full reset (removes all data)
docker compose down -v && docker compose up -d --build

# Fix permissions
docker exec <container> chown -R app:app /app/media
```

### Network Debugging

```bash
# Check network
docker network inspect docker_default

# Test service connectivity from within container
docker exec docker_workflow-api_1 curl -s http://auth-service:8000/api/health/

# Check DNS resolution
docker exec docker_workflow-api_1 nslookup auth-service
```

---

## Troubleshooting Checklist

When something goes wrong, follow this order:

- [ ] **1. Check container status:** `docker ps -a`
- [ ] **2. View service logs:** `docker logs <container> --tail 100`
- [ ] **3. Verify dependencies are running:** PostgreSQL, RabbitMQ
- [ ] **4. Check environment variables:** `docker exec <container> env`
- [ ] **5. Test direct connectivity:** Bypass Kong and test services directly
- [ ] **6. Check RabbitMQ queues:** Management UI at port 15672
- [ ] **7. Review GitHub Actions logs:** For CI/CD related issues
- [ ] **8. Run integration tests:** `node Scripts/cli/index.js run testing:integration:hdts-tts`
- [ ] **9. Check database state:** Django shell or psql
- [ ] **10. Full reset if needed:** `docker compose down -v && docker compose up -d --build`

---

## Support

For additional support:
- Check existing documentation in `/map-docs`
- Review test files in `/Scripts/testing`
- Examine GitHub Actions workflow logs
- Use the Scripts CLI help: `node Scripts/cli/index.js --help`
