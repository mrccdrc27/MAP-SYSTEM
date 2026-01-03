# Kong API Gateway Setup for TTS Ecosystem

This directory contains the Kong API Gateway configuration for the TTS (Ticket Tracking System) ecosystem.

## Architecture Overview

```
┌─────────────────┐
│   Frontend      │
│  (Port 1000)    │
└────────┬────────┘
         │ Authorization: Bearer <token>
         ▼
┌────────────────────────────────────────────────────┐
│         KONG API GATEWAY (Port 8000)               │
│  ┌─────────────────────────────────────────────┐   │
│  │  JWT Plugin (validates at edge)             │   │
│  │  - Verifies signature                       │   │
│  │  - Checks expiration                        │   │
│  │  - Validates issuer claim (iss)             │   │
│  └─────────────────────────────────────────────┘   │
│  ┌─────────────────────────────────────────────┐   │
│  │  Other Plugins                              │   │
│  │  - Rate Limiting, CORS, Logging             │   │
│  └─────────────────────────────────────────────┘   │
└────────────────────────────────────────────────────┘
         │
    ┌────┴────┬──────────┬──────────┬──────────┐
    ▼         ▼          ▼          ▼          ▼
┌───────┐ ┌───────┐ ┌─────────┐ ┌─────────┐ ┌────────┐
│ Auth  │ │Workflw│ │Notifictn│ │Messaging│ │Helpdesk│
│ 8003  │ │ 8002  │ │  8006   │ │  8005   │ │  8000  │
└───────┘ └───────┘ └─────────┘ └─────────┘ └────────┘
          (Services only accessible via Kong)
```

## Files

| File | Description |
|------|-------------|
| `kong.yml` | Docker declarative config (service discovery via Docker network) |
| `kong.local.yml` | Local development config (localhost URLs) |
| `Dockerfile` | Kong Docker image with declarative config |
| `.env.example` | Environment variables template |
| `gateway_auth.py` | Python authentication middleware for services |

## Quick Start

### Option 1: Docker (Recommended)

```bash
cd tts/Docker
docker-compose -f docker-compose-kong.yml up -d
```

This will:
1. Start Kong on port 8000 (proxy) and 8001 (admin)
2. Start all backend services on internal network only
3. Route all traffic through Kong gateway

### Option 2: Local Development (Without Kong)

Services run directly without Kong gateway:

```bash
pm2 start Scripts/processes/tts-ecosystem.config.js
```

### Option 3: Local Kong (Requires Kong Installation)

1. Install Kong locally: https://konghq.com/install
2. Start with local config:

```bash
# Set environment
export KONG_DATABASE=off
export KONG_DECLARATIVE_CONFIG=/path/to/kong/kong.local.yml

# Start Kong
kong start

# Or use PM2
pm2 start Scripts/processes/tts-ecosystem-kong.config.js
```

## Configuration

### JWT Secret

The JWT signing key **MUST** be the same across:
- Auth service (`DJANGO_JWT_SIGNING_KEY`)
- Kong gateway (`KONG_JWT_SECRET` or in kong.yml)
- All backend services

Default development key: `signing-key-1234`

### Service KONG_TRUSTED Mode

When running behind Kong, set `KONG_TRUSTED=true` in service environment:

```env
KONG_TRUSTED=true
```

This tells services to skip JWT signature verification (Kong already verified).

**Security Note**: Only enable KONG_TRUSTED when services are truly behind Kong and not directly accessible.

## API Routes

### Public Routes (No JWT Required)

| Route | Service |
|-------|---------|
| `/api/auth/login` | Auth Service |
| `/api/auth/token` | Auth Service |
| `/api/auth/token/refresh` | Auth Service |
| `/api/auth/register` | Auth Service |
| `/api/auth/password-reset` | Auth Service |

### Protected Routes (JWT Required)

| Route | Service |
|-------|---------|
| `/api/auth/*` | Auth Service |
| `/api/users/*` | Auth Service |
| `/api/workflow/*` | Workflow API |
| `/api/tickets/*` | Workflow API |
| `/api/notifications/*` | Notification Service |
| `/api/messages/*` | Messaging Service |
| `/api/helpdesk/*` | Helpdesk Service |

### WebSocket Routes

| Route | Service | Protocol |
|-------|---------|----------|
| `/ws/notifications/*` | Notification Service | ws/wss |
| `/ws/chat/*` | Messaging Service | ws/wss |
| `/ws/messages/*` | Messaging Service | ws/wss |

## Frontend Configuration

### Using Kong Gateway

Copy `.env.kong` to `.env` in frontend:

```bash
cp tts/frontend/.env.kong tts/frontend/.env
```

Or set environment variables:

```env
VITE_USE_KONG_GATEWAY=true
VITE_GATEWAY_URL=http://localhost:8000
VITE_GATEWAY_WS=ws://localhost:8000
```

### Bearer Token

Frontend automatically:
1. Stores JWT in localStorage after login
2. Attaches `Authorization: Bearer <token>` to all API requests
3. Passes token in WebSocket query params for real-time connections

## Troubleshooting

### Check Kong Status

```bash
# Admin API (local only)
curl http://localhost:8001/status

# List routes
curl http://localhost:8001/routes

# List services
curl http://localhost:8001/services
```

### Common Issues

1. **401 Unauthorized**
   - Check JWT signing key matches across services
   - Verify token has `iss: tts-jwt-issuer` claim
   - Check token not expired

2. **502 Bad Gateway**
   - Verify backend service is running
   - Check service URL in kong.yml matches container name

3. **WebSocket Connection Failed**
   - Verify WebSocket routes are configured for ws/wss protocols
   - Check token is passed in query params

### Logs

```bash
# Kong logs (Docker)
docker logs kong

# Kong logs (local)
tail -f /tmp/kong-access.log
```

## Security Considerations

1. **Production**: Remove admin API port exposure (8001)
2. **Production**: Use proper secrets, not default keys
3. **Production**: Enable HTTPS (SSL termination at Kong)
4. **Production**: Restrict CORS origins to actual domains
5. **Production**: Set `KONG_TRUSTED=true` only when services are network-isolated

## Migrating from Direct Service Access

1. Update frontend `.env` to use Kong URLs
2. Set `KONG_TRUSTED=true` in backend services
3. Remove direct port exposure from services
4. Test authentication flow through gateway
