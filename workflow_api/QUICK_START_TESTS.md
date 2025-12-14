# 🚀 Quick Start: Running Tests

## TL;DR - Get Started in 30 Seconds

```bash
cd workflow_api
python manage.py test tests
```

Done! All 32 tests will run.

---

## Common Commands

### Run Everything
```bash
python manage.py test tests                          # All tests
python manage.py test tests -v 2                     # With verbose output
python manage.py test tests --keepdb                 # Keep test DB after
python manage.py test tests --failfast               # Stop on first failure
```

### Run Specific Tests
```bash
# Test Category
python manage.py test tests.unit.task.test_models    # Model tests only
python manage.py test tests.unit.task.test_utils     # Utils tests only

# Test Class
python manage.py test tests.unit.task.test_utils.RoundRobinAssignmentTests
python manage.py test tests.unit.task.test_utils.SLACalculationTests
python manage.py test tests.unit.task.test_utils.EscalationLogicTests

# Single Test
python manage.py test tests.unit.task.test_models.TaskModelTests.test_task_creation
```

### With Coverage Report
```bash
pip install coverage
coverage run --source='.' manage.py test tests
coverage report                                    # Console report
coverage html                                      # HTML report in htmlcov/
```

---

## Using Test Runner Script

```bash
chmod +x run_tests.sh

./run_tests.sh              # All tests
./run_tests.sh models       # Model tests
./run_tests.sh utils        # Utils tests
./run_tests.sh assignment   # Round-robin tests
./run_tests.sh sla          # SLA tests
./run_tests.sh escalation   # Escalation tests
./run_tests.sh coverage     # With coverage report
./run_tests.sh quick        # Quick model tests only
```

---

## What Gets Tested?

### ✅ Model Tests (15 tests)
- Task creation and lifecycle
- TaskItem assignments
- Status transitions
- Owner assignments
- History tracking

### ✅ Assignment Tests (7 tests)
- Round-robin user selection
- Active/inactive filtering
- Multi-user rotation
- Edge cases (0, 1, many users)

### ✅ SLA Tests (9 tests)
- Priority-based SLA retrieval
- Step weight calculations
- Target resolution timing
- Cross-step allocations

### ✅ Escalation Tests (7 tests)
- Role escalation configuration
- SLA breach detection
- Multi-level escalation chains
- Notification triggering

---

## Expected Output

```
$ python manage.py test tests
Creating test database...
System check identified no issues (0 silenced).
.................................                                     (32 tests)
----------------------------------------------------------------------
Ran 32 tests in 0.654s

OK
```

---

## Debugging Failed Tests

```bash
# Run with verbose output to see details
python manage.py test tests -v 2

# Stop on first failure
python manage.py test tests --failfast

# Run specific failing test
python manage.py test tests.unit.task.test_models.TaskModelTests.test_task_creation -v 2

# Check test output
python manage.py test tests 2>&1 | tee test_output.log
```

---

## Test Files Location

```
workflow_api/
├── tests/
│   ├── __init__.py
│   ├── README.md                                    ← Read for details
│   ├── unit/
│   │   └── task/
│   │       ├── test_models.py                       ← 15 tests
│   │       └── test_utils.py                        ← 17 tests
│   └── integration/                                 ← Future tests
├── TESTS_INDEX.md                                   ← Complete reference
├── TESTS_IMPLEMENTATION_SUMMARY.md                  ← Implementation details
├── TESTS_COMPLETION_REPORT.md                       ← Full report
├── run_tests.sh                                     ← Test runner script
└── QUICK_START_TESTS.md                             ← This file!
```

---

## Documentation Map

- **QUICK_START_TESTS.md** (this file) - Quick commands
- **tests/README.md** - How to run and understand tests
- **TESTS_INDEX.md** - Complete test reference
- **TESTS_IMPLEMENTATION_SUMMARY.md** - What was built
- **TESTS_COMPLETION_REPORT.md** - Final report

---

## Getting Help

### View all test commands
```bash
python manage.py test --help
```

### List all available tests
```bash
python manage.py test tests --help
```

### Run with Python debugger
```bash
python -m pdb manage.py test tests.unit.task.test_models.TaskModelTests.test_task_creation
```

---

## Tips & Tricks

### Faster Testing
```bash
# Keep database between runs
python manage.py test tests --keepdb

# Run in parallel (if supported)
python manage.py test tests --parallel

# Quiet mode (less output)
python manage.py test tests -q
```

### Coverage Only
```bash
coverage run --source='.' manage.py test tests --quiet
coverage report --skip-covered
```

### Pretty Output
```bash
python manage.py test tests --verbosity 2 --no-header
```

---

## Common Issues

### ❌ "ModuleNotFoundError: No module named 'tests'"
**Solution:** Make sure you're in the `workflow_api` directory:
```bash
cd /path/to/Ticket-Tracking-System/workflow_api
```

### ❌ "AttributeError: module 'tests' has no attribute..."
**Solution:** Ensure all `__init__.py` files exist in test directories:
```bash
find tests -type d -exec touch {}/__init__.py \;
```

### ❌ Tests timeout
**Solution:** Add timeout and increase verbosity:
```bash
python manage.py test tests --timeout=60 -v 2
```

---

## Next Steps

1. ✅ Run tests: `python manage.py test tests`
2. 📖 Read docs: See `tests/README.md`
3. 📊 Check coverage: `coverage run --source='.' manage.py test tests && coverage html`
4. ✏️ Add new tests: Follow patterns in test files

---

**Happy testing! 🎉**
