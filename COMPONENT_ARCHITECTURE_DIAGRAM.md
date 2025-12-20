# Component Architecture Diagram: Ticket Tracking System

This document provides a detailed view of the system's software architecture by breaking it down into individual components, defining their responsibilities, interfaces, and dependencies.

## 1. System Decomposition

The Ticket Tracking System is organized into the following core functional components:

### Client Layer
*   **Frontend Application (React/Vite):**
    *   **Responsibility:** Provides the user interface for Employees, Agents, and Admins.
    *   **Key Modules:** Authentication Context, Ticket Management UI, Workflow Board, Real-time Chat Widget.

### Gateway Layer
*   **API Gateway (Nginx):**
    *   **Responsibility:** Single entry point for all external traffic. Handles routing, SSL termination, and static file serving.
    *   **Routing:** `/auth/`, `/helpdesk/`, `/workflow/`, `/messaging/`.

### Service Layer
*   **Authentication Service (`auth`):**
    *   **Responsibility:** Centralized Identity Provider (IdP).
    *   **Functions:** User registration, credential validation, JWT issuance, and cross-system role synchronization.
*   **Helpdesk Core (`helpdesk`):**
    *   **Responsibility:** Primary Ticket Management and "Source of Truth" for ticket data.
    *   **Functions:** Master ticket records, categories, priorities, and event triggers (signals).
*   **Workflow Engine (`workflow_api`):**
    *   **Responsibility:** Business Process Orchestration.
    *   **Functions:** State machine management (transitions), task assignments (Round-robin), and workflow step validation.
*   **Messaging Service (`messaging`):**
    *   **Responsibility:** Real-time Communication.
    *   **Functions:** Conversation management, comments, file attachments, and WebSocket handling for live updates.
*   **Notification Service (`notification_service`):**
    *   **Responsibility:** Asynchronous Alerting.
    *   **Functions:** Email delivery (Gmail/SendGrid) and in-app notifications via message queue consumption.

---

## 2. Defined Interfaces

Communication between components is handled through standardized interfaces:

| Interface Type | Protocol | Data Format | Description |
| :--- | :--- | :--- | :--- |
| **REST API** | HTTP/JSON | JSON | Synchronous communication between Frontend and Backend, and inter-service queries. |
| **WebSocket** | ASGI/WSS | JSON | Real-time bi-directional communication for the Messaging Service. |
| **Message Queue** | AMQP | Binary/JSON | Asynchronous communication via RabbitMQ for notifications and workflow triggers. |

---

## 3. Dependencies & Data Flow

*   **Auth Dependency:** All backend services depend on the **Auth Service** to validate JWT tokens.
*   **Workflow Trigger:** The **Helpdesk Service** triggers the **Workflow Engine** via a RabbitMQ event whenever a new ticket is opened.
*   **Notification Loop:** Both **Workflow** and **Helpdesk** services push events to the **Notification Service** queue to alert users of assignments or updates.
*   **Messaging Context:** The **Messaging Service** performs internal queries to the **Helpdesk Service** to validate Ticket IDs before allowing comments.

---

## 4. Architectural Diagram (Mermaid)

```mermaid
graph TD
    %% Actors
    User((User))

    %% Frontend & Gateway
    subgraph "Client Layer"
        UI[Frontend App (React)]
    end

    LB[Nginx API Gateway]

    %% Backend Services
    subgraph "Backend Services"
        Auth[Auth Service]
        HD[Helpdesk Service]
        WF[Workflow API]
        Msg[Messaging Service]
        Notif[Notification Service]
    end

    %% Infrastructure
    subgraph "Infrastructure"
        DB[(PostgreSQL DBs)]
        MQ[RabbitMQ]
        Redis[Redis Cache]
    end

    %% Relationships
    User -->|HTTPS| UI
    UI -->|HTTPS / REST| LB
    UI -.->|WSS / WebSocket| LB

    LB -->|/auth| Auth
    LB -->|/helpdesk| HD
    LB -->|/workflow| WF
    LB -->|/messaging| Msg

    %% Inter-service Communication
    HD -->|Publish: Ticket Created| MQ
    MQ -->|Consume| WF
    
    WF -->|Publish: Task Assigned| MQ
    MQ -->|Consume| Notif

    Msg -->|Verify Token| Auth
    Msg -.->|Store/Cache| Redis

    %% Database Connections
    Auth --> DB
    HD --> DB
    WF --> DB
    Msg --> DB
```

---

## 5. Security & Protocol Details

*   **Security Requirements:**
    *   **OAuth/JWT:** System uses JWT Bearer tokens for all authenticated requests.
    *   **Network Isolation:** Backend services reside in a private Docker network, isolated from direct internet access.
    *   **Encryption:** HTTPS/WSS is enforced at the Gateway layer for all client-server traffic.
*   **Data Formats:** JSON is used for all structured data exchange, ensuring compatibility across different service languages.
