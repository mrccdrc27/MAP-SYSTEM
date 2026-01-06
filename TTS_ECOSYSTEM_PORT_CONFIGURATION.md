# TTS Ecosystem Port Configuration

## Revision Date: January 6, 2026

This document outlines the standardized port configuration for the TTS (Ticket Tracking System) ecosystem with Kong API Gateway.

---

## Port Assignments

### 1. API Gateway
| Service | Port | Description |
|---------|------|-------------|
| **Kong Proxy** | **8080** | Main API Gateway entry point for all external traffic |
| Kong Admin API | 8001 | Kong administration interface (development only) |

### 2. Helpdesk System (HDTS)
| Service | Port | Description |
|---------|------|-------------|
| **Frontend** | **5000** | React/Vite frontend application |
| **Backend** | **5001** | Django REST API backend |

### 3. Workflow API System (TTS)
| Service | Port | Description |
|---------|------|-------------|
| **Frontend** | **1000** | React/Vite frontend application |
| **Backend** | **1001** | Django REST API backend |
| **Messaging Service** | **1002** | WebSocket/REST messaging service |
| **Notification Service** | **1003** | WebSocket/REST notification service |

### 4. Auth Service
| Service | Port | Description |
|---------|------|-------------|
| Auth Backend | 8003 | Django authentication & authorization service |

### 5. Infrastructure Services
| Service | Port | Description |
|---------|------|-------------|
| PostgreSQL | 5433 | Database server (mapped from internal 5432) |
| RabbitMQ AMQP | 5672 | Message broker |
| RabbitMQ Management | 15672 | RabbitMQ management UI |
| Mailpit SMTP | 1025 | Email testing (internal) |
| Mailpit Web UI | 8025 | Email testing web interface |

---

## Architecture Flow

```
┌─────────────────────────────────────────────────────────────────┐
│                        External Access                          │
└─────────────────────────────────────────────────────────────────┘
                                  │
                                  ▼
┌─────────────────────────────────────────────────────────────────┐
│                     Kong API Gateway (8080)                     │
│  - JWT Validation                                               │
│  - CORS Handling                                                │
│  - Rate Limiting                                                │
│  - Service Routing                                              │
└─────────────────────────────────────────────────────────────────┘
           │              │              │              │
           ▼              ▼              ▼              ▼
    ┌──────────┐   ┌──────────┐   ┌──────────┐   ┌──────────┐
    │   Auth   │   │ Workflow │   │Messaging │   │Helpdesk  │
    │  (8003)  │   │  (1001)  │   │  (1002)  │   │  (5001)  │
    │ Internal │   │ Internal │   │ Internal │   │ Internal │
    └──────────┘   └──────────┘   └──────────┘   └──────────┘
                         │
                         ▼
                  ┌──────────┐
                  │Notification│
                  │  (1003)  │
                  │ Internal │
                  └──────────┘
```

---

## Service Communication

### External → Kong Gateway
- **Frontend applications** connect to Kong at `http://localhost:8080`
- All API requests go through Kong proxy
- Kong validates JWT tokens at the edge
- Kong routes requests to appropriate backend services

### Frontend Applications
- **Workflow Frontend**: `http://localhost:1000`
- **Helpdesk Frontend**: `http://localhost:5000`

### Internal Service-to-Service (Docker Network)
Backend services communicate internally using service names and internal ports:

```yaml
# Workflow API references
DJANGO_AUTH_SERVICE_URL: "http://auth-service:8003"
DJANGO_NOTIFICATION_SERVICE_URL: "http://notification-service:1003"
DJANGO_TTS_SERVICE_URL: "http://workflow-api:1001"

# Kong Gateway Base URL
DJANGO_BASE_URL: "http://kong:8080"
```

### Container Port Mapping
Docker containers listen on internal ports and map to external ports:

| Container | Internal Port | External Port | Access |
|-----------|---------------|---------------|--------|
| workflow-api | 8000 | 1001 | via Kong |
| messaging-service | 8001 | 1002 | via Kong |
| notification-service | 8001 | 1003 | via Kong |
| helpdesk-backend | 8000 | 5001 | via Kong |
| auth-service | 8000 | 8003 | via Kong |
| kong | 8080 | 8080 | Direct |

---

## Configuration Files Updated

### Kong Configuration
1. **`kong/kong.yml`**
   - Service URLs updated to new internal ports
   - CORS origins updated for frontends (1000, 5000)
   - Upstream targets configured with new ports

