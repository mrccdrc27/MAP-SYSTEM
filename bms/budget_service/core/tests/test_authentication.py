from django.test import TestCase
from django.urls import reverse
from django.contrib.auth import get_user_model
from rest_framework.test import APIClient, APITestCase
from rest_framework import status
#from django.utils import timezone
from core.models import LoginAttempt, Department

User = get_user_model()


class EmailOrPhoneNumberBackendTest(TestCase):
    """
    Test the custom authentication backend that allows login with either email or phone number
    """
    
    def setUp(self):
        self.department = Department.objects.create(
            name='Test Department', 
            code='TEST', 
            description='Test Department Description'
        )
        
        # Create a user with both email and phone number
        self.user = User.objects.create_user(
            username='testuser',
            email='test@example.com',
            password='testpassword123',
            first_name='Test',
            last_name='User',
            role='FINANCE_OPERATOR',
            department=self.department,
            phone_number='1234567890'
        )
        
    def test_authenticate_with_email(self):
        """Test authentication using email"""
        user = User.objects.get(email='test@example.com')
        self.assertIsNotNone(user)
        
        # Verify the user can authenticate with email
        authenticated_user = self.client.login(username='test@example.com', password='testpassword123')
        self.assertTrue(authenticated_user)
    
    def test_authenticate_with_phone_number(self):
        """Test authentication using phone number"""
        user = User.objects.get(phone_number='1234567890')
        self.assertIsNotNone(user)
        
        # Verify the user can authenticate with phone number
        authenticated_user = self.client.login(username='1234567890', password='testpassword123')
        self.assertTrue(authenticated_user)
    
    def test_authenticate_with_invalid_credentials(self):
        """Test authentication with invalid credentials fails"""
        # Try with wrong password
        authenticated_user = self.client.login(username='test@example.com', password='wrongpassword')
        self.assertFalse(authenticated_user)
        
        # Try with non-existent email
        authenticated_user = self.client.login(username='nonexistent@example.com', password='testpassword123')
        self.assertFalse(authenticated_user)
        
        # Try with non-existent phone number
        authenticated_user = self.client.login(username='9876543210', password='testpassword123')
        self.assertFalse(authenticated_user)


class LoginAPITest(APITestCase):
    """
    Test the login API endpoint
    """
    
    def setUp(self):
        self.login_url = reverse('login')
        self.client = APIClient()
        
        self.department = Department.objects.create(
            name='Test Department', 
            code='TEST', 
            description='Test Department Description'
        )
        
        # Create a user
        self.user = User.objects.create_user(
            username='testuser',
            email='test@example.com',
            password='testpassword123',
            first_name='Test',
            last_name='User',
            role='FINANCE_OPERATOR',
            department=self.department,
            phone_number='1234567890'
        )
        
        # Create an inactive user
        self.inactive_user = User.objects.create_user(
            username='inactiveuser',
            email='inactive@example.com',
            password='testpassword123',
            first_name='Inactive',
            last_name='User',
            role='FINANCE_OPERATOR',
            department=self.department,
            is_active=False
        )
        
    def test_login_successful(self):
        """Test successful login updates last_login and creates a login attempt record"""
        initial_login_time = self.user.last_login
        
        # Record login attempts count before login
        initial_login_attempts = LoginAttempt.objects.count()
        
        response = self.client.post(self.login_url, {
            'email': 'test@example.com',
            'password': 'testpassword123'
        })
        
        # Verify response
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIn('access', response.data)
        self.assertIn('refresh', response.data)
        
        # Refresh user from database
        self.user.refresh_from_db()
        
        # Verify last_login was updated
        self.assertIsNotNone(self.user.last_login)
        if initial_login_time:
            self.assertGreater(self.user.last_login, initial_login_time)
        
        # Verify a login attempt was recorded
        self.assertEqual(LoginAttempt.objects.count(), initial_login_attempts + 1)
        latest_attempt = LoginAttempt.objects.latest('timestamp')
        self.assertEqual(latest_attempt.user, self.user)
        self.assertTrue(latest_attempt.success)
    
    def test_login_invalid_credentials(self):
        """Test login with invalid credentials"""
        initial_login_attempts = LoginAttempt.objects.count()
        
        response = self.client.post(self.login_url, {
            'email': 'test@example.com',
            'password': 'wrongpassword'
        })
        
        # Verify response
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        
        # Verify a failed login attempt was recorded
        self.assertEqual(LoginAttempt.objects.count(), initial_login_attempts + 1)
        latest_attempt = LoginAttempt.objects.latest('timestamp')
        self.assertFalse(latest_attempt.success)
        
    def test_login_inactive_user(self):
        """Test login with an inactive user account"""
        initial_login_attempts = LoginAttempt.objects.count()
        
        response = self.client.post(self.login_url, {
            'email': 'inactive@example.com',
            'password': 'testpassword123'
        })
        
        # Verify response
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        
        # Verify a failed login attempt was recorded
        self.assertEqual(LoginAttempt.objects.count(), initial_login_attempts + 1)
        latest_attempt = LoginAttempt.objects.latest('timestamp')
        self.assertFalse(latest_attempt.success)
    
    def test_login_missing_fields(self):
        """Test login with missing required fields"""
        # Missing password
        response = self.client.post(self.login_url, {
            'email': 'test@example.com'
        })
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        
        # Missing email
        response = self.client.post(self.login_url, {
            'password': 'testpassword123'
        })
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        
        # Empty request
        response = self.client.post(self.login_url, {})
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)


