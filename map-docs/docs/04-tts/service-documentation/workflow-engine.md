---
title: Workflow Engine
sidebar_label: Workflow Engine
sidebar_position: 2
---

# Workflow Engine

The Workflow Engine is the core of TTS, providing configurable process definitions that guide tickets from submission to resolution.

## Workflow Concepts

### What is a Workflow?

A workflow is a directed graph of **Steps** (nodes) connected by **Transitions** (edges). Each step is assigned to a **Role**, and users with that role are automatically assigned when a task reaches that step.

```
┌─────────┐     ┌─────────┐     ┌─────────┐
│  Start  │────►│ Triage  │────►│ Resolve │────►[End]
│ (Auto)  │     │ (Agent) │     │ (Tech)  │
└─────────┘     └─────────┘     └─────────┘
                     │
                     │ Escalate
                     ▼
                ┌─────────┐
                │ Manager │
                │ Review  │
                └─────────┘
```

### Key Components

| Component | Description |
|-----------|-------------|
| **Workflow** | Parent container with metadata, SLAs, and categorization |
| **Step** | A state in the workflow assigned to a specific role |
| **Transition** | A valid path between two steps |
| **Role** | User group responsible for a step (synced from Auth) |
| **Version** | Immutable snapshot of workflow graph at initialization |

## Workflow Lifecycle

### Status States

| Status | Description | Editable? | Active Tasks? |
|--------|-------------|-----------|---------------|
| `draft` | Work in progress | ✅ Yes | ❌ No |
| `deployed` | Ready for use but not accepting tickets | ⚠️ Limited | ❌ No |
| `initialized` | Active and accepting tickets | ❌ No | ✅ Yes |
| `paused` | Temporarily stopped | ❌ No | ⚠️ Existing only |

### Lifecycle Flow

```
┌────────┐    Deploy    ┌──────────┐   Initialize  ┌─────────────┐
│  Draft │────────────►│ Deployed │─────────────►│ Initialized │
└────────┘              └──────────┘              └─────────────┘
     ▲                                                   │
     │                                                   │ Pause
     │ Edit                                              ▼
     │                                            ┌──────────┐
     └────────────────────────────────────────────│  Paused  │
                        Archive/Clone             └──────────┘
```

## Workflow Configuration

### Creating a Workflow

```json
POST /workflows/
{
  "workflow": {
    "name": "IT Support Request",
    "description": "Standard IT support workflow",
    "category": "Technology",
    "sub_category": "Support Request",
    "department": "IT",
    "low_sla": "72:00:00",
    "medium_sla": "48:00:00",
    "high_sla": "24:00:00",
    "urgent_sla": "04:00:00",
    "end_logic": "notification"
  },
  "graph": {
    "nodes": [
      {
        "temp_id": "node_1",
        "name": "Triage",
        "role_id": 2,
        "is_start": true,
        "weight": 0.2,
        "design": { "x": 100, "y": 100 }
      },
      {
        "temp_id": "node_2",
        "name": "Resolution",
        "role_id": 3,
        "weight": 0.6,
        "design": { "x": 300, "y": 100 }
      },
      {
        "temp_id": "node_3",
        "name": "Verification",
        "role_id": 2,
        "is_end": true,
        "weight": 0.2,
        "design": { "x": 500, "y": 100 }
      }
    ],
    "edges": [
      { "from_temp_id": "node_1", "to_temp_id": "node_2", "name": "Assign" },
      { "from_temp_id": "node_2", "to_temp_id": "node_3", "name": "Complete" }
    ]
  }
}
```

### SLA Configuration

SLAs are defined per priority level on the workflow:

| Priority | Typical SLA | Use Case |
|----------|-------------|----------|
| **Low** | 72+ hours | Non-urgent requests |
| **Medium** | 24-48 hours | Standard requests |
| **High** | 8-24 hours | Important issues |
| **Urgent** | 1-4 hours | Critical incidents |

**Validation Rule:** `urgent_sla < high_sla < medium_sla < low_sla`

```python
# SLA validation in model
def clean(self):
    sla_list = [
        ('urgent_sla', self.urgent_sla),
        ('high_sla', self.high_sla),
        ('medium_sla', self.medium_sla),
        ('low_sla', self.low_sla)
    ]
    for i in range(len(sla_list) - 1):
        current_name, current = sla_list[i]
        next_name, next_val = sla_list[i + 1]
        if current and next_val and current >= next_val:
            raise ValidationError(f"{current_name} should be < {next_name}")
```

## Steps

### Step Properties

| Field | Type | Description |
|-------|------|-------------|
| `name` | string | Display name |
| `description` | string | Detailed description |
| `instruction` | text | Work instructions for assignees |
| `role_id` | FK → Roles | Role responsible for this step |
| `escalate_to` | FK → Roles | Role for escalation |
| `weight` | decimal | Portion of SLA time (0.0-1.0) |
| `order` | int | Display ordering |
| `is_start` | bool | Entry point of workflow |
| `is_end` | bool | Exit point of workflow |
| `design` | JSON | Frontend coordinates `{x, y}` |

