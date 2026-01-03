---
title: Integration Points
sidebar_label: Integration Points
sidebar_position: 5
---

# Integration Points

TTS integrates with multiple services for authentication, notifications, and external system actions. This document covers all inter-service communication patterns.

## Integration Overview

```
┌─────────────────────────────────────────────────────────────────┐
│                          TTS SERVICES                            │
├───────────────────────────────────────────────────────────────── ┤
│                                                                  │
│  ┌─────────────┐     ┌─────────────┐     ┌─────────────────┐   │
│  │   Ticket    │     │  Workflow   │     │  Notification   │   │
│  │   Service   │────►│    API      │────►│    Service      │   │
│  │   :8004     │     │   :8002     │     │                 │   │
│  └─────────────┘     └─────────────┘     └─────────────────┘   │
│         │                   │                     │             │
└─────────│───────────────────│─────────────────────│─────────────┘
          │                   │                     │
          ▼                   ▼                     ▼
┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐
│  Auth Service   │  │    RabbitMQ     │  │    SendGrid     │
│  :8000          │  │    :5672        │  │   (External)    │
└─────────────────┘  └─────────────────┘  └─────────────────┘
                              │
              ┌───────────────┴───────────────┐
              ▼                               ▼
       ┌─────────────┐                 ┌─────────────┐
       │     AMS     │                 │     BMS     │
       │   (Assets)  │                 │  (Budget)   │
       └─────────────┘                 └─────────────┘
```

## Auth Service Integration

### Token Validation

All TTS services validate JWT tokens against the Auth Service.

**Authentication Middleware:**

```python
# authentication.py
from rest_framework.authentication import BaseAuthentication
import jwt

class JWTCookieAuthentication(BaseAuthentication):
    def authenticate(self, request):
        token = request.COOKIES.get('access_token')
        if not token:
            return None
        
        try:
            payload = jwt.decode(token, settings.JWT_SECRET, algorithms=['HS256'])
            user = AuthenticatedUser(payload)
            return (user, token)
        except jwt.ExpiredSignatureError:
            raise AuthenticationFailed('Token expired')
        except jwt.InvalidTokenError:
            raise AuthenticationFailed('Invalid token')
```

### Role Synchronization

Auth Service pushes role and user-role updates via Celery:

**Consumer Task:**

```python
# role/tasks.py
@shared_task(name="tts.role.sync")
def sync_role(payload):
    """Sync role from Auth Service."""
    role_data = payload.get('role')
    Roles.objects.update_or_create(
        role_id=role_data['id'],
        defaults={
            'name': role_data['name'],
            'system': role_data.get('system', 'tts')
        }
    )

@shared_task(name="tts.user_system_role.sync")
def sync_user_system_role(payload):
    """Sync user-role assignment from Auth Service."""
    data = payload.get('user_system_role')
    role = Roles.objects.get(role_id=data['role_id'])
    
    RoleUsers.objects.update_or_create(
        role_id=role,
        user_id=data['user_id'],
        defaults={
            'user_full_name': data.get('user_full_name', ''),
            'is_active': data.get('is_active', True)
        }
    )
```

**Queue Configuration:**

```python
# settings.py
CELERY_TASK_ROUTES = {
    'tts.role.sync': {'queue': 'TTS_ROLE_SYNC_QUEUE'},
    'tts.user_system_role.sync': {'queue': 'TTS_ROLE_SYNC_QUEUE'},
}
```

### User Info Lookup

Fetch user details for display:

```python
# services/auth_service.py
import requests

def get_user_info(user_id):
    """Fetch user info from Auth Service."""
    response = requests.get(
        f"{settings.AUTH_SERVICE_URL}/api/v1/users/internal/{user_id}/",
        timeout=5
    )
    if response.status_code == 200:
        return response.json()
    return None
```

### Round-Robin User Fetch

Get users by role for assignment:

