---
title: Task Management
sidebar_label: Task Management
sidebar_position: 3
---

# Task Management

Tasks represent the runtime execution of workflows. When a ticket enters TTS, a Task is created and moves through workflow steps until completion.

## Task Lifecycle

### Status Flow

```
┌─────────┐    Assign     ┌─────────────┐    Work     ┌───────────┐
│ pending │──────────────►│ in progress │────────────►│ completed │
└─────────┘               └─────────────┘             └───────────┘
     │                           │
     │                           │ Hold
     │                           ▼
     │                     ┌───────────┐
     │                     │  on_hold  │
     │                     └───────────┘
     │
     │ Cancel
     ▼
┌───────────┐
│ cancelled │
└───────────┘
```

### Task Statuses

| Status | Description | User Action |
|--------|-------------|-------------|
| `pending` | Newly created, awaiting first action | None |
| `in progress` | Being actively worked on | Transition, Update |
| `on_hold` | Temporarily paused | Resume |
| `completed` | Successfully finished | None |
| `cancelled` | Terminated without completion | None |

## Task Creation Flow

When a ticket arrives via the Celery queue:

```python
@shared_task(name="tickets.tasks.receive_ticket")
def receive_ticket(payload):
    """
    1. Create/Update WorkflowTicket snapshot
    2. Match workflow by department/category
    3. Create Task with workflow version binding
    4. Assign Ticket Coordinator (owner)
    5. Create TaskItems for first step users
    6. Send assignment notifications
    """
```

### Workflow Matching

```python
def create_task_for_ticket(workflow_ticket):
    # Find matching workflow
    workflow = Workflows.objects.filter(
        department=workflow_ticket.department,
        category=workflow_ticket.category,
        status='initialized'
    ).first()
    
    if not workflow:
        return None  # No matching workflow
    
    # Get active version
    version = workflow.versions.filter(is_active=True).first()
    
    # Create task
    task = Task.objects.create(
        ticket_id=workflow_ticket,
        workflow_id=workflow,
        workflow_version=version,
        current_step=get_start_step(workflow),
        ticket_owner=get_ticket_coordinator(workflow),
        status='pending'
    )
    
    # Assign first step users
    assign_step_users(task, task.current_step)
    
    return task
```

## TaskItem (User Assignments)

Each `TaskItem` represents a single user's assignment to a task.

### TaskItem Structure

```python
class TaskItem(models.Model):
    task = models.ForeignKey(Task)
    role_user = models.ForeignKey(RoleUsers)
    origin = models.CharField(choices=[
        ('System', 'System'),           # Auto-assigned
        ('Transferred', 'Transferred'),  # Manual transfer
        ('Escalation', 'Escalation'),   # SLA/manual escalation
    ])
    notes = models.TextField(blank=True)
    assigned_on = models.DateTimeField(auto_now_add=True)
    assigned_on_step = models.ForeignKey(Steps)
    target_resolution = models.DateTimeField(null=True)
    acted_on = models.DateTimeField(null=True)
```

### TaskItem Origins

| Origin | Description | Trigger |
|--------|-------------|---------|
| `System` | Automatic round-robin assignment | Task creation, step transition |
| `Transferred` | Manual transfer by admin | Transfer API call |
| `Escalation` | Escalation (SLA breach or manual) | Escalation action |

### TaskItem History

All status changes are tracked:

```python
class TaskItemHistory(models.Model):
    task_item = models.ForeignKey(TaskItem)
    status = models.CharField(choices=[
        ('new', 'New'),
        ('in progress', 'In Progress'),
        ('resolved', 'Resolved'),
        ('reassigned', 'Reassigned'),
        ('escalated', 'Escalated'),
        ('breached', 'Breached'),
    ])
    created_at = models.DateTimeField(auto_now_add=True)
```

## Round-Robin Assignment

Users are assigned using round-robin to distribute workload evenly.

### Algorithm

