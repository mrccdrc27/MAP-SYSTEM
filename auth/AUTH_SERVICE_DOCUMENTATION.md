# Authentication Service Documentation

## 1. Overview

This document provides a high-level architectural overview of the Centralized Authentication Service. It is intended for backend developers, DevOps/infrastructure engineers, and security reviewers.

The service serves as the single source of truth for user identity, authentication, and access control across the ecosystem (TTS, AMS, BMS, HDTS).

---

## 2. System Boundaries & Responsibilities

### Purpose
The Auth Service is a centralized identity provider (IdP) responsible for managing user lifecycles, issuing authentication tokens, and defining global access rights (Roles and Systems).

### Responsibilities
- **Identity Management:** User registration, profile management, and credential storage.
- **Authentication:** Validating credentials (email/password), Multi-Factor Authentication (OTP), and issuing Secure HTTP-only cookies containing JWTs.
- **Access Control:** Managing Systems, Roles, and assigning Users to Roles within Systems.
- **Security Enforcement:** Rate limiting (IP/Device), CAPTCHA verification, and Account Lockout policies.
- **Notification:** Sending transactional emails (Welcome, OTP, Password Reset) via SendGrid.
- **Data Synchronization:** Broadcasting user and role changes to downstream services via Message Broker (RabbitMQ/Celery).

### Explicit Non-Responsibilities
- **Business Logic:** It does not handle business-specific workflows (e.g., Ticket creation, Asset tracking).
- **Fine-Grained Permissions:** It defines high-level *Roles* (e.g., "Admin", "Operator"), but specific resource-level permissions (e.g., "Can edit Asset #123") are often handled by downstream services based on the assigned role.
- **Frontend Hosting:** While it serves some auth-related templates (Login, Reset Password), it is primarily an API service; the main application frontends are separate.

---

## 3. Actors & Trust Model

### Actors
1.  **Staff Users:** Internal users (Admins, Managers) who access multiple back-office systems (AMS, BMS, TTS). Authenticated against the `users.User` model.
2.  **Employees:** End-users (specifically for HDTS) who submit tickets. Authenticated against the `hdts.Employees` model.
3.  **Superadmins:** System-wide administrators with elevated privileges to manage the Auth service itself.
4.  **Downstream Services:** Internal applications (TTS, AMS, etc.) that rely on the Auth Service for identity validation.

### Trust Boundaries
- **The Auth Service** is the root of trust. It holds the private signing keys for JWTs.
- **Tokens (JWT):** Issued as `access_token` and `refresh_token`. Downstream services trust these tokens if the signature is valid.
- **Cookies:** Tokens are primarily stored in HTTP-only, Secure cookies to prevent XSS exfiltration.
- **Internal Communication:** Service-to-service communication (e.g., syncing users) occurs via a trusted Message Broker (RabbitMQ) or direct API calls protected by internal networking or shared secrets.

---

## 4. Authentication Flows

### 4.1. Staff Login Flow
1.  **Request:** User submits Email, Password, and optionally a reCAPTCHA token to `/api/v1/users/login/api/`.
2.  **Validation:**
    *   Rate limits (IP & Device fingerprint) are checked.
    *   reCAPTCHA is verified with Google (if enabled).
    *   Credentials are hashed and compared against the database.
3.  **2FA (Conditional):** If `otp_enabled` is true, the system generates a temporary session token and sends an OTP via email. The client must then call `/api/v1/users/login/verify-otp/`.
4.  **Success:**
    *   Account lockout counters are reset.
    *   JWT `access_token` and `refresh_token` are generated containing claims (User ID, System Roles).
    *   Tokens are set as **HTTP-Only Cookies**.
    *   User is redirected to the System Selection screen or their default system.

### 4.2. Employee (HDTS) Login Flow
1.  **Request:** Similar to Staff, but targets `/api/v1/hdts/employees/api/login/`.
2.  **Validation:** Checks against the `hdts.Employees` table.
3.  **Approval Check:** Verifies the Employee status is 'Approved'.
4.  **Success:** Issues JWTs specifically scoped for HDTS access.

