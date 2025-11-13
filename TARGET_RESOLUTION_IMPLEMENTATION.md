# Target Resolution Time Implementation

## Overview
Target resolution times are now automatically calculated for each task assignment based on:
1. **Ticket Priority** - extracted from incoming ticket data
2. **Workflow SLA** - configured per priority level in the workflow
3. **Step Weight** - relative weight of current step in the workflow
4. **Step Order** - position in the workflow sequence

## Files Modified

### 1. `workflow_api/tickets/models.py`
- **Added** `priority` field to `WorkflowTicket` model
- CharField with choices: Low, Medium, High, Critical
- Default: Medium
- Database indexed for performance

### 2. `workflow_api/tickets/tasks.py`
- **Updated** `receive_ticket()` to extract and store priority from ticket data
- **Updated** `update_or_create()` to pass priority to the model

### 3. `workflow_api/task/models.py`
- **Updated** `Task.save()` method to auto-calculate target resolution
- Already has `target_resolution` field on both Task and TaskItem models

### 4. `workflow_api/task/utils/target_resolution.py` (NEW FILE)
Utility module with four main functions:

#### `get_sla_for_priority(workflow, priority)`
- Maps ticket priority to workflow SLA
- Supports: Low, Medium, High, Critical
- Returns timedelta for the priority level
- Returns None if SLA not configured

#### `calculate_step_weight_percentage(step, workflow)`
- Calculates what % of total workflow time is allocated to a step
- Formula: `step.weight / sum(all_steps.weight)`
- Example: Step with weight 2.5 out of total 10 = 25%

#### `calculate_target_resolution(ticket, step, workflow)`
**Main calculation function**
```
target_resolution = now + (SLA × step_weight_percentage)
```

Example:
- Ticket priority: High
- Workflow High SLA: 8 hours
- Step weight: 2.0 out of total 10 (20%)
- Calculation: 8 hours × 0.2 = 1.6 hours
- Result: target_resolution = now + 1.6 hours

#### `calculate_step_sla_summary(workflow)`
- Debugging helper
- Returns summary of SLA allocations across all steps per priority
- Useful for understanding time distribution

### 5. `workflow_api/task/utils/assignment.py`
- **Updated** imports to include `calculate_target_resolution`
- **Updated** `apply_round_robin_assignment()` to calculate and store target resolution on TaskItem

## How It Works

### Flow During Task Creation

```
receive_ticket(ticket_data)
  ↓
extract priority from ticket_data (default: Medium)
  ↓
create_task_for_ticket()
  ↓
Task.save() → auto-calculate Task.target_resolution
  ↓
assign_users_for_step()
  ↓
apply_round_robin_assignment()
  ↓
calculate_target_resolution() → sets TaskItem.target_resolution
  ↓
TaskItem created with target_resolution
```

## Workflow Configuration

To use this feature, configure SLA per priority in your Workflows:

```python
workflow = Workflows.objects.create(
    name="Support Request",
    low_sla=timedelta(days=30),      # 30 days
    medium_sla=timedelta(days=14),   # 14 days
    high_sla=timedelta(days=3),      # 3 days
    urgent_sla=timedelta(hours=4)    # 4 hours
)
```

## Step Weight Configuration

Steps should have appropriate weights relative to other steps:

```python
step1 = Steps.objects.create(workflow=workflow, name="Review", weight=2.0, order=1)
step2 = Steps.objects.create(workflow=workflow, name="Approve", weight=1.5, order=2)
step3 = Steps.objects.create(workflow=workflow, name="Execute", weight=1.0, order=3)
# Total weight: 4.5
# Time allocated: Review=44.4%, Approve=33.3%, Execute=22.2%
```

## Priority Mapping

| Ticket Priority | SLA Field in Workflow |
|-----------------|----------------------|
| Low             | low_sla              |
| Medium          | medium_sla           |
| High            | high_sla             |
| Critical        | urgent_sla           |

## Database Fields

### Task Model
- `target_resolution`: DateTimeField - calculated on creation

### TaskItem Model  
- `target_resolution`: DateTimeField - calculated on assignment
- Each user assignment gets its own target resolution time

## Example Calculation

Given:
- Workflow with 3 steps totaling weight 10
- Ticket priority: "High"
- Workflow high_sla: 8 hours
- Current step: weight 2.0

Calculation:
```
Step percentage = 2.0 / 10.0 = 0.2 (20%)
Step allocation = 8 hours × 0.2 = 1.6 hours
target_resolution = now + 1.6 hours
```

## Logging

The system provides detailed logging:
```
✅ Found SLA for priority 'High': 8:00:00
📊 Step 'Review' weight: 2.0, Total: 10, Percentage: 20.00%
🎯 Target resolution calculated: 2025-11-13 12:30:45+00:00
👤 Created TaskItem: User 6 assigned to Task 1 with role 'Admin'
```

## Error Handling

- If no SLA configured for priority: logs warning, returns None
- If total workflow weight is 0: uses equal distribution
- If calculation fails: logs error, assignment continues with target_resolution=None
- Graceful degradation - missing SLA doesn't block task creation

## Integration Points

The target resolution feature integrates with:
1. **Ticket Service** - sends priority in ticket data
2. **Workflow API** - stores and matches SLA
3. **Task Assignment** - calculates and stores on creation
4. **Notification Service** - can include target resolution in notifications
5. **Frontend** - can display target resolution for users
