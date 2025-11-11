# Assignment Notification Integration Guide

## Overview

This document explains how assignment notifications are sent from the **workflow_api** service to the **notification_service** via Celery and RabbitMQ message broker.

## Architecture

```
User Assignment Flow:
┌─────────────────┐
│  workflow_api   │
│  (assigns user) │
└────────┬────────┘
         │
         ↓
┌─────────────────────────────────────┐
│ send_assignment_notification()       │
│ (task/utils/assignment.py)          │
└────────┬────────────────────────────┘
         │
         ↓
┌─────────────────────────────────────┐
│ send_assignment_notification.delay() │
│ (task/tasks.py - Celery task)       │
└────────┬────────────────────────────┘
         │
         ↓
┌─────────────────────────────────────┐
│ RabbitMQ Message Broker             │
│ Queue: inapp-notification-queue     │
└────────┬────────────────────────────┘
         │
         ↓
┌─────────────────────────────────────┐
│ notification_service Celery Worker  │
│ Listens to: inapp-notification-queue│
└────────┬────────────────────────────┘
         │
         ↓
┌─────────────────────────────────────┐
│ notifications.create_inapp_notification
│ (notification_service/app/tasks.py) │
└────────┬────────────────────────────┘
         │
         ↓
┌─────────────────────────────────────┐
│ InAppNotification DB Record Created  │
└─────────────────────────────────────┘
```

## Key Components

### 1. **workflow_api Configuration** (`workflow_api/workflow_api/settings.py`)

```python
# Celery broker uses RabbitMQ (same as notification_service)
CELERY_BROKER_URL = os.getenv('DJANGO_CELERY_BROKER_URL', 'amqp://guest:guest@localhost:5672//')

# Task routing: assignment notifications go to inapp-notification-queue
CELERY_TASK_ROUTES = {
    "task.tasks.send_assignment_notification": {"queue": "inapp-notification-queue"},
    "task.tasks.send_bulk_assignment_notifications": {"queue": "inapp-notification-queue"},
}
```

**Important**: Both services must use the **same broker URL** for message routing to work.

### 2. **Assignment Utility** (`task/utils/assignment.py`)

```python
def send_assignment_notification(user_id, task, role_name):
    """Send assignment notification via Celery"""
    from task.tasks import send_assignment_notification as notify_task
    
    notify_task.delay(
        user_id=user_id,
        task_id=str(task.task_id),
        task_title=str(task.title),
        role_name=role_name
    )
```

This is called **automatically** when a user is assigned via `apply_round_robin_assignment()`.

### 3. **Celery Task** (`task/tasks.py`)

```python
@shared_task(name="task.send_assignment_notification")
def send_assignment_notification(user_id, task_id, task_title, role_name):
    """Queues notification to RabbitMQ for notification_service"""
    current_app.send_task(
        'notifications.create_inapp_notification',
        args=[user_id, subject, message],
        queue='inapp-notification-queue'
    )
```

This task:
- Runs in the workflow_api Celery worker
- Sends a message to RabbitMQ's `inapp-notification-queue`
- The notification_service worker picks it up and creates the notification

## Environment Setup

### For workflow_api (.env file):

```env
# Celery Broker - MUST match notification_service
DJANGO_CELERY_BROKER_URL=amqp://guest:guest@localhost:5672//

# Notification service configuration
NOTIFICATION_SERVICE_URL=http://localhost:8001
NOTIFICATION_SERVICE_BROKER_URL=amqp://guest:guest@localhost:5672//

# Queue names
INAPP_NOTIFICATION_QUEUE=inapp-notification-queue
```

### For notification_service (.env file):

```env
# Celery Broker
CELERY_BROKER_URL=amqp://guest:guest@localhost:5672//

# Queue names
INAPP_NOTIFICATION_QUEUE=inapp-notification-queue
```

## Running the Services

### Start RabbitMQ (if using Docker):

```bash
docker run -d --name rabbitmq -p 5672:6379 rabbitmq:3-management
```

### Start workflow_api Celery worker:

```bash
cd workflow_api
celery -A workflow_api worker --loglevel=info -Q inapp-notification-queue
```

### Start notification_service Celery worker:

```bash
cd notification_service
celery -A notification_service worker --loglevel=info -Q inapp-notification-queue
```

## How Assignment Notifications Are Triggered

### Scenario: User assigned to task via workflow

1. **Step in workflow requests assignment**
   ```python
   assign_users_for_step(task, step, role_name='Reviewer')
   ```

2. **Round-robin logic selects a user**
   ```python
   apply_round_robin_assignment(task, user_ids, role_name)
   ```

3. **TaskItem created + Notification queued**
   ```python
   task_item, created = TaskItem.objects.get_or_create(...)
   
   if created:
       send_assignment_notification(user_id, task, role_name)
   ```

4. **Notification task queued to RabbitMQ**
   ```python
   notify_task.delay(
       user_id=user_id,
       task_id="TASK-001",
       task_title="Review Ticket",
       role_name="Reviewer"
   )
   ```

5. **Message placed in `inapp-notification-queue`**

6. **notification_service worker processes the message**
   ```python
   InAppNotification.objects.create(
       user_id=user_id,
       subject="New Task Assignment: Review Ticket",
       message="You have been assigned to a task..."
   )
   ```

## Troubleshooting

### Notifications not appearing?

**Problem**: Messages not showing up in notification_service database

**Checklist**:
- [ ] RabbitMQ is running and accessible
- [ ] Both services have same `CELERY_BROKER_URL` (amqp://...)
- [ ] workflow_api Celery worker is running
- [ ] notification_service Celery worker is running and listening to `inapp-notification-queue`
- [ ] Task routing is correct in `CELERY_TASK_ROUTES`

**Debug**:
```bash
# Check RabbitMQ queues
docker exec rabbitmq rabbitmqctl list_queues

# Check workflow_api worker logs
celery -A workflow_api worker --loglevel=debug

# Check notification_service worker logs
celery -A notification_service worker --loglevel=debug
```

### "Broker connection refused"

**Cause**: RabbitMQ not running or wrong URL

**Fix**:
```bash
# Verify RabbitMQ is running
docker ps | grep rabbitmq

# Or start it
docker-compose up -d rabbitmq
```

### Messages stuck in queue

**Cause**: notification_service worker not running

**Fix**:
```bash
# Start the worker
cd notification_service
celery -A notification_service worker --loglevel=info -Q inapp-notification-queue
```

## Testing

### Manual test - Trigger assignment notification:

```python
# In Django shell
from task.tasks import send_assignment_notification

send_assignment_notification.delay(
    user_id=6,
    task_id="TASK-001",
    task_title="Review Ticket",
    role_name="Reviewer"
)

# Check notification_service database
from app.models import InAppNotification
InAppNotification.objects.filter(user_id=6).first()
```

### Docker test - Using docker-compose:

```bash
cd Docker
docker-compose up

# Then trigger assignment from workflow_api
```

## API Integration Points

### workflow_api sends to:
- RabbitMQ queue: `inapp-notification-queue`
- Task: `notifications.create_inapp_notification`

### notification_service receives from:
- RabbitMQ queue: `inapp-notification-queue`
- Creates InAppNotification records in database

## Summary

| Component | Broker | Queue | Task |
|-----------|--------|-------|------|
| **workflow_api** | RabbitMQ (amqp://) | inapp-notification-queue | send_assignment_notification |
| **notification_service** | RabbitMQ (amqp://) | inapp-notification-queue | create_inapp_notification |

**Key Point**: Both services MUST use the same RabbitMQ broker URL for cross-service communication to work.
