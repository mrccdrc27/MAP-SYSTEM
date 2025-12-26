---
title: API Reference (V1)
sidebar_label: API Reference
sidebar_position: 4
---

# API Reference (V1)

**Base URL:** `/api/v1/`

**Authentication:** JWT token via `access_token` cookie or `Authorization: Bearer <token>` header

## API Root

```bash
GET /api/v1/
```

Response:
```json
{
  "users": "/api/v1/users/",
  "roles": "/api/v1/roles/",
  "systems": "/api/v1/systems/",
  "system-roles": "/api/v1/system-roles/",
  "tts": "/api/v1/tts/",
  "hdts": "/api/v1/hdts/"
}
```

---

## Users API (`/api/v1/users/`)

### Authentication

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| `POST` | `/register/` | ❌ | Register new staff user |
| `POST` | `/login/api/` | ❌ | Staff login (returns JWT cookies) |
| `POST` | `/login/verify-otp/` | ❌ | Verify 2FA OTP code |
| `POST` | `/token/refresh/` | 🔄 | Refresh access token |
| `GET` | `/token/validate/` | ✅ | Validate current token |
| `POST` | `/logout/` | ✅ | Clear authentication cookies |

### Profile Management

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| `GET` | `/profile/` | ✅ | Get current user's profile |
| `PATCH` | `/profile/` | ✅ | Update profile |
| `GET` | `/profile/by-company/<company_id>/` | ✅ | Lookup user by company ID |
| `POST` | `/profile/reset-password/` | ✅ | Reset password (authenticated) |

### Password Management

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| `POST` | `/password/forgot/` | ❌ | Request password reset email |
| `POST` | `/password/reset/` | ❌ | Reset password with token |
| `POST` | `/password/change/` | ✅ | Change password (requires old password) |
| `POST` | `/password/verify/` | ✅ | Verify current password |

### Two-Factor Authentication

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| `POST` | `/2fa/request-otp/` | ❌ | Request OTP via email |
| `POST` | `/2fa/enable/` | ✅ | Enable 2FA with OTP verification |
| `POST` | `/2fa/disable/` | ✅ | Disable 2FA with OTP verification |

### User Management (Admin)

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| `GET` | `/list/` | ✅👑 | List all users |
| `GET` | `/<id>/` | ✅👑 | Get user by ID |
| `PATCH` | `/<id>/` | ✅👑 | Update user |
| `DELETE` | `/<id>/` | ✅👑 | Delete user |

### Internal Endpoints (Service-to-Service)

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| `GET` | `/internal/<id>/` | ⚙️ | Get user details (no auth, internal only) |

---

## Roles API (`/api/v1/roles/`)

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| `GET` | `/` | ✅ | List all roles |
| `POST` | `/` | ✅👑 | Create new role |
| `GET` | `/<id>/` | ✅ | Get role details |
| `PATCH` | `/<id>/` | ✅👑 | Update role |
| `DELETE` | `/<id>/` | ✅👑 | Delete role (custom only) |

---

## Systems API (`/api/v1/systems/`)

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| `GET` | `/` | ✅ | List all systems |
| `GET` | `/public/` | ❌ | Public system list (for login UI) |
| `POST` | `/` | ✅👑 | Register new system |
| `GET` | `/<id>/` | ✅ | Get system details |

---

## System Roles API (`/api/v1/system-roles/`)

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| `GET` | `/` | ✅ | List user-system-role assignments |
| `POST` | `/` | ✅👑 | Assign user to system with role |
| `GET` | `/<id>/` | ✅ | Get assignment details |
| `PATCH` | `/<id>/` | ✅👑 | Update assignment |
| `DELETE` | `/<id>/` | ✅👑 | Remove assignment |

---

## TTS Integration API (`/api/v1/tts/`)

Specialized endpoints for Ticket Tracking System integration.

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| `GET` | `/round-robin/` | ✅ | Get user IDs by role for assignment |
| `GET` | `/user-info/<user_id>/` | ✅ | Get user details by ID |
| `POST` | `/users-info/` | ✅ | Batch fetch user details |
| `POST` | `/assign-agent-to-role/` | ✅👑 | Assign agent to role |
| `POST` | `/create-role/` | ✅👑 | Create new role |
| `PATCH` | `/update-assignment/<id>/` | ✅👑 | Update role assignment |

### Round-Robin Endpoint

Used for automatic ticket assignment based on roles:

```bash
GET /api/v1/tts/round-robin/?system=TTS&role=Technician
```

Response:
```json
{
  "user_ids": [1, 5, 12, 23],
  "system": "TTS",
  "role": "Technician"
}
```

---

## HDTS API (`/api/v1/hdts/`)

### Employee Authentication

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| `POST` | `/employees/api/login/` | ❌ | Employee login |
| `POST` | `/employees/api/register/` | ❌ | Employee registration |
| `POST` | `/employees/api/logout/` | ✅ | Employee logout |
| `GET` | `/employees/api/profile/` | ✅ | Get employee profile |
| `PATCH` | `/employees/api/profile/` | ✅ | Update employee profile |

### Employee Management (Admin)

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| `GET` | `/user-management/pending/api/` | ✅👑 | List pending employees |
| `GET` | `/user-management/users/api/` | ✅👑 | List all employees |
| `PATCH` | `/user-management/update-status/<id>/` | ✅👑 | Approve/reject employee |

### Internal Endpoints (Service-to-Service)

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| `GET` | `/employees/internal/<id>/` | ⚙️ | Get employee details (internal) |
| `GET` | `/users/<user_id>/` | ⚙️ | Get HDTS user profile by ID |

---

## Authentication Legend

| Symbol | Meaning |
|--------|---------|
| ❌ | No authentication required |
| ✅ | JWT token required |
| ✅👑 | JWT token + Admin role required |
| 🔄 | Refresh token required (in cookie) |
| ⚙️ | Internal service-to-service (no auth, network restricted) |

---

## Common Response Codes

| Code | Description |
|------|-------------|
| `200` | Success |
| `201` | Created |
| `400` | Bad request (validation error) |
| `401` | Unauthorized (missing/invalid token) |
| `403` | Forbidden (insufficient permissions) |
| `404` | Not found |
| `429` | Rate limited |

## Error Response Format

```json
{
  "detail": "Authentication credentials were not provided.",
  "code": "not_authenticated"
}
```

Or for validation errors:

```json
{
  "email": ["This field is required."],
  "password": ["Password must be at least 8 characters."]
}
```
