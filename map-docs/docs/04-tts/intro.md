---
title: Introduction
sidebar_label: Introduction
sidebar_position: 0
---

# Ticket Tracking System (TTS)

The **Ticket Tracking System (TTS)** is the central workflow orchestration engine for the MAP Industry Platform. It manages the complete lifecycle of tickets—from initial submission through resolution—via configurable workflows with SLA enforcement.

## What is TTS?

TTS is a microservices-based system that:

- **Receives tickets** from HDTS (Help Desk Tracking System) or external sources
- **Routes tickets** through configurable multi-step workflows
- **Assigns tasks** to users based on roles using round-robin algorithms
- **Enforces SLAs** with priority-based time limits per workflow step
- **Provides analytics** with real-time dashboards and ML-powered forecasting

## Key Capabilities

| Feature | Description |
|---------|-------------|
| **Workflow Engine** | Visual workflow designer with drag-and-drop step configuration |
| **Task Management** | Automatic assignment, transfer, and escalation of tasks |
| **SLA Enforcement** | Priority-based SLAs with step-weighted time allocation |
| **Real-time Updates** | WebSocket-powered comments and notifications |
| **Analytics** | KPI dashboards, trend analysis, and anomaly detection |
| **Audit Trail** | Complete logging of all system actions |

## Quick Links

- [Overview](./overview) - Complete system overview
- [Service Documentation](./service-documentation) - Detailed technical docs
- [Workflow Engine](./workflow-engine) - Workflow configuration guide
- [SLA Configuration](./sla-configuration) - SLA setup guide

## Getting Started

```bash
# Start Workflow API
cd tts/workflow_api
python manage.py migrate
python manage.py runserver 0.0.0.0:8002

# Start Ticket Service
cd tts/ticket_service
python manage.py migrate
python manage.py runserver 0.0.0.0:8004

# Start Celery Worker
cd tts/workflow_api
celery -A workflow_api worker --pool=solo --loglevel=info
```

Visit [Development Guide](./service-documentation/development) for full setup instructions.
