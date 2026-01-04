# Kong API Gateway - Microservices Design Philosophy

## Overview

This document outlines the design philosophy and architecture patterns for using Kong API Gateway as the central entry point for all microservices in the Ticket Tracking System.

## Architecture Philosophy

### Core Principles

1. **Single Entry Point**: All client requests flow through Kong Gateway on port 8000
2. **Service Isolation**: Each microservice has its own prefix to prevent endpoint conflicts
3. **Centralized Authentication**: JWT validation happens at the gateway level
4. **Transparent Path Rewriting**: Service prefixes are stripped before forwarding to backends
5. **Cookie-Based Auth**: Support both Authorization headers and HTTP cookies for JWT tokens

## Service Prefix Pattern

### Convention

Each microservice MUST have a unique prefix:

```
/auth/api/*         → Auth Service (8003)
/tickets/api/*      → Ticket Service (8004)
/workflow/api/*     → Workflow Service (8002)
/messaging/api/*    → Messaging Service
/notifications/api/* → Notification Service
/ams/api/*          → Asset Management Service
/bms/api/*          → Budget Management Service
```

### Why Prefixes?

In a microservices architecture, multiple services may have similar endpoints:
- Auth: `/api/v1/users/profile`
- Tickets: `/api/v1/users/profile` (ticket creator info)
- AMS: `/api/v1/users/profile` (asset manager info)

Without prefixes, these would conflict. With prefixes:
- `/auth/api/v1/users/profile` → Auth service
- `/tickets/api/v1/users/profile` → Ticket service  
- `/ams/api/v1/users/profile` → AMS service

## Kong Configuration Structure

### Service Definition

```yaml
services:
  - name: service-name-public
    url: http://host.docker.internal:PORT
    tags:
      - service-name
      - public
    routes:
      - name: service-public-routes
        paths:
          - /service-prefix/api/v1/login
          - /service-prefix/api/v1/register
          # ... other public endpoints
        methods:
          - GET
          - POST
          - OPTIONS
        strip_path: true
        preserve_host: true
    plugins:
      - name: pre-function
        config:
          access:
            - |
              local path = kong.request.get_path()
              local new_path = path:gsub("^/service-prefix", "")
              kong.service.request.set_path(new_path)
```

### Path Rewriting Logic

**Request Flow:**
```
Frontend → Kong → Backend
/auth/api/v1/users/login → (strip /auth) → /api/v1/users/login
```

**Implementation:**
- Use `pre-function` plugin to execute Lua code
- Match the service prefix pattern: `^/service-prefix`
- Strip prefix and forward clean path to backend
- Backend sees standard `/api/*` paths

## Authentication Strategy

### Public Routes

**No JWT Required:**
- Login endpoints
- Registration endpoints
- Password reset endpoints
- Token refresh endpoints
- Health checks

**Configuration:**
```yaml
- name: service-public
  routes:
    - paths:
        - /service-prefix/api/v1/login
        - /service-prefix/api/v1/register
```

### Protected Routes

**JWT Required:**
- User profiles
- Data CRUD operations
- Administrative endpoints

**Configuration:**
```yaml
- name: service-protected
  routes:
    - paths:
        - /service-prefix/api/v1
  plugins:
    - name: pre-function
      config:
        access:
          - | # Path rewriting
            local path = kong.request.get_path()
            local new_path = path:gsub("^/service-prefix", "")
            kong.service.request.set_path(new_path)
    - name: jwt
      config:
        key_claim_name: iss
        secret_is_base64: false
        claims_to_verify:
          - exp
        header_names:
          - authorization
        cookie_names:
          - access_token
```

### JWT Configuration

**Token Sources (in order of precedence):**
1. `Authorization: Bearer <token>` header
2. `access_token` cookie
3. `jwt` URL parameter

**JWT Claims:**
- `iss`: Issuer (e.g., "tts-jwt-issuer")
- `exp`: Expiration timestamp
- `email`: User email
- `username`: Username
- `user_type`: staff | employee
- `roles`: Array of user roles

**Kong Validation:**
```yaml
jwt_secrets:
  - consumer: auth-service
    key: tts-jwt-issuer  # Must match JWT issuer claim
    secret: "signing-key-1234"  # Must match backend signing key
    algorithm: HS256
```

## Frontend Integration

### Vite Proxy Configuration

**Development Setup:**
```javascript
// vite.config.js
export default defineConfig({
  server: {
    port: 3001,
    proxy: {
      '/auth/api': {
        target: 'http://localhost:8000',  // Kong Gateway
        changeOrigin: true,
        cookieDomainRewrite: 'localhost',
        cookiePathRewrite: '/',
      },
      '/tickets/api': {
        target: 'http://localhost:8000',
        changeOrigin: true,
      },
      // Add more service proxies as needed
    }
  }
})
```

