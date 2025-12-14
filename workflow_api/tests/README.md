# Workflow API Test Structure

This directory contains comprehensive tests for the `workflow_api` service, organized by test type and module.

## Directory Structure

```
tests/
├─ unit/
│  ├─ task/
│  │  ├─ test_models.py       # Task and TaskItem model tests
│  │  └─ test_utils.py        # Task utility function tests
│  └─ __init__.py
├─ integration/
│  └─ __init__.py
├─ __init__.py
└─ README.md
```

## Running Tests

### Run All Tests
```bash
python manage.py test
```

### Run Tests for Specific Module
```bash
# Run only task unit tests
python manage.py test tests.unit.task.test_models
python manage.py test tests.unit.task.test_utils
```

### Run with Verbose Output
```bash
python manage.py test tests.unit.task -v 2
```

### Run with Coverage
```bash
coverage run --source='.' manage.py test
coverage report
coverage html  # Generate HTML coverage report
```

---

## Test Categories

### Unit Tests - Task Models (`tests/unit/task/test_models.py`)

Tests for the core Task and TaskItem model functionality:

- **TaskModelTests**
  - `test_task_creation`: Verify basic task creation with required fields
  - `test_task_status_choices`: Ensure task respects defined status options
  - `test_task_target_resolution_calculation`: Test SLA target time assignment
  - `test_task_ticket_owner_assignment`: Verify ticket owner (Coordinator) assignment
  - `test_task_get_assigned_users`: Test retrieval of assigned users
  - `test_task_completion_workflow`: Test complete task lifecycle

- **TaskItemModelTests**
  - `test_task_item_creation`: Verify TaskItem creation with role assignment
  - `test_task_item_status_transitions`: Test valid status changes
  - `test_task_item_origin_tracking`: Verify origin tracking (System/Transferred/Escalation)
  - `test_task_item_history_creation`: Test audit trail creation

### Unit Tests - Task Utilities (`tests/unit/task/test_utils.py`)

Comprehensive tests for assignment, SLA, and escalation logic:

#### Round-Robin Assignment Tests (`RoundRobinAssignmentTests`)
- `test_fetch_active_users_for_role`: Verify active user retrieval for a role
- `test_fetch_users_excludes_inactive`: Confirm inactive users are excluded
- `test_fetch_users_nonexistent_role`: Handle non-existent role gracefully
- `test_round_robin_sequential_assignment`: Verify sequential user assignment
- `test_round_robin_state_persistence`: Confirm round-robin state persists
- `test_no_available_users`: Handle edge case when no users are available
- `test_single_user_assignment`: Handle single-user scenarios

#### SLA Calculation Tests (`SLACalculationTests`)
- `test_get_sla_for_low_priority`: Verify Low priority SLA retrieval (24 hours)
- `test_get_sla_for_medium_priority`: Verify Medium priority SLA (12 hours)
- `test_get_sla_for_high_priority`: Verify High priority SLA (4 hours)
- `test_get_sla_for_critical_priority`: Verify Critical/Urgent priority SLA (1 hour)
- `test_get_sla_for_unknown_priority`: Handle unknown priority gracefully
- `test_step_weight_percentage_calculation`: Verify step weight percentage math
- `test_target_resolution_for_high_priority`: Calculate target for high priority ticket
- `test_target_resolution_for_low_priority`: Calculate target for low priority ticket
- `test_sla_calculation_across_steps`: Verify allocation across multiple steps

#### Escalation Logic Tests (`EscalationLogicTests`)
- `test_escalate_to_role_configured`: Verify escalation role is set
- `test_create_escalated_task_item`: Create escalation task items
- `test_sla_breach_detection`: Detect when target resolution is breached
- `test_escalation_notification_trigger`: Verify notification on escalation
- `test_multiple_escalations`: Handle multi-level escalation chains
- `test_escalation_respects_weight`: Verify escalation time allocation by weight

---

## Key Test Scenarios

### 1. Round-Robin Assignment
Tests verify that users are assigned tasks in a round-robin fashion:
```
Task 1 → User 1
Task 2 → User 2
Task 3 → User 3
Task 4 → User 1 (wraps around)
```

### 2. SLA Calculation
Tests verify target resolution times based on:
- **Ticket Priority**: Low (24h), Medium (12h), High (4h), Critical (1h)
- **Step Weight**: Each step gets a percentage of total SLA
- **Example**: High priority (4h total) + Step 1 (40% weight) = ~1.6 hours for Step 1

### 3. Escalation Behavior
Tests verify:
- Escalation to configured role when SLA is breached
- Proper tracking of escalation origin (System vs. Escalation)
- Multi-level escalation chains
- Time allocation proportional to step weights

---

## Test Data Structure

Each test class sets up:
- **Roles**: Support Agent, Manager, Director (as needed)
- **Workflows**: With SLAs for all priority levels
- **Steps**: Ordered steps with weights and escalation roles
- **Users**: Multiple active/inactive users in roles
- **Tickets**: Sample tickets with various priorities
- **Tasks**: Initial task state for testing transitions

---

## Writing New Tests

When adding tests, follow these patterns:

### Use Descriptive Test Names
```python
def test_round_robin_sequential_assignment_with_three_users(self):
    """Clear description of what is being tested and expected behavior"""
```

### Set Up Fixtures Properly
```python
def setUp(self):
    # Create all necessary objects
    self.role = Roles.objects.create(...)
    self.workflow = Workflows.objects.create(...)
```

### Use Assertions Effectively
```python
self.assertEqual(actual, expected, msg="descriptive message")
self.assertIn(value, list)
self.assertGreater(value, minimum)
self.assertIsNotNone(value)
```

### Mock External Dependencies
```python
with patch('module.function') as mock_func:
    # test code
    mock_func.assert_called_with(expected_args)
```

---

## Future Test Additions

Based on TEST_RECOMMENDATIONS.md, planned test files:

- `tests/unit/tickets/test_models.py` - Ticket ingestion tests
- `tests/unit/role/test_models.py` - Role sync tests
- `tests/unit/audit/test_models.py` - Audit logging tests
- `tests/integration/test_database.py` - Database integration
- `tests/e2e/test_workflow_end_to_end.py` - Full workflow tests

---

## Dependencies

Tests use:
- `django.test.TestCase`: Base test class with database transaction rollback
- `unittest.mock.patch`: Mocking external dependencies
- Standard Django model factories and assertions

---

## CI/CD Integration

To integrate with CI/CD:
```bash
# Run tests with coverage
python manage.py test --keepdb && coverage report --fail-under=80
```

Update `.github/workflows/` to run tests on pull requests.
