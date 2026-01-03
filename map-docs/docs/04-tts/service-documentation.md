---
title: Service Documentation Index
sidebar_label: Service Docs
sidebar_position: 2
---

# TTS Service Documentation

Welcome to the comprehensive documentation for the Ticket Tracking System. This service is the central workflow orchestration engine for the MAP Industry Platform.

## Quick Navigation

| Section | Description |
|---------|-------------|
| [Architecture](./service-documentation/architecture) | System design, tech stack, data models |
| [Workflow Engine](./service-documentation/workflow-engine) | Workflow configuration, versioning, SLAs |
| [Task Management](./service-documentation/task-management) | Task lifecycle, assignments, transitions |
| [API Reference](./service-documentation/api-reference) | Complete endpoint documentation |
| [Integration Points](./service-documentation/integration-points) | Cross-system integration patterns |
| [Development Guide](./service-documentation/development) | Setup, testing, configuration |

## System Boundaries

### Responsibilities

✅ **TTS handles:**
- Ticket ingestion from HDTS and external sources
- Workflow orchestration and step execution
- Task assignment via round-robin algorithms
- SLA calculation and breach detection
- Real-time comments and collaboration
- Analytics, reporting, and forecasting
- Audit logging for all actions

❌ **TTS does NOT handle:**
- User authentication (delegated to Auth Service)
- User identity management (synced from Auth Service)
- External ticket submission UI (handled by HDTS)
- Asset or budget business logic (external systems)

## Trust Model

```
┌─────────────────────────────────────────────────────────────┐
│                      AUTH SERVICE                            │
│                   (Root of Trust)                            │
│                                                              │
│  • Issues JWT tokens                                         │
│  • Manages user identities                                   │
│  • Syncs roles to TTS                                       │
└─────────────────────────────────────────────────────────────┘
                            │
                            │ JWT Validation
                            │ Role Sync
                            ▼
┌─────────────────────────────────────────────────────────────┐
│                  TICKET TRACKING SYSTEM                      │
│                                                              │
│  ┌───────────────┐ ┌───────────────┐ ┌───────────────────┐  │
│  │ Ticket Service│ │ Workflow API  │ │ Messaging Service │  │
│  │               │ │               │ │                   │  │
│  │ • Ticket CRUD │ │ • Orchestrate │ │ • WebSocket       │  │
│  │ • Attachments │ │ • Tasks/SLA   │ │ • Comments        │  │
│  └───────────────┘ └───────────────┘ └───────────────────┘  │
│                                                              │
└─────────────────────────────────────────────────────────────┘
                            │
                            │ Notifications
                            ▼
                ┌───────────────────────┐
                │  Notification Service │
                │                       │
                │  • Email via Celery   │
                │  • In-App alerts      │
                └───────────────────────┘
```

## Key Actors

| Actor | Description | Primary Actions |
|-------|-------------|-----------------|
| **Agent** | Support staff assigned to tasks | View tasks, process steps, add comments |
| **Ticket Coordinator** | Owner of ticket lifecycle | Monitor progress, transfer/escalate |
| **Admin** | System administrator | Configure workflows, manage roles, view reports |
| **System** | Automated processes | SLA monitoring, round-robin assignment |

## Data Flow Overview

### Ticket Lifecycle

```
1. SUBMISSION
   └─► HDTS → RabbitMQ → Ticket Service → WorkflowTicket created

2. WORKFLOW ALLOCATION
   └─► Workflow API matches Department/Category → Task created
   └─► Round-robin assigns Ticket Coordinator (owner)
   └─► First step users assigned via round-robin

3. TASK EXECUTION
   └─► Agent views "My Tasks" → Works on ticket
   └─► Agent transitions task → Next step users assigned
   └─► Notifications sent to new assignees

4. RESOLUTION
   └─► Final step completed → Task marked complete
   └─► End-logic triggers (Asset/Budget/Notification)
   └─► Ticket closed

5. ANALYTICS
   └─► All actions logged for audit
   └─► Metrics aggregated for dashboards
```

## Security Summary

| Attack Vector | Mitigation |
|---------------|------------|
| Unauthorized Access | JWT validation on all endpoints |
| Role Bypass | SystemRolePermission checks |
| Data Tampering | Audit logging with immutable records |
| SLA Manipulation | Server-side calculation only |
| XSS in Comments | Content sanitization |

## Getting Started

1. **For Developers:** Start with [Development Guide](./service-documentation/development)
2. **For Integrators:** See [Integration Points](./service-documentation/integration-points)
3. **For API Users:** Reference [API Documentation](./service-documentation/api-reference)
4. **For Workflow Design:** Check [Workflow Engine](./service-documentation/workflow-engine)