```python
def get_users_by_role(role_name, system='tts'):
    """Get user IDs for a role from Auth Service."""
    response = requests.get(
        f"{settings.AUTH_SERVICE_URL}/api/v1/tts/round-robin/",
        params={'role': role_name, 'system': system}
    )
    if response.status_code == 200:
        return response.json().get('user_ids', [])
    return []
```

---

## Ticket Service Integration

### Ticket Ingestion Flow

Ticket Service sends new tickets to Workflow API via RabbitMQ:

**Producer (Ticket Service):**

```python
# ticket_service/tickets/tasks.py
from celery import shared_task
from ticket_service.celery import app

@shared_task(name="tickets.push_ticket_to_workflow")
def push_ticket_to_workflow(ticket_data):
    """Push ticket to workflow processing queue."""
    app.send_task(
        "tickets.tasks.receive_ticket",
        kwargs={"payload": ticket_data},
        queue="TICKET_TASKS_PRODUCTION"
    )
```

**Post-Save Signal:**

```python
# ticket_service/tickets/models.py
@receiver(post_save, sender=Ticket)
def send_ticket_to_workflow(sender, instance, created, **kwargs):
    if created:
        serializer = TicketSerializer(instance)
        push_ticket_to_workflow.delay(serializer.data)
```

**Consumer (Workflow API):**

```python
# workflow_api/tickets/tasks.py
@shared_task(name="tickets.tasks.receive_ticket")
def receive_ticket(payload):
    """
    Process incoming ticket from Ticket Service.
    
    1. Create WorkflowTicket snapshot
    2. Match to workflow
    3. Create Task
    4. Assign users
    5. Send notifications
    """
    ticket_data = payload.get('ticket', payload)
    
    # Create snapshot
    workflow_ticket = WorkflowTicket.objects.create(
        ticket_number=ticket_data.get('ticket_id'),
        ticket_data=ticket_data,
        status=ticket_data.get('status', 'New'),
        department=ticket_data.get('department'),
        priority=ticket_data.get('priority', 'Medium')
    )
    
    # Allocate to workflow
    create_task_for_ticket(workflow_ticket)
```

### Status Synchronization

Send status updates back to Ticket Service:

```python
@shared_task(name="tickets.tasks.send_ticket_status")
def send_ticket_status(ticket_id, new_status):
    """Sync status back to Ticket Service."""
    app.send_task(
        "ticket_service.update_status",
        kwargs={
            "ticket_id": ticket_id,
            "status": new_status
        },
        queue="TICKET_STATUS_QUEUE"
    )
```

---

## HDTS Integration

### Ticket Submission

HDTS submits tickets via the Ticket Service API:

```http
POST http://ticket-service:8004/send/
Content-Type: application/json
Authorization: Bearer <token>

{
  "subject": "Cannot access email",
  "description": "Getting authentication errors",
  "category": "Technology",
  "subcategory": "Email",
  "department": "IT",
  "priority": "High",
  "employee": {
    "id": 101,
    "name": "Jane Doe",
    "email": "jane.doe@company.com"
  },
  "source_service": "hdts"
}
```

### Employee Lookup

Workflow API can fetch employee details:

```python
def get_employee_info(employee_id):
    """Fetch employee info from Auth/HDTS."""
    response = requests.get(
        f"{settings.AUTH_SERVICE_URL}/api/v1/hdts/employees/internal/{employee_id}/"
    )
    return response.json() if response.ok else None
```

---

## Notification Service Integration

### Notification Types

| Type | Trigger | Recipients |
|------|---------|------------|
| `task_assignment` | New task assignment | Assignee |
| `task_transfer_in` | Task transferred to user | New Assignee |
| `task_transfer_out` | Task transferred away | Previous Assignee |
| `task_escalation` | Task escalated | Escalation Role |
| `task_completed` | Task finished | Coordinator |
| `sla_warning` | SLA at risk | Assignee, Coordinator |
| `sla_breach` | SLA exceeded | Assignee, Manager |
| `comment_added` | New comment | Task Participants |

### Sending Notifications

**Producer (Workflow API):**

