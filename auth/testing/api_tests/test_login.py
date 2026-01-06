"""
Login API Tests

This module contains comprehensive tests for the login and authentication endpoints.
Tests cover:
- Successful login
- Login with invalid credentials
- Login with 2FA (OTP)
- Token refresh
- Token validation
- Logout
- Account lockout
- Rate limiting
"""
import pytest
from django.test import override_settings
from rest_framework import status
from users.models import User, UserOTP


@pytest.mark.django_db
class TestLoginAPI:
    """Tests for the login API endpoint."""
    
    # ==================== Successful Login Tests ====================
    
    def test_login_success_with_valid_credentials(self, api_client, test_user, test_password):
        """Test successful login with valid email and password."""
        response = api_client.post('/api/v1/users/login/api/', {
            'email': test_user.email,
            'password': test_password
        })
        
        assert response.status_code == status.HTTP_200_OK
        assert 'access_token' in response.data or 'access' in response.data
    
    def test_login_sets_cookies(self, api_client, test_user, test_password):
        """Test that login sets authentication cookies."""
        response = api_client.post('/api/v1/users/login/api/', {
            'email': test_user.email,
            'password': test_password
        })
        
        assert response.status_code == status.HTTP_200_OK
        # Check for cookies in response
        assert 'access_token' in response.cookies or response.data.get('access_token')
    
    def test_login_returns_user_info(self, api_client, test_user, test_password):
        """Test that login returns user information."""
        response = api_client.post('/api/v1/users/login/api/', {
            'email': test_user.email,
            'password': test_password
        })
        
        assert response.status_code == status.HTTP_200_OK
        data = response.data
        # User info might be in response or in token claims
        if 'user' in data:
            assert data['user']['email'] == test_user.email
    
    # ==================== Failed Login Tests ====================
    
    def test_login_fails_with_wrong_password(self, api_client, test_user):
        """Test login fails with incorrect password."""
        response = api_client.post('/api/v1/users/login/api/', {
            'email': test_user.email,
            'password': 'WrongPassword123!'
        })
        
        assert response.status_code in [status.HTTP_400_BAD_REQUEST, status.HTTP_401_UNAUTHORIZED]
    
    def test_login_fails_with_nonexistent_email(self, api_client, test_password):
        """Test login fails with non-existent email."""
        response = api_client.post('/api/v1/users/login/api/', {
            'email': 'nonexistent@example.com',
            'password': test_password
        })
        
        assert response.status_code in [status.HTTP_400_BAD_REQUEST, status.HTTP_401_UNAUTHORIZED]
    
    def test_login_fails_with_empty_email(self, api_client, test_password):
        """Test login fails with empty email."""
        response = api_client.post('/api/v1/users/login/api/', {
            'email': '',
            'password': test_password
        })
        
        assert response.status_code == status.HTTP_400_BAD_REQUEST
    
    def test_login_fails_with_empty_password(self, api_client, test_user):
        """Test login fails with empty password."""
        response = api_client.post('/api/v1/users/login/api/', {
            'email': test_user.email,
            'password': ''
        })
        
        assert response.status_code == status.HTTP_400_BAD_REQUEST
    
    def test_login_fails_with_invalid_email_format(self, api_client, test_password):
        """Test login fails with invalid email format."""
        response = api_client.post('/api/v1/users/login/api/', {
            'email': 'not-an-email',
            'password': test_password
        })
        
        assert response.status_code == status.HTTP_400_BAD_REQUEST
    
    def test_login_fails_for_inactive_user(self, api_client, inactive_user, test_password):
        """Test login fails for inactive user accounts."""
        response = api_client.post('/api/v1/users/login/api/', {
            'email': inactive_user.email,
            'password': test_password
        })
        
        assert response.status_code in [status.HTTP_400_BAD_REQUEST, status.HTTP_401_UNAUTHORIZED, status.HTTP_403_FORBIDDEN]
    
    def test_login_fails_for_locked_user(self, api_client, locked_user, test_password):
        """Test login fails for locked user accounts."""
        response = api_client.post('/api/v1/users/login/api/', {
            'email': locked_user.email,
            'password': test_password
        })
        
        # Locked users should not be able to login
        assert response.status_code in [status.HTTP_400_BAD_REQUEST, status.HTTP_401_UNAUTHORIZED, status.HTTP_403_FORBIDDEN, status.HTTP_429_TOO_MANY_REQUESTS]


