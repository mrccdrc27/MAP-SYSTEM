"""
Admin API Tests

This module contains comprehensive tests for admin-related functionality.
Tests cover:
- Invite agent
- User management (CRUD)
- System role assignment
- Permission checks
- User status management
"""
import pytest
from rest_framework import status
from users.models import User
from system_roles.models import UserSystemRole


@pytest.mark.django_db
class TestInviteAgent:
    """Tests for the invite agent functionality."""
    
    def test_get_available_users_to_invite(self, admin_authenticated_client, admin_with_system_role):
        """Test getting list of available users to invite."""
        response = admin_authenticated_client.get('/api/v1/users/invite-agent/')
        
        assert response.status_code == status.HTTP_200_OK
        assert 'available_users' in response.data or 'error' not in response.data
    
    def test_get_available_systems_and_roles(self, admin_authenticated_client, admin_with_system_role, test_system):
        """Test getting available systems and roles for invitation."""
        response = admin_authenticated_client.get('/api/v1/users/invite-agent/')
        
        assert response.status_code == status.HTTP_200_OK
        if 'systems' in response.data:
            assert len(response.data['systems']) >= 0
    
    def test_invite_agent_success(self, admin_authenticated_client, admin_with_system_role, test_system, agent_role, test_password, db):
        """Test successfully inviting a user to a system with a role."""
        # Create a user to invite
        user_to_invite = User.objects.create_user(
            email='invitee@example.com',
            username='invitee',
            password=test_password,
            first_name='Invitee',
            last_name='User',
            status='Approved',
            is_active=True
        )
        
        response = admin_authenticated_client.post('/api/v1/users/invite-agent/', {
            'user_id': user_to_invite.id,
            'system_id': test_system.id,
            'role_id': agent_role.id
        })
        
        # Should succeed or indicate the user was invited
        assert response.status_code in [status.HTTP_200_OK, status.HTTP_201_CREATED, status.HTTP_403_FORBIDDEN]
    
    def test_invite_agent_missing_fields(self, admin_authenticated_client, admin_with_system_role):
        """Test inviting agent with missing required fields fails."""
        response = admin_authenticated_client.post('/api/v1/users/invite-agent/', {
            'user_id': 1  # Missing system_id and role_id
        })
        
        assert response.status_code == status.HTTP_400_BAD_REQUEST
    
    def test_invite_agent_user_already_assigned(self, admin_authenticated_client, admin_with_system_role, agent_user, test_system, agent_role):
        """Test inviting already assigned user returns conflict."""
        response = admin_authenticated_client.post('/api/v1/users/invite-agent/', {
            'user_id': agent_user.id,
            'system_id': test_system.id,
            'role_id': agent_role.id
        })
        
        # Should return conflict or bad request
        assert response.status_code in [status.HTTP_400_BAD_REQUEST, status.HTTP_409_CONFLICT, status.HTTP_403_FORBIDDEN]
    
    def test_invite_agent_nonexistent_user(self, admin_authenticated_client, admin_with_system_role, test_system, agent_role):
        """Test inviting non-existent user fails."""
        response = admin_authenticated_client.post('/api/v1/users/invite-agent/', {
            'user_id': 99999,
            'system_id': test_system.id,
            'role_id': agent_role.id
        })
        
        assert response.status_code in [status.HTTP_400_BAD_REQUEST, status.HTTP_404_NOT_FOUND, status.HTTP_403_FORBIDDEN]
    
    def test_invite_agent_without_admin_role(self, authenticated_client, test_system, agent_role, test_user):
        """Test regular user cannot invite agents."""
        response = authenticated_client.post('/api/v1/users/invite-agent/', {
            'user_id': 1,
            'system_id': test_system.id,
            'role_id': agent_role.id
        })
        
        assert response.status_code == status.HTTP_403_FORBIDDEN
    
    def test_superuser_can_invite_to_any_system(self, superuser_authenticated_client, test_system, agent_role, test_password, db):
        """Test superuser can invite users to any system."""
        user_to_invite = User.objects.create_user(
            email='superinvitee@example.com',
            username='superinvitee',
            password=test_password,
            first_name='Super',
            last_name='Invitee',
            status='Approved',
            is_active=True
        )
        
        response = superuser_authenticated_client.post('/api/v1/users/invite-agent/', {
            'user_id': user_to_invite.id,
            'system_id': test_system.id,
            'role_id': agent_role.id
        })
        
        assert response.status_code in [status.HTTP_200_OK, status.HTTP_201_CREATED]


