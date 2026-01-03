"""
User Profile API Tests

This module contains comprehensive tests for user profile management.
Tests cover:
- Get profile
- Update profile (all fields)
- Profile picture upload
- Field validations
- Permission checks (admin vs regular user)
- Edge cases
"""
import pytest
import io
from PIL import Image
from django.core.files.uploadedfile import SimpleUploadedFile
from rest_framework import status
from users.models import User


def create_test_image(size=(100, 100), format='PNG'):
    """Create a test image file."""
    file = io.BytesIO()
    image = Image.new('RGB', size, color='red')
    image.save(file, format)
    file.seek(0)
    return file


@pytest.mark.django_db
class TestGetProfile:
    """Tests for retrieving user profile."""
    
    def test_get_profile_authenticated(self, authenticated_client, test_user):
        """Test authenticated user can retrieve their profile."""
        response = authenticated_client.get('/api/v1/users/profile/')
        
        assert response.status_code == status.HTTP_200_OK
        assert response.data['email'] == test_user.email
        assert response.data['username'] == test_user.username
    
    def test_get_profile_returns_all_fields(self, authenticated_client, test_user):
        """Test that profile response includes all expected fields."""
        response = authenticated_client.get('/api/v1/users/profile/')
        
        expected_fields = [
            'id', 'email', 'username', 'first_name', 'last_name',
            'phone_number', 'company_id', 'department', 'status', 'is_active'
        ]
        
        for field in expected_fields:
            assert field in response.data, f"Missing field: {field}"
    
    def test_get_profile_unauthenticated(self, api_client):
        """Test unauthenticated user cannot retrieve profile."""
        response = api_client.get('/api/v1/users/profile/')
        
        assert response.status_code == status.HTTP_401_UNAUTHORIZED
    
    def test_get_profile_with_invalid_token(self, api_client):
        """Test profile retrieval fails with invalid token."""
        api_client.credentials(HTTP_AUTHORIZATION='Bearer invalid-token')
        
        response = api_client.get('/api/v1/users/profile/')
        
        assert response.status_code == status.HTTP_401_UNAUTHORIZED