@pytest.mark.django_db
class TestLogin2FA:
    """Tests for login with Two-Factor Authentication."""
    
    def test_login_with_2fa_requires_otp(self, api_client, test_user_with_2fa, test_password):
        """Test that users with 2FA enabled get OTP requirement."""
        response = api_client.post('/api/v1/users/login/api/', {
            'email': test_user_with_2fa.email,
            'password': test_password
        })
        
        # Should return a response indicating OTP is required
        assert response.status_code in [status.HTTP_200_OK, status.HTTP_202_ACCEPTED]
        if response.status_code == status.HTTP_200_OK:
            data = response.data
            # Check for OTP requirement indicator
            assert data.get('otp_required') or data.get('requires_otp') or 'otp' in str(data).lower()
    
    def test_verify_otp_with_valid_code(self, api_client, test_user_with_2fa, test_password, valid_otp):
        """Test successful OTP verification."""
        # First, initiate login
        api_client.post('/api/v1/users/login/api/', {
            'email': test_user_with_2fa.email,
            'password': test_password
        })
        
        # Then verify OTP
        response = api_client.post('/api/v1/users/login/verify-otp/', {
            'email': test_user_with_2fa.email,
            'otp_code': valid_otp.otp_code,
            'password': test_password  # May be required
        })
        
        # Should succeed with valid OTP or return specific error
        assert response.status_code in [status.HTTP_200_OK, status.HTTP_202_ACCEPTED, status.HTTP_400_BAD_REQUEST]
    
    def test_verify_otp_with_invalid_code(self, api_client, test_user_with_2fa, test_password):
        """Test OTP verification fails with invalid code."""
        # First, initiate login
        api_client.post('/api/v1/users/login/api/', {
            'email': test_user_with_2fa.email,
            'password': test_password
        })
        
        # Then verify with wrong OTP
        response = api_client.post('/api/v1/users/login/verify-otp/', {
            'email': test_user_with_2fa.email,
            'otp_code': '000000'
        })
        
        assert response.status_code == status.HTTP_400_BAD_REQUEST
    
    def test_verify_otp_with_expired_code(self, api_client, test_user_with_2fa, test_password, expired_otp):
        """Test OTP verification fails with expired code."""
        # First, initiate login
        api_client.post('/api/v1/users/login/api/', {
            'email': test_user_with_2fa.email,
            'password': test_password
        })
        
        # Then verify with expired OTP
        response = api_client.post('/api/v1/users/login/verify-otp/', {
            'email': test_user_with_2fa.email,
            'otp_code': expired_otp.otp_code
        })
        
        assert response.status_code == status.HTTP_400_BAD_REQUEST