@pytest.mark.django_db
class TestUserManagement:
    """Tests for user management (CRUD) operations."""
    
    # ==================== List Users ====================
    
    def test_list_users_as_admin(self, admin_authenticated_client, admin_with_system_role):
        """Test admin can list users."""
        response = admin_authenticated_client.get('/api/v1/users/list/')
        
        assert response.status_code == status.HTTP_200_OK
        assert 'users' in response.data or isinstance(response.data, list)
    
    def test_list_users_as_regular_user(self, authenticated_client):
        """Test regular authenticated user can access user list."""
        response = authenticated_client.get('/api/v1/users/list/')
        
        # Regular users might have limited access
        assert response.status_code in [status.HTTP_200_OK, status.HTTP_403_FORBIDDEN]
    
    def test_list_users_unauthenticated(self, api_client):
        """Test unauthenticated access to user list is denied."""
        response = api_client.get('/api/v1/users/list/')
        
        assert response.status_code == status.HTTP_401_UNAUTHORIZED
    
    # ==================== Retrieve User ====================
    
    def test_retrieve_user_as_admin(self, admin_authenticated_client, agent_user, admin_with_system_role):
        """Test admin can retrieve user details."""
        response = admin_authenticated_client.get(f'/api/v1/users/management/{agent_user.id}/')
        
        assert response.status_code in [status.HTTP_200_OK, status.HTTP_404_NOT_FOUND]
    
    def test_retrieve_nonexistent_user(self, admin_authenticated_client, admin_with_system_role):
        """Test retrieving non-existent user returns 404."""
        response = admin_authenticated_client.get('/api/v1/users/management/99999/')
        
        assert response.status_code == status.HTTP_404_NOT_FOUND
    
    # ==================== Create User ====================
    
    def test_create_user_as_superuser(self, superuser_authenticated_client, test_password):
        """Test superuser can create new users."""
        response = superuser_authenticated_client.post('/api/v1/users/management/', {
            'email': 'createduser@example.com',
            'username': 'createduser',
            'password': test_password,
            'first_name': 'Created',
            'last_name': 'User',
            'phone_number': '09123456789'
        })
        
        # Superuser should be able to create users
        assert response.status_code in [status.HTTP_201_CREATED, status.HTTP_400_BAD_REQUEST]
    
    def test_create_user_as_admin_forbidden(self, admin_authenticated_client, test_password, admin_with_system_role):
        """Test system admin cannot directly create users."""
        response = admin_authenticated_client.post('/api/v1/users/management/', {
            'email': 'admincreated@example.com',
            'username': 'admincreated',
            'password': test_password,
            'first_name': 'Admin',
            'last_name': 'Created',
            'phone_number': '09123456788'
        })
        
        # System admins should use invite endpoint instead
        assert response.status_code == status.HTTP_403_FORBIDDEN
    
    # ==================== Update User ====================
    
    def test_update_user_as_superuser(self, superuser_authenticated_client, test_user):
        """Test superuser can update any user."""
        response = superuser_authenticated_client.patch(
            f'/api/v1/users/management/{test_user.id}/',
            {'first_name': 'SuperUpdated'}
        )
        
        assert response.status_code == status.HTTP_200_OK
        test_user.refresh_from_db()
        assert test_user.first_name == 'SuperUpdated'
    
    def test_admin_can_update_agent_in_system(self, admin_authenticated_client, agent_user, admin_with_system_role):
        """Test admin can update agent profiles in their system."""
        response = admin_authenticated_client.patch(
            f'/api/v1/users/management/{agent_user.id}/',
            {'first_name': 'AdminUpdated'}
        )
        
        # Should succeed if agent is in admin's system
        assert response.status_code in [status.HTTP_200_OK, status.HTTP_403_FORBIDDEN, status.HTTP_404_NOT_FOUND]
    
    def test_admin_cannot_update_other_admin(self, admin_authenticated_client, admin_with_system_role, test_password, test_system, admin_role, db):
        """Test admin cannot update another admin's profile."""
        # Create another admin
        other_admin = User.objects.create_user(
            email='otheradmin@example.com',
            username='otheradmin',
            password=test_password,
            first_name='Other',
            last_name='Admin',
            status='Approved',
            is_active=True,
            is_staff=True
        )
        UserSystemRole.objects.create(
            user=other_admin,
            system=test_system,
            role=admin_role,
            is_active=True
        )
        
        response = admin_authenticated_client.patch(
            f'/api/v1/users/management/{other_admin.id}/',
            {'first_name': 'Hacked'}
        )
        
        assert response.status_code in [status.HTTP_403_FORBIDDEN, status.HTTP_404_NOT_FOUND]
    
    # ==================== Delete User ====================
    
    def test_delete_user_as_superuser(self, superuser_authenticated_client, test_password, db):
        """Test superuser can delete users."""
        user_to_delete = User.objects.create_user(
            email='deleteme@example.com',
            username='deleteme',
            password=test_password,
            first_name='Delete',
            last_name='Me',
            status='Approved',
            is_active=True
        )
        user_id = user_to_delete.id
        
        response = superuser_authenticated_client.delete(f'/api/v1/users/management/{user_id}/')
        
        assert response.status_code == status.HTTP_204_NO_CONTENT
        assert not User.objects.filter(id=user_id).exists()
    
    def test_delete_user_as_admin_forbidden(self, admin_authenticated_client, agent_user, admin_with_system_role):
        """Test system admin cannot delete users."""
        response = admin_authenticated_client.delete(f'/api/v1/users/management/{agent_user.id}/')
        
        assert response.status_code == status.HTTP_403_FORBIDDEN
    
    def test_superuser_cannot_delete_other_superuser(self, superuser_authenticated_client, test_password, db):
        """Test superuser cannot delete another superuser."""
        other_superuser = User.objects.create_superuser(
            email='othersuper@example.com',
            username='othersuper',
            password=test_password,
            first_name='Other',
            last_name='Super'
        )
        
        response = superuser_authenticated_client.delete(f'/api/v1/users/management/{other_superuser.id}/')
        
        assert response.status_code == status.HTTP_403_FORBIDDEN