```python
def get_next_user_for_role(role_id):
    """Get next user in rotation for a role."""
    role_users = RoleUsers.objects.filter(
        role_id=role_id,
        is_active=True
    ).order_by('user_id')
    
    if not role_users:
        return None
    
    # Get or create round-robin state
    rr, _ = RoundRobin.objects.get_or_create(
        role_name=role_users.first().role_id.name
    )
    
    # Calculate next user
    user_count = role_users.count()
    next_index = rr.current_index % user_count
    selected_user = role_users[next_index]
    
    # Update index for next call
    rr.current_index = (rr.current_index + 1) % user_count
    rr.save()
    
    return selected_user
```

### RoundRobin State

```python
class RoundRobin(models.Model):
    role_name = models.CharField(max_length=255, unique=True)
    current_index = models.IntegerField(default=0)
    updated_at = models.DateTimeField(auto_now=True)
```

## Ticket Coordinator (Owner)

Each task has a **Ticket Coordinator** who owns the ticket lifecycle:

| Responsibility | Description |
|----------------|-------------|
| **Monitor** | Track progress through workflow |
| **Transfer** | Move assignments between users |
| **Escalate** | Escalate to higher role |
| **Communicate** | Primary contact for ticket updates |

```python
class Task(models.Model):
    ticket_owner = models.ForeignKey(
        RoleUsers,
        related_name='owned_tasks',
        help_text="Ticket Coordinator assigned via round-robin"
    )
```

### Coordinator Assignment

Coordinators are assigned from users with the "Ticket Coordinator" role:

```python
def assign_ticket_coordinator(workflow):
    coordinator_role = Roles.objects.get(name='Ticket Coordinator')
    return get_next_user_for_role(coordinator_role.role_id)
```

## Task Transitions

Moving a task from one step to another.

### Transition Flow

```
1. User clicks "Complete" on current step
2. Frontend calls POST /transitions/{task_id}/transition/
3. Backend validates transition exists
4. Current TaskItem marked as resolved
5. Task.current_step updated
6. New TaskItems created for next step's role
7. Notifications sent to new assignees
```

### Transition API

```http
POST /transitions/{task_id}/transition/
Content-Type: application/json
{
  "transition_id": 5,
  "notes": "Issue resolved, sending for verification."
}
```

Response:
```json
{
  "success": true,
  "task": {
    "task_id": 123,
    "current_step": {
      "step_id": 3,
      "name": "Verification"
    },
    "status": "in progress"
  },
  "message": "Task transitioned to Verification"
}
```

### Transition Validation

```python
def validate_transition(task, transition_id):
    """Validate that transition is allowed from current step."""
    transition = StepTransition.objects.filter(
        transition_id=transition_id,
        from_step_id=task.current_step
    ).first()
    
    if not transition:
        raise ValidationError("Invalid transition from current step")
    
    return transition
```

## Task Transfer

Admins can transfer tasks between users.

### Transfer API

```http
POST /tasks/transfer/
Content-Type: application/json
{
  "task_item_id": 456,
  "new_user_id": 15,
  "notes": "Transferred to specialist"
}
```

### Transfer Logic

```python
def transfer_task_item(task_item, new_role_user, transferred_by, notes):
    # Mark current assignment
    task_item.transferred_to = new_role_user
    task_item.transferred_by = transferred_by
    task_item.save()
    
    # Create new TaskItem
    new_item = TaskItem.objects.create(
        task=task_item.task,
        role_user=new_role_user,
        origin='Transferred',
        notes=notes,
        assigned_on_step=task_item.assigned_on_step
    )
    
    # Record history
    TaskItemHistory.objects.create(
        task_item=task_item,
        status='reassigned'
    )
    TaskItemHistory.objects.create(
        task_item=new_item,
        status='new'
    )
    
    # Notify new assignee
    send_transfer_notification(new_item)
```

## Task Escalation

Escalate tasks to higher roles when needed.

### Escalation Triggers

