---
title: Event Bus (RabbitMQ)
sidebar_label: Event Bus
sidebar_position: 4
---

# Event Bus Architecture

The platform uses **RabbitMQ** as the message broker with **Celery** for task processing, enabling asynchronous communication between services.

## Queue Topology

```mermaid
graph LR
    subgraph Publishers
        TS[Ticket Service]
        AS[Auth Service]
    end
    
    subgraph RabbitMQ
        EX{Exchange}
        Q1[TICKET_TASKS]
        Q2[WORKFLOW_TASKS]
        Q3[NOTIFICATION_TASKS]
    end
    
    subgraph Workers
        WW[Workflow Worker]
        NW[Notification Worker]
    end
    
    TS --> EX
    AS --> EX
    EX --> Q1
    EX --> Q2
    EX --> Q3
    Q1 --> WW
    Q2 --> WW
    Q3 --> NW
```

## Common Events

| Event | Publisher | Queue | Subscribers | Description |
|-------|-----------|-------|-------------|-------------|
| `ticket.created` | TTS | `TICKET_TASKS` | Workflow Worker | Initiates ticket workflow |
| `workflow.step_completed` | Workflow | `WORKFLOW_TASKS` | Workflow Worker | Processes next workflow step |
| `notification.send` | Any | `NOTIFICATION_TASKS` | Notification Worker | Delivers email/push notifications |
| `user.created` | Auth | `USER_SYNC` | AMS, BMS, TTS | Syncs user profile data |
| `user.role_assigned` | Auth | `ROLE_SYNC` | TTS | Updates round-robin pool |

## Celery Configuration

### Task Routing

```python
CELERY_TASK_ROUTES = {
    'tickets.tasks.*': {'queue': 'TICKET_TASKS'},
    'workflow.tasks.*': {'queue': 'WORKFLOW_TASKS'},
    'notifications.tasks.*': {'queue': 'NOTIFICATION_TASKS'},
}
```

### Sending Cross-Service Tasks

```python
from celery import current_app

# Send task to another service's queue
current_app.send_task(
    'notifications.tasks.send_assignment_notification',
    kwargs={'user_id': 123, 'ticket_id': 456},
    queue='NOTIFICATION_TASKS'
)
```

## Connection Settings

| Variable | Default | Description |
|----------|---------|-------------|
| `DJANGO_CELERY_BROKER_URL` | `amqp://admin:admin@localhost:5672/` | RabbitMQ connection |
| `CELERY_RESULT_BACKEND` | `rpc://` | Task result storage |

## Monitoring

Access RabbitMQ Management UI at `http://localhost:15672`:
- **Username:** admin
- **Password:** admin

View active queues, message rates, and consumer status.