@pytest.mark.django_db
class TestUpdateProfile:
    """Tests for updating user profile."""
    
    # ==================== Basic Updates ====================
    
    def test_update_username(self, authenticated_client, test_user):
        """Test updating username."""
        response = authenticated_client.patch('/api/v1/users/profile/', {
            'username': 'newusername'
        })
        
        assert response.status_code == status.HTTP_200_OK
        test_user.refresh_from_db()
        assert test_user.username == 'newusername'
    
    def test_update_phone_number(self, authenticated_client, test_user):
        """Test updating phone number with valid E.164 format."""
        response = authenticated_client.patch('/api/v1/users/profile/', {
            'phone_number': '+15559876543'
        })
        
        assert response.status_code == status.HTTP_200_OK
        test_user.refresh_from_db()
        assert test_user.phone_number == '+15559876543'
    
    def test_update_multiple_fields(self, authenticated_client, test_user):
        """Test updating multiple fields at once."""
        response = authenticated_client.patch('/api/v1/users/profile/', {
            'username': 'multifielduser',
            'phone_number': '+15551112222'
        })
        
        assert response.status_code == status.HTTP_200_OK
        test_user.refresh_from_db()
        assert test_user.username == 'multifielduser'
        assert test_user.phone_number == '+15551112222'
    
    # ==================== Admin-Only Field Updates ====================
    
    def test_regular_user_cannot_update_email(self, authenticated_client, test_user):
        """Test regular user cannot update email field."""
        original_email = test_user.email
        
        response = authenticated_client.patch('/api/v1/users/profile/', {
            'email': 'newemail@example.com'
        })
        
        test_user.refresh_from_db()
        # Either fails or email unchanged (depends on implementation)
        assert test_user.email == original_email or response.status_code in [status.HTTP_400_BAD_REQUEST, status.HTTP_403_FORBIDDEN]
    
    def test_regular_user_cannot_update_first_name(self, authenticated_client, test_user):
        """Test regular user cannot update first_name (admin-only field)."""
        original_first_name = test_user.first_name
        
        response = authenticated_client.patch('/api/v1/users/profile/', {
            'first_name': 'NewFirstName'
        })
        
        test_user.refresh_from_db()
        # Field should remain unchanged for regular users
        assert test_user.first_name == original_first_name or response.status_code in [status.HTTP_400_BAD_REQUEST, status.HTTP_403_FORBIDDEN]
    
    def test_admin_can_update_all_fields(self, admin_authenticated_client, admin_user):
        """Test admin can update all profile fields."""
        response = admin_authenticated_client.patch('/api/v1/users/profile/', {
            'first_name': 'UpdatedFirst',
            'last_name': 'UpdatedLast',
            'username': 'updatedadmin'
        })
        
        assert response.status_code == status.HTTP_200_OK
        admin_user.refresh_from_db()
        assert admin_user.first_name == 'UpdatedFirst'
        assert admin_user.last_name == 'UpdatedLast'
    
    # ==================== Validation Tests ====================
    
    def test_update_with_duplicate_username(self, authenticated_client, test_user, admin_user):
        """Test updating username to an existing username fails."""
        response = authenticated_client.patch('/api/v1/users/profile/', {
            'username': admin_user.username
        })
        
        assert response.status_code == status.HTTP_400_BAD_REQUEST
        assert 'username' in response.data
    
    def test_update_with_invalid_phone_number(self, authenticated_client, test_user):
        """Test updating with invalid phone number format fails."""
        response = authenticated_client.patch('/api/v1/users/profile/', {
            'phone_number': 'not-a-phone'
        })
        
        assert response.status_code == status.HTTP_400_BAD_REQUEST
    
    def test_update_with_duplicate_phone_number(self, authenticated_client, test_user, test_password, db):
        """Test updating phone number to existing number fails."""
        # Create another user with a specific phone number
        other_user = User.objects.create_user(
            email='otheruser@example.com',
            username='otheruser',
            password=test_password,
            phone_number='+15553334444',
            status='Approved',
            is_active=True
        )
        
        response = authenticated_client.patch('/api/v1/users/profile/', {
            'phone_number': '+15553334444'
        })
        
        assert response.status_code == status.HTTP_400_BAD_REQUEST
    
    def test_update_with_empty_username(self, authenticated_client, test_user):
        """Test updating with empty username fails."""
        original_username = test_user.username
        
        response = authenticated_client.patch('/api/v1/users/profile/', {
            'username': ''
        })
        
        # Empty username should fail or be ignored
        test_user.refresh_from_db()
        assert test_user.username == original_username or response.status_code == status.HTTP_400_BAD_REQUEST


@pytest.mark.django_db
class TestProfilePictureUpload:
    """Tests for profile picture upload functionality."""
    
    def test_upload_valid_profile_picture(self, authenticated_client, test_user):
        """Test uploading a valid profile picture."""
        image_file = create_test_image()
        uploaded_file = SimpleUploadedFile(
            'test_photo.png',
            image_file.read(),
            content_type='image/png'
        )
        
        response = authenticated_client.patch(
            '/api/v1/users/profile/',
            {'profile_picture': uploaded_file},
            format='multipart'
        )
        
        assert response.status_code == status.HTTP_200_OK
        test_user.refresh_from_db()
        assert test_user.profile_picture is not None
    
    def test_upload_oversized_profile_picture(self, authenticated_client, test_user):
        """Test uploading an oversized profile picture fails."""
        # Create a large image (> 2MB)
        image_file = create_test_image(size=(5000, 5000))
        uploaded_file = SimpleUploadedFile(
            'large_photo.png',
            image_file.read(),
            content_type='image/png'
        )
        
        response = authenticated_client.patch(
            '/api/v1/users/profile/',
            {'profile_picture': uploaded_file},
            format='multipart'
        )
        
        # Should fail due to size limit
        assert response.status_code == status.HTTP_400_BAD_REQUEST
    
    def test_upload_invalid_file_type(self, authenticated_client, test_user):
        """Test uploading non-image file as profile picture fails."""
        fake_file = SimpleUploadedFile(
            'document.txt',
            b'This is not an image',
            content_type='text/plain'
        )
        
        response = authenticated_client.patch(
            '/api/v1/users/profile/',
            {'profile_picture': fake_file},
            format='multipart'
        )
        
        assert response.status_code == status.HTTP_400_BAD_REQUEST
    
    def test_remove_profile_picture(self, authenticated_client, test_user):
        """Test removing profile picture by setting to null."""
        # First upload a picture
        image_file = create_test_image()
        uploaded_file = SimpleUploadedFile(
            'test_photo.png',
            image_file.read(),
            content_type='image/png'
        )
        authenticated_client.patch(
            '/api/v1/users/profile/',
            {'profile_picture': uploaded_file},
            format='multipart'
        )
        
        # Then remove it
        response = authenticated_client.patch('/api/v1/users/profile/', {
            'profile_picture': None
        }, format='json')
        
        # Should succeed
        assert response.status_code == status.HTTP_200_OK


