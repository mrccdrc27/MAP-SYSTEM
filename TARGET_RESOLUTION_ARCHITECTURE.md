# Target Resolution Implementation - Architecture

## System Flow Diagram

```
┌─────────────────────────────────────────────────────────────────┐
│                    INCOMING TICKET                              │
│              (with priority field)                               │
└──────────────────────────┬──────────────────────────────────────┘
                           │
                           ▼
┌─────────────────────────────────────────────────────────────────┐
│         receive_ticket(ticket_data)                             │
│  ✓ Extract priority (default: Medium)                           │
│  ✓ Store in ticket_data                                         │
│  ✓ Create WorkflowTicket with priority field                    │
└──────────────────────────┬──────────────────────────────────────┘
                           │
                           ▼
┌─────────────────────────────────────────────────────────────────┐
│  create_task_for_ticket()                                       │
│  ✓ Find matching workflow                                       │
│  ✓ Create Task instance                                         │
└──────────────────────────┬──────────────────────────────────────┘
                           │
                           ▼
┌─────────────────────────────────────────────────────────────────┐
│  Task.save()                                                     │
│  🎯 Auto-calculate target_resolution if not set                 │
│     formula: now + (SLA × step_weight_percentage)               │
└──────────────────────────┬──────────────────────────────────────┘
                           │
                           ▼
┌─────────────────────────────────────────────────────────────────┐
│  assign_users_for_step()                                        │
│  ✓ Fetch users for role (round-robin)                           │
│  ✓ Apply round-robin assignment                                 │
└──────────────────────────┬──────────────────────────────────────┘
                           │
                           ▼
┌─────────────────────────────────────────────────────────────────┐
│  apply_round_robin_assignment()                                 │
│  🎯 Calculate target_resolution for this assignment             │
│  ✓ Create TaskItem with target_resolution                       │
│  ✓ Send notification                                            │
└──────────────────────────┬──────────────────────────────────────┘
                           │
                           ▼
┌─────────────────────────────────────────────────────────────────┐
│               TASK & TASKITEM CREATED                           │
│  ✓ task.target_resolution = calculated datetime                 │
│  ✓ taskitem.target_resolution = calculated datetime             │
└─────────────────────────────────────────────────────────────────┘
```

## Data Model Changes

### WorkflowTicket
```
┌────────────────────────────┐
│   WorkflowTicket           │
├────────────────────────────┤
│ ticket_number              │
│ ticket_data (JSON)         │
│ is_task_allocated          │
│ created_at                 │
│ updated_at                 │
│ ticket_id                  │
│ original_ticket_id         │
│ source_service             │
│ status                     │
│ department                 │
│ priority ✨ NEW            │  ← Added field
│ (Low, Medium, High, Critical)
└────────────────────────────┘
```

### Task
```
┌────────────────────────────┐
│   Task                     │
├────────────────────────────┤
│ task_id                    │
│ ticket_id (FK)             │
│ workflow_id (FK)           │
│ current_step (FK)          │
│ status                     │
│ created_at                 │
│ updated_at                 │
│ fetched_at                 │
│ target_resolution ⭐       │  ← Auto-calculated
│ resolution_time            │
└────────────────────────────┘
```

### TaskItem
```
┌────────────────────────────┐
│   TaskItem                 │
├────────────────────────────┤
│ task_item_id               │
│ task (FK)                  │
│ user_id                    │
│ username                   │
│ email                      │
│ name                       │
│ status                     │
│ role                       │
│ assigned_on                │
│ status_updated_on          │
│ target_resolution ⭐       │  ← Set on assignment
│ resolution_time            │
│ acted_on                   │
│ acted_on_step (FK)         │
└────────────────────────────┘
```

## Target Resolution Calculation

```
┌─────────────────────────────────────────────────────┐
│   Target Resolution Calculation Engine              │
│   (task/utils/target_resolution.py)                 │
├─────────────────────────────────────────────────────┤
│                                                     │
│  get_sla_for_priority(workflow, priority)           │
│  └─→ Returns: timedelta                             │
│      Examples:                                      │
│      • Low: 30 days                                 │
│      • Medium: 14 days                              │
│      • High: 3 days                                 │
│      • Critical: 4 hours                            │
│                                                     │
│  calculate_step_weight_percentage(step, workflow)   │
│  └─→ Returns: float (0-1)                           │
│      Example: step.weight=2.0 / total=10 = 0.20    │
│                                                     │
│  calculate_target_resolution(ticket, step, wf)     │
│  └─→ Formula:                                       │
│      target = now + (SLA × step_percentage)        │
│                                                     │
│  calculate_step_sla_summary(workflow)               │
│  └─→ Returns: dict of SLA allocations per step     │
│                                                     │
└─────────────────────────────────────────────────────┘
```

## Example: 3-Step Workflow

```
Workflow Configuration:
  high_sla = 8 hours
  Step 1 (Review):      weight=2.0
  Step 2 (Processing):  weight=2.0
  Step 3 (Approval):    weight=1.0
  Total weight: 5.0

Incoming High-Priority Ticket:
  priority = "High"
  → SLA = 8 hours (from workflow)

For Step 1 (Review):
  percentage = 2.0 / 5.0 = 40%
  allocation = 8h × 0.40 = 3.2h
  target_resolution = now + 3h 12m ⏰

For Step 2 (Processing):
  percentage = 2.0 / 5.0 = 40%
  allocation = 8h × 0.40 = 3.2h
  target_resolution = now + 3h 12m ⏰

For Step 3 (Approval):
  percentage = 1.0 / 5.0 = 20%
  allocation = 8h × 0.20 = 1.6h
  target_resolution = now + 1h 36m ⏰
```

## Integration Points

```
┌─────────────────┐
│  Auth Service   │  (provides user info)
└────────┬────────┘
         │
         ▼
┌─────────────────────────────────────────┐
│   Task Assignment Module                │
│   (task/utils/assignment.py)            │
├─────────────────────────────────────────┤
│ ✓ Fetch users (round-robin)             │
│ ✓ Calculate target_resolution ⭐        │
│ ✓ Create TaskItem                       │
│ ✓ Send notifications                    │
└────────┬────────────────────────────────┘
         │
         ├──────────────────────────┐
         │                          │
         ▼                          ▼
┌────────────────┐        ┌────────────────┐
│  Task Model    │        │  TaskItem      │
│  (stores both) │        │  (stores both) │
└────────────────┘        └────────────────┘
         │                          │
         └──────────┬───────────────┘
                    │
                    ▼
         ┌──────────────────────┐
         │  Frontend / Reports  │
         │  Display deadlines   │
         └──────────────────────┘
```

## Configuration Checklist

- [ ] Migrate database: `python manage.py migrate tickets`
- [ ] Configure Workflow SLA per priority
- [ ] Set Step weights (should represent relative importance)
- [ ] Update Ticket Service to send priority in ticket_data
- [ ] Test: Create ticket with priority → Check target_resolution is calculated
- [ ] Monitor: Check logs for calculation warnings/errors

## Key Features

✅ **Automatic Calculation** - No manual intervention needed
✅ **Flexible Weighting** - Customize step importance
✅ **Priority-Based** - Different SLAs per priority
✅ **Graceful Degradation** - Works even with missing SLA
✅ **Audit Trail** - Logged at every step
✅ **Per-User Deadline** - Each assignment gets its own target
✅ **Workflow-Agnostic** - Works with any workflow structure

## Performance Considerations

- SLA lookup: O(1) - direct field access
- Weight calculation: O(n) - where n = steps in workflow
- Total calculation: ~1-2ms per assignment
- No blocking operations
- Suitable for high-volume ticket processing