### Step Weights

Step weights determine how SLA time is distributed:

```
Total SLA: 24 hours
├── Triage (weight: 0.2)      →  4.8 hours
├── Resolution (weight: 0.6)  → 14.4 hours
└── Verification (weight: 0.2) →  4.8 hours
```

**Important:** Weights should sum to 1.0 across all steps.

### Escalation Configuration

Each step can define an escalation role:

```json
{
  "name": "Support Resolution",
  "role_id": 3,
  "escalate_to": 5,  // Manager role
  "weight": 0.6
}
```

When escalated:
1. Current TaskItem marked as `escalated`
2. New TaskItem created for escalation role
3. Notification sent to new assignee

## Transitions

### Transition Properties

| Field | Type | Description |
|-------|------|-------------|
| `from_step_id` | FK → Steps | Source step |
| `to_step_id` | FK → Steps | Target step |
| `name` | string | Action label (e.g., "Approve", "Reject") |
| `design` | JSON | Frontend handle positions |

### Transition Rules

1. **No Self-Loops:** `from_step ≠ to_step`
2. **Same Workflow:** Both steps must belong to the same workflow
3. **Valid Paths:** Transitions define all possible movements

```python
def clean(self):
    if self.from_step_id == self.to_step_id:
        raise ValidationError("from_step and to_step must be different")
    if self.from_step_id.workflow_id != self.to_step_id.workflow_id:
        raise ValidationError("Steps must belong to the same workflow")
```

## Workflow Versioning

### Why Versioning?

When a workflow is modified, active tasks should continue with the original definition to:
- Prevent confusion for in-progress work
- Maintain audit trail integrity
- Allow workflow improvements without disruption

### Version Creation

A new version is created when a workflow transitions to `initialized`:

```python
class WorkflowVersion(models.Model):
    workflow = models.ForeignKey(Workflows, related_name='versions')
    version = models.PositiveIntegerField()
    definition = models.JSONField()  # Complete graph snapshot
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
```

### Version Content

The `definition` JSON contains:

```json
{
  "nodes": [
    {
      "step_id": 1,
      "name": "Triage",
      "role_id": 2,
      "role_name": "Agent",
      "weight": 0.2,
      "is_start": true,
      "is_end": false,
      "escalate_to": null
    }
  ],
  "edges": [
    {
      "transition_id": 1,
      "from_step_id": 1,
      "to_step_id": 2,
      "name": "Assign"
    }
  ],
  "metadata": {
    "created_at": "2024-01-15T10:30:00Z",
    "created_by": 1
  }
}
```

### Task-Version Binding

When a Task is created, it's bound to the current active version:

```python
class Task(models.Model):
    workflow_id = models.ForeignKey(Workflows)
    workflow_version = models.ForeignKey(WorkflowVersion, null=True)
    
    # Task uses version's definition for all step lookups
```

## End Logic

Workflows can trigger external actions on completion:

| End Logic | Description | Integration |
|-----------|-------------|-------------|
| `asset` | Asset management action | AMS Service |
| `budget` | Budget approval action | BMS Service |
| `notification` | Send completion notice | Notification Service |
| (empty) | No additional action | - |

```python
END_LOGIC_CHOICES = [
    ('', 'None'),
    ('asset', 'Asset Management'),
    ('budget', 'Budget Management'),
    ('notification', 'Send Notification'),
]
```

## Visual Designer

### Frontend Integration

The workflow designer uses React Flow for visualization:

```javascript
// Node positioning from step.design
const nodes = steps.map(step => ({
  id: `step_${step.step_id}`,
  position: { x: step.design.x, y: step.design.y },
  data: { label: step.name, role: step.role_name }
}));

// Edge connections from transitions
const edges = transitions.map(t => ({
  id: `edge_${t.transition_id}`,
  source: `step_${t.from_step_id}`,
  target: `step_${t.to_step_id}`,
  label: t.name
}));
```

### Design Coordinates

Design data is stored as JSON:

```python
design = models.JSONField(
    default=dict,
    help_text='Store design coordinates {x, y}'
)
```

## Category-Based Matching

Workflows are matched to tickets based on:

| Field | Priority | Match Logic |
|-------|----------|-------------|
| `department` | 1 | Exact match required |
| `category` | 2 | Exact match required |
| `sub_category` | 3 | Optional refinement |

```python
def find_workflow_for_ticket(ticket):
    return Workflows.objects.filter(
        department=ticket.department,
        category=ticket.category,
        status='initialized'
    ).first()
```

## API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/workflows/` | List all workflows |
| `POST` | `/workflows/` | Create workflow with graph |
| `GET` | `/workflows/{id}/` | Get workflow details |
| `PUT` | `/workflows/{id}/update-details/` | Update metadata |
| `PUT` | `/workflows/{id}/update-graph/` | Update graph structure |
| `GET` | `/workflows/{id}/graph/` | Get graph only |
| `DELETE` | `/workflows/{id}/` | Delete workflow |
| `POST` | `/workflows/{id}/initialize/` | Initialize for use |