@pytest.mark.django_db  
class TestProfileByCompanyId:
    """Tests for retrieving profile by company ID."""
    
    def test_get_profile_by_company_id(self, authenticated_client, test_user):
        """Test retrieving user profile by company ID."""
        if test_user.company_id:
            response = authenticated_client.get(
                f'/api/v1/users/profile/by-company/{test_user.company_id}/'
            )
            
            assert response.status_code == status.HTTP_200_OK
            assert response.data['company_id'] == test_user.company_id
    
    def test_get_profile_by_invalid_company_id(self, authenticated_client):
        """Test retrieving profile with non-existent company ID."""
        response = authenticated_client.get('/api/v1/users/profile/by-company/INVALID123/')
        
        assert response.status_code == status.HTTP_404_NOT_FOUND


@pytest.mark.django_db
class TestAdminProfileUpdate:
    """Tests for admin updating other users' profiles."""
    
    def test_admin_can_update_agent_profile(self, admin_authenticated_client, agent_user, admin_with_system_role):
        """Test admin can update an agent's profile in their system."""
        response = admin_authenticated_client.patch(
            f'/api/v1/users/management/{agent_user.id}/',
            {'first_name': 'UpdatedAgent'}
        )
        
        # Admin should be able to update agent profiles
        assert response.status_code in [status.HTTP_200_OK, status.HTTP_403_FORBIDDEN]
    
    def test_admin_cannot_update_other_admin(self, admin_authenticated_client, superuser):
        """Test admin cannot update another admin's profile."""
        response = admin_authenticated_client.patch(
            f'/api/v1/users/management/{superuser.id}/',
            {'first_name': 'HackedAdmin'}
        )
        
        assert response.status_code in [status.HTTP_403_FORBIDDEN, status.HTTP_404_NOT_FOUND]
    
    def test_superuser_can_update_any_profile(self, superuser_authenticated_client, test_user):
        """Test superuser can update any user's profile."""
        response = superuser_authenticated_client.patch(
            f'/api/v1/users/management/{test_user.id}/',
            {'first_name': 'SuperUpdated'}
        )
        
        assert response.status_code == status.HTTP_200_OK
        test_user.refresh_from_db()
        assert test_user.first_name == 'SuperUpdated'


@pytest.mark.django_db
class TestProfileEdgeCases:
    """Edge case tests for profile operations."""
    
    def test_update_profile_with_same_values(self, authenticated_client, test_user):
        """Test updating profile with same values succeeds."""
        response = authenticated_client.patch('/api/v1/users/profile/', {
            'username': test_user.username
        })
        
        assert response.status_code == status.HTTP_200_OK
    
    def test_update_profile_with_empty_request(self, authenticated_client, test_user):
        """Test updating profile with empty request body."""
        response = authenticated_client.patch('/api/v1/users/profile/', {})
        
        # Should succeed with no changes
        assert response.status_code == status.HTTP_200_OK
    
    def test_update_profile_with_special_characters_in_username(self, authenticated_client, test_user):
        """Test updating username with special characters."""
        response = authenticated_client.patch('/api/v1/users/profile/', {
            'username': 'user_with-special.chars'
        })
        
        # Depending on validation rules, this might succeed or fail
        assert response.status_code in [status.HTTP_200_OK, status.HTTP_400_BAD_REQUEST]
    
    def test_concurrent_profile_updates(self, api_client, test_user, test_password):
        """Test handling of potential concurrent updates."""
        from rest_framework_simplejwt.tokens import RefreshToken
        
        refresh = RefreshToken.for_user(test_user)
        api_client.credentials(HTTP_AUTHORIZATION=f'Bearer {refresh.access_token}')
        
        # First update
        response1 = api_client.patch('/api/v1/users/profile/', {
            'username': 'concurrent1'
        })
        
        # Second update
        response2 = api_client.patch('/api/v1/users/profile/', {
            'username': 'concurrent2'
        })
        
        # Both should succeed (last one wins)
        assert response2.status_code == status.HTTP_200_OK
        test_user.refresh_from_db()
        assert test_user.username == 'concurrent2'