| Trigger | Description |
|---------|-------------|
| **Manual** | User/admin requests escalation |
| **SLA Breach** | Step time limit exceeded |
| **Policy** | Business rule triggered |

### Escalation API

```http
POST /tasks/escalate/
Content-Type: application/json
{
  "task_item_id": 456,
  "reason": "Customer requests manager involvement"
}
```

### Escalation Logic

```python
def escalate_task_item(task_item, reason):
    step = task_item.assigned_on_step
    
    if not step.escalate_to:
        raise ValidationError("No escalation role configured for this step")
    
    # Mark current as escalated
    TaskItemHistory.objects.create(
        task_item=task_item,
        status='escalated'
    )
    
    # Get escalation role user
    escalation_user = get_next_user_for_role(step.escalate_to.role_id)
    
    # Create new assignment
    new_item = TaskItem.objects.create(
        task=task_item.task,
        role_user=escalation_user,
        origin='Escalation',
        notes=reason,
        assigned_on_step=step
    )
    
    # Notify
    send_escalation_notification(new_item, reason)
```

## SLA Calculation

### Task-Level SLA

Based on ticket priority and workflow configuration:

```python
def calculate_target_resolution_for_task(ticket, workflow):
    priority = ticket.priority.lower()
    
    sla_map = {
        'low': workflow.low_sla,
        'medium': workflow.medium_sla,
        'high': workflow.high_sla,
        'critical': workflow.urgent_sla,
        'urgent': workflow.urgent_sla,
    }
    
    sla_duration = sla_map.get(priority)
    if sla_duration:
        return timezone.now() + sla_duration
    return None
```

### Step-Level SLA (Weighted)

Each step gets a portion of total SLA based on weight:

```python
def calculate_step_target_resolution(task, step):
    if not task.target_resolution:
        return None
    
    # Total time available
    total_sla = task.target_resolution - task.created_at
    
    # This step's portion
    step_duration = total_sla * Decimal(str(step.weight))
    
    return timezone.now() + step_duration
```

## Task Views

### My Tasks (User)

```http
GET /tasks/my-tasks/
```

Returns TaskItems assigned to the authenticated user:

```json
{
  "results": [
    {
      "task_item_id": 456,
      "task": {
        "task_id": 123,
        "ticket": {
          "ticket_number": "TX20240115001234",
          "subject": "Laptop not working"
        },
        "workflow": {
          "name": "IT Support Request"
        }
      },
      "role": "IT Technician",
      "status": "in progress",
      "assigned_on": "2024-01-15T10:30:00Z",
      "target_resolution": "2024-01-16T10:30:00Z"
    }
  ]
}
```

### All Tasks (Admin)

```http
GET /tasks/all-tasks/?tab=active&search=laptop
```

Query parameters:

| Param | Values | Description |
|-------|--------|-------------|
| `tab` | `active`, `inactive`, `unassigned` | Filter by status |
| `search` | string | Search in ticket subject/description |
| `role` | string | Filter by role name |

### Owned Tickets (Coordinator)

```http
GET /tasks/owned-tickets/
```

Returns Tasks where user is the Ticket Coordinator.

## Notifications

Task events trigger notifications:

| Event | Recipients | Channel |
|-------|------------|---------|
| New Assignment | Assignee | Email + In-App |
| Transfer | New Assignee | Email + In-App |
| Escalation | Escalation Role | Email + In-App |
| SLA Warning | Assignee + Coordinator | Email |
| SLA Breach | Assignee + Manager | Email + In-App |
| Task Complete | Coordinator | In-App |

```python
def send_assignment_notification(task_item):
    app.send_task(
        "notifications.tasks.create_assignment_notification",
        kwargs={
            "user_id": task_item.role_user.user_id,
            "task_item_id": task_item.task_item_id,
            "ticket_number": task_item.task.ticket_id.ticket_number,
            "subject": "New Task Assignment"
        },
        queue="INAPP_NOTIFICATION_QUEUE"
    )
```
