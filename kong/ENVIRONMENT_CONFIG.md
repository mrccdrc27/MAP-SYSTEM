# Kong API Gateway - Environment Configuration Guide

## Overview

Kong configurations now use **environment variables** for all service endpoints, making deployments flexible across development, staging, and production environments.

## Environment Variables

### Quick Setup

```bash
# 1. Copy example file
cp .env.example .env

# 2. Edit .env with your configuration
# For local dev, defaults work out of the box
```

### Service Endpoint Variables

**For Helpdesk (4 types as requested):**

```bash
# 1. Auth Service - Authentication & Authorization
AUTH_SERVICE_HOST=host.docker.internal
AUTH_SERVICE_PORT=8003

# 2. HDTS Backend - Helpdesk Backend API
HELPDESK_BACKEND_HOST=host.docker.internal
HELPDESK_BACKEND_PORT=5001

# 3. Workflow API - TTS/Workflow Backend
WORKFLOW_API_HOST=host.docker.internal
WORKFLOW_API_PORT=1001

# 4. WebSocket Services - Real-time Communication
MESSAGING_SERVICE_HOST=host.docker.internal      # Chat/messaging
MESSAGING_SERVICE_PORT=1002
NOTIFICATION_SERVICE_HOST=host.docker.internal   # Notifications
NOTIFICATION_SERVICE_PORT=1003
```

### Configuration by Environment

#### Local Development (Kong in Docker, Services on Host)
```bash
AUTH_SERVICE_HOST=host.docker.internal
WORKFLOW_API_HOST=host.docker.internal
HELPDESK_BACKEND_HOST=host.docker.internal
MESSAGING_SERVICE_HOST=host.docker.internal
NOTIFICATION_SERVICE_HOST=host.docker.internal
```

#### Docker Compose (All Services in Docker)
```bash
AUTH_SERVICE_HOST=auth-service
WORKFLOW_API_HOST=workflow-api
HELPDESK_BACKEND_HOST=helpdesk-backend
MESSAGING_SERVICE_HOST=messaging-service
NOTIFICATION_SERVICE_HOST=notification-service
```

#### Production (Domain Names)
```bash
AUTH_SERVICE_HOST=auth.yourdomain.com
WORKFLOW_API_HOST=api.yourdomain.com
HELPDESK_BACKEND_HOST=helpdesk-api.yourdomain.com
MESSAGING_SERVICE_HOST=ws.yourdomain.com
NOTIFICATION_SERVICE_HOST=notifications.yourdomain.com
```

## Frontend Configuration Examples

### Helpdesk Frontend (.env)
```env
# API Gateway (Kong)
VITE_API_GATEWAY=http://localhost:8080

# 1. Auth endpoint
VITE_AUTH_URL=http://localhost:8080/api/auth

# 2. HDTS backend endpoint  
VITE_HDTS_BACKEND=http://localhost:8080/helpdesk

# 3. Workflow API endpoint
VITE_WORKFLOW_API=http://localhost:8080/workflow

# 4. WebSocket endpoints
VITE_MESSAGING_WS=ws://localhost:8080/messaging/ws
VITE_NOTIFICATION_WS=ws://localhost:8080/notification/ws
```

### Workflow Frontend (.env)
```env
VITE_API_BASE_URL=http://localhost:8080
VITE_AUTH_URL=http://localhost:8080/api/auth
VITE_WORKFLOW_API=http://localhost:8080/workflow
VITE_MESSAGING_WS=ws://localhost:8080/messaging/ws
VITE_NOTIFICATION_WS=ws://localhost:8080/notification/ws
```

## Usage

### With Docker Compose

The environment variables are automatically set in `docker-compose-kong.yml`:

```bash
cd tts/Docker
docker-compose -f docker-compose-kong.yml up -d
```

### Standalone Kong Container

```bash
docker run -d --name kong \
  --network=host \
  -v $(pwd)/kong.local.yml:/kong/kong.yml:ro \
  --env-file .env \
  kong:3.4
```

### Updating Configuration

After changing `.env`:

```bash
# Reload Kong (no downtime)
docker exec kong kong reload

# Or restart container
docker restart kong
```

## Verification

```bash
# Check environment variables are loaded
docker exec kong env | grep SERVICE

# Test service connectivity
docker exec kong curl http://${AUTH_SERVICE_HOST}:8003/api/health

# Check Kong routes
curl http://localhost:8001/services
curl http://localhost:8001/routes
```

## Troubleshooting

### Service Not Found

```bash
# Verify env vars
docker exec kong printenv | grep AUTH_SERVICE

# Test from Kong container
docker exec kong ping auth-service              # Docker network
docker exec kong ping host.docker.internal      # Host machine
```

### Frontend Can't Connect

1. Verify Kong is listening on 8080: `curl http://localhost:8080`
2. Check CORS origins match frontend URL
3. Verify frontend .env uses `http://localhost:8080` as base

### Configuration Not Applied

```bash
# Validate YAML syntax
docker run --rm -v $(pwd)/kong.yml:/kong.yml kong:3.4 kong config parse /kong.yml

# Check logs
docker logs kong

# Force restart
docker restart kong
```

## Best Practices

1. ✅ **Never commit `.env`** - use `.env.example` as template
2. ✅ **Use service names in Docker** - don't use IPs
3. ✅ **Set Kong port to 8080** - standard for gateways
4. ✅ **Match JWT secrets** across all services
5. ✅ **Use environment-specific configs** - dev/staging/prod

## See Also

- [Kong README](README.md) - Full Kong setup guide
- [TTS Port Configuration](../TTS_ECOSYSTEM_PORT_CONFIGURATION.md) - Complete port mapping
- [.env.example](.env.example) - All available variables
