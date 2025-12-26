# Auth Service API Tests

Comprehensive API test suite for the Centralized Authentication Service.

## 📋 Overview

This test suite covers all major functionality of the Auth Service:

| Module | Description | Test Count |
|--------|-------------|------------|
| `test_login.py` | Login, 2FA/OTP, tokens, logout, lockout | 24 tests |
| `test_profile.py` | Profile CRUD, picture upload, validations | 28 tests |
| `test_email.py` | OTP, password reset, 2FA enable/disable | 29 tests |
| `test_admin.py` | User management, invite agent, permissions | 34 tests |
| **Total** | **All auth service functionality** | **115 tests** |

## ✅ Test Results

All tests pass successfully (verified 2024):

```
====================== 115 passed, 0 failed ======================
```

## 🚀 Quick Start

### Option 1: Run Locally (Recommended)

```bash
# Navigate to auth directory
cd auth

# Install test dependencies
pip install -r testing/api_tests/requirements-test.txt

# Run all tests
python -m pytest testing/api_tests/ -v

# Run with HTML report
python -m pytest testing/api_tests/ --html=testing/api_tests/reports/report.html --self-contained-html

# Run specific module
python -m pytest testing/api_tests/test_login.py -v

# Run with coverage
python -m pytest testing/api_tests/ --cov=users --cov-report=html:testing/api_tests/reports/coverage
```

### Option 2: Use PowerShell Script (Windows)

```powershell
# Navigate to api_tests directory
cd auth/testing/api_tests

# Run with local tests
.\run_local_tests.ps1

# Run specific module
.\run_local_tests.ps1 -Module login

# Generate HTML report
.\run_local_tests.ps1 -Report
```

### Option 3: Run in Docker

```bash
# Navigate to the api_tests directory
cd auth/testing/api_tests

# Run all tests in Docker
docker-compose -f docker-compose.test.yml up --build test-runner
```

## 📁 Directory Structure

```
auth/testing/api_tests/
├── __init__.py              # Package init
├── conftest.py              # Pytest fixtures and configuration
├── pytest.ini               # Pytest settings
├── requirements-test.txt    # Test dependencies
├── run_tests.py             # Main test runner script
├── utils.py                 # Test utilities
│
├── test_login.py            # Login and authentication tests
├── test_profile.py          # User profile tests
├── test_email.py            # Email, OTP, password reset tests
├── test_admin.py            # Admin and user management tests
│
├── docker-compose.test.yml  # Docker test environment
├── Dockerfile.test          # Docker image for tests
├── run_docker_tests.sh      # Bash script for Docker tests
├── run_docker_tests.ps1     # PowerShell script for Docker tests
├── run_local_tests.ps1      # PowerShell script for local tests
│
├── reports/                 # Generated test reports
│   ├── junit_report.xml     # JUnit XML reports
│   ├── report.html          # HTML reports
│   └── coverage/            # Coverage reports
│
└── README.md                # This file
```

## 🧪 Test Categories

### 1. Login Tests (`test_login.py`)

- ✅ Successful login with valid credentials
- ✅ Login fails with wrong password
- ✅ Login fails with non-existent email
- ✅ Login fails with invalid email format
- ✅ Login fails for inactive users
- ✅ Login fails for locked accounts
- ✅ 2FA login flow (OTP required)
- ✅ OTP verification (valid, invalid, expired)
- ✅ Token refresh
- ✅ Token validation
- ✅ Logout
- ✅ Account lockout mechanism

### 2. Profile Tests (`test_profile.py`)

- ✅ Get profile (authenticated)
- ✅ Get profile (unauthenticated - denied)
- ✅ Update username
- ✅ Update phone number
- ✅ Update multiple fields
- ✅ Admin-only field restrictions
- ✅ Duplicate username validation
- ✅ Phone number format validation
- ✅ Profile picture upload
- ✅ Profile picture size limits
- ✅ Invalid file type rejection
- ✅ Profile by company ID
- ✅ Admin updating agent profiles
- ✅ Admin cannot update other admins

### 3. Email Tests (`test_email.py`)