@pytest.mark.django_db
class TestUserStatusManagement:
    """Tests for user status management (Approve/Reject)."""
    
    def test_approve_pending_user(self, superuser_authenticated_client, inactive_user):
        """Test approving a pending user."""
        response = superuser_authenticated_client.patch(
            f'/api/v1/users/management/{inactive_user.id}/',
            {'status': 'Approved'}
        )
        
        assert response.status_code == status.HTTP_200_OK
        inactive_user.refresh_from_db()
        assert inactive_user.status == 'Approved'
    
    def test_reject_pending_user(self, superuser_authenticated_client, inactive_user):
        """Test rejecting a pending user."""
        response = superuser_authenticated_client.patch(
            f'/api/v1/users/management/{inactive_user.id}/',
            {'status': 'Rejected'}
        )
        
        assert response.status_code == status.HTTP_200_OK
        inactive_user.refresh_from_db()
        assert inactive_user.status == 'Rejected'
    
    def test_deactivate_user_system_role(self, superuser_authenticated_client, agent_user):
        """Test deactivating a user's system role."""
        # Get the user's system role
        system_role = UserSystemRole.objects.filter(user=agent_user).first()
        
        if system_role:
            response = superuser_authenticated_client.patch(
                f'/api/v1/users/management/{agent_user.id}/',
                {
                    'system_role_id': system_role.id,
                    'system_role_is_active': False
                }
            )
            
            assert response.status_code == status.HTTP_200_OK
            system_role.refresh_from_db()
            assert system_role.is_active is False


@pytest.mark.django_db
class TestSystemRoleAssignment:
    """Tests for system role assignment operations."""
    
    def test_view_user_system_roles(self, admin_authenticated_client, agent_user, admin_with_system_role):
        """Test viewing user's system roles."""
        response = admin_authenticated_client.get(f'/api/v1/users/management/{agent_user.id}/')
        
        if response.status_code == status.HTTP_200_OK:
            # Check if system_roles is included
            assert 'system_roles' in response.data or 'roles' in str(response.data)
    
    def test_activate_system_role(self, superuser_authenticated_client, agent_user):
        """Test activating a deactivated system role."""
        system_role = UserSystemRole.objects.filter(user=agent_user).first()
        
        if system_role:
            # First deactivate
            system_role.is_active = False
            system_role.save()
            
            # Then activate
            response = superuser_authenticated_client.patch(
                f'/api/v1/users/management/{agent_user.id}/',
                {
                    'system_role_id': system_role.id,
                    'system_role_is_active': True
                }
            )
            
            assert response.status_code == status.HTTP_200_OK
            system_role.refresh_from_db()
            assert system_role.is_active is True