### API Service Layer

**Endpoint Configuration:**
```javascript
// services/endpoints.js
export const AUTH_ENDPOINTS = {
  LOGIN: '/auth/api/v1/users/login/api/',
  PROFILE: '/auth/api/v1/users/profile/',
  LOGOUT: '/auth/api/v1/users/logout/',
}

export const TICKET_ENDPOINTS = {
  LIST: '/tickets/api/v1/tickets/',
  CREATE: '/tickets/api/v1/tickets/create/',
  DETAIL: (id) => `/tickets/api/v1/tickets/${id}/`,
}
```

## CORS Configuration

### Global CORS Plugin

```yaml
plugins:
  - name: cors
    config:
      origins:
        - "http://localhost:3001"  # Frontend dev server
        - "http://localhost:3000"  # Alternative port
      methods:
        - GET
        - POST
        - PUT
        - PATCH
        - DELETE
        - OPTIONS
      headers:
        - Authorization
        - Content-Type
        - X-CSRF-Token
      credentials: true  # Allow cookies
      max_age: 3600
```

### Why Credentials: true?

Required for:
- Cookie-based authentication
- Session management
- CSRF token handling

## Adding a New Service

### Step 1: Choose Service Prefix

```
/newservice/api/*
```

### Step 2: Create Kong Service Configuration

```yaml
# Public endpoints (no auth)
- name: newservice-public
  url: http://host.docker.internal:PORT
  tags:
    - newservice
    - public
  routes:
    - name: newservice-public-routes
      paths:
        - /newservice/api/v1/login
        - /newservice/api/v1/register
      methods:
        - GET
        - POST
        - OPTIONS
      strip_path: true
      preserve_host: true
  plugins:
    - name: pre-function
      config:
        access:
          - |
            local path = kong.request.get_path()
            local new_path = path:gsub("^/newservice", "")
            kong.service.request.set_path(new_path)

# Protected endpoints (auth required)
- name: newservice-protected
  url: http://host.docker.internal:PORT
  tags:
    - newservice
    - protected
  routes:
    - name: newservice-protected-routes
      paths:
        - /newservice/api/v1
  strip_path: true
  preserve_host: true
  plugins:
    - name: pre-function
      config:
        access:
          - |
            local path = kong.request.get_path()
            local new_path = path:gsub("^/newservice", "")
            kong.service.request.set_path(new_path)
    - name: jwt
      config:
        key_claim_name: iss
        cookie_names:
          - access_token
```

### Step 3: Update Frontend Proxy

```javascript
// vite.config.js
proxy: {
  '/newservice/api': {
    target: 'http://localhost:8000',
    changeOrigin: true,
  }
}
```

### Step 4: Create Service Endpoints

```javascript
// services/newservice.js
export const NEWSERVICE_ENDPOINTS = {
  RESOURCE: '/newservice/api/v1/resource/',
  ACTION: '/newservice/api/v1/action/',
}
```

### Step 5: Restart Kong

```bash
# PowerShell
.\Scripts\docker\start_kong.ps1 -Restart

# Or using CLI
npm run kong:full
```

## Docker Networking

### host.docker.internal

Kong runs in Docker but needs to reach services on the host machine:

```yaml
url: http://host.docker.internal:8003  # NOT localhost:8003
```

**Why?**
- `localhost` inside Docker refers to the container itself
- `host.docker.internal` is a special DNS name that resolves to the host machine
- Allows Kong container to reach host-based services

### Port Mapping

```yaml
# docker-compose.yml or Docker run
ports:
  - "8000:8000"  # Kong proxy (client-facing)
  - "8001:8001"  # Kong admin API
```

## Configuration Files

### Directory Structure

```
kong/
├── kong.yml              # Full config (all services)
├── kong.auth.yml         # Auth service only (development)
├── kong.local.yml        # Local override config
└── Dockerfile            # Kong Docker image
```

### Environment-Specific Configs

**Development (kong.auth.yml):**
- Single service (auth)
- Verbose logging
- Permissive CORS
- Debug-friendly settings

**Production (kong.yml):**
- All services
- Rate limiting enabled
- Strict CORS policies
- Production-grade security

## Rate Limiting

### Global Rate Limiting

```yaml
plugins:
  - name: rate-limiting
    config:
      minute: 200
      hour: 5000
      policy: local
      fault_tolerant: true
```

### Service-Specific Rate Limiting

```yaml
services:
  - name: auth-public
    plugins:
      - name: rate-limiting
        config:
          minute: 60  # Stricter for login endpoints
```

## Monitoring & Debugging

### Kong Admin API

```bash
# Check services
curl http://localhost:8001/services

# Check routes
curl http://localhost:8001/routes

# Check plugins
curl http://localhost:8001/plugins

# Health check
curl http://localhost:8001/status
```