2. **`kong/kong.local.yml`**
   - Local development URLs using `host.docker.internal`
   - Service ports: workflow (1001), messaging (1002), notification (1003), helpdesk (5001)

3. **`kong/kong.auth.yml`**
   - Auth-specific configuration
   - CORS origins for frontends (1000, 5000)

### Docker Compose Files
1. **`tts/Docker/docker-compose-kong.yml`**
   - Kong proxy listen port: 8080
   - Service port mappings: workflow (1001), messaging (1002), notification (1003), helpdesk (5001)
   - Updated service URLs in environment variables

2. **`tts/Docker/docker-compose.yml`**
   - Direct port mappings for development
   - Updated external port assignments

---

## Development Workflow

### Starting with Kong Gateway
```bash
cd tts/Docker
docker-compose -f docker-compose-kong.yml build
docker-compose -f docker-compose-kong.yml up -d
```

**Access Points:**
- Kong API Gateway: `http://localhost:8080`
- Kong Admin API: `http://localhost:8001`
- Frontend apps connect to: `http://localhost:8080/api/*`

### Starting Without Kong (Direct Access)
```bash
cd tts/Docker
docker-compose up -d
```

**Access Points:**
- Workflow API: `http://localhost:1001`
- Messaging: `http://localhost:1002`
- Notifications: `http://localhost:1003`
- Helpdesk: `http://localhost:5001`
- Auth: `http://localhost:8003`

### Local Development (Outside Docker)
When running services locally:
```bash
# Workflow API
cd tts/workflow_api
python manage.py runserver 0.0.0.0:1001

# Helpdesk
cd hdts/helpdesk
python manage.py runserver 0.0.0.0:5001

# Messaging
cd tts/messaging
daphne -b 0.0.0.0 -p 1002 messaging.asgi:application

# Notifications
cd tts/notification_service
daphne -b 0.0.0.0 -p 1003 notification_service.asgi:application
```

---

## Frontend Configuration

### Workflow Frontend (.env)
```env
VITE_API_BASE_URL=http://localhost:8080
VITE_AUTH_URL=http://localhost:8080/api/auth
VITE_WORKFLOW_API=http://localhost:8080/workflow
VITE_MESSAGING_WS=ws://localhost:8080/ws/messages
VITE_NOTIFICATION_WS=ws://localhost:8080/ws/notifications
```

### Helpdesk Frontend (.env)
```env
VITE_API_BASE_URL=http://localhost:8080
VITE_HELPDESK_API=http://localhost:8080/api/helpdesk
VITE_AUTH_URL=http://localhost:8080/api/auth
```

---

## Migration Notes

### Breaking Changes
1. **Kong proxy port changed**: `8000` → `8080`
2. **Workflow API backend**: `8002` → `1001`
3. **Messaging service**: `8005` → `1002`
4. **Notification service**: `8006` → `1003`
5. **Helpdesk backend**: `8000` → `5001`

### What Stays The Same
- Auth service: `8003` (unchanged)
- RabbitMQ: `5672` / `15672` (unchanged)
- PostgreSQL: `5433` (unchanged)
- Internal container ports (services still listen on 8000/8001 internally)

### Testing Checklist
- [ ] Kong starts successfully on port 8080
- [ ] Frontend apps load on ports 1000 (workflow) and 5000 (helpdesk)
- [ ] API requests route correctly through Kong
- [ ] JWT authentication works through Kong
- [ ] WebSocket connections establish (messaging, notifications)
- [ ] Service-to-service communication functions
- [ ] Celery workers process tasks correctly
- [ ] Email notifications send through Mailpit

---

## Troubleshooting

### Port Already in Use
```bash
# Check what's using a port (Windows)
netstat -ano | findstr :8080
netstat -ano | findstr :1001

# Kill process by PID
taskkill /PID <process_id> /F
```

### Kong Not Routing Correctly
```bash
# Check Kong configuration
curl http://localhost:8001/services
curl http://localhost:8001/routes

# View Kong logs
docker logs kong
```

### Service Can't Connect
1. Verify service is running: `docker ps`
2. Check service logs: `docker logs <service-name>`
3. Verify network connectivity: `docker network inspect tts-network`
4. Test internal DNS: `docker exec <container> ping <service-name>`

---

## References

- Kong Gateway Documentation: https://docs.konghq.com/gateway/
- Docker Compose Networking: https://docs.docker.com/compose/networking/
- TTS Architecture Guide: `KONG_MICROSERVICES_DESIGN.md`
- Copilot Instructions: `.github/copilot-instructions.md`
