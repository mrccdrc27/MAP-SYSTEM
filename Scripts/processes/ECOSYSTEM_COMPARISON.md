# Ecosystem Configuration Comparison

This document compares the standard ecosystem configuration (`tts-ecosystem.config.js`) with the Kong Gateway variant (`tts-ecosystem-kong.config.js`).

## Executive Summary

*   **Standard (`tts-ecosystem.config.js`)**: A "Direct Connection" architecture where frontends talk directly to individual microservices on distinct ports.
*   **Kong (`tts-ecosystem-kong.config.js`)**: A "Gateway" architecture where all external traffic is routed through Kong (Port 8080), which handles routing, CORS, and authentication trust.

## Detailed Comparison

### 1. Service Port Mappings

| Service | Standard Port | Kong Config Port | Notes |
| :--- | :--- | :--- | :--- |
| **Auth Service** | 8003 | 8003 | Stays consistent (Direct access retained). |
| **Workflow API** | **8002** | **1001** | Shifted to avoid conflicts; exposed via `/workflow`. |
| **Notification Svc** | **8006** | **1003** | Shifted; exposed via `/notification`. |
| **Messaging Svc** | **8005** | **1002** | Shifted; exposed via `/messaging`. |
| **Helpdesk Backend** | **8000** | **5001** | Port 8000 is often standard Kong proxy port; moved to 5001. |
| **Main Frontend** | 1000 | 1000 | Frontend port unchanged. |
| **Auth Frontend** | 3001 | 3001 | Frontend port unchanged. |

### 2. Environment Variables & Routing

#### Gateway Trust
*   **Standard**: `KONG_TRUSTED="false"` (or omitted). Services validate tokens fully.
*   **Kong**: `KONG_TRUSTED="true"`. Services trust the Gateway to have validated the JWT (often via cookies) before forwarding.

#### Inter-Service Communication
*   **Standard**: Services call each other via direct ports (e.g., `DJANGO_NOTIFICATION_SERVICE_URL="http://localhost:8006"`).
*   **Kong**: Services often route through the gateway (e.g., `DJANGO_NOTIFICATION_SERVICE_URL="http://localhost:8080/notification"`), though some internal links remain direct for performance or legacy reasons.

#### Frontend Configuration (VITE_)
*   **Standard**: Frontends must know the specific port for every backend service.
    ```javascript
    VITE_WORKFLOW_API: "http://localhost:8002/workflow"
    VITE_NOTIFICATION_API: "http://localhost:8006"
    ```
*   **Kong**: Frontends point primarily to the Gateway.
    ```javascript
    VITE_WORKFLOW_API: "http://localhost:8080/workflow"
    VITE_NOTIFICATION_API: "http://localhost:8080/notification"
    ```

### 3. Middleware & Security
*   **CORS**:
    *   **Standard**: Each service must whitelist frontend origins (`http://localhost:1000`, etc.).
    *   **Kong**: Services must whitelist the **Gateway** origin (`http://localhost:8080`) in addition to frontends, or rely on the Gateway to handle CORS termination (though strict backend CORS is often still kept as a fallback).
*   **Auth**:
    *   **Standard**: Bearer tokens in headers are the primary mechanism.
    *   **Kong**: Can be configured to read `access_token` cookies and forward validated requests, abstracting auth mechanics from the backend.

## Usage Guide

### When to use Standard?
*   Rapid development without Docker overhead.
*   Debugging individual services in isolation.
*   Simple "local" setups where a Gateway adds unnecessary complexity.

### When to use Kong?
*   Production-like simulation.
*   Testing centralized routing, rate limiting, or API Gateway policies.
*   Developing features that rely on Gateway-specific headers or cookie-to-token bridging.
