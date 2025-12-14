# Test Verbosity Guide

This guide explains how to control test output verbosity using Django's `--verbosity` flag.

## Output Format

Each test is logged in a single-line format:
```
TEST_NUMBER. test_method_name - STATUS
```

Example:
```
1. test_task_creation - ✅ PASS
2. test_task_status_choices - ✅ PASS
10. test_task_item_history_creation - ✅ PASS
```

## Verbosity Levels

### Level 0: Silent
**Only shows final test results**
```bash
python manage.py test tests.unit.task.test_models --verbosity=0
```
- No test case headers
- No workflow initialization logs
- Only final summary (X tests passed/failed)
- Best for CI/CD pipelines

### Level 1: Minimal (Default)
**Shows test names and pass/fail status only**
```bash
python manage.py test tests.unit.task.test_models --verbosity=1
# or simply:
python manage.py test tests.unit.task.test_models
```
- Single-line test results: `N. test_name - ✅ PASS`
- Suppresses workflow initialization logs
- Suppresses SLA calculation logs
- Clean output for quick test validation
- **Best for local development**

### Level 2: Normal
**Shows warnings and errors**
```bash
python manage.py test tests.unit.task.test_models --verbosity=2
```
- Single-line test results with inline warnings
- Warning messages (failed initialization checks)
- Error messages displayed
- More detailed step output
- Best for debugging test failures

### Level 3: Verbose
**Shows everything including debug logs**
```bash
python manage.py test tests.unit.task.test_models --verbosity=3
```
- All content from Level 2
- Workflow initialization step-by-step
- SLA calculations
- Database queries (if DEBUG=True)
- Signal triggers
- **Best for deep debugging**

## Quick Reference

| Verbosity | Command | Output | Use Case |
|-----------|---------|--------|----------|
| 0 | `--verbosity=0` | Final results only | CI/CD |
| 1 | `--verbosity=1` | Test numbers + names + status | Local dev |
| 2 | `--verbosity=2` | + warnings/errors | Debugging |
| 3 | `--verbosity=3` | Everything | Deep debugging |

## Examples

**Quick test with clean output:**
```bash
python manage.py test tests.unit.task.test_models
# Output:
# 1. test_task_creation - ✅ PASS
# 2. test_task_status_choices - ✅ PASS
# ...
# 10. test_task_item_history_creation - ✅ PASS
```

**Run specific test with full debug:**
```bash
python manage.py test tests.unit.task.test_models.TaskModelTests.test_task_creation --verbosity=3
```

**Run all unit tests silently:**
```bash
python manage.py test tests.unit --verbosity=0
```

**Check for warnings:**
```bash
python manage.py test tests.integration --verbosity=2
```

## Test Result Symbols

- ✅ PASS - Test passed successfully
- ❌ FAIL - Test failed (assertion error or exception)

## Configuration

The verbosity behavior is controlled by the custom test runner in:
```
workflow_api/workflow_api/test_runner.py
```

Logging levels are automatically adjusted based on the `--verbosity` flag:
- Verbosity 0: `logging.CRITICAL`
- Verbosity 1: `logging.ERROR` (except test results)
- Verbosity 2: `logging.WARNING`
- Verbosity 3: `logging.DEBUG`

