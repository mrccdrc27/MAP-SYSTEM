# Workflow API Test Structure

This directory contains comprehensive tests for the `workflow_api` service, organized by test type and module.

## Directory Structure

```
tests/
├─ unit/
│  ├─ task/
│  │  ├─ test_models.py       # Task and TaskItem model tests
│  │  └─ test_utils.py        # Task utility function tests
│  ├─ workflow/
│  │  └─ test_workflow_versioning.py # Workflow versioning and lifecycle tests
│  ├─ tickets/
│  │  └─ test_tickets.py      # Ticket ingestion and task creation tests
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

# Run only workflow unit tests
python manage.py test tests.unit.workflow.test_workflow_versioning

# Run only tickets unit tests
python manage.py test tests.unit.tickets.test_tickets
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

### Unit Tests - Workflow Versioning (`tests/unit/workflow/test_workflow_versioning.py`)

Tests for the workflow versioning and lifecycle:

- **WorkflowVersioningTestCase**
  - `test_01_workflow_version_created_on_initialization`: Verify version creation on status 'initialized'
  - `test_02_task_tied_to_workflow_version`: Ensure tasks are linked to active workflow versions
  - `test_03_new_version_on_workflow_modification`: Confirm new version creation on workflow changes
  - `test_04_task_version_immutability`: Verify tasks retain original workflow version
  - `test_05_version_definition_integrity`: Test accurate capture of workflow structure in version definition
  - `test_06_round_robin_assignment`: Test round-robin assignment for tasks
  - `test_07_complete_workflow_lifecycle`: End-to-end test of workflow versioning lifecycle

### Unit Tests - Tickets (`tests/unit/tickets/test_tickets.py`)

Tests for ticket ingestion and task creation:

- **ReceiveTicketTests**
  - `test_receive_ticket_creation`: Verify new WorkflowTicket creation and `create_task_for_ticket` call
  - `test_receive_ticket_update`: Verify existing WorkflowTicket update and `create_task_for_ticket` not called
  - `test_receive_ticket_different_ticket_id_fields`: Test extraction of `ticket_number` from various fields
  - `test_receive_ticket_error_handling`: Test robust error handling during ticket reception

- **CreateTaskForTicketTests**
  - `test_create_task_for_ticket_success`: Verify successful Task creation for valid ticket and workflow
  - `test_create_task_for_ticket_not_found`: Test handling of non-existent `ticket_id`
  - `test_create_task_for_ticket_no_matching_workflow`: Test behavior when no workflow matches the ticket
  - `test_create_task_for_ticket_no_steps_in_workflow`: Test behavior when matched workflow has no steps
  - `test_create_task_for_ticket_no_users_for_role`: Test behavior when no users are found for the first step's role
  - `test_create_task_for_ticket_on_demand_version_creation`: Test on-demand creation of workflow version
  - `test_create_task_for_ticket_general_exception_handling`: Test general exception handling

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
