# Gateway-Centric Authentication Overhaul Guide (TTS Ecosystem)

This guide outlines the architectural changes required to transition the TTS ecosystem (Workflow, Notification, Messaging) from a cookie-based/federated authentication model to a **Gateway-Centric** model using Kong.

## 1. Architecture Overview

### Current State (Cookie/Federated)
- **Protocol:** Cookies (`access_token`) + Custom Headers.
- **Validation:** Each service independently validates the JWT signature using a shared secret.
- **Routing:** Direct access to services (bypassing Kong) is often possible if ports are exposed.
- **Constraint:** Requires services to share a domain (for cookies) or complex CORS setups.

### Target State (Gateway Guard)
- **Protocol:** `Authorization: Bearer <token>` Header.
- **Validation (Kong):** Kong validates the JWT signature, expiration, and issuer at the edge.
- **Validation (Services):** Services **trust** the Gateway. They decode the token to extract user context (Roles, ID) but can skip redundant signature verification (optional, but recommended for performance).
- **Security:** Services are hidden behind the Gateway (no exposed ports on host).

## 2. Component Changes

### A. Kong Gateway (`kong.yml`)
- Enable the `jwt` plugin globally or per-route.
- Configure a `Consumer` representing the Auth Service.
- Map the shared JWT Secret to this Consumer.

### B. Backend Services (Workflow, Messaging, Notification)
- **Authentication Logic:**
    - Stop looking for Cookies.
    - Read `Authorization: Bearer <token>` header.
    - Decode token to populate `request.user` (User ID, Roles).
- **Network Security:**
    - Update `docker-compose.yml` to use `expose` instead of `ports`. This ensures services are only reachable via Kong.

### C. Frontend
- **Storage:** Store JWT in memory or secure storage (not just HttpOnly cookies).
- **Requests:** Attach header to all API calls: `Authorization: Bearer <token>`.

## 3. Implementation Steps

1.  **Update Kong Configuration:** Add JWT plugin and Consumer.
2.  **Refactor Service Authentication:** Update `authentication.py` in TTS services.
3.  **Secure Networking:** Update `docker-compose.yml` to hide backend ports.
4.  **Update Frontend:** Modify API client to send Bearer token.

---
**Note:** This overhaul applies specifically to the TTS ecosystem as requested.