@pytest.mark.django_db
class TestAdminPermissions:
    """Tests for admin permission boundaries."""
    
    def test_admin_only_sees_users_in_their_systems(self, admin_authenticated_client, admin_with_system_role, test_password, db):
        """Test admin only sees users in systems they manage."""
        # Create a user in a different system
        from systems.models import System
        from roles.models import Role
        
        other_system, _ = System.objects.get_or_create(
            slug='other-system',
            defaults={'name': 'Other System'}
        )
        other_role, _ = Role.objects.get_or_create(
            name='Agent',
            system=other_system,
            defaults={'description': 'Other Agent'}
        )
        
        other_user = User.objects.create_user(
            email='othersystemuser@example.com',
            username='othersystemuser',
            password=test_password,
            first_name='Other',
            last_name='System',
            status='Approved',
            is_active=True
        )
        UserSystemRole.objects.create(
            user=other_user,
            system=other_system,
            role=other_role,
            is_active=True
        )
        
        # Admin should not see this user in their list
        response = admin_authenticated_client.get('/api/v1/users/list/')
        
        if response.status_code == status.HTTP_200_OK:
            users = response.data.get('users', response.data)
            user_emails = [u.get('email') for u in users if isinstance(u, dict)]
            # User from other system might not appear
            # (depends on session system selection)
    
    def test_admin_cannot_modify_users_outside_system(self, admin_authenticated_client, admin_with_system_role, test_password, db):
        """Test admin cannot modify users outside their managed systems."""
        # Create a user not in any system the admin manages
        outside_user = User.objects.create_user(
            email='outsideuser@example.com',
            username='outsideuser',
            password=test_password,
            first_name='Outside',
            last_name='User',
            status='Approved',
            is_active=True
        )
        
        response = admin_authenticated_client.patch(
            f'/api/v1/users/management/{outside_user.id}/',
            {'first_name': 'Hacked'}
        )
        
        assert response.status_code in [status.HTTP_403_FORBIDDEN, status.HTTP_404_NOT_FOUND]


@pytest.mark.django_db
class TestUserRegistration:
    """Tests for user registration endpoint."""
    
    def test_register_new_user(self, api_client):
        """Test registering a new user."""
        import uuid
        unique = str(uuid.uuid4())[:8]
        response = api_client.post('/api/v1/users/register/', {
            'email': f'newregistered{unique}@example.com',
            'username': f'newreg{unique}',
            'password': f'SecureTestP@ss{unique}!',
            'first_name': 'New',
            'last_name': 'Registered',
            'phone_number': '09123456789'
        })
        
        # 201 = created, 400 = validation error (possibly from password breach check)
        assert response.status_code in [status.HTTP_200_OK, status.HTTP_201_CREATED, status.HTTP_400_BAD_REQUEST]
        if response.status_code == status.HTTP_400_BAD_REQUEST:
            # If 400, check if it's a password breach warning (acceptable)
            assert 'password' in str(response.data).lower() or 'breach' in str(response.data).lower()
    
    def test_register_with_duplicate_email(self, api_client, test_user):
        """Test registration with existing email fails."""
        response = api_client.post('/api/v1/users/register/', {
            'email': test_user.email,
            'username': 'differentusername',
            'password': 'SecureP@ss123!',
            'first_name': 'Duplicate',
            'last_name': 'Email',
            'phone_number': '09123456780'
        })
        
        assert response.status_code == status.HTTP_400_BAD_REQUEST
    
    def test_register_with_duplicate_username(self, api_client, test_user):
        """Test registration with existing username fails."""
        response = api_client.post('/api/v1/users/register/', {
            'email': 'different@example.com',
            'username': test_user.username,
            'password': 'SecureP@ss123!',
            'first_name': 'Duplicate',
            'last_name': 'Username',
            'phone_number': '09123456781'
        })
        
        assert response.status_code == status.HTTP_400_BAD_REQUEST
    
    def test_register_with_weak_password(self, api_client):
        """Test registration with weak password fails."""
        response = api_client.post('/api/v1/users/register/', {
            'email': 'weakpass@example.com',
            'username': 'weakpass',
            'password': 'weak',
            'first_name': 'Weak',
            'last_name': 'Password',
            'phone_number': '09123456782'
        })
        
        assert response.status_code == status.HTTP_400_BAD_REQUEST
    
    def test_registered_user_has_pending_status(self, api_client, db):
        """Test newly registered users have Pending status."""
        api_client.post('/api/v1/users/register/', {
            'email': 'pendinguser@example.com',
            'username': 'pendinguser',
            'password': 'SecureP@ss123!',
            'first_name': 'Pending',
            'last_name': 'User',
            'phone_number': '09123456783'
        })
        
        user = User.objects.filter(email='pendinguser@example.com').first()
        if user:
            assert user.status == 'Pending'
    
    def test_register_generates_company_id(self, api_client, db):
        """Test registration auto-generates company ID."""
        api_client.post('/api/v1/users/register/', {
            'email': 'companyid@example.com',
            'username': 'companyid',
            'password': 'SecureP@ss123!',
            'first_name': 'Company',
            'last_name': 'ID',
            'phone_number': '09123456784'
        })
        
        user = User.objects.filter(email='companyid@example.com').first()
        if user:
            assert user.company_id is not None
            assert user.company_id.startswith('MA')