- ✅ Request OTP for 2FA users
- ✅ OTP creates record in database
- ✅ Request OTP with invalid credentials
- ✅ Enable 2FA
- ✅ Disable 2FA with OTP
- ✅ Forgot password (sends email)
- ✅ Forgot password (creates token)
- ✅ Password reset with valid token
- ✅ Password reset with invalid/expired token
- ✅ Password reset token single-use
- ✅ Password change (authenticated)
- ✅ Password change validation
- ✅ OTP expiration handling

### 4. Admin Tests (`test_admin.py`)

- ✅ Get available users to invite
- ✅ Get available systems and roles
- ✅ Invite agent to system
- ✅ Invite agent validation
- ✅ User already assigned handling
- ✅ List users (admin vs regular)
- ✅ Create user (superuser only)
- ✅ Update user (permission checks)
- ✅ Delete user (superuser only)
- ✅ User status management (approve/reject)
- ✅ System role activation/deactivation
- ✅ User registration
- ✅ Registration validations
- ✅ Auto-generated company ID

## 🔧 Configuration

### Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `DJANGO_ENV` | Environment mode | `testing` |
| `DATABASE_URL` | Database connection | SQLite for local |
| `AUTH_SERVICE_URL` | Auth service URL | `http://localhost:8000` |
| `RECAPTCHA_ENABLED` | Enable reCAPTCHA | `False` (for tests) |

### Pytest Markers

Run tests by category using markers:

```bash
# Run only login tests
pytest -m login

# Run security-related tests
pytest -m security

# Run fast tests only (skip slow)
pytest -m "not slow"

# Run integration tests
pytest -m integration
```

## 📊 Reports

### JUnit XML Report

Generated automatically for CI/CD integration:
```
reports/junit_*.xml
```

### HTML Report

Generate a visual HTML report:
```bash
python api_tests/run_tests.py --html
```
View: `reports/report.html`

### Coverage Report

Generate code coverage:
```bash
python api_tests/run_tests.py --coverage
```
View: `reports/coverage_*/index.html`

## ➕ Adding New Tests

### 1. Create a New Test File

```python
# test_new_feature.py
import pytest
from rest_framework import status

@pytest.mark.django_db
class TestNewFeature:
    """Tests for the new feature."""
    
    def test_feature_works(self, authenticated_client):
        """Test that the feature works correctly."""
        response = authenticated_client.get('/api/v1/new-endpoint/')
        assert response.status_code == status.HTTP_200_OK
```

### 2. Use Existing Fixtures

Available fixtures in `conftest.py`:
- `api_client` - Unauthenticated DRF client
- `test_user` - Standard test user
- `test_user_with_2fa` - User with 2FA enabled
- `admin_user` - Admin user
- `superuser` - Superuser
- `authenticated_client` - Authenticated API client
- `admin_authenticated_client` - Admin authenticated client
- `valid_otp` - Valid OTP for 2FA user
- `password_reset_token` - Valid password reset token
- And more...

### 3. Add Custom Fixtures

```python
# In conftest.py
@pytest.fixture
def my_custom_fixture(db, test_user):
    """Create custom test data."""
    # Setup
    yield my_data
    # Cleanup (optional)
```

## 🐛 Debugging Tests

### Run Single Test

```bash
pytest test_login.py::TestLoginAPI::test_login_success_with_valid_credentials -v
```

### Show Print Statements

```bash
pytest -s
```

### Show Local Variables on Failure

```bash
pytest -l
```

### Drop into Debugger on Failure

```bash
pytest --pdb
```

## 🔄 CI/CD Integration

### GitHub Actions Example

```yaml
- name: Run Auth Service Tests
  run: |
    cd auth
    pip install -r requirements.txt
    pip install -r testing/api_tests/requirements-test.txt
    python -m pytest testing/api_tests/ --junitxml=test-results.xml

- name: Upload Test Results
  uses: actions/upload-artifact@v3
  with:
    name: test-results
    path: auth/test-results.xml
```

## 📝 Notes

- Tests use Django's test database (separate from development)
- Email sending is mocked in tests
- reCAPTCHA is disabled for testing
- Each test runs in its own transaction (rolled back after)
- Fixtures are cleaned up automatically by pytest-django