### 4.3. Token Refresh
1.  **Trigger:** Access token expires (short-lived).
2.  **Request:** Client (browser) sends a request to `/api/v1/token/refresh/` with the `refresh_token` cookie.
3.  **Action:** Server verifies the refresh token signature and expiration.
4.  **Outcome:** A new `access_token` cookie is issued. Rotating refresh tokens may also be issued.

### 4.4. Logout
1.  **Request:** Call to `/logout/`.
2.  **Action:** Server explicitly deletes the `access_token` and `refresh_token` cookies.
3.  **Outcome:** Redirect to the login page.

---

## 5. Authorization Model

### Role-Based Access Control (RBAC)
The system uses a **User-System-Role** model:
*   **System:** Represents a downstream application (e.g., "AMS", "TTS").
*   **Role:** A named set of responsibilities within a System (e.g., "Asset Manager" in "AMS").
*   **UserSystemRole:** The association entity linking a `User` to a `Role` within a specific `System`.

### Evaluation
*   **At Login:** The JWT claims include a list of all assigned Roles and Systems.
*   **Middleware:** `AuthenticationRoutingMiddleware` inspects the user type and destination.
    *   Staff accessing Employee routes -> Redirected.
    *   Employees accessing Staff routes -> Redirected.
*   **Downstream:** Services decode the JWT to determine if the user has the required role (e.g., "Admin") for that specific system.

---

## 6. Security Considerations

### Attack Surface & Mitigations
*   **Brute Force:** Mitigated by `IPAddressRateLimit` and `DeviceFingerprint` models. Repeated failures trigger CAPTCHA requirements and eventually account lockout (default 15 minutes).
*   **Credential Stuffing:** Rate limiting and optional 2FA.
*   **XSS (Cross-Site Scripting):** Mitigated by storing tokens in `HttpOnly` cookies, making them inaccessible to JavaScript.
*   **CSRF (Cross-Site Request Forgery):** Django's CSRF protection is enabled for state-changing requests. `SameSite=Lax` cookie attributes are used.

### Critical Assumptions
*   The `SECRET_KEY` and `JWT_SIGNING_KEY` are kept secret and rotated if compromised.
*   Internal services communicating via RabbitMQ are on a trusted network.

---

## 7. Integration Guide (For Downstream Services)

### Authenticating Requests
Services should expect an **`access_token`** in the request cookies or `Authorization: Bearer` header.
1.  **Verify Signature:** Use the shared `JWT_SIGNING_KEY` (or public key if asymmetric) to verify the token.
2.  **Check Expiration:** Reject expired tokens.
3.  **Read Claims:** Extract `user_id` and `roles`.
4.  **Authorize:** Check if the user has the required role for *your* system slug (e.g., ensure `roles` contains `{ "system": "tts", "role": "Admin" }`).

### Handling Updates
Do not cache user data locally indefinitely. Listen for synchronization events.

---

## 8. Data Synchronization (Infrastructure)

To ensure data consistency across the distributed system, the Auth Service publishes events when critical data changes.

### Mechanisms
*   **Django Signals:** `post_save` and `post_delete` signals on `User`, `Role`, and `UserSystemRole` models trigger sync tasks.
*   **Celery/RabbitMQ:** Asynchronous tasks broadcast these changes.

### Sync Events
*   `hdts.tasks.sync_hdts_user`: Syncs Staff/Employee profile updates to HDTS.
*   `tts.tasks.sync_role_to_workflow_api`: Syncs Role definitions to TTS/Workflow.
*   `tts.tasks.sync_user_system_role_to_workflow_api`: Syncs user assignments (User <-> Role) to TTS/Workflow.

Downstream services must implement consumers (Celery workers) to listen to these queues and update their local cache/records accordingly.
