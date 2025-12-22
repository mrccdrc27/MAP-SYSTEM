# Workflow API Test Index

This document provides a comprehensive index of all available tests in the `workflow_api` service, organized by test type and module. It serves as a quick reference for running specific tests or understanding the test coverage.

## Test Directory Structure

```
tests/
├─ unit/
│  ├─ task/
│  │  ├─ test_models.py       # Unit tests for Task and TaskItem models
│  │  └─ test_utils.py        # Unit tests for Task utility functions (assignment, SLA)
│  ├─ workflow/
│  │  └─ test_workflow_versioning.py # Unit tests for workflow versioning logic
│  ├─ tickets/
│  │  └─ test_tickets.py      # Unit tests for ticket ingestion and task creation
│  └─ __init__.py
├─ integration/
│  ├─ test_task_transitions.py # Integration tests for task state machine
│  └─ __init__.py
├─ __init__.py
└─ README.md
```

## Test Commands Index

### Unit Tests

| Module | Description | Test Class | Command |
| :--- | :--- | :--- | :--- |
| **Task Models** | Tests core `Task` and `TaskItem` model functionality (creation, status choices, basic methods). | `TaskModelTests`, `TaskItemModelTests` | `python manage.py test tests.unit.task.test_models` |
| **Task Utils** | Tests utility logic for round-robin assignment, SLA calculations (including zero-weight edge cases), and escalation. | `RoundRobinAssignmentTests`, `SLACalculationTests`, `EscalationLogicTests` | `python manage.py test tests.unit.task.test_utils` |
| **Workflow Versioning** | Tests the workflow versioning lifecycle: creation, immutability, definition integrity, and task linkage. | `WorkflowVersioningTestCase` | `python manage.py test tests.unit.workflow.test_workflow_versioning` |
| **Tickets** | Tests ticket ingestion (`receive_ticket`) and automated task creation (`create_task_for_ticket`). | `ReceiveTicketTests`, `CreateTaskForTicketTests` | `python manage.py test tests.unit.tickets.test_tickets` |

### Integration Tests

| Module | Description | Test Class | Command |
| :--- | :--- | :--- | :--- |
| **Task Transitions** | Tests the full lifecycle of task transitions via API, including permissions, audit trails, and edge cases. | `TaskTransitionTestCase`, `TaskTransitionEdgeCasesTestCase` | `python manage.py test tests.integration.test_task_transitions` |

## Running All Tests

To run the entire test suite (all unit and integration tests):

```bash
w
```

## Running with Coverage

To run all tests and generate a coverage report:

```bash
coverage run --source='.' manage.py test
coverage report
# For HTML report:
# coverage html
```

python manage.py test tests.unit.task.test_models --verbosity=1
python manage.py test tests.unit.task.test_utils --verbosity=1
python manage.py test tests.unit.tickets.test_tickets --verbosity=1
python manage.py test tests.unit.workflow.test_workflow_versioning --verbosity=1
python manage.py test tests.integration.test_task_transitions --verbosity=1
