# Target Resolution - Test Scenarios

## Setup for Testing

```python
from datetime import timedelta, datetime
from django.utils import timezone
from workflow.models import Workflows
from step.models import Steps
from tickets.models import WorkflowTicket
from task.models import Task, TaskItem
from task.utils.target_resolution import (
    calculate_target_resolution,
    calculate_step_sla_summary,
    calculate_step_weight_percentage
)

# Create test workflow with SLA configuration
workflow = Workflows.objects.create(
    user_id=1,
    name="Test Support Workflow",
    category="Support",
    sub_category="Technical",
    department="IT",
    low_sla=timedelta(days=30),
    medium_sla=timedelta(days=14),
    high_sla=timedelta(days=3),
    urgent_sla=timedelta(hours=4),
    is_published=True,
    status='initialized'
)

# Create workflow steps with weights
step1 = Steps.objects.create(
    workflow_id=workflow,
    role_id=role_analyst,  # Assuming role exists
    name="Initial Analysis",
    order=1,
    weight=1.5
)

step2 = Steps.objects.create(
    workflow_id=workflow,
    role_id=role_admin,
    name="Review & Approval",
    order=2,
    weight=1.0
)

step3 = Steps.objects.create(
    workflow_id=workflow,
    role_id=role_admin,
    name="Implementation",
    order=3,
    weight=2.0
)
# Total weight: 4.5
```

## Test Scenario 1: Low Priority Ticket

```python
# Setup
ticket_data = {
    "ticket_number": "TK-LOW-001",
    "priority": "Low",
    "subject": "Update documentation",
    "department": "IT",
    "category": "Support"
}

ticket = WorkflowTicket.objects.create(
    ticket_number="TK-LOW-001",
    ticket_data=ticket_data,
    priority="Low"
)

task = Task.objects.create(
    ticket_id=ticket,
    workflow_id=workflow,
    current_step=step1,
    status='pending'
)

# Expected Result
# ✓ task.target_resolution = now + (30 days × 33.3%) = now + 10 days
print(f"Low Priority Task Target: {task.target_resolution}")
assert task.target_resolution is not None
assert (task.target_resolution - timezone.now()).days == 10
```

## Test Scenario 2: High Priority Ticket

```python
# Setup
ticket_data = {
    "ticket_number": "TK-HIGH-001",
    "priority": "High",
    "subject": "Database connection issue",
    "department": "IT",
    "category": "Incident"
}

ticket = WorkflowTicket.objects.create(
    ticket_number="TK-HIGH-001",
    ticket_data=ticket_data,
    priority="High"
)

task = Task.objects.create(
    ticket_id=ticket,
    workflow_id=workflow,
    current_step=step1,  # Initial Analysis
    status='pending'
)

# Expected Result for Step 1 (Analysis)
# ✓ SLA: 3 days (72 hours)
# ✓ Step weight: 1.5 / 4.5 = 33.3%
# ✓ target = now + (72h × 0.333) = now + 24 hours
print(f"High Priority Step 1 Target: {task.target_resolution}")
assert task.target_resolution is not None

# Move to next step
task.current_step = step2  # Review & Approval
task.save()

# Expected Result for Step 2 (Review)
# ✓ SLA: 3 days (72 hours)
# ✓ Step weight: 1.0 / 4.5 = 22.2%
# ✓ target = now + (72h × 0.222) = now + 16 hours
print(f"High Priority Step 2 Target: {task.target_resolution}")
```

## Test Scenario 3: Critical Priority Ticket

```python
# Setup
ticket_data = {
    "ticket_number": "TK-CRIT-001",
    "priority": "Critical",
    "subject": "Production system down",
    "department": "IT",
    "category": "Emergency"
}

ticket = WorkflowTicket.objects.create(
    ticket_number="TK-CRIT-001",
    ticket_data=ticket_data,
    priority="Critical"
)

task = Task.objects.create(
    ticket_id=ticket,
    workflow_id=workflow,
    current_step=step1,
    status='pending'
)

# Expected Result
# ✓ SLA: 4 hours (urgent)
# ✓ Step weight: 1.5 / 4.5 = 33.3%
# ✓ target = now + (4h × 0.333) = now + 1.33 hours ≈ 80 minutes
print(f"Critical Priority Task Target: {task.target_resolution}")
assert task.target_resolution is not None
time_diff = (task.target_resolution - timezone.now()).total_seconds() / 3600
assert 1.2 < time_diff < 1.4  # Approximately 1.33 hours
```

## Test Scenario 4: TaskItem Assignment

```python
from task.utils.assignment import apply_round_robin_assignment

# Setup
ticket_data = {
    "ticket_number": "TK-ASSIGN-001",
    "priority": "Medium",
    "subject": "Test assignment",
    "department": "IT",
    "category": "Request"
}

ticket = WorkflowTicket.objects.create(
    ticket_number="TK-ASSIGN-001",
    ticket_data=ticket_data,
    priority="Medium"
)

task = Task.objects.create(
    ticket_id=ticket,
    workflow_id=workflow,
    current_step=step1,
    status='pending'
)

# Assign users
user_ids = [1, 2, 3]
assigned_items = apply_round_robin_assignment(
    task=task,
    user_ids=user_ids,
    role_name="Analyst",
    max_assignments=1
)

# Expected Result
# ✓ TaskItem created with target_resolution
# ✓ target = now + (14 days × 0.333) = now + 4.67 days
print(f"TaskItem Target: {assigned_items[0].target_resolution}")
assert assigned_items[0].target_resolution is not None
task_item = TaskItem.objects.get(task_item_id=assigned_items[0].task_item_id)
print(f"Stored Target: {task_item.target_resolution}")
```