### Request Logging

Kong logs show:
- Client IP
- HTTP method and path
- Status code
- Response time
- User agent

**Example:**
```
172.17.0.1 - - [04/Jan/2026:18:14:11 +0000] "POST /auth/api/v1/users/login/api/ HTTP/1.1" 200 1353 "-" "Mozilla/5.0..."
```

### Debug Mode

```bash
# View Kong logs
.\Scripts\docker\start_kong.ps1 -Logs

# Check specific service
docker exec kong-gateway curl http://localhost:8001/services/auth-public
```

## Security Best Practices

### 1. JWT Validation at Gateway

**DO:**
- Validate JWT at Kong level
- Backend can trust requests from Kong
- Single point of authentication

**DON'T:**
- Skip JWT validation at gateway
- Re-validate JWT in every service (redundant)

### 2. HTTPS in Production

```yaml
# Production Kong config
services:
  - name: auth-public
    url: https://auth-service:443  # HTTPS backend
    
routes:
  - name: auth-routes
    protocols:
      - https  # Force HTTPS
```

### 3. Secret Management

**DO:**
- Use environment variables for secrets
- Rotate JWT signing keys regularly
- Use different keys per environment

**DON'T:**
- Hardcode secrets in config files
- Share keys across environments
- Commit secrets to version control

### 4. CORS Configuration

**DO:**
- Whitelist specific origins
- Limit allowed methods
- Set appropriate max_age

**DON'T:**
- Use `origins: ["*"]` in production
- Allow all methods
- Set excessive max_age

## Troubleshooting Guide

### 404 - No Route Matched

**Cause:** Kong can't find matching route

**Fix:**
1. Check route paths in `kong.yml`
2. Verify service prefix matches frontend endpoint
3. Ensure Kong restarted after config change

### 401 - Unauthorized

**Cause:** JWT validation failed

**Fix:**
1. Check JWT `iss` claim matches Kong consumer key
2. Verify signing key matches backend
3. Ensure cookie name is `access_token`
4. Check token hasn't expired

### 302 - Redirect

**Cause:** Path rewriting not working, backend returning redirect

**Fix:**
1. Verify `pre-function` plugin is configured
2. Check Lua regex pattern: `^/service-prefix`
3. Test path rewriting with curl

### 403 - Forbidden

**Cause:** CSRF validation failed or insufficient permissions

**Fix:**
1. Ensure browser sends CSRF cookie
2. Check CORS credentials enabled
3. Verify user has required permissions

## Performance Optimization

### Connection Pooling

Kong reuses connections to backend services:

```yaml
services:
  - name: service-name
    connect_timeout: 60000
    write_timeout: 60000
    read_timeout: 60000
```

### Caching

Add response caching for read-heavy endpoints:

```yaml
plugins:
  - name: proxy-cache
    config:
      strategy: memory
      content_type: ["application/json"]
      cache_ttl: 300  # 5 minutes
```

### Load Balancing

Distribute requests across multiple service instances:

```yaml
services:
  - name: service-name
    url: http://host.docker.internal:8003
    
upstreams:
  - name: service-upstream
    targets:
      - target: host.docker.internal:8003
        weight: 100
      - target: host.docker.internal:8004
        weight: 100
```

## Future Enhancements

### Service Mesh Integration

Consider migrating to service mesh (Istio, Linkerd) for:
- Advanced traffic management
- Mutual TLS between services
- Distributed tracing
- Service-to-service authentication

### GraphQL Gateway

Add GraphQL layer for:
- Unified data fetching
- Reduced over-fetching
- Schema stitching across services

### WebSocket Support

Enable WebSocket for real-time features:

```yaml
routes:
  - name: websocket-route
    protocols:
      - http
      - https
      - ws
      - wss
```

## References

- Kong Documentation: https://docs.konghq.com
- Kong Declarative Config: https://docs.konghq.com/gateway/latest/production/deployment-topologies/db-less-and-declarative-config/
- JWT Plugin: https://docs.konghq.com/hub/kong-inc/jwt/
- Pre-function Plugin: https://docs.konghq.com/hub/kong-inc/pre-function/

## Maintenance

### Regular Tasks

**Weekly:**
- Review Kong access logs
- Check rate limiting metrics
- Monitor response times

**Monthly:**
- Update Kong to latest version
- Review and update CORS policies
- Audit JWT secret rotation

**Quarterly:**
- Load testing
- Security audit
- Performance optimization

### Configuration Backup

Always backup Kong configuration before changes:

```bash
# Export current config
curl http://localhost:8001/config > kong-backup-$(date +%Y%m%d).json

# Version control
git add kong/kong.yml
git commit -m "feat: add new service configuration"
```

---

**Document Version:** 1.0  
**Last Updated:** January 5, 2026  
**Maintained By:** Development Team
