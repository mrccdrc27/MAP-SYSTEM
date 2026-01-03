"""
Pytest Configuration and Fixtures for Auth Service API Tests

This module provides shared fixtures and configuration for all API tests.
"""
import os
import sys
import django

# Add the auth directory to Python path
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

# Setup Django settings
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'auth.settings')
django.setup()

import pytest
from django.test import override_settings
from django.conf import settings
from rest_framework.test import APIClient
from users.models import User, UserOTP, PasswordResetToken
from systems.models import System
from roles.models import Role
from system_roles.models import UserSystemRole


# Override settings for testing - add testserver to ALLOWED_HOSTS
@pytest.fixture(autouse=True)
def test_settings():
    """Apply test-specific settings."""
    # Remove the AuthenticationRoutingMiddleware for API tests
    # It interferes with DRF's force_authenticate by redirecting before DRF can authenticate
    from django.conf import settings
    test_middleware = [
        m for m in settings.MIDDLEWARE 
        if 'AuthenticationRoutingMiddleware' not in m
    ]
    
    with override_settings(
        ALLOWED_HOSTS=['localhost', '127.0.0.1', 'testserver', 'auth_service'],
        EMAIL_BACKEND='django.core.mail.backends.locmem.EmailBackend',
        MIDDLEWARE=test_middleware,
    ):
        yield


# Test Configuration
TEST_CONFIG = {
    'base_url': os.environ.get('AUTH_SERVICE_URL', 'http://localhost:8000'),
    'api_prefix': '/api/v1',
    'timeout': 30,
}


@pytest.fixture(scope='session')
def django_db_setup():
    """Configure database for testing."""
    pass


@pytest.fixture
def api_client():
    """Provide a DRF API client for making requests."""
    return APIClient()


@pytest.fixture
def test_password():
    """Standard test password that passes all validations."""
    return "SecureTestP@ss123!"


@pytest.fixture
def weak_password():
    """Password that fails validation."""
    return "short"


@pytest.fixture
def test_user(db, test_password):
    """Create a standard test user."""
    user = User.objects.create_user(
        email='testuser@example.com',
        username='testuser',
        password=test_password,
        first_name='Test',
        last_name='User',
        phone_number='+15551234567',
        status='Approved',
        is_active=True
    )
    return user


@pytest.fixture
def test_user_with_2fa(db, test_password):
    """Create a test user with 2FA enabled."""
    user = User.objects.create_user(
        email='testuser2fa@example.com',
        username='testuser2fa',
        password=test_password,
        first_name='Test',
        last_name='TwoFA',
        status='Approved',
        is_active=True,
        otp_enabled=True
    )
    return user


@pytest.fixture
def admin_user(db, test_password):
    """Create an admin user."""
    user = User.objects.create_user(
        email='adminuser@example.com',
        username='adminuser',
        password=test_password,
        first_name='Admin',
        last_name='User',
        status='Approved',
        is_active=True,
        is_staff=True
    )
    return user


@pytest.fixture
def superuser(db, test_password):
    """Create a superuser."""
    user = User.objects.create_superuser(
        email='superuser@example.com',
        username='superuser',
        password=test_password,
        first_name='Super',
        last_name='User'
    )
    return user


@pytest.fixture
def inactive_user(db, test_password):
    """Create an inactive user."""
    user = User.objects.create_user(
        email='inactiveuser@example.com',
        username='inactiveuser',
        password=test_password,
        first_name='Inactive',
        last_name='User',
        status='Pending',
        is_active=False
    )
    return user


@pytest.fixture
def locked_user(db, test_password):
    """Create a locked user."""
    from django.utils import timezone
    user = User.objects.create_user(
        email='lockeduser@example.com',
        username='lockeduser',
        password=test_password,
        first_name='Locked',
        last_name='User',
        status='Approved',
        is_active=True,
        is_locked=True,
        lockout_time=timezone.now()
    )
    return user