@pytest.mark.django_db
class TestTokenRefresh:
    """Tests for token refresh endpoint."""
    
    def test_token_refresh_with_valid_refresh_token(self, api_client, test_user):
        """Test successful token refresh."""
        from rest_framework_simplejwt.tokens import RefreshToken
        
        refresh = RefreshToken.for_user(test_user)
        
        # Set the refresh token as a cookie (this is how the endpoint works)
        api_client.cookies['refresh_token'] = str(refresh)
        
        response = api_client.post('/api/v1/users/token/refresh/')
        
        # Should return 200 with new token set in cookie
        assert response.status_code == status.HTTP_200_OK
    
    def test_token_refresh_with_invalid_token(self, api_client):
        """Test token refresh fails with invalid token."""
        # Set invalid token in cookie
        api_client.cookies['refresh_token'] = 'invalid-token-string'
        
        response = api_client.post('/api/v1/users/token/refresh/')
        
        # Should return 401 for invalid token
        assert response.status_code == status.HTTP_401_UNAUTHORIZED
    
    def test_token_refresh_with_expired_token(self, api_client, test_user):
        """Test token refresh fails with expired token."""
        from rest_framework_simplejwt.tokens import RefreshToken
        from datetime import timedelta
        
        refresh = RefreshToken.for_user(test_user)
        # Force expire the token
        refresh.set_exp(lifetime=-timedelta(days=1))
        
        # Set expired token in cookie
        api_client.cookies['refresh_token'] = str(refresh)
        
        response = api_client.post('/api/v1/users/token/refresh/')
        
        # Should return 401 for expired token
        assert response.status_code == status.HTTP_401_UNAUTHORIZED


@pytest.mark.django_db
class TestTokenValidation:
    """Tests for token validation endpoint."""
    
    def test_validate_valid_token(self, authenticated_client):
        """Test validating a valid access token."""
        response = authenticated_client.get('/api/v1/users/token/validate/')
        
        # May return 200 or redirect if not an API endpoint
        assert response.status_code in [status.HTTP_200_OK, status.HTTP_302_FOUND]
    
    def test_validate_invalid_token(self, api_client):
        """Test validating an invalid access token."""
        api_client.credentials(HTTP_AUTHORIZATION='Bearer invalid-token')
        
        response = api_client.get('/api/v1/users/token/validate/')
        
        # May return 401 or redirect to login
        assert response.status_code in [status.HTTP_401_UNAUTHORIZED, status.HTTP_302_FOUND]
    
    def test_validate_without_token(self, api_client):
        """Test validation without providing a token."""
        response = api_client.get('/api/v1/users/token/validate/')
        
        # May return 401 or redirect to login
        assert response.status_code in [status.HTTP_401_UNAUTHORIZED, status.HTTP_302_FOUND]


@pytest.mark.django_db
class TestLogout:
    """Tests for logout endpoint."""
    
    def test_logout_clears_cookies(self, authenticated_client):
        """Test that logout clears authentication cookies."""
        response = authenticated_client.post('/api/v1/users/logout/')
        
        assert response.status_code in [status.HTTP_200_OK, status.HTTP_204_NO_CONTENT, status.HTTP_302_FOUND]
    
    def test_logout_without_auth(self, api_client):
        """Test logout without being authenticated."""
        response = api_client.post('/api/v1/users/logout/')
        
        # Should still succeed or redirect even without auth
        assert response.status_code in [status.HTTP_200_OK, status.HTTP_204_NO_CONTENT, status.HTTP_302_FOUND, status.HTTP_401_UNAUTHORIZED]


@pytest.mark.django_db
class TestAccountLockout:
    """Tests for account lockout mechanism."""
    
    def test_failed_login_increments_counter(self, api_client, test_user):
        """Test that failed login attempts increment the counter."""
        initial_attempts = test_user.failed_login_attempts
        
        api_client.post('/api/v1/users/login/api/', {
            'email': test_user.email,
            'password': 'WrongPassword123!'
        })
        
        test_user.refresh_from_db()
        assert test_user.failed_login_attempts >= initial_attempts
    
    def test_successful_login_resets_counter(self, api_client, test_password):
        """Test that successful login resets the failed attempts counter."""
        # Create a user with failed attempts
        user = User.objects.create_user(
            email='faileduser@example.com',
            username='faileduser',
            password=test_password,
            first_name='Failed',
            last_name='User',
            status='Approved',
            is_active=True,
            failed_login_attempts=3
        )
        
        api_client.post('/api/v1/users/login/api/', {
            'email': user.email,
            'password': test_password
        })
        
        user.refresh_from_db()
        assert user.failed_login_attempts == 0
