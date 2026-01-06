# Test Reports Directory

This directory stores generated test reports.

## Report Types

- `junit_*.xml` - JUnit XML reports for CI/CD integration
- `report.html` - HTML visual reports
- `coverage_*/` - Code coverage reports

## Viewing Reports

### HTML Report
Open `report.html` in a web browser.

### Coverage Report
Open `coverage_*/index.html` in a web browser.

### JUnit XML
Import into CI/CD systems like Jenkins, GitHub Actions, etc.

## Generating Reports

```bash
# Generate HTML report
python testing/api_tests/run_tests.py --html

# Generate coverage report
python testing/api_tests/run_tests.py --coverage

# Generate all reports
python testing/api_tests/run_tests.py --html --coverage
```
