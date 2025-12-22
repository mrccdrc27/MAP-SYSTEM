# A.14 DevOps and CI/CD

## Table of Contents

1. [Executive Summary](#executive-summary)
2. [CI/CD Pipeline Overview](#cicd-pipeline-overview)
3. [GitHub Actions Workflows](#github-actions-workflows)
4. [Build Process](#build-process)
5. [Testing Strategy](#testing-strategy)
6. [Deployment Pipeline](#deployment-pipeline)
7. [Infrastructure as Code](#infrastructure-as-code)
8. [Monitoring and Observability](#monitoring-and-observability)
9. [Rollback Procedures](#rollback-procedures)
10. [Release Management](#release-management)
11. [Security in CI/CD](#security-in-cicd)
12. [Best Practices](#best-practices)

---

## Executive Summary

The Ticket Tracking System uses a continuous integration and continuous deployment (CI/CD) pipeline built on **GitHub Actions** for automation and **Railway.app** for cloud hosting. The pipeline enables:

- **Automated Testing**: Unit tests run on every push
- **Continuous Deployment**: Code changes deploy automatically to Railway
- **Zero-Downtime Deployment**: Blue-green deployment strategy
- **Version Control**: Git-based source control with semantic versioning
- **Environment Management**: Automatic configuration for dev, staging, and production
- **Monitoring**: Automated health checks and error tracking

---

## CI/CD Pipeline Overview

### Pipeline Architecture

```
┌─────────────────────────────────────────────────────────────────────────┐
│                          Developer Workflow                             │
│                                                                          │
│  1. Code Commit/Push to GitHub                                          │
│     └─ git push origin feature/ticket-management                        │
│                                                                          │
│  2. GitHub Actions Trigger                                              │
│     └─ Webhook event sent to GitHub Actions                             │
└─────────────────────────────────────────────────────────────────────────┘
                                  ↓
┌─────────────────────────────────────────────────────────────────────────┐
│                         CI Stage (GitHub Actions)                        │
│                                                                          │
│  ┌─────────────────────────────────────────────────────────────────┐   │
│  │ Step 1: Checkout Code                                          │   │
│  │  └─ actions/checkout@v4                                       │   │
│  └─────────────────────────────────────────────────────────────────┘   │
│                                                                          │
│  ┌─────────────────────────────────────────────────────────────────┐   │
│  │ Step 2: Setup Python Environment                               │   │
│  │  └─ actions/setup-python@v5 (Python 3.11)                     │   │
│  └─────────────────────────────────────────────────────────────────┘   │
│                                                                          │
│  ┌─────────────────────────────────────────────────────────────────┐   │
│  │ Step 3: Install Dependencies                                   │   │
│  │  └─ pip install -r requirements.txt                            │   │
│  └─────────────────────────────────────────────────────────────────┘   │
│                                                                          │
│  ┌─────────────────────────────────────────────────────────────────┐   │
│  │ Step 4: Run Tests                                              │   │
│  │  ├─ Unit tests (pytest)                                        │   │
│  │  ├─ Integration tests                                          │   │
│  │  └─ Coverage report                                            │   │
│  └─────────────────────────────────────────────────────────────────┘   │
│                                                                          │
│  ┌─────────────────────────────────────────────────────────────────┐   │
│  │ Step 5: Lint & Code Quality                                    │   │
│  │  ├─ ESLint (frontend)                                          │   │
│  │  └─ Flake8/Black (backend)                                     │   │
│  └─────────────────────────────────────────────────────────────────┘   │
│                                                                          │
│  ┌─────────────────────────────────────────────────────────────────┐   │
│  │ Step 6: Build Docker Images                                    │   │
│  │  └─ docker build -t <service>:<tag> .                         │   │
│  └─────────────────────────────────────────────────────────────────┘   │
│                                                                          │
│  ┌─────────────────────────────────────────────────────────────────┐   │
│  │ Step 7: Push to Registry                                       │   │
│  │  └─ docker push <registry>/<service>:<tag>                    │   │
│  └─────────────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────────────┘
                                  ↓
┌─────────────────────────────────────────────────────────────────────────┐
│                      CD Stage (Railway Deployment)                       │
│                                                                          │
│  ┌─────────────────────────────────────────────────────────────────┐   │
│  │ Step 1: Webhook to Railway                                     │   │
│  │  └─ railway-action@v1 with RAILWAY_TOKEN                       │   │
│  └─────────────────────────────────────────────────────────────────┘   │
│                                                                          │
│  ┌─────────────────────────────────────────────────────────────────┐   │
│  │ Step 2: Build Image on Railway                                 │   │
│  │  └─ Build Docker image from Dockerfile                        │   │
│  └─────────────────────────────────────────────────────────────────┘   │
│                                                                          │
│  ┌─────────────────────────────────────────────────────────────────┐   │
│  │ Step 3: Run Migrations                                         │   │
│  │  └─ python manage.py migrate                                  │   │
│  └─────────────────────────────────────────────────────────────────┘   │
│                                                                          │
│  ┌─────────────────────────────────────────────────────────────────┐   │
│  │ Step 4: Blue-Green Deployment                                  │   │
│  │  ├─ Start new container (Green)                               │   │
│  │  ├─ Wait for health checks (30s)                              │   │
│  │  ├─ Route traffic to new container                            │   │
│  │  └─ Terminate old container (Blue)                            │   │
│  └─────────────────────────────────────────────────────────────────┘   │
│                                                                          │
│  ┌─────────────────────────────────────────────────────────────────┐   │
│  │ Step 5: Post-Deployment Verification                           │   │
│  │  ├─ Health check endpoints                                     │   │
│  │  ├─ Smoke tests                                                │   │
│  │  └─ Monitor for errors (2 minutes)                             │   │
│  └─────────────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────────────┘
                                  ↓
┌─────────────────────────────────────────────────────────────────────────┐
│                         Result                                           │
│                                                                          │
│  ✅ Deployment Successful                                               │
│     └─ New version live in production                                   │
│                                                                          │
│  ❌ Deployment Failed                                                   │
│     └─ Automatic rollback to previous version                           │
│     └─ Slack/Email notification to team                                 │
└─────────────────────────────────────────────────────────────────────────┘
```

### Pipeline Triggers

```yaml
# Automatic triggers
on:
  push:
    branches: [main, pre-production, develop]
  pull_request:
    branches: [main, pre-production, develop]

# Manual trigger
workflow_dispatch:
  inputs:
    deploy-target:
      description: 'Target environment'
      required: true
      default: 'staging'
```

**Trigger Conditions**:
- Push to main → Deploy to production
- Push to pre-production → Deploy to staging
- Push to develop → Run tests only
- PR to main → Run tests, block merge if failing
- Manual trigger → Deploy to specified environment

---

## GitHub Actions Workflows

### Authentication Service Test Workflow

**File**: `.github/workflows/auth-tests.yml`

```yaml
name: Auth Test Suite

on:
  push:
  pull_request:

jobs:
  auth-tests:
    runs-on: ubuntu-latest
    defaults:
      run:
        working-directory: auth
    
    steps:
      - name: Checkout repository
        uses: actions/checkout@v4
      
      - name: Set up Python
        uses: actions/setup-python@v5
        with:
          python-version: "3.11"
      
      - name: Cache pip dependencies
        uses: actions/cache@v3
        with:
          path: ~/.cache/pip
          key: ${{ runner.os }}-pip-${{ hashFiles('**/requirements.txt') }}
          restore-keys: |
            ${{ runner.os }}-pip-
      
      - name: Install dependencies
        run: |
          python -m pip install --upgrade pip
          pip install -r requirements.txt
      
      - name: Run authentication tests
        run: python manage.py test users.tests
      
      - name: Upload coverage reports
        uses: codecov/codecov-action@v3
        if: always()
```

### Comprehensive CI/CD Workflow Template

**Recommended**: `.github/workflows/ci-cd-pipeline.yml`

```yaml
name: CI/CD Pipeline

on:
  push:
    branches: [main, pre-production, develop]
  pull_request:
    branches: [main, pre-production, develop]

env:
  REGISTRY: railway  # or docker hub
  SERVICES: auth ticket_service workflow_api messaging notification_service

jobs:
  # ============================================================
  # CI STAGE: Test and Build
  # ============================================================
  
  test:
    name: Test Suite
    runs-on: ubuntu-latest
    strategy:
      matrix:
        service: [auth, ticket_service, workflow_api]
    
    steps:
      - uses: actions/checkout@v4
      
      - name: Set up Python
        uses: actions/setup-python@v5
        with:
          python-version: "3.11"
      
      - name: Install dependencies
        run: |
          cd ${{ matrix.service }}
          pip install -r requirements.txt
      
      - name: Run tests
        run: |
          cd ${{ matrix.service }}
          python manage.py test
      
      - name: Upload coverage
        uses: codecov/codecov-action@v3
        with:
          files: ${{ matrix.service }}/coverage.xml
  
  lint:
    name: Code Quality
    runs-on: ubuntu-latest
    
    steps:
      - uses: actions/checkout@v4
      
      - name: Set up Python
        uses: actions/setup-python@v5
        with:
          python-version: "3.11"
      
      - name: Lint with flake8
        run: |
          pip install flake8
          # Stop build on syntax errors
          flake8 . --count --select=E9,F63,F7,F82 --show-source --statistics
          # Exit with error on warnings
          flake8 . --count --exit-zero --max-complexity=10 --max-line-length=127 --statistics
      
      - name: Format check with black
        run: |
          pip install black
          black --check .
  
  frontend-lint:
    name: Frontend Quality
    runs-on: ubuntu-latest
    
    defaults:
      run:
        working-directory: frontend
    
    steps:
      - uses: actions/checkout@v4
      
      - name: Set up Node
        uses: actions/setup-node@v3
        with:
          node-version: "18"
          cache: npm
      
      - name: Install dependencies
        run: npm ci
      
      - name: Run ESLint
        run: npm run lint
      
      - name: Build frontend
        run: npm run build
  
  build:
    name: Build Docker Images
    runs-on: ubuntu-latest
    needs: [test, lint, frontend-lint]
    if: github.event_name == 'push'
    
    steps:
      - uses: actions/checkout@v4
      
      - name: Set up Docker Buildx
        uses: docker/setup-buildx-action@v2
      
      - name: Login to Railway
        uses: docker/login-action@v2
        with:
          registry: ${{ env.REGISTRY }}
          username: ${{ secrets.RAILWAY_USERNAME }}
          password: ${{ secrets.RAILWAY_PASSWORD }}
      
      - name: Build and push services
        run: |
          for service in auth ticket_service workflow_api messaging notification_service; do
            docker build \
              -t $REGISTRY/$service:${{ github.sha }} \
              -t $REGISTRY/$service:latest \
              $service/
            docker push $REGISTRY/$service:${{ github.sha }}
            docker push $REGISTRY/$service:latest
          done
  
  # ============================================================
  # CD STAGE: Deploy
  # ============================================================
  
  deploy:
    name: Deploy to Railway
    runs-on: ubuntu-latest
    needs: build
    if: github.ref == 'refs/heads/main' || github.ref == 'refs/heads/pre-production'
    
    strategy:
      matrix:
        service: [auth, ticket_service, workflow_api, messaging, notification_service]
    
    steps:
      - uses: actions/checkout@v4
      
      - name: Deploy to Railway
        uses: railwayapp/railway-action@v1
        with:
          token: ${{ secrets.RAILWAY_TOKEN }}
          service: ${{ matrix.service }}
          environment: ${{ github.ref == 'refs/heads/main' && 'production' || 'staging' }}
      
      - name: Wait for deployment
        run: sleep 30
      
      - name: Health check
        run: |
          max_attempts=10
          attempt=0
          while [ $attempt -lt $max_attempts ]; do
            response=$(curl -s -o /dev/null -w "%{http_code}" \
              "https://${{ matrix.service }}.railway.app/health/")
            if [ $response -eq 200 ]; then
              echo "Health check passed for ${{ matrix.service }}"
              exit 0
            fi
            attempt=$((attempt + 1))
            sleep 10
          done
          echo "Health check failed for ${{ matrix.service }}"
          exit 1
      
      - name: Smoke tests
        run: |
          # Basic API functionality tests
          curl -X GET "https://${{ matrix.service }}.railway.app/api/health/"
  
  # ============================================================
  # POST-DEPLOYMENT
  # ============================================================
  
  notify:
    name: Notify Team
    runs-on: ubuntu-latest
    needs: deploy
    if: always()
    
    steps:
      - name: Send Slack notification
        uses: slackapi/slack-github-action@v1.24.0
        if: always()
        with:
          webhook-url: ${{ secrets.SLACK_WEBHOOK }}
          payload: |
            {
              "text": "Deployment ${{ job.status }}: ${{ github.workflow }}",
              "blocks": [
                {
                  "type": "section",
                  "text": {
                    "type": "mrkdwn",
                    "text": "*Deployment Status*: ${{ job.status }}\n*Ref*: ${{ github.ref }}\n*Commit*: ${{ github.sha }}"
                  }
                }
              ]
            }
```

---

## Build Process

### Docker Build Strategy

#### **Multi-Service Build**

```bash
#!/bin/bash
# Scripts/docker.sh

set -e

SERVICES=("auth" "ticket_service" "workflow_api" "messaging" "notification_service")
DOCKER_REGISTRY="railway"

echo "Building Docker images..."

for service in "${SERVICES[@]}"; do
    echo "Building $service..."
    docker build \
        -f "$service/Dockerfile" \
        -t "$DOCKER_REGISTRY/$service:latest" \
        -t "$DOCKER_REGISTRY/$service:$(date +%Y%m%d%H%M%S)" \
        "$service/"
    
    if [ $? -eq 0 ]; then
        echo "✅ $service built successfully"
    else
        echo "❌ Failed to build $service"
        exit 1
    fi
done

echo "All services built successfully!"
```

#### **Dockerfile Optimization**

```dockerfile
# Multi-stage build (recommended for future)
FROM python:3.11-slim as builder

WORKDIR /app
RUN apt-get update && apt-get install -y build-essential libpq-dev
COPY requirements.txt .
RUN pip install --user -r requirements.txt

# Runtime stage
FROM python:3.11-slim

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1

WORKDIR /app
RUN apt-get update && apt-get install -y libpq5

# Copy Python packages from builder
COPY --from=builder /root/.local /root/.local
ENV PATH=/root/.local/bin:$PATH

# Copy application code
COPY . .
RUN chmod +x entrypoint.sh

EXPOSE 8000
HEALTHCHECK --interval=30s --timeout=10s --start-period=40s --retries=3 \
    CMD curl -f http://localhost:8000/health/ || exit 1

CMD ["./entrypoint.sh"]
```

### Build Caching Strategy

**Layer Caching**:
```dockerfile
# Leverage Docker layer caching
COPY requirements.txt .
RUN pip install -r requirements.txt  # Cached if requirements unchanged

# Application code (changes frequently, invalidates cache)
COPY . .
```

**Build Time**: ~2 minutes per service (with cache)

---

## Testing Strategy

### Test Hierarchy

```
┌─────────────────────────────────────────────────┐
│ E2E Tests (Selenium/Cypress)                    │
│ • Full user workflows                           │
│ • Run on staging before production               │
│ • ~15 minutes                                   │
└─────────────────────────────────────────────────┘
                      ↑
┌─────────────────────────────────────────────────┐
│ Integration Tests (Django TestCase)             │
│ • Service-to-service communication              │
│ • Database operations                           │
│ • Celery task execution                         │
│ • ~3 minutes                                    │
└─────────────────────────────────────────────────┘
                      ↑
┌─────────────────────────────────────────────────┐
│ Unit Tests (pytest/Django unittest)             │
│ • Individual functions/methods                  │
│ • Mocked dependencies                           │
│ • ~1 minute                                     │
└─────────────────────────────────────────────────┘
```

### Unit Testing Example

**File**: `auth/users/tests.py`

```python
from django.test import TestCase
from django.contrib.auth import get_user_model
from rest_framework.test import APITestCase, APIClient
from rest_framework import status

User = get_user_model()

class UserAuthenticationTests(TestCase):
    def setUp(self):
        self.user = User.objects.create_user(
            username='testuser',
            email='test@example.com',
            password='testpass123'
        )
    
    def test_user_creation(self):
        """Test user can be created"""
        self.assertEqual(User.objects.count(), 1)
        self.assertEqual(self.user.username, 'testuser')
    
    def test_password_hashing(self):
        """Test password is hashed, not stored plaintext"""
        self.assertNotEqual(self.user.password, 'testpass123')
        self.assertTrue(self.user.check_password('testpass123'))

class UserLoginAPITests(APITestCase):
    def setUp(self):
        self.client = APIClient()
        self.user = User.objects.create_user(
            username='testuser',
            email='test@example.com',
            password='testpass123'
        )
    
    def test_login_success(self):
        """Test successful login returns tokens"""
        response = self.client.post('/api/v1/token/', {
            'username': 'testuser',
            'password': 'testpass123'
        })
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIn('access', response.data)
        self.assertIn('refresh', response.data)
    
    def test_login_invalid_credentials(self):
        """Test login fails with invalid credentials"""
        response = self.client.post('/api/v1/token/', {
            'username': 'testuser',
            'password': 'wrongpassword'
        })
        
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)
```

### Running Tests

```bash
# Run all tests in service
cd auth
python manage.py test

# Run specific test class
python manage.py test users.tests.UserAuthenticationTests

# Run with coverage
pip install coverage
coverage run --source='.' manage.py test
coverage report

# Run with verbose output
python manage.py test --verbosity=2
```

---

## Deployment Pipeline

### Railway Deployment Flow

#### **Step 1: GitHub Integration**

1. Connect repository to Railway
2. Railway creates webhook on GitHub
3. Every push triggers deployment

#### **Step 2: Build Phase**

```bash
# Railway automatically:
1. Clones repository
2. Builds Docker image from Dockerfile
3. Runs build hooks (if defined in Procfile)
```

**Optional Procfile**:
```procfile
release: python manage.py migrate
web: gunicorn config.wsgi
worker: celery -A service_name worker
```

#### **Step 3: Deployment Phase**

```bash
# Railway uses blue-green deployment:
1. Start new container (Green)
2. Wait for health checks to pass
3. Route traffic to new container
4. Terminate old container (Blue)
5. Total downtime: 0 seconds
```

#### **Step 4: Post-Deployment**

```bash
# Railway automatically:
1. Monitors application health
2. Checks for errors (first 2 minutes)
3. Rollback if errors detected
4. Keep old container for 5 minutes
```

### Manual Deployment

```bash
# Deploy specific service to Railway
railway up auth-service --environment production

# View logs
railway logs

# Rollback to previous version
railway status
railway rollback
```

---

## Infrastructure as Code

### Docker Compose (Local Development)

**File**: `Docker/docker-compose.yml`

```yaml
version: '3.8'

services:
  db:
    image: postgres:15
    environment:
      POSTGRES_PASSWORD: postgrespass
    volumes:
      - postgres_data:/var/lib/postgresql/data
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U postgres"]
      interval: 10s
      timeout: 5s
      retries: 5
  
  rabbitmq:
    image: rabbitmq:3-management
    environment:
      RABBITMQ_DEFAULT_USER: admin
      RABBITMQ_DEFAULT_PASS: admin
    healthcheck:
      test: ["CMD", "rabbitmq-diagnostics", "-q", "ping"]
      interval: 30s
      timeout: 10s
      retries: 5
  
  auth-service:
    build: ../auth
    depends_on:
      db:
        condition: service_healthy
      rabbitmq:
        condition: service_healthy
    environment:
      DATABASE_URL: "postgres://postgres:postgrespass@db:5432/authservice"
      DJANGO_CELERY_BROKER_URL: "amqp://admin:admin@rabbitmq:5672/"
    ports:
      - "8003:8000"
    command: sh -c "sleep 10 && ./entrypoint.sh"

volumes:
  postgres_data:
  rabbitmq_data:
```

### Railway Configuration

**File**: `railway.toml` (optional)

```toml
[build]
dockerfile = "Dockerfile"
context = "."

[deploy]
startCommand = "./entrypoint.sh"
healthcheckPath = "/health/"
healthcheckInterval = 10
restartPolicyCondition = "on-failure"
restartPolicyMaxRetries = 5
```

---

## Monitoring and Observability

### Application Monitoring

#### **Built-in Railway Monitoring**

Access via Railway dashboard:
- CPU usage
- Memory usage
- Disk I/O
- Network bandwidth
- HTTP response codes
- Deployment history

#### **Custom Health Checks**

```python
# health/views.py
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import AllowAny
from rest_framework.response import Response
from django.core.cache import cache
from django.db import connection

@api_view(['GET'])
@permission_classes([AllowAny])
def health_check(request):
    checks = {
        'status': 'healthy',
        'timestamp': timezone.now().isoformat(),
    }
    
    # Database check
    try:
        with connection.cursor() as cursor:
            cursor.execute("SELECT 1")
        checks['database'] = 'ok'
    except Exception as e:
        checks['database'] = f'error: {str(e)}'
        checks['status'] = 'unhealthy'
    
    # Cache check (if applicable)
    try:
        cache.set('health_check', 'ok', 10)
        if cache.get('health_check') == 'ok':
            checks['cache'] = 'ok'
    except Exception as e:
        checks['cache'] = f'error: {str(e)}'
    
    # Celery check
    try:
        from celery import current_app
        if current_app.control.inspect().ping():
            checks['celery'] = 'ok'
        else:
            checks['celery'] = 'no workers'
    except Exception as e:
        checks['celery'] = f'error: {str(e)}'
    
    status_code = 200 if checks['status'] == 'healthy' else 503
    return Response(checks, status=status_code)
```

### Log Aggregation

#### **Viewing Logs**

```bash
# Railway logs
railway logs

# Filter by service
railway logs auth-service

# Follow logs in real-time
railway logs -f

# View local Docker logs
docker logs <container_name>
docker logs -f <container_name>  # Follow
```

#### **Structured Logging**

```python
import logging
import json

class JSONFormatter(logging.Formatter):
    def format(self, record):
        log_data = {
            'timestamp': record.created,
            'level': record.levelname,
            'message': record.getMessage(),
            'logger': record.name,
            'module': record.module,
        }
        if record.exc_info:
            log_data['exception'] = self.formatException(record.exc_info)
        return json.dumps(log_data)

logging.basicConfig(
    level=logging.INFO,
    format='%(message)s',
    handlers=[
        logging.StreamHandler()
    ]
)
logger = logging.getLogger(__name__)
logger.handlers[0].setFormatter(JSONFormatter())
```

---

## Rollback Procedures

### Automatic Rollback

Railway automatically rolls back if:
- Health check fails 3 times in a row
- Service starts crashing repeatedly
- OOM (Out of Memory) kills the process

### Manual Rollback

#### **Railway CLI**

```bash
# View deployment history
railway status

# Identify previous stable version
railway deployments --limit 10

# Rollback to specific version
railway rollback <deployment_id>

# Or simple rollback to previous
railway status --follow  # Monitor during rollback
```

#### **Docker Compose Rollback**

```bash
# Stop current deployment
docker-compose down

# Revert to previous image tag
docker-compose.yml  # Edit to use 'latest-stable' tag

# Restart
docker-compose up -d
```

### Rollback Testing

```bash
# Deploy to staging first
git push origin staging

# Test changes
# (run tests against staging environment)

# If OK, deploy to production
git push origin main

# If not OK, rollback
railway rollback
```

---

## Release Management

### Semantic Versioning

Format: `MAJOR.MINOR.PATCH`

```
1.2.3
│ │ └─ Patch: Bug fixes, security patches
│ └─── Minor: New features, backward compatible
└───── Major: Breaking changes
```

### Tagging Releases

```bash
# Create release tag
git tag -a v1.2.3 -m "Release version 1.2.3"
git push origin v1.2.3

# Create GitHub Release
# Use GitHub web interface or:
gh release create v1.2.3 --title "Version 1.2.3" --notes "Release notes here"
```

### Release Notes Template

```markdown
# Version 1.2.3 (2024-01-15)

## New Features
- Feature 1 description
- Feature 2 description

## Bug Fixes
- Fixed issue #123: Description
- Fixed issue #124: Description

## Breaking Changes
- Removed deprecated endpoint X
- Changed authentication header format

## Migration Instructions
```bash
python manage.py migrate
```

## Security Updates
- Patched vulnerability in dependency X

## Contributors
- @username1
- @username2
```

---

## Security in CI/CD

### Secrets Management

#### **GitHub Secrets**

Store sensitive data in GitHub repository settings:

```yaml
steps:
  - name: Deploy with secrets
    env:
      RAILWAY_TOKEN: ${{ secrets.RAILWAY_TOKEN }}
      DATABASE_PASSWORD: ${{ secrets.DATABASE_PASSWORD }}
      API_KEY: ${{ secrets.API_KEY }}
    run: |
      echo "Using secrets safely"
```

**Never**:
- Commit secrets to repository
- Print secrets in logs
- Share secrets in public channels

#### **Secret Rotation**

```bash
# Regularly rotate secrets
# 1. Generate new secret
# 2. Update in Railway environment variables
# 3. Update GitHub secrets
# 4. Invalidate old secret
# 5. Deploy code using new secret
```

### Dependency Scanning

#### **GitHub Dependabot**

Automatically checks for vulnerable dependencies:

```yaml
# .github/dependabot.yml
version: 2
updates:
  - package-ecosystem: "pip"
    directory: "/"
    schedule:
      interval: "weekly"
    reviewers:
      - "security-team"
  
  - package-ecosystem: "npm"
    directory: "/frontend"
    schedule:
      interval: "weekly"
```

#### **SAST (Static Application Security Testing)**

Recommended: GitHub CodeQL

```yaml
# .github/workflows/codeql-analysis.yml
name: "CodeQL"

on:
  push:
    branches: [main, pre-production]
  schedule:
    - cron: '0 2 * * 0'

jobs:
  analyze:
    name: Analyze
    runs-on: ubuntu-latest
    
    strategy:
      fail-fast: false
      matrix:
        language: ['python', 'javascript']
    
    steps:
      - name: Checkout repository
        uses: actions/checkout@v3
      
      - name: Initialize CodeQL
        uses: github/codeql-action/init@v2
        with:
          languages: ${{ matrix.language }}
      
      - name: Autobuild
        uses: github/codeql-action/autobuild@v2
      
      - name: Perform CodeQL Analysis
        uses: github/codeql-action/analyze@v2
```

---

## Best Practices

### Branch Strategy (Git Flow)

```
main (production)
  ├─ pre-production/staging
  │   ├─ develop
  │   │   ├─ feature/ticket-management
  │   │   ├─ feature/user-authentication
  │   │   └─ bugfix/fix-login-issue
  │   └─ hotfix/security-patch
```

**Branch Protection Rules** (on main):
- Require pull request reviews (2 reviewers)
- Require status checks to pass
- Require branches to be up to date
- Dismiss stale PR approvals
- Require commit signatures

### Commit Message Conventions

```
type(scope): subject

body

footer

---

Type: feat, fix, docs, style, refactor, test, chore
Scope: auth, tickets, workflow, etc
Subject: 50 characters or less
Body: Explain what and why, not how
Footer: Closes #123
```

Example:
```
feat(auth): add JWT token refresh

Add automatic refresh token rotation for improved security.
- Refresh token rotated on each use
- Old tokens added to blacklist
- Reduces token lifetime to 1 hour

Closes #456
```

### Documentation

- Keep README.md updated
- Document API changes
- Update deployment guide
- Maintain runbooks for common issues

### Monitoring Checklist

- [x] Application health checks
- [x] Error tracking (Sentry recommended)
- [x] Log aggregation (Railway logs)
- [x] Performance monitoring
- [x] Uptime monitoring
- [ ] Alert notifications (Slack/PagerDuty)
- [ ] Incident response playbooks
- [ ] Regular disaster recovery drills

---

## Troubleshooting

### Common Issues

#### **Deployment Fails**

```bash
# Check logs
railway logs

# Common causes:
# 1. Health check fails
#    - Check service is accessible
#    - Verify health endpoint exists

# 2. Database migration fails
#    - Check DATABASE_URL is valid
#    - Verify credentials

# 3. Environment variable missing
#    - Check Railway environment variables
#    - Verify required variables set
```

#### **Service Crashes After Deployment**

```bash
# Rollback immediately
railway rollback

# Investigate root cause
railway logs -f

# Common causes:
# 1. Out of memory (OOM)
#    - Increase container memory
#    - Check for memory leaks

# 2. Dependency incompatibility
#    - Test locally first
#    - Check Python/package versions

# 3. Database connection issue
#    - Verify DATABASE_URL
#    - Check PostgreSQL is running
```

#### **Tests Fail in CI**

```bash
# Run tests locally
cd <service>
python manage.py test

# Install development dependencies
pip install -r requirements-dev.txt

# Run specific failing test
python manage.py test users.tests.UserAuthenticationTests
```

---

## Conclusion

The CI/CD pipeline automates the entire software lifecycle from code commit to production deployment. GitHub Actions provides robust testing and building, while Railway ensures zero-downtime deployments with automatic rollback capabilities.

Key principles:
1. **Automated Testing**: Every push runs tests
2. **Continuous Deployment**: Code automatically deploys when tests pass
3. **Zero Downtime**: Blue-green deployment strategy
4. **Security First**: Secrets management and dependency scanning
5. **Monitoring**: Comprehensive health checks and logging
6. **Rollback Ready**: Instant rollback if issues detected

---

## References

- GitHub Actions Documentation: https://docs.github.com/en/actions
- Railway Documentation: https://docs.railway.app/
- Docker Best Practices: https://docs.docker.com/develop/dev-best-practices/
- Git Flow: https://nvie.com/posts/a-successful-git-branching-model/
- Semantic Versioning: https://semver.org/
- Conventional Commits: https://www.conventionalcommits.org/