```python
# task/notifications.py
def send_assignment_notification(task_item):
    """Send notification for new assignment."""
    from workflow_api.celery import app
    
    ticket = task_item.task.ticket_id
    
    app.send_task(
        "notifications.tasks.create_assignment_notification",
        kwargs={
            "user_id": task_item.role_user.user_id,
            "subject": f"New Task: {ticket.ticket_data.get('subject')}",
            "message": f"You have been assigned to ticket {ticket.ticket_number}",
            "notification_type": "task_assignment",
            "related_task_item_id": task_item.task_item_id,
            "related_ticket_number": ticket.ticket_number,
            "metadata": {
                "workflow_name": task_item.task.workflow_id.name,
                "step_name": task_item.assigned_on_step.name if task_item.assigned_on_step else None
            }
        },
        queue="INAPP_NOTIFICATION_QUEUE"
    )
```

**Consumer (Notification Service):**

```python
# notification_service/app/tasks.py
@shared_task(name="notifications.tasks.create_assignment_notification")
def create_assignment_notification(user_id, subject, message, **kwargs):
    """Create in-app and email notification."""
    
    # Create in-app notification
    InAppNotification.objects.create(
        user_id=user_id,
        subject=subject,
        message=message,
        notification_type=kwargs.get('notification_type', 'system'),
        related_task_item_id=kwargs.get('related_task_item_id'),
        related_ticket_number=kwargs.get('related_ticket_number'),
        metadata=kwargs.get('metadata', {})
    )
    
    # Queue email (optional based on user preferences)
    if should_send_email(user_id):
        send_email_notification.delay(
            user_id=user_id,
            subject=subject,
            message=message
        )
```

### Queue Configuration

```python
# Workflow API settings
CELERY_TASK_ROUTES = {
    'notifications.tasks.*': {'queue': 'INAPP_NOTIFICATION_QUEUE'},
}

# Notification Service settings
CELERY_TASK_QUEUES = {
    'INAPP_NOTIFICATION_QUEUE': {'exchange': 'notifications'},
    'EMAIL_NOTIFICATION_QUEUE': {'exchange': 'notifications'},
}
```

---

## Messaging Service Integration

### WebSocket Comments

Real-time comments via Django Channels:

**WebSocket Consumer:**

```python
# messaging/comments/consumers.py
class CommentConsumer(AsyncWebsocketConsumer):
    async def connect(self):
        self.ticket_id = self.scope['url_route']['kwargs']['ticket_id']
        self.room_group_name = f'ticket_{self.ticket_id}'
        
        await self.channel_layer.group_add(
            self.room_group_name,
            self.channel_name
        )
        await self.accept()
    
    async def receive(self, text_data):
        data = json.loads(text_data)
        
        # Save comment to database
        comment = await self.save_comment(data)
        
        # Broadcast to room
        await self.channel_layer.group_send(
            self.room_group_name,
            {
                'type': 'comment_message',
                'comment': comment
            }
        )
```

**Frontend Connection:**

```javascript
const ws = new WebSocket(`ws://localhost:8002/ws/comments/${ticketId}/`);

ws.onmessage = (event) => {
  const data = JSON.parse(event.data);
  addCommentToUI(data.comment);
};

function sendComment(content) {
  ws.send(JSON.stringify({
    type: 'new_comment',
    content: content,
    user_id: currentUser.id
  }));
}
```

---

## AMS Integration (Asset Management)

### End Logic Trigger

When a workflow with `end_logic = 'asset'` completes:

```python
# task/services.py
def execute_end_logic(task):
    """Execute workflow end logic."""
    workflow = task.workflow_id
    
    if workflow.end_logic == 'asset':
        trigger_asset_action(task)
    elif workflow.end_logic == 'budget':
        trigger_budget_action(task)
    elif workflow.end_logic == 'notification':
        trigger_completion_notification(task)

def trigger_asset_action(task):
    """Notify AMS of completed asset-related workflow."""
    ticket_data = task.ticket_id.ticket_data
    
    app.send_task(
        "ams.tasks.process_workflow_completion",
        kwargs={
            "ticket_id": task.ticket_id.ticket_number,
            "asset_name": ticket_data.get('asset_name'),
            "serial_number": ticket_data.get('serial_number'),
            "action": ticket_data.get('category'),  # e.g., "Check-in", "Check-out"
            "completed_at": timezone.now().isoformat()
        },
        queue="AMS_WORKFLOW_QUEUE"
    )
