---
title: Testing Guide
sidebar_label: Testing
sidebar_position: 4
---

# Testing Guide

The Auth Service includes comprehensive tests at multiple levels: unit tests, integration tests, and end-to-end tests.

## Test Structure

```
auth/
├── testing/
│   ├── api_tests/          # API integration tests
│   │   ├── test_login.py
│   │   ├── test_register.py
│   │   └── test_profile.py
│   ├── e2e/                 # End-to-end scenarios
│   │   └── test_full_flow.py
│   └── end2end/             # Legacy E2E tests
│       └── test_auth_flow.py
├── users/
│   └── tests.py             # User model unit tests
├── hdts/
│   └── tests.py             # HDTS unit tests
├── roles/
│   └── tests.py             # Role unit tests
└── system_roles/
    └── tests.py             # Assignment unit tests
```

## Running Tests

### All Tests

```bash
python manage.py test
```

### Specific App Tests

```bash
# User tests only
python manage.py test users

# HDTS tests only
python manage.py test hdts

# Roles tests
python manage.py test roles
```

### Integration Tests

```bash
python manage.py test auth.testing.api_tests
```

### Verbose Output

```bash
python manage.py test --verbosity=2
```

### Specific Test Class/Method

```bash
# Specific test class
python manage.py test users.tests.UserModelTestCase

# Specific test method
python manage.py test users.tests.UserModelTestCase.test_create_user
```

---

## Test Coverage

### Install Coverage

```bash
pip install coverage
```

### Run with Coverage

```bash
# Run tests with coverage tracking
coverage run manage.py test

# Generate report
coverage report

# Generate HTML report
coverage html
# Open htmlcov/index.html in browser
```

### Coverage Configuration

Create `.coveragerc`:

```ini
[run]
source = .
omit =
    */migrations/*
    */tests/*
    */testing/*
    manage.py
    */wsgi.py
    */asgi.py

[report]
exclude_lines =
    pragma: no cover
    def __repr__
    raise NotImplementedError
```

---

## Writing Tests

### Unit Test Example

```python
# users/tests.py
from django.test import TestCase
from users.models import User

class UserModelTestCase(TestCase):
    def setUp(self):
        self.user = User.objects.create_user(
            email='test@example.com',
            password='testpass123',
            first_name='Test',
            last_name='User'
        )
    
    def test_user_creation(self):
        """Test user is created with correct attributes"""
        self.assertEqual(self.user.email, 'test@example.com')
        self.assertTrue(self.user.check_password('testpass123'))
    
    def test_company_id_auto_generated(self):
        """Test company_id is auto-generated"""
        self.assertIsNotNone(self.user.company_id)
        self.assertTrue(self.user.company_id.startswith('MA'))
    
    def test_user_str(self):
        """Test user string representation"""
        self.assertEqual(str(self.user), 'test@example.com')
```

### API Integration Test Example

```python
# testing/api_tests/test_login.py
from django.test import TestCase
from rest_framework.test import APIClient
from users.models import User

class LoginAPITestCase(TestCase):
    def setUp(self):
        self.client = APIClient()
        self.user = User.objects.create_user(
            email='testuser@example.com',
            password='testpass123'
        )
        self.user.status = 'Approved'
        self.user.save()
    
    def test_login_success(self):
        """Test successful login returns tokens"""
        response = self.client.post('/api/v1/users/login/api/', {
            'email': 'testuser@example.com',
            'password': 'testpass123'
        })
        self.assertEqual(response.status_code, 200)
        self.assertIn('access_token', response.cookies)
    
    def test_login_invalid_password(self):
        """Test login with wrong password fails"""
        response = self.client.post('/api/v1/users/login/api/', {
            'email': 'testuser@example.com',
            'password': 'wrongpassword'
        })
        self.assertEqual(response.status_code, 401)
    
    def test_login_nonexistent_user(self):
        """Test login with non-existent email fails"""
        response = self.client.post('/api/v1/users/login/api/', {
            'email': 'nobody@example.com',
            'password': 'anypassword'
        })
        self.assertEqual(response.status_code, 401)
```

### Authenticated Request Test

```python
from rest_framework.test import APIClient
from rest_framework_simplejwt.tokens import RefreshToken

class ProfileAPITestCase(TestCase):
    def setUp(self):
        self.client = APIClient()
        self.user = User.objects.create_user(
            email='testuser@example.com',
            password='testpass123'
        )
        # Generate token
        refresh = RefreshToken.for_user(self.user)
        self.access_token = str(refresh.access_token)
    
    def test_get_profile_authenticated(self):
        """Test authenticated user can access profile"""
        self.client.credentials(
            HTTP_AUTHORIZATION=f'Bearer {self.access_token}'
        )
        response = self.client.get('/api/v1/users/profile/')
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.data['email'], 'testuser@example.com')
    
    def test_get_profile_unauthenticated(self):
        """Test unauthenticated request is rejected"""
        response = self.client.get('/api/v1/users/profile/')
        self.assertEqual(response.status_code, 401)
```

---

## Test Utilities

### Testing Email

```bash
# Test SendGrid configuration
python testing/test_sendgrid.py

# Test SMTP configuration
python testing/test_smtp.py
```

### Debug Authentication

```bash
python testing/debug_auth.py
```

### Manual API Testing

Use the interactive shell:

```bash
python manage.py shell
```

```python
from rest_framework.test import APIClient

client = APIClient()

# Login
response = client.post('/api/v1/users/login/api/', {
    'email': 'superadmin@example.com',
    'password': 'admin'
})
print(response.status_code)
print(response.cookies.get('access_token'))
```

---

## Fixtures

### Create Fixtures

```bash
python manage.py dumpdata users --indent 2 > fixtures/users.json
python manage.py dumpdata systems roles system_roles --indent 2 > fixtures/rbac.json
```

### Load Fixtures

```bash
python manage.py loaddata fixtures/users.json
python manage.py loaddata fixtures/rbac.json
```

### Use in Tests

```python
class MyTestCase(TestCase):
    fixtures = ['users.json', 'rbac.json']
    
    def test_something(self):
        # Fixture data is loaded automatically
        pass
```

---

## CI/CD Testing

### GitHub Actions Example

```yaml
# .github/workflows/test.yml
name: Tests

on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest
    
    steps:
    - uses: actions/checkout@v3
    
    - name: Set up Python
      uses: actions/setup-python@v4
      with:
        python-version: '3.10'
    
    - name: Install dependencies
      run: |
        cd auth
        pip install -r requirements.txt
    
    - name: Run tests
      run: |
        cd auth
        python manage.py test
      env:
        DJANGO_ENV: development
        DJANGO_SECRET_KEY: test-secret-key
```

---

## Troubleshooting Tests

| Issue | Solution |
|-------|----------|
| Database not created | Run `python manage.py migrate --run-syncdb` |
| Import errors | Check `PYTHONPATH` includes auth directory |
| Async test failures | Use `@pytest.mark.django_db` or `TransactionTestCase` |
| Cookie tests failing | Use `APIClient` instead of `Client` |
