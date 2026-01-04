# Auth Service with Kong Gateway Setup Guide

## Quick Start (TL;DR)

```bash
# 1. Start Kong Gateway (in Docker)
cd Scripts/cli && npm run kong

# 2. Start Auth Backend
cd auth && python manage.py migrate && python manage.py runserver 0.0.0.0:8003

# 3. Start Frontend
cd auth/frontend && npm install && npm run dev

# Access: http://localhost:3001 (Frontend) → http://localhost:8000 (Kong) → http://localhost:8003 (Backend)
```

---

## Table of Contents
1. [System Architecture](#system-architecture)
2. [Service Flow & Routing](#service-flow--routing)
3. [Implementation Plan](#implementation-plan)
4. [Configuration Guide](#configuration-guide)
5. [Development Setup](#development-setup)
6. [Production Deployment](#production-deployment)
7. [Security Considerations](#security-considerations)
8. [Troubleshooting](#troubleshooting)

---

## System Architecture

### Overview
The Auth service acts as the central authentication and authorization hub for the TTS (Ticket Tracking System) ecosystem, utilizing Kong API Gateway for request routing, JWT validation, and security enforcement.

### Architecture Components

```
┌─────────────────┐    ┌──────────────┐    ┌─────────────────┐
│   React Frontend│    │ Kong Gateway │    │  Auth Service   │
│   (Port 3001)   │───►│  (Port 8000) │───►│   (Port 8003)   │
└─────────────────┘    └──────────────┘    └─────────────────┘
         │                    │                      │
         │                    │                      │
    Vite Proxy           JWT Validation         SQLite/PostgreSQL
    (/api → Kong)        CORS, Rate Limit       User Management
```

**Request Flow:**
```
Browser → Frontend (3001) → Vite Proxy → Kong (8000) → Auth Backend (8003)
                                │
                          JWT Validation
                          CORS Headers
                          Rate Limiting
```

### Service Roles

| Component | Port | Responsibility |
|-----------|------|----------------|
| **Auth Frontend** | 3001 | React-based UI for authentication flows |
| **Kong Gateway** | 8000 | API Gateway, routing, JWT validation, CORS |
| **Kong Admin** | 8001 | Kong Admin API for management |
| **Auth Service** | 8003 | User management, JWT issuing, role/permission management |
| **Database** | SQLite | User data, roles, system configurations (default for dev) |

### Key Features
- **Centralized Authentication**: Single source of truth for user credentials
- **JWT-based Authorization**: Stateless token authentication across services
- **Role-based Access Control (RBAC)**: System-specific role assignments
- **Multi-system Support**: TTS, HDTS, AMS, BMS system integrations
- **API Gateway Security**: Kong handles all security at the edge

---

## Service Flow & Routing

### Authentication Flow

```mermaid
sequenceDiagram
    participant F as Frontend
    participant K as Kong Gateway
    participant A as Auth Service
    participant D as Database
    
    F->>K: POST /api/auth/login
    K->>A: Forward request (no JWT required)
    A->>D: Validate credentials
    D->>A: User data
    A->>A: Generate JWT token
    A->>K: Return JWT + user data
    K->>F: Forward response
    
    Note over F: Store JWT in localStorage/cookie
    
    F->>K: GET /api/users/profile (with JWT)
    K->>K: Validate JWT signature
    K->>A: Forward authorized request
    A->>K: Return user profile
    K->>F: Forward response
```

### Kong Route Configuration

#### Public Routes (No JWT Required)
```yaml
# Authentication endpoints - accessible without token
- paths:
    - /api/auth/login
    - /api/auth/token
    - /api/auth/token/refresh  
    - /api/auth/register
    - /api/auth/password-reset
    - /api/auth/password-reset-confirm
    - /api/auth/verify-email
```

#### Protected Routes (JWT Required)
```yaml
# User management and system administration
- paths:
    - /api/auth/*      # Auth service endpoints
    - /api/users/*     # User management
    - /api/roles/*     # Role management
    - /api/systems/*   # System configuration
    - /api/tts/*       # TTS-specific endpoints
    - /api/hdts/*      # HDTS-specific endpoints
```

### Frontend Routing Strategy

The auth frontend (`auth/frontend`) handles:

1. **Authentication Pages**
   - Login (`/login`)
   - Register (`/register`)  
   - Password Reset (`/password-reset`)
   - Email Verification (`/verify-email`)

2. **User Management**
   - Profile (`/profile`)
   - Settings (`/settings`)
   
3. **System Administration**
   - User Management (`/admin/users`)
   - Role Management (`/admin/roles`)
   - System Configuration (`/admin/systems`)

### API Proxy Configuration

```javascript
// vite.config.js - Development proxy
server: {
  port: 3001,
  proxy: {
    '/api': {
      target: 'http://localhost:8000',  // Kong Gateway
      changeOrigin: true,
    },
  },
}
```

---

## Implementation Plan

### Phase 1: Core Authentication Setup

#### 1.1 Kong Gateway Configuration
- [x] Configure Kong declarative config (`kong.yml`)
- [x] Set up JWT plugin for protected routes
- [x] Configure CORS for frontend origins
- [x] Define service discovery for auth-service

#### 1.2 Auth Service Backend
- [x] Django service with JWT authentication
- [x] User, Role, System models
- [x] REST API endpoints for authentication
- [x] PostgreSQL database integration

#### 1.3 Frontend Foundation
- [x] React application with Vite
- [x] Authentication components
- [x] API client configuration
- [ ] JWT token management utilities

### Phase 2: Advanced Features

#### 2.1 Multi-System Integration
- [ ] System-specific role assignments
- [ ] TTS/HDTS/AMS/BMS system routing
- [ ] Cross-system user synchronization

#### 2.2 Security Enhancements
- [ ] Rate limiting configuration
- [ ] Request/response logging
- [ ] Security headers enforcement
- [ ] API key management for service-to-service communication

#### 2.3 Production Readiness
- [ ] Docker containerization
- [ ] Environment-specific configurations
- [ ] Health checks and monitoring
- [ ] Backup and disaster recovery

### Phase 3: Operational Excellence

#### 3.1 Monitoring & Observability
- [ ] Kong Admin API integration
- [ ] Request analytics and logging
- [ ] Performance metrics collection
- [ ] Alert configuration

#### 3.2 DevOps Integration
- [ ] CI/CD pipeline setup
- [ ] Automated testing integration
- [ ] Blue-green deployment strategy
- [ ] Database migration handling

---

## Configuration Guide

### File Locations

| File | Purpose |
|------|---------|
| `auth/.env.example` | Auth backend environment template |
| `auth/frontend/.env.example` | Frontend environment template |
| `kong/kong.auth.yml` | Kong config for auth development |
| `kong/kong.local.yml` | Kong config for full TTS (localhost) |
| `kong/kong.yml` | Kong config for Docker deployment |
| `Scripts/docker/start_kong.ps1` | Kong Docker startup script |

### Environment Variables

#### Auth Service (`auth/.env`)
```bash
# Core Django Configuration
DJANGO_ENV=development
DJANGO_DEBUG=True
DJANGO_SECRET_KEY=secret-key-1234
DJANGO_JWT_SIGNING_KEY=signing-key-1234
DJANGO_ALLOWED_HOSTS=localhost,127.0.0.1,auth_service,host.docker.internal

# Kong Integration
KONG_GATEWAY_URL=http://localhost:8000
JWT_ISSUER=tts-jwt-issuer

# Frontend Integration  
FRONTEND_URL=http://localhost:3001
DJANGO_CORS_ALLOWED_ORIGINS=http://localhost:3001,http://127.0.0.1:3001
```

#### Frontend (`auth/frontend/.env`)
```bash
# API Base URL - empty for Vite proxy (recommended)
VITE_API_BASE_URL=

# Or point directly to Kong:
# VITE_API_BASE_URL=http://localhost:8000
```

#### Kong Gateway (`kong/kong.auth.yml`)
```yaml
# JWT Configuration - MUST match DJANGO_JWT_SIGNING_KEY
jwt_secrets:
  - consumer: auth-service
    key: tts-jwt-issuer
    secret: "signing-key-1234"
    algorithm: HS256

# Service Definition - uses host.docker.internal to reach host machine
services:
  - name: auth-public
    url: http://host.docker.internal:8003
    routes:
      - paths:
          - /api/auth/login
          - /api/auth/token
          - /api/auth/register
```

#### Vite Config (`auth/frontend/vite.config.js`)
```javascript
export default defineConfig({
  server: {
    port: 3001,
    proxy: {
      '/api': {
        target: 'http://localhost:8000',  // Kong Gateway
        changeOrigin: true,
      },
    },
  },
})
```

### Django Settings Configuration

#### JWT Configuration
```python
# JWT Settings
SIMPLE_JWT = {
    'ACCESS_TOKEN_LIFETIME': timedelta(minutes=60),
    'REFRESH_TOKEN_LIFETIME': timedelta(days=7),
    'ROTATE_REFRESH_TOKENS': True,
    'BLACKLIST_AFTER_ROTATION': True,
    'ALGORITHM': 'HS256',
    'SIGNING_KEY': config('DJANGO_JWT_SIGNING_KEY'),
    'VERIFYING_KEY': None,
    'AUTH_HEADER_TYPES': ('Bearer',),
    'USER_ID_FIELD': 'id',
    'USER_ID_CLAIM': 'user_id',
    'AUTH_TOKEN_CLASSES': ('rest_framework_simplejwt.tokens.AccessToken',),
    'TOKEN_TYPE_CLAIM': 'token_type',
    'JTI_CLAIM': 'jti',
    'TOKEN_OBTAIN_SERIALIZER': 'auth.serializers.CustomTokenObtainPairSerializer',
}
```

#### CORS Configuration
```python
CORS_ALLOWED_ORIGINS = config(
    'DJANGO_CORS_ALLOWED_ORIGINS',
    default='http://localhost:3001',
    cast=lambda v: [s.strip() for s in v.split(',')]
)

CORS_ALLOW_CREDENTIALS = True
```

---

## Development Setup

### Prerequisites
- Docker Desktop (for Kong Gateway)
- Python 3.11+
- Node.js 18+

### Quick Start

#### 1. Clone and Setup Environment
```bash
cd auth/
cp .env.example .env

cd frontend/
cp .env.example .env
```

#### 2. Start Kong Gateway (Docker)
```bash
# From project root - using CLI
cd Scripts/cli
npm run kong

# Or directly with PowerShell
cd Scripts/docker
.\start_kong.ps1 -Detached

# Verify Kong is running
curl http://localhost:8001/status
```

#### 3. Start Auth Service (SQLite - default)
```bash
cd auth/

# Run migrations (SQLite by default)
python manage.py migrate

# Create superuser (optional)
python manage.py createsuperuser

# Start the server on port 8003
python manage.py runserver 0.0.0.0:8003
```

#### 4. Start Frontend
```bash
cd auth/frontend/
npm install
npm run dev
```

#### 5. Access the Application
- **Frontend**: http://localhost:3001
- **Kong Gateway**: http://localhost:8000
- **Kong Admin**: http://localhost:8001
- **Auth Backend (direct)**: http://localhost:8003

### CLI Commands for Kong

```bash
# From Scripts/cli directory
npm run kong          # Start Kong Gateway
npm run kong:stop     # Stop Kong Gateway  
npm run kong:logs     # View Kong logs
npm run kong:full     # Start with full TTS config
```

### Development Workflow

#### Testing Authentication Flow
```bash
# Register new user
curl -X POST http://localhost:8000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"username": "testuser", "email": "test@example.com", "password": "testpass123"}'

# Login
curl -X POST http://localhost:8000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username": "testuser", "password": "testpass123"}'

# Access protected endpoint
curl -X GET http://localhost:8000/api/users/profile \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

---

## Production Deployment

### Docker Compose Setup

```yaml
# docker-compose.yml
version: '3.8'

services:
  kong-gateway:
    image: kong:latest
    environment:
      KONG_DATABASE: "off"
      KONG_DECLARATIVE_CONFIG: /kong/kong.yml
      KONG_PROXY_ACCESS_LOG: /dev/stdout
      KONG_ADMIN_ACCESS_LOG: /dev/stdout
      KONG_PROXY_ERROR_LOG: /dev/stderr
      KONG_ADMIN_ERROR_LOG: /dev/stderr
      KONG_ADMIN_LISTEN: 0.0.0.0:8001
    ports:
      - "8000:8000"
      - "8001:8001"
    volumes:
      - ./kong.yml:/kong/kong.yml
    depends_on:
      - auth-service

  auth-service:
    build:
      context: ./auth
      dockerfile: Dockerfile.prod
    environment:
      DJANGO_ENV: production
      DJANGO_DEBUG: "False"
      DATABASE_URL: ${DATABASE_URL}
      DJANGO_SECRET_KEY: ${DJANGO_SECRET_KEY}
      DJANGO_JWT_SIGNING_KEY: ${DJANGO_JWT_SIGNING_KEY}
    ports:
      - "8003:8003"
    depends_on:
      - postgres

  postgres:
    image: postgres:15
    environment:
      POSTGRES_DB: auth_db
      POSTGRES_USER: ${POSTGRES_USER}
      POSTGRES_PASSWORD: ${POSTGRES_PASSWORD}
    volumes:
      - postgres_data:/var/lib/postgresql/data
    ports:
      - "5432:5432"

volumes:
  postgres_data:
```

### Production Considerations

#### Security Hardening
- Use strong, unique JWT signing keys
- Enable HTTPS/TLS termination
- Configure proper CORS origins
- Set up rate limiting
- Enable request logging and monitoring

#### Scaling Strategy
- Kong upstream load balancing for multiple auth service instances
- Database connection pooling
- Redis for session management (if needed)
- CDN for static assets

---

## Security Considerations

### JWT Token Security
- **Signing Key**: Use cryptographically secure random keys
- **Token Expiration**: Short-lived access tokens (60 minutes)
- **Refresh Tokens**: Longer-lived but rotatable (7 days)
- **Token Blacklisting**: Implement logout and revocation

### Kong Security Features
- **Rate Limiting**: Prevent abuse and DoS attacks
- **IP Restriction**: Whitelist/blacklist IP addresses
- **Request Size Limiting**: Prevent large payload attacks
- **Security Headers**: Enforce security best practices

### Database Security
- **Connection Encryption**: Use SSL/TLS for database connections
- **Access Control**: Limited database user permissions
- **Data Encryption**: Encrypt sensitive data at rest
- **Backup Security**: Secure backup storage and access

### API Security
- **Input Validation**: Validate and sanitize all inputs
- **CORS Policy**: Restrict cross-origin requests
- **CSRF Protection**: Enable CSRF tokens where appropriate
- **SQL Injection Prevention**: Use parameterized queries

---

## Troubleshooting

### Common Issues

#### 1. JWT Validation Failures
**Symptom**: 401 Unauthorized responses for valid tokens

**Solutions**:
```bash
# Check JWT signing key consistency
# Auth service .env
DJANGO_JWT_SIGNING_KEY=your-key-here

# Kong configuration
jwt_secrets:
  - secret: "your-key-here"  # Must match Django key
```

#### 2. CORS Errors
**Symptom**: Browser blocks requests from frontend

**Solutions**:
```python
# Django settings.py
CORS_ALLOWED_ORIGINS = [
    'http://localhost:3001',
    'http://127.0.0.1:3001',
]

# Kong kong.yml
plugins:
  - name: cors
    config:
      origins:
        - "http://localhost:3001"
        - "http://127.0.0.1:3001"
```

#### 3. Service Discovery Issues
**Symptom**: Kong cannot reach auth service

**Solutions**:
```bash
# Check Docker network connectivity
docker network ls
docker network inspect bridge

# Verify service names in docker-compose
services:
  auth-service:  # This name is used in kong.yml
    build: ./auth
```

#### 4. Database Connection Issues
**Symptom**: Django cannot connect to PostgreSQL

**Solutions**:
```bash
# Check database URL format
DATABASE_URL=postgresql://user:password@host:port/database

# Test connection manually
python manage.py dbshell
```

### Debugging Tools

#### Kong Admin API
```bash
# Check service status
curl http://localhost:8001/services

# Check routes
curl http://localhost:8001/routes

# Check plugins
curl http://localhost:8001/plugins
```

#### Django Debug Commands
```bash
# Check JWT settings
python manage.py shell -c "from django.conf import settings; print(settings.SIMPLE_JWT)"

# Test database connection
python manage.py dbshell

# Run health check
python manage.py check
```

#### Frontend Network Tab
- Monitor API requests in browser DevTools
- Check request/response headers
- Verify JWT tokens in Authorization headers
- Check CORS preflight requests

---

## Maintenance & Updates

### Regular Tasks
1. **JWT Key Rotation**: Update signing keys periodically
2. **Database Maintenance**: Regular backups and optimization
3. **Kong Updates**: Keep Gateway version current
4. **Security Patches**: Monitor and apply security updates
5. **Log Rotation**: Manage log file sizes
6. **Performance Monitoring**: Track response times and error rates

### Monitoring Metrics
- Authentication success/failure rates
- JWT token validation performance
- Database query performance
- Kong proxy response times
- Frontend load times

---

This setup guide provides a comprehensive foundation for deploying and maintaining the auth service with Kong Gateway integration. Regular updates and monitoring ensure optimal security and performance for the TTS ecosystem.