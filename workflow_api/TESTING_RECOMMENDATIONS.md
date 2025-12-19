# Testing Recommendations for Workflow API

Based on the `WORKFLOW_API_ARCHITECTURE.md`, the following testing strategy is recommended to ensure system stability, data integrity, and SLA compliance.

## 1. Unit Tests (Core Business Logic)
Focus on isolating complex logic without database or network dependencies where possible.

### Task Assignment & SLAs
*   **Round-Robin Algorithm (`task.utils.assignment`)**:
    *   **Scenario**: Verify that users in a specific role are assigned tasks sequentially.
    *   **Edge Case**: Test behavior when no users exist for a required role (should raise specific exception or fallback).
    *   **Edge Case**: Test behavior when the "Next User" index is out of bounds (should reset to 0).
*   **SLA Calculation (`task.utils.target_resolution`)**:
    *   **Scenario**: specific Ticket Priority + Step Weight = Correct Due Date.
    *   **Scenario**: Verify weekend/holiday handling (if business hours are implemented).
    *   **Scenario**: Verify `0` weight steps result in immediate or default deadlines.

### Workflow Versioning
*   **Immutability**:
    *   **Scenario**: Create a `Task` linked to `WorkflowVersion` v1. Edit the parent `Workflows` definition. Ensure the active `Task` still references the logic/graph of v1, not the new edits.
    *   **Scenario**: Verify `WorkflowVersion.definition` JSON is correctly frozen upon initialization.

## 2. Integration Tests (Component Interaction)
Focus on the flow of data between Django apps and the database state.

### Ticket Ingestion Pipeline
*   **Ingestion to Task**:
    *   **Test**: Call `tickets.tasks.receive_ticket` with a sample JSON payload.
    *   **Assertions**:
        1.  `WorkflowTicket` is created with correct `ticket_data` snapshot.
        2.  A `Task` is automatically created.
        3.  The `Task` is linked to the correct `WorkflowVersion` based on Department/Category.
        4.  The first `TaskItem` is assigned to a valid user.

### State Machine & Transitions (`TaskTransitionView`)
*   **Valid Transition**:
    *   **Test**: specific User POSTs to transition from "Triage" to "In Progress".
    *   **Assertions**:
        1.  `Task.current_step` updates.
        2.  Old `TaskItem` is marked `RESOLVED`.
        3.  New `TaskItem` is created for the next step's role.
        4.  `TaskItemHistory` is populated.
*   **Invalid Transition**:
    *   **Test**: Attempt to move from "Triage" to "Finalize" (skipping steps).
    *   **Assertions**: Return 400 Bad Request; Database state unchanged.
*   **Permission Check**:
    *   **Test**: User without the required Role for the *current* step attempts a transition.
    *   **Assertions**: Return 403 Forbidden.

### Audit Logging
*   **Decorator Verification**:
    *   **Test**: Perform a sensitive action (e.g., Force Complete Task).
    *   **Assertions**: Verify a record exists in the `Audit` app with the correct Actor, Action, and `old_value`/`new_value` JSON diffs.

## 3. Asynchronous & Celery Tests
Focus on producers and consumers.

*   **Role Synchronization (Consumer)**:
    *   **Test**: Invoke the `tts.role.sync` task with a mock payload from the Auth Service.
    *   **Assertions**: Verify local `Role` and `RoleUsers` tables are updated/created.
*   **Notification Emission (Producer)**:
    *   **Test**: Complete a task transition.
    *   **Assertions**: Mock the Celery app and verify `send_task` was called for the `INAPP_NOTIFICATION_QUEUE` with the correct message body.

## 4. API & Security Tests (E2E)
Focus on HTTP contracts and Authentication.

*   **Authentication**:
    *   **Test**: Access protected endpoints without a cookie. (Expect 401).
    *   **Test**: Access with an expired JWT. (Expect 401).
*   **Reporting Endpoints**:
    *   **Test**: Verify aggregation queries (SLA Compliance, Team Performance) return correct stats based on a seeded dataset.
*   **OpenAPI Schema**:
    *   **Test**: Run `drf-spectacular` schema generation check to ensure no generation errors (prevents broken documentation).

## 5. Recommended Test Stack
*   **Runner**: `pytest-django` (faster and more plugin-rich than standard Django test runner).
*   **Mocking**: `unittest.mock` for Celery and external API calls.
*   **Factories**: `factory_boy` to generate complex model graphs (Workflow -> Steps -> Roles -> Users) for test setup.
