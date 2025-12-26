---
title: SLA Configuration
sidebar_label: SLA Config
sidebar_position: 5
---

# SLA Configuration

Service Level Agreements (SLAs) define the maximum time allowed for ticket resolution. TTS supports priority-based SLAs with step-weighted time allocation.

## Priority Levels

TTS supports four priority levels:

| Priority | Typical SLA | Use Case |
|----------|-------------|----------|
| **Low** | 72+ hours | Non-urgent requests, general inquiries |
| **Medium** | 24-48 hours | Standard requests, normal operations |
| **High** | 8-24 hours | Important issues affecting productivity |
| **Urgent/Critical** | 1-4 hours | Critical incidents, major outages |

## Configuring SLAs

### Per-Workflow SLA

Each workflow defines SLA durations for all priority levels:

```json
{
  "name": "IT Support Request",
  "low_sla": "72:00:00",
  "medium_sla": "48:00:00",
  "high_sla": "24:00:00",
  "urgent_sla": "04:00:00"
}
```

**Format:** `HH:MM:SS` (hours:minutes:seconds)

### Validation Rules

SLAs must follow this order (lower priority = more time):

```
urgent_sla < high_sla < medium_sla < low_sla
```

Invalid configuration will be rejected:
```json
{
  "error": "high_sla should be less than medium_sla"
}
```

## Step-Weighted SLA

The total SLA is distributed across workflow steps based on their weight:

### Example: 24-Hour SLA

```
Workflow SLA: 24 hours (High priority)

Steps:
├── Triage       (weight: 0.2)  →  4.8 hours
├── Resolution   (weight: 0.5)  → 12.0 hours
├── Verification (weight: 0.2)  →  4.8 hours
└── Closure      (weight: 0.1)  →  2.4 hours
                        ───────
                 Total: 1.0     → 24.0 hours
```

### Setting Step Weights

```json
{
  "step_id": 10,
  "name": "Resolution",
  "weight": 0.5,
  "role_id": 3
}
```

**Important:** Weights across all steps in a workflow should sum to 1.0.

## SLA Calculation

### Task-Level Target Resolution

When a task is created:

```python
def calculate_target_resolution(ticket, workflow):
    priority = ticket.priority.lower()
    
    sla_map = {
        'low': workflow.low_sla,
        'medium': workflow.medium_sla,
        'high': workflow.high_sla,
        'critical': workflow.urgent_sla,
        'urgent': workflow.urgent_sla,
    }
    
    sla_duration = sla_map.get(priority)
    return timezone.now() + sla_duration
```

### Step-Level Target Resolution

Each step gets a proportional allocation:

```python
def calculate_step_target(task, step):
    total_time = task.target_resolution - task.created_at
    step_time = total_time * step.weight
    return timezone.now() + step_time
```

## SLA Monitoring

### Breach Detection

TTS monitors SLA compliance in real-time:

| Event | Trigger | Action |
|-------|---------|--------|
| **Warning** | 80% of SLA elapsed | Notify assignee |
| **At Risk** | 90% of SLA elapsed | Notify assignee + coordinator |
| **Breach** | 100% of SLA elapsed | Notify all + manager, mark as breached |

### Notifications

```python
# SLA warning notification
{
  "type": "sla_warning",
  "subject": "SLA Warning: Ticket TX20240115001234",
  "message": "This task is at 80% of its SLA. Target: 2024-01-16 10:30",
  "user_id": 15
}
```

## Reporting

### SLA Compliance Dashboard

Access at: `/analytics/tickets/sla/`

```json
{
  "total_tickets": 150,
  "met_sla": 135,
  "breached_sla": 15,
  "compliance_rate": 90.0,
  "by_priority": {
    "low": {"total": 50, "met": 48, "rate": 96.0},
    "medium": {"total": 60, "met": 55, "rate": 91.7},
    "high": {"total": 30, "met": 25, "rate": 83.3},
    "urgent": {"total": 10, "met": 7, "rate": 70.0}
  }
}
```

### Drilldown

Get tickets by SLA status:

```http
GET /analytics/drilldown/tickets/sla/?status=breached
```

## Best Practices

1. **Set realistic SLAs** based on team capacity and complexity
2. **Account for business hours** if applicable
3. **Balance step weights** appropriately
4. **Monitor compliance** regularly
5. **Adjust SLAs** based on historical performance

## API Reference

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/workflows/{id}/update-details/` | PUT | Update workflow SLAs |
| `/analytics/tickets/sla/` | GET | SLA compliance metrics |
| `/analytics/drilldown/tickets/sla/` | GET | SLA compliance drilldown |

See [API Reference](./service-documentation/api-reference) for complete documentation.
