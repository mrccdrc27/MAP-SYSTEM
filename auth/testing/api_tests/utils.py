"""
Base test utilities and helpers for Auth Service API Tests.

This module provides common utilities and helper functions
used across all test modules.
"""
import os
import json
from typing import Dict, Any, Optional
from datetime import datetime, timedelta


class TestDataFactory:
    """Factory for generating test data."""
    
    _counter = 0
    
    @classmethod
    def _get_next_id(cls) -> int:
        """Get next unique ID for test data."""
        cls._counter += 1
        return cls._counter
    
    @classmethod
    def reset_counter(cls):
        """Reset the counter (useful for test isolation)."""
        cls._counter = 0
    
    @classmethod
    def user_data(cls, **overrides) -> Dict[str, Any]:
        """Generate user registration data."""
        uid = cls._get_next_id()
        data = {
            'email': f'testuser{uid}@example.com',
            'username': f'testuser{uid}',
            'password': 'SecureP@ss123!',
            'first_name': 'Test',
            'last_name': f'User{uid}',
            'phone_number': f'0912345{uid:04d}',
        }
        data.update(overrides)
        return data
    
    @classmethod
    def login_data(cls, email: str = 'test@example.com', 
                   password: str = 'SecureP@ss123!') -> Dict[str, str]:
        """Generate login request data."""
        return {
            'email': email,
            'password': password
        }
    
    @classmethod
    def password_change_data(cls, current: str, new: str) -> Dict[str, str]:
        """Generate password change request data."""
        return {
            'current_password': current,
            'new_password': new
        }
    
    @classmethod
    def password_reset_data(cls, token: str, password: str) -> Dict[str, str]:
        """Generate password reset request data."""
        return {
            'token': token,
            'password': password,
            'password_confirm': password
        }
    
    @classmethod
    def profile_update_data(cls, **fields) -> Dict[str, Any]:
        """Generate profile update data."""
        return fields
    
    @classmethod
    def invite_agent_data(cls, user_id: int, system_id: int, 
                          role_id: int) -> Dict[str, int]:
        """Generate invite agent request data."""
        return {
            'user_id': user_id,
            'system_id': system_id,
            'role_id': role_id
        }


class APIEndpoints:
    """Central registry of API endpoints for testing."""
    
    BASE = '/api/v1'
    
    # Authentication
    LOGIN = f'{BASE}/users/login/api/'
    LOGIN_VERIFY_OTP = f'{BASE}/users/login/verify-otp/'
    LOGOUT = f'{BASE}/users/logout/'
    TOKEN_REFRESH = f'{BASE}/users/token/refresh/'
    TOKEN_VALIDATE = f'{BASE}/users/token/validate/'
    REGISTER = f'{BASE}/users/register/'
    
    # Profile
    PROFILE = f'{BASE}/users/profile/'
    PROFILE_BY_COMPANY = f'{BASE}/users/profile/by-company/{{company_id}}/'
    
    # 2FA
    REQUEST_OTP = f'{BASE}/users/2fa/request-otp/'
    ENABLE_2FA = f'{BASE}/users/2fa/enable/'
    DISABLE_2FA = f'{BASE}/users/2fa/disable/'
    
    # Password
    FORGOT_PASSWORD = f'{BASE}/users/password/forgot/'
    RESET_PASSWORD = f'{BASE}/users/password/reset/'
    CHANGE_PASSWORD = f'{BASE}/users/change-password/'
    
    # User Management
    USER_LIST = f'{BASE}/users/list/'
    USER_MANAGEMENT = f'{BASE}/users/management/{{user_id}}/'
    INVITE_AGENT = f'{BASE}/users/invite-agent/'
    
    @classmethod
    def user_detail(cls, user_id: int) -> str:
        """Get user detail endpoint URL."""
        return cls.USER_MANAGEMENT.format(user_id=user_id)
    
    @classmethod
    def profile_by_company_id(cls, company_id: str) -> str:
        """Get profile by company ID endpoint URL."""
        return cls.PROFILE_BY_COMPANY.format(company_id=company_id)


class TestAssertions:
    """Custom assertions for API testing."""
    
    @staticmethod
    def assert_success(response, expected_status=200):
        """Assert response is successful."""
        assert response.status_code == expected_status, \
            f"Expected {expected_status}, got {response.status_code}: {response.data}"
    
    @staticmethod
    def assert_error(response, expected_status=400):
        """Assert response is an error."""
        assert response.status_code == expected_status, \
            f"Expected {expected_status}, got {response.status_code}: {response.data}"
    
    @staticmethod
    def assert_unauthorized(response):
        """Assert response is 401 Unauthorized."""
        assert response.status_code == 401, \
            f"Expected 401, got {response.status_code}: {response.data}"
    
    @staticmethod
    def assert_forbidden(response):
        """Assert response is 403 Forbidden."""
        assert response.status_code == 403, \
            f"Expected 403, got {response.status_code}: {response.data}"
    
    @staticmethod
    def assert_not_found(response):
        """Assert response is 404 Not Found."""
        assert response.status_code == 404, \
            f"Expected 404, got {response.status_code}: {response.data}"
    
    @staticmethod
    def assert_has_fields(data: dict, *fields):
        """Assert response data contains required fields."""
        for field in fields:
            assert field in data, f"Missing field: {field}"
    
    @staticmethod
    def assert_field_equals(data: dict, field: str, expected):
        """Assert a field equals expected value."""
        assert field in data, f"Missing field: {field}"
        assert data[field] == expected, \
            f"Field '{field}': expected {expected}, got {data[field]}"


def format_test_report(results: Dict[str, Any]) -> str:
    """Format test results as a readable report."""
    lines = [
        "=" * 60,
        "TEST REPORT",
        "=" * 60,
        f"Timestamp: {datetime.now().isoformat()}",
        "",
        f"Total Tests: {results.get('total', 0)}",
        f"Passed: {results.get('passed', 0)}",
        f"Failed: {results.get('failed', 0)}",
        f"Skipped: {results.get('skipped', 0)}",
        f"Errors: {results.get('errors', 0)}",
        "",
        f"Duration: {results.get('duration', 0):.2f}s",
        "=" * 60
    ]
    
    if results.get('failures'):
        lines.extend([
            "",
            "FAILURES:",
            "-" * 40
        ])
        for failure in results['failures']:
            lines.append(f"  • {failure['name']}")
            lines.append(f"    {failure['message'][:100]}...")
    
    return "\n".join(lines)
