# Target Resolution - Quick Reference

## What's New?

✅ Target resolution times are now automatically calculated for every task assignment based on:
- Ticket priority
- Workflow SLA (matched to priority)
- Step weight and relative importance

## Key Changes Summary

| Component | Change |
|-----------|--------|
| Ticket Model | Added `priority` field |
| Ticket Tasks | Extracts priority from incoming ticket data |
| Task Model | Auto-calculates `target_resolution` on save |
| TaskItem Model | Stores `target_resolution` per user assignment |
| Assignment Logic | Calculates and applies target resolution |
| New Module | `task/utils/target_resolution.py` |

## How to Use

### 1. Configure Workflow SLA

```python
from datetime import timedelta
from workflow.models import Workflows

workflow = Workflows.objects.create(
    name="Support",
    low_sla=timedelta(days=30),
    medium_sla=timedelta(days=14),
    high_sla=timedelta(days=3),
    urgent_sla=timedelta(hours=4)
)
```

### 2. Set Step Weights

```python
from step.models import Steps

# Steps with relative weights
Steps.objects.create(workflow=workflow, name="Initial Review", weight=2.0, order=1)
Steps.objects.create(workflow=workflow, name="Processing", weight=2.0, order=2)
Steps.objects.create(workflow=workflow, name="Final Approval", weight=1.0, order=3)
# Total weight: 5.0
# Allocation: Review=40%, Process=40%, Approval=20%
```

### 3. Send Tickets with Priority

```python
ticket_data = {
    "ticket_number": "TK-001",
    "priority": "High",  # ← Now captured!
    "subject": "System Down",
    "department": "IT",
    "category": "Incident"
}
```

### 4. Results

```python
# Task automatically gets target_resolution
task = Task.objects.get(task_id=1)
print(task.target_resolution)  # datetime object

# Each user assignment gets target_resolution
task_item = TaskItem.objects.get(task_item_id=1)
print(task_item.target_resolution)  # datetime object
```

## Formula

```
target_resolution = now + (SLA_for_priority × step_weight_percentage)
```

### Example

- Priority: High
- High SLA: 8 hours
- Step weight: 2.0 (out of total 5.0)
- Calculation: 8h × (2.0/5.0) = 3.2 hours
- **Result**: target_resolution = now + 3.2 hours

## Queries

Get tasks nearing target resolution:

```python
from django.utils import timezone
from datetime import timedelta

soon = timezone.now() + timedelta(hours=1)
at_risk = Task.objects.filter(
    target_resolution__lte=soon,
    status='pending'
)
```

Get tasks by priority:

```python
high_priority = Task.objects.filter(
    ticket_id__priority='High',
    status__in=['pending', 'in_progress']
)
```

## Debugging

Check SLA allocation across workflow:

```python
from task.utils.target_resolution import calculate_step_sla_summary

workflow = Workflows.objects.get(workflow_id=1)
summary = calculate_step_sla_summary(workflow)

for priority, steps in summary.items():
    print(f"\n{priority}:")
    for step in steps:
        print(f"  {step['step_name']}: {step['allocation']}")
```

Output:
```
High:
  Initial Review: 3:12:00 (40% of 8 hours)
  Processing: 3:12:00 (40% of 8 hours)
  Final Approval: 1:36:00 (20% of 8 hours)
```

## Migration Required

```bash
cd workflow_api
python manage.py makemigrations tickets
python manage.py migrate tickets
```

## Files Modified

1. ✅ `tickets/models.py` - Added priority field
2. ✅ `tickets/tasks.py` - Extract priority from ticket data
3. ✅ `task/models.py` - Auto-calculate target resolution
4. ✅ `task/utils/assignment.py` - Store target resolution on assignment
5. ✅ `task/utils/target_resolution.py` - NEW: Core calculation logic

## Troubleshooting

**Q: Target resolution is None?**
- Check if SLA is configured for the ticket priority
- Verify step has weight > 0
- Check logs for calculation errors

**Q: SLA not being used?**
- Verify priority value matches: Low, Medium, High, or Critical
- Check `workflow.{priority}_sla` is set
- Use `calculate_step_sla_summary()` to debug

**Q: Steps not weighing correctly?**
- Total step weight should represent 100% of time
- Use equal weights if unsure (e.g., each step = 1.0)
- Check `calculate_step_weight_percentage()` output

## Notes

- Target resolution is **automatically** calculated, no manual intervention needed
- Calculation uses **workflow-level SLA** configured by admin
- Each **step gets a proportional slice** of the total SLA
- Works with any **priority level** defined in ticket
- **Graceful fallback** if SLA not configured (logs warning, continues)