@pytest.fixture
def test_system(db):
    """Create a test system."""
    system, created = System.objects.get_or_create(
        slug='test-system',
        defaults={
            'name': 'Test System'
        }
    )
    return system


@pytest.fixture
def admin_role(db, test_system):
    """Create an admin role."""
    role, created = Role.objects.get_or_create(
        name='Admin',
        system=test_system,
        defaults={
            'description': 'Administrator role'
        }
    )
    return role


@pytest.fixture
def agent_role(db, test_system):
    """Create an agent role."""
    role, created = Role.objects.get_or_create(
        name='Agent',
        system=test_system,
        defaults={
            'description': 'Agent role'
        }
    )
    return role


@pytest.fixture
def admin_with_system_role(db, admin_user, test_system, admin_role):
    """Create an admin user with a system role."""
    user_system_role, created = UserSystemRole.objects.get_or_create(
        user=admin_user,
        system=test_system,
        role=admin_role,
        defaults={'is_active': True}
    )
    return admin_user


@pytest.fixture
def agent_user(db, test_password, test_system, agent_role):
    """Create an agent user with a system role."""
    user = User.objects.create_user(
        email='agentuser@example.com',
        username='agentuser',
        password=test_password,
        first_name='Agent',
        last_name='User',
        status='Approved',
        is_active=True
    )
    UserSystemRole.objects.create(
        user=user,
        system=test_system,
        role=agent_role,
        is_active=True
    )
    return user


@pytest.fixture
def authenticated_client(api_client, test_user, test_password):
    """Provide an authenticated API client."""
    # Use force_authenticate for reliable test auth
    api_client.force_authenticate(user=test_user)
    return api_client


@pytest.fixture
def admin_authenticated_client(api_client, admin_user, test_password):
    """Provide an authenticated API client for admin user."""
    # Use force_authenticate for reliable test auth
    api_client.force_authenticate(user=admin_user)
    return api_client


@pytest.fixture
def superuser_authenticated_client(api_client, superuser):
    """Provide an authenticated API client for superuser."""
    # Use force_authenticate for reliable test auth
    api_client.force_authenticate(user=superuser)
    return api_client


@pytest.fixture
def valid_otp(db, test_user_with_2fa):
    """Create a valid OTP for a user."""
    otp = UserOTP.generate_for_user(test_user_with_2fa, otp_type='email')
    return otp


@pytest.fixture
def expired_otp(db, test_user_with_2fa):
    """Create an expired OTP for a user."""
    from django.utils import timezone
    from datetime import timedelta
    
    otp = UserOTP.generate_for_user(test_user_with_2fa, otp_type='email')
    otp.expires_at = timezone.now() - timedelta(minutes=10)
    otp.save()
    return otp


@pytest.fixture
def password_reset_token(db, test_user):
    """Create a password reset token."""
    token = PasswordResetToken.generate_for_user(test_user)
    return token


@pytest.fixture
def expired_password_reset_token(db, test_user):
    """Create an expired password reset token."""
    from django.utils import timezone
    from datetime import timedelta
    
    token = PasswordResetToken.generate_for_user(test_user)
    token.expires_at = timezone.now() - timedelta(hours=2)
    token.save()
    return token


# Utility functions for tests
def get_auth_header(user):
    """Generate authentication header for a user."""
    from rest_framework_simplejwt.tokens import RefreshToken
    refresh = RefreshToken.for_user(user)
    return {'HTTP_AUTHORIZATION': f'Bearer {refresh.access_token}'}


def create_test_user_data(suffix=''):
    """Generate test user registration data."""
    return {
        'email': f'newuser{suffix}@example.com',
        'username': f'newuser{suffix}',
        'password': 'SecureTestP@ss123!',
        'password2': 'SecureTestP@ss123!',
        'first_name': 'New',
        'last_name': 'User',
        'phone_number': '09123456789'
    }
