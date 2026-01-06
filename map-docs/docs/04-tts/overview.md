---
title: TTS Overview
sidebar_label: Overview
sidebar_position: 1
---

# Ticket Tracking System Overview

The **Ticket Tracking System (TTS)** is the central workflow orchestration engine for the MAP Industry Platform. It manages the complete lifecycle of tickets from submission to resolution, through configurable workflows with SLA enforcement, intelligent task assignment, and comprehensive analytics.

## Core Responsibilities

| Capability | Description |
|------------|-------------|
| **Ticket Ingestion** | Receive tickets from HDTS or other sources via message queues |
| **Workflow Orchestration** | Route tickets through configurable multi-step workflows |
| **Task Assignment** | Intelligent round-robin assignment based on roles |
| **SLA Enforcement** | Priority-based SLA with step-weighted resolution targets |
| **Real-time Comments** | WebSocket-powered ticket discussion threads |
| **Notifications** | Email and in-app notifications for task events |
| **Analytics & Reporting** | KPI dashboards, trend analysis, and ML forecasting |

## Technology Stack

| Component | Technology |
|-----------|------------|
| **Framework** | Django 5.x + Django REST Framework |
| **Database** | PostgreSQL (Production) / SQLite (Dev) |
| **Message Queue** | Celery + RabbitMQ |
| **Real-time** | Django Channels (WebSocket) |
| **Frontend** | React + Vite |
| **Auth** | JWT via HTTP-Only Cookies |
| **Docs** | OpenAPI 3.0 (drf-spectacular) |

## Microservices Architecture

TTS comprises multiple Django services working together:

```
┌─────────────────────────────────────────────────────────────────┐
│                     TICKET TRACKING SYSTEM                       │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  ┌─────────────┐    ┌──────────────┐    ┌──────────────────┐   │
│  │   Frontend  │    │   Ticket     │    │   Workflow API   │   │
│  │   (React)   │◄──►│   Service    │◄──►│   (Orchestrator) │   │
│  │   :1000     │    │   :8004      │    │   :8002          │   │
│  └─────────────┘    └──────────────┘    └──────────────────┘   │
│         │                  │                     │              │
│         │                  │                     │              │
│         ▼                  ▼                     ▼              │
│  ┌─────────────┐    ┌──────────────┐    ┌──────────────────┐   │
│  │  Messaging  │    │  Notification│    │    RabbitMQ      │   │
│  │  (WebSocket)│    │   Service    │    │   (AMQP)         │   │
│  │             │    │              │    │   :5672          │   │
│  └─────────────┘    └──────────────┘    └──────────────────┘   │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
                    ┌──────────────────┐
                    │   Auth Service   │
                    │   (Identity)     │
                    │   :8000          │
                    └──────────────────┘
```

## Service Breakdown

| Service | Port | Responsibility |
|---------|------|----------------|
| **Frontend** | 1000 | React UI for agents, admins, coordinators |
| **Ticket Service** | 8004 | Ticket CRUD, file attachments, external API |
| **Workflow API** | 8002 | Workflow orchestration, task management, SLA |
| **Messaging** | - | WebSocket comments, real-time updates |
| **Notification** | - | Email/in-app notifications via Celery |

## Key Features

### Configurable Workflows
- Visual workflow designer with drag-and-drop nodes
- Multi-step workflows with role-based assignments
- Conditional transitions and escalation paths
- Workflow versioning for active task preservation

### SLA Management
- Priority-based SLA durations (Low, Medium, High, Urgent)
- Step-weighted time allocation
- Automated SLA breach detection and alerts
- SLA compliance reporting

### Intelligent Assignment
- Round-robin user assignment per role
- Ticket Coordinator ownership tracking
- Manual transfer and escalation options
- Assignment history auditing

### Analytics & Insights
- Real-time KPI dashboards
- Trend analysis with drill-down
- ML-powered forecasting
- Anomaly detection

## Integration Points

| Endpoint | Purpose | Consumers |
|----------|---------|-----------|
| `POST /tickets/` | Create ticket | HDTS, External |
| `GET /tasks/my-tasks/` | User's assigned tasks | Frontend |
| `POST /transitions/{id}/transition/` | Move task to next step | Frontend |
| Celery `receive_ticket` | Incoming ticket queue | Ticket Service |
| Celery `create_assignment_notification` | Notify user | Notification Service |

## Quick Start

```bash
# Navigate to TTS directory
cd tts

# Start Workflow API
cd workflow_api
python manage.py migrate
python manage.py seed_workflows2
python manage.py runserver 0.0.0.0:8002

# Start Ticket Service (separate terminal)
cd ../ticket_service
python manage.py migrate
python manage.py runserver 0.0.0.0:8004

# Start Celery Worker (required for async tasks)
celery -A workflow_api worker --pool=solo --loglevel=info
```

## Documentation Sections

### Getting Started
- [Quick Start](./getting-started/quick-start) - Get up and running fast
- [Configuration](./getting-started/configuration) - Environment setup
- [Seeding Data](./getting-started/seeding) - Populate test data
- [Docker Setup](./getting-started/docker) - Container deployment

### Service Documentation
- [Service Documentation](./service-documentation) - Complete service reference
  - [Architecture](./service-documentation/architecture) - System design & data models
  - [Workflow Engine](./service-documentation/workflow-engine) - Workflow configuration
  - [Task Management](./service-documentation/task-management) - Task lifecycle
  - [API Reference](./service-documentation/api-reference) - Endpoint documentation
  - [Integration Points](./service-documentation/integration-points) - Cross-system patterns
  - [Development Guide](./service-documentation/development) - Setup & testing