```

---

## BMS Integration (Budget Management)

### Budget Workflow Completion

```python
def trigger_budget_action(task):
    """Notify BMS of completed budget workflow."""
    ticket_data = task.ticket_id.ticket_data
    
    app.send_task(
        "bms.tasks.process_budget_approval",
        kwargs={
            "ticket_id": task.ticket_id.ticket_number,
            "requested_budget": str(ticket_data.get('requested_budget')),
            "cost_items": ticket_data.get('cost_items', {}),
            "approved_by": task.ticket_owner.user_id if task.ticket_owner else None,
            "completed_at": timezone.now().isoformat()
        },
        queue="BMS_WORKFLOW_QUEUE"
    )
```

---

## Environment Configuration

### Service URLs

```python
# settings.py
AUTH_SERVICE_URL = os.environ.get('DJANGO_AUTH_SERVICE', 'http://localhost:8000')
TICKET_SERVICE_URL = os.environ.get('DJANGO_TICKET_SERVICE', 'http://localhost:8004')
NOTIFICATION_SERVICE_URL = os.environ.get('DJANGO_NOTIFICATION_SERVICE', 'http://localhost:8003')
```

### RabbitMQ Configuration

```python
CELERY_BROKER_URL = os.environ.get(
    'DJANGO_CELERY_BROKER_URL',
    'amqp://admin:admin@localhost:5672/'
)

CELERY_TASK_ROUTES = {
    # Outgoing
    'notifications.tasks.*': {'queue': 'INAPP_NOTIFICATION_QUEUE'},
    'ams.tasks.*': {'queue': 'AMS_WORKFLOW_QUEUE'},
    'bms.tasks.*': {'queue': 'BMS_WORKFLOW_QUEUE'},
    'ticket_service.*': {'queue': 'TICKET_STATUS_QUEUE'},
    
    # Incoming (consumed by this service)
    'tickets.tasks.receive_ticket': {'queue': 'TICKET_TASKS_PRODUCTION'},
    'tts.role.sync': {'queue': 'TTS_ROLE_SYNC_QUEUE'},
    'tts.user_system_role.sync': {'queue': 'TTS_ROLE_SYNC_QUEUE'},
}
```

---

## Error Handling

### Failed Notification Retry

```python
class FailedNotification(models.Model):
    """Track failed notification attempts for retry."""
    task_item_id = models.IntegerField()
    notification_type = models.CharField(max_length=50)
    error_message = models.TextField()
    retry_count = models.IntegerField(default=0)
    last_retry = models.DateTimeField(auto_now=True)
    resolved = models.BooleanField(default=False)

@shared_task(bind=True, max_retries=3)
def send_notification_with_retry(self, **kwargs):
    try:
        create_notification(**kwargs)
    except Exception as exc:
        FailedNotification.objects.create(
            task_item_id=kwargs.get('task_item_id'),
            notification_type=kwargs.get('type'),
            error_message=str(exc)
        )
        raise self.retry(exc=exc, countdown=60 * (self.request.retries + 1))
```

### Circuit Breaker Pattern

```python
# services/circuit_breaker.py
class CircuitBreaker:
    def __init__(self, failure_threshold=5, reset_timeout=60):
        self.failures = 0
        self.threshold = failure_threshold
        self.reset_timeout = reset_timeout
        self.last_failure = None
        self.state = 'closed'  # closed, open, half-open
    
    def call(self, func, *args, **kwargs):
        if self.state == 'open':
            if self._should_reset():
                self.state = 'half-open'
            else:
                raise CircuitOpenError("Circuit is open")
        
        try:
            result = func(*args, **kwargs)
            self._success()
            return result
        except Exception as e:
            self._failure()
            raise

auth_circuit = CircuitBreaker()
```