class UserProfileTest(APITestCase):
    """
    Test the user profile endpoint
    """
    
    def setUp(self):
        self.profile_url = reverse('user_profile')
        self.client = APIClient()
        
        self.department = Department.objects.create(
            name='Test Department', 
            code='TEST', 
            description='Test Department Description'
        )
        
        # Create a user
        self.user = User.objects.create_user(
            username='testuser',
            email='test@example.com',
            password='testpassword123',
            first_name='Test',
            last_name='User',
            role='FINANCE_OPERATOR',
            department=self.department
        )
        
    def test_get_profile_authenticated(self):
        """Test that an authenticated user can retrieve their profile"""
        self.client.force_authenticate(user=self.user)
        response = self.client.get(self.profile_url)
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['username'], self.user.username)
        self.assertEqual(response.data['email'], self.user.email)
        self.assertEqual(response.data['first_name'], self.user.first_name)
        self.assertEqual(response.data['last_name'], self.user.last_name)
        self.assertEqual(response.data['role'], self.user.role)
        
    def test_get_profile_unauthenticated(self):
        """Test that an unauthenticated user cannot retrieve a profile"""
        response = self.client.get(self.profile_url)
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)


class LoginAttemptsViewTest(APITestCase):
    """
    Test the login attempts endpoint
    """
    
    def setUp(self):
        self.login_attempts_url = reverse('login_attempts')
        self.client = APIClient()
        
        self.department = Department.objects.create(
            name='Test Department', 
            code='TEST', 
            description='Test Department Description'
        )
        
        # Create users with different roles
        self.finance_head = User.objects.create_user(
            username='finance_head',
            email='finance_head@example.com',
            password='testpassword123',
            first_name='Finance',
            last_name='Head',
            role='FINANCE_HEAD',
            department=self.department
        )
        
        self.finance_operator = User.objects.create_user(
            username='finance_operator',
            email='finance_operator@example.com',
            password='testpassword123',
            first_name='Finance',
            last_name='Operator',
            role='FINANCE_OPERATOR',
            department=self.department
        )
        
        # Create a few login attempts
        for i in range(5):
            LoginAttempt.objects.create(
                user=self.finance_head,
                ip_address='127.0.0.1',
                user_agent='Test User Agent',
                success=True
            )
            
        for i in range(3):
            LoginAttempt.objects.create(
                user=self.finance_operator,
                ip_address='127.0.0.1',
                user_agent='Test User Agent',
                success=False
            )
            
    def test_get_login_attempts_as_finance_head(self):
        """Test that a finance head can view all login attempts"""
        self.client.force_authenticate(user=self.finance_head)
        response = self.client.get(self.login_attempts_url)
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        # Should see all attempts (5 + 3)
        self.assertEqual(len(response.data), 8)
        
    def test_get_login_attempts_as_finance_operator(self):
        """Test that a finance operator cannot access login attempts"""
        self.client.force_authenticate(user=self.finance_operator)
        response = self.client.get(self.login_attempts_url)
        
        # Finance operators should not have permission
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)
        
    def test_get_login_attempts_unauthenticated(self):
        """Test that an unauthenticated user cannot access login attempts"""
        response = self.client.get(self.login_attempts_url)
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)


class LogoutViewTest(APITestCase):
    """
    Test the logout endpoint
    """
    
    def setUp(self):
        self.logout_url = reverse('logout')
        self.client = APIClient()
        
        self.department = Department.objects.create(
            name='Test Department', 
            code='TEST', 
            description='Test Department Description'
        )
        
        # Create a user
        self.user = User.objects.create_user(
            username='testuser',
            email='test@example.com',
            password='testpassword123',
            first_name='Test',
            last_name='User',
            role='FINANCE_OPERATOR',
            department=self.department
        )
        
    def test_logout(self):
        # First, log in to get the refresh token
        login_response = self.client.post(reverse('login'), {
            'email': 'test@example.com',
            'password': 'testpassword123'
        })
        refresh_token = login_response.data['refresh']
        
        # Now, log out using the refresh token
        response = self.client.post(self.logout_url, {
            'refresh': refresh_token
        })
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        
    def test_logout_unauthenticated(self):
        """Test that an unauthenticated user gets an error on logout"""
        response = self.client.post(self.logout_url)
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)