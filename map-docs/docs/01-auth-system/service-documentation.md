---
title: Service Documentation Index
sidebar_label: Service Docs
sidebar_position: 2
---

# Auth Service Documentation

Welcome to the comprehensive documentation for the Authentication Service. This service is the centralized Identity Provider (IdP) for the MAP Industry Platform.

## Quick Navigation

| Section | Description |
|---------|-------------|
| [Architecture](./service-documentation/architecture) | System design, tech stack, data models |
| [Auth Mechanisms](./service-documentation/auth-mechanisms) | Login flows, JWT tokens, 2FA |
| [Middleware & Security](./service-documentation/middleware-security) | Route protection, permissions |
| [API Reference](./service-documentation/api-reference) | Complete endpoint documentation |
| [Development Guide](./getting-started/quick-start) | Setup, testing, configuration |
| [Integration Points](./service-documentation/integration-points) | Cross-system integration patterns |

## System Boundaries

### Responsibilities

✅ **The Auth Service handles:**
- User identity management (Staff & Employees)
- Authentication (login, 2FA, password reset)
- Authorization (roles, systems, permissions)
- Token issuance and validation (JWT)
- User data synchronization to downstream services
- API key management for service-to-service auth

❌ **The Auth Service does NOT handle:**
- Business logic (tickets, assets, budgets)
- Fine-grained resource permissions
- Frontend hosting (except auth-related pages)
- File storage (except profile pictures)

## Trust Model

```
┌─────────────────────────────────────────────────────────────┐
│                      AUTH SERVICE                            │
│                   (Root of Trust)                            │
│                                                              │
│  • Holds JWT signing keys                                    │
│  • Issues access & refresh tokens                            │
│  • Manages user identities                                   │
│  • Controls system access                                    │
└─────────────────────────────────────────────────────────────┘
                            │
            ┌───────────────┼───────────────┐
            │               │               │
            ▼               ▼               ▼
    ┌───────────┐   ┌───────────┐   ┌───────────┐
    │    TTS    │   │    AMS    │   │    BMS    │
    │           │   │           │   │           │
    │ • Validates   │ • Validates   │ • Validates
    │   JWT tokens  │   JWT tokens  │   JWT tokens
    │ • Checks      │ • Checks      │ • Checks  
    │   roles       │   roles       │   roles   
    └───────────┘   └───────────┘   └───────────┘
```

## Key Actors

| Actor | Identity Model | Access Pattern |
|-------|----------------|----------------|
| **Staff** | `users.User` | Multi-system access via roles |
| **Employees** | `hdts.Employees` | HDTS-only access |
| **Superadmins** | `users.User` (is_superuser) | Full platform access |
| **Services** | API Keys | Internal endpoints |

## Security Summary

| Attack Vector | Mitigation |
|---------------|------------|
| Brute Force | Rate limiting, CAPTCHA, account lockout |
| Credential Stuffing | 2FA, rate limiting |
| XSS | HttpOnly cookies |
| CSRF | SameSite cookies, CSRF tokens |
| Token Theft | Short-lived access tokens, refresh rotation |

## Getting Started

1. **For Developers:** Start with [Development Guide](./getting-started/quick-start)
2. **For Integrators:** See [Integration Points](./service-documentation/integration-points)
3. **For API Users:** Reference [API Documentation](./service-documentation/api-reference)
