---
title: Auth System Overview
sidebar_label: Overview
sidebar_position: 1
---

# Auth System Overview

The **Auth Service** is the centralized Identity Provider (IdP) for the entire MAP Industry Platform. It manages authentication, authorization, and user identity across all downstream systems.

## Core Responsibilities

| Capability | Description |
|------------|-------------|
| **Authentication** | Staff & Employee login with 2FA support |
| **Authorization** | Role-based access control per system |
| **Token Management** | JWT issuance, refresh, and revocation |
| **User Management** | Staff/Employee CRUD, profiles, invitations |
| **System Registry** | Register and manage downstream systems |
| **API Keys** | Service-to-service authentication |

## Technology Stack

| Component | Technology |
|-----------|------------|
| **Framework** | Django 5.x + Django REST Framework |
| **Database** | PostgreSQL (Production) / SQLite (Dev) |
| **Auth Protocol** | JWT via HTTP-Only Cookies |
| **Task Queue** | Celery + RabbitMQ |
| **Email** | SendGrid |
| **Docs** | OpenAPI 3.0 (drf-spectacular) |

## Django Apps Structure

```
auth/
├── auth/           # Core config, middleware, URL routing
├── users/          # Staff identity, profiles, 2FA
├── hdts/           # Employee (end-user) identity
├── roles/          # Role definitions
├── systems/        # System registry (AMS, TTS, etc.)
├── system_roles/   # User-System-Role assignments
├── keys/           # API key management
├── tts/            # TTS integration endpoints
└── emails/         # Email service (SendGrid)
```

## Key Features

### Dual-User Model
- **Staff Users:** Internal admins, managers, technicians with system access
- **Employee Users:** External users for HDTS ticket submission

### Multi-System Access
- Users can be assigned to multiple systems (AMS, TTS, BMS, HDTS)
- Each assignment includes a specific role within that system
- JWT claims include all accessible systems and roles

### Security Features
- **2FA:** Optional TOTP-based two-factor authentication
- **CAPTCHA:** Rate limiting for login attempts
- **Password Policies:** Configurable complexity requirements
- **Token Rotation:** Refresh tokens are rotated on use

## Integration Points

| Endpoint | Purpose | Consumers |
|----------|---------|-----------|
| `/api/v1/users/token/validate/` | Validate JWT tokens | All systems |
| `/api/v1/tts/round-robin/` | Get users by role for assignment | TTS |
| `/api/v1/tts/user-info/{id}/` | Fetch user details | TTS, HDTS |
| `/api/v1/hdts/employees/internal/{id}/` | Employee lookup | HDTS Backend |

## Quick Start

```bash
cd auth
python manage.py migrate
python manage.py seed_systems    # Create AMS, TTS, BMS, HDTS
python manage.py seed_tts        # Create TTS-specific roles
python manage.py runserver 0.0.0.0:8000
```

## Documentation Sections

- [Architecture & Tech Stack](./service-documentation/architecture) - Detailed architecture
- [Authentication Mechanisms](./service-documentation/auth-mechanisms) - Login flows
- [Middleware & Security](./service-documentation/middleware-security) - Route protection
- [API Reference](./service-documentation/api-reference) - Endpoint documentation
- [Development Guide](./getting-started/quick-start) - Setup & testing
