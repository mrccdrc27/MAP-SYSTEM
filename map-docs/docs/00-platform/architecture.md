---
title: System Architecture
sidebar_label: Architecture
sidebar_position: 2
---

# System Architecture

The MAP Industry Platform uses a **System of Systems** architecture with a centralized Identity Backbone and Event Bus.

## High-Level Topology

```mermaid
graph TB
    subgraph "External Access"
        Client[Web / Mobile App]
        Gateway[Gateway / Nginx Load Balancer]
    end

    subgraph "Identity Backbone"
        Auth[🔐 AUTH SERVICE]
        AuthDB[(Auth DB)]
        Auth --> AuthDB
    end

    subgraph "Event Bus"
        RabbitMQ{RabbitMQ Exchange}
    end

    subgraph "Systems (Independent Deployments)"
        direction TB
        
        subgraph "Asset Management"
            AMS[📦 AMS Core]
            AMS_W[AMS Worker]
            AMS_DB[(AMS DB)]
            AMS --> AMS_DB
            AMS <--> RabbitMQ
        end

        subgraph "Budget Management"
            BMS[💰 BMS Core]
            BMS_DB[(BMS DB)]
            BMS --> BMS_DB
            BMS <--> RabbitMQ
        end

        subgraph "Ticket Tracking"
            TTS[🎫 TTS Core]
            TTS_W[TTS Worker]
            TTS_DB[(TTS DB)]
            TTS --> TTS_DB
            TTS <--> RabbitMQ
        end
        
        subgraph "Help Desk"
            HDTS[🛠️ HDTS Core]
            HDTS_DB[(HDTS DB)]
            Gmail[Gmail Integration]
            HDTS --> HDTS_DB
            HDTS --> Gmail
            HDTS <--> RabbitMQ
        end
    end

    Client --> Gateway
    Gateway -->|/auth| Auth
    Gateway -->|/ams| AMS
    Gateway -->|/bms| BMS
    Gateway -->|/tts| TTS
    Gateway -->|/hdts| HDTS

    AMS -.->|Validate Token| Auth
    BMS -.->|Validate Token| Auth
    TTS -.->|Validate Token| Auth
    HDTS -.->|Validate Token| Auth
```

## Integration Patterns

### 1. Synchronous (REST API)

Direct HTTP calls between services using internal Docker network hostnames:

```
┌─────────────┐     HTTP/REST      ┌─────────────┐
│ TTS Service │ ─────────────────► │ Auth Service│
│  :8003      │   /api/v1/tts/     │    :8000    │
└─────────────┘   round-robin/     └─────────────┘
```

**Use Cases:**
- Token validation
- User info lookup (`/api/v1/tts/user-info/{id}/`)
- Role-based user assignment (round-robin)

### 2. Asynchronous (Event Bus)

RabbitMQ-based messaging with Celery task queues:

```
┌─────────────┐    Celery Task     ┌─────────────┐     Consume      ┌─────────────┐
│ Ticket Svc  │ ─────────────────► │  RabbitMQ   │ ───────────────► │ Workflow    │
└─────────────┘   TICKET_TASKS     └─────────────┘                  │   Worker    │
                                                                     └─────────────┘
```

**Use Cases:**
- Ticket workflow processing
- Notification delivery
- User sync across systems

## Service Discovery

| Service | Internal URL | External Port |
|---------|--------------|---------------|
| Auth | `http://auth-service:8000` | 8000 |
| AMS | `http://ams-backend:8001` | 8001 |
| BMS | `http://bms-service:8002` | 8002 |
| TTS | `http://ticket-service:8003` | 8003 |
| HDTS | `http://hdts-backend:8004` | 8004 |

## Database Strategy

Each system maintains its own PostgreSQL database for data isolation:

| System | Database | Purpose |
|--------|----------|---------|
| Auth | `auth_db` | Users, roles, systems, API keys |
| AMS | `ams_db` | Assets, categories, transactions |
| BMS | `bms_db` | Budgets, proposals, reports |
| TTS | `tts_db` | Tickets, workflows, SLAs |
| HDTS | `hdts_db` | Employee tickets, email mappings |