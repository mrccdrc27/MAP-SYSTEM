# Integration Tests for Task State Machine & Transitions

## Overview

This test suite validates the workflow state machine and task transition functionality as specified in `TESTING_RECOMMENDATIONS.md`.

## Test File

- **Location**: `tests/integration/test_task_transitions.py`
- **Test Classes**: 
  - `TaskTransitionTestCase` - Main integration tests (11 tests)
  - `TaskTransitionEdgeCasesTestCase` - Edge case tests (1 test)

## Running the Tests

```bash
cd workflow_api
python manage.py test tests.integration.test_task_transitions
```

For verbose output:
```bash
python manage.py test tests.integration.test_task_transitions --verbosity=2
```

## Test Coverage

### 1. Valid Transitions ✅
- **test_valid_transition_triage_to_support**: Validates successful transition from one step to another
  - Verifies task moves to correct step
  - Confirms old TaskItem is marked as 'resolved'
  - Ensures new TaskItem is created for next step with 'new' status
  - Validates notes are stored correctly

### 2. Invalid Transitions ✅
- **test_invalid_transition_skip_steps**: Validates that users cannot skip steps
  - Attempts to jump from Triage directly to Finalize
  - Expects 400 Bad Request error
  - Confirms task state remains unchanged

### 3. Permission Checks ✅
- **test_permission_check_unauthorized_user**: Users not assigned to task cannot transition
  - User without TaskItem assignment attempts transition
  - Expects 403 Forbidden error
  
- **test_permission_check_user_already_acted**: Users who already acted cannot act again
  - User with 'resolved' status attempts another transition
  - Expects 403 Forbidden error

### 4. Complete Workflow Sequence ✅
- **test_complete_workflow_sequence**: Full workflow from start to finish
  - Triage user transitions to Support step
  - Support user transitions to Finalize step
  - Validates complete audit trail with all history records

### 5. Input Validation ✅
- **test_transition_with_missing_notes**: Validates notes field is required
  - Expects 400 Bad Request when notes are missing
  
- **test_transition_with_empty_notes**: Validates notes cannot be whitespace only
  - Expects 400 Bad Request for empty/whitespace notes

### 6. Error Handling ✅
- **test_transition_nonexistent_task**: Validates handling of invalid task ID
  - Expects 404 Not Found
  
- **test_transition_nonexistent_transition**: Validates handling of invalid transition ID
  - Expects 404 Not Found

### 7. Audit Trail Integrity ✅
- **test_audit_trail_integrity**: Validates TaskItemHistory maintains complete audit trail
  - Confirms history records are created for status changes
  - Verifies status progression ('new' → 'resolved')
  - Validates timestamps are sequential

### 8. Edge Cases ✅
- **test_task_without_workflow_version**: Task without workflow_version reference
  - Validates optional workflow_version field
  
- **test_task_without_current_step**: Task without current_step set
  - Identifies bug in transitions.py (line 261) where AttributeError occurs
  - Documents expected behavior with TODO comment

## Test Implementation Details

### Mocking Strategy
- **Celery Tasks**: Mocked using `@patch('task.utils.assignment.notify_task.delay')` to avoid RabbitMQ dependency
- **Settings Override**: Uses `@override_settings` to enable `CELERY_TASK_ALWAYS_EAGER` for synchronous task execution

### Authentication
- Custom mock user objects with required `user_id` and `is_authenticated` attributes
- Uses `client.force_authenticate()` for test authentication

### Data Setup
- Creates complete workflow structure (Workflow → Steps → Transitions → WorkflowVersion)
- Creates role-based users with RoleUsers assignments
- Creates tickets and tasks with proper foreign key relationships
- Initializes TaskItems with TaskItemHistory for audit trail

## Test Results

```
Ran 12 tests in 0.395s

OK
```

**All tests passing! ✅**

## Known Issues

1. **transitions.py Line 261**: AttributeError when task.current_step is None
   - **Location**: `task/transitions.py` in terminal transition handling
   - **Impact**: Server crashes instead of returning proper error response
   - **Recommendation**: Add null check before accessing `task.current_step.step_id`
   - **Test**: `test_task_without_current_step` documents this issue

## Dependencies

- Django test framework
- Django REST Framework test client
- unittest.mock for Celery mocking
- PostgreSQL (test database uses in-memory SQLite)

## Related Documentation

- [TESTING_RECOMMENDATIONS.md](../../TESTING_RECOMMENDATIONS.md) - Testing strategy
- [WORKFLOW_API_ARCHITECTURE.md](../../WORKFLOW_API_ARCHITECTURE.md) - System architecture
- [task/transitions.py](../../task/transitions.py) - Implementation being tested