## Test Scenario 5: SLA Summary

```python
# Get detailed breakdown of SLA allocations
summary = calculate_step_sla_summary(workflow)

# Expected Structure
# {
#     'Low': [
#         {
#             'step_id': 1,
#             'step_name': 'Initial Analysis',
#             'weight': 1.5,
#             'percentage': 0.333,
#             'allocation': timedelta(days=10)
#         },
#         ...
#     ],
#     'Medium': [...],
#     'High': [...],
#     'Critical': [...]
# }

for priority, steps in summary.items():
    print(f"\n{priority} Priority SLA Allocation:")
    total_allocation = timedelta(0)
    for step in steps:
        print(f"  {step['step_name']}: {step['allocation']}")
        total_allocation += step['allocation']
    print(f"  Total: {total_allocation}")
```

## Test Scenario 6: Step Weight Percentage

```python
# Calculate individual step percentages
for step in [step1, step2, step3]:
    percentage = calculate_step_weight_percentage(step, workflow)
    print(f"{step.name}: {percentage:.2%}")

# Expected Output
# Initial Analysis: 33.33%
# Review & Approval: 22.22%
# Implementation: 44.44%
```

## Test Scenario 7: Missing SLA Configuration

```python
# Create workflow without SLA
minimal_workflow = Workflows.objects.create(
    user_id=1,
    name="No SLA Workflow",
    category="Other",
    sub_category="Misc",
    department="General",
    is_published=True,
    status='initialized'
)

step = Steps.objects.create(
    workflow_id=minimal_workflow,
    role_id=role_analyst,
    name="Process",
    order=1,
    weight=1.0
)

ticket = WorkflowTicket.objects.create(
    ticket_number="TK-NOSLA-001",
    ticket_data={"priority": "High"},
    priority="High"
)

task = Task.objects.create(
    ticket_id=ticket,
    workflow_id=minimal_workflow,
    current_step=step,
    status='pending'
)

# Expected Result
# ✓ target_resolution = None (graceful degradation)
# ✓ Warning logged: "No SLA configured for priority 'High'"
# ✓ Task still created successfully
print(f"No SLA Task Target: {task.target_resolution}")
assert task.target_resolution is None
```

## Test Scenario 8: Zero Step Weights

```python
# Create workflow with all weight = 0
zero_workflow = Workflows.objects.create(
    user_id=1,
    name="Zero Weight Workflow",
    category="Other",
    sub_category="Test",
    department="General",
    medium_sla=timedelta(days=7),
    is_published=True,
    status='initialized'
)

step_a = Steps.objects.create(
    workflow_id=zero_workflow,
    role_id=role_analyst,
    name="Step A",
    order=1,
    weight=0.0
)

step_b = Steps.objects.create(
    workflow_id=zero_workflow,
    role_id=role_analyst,
    name="Step B",
    order=2,
    weight=0.0
)

ticket = WorkflowTicket.objects.create(
    ticket_number="TK-ZERO-001",
    ticket_data={"priority": "Medium"},
    priority="Medium"
)

task = Task.objects.create(
    ticket_id=ticket,
    workflow_id=zero_workflow,
    current_step=step_a,
    status='pending'
)

# Expected Result
# ✓ Equal distribution: each step gets 50% of SLA
# ✓ target = now + (7 days × 0.5) = now + 3.5 days
print(f"Zero Weight Task Target: {task.target_resolution}")
assert task.target_resolution is not None
```

## Test Scenario 9: Unknown Priority

```python
# Ticket with invalid priority
ticket = WorkflowTicket.objects.create(
    ticket_number="TK-UNKNOWN-001",
    ticket_data={"priority": "SuperUrgent"},
    priority="SuperUrgent"  # Not in choices
)

task = Task.objects.create(
    ticket_id=ticket,
    workflow_id=workflow,
    current_step=step1,
    status='pending'
)

# Expected Result
# ✓ target_resolution = None (graceful degradation)
# ✓ Warning logged: "Unknown priority level: SuperUrgent"
# ✓ Task still created
print(f"Unknown Priority Task Target: {task.target_resolution}")
assert task.target_resolution is None
```

## Assertion Tests

```python
def test_target_resolution_calculation():
    """Comprehensive test suite"""
    
    # Test 1: Priority mapping works
    from task.utils.target_resolution import get_sla_for_priority
    sla = get_sla_for_priority(workflow, 'High')
    assert sla == timedelta(days=3)
    
    # Test 2: Step weight percentage calculation
    percentage = calculate_step_weight_percentage(step1, workflow)
    assert 0.3 < percentage < 0.4  # ~33.3%
    
    # Test 3: Target resolution is datetime
    ticket = WorkflowTicket.objects.create(
        ticket_number="TK-TEST-1",
        ticket_data={"priority": "High"},
        priority="High"
    )
    task = Task.objects.create(
        ticket_id=ticket,
        workflow_id=workflow,
        current_step=step1,
        status='pending'
    )
    assert isinstance(task.target_resolution, datetime)
    assert task.target_resolution > timezone.now()
    
    # Test 4: TaskItem inherits target resolution
    items = apply_round_robin_assignment(task, [1, 2], "Analyst")
    assert items[0].target_resolution == task.target_resolution
    
    print("✅ All tests passed!")

test_target_resolution_calculation()
```

## Running Tests

```bash
# Run all tests
cd workflow_api
python manage.py test

# Run specific test
python manage.py test task.tests.test_target_resolution

# Run with verbose output
python manage.py test -v 2

# Check migrations
python manage.py migrate tickets --dry-run
```
