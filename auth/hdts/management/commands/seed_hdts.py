from django.core.management.base import BaseCommand
from django.contrib.auth import get_user_model
from roles.models import Role
from systems.models import System
from system_roles.models import UserSystemRole

User = get_user_model()

class Command(BaseCommand):
    help = 'Seed database with predefined roles and users for the hdts system.'

    def handle(self, *args, **options):
        self.stdout.write('Seeding roles and users for the hdts system...')
        self.create_roles()
        self.create_users()
        self.stdout.write(self.style.SUCCESS('Done seeding roles and users for the hdts system.'))

    def create_roles(self):
        """Create roles specific to the hdts system."""
        self.roles = {}
        roles_data = [
            {'name': 'Admin', 'description': 'System administrator with full access'},
            {'name': 'Employee', 'description': 'Company Employee'},
            {'name': 'Ticket Coordinator', 'description': 'Manages Ticket Approval'},
        ]

        try:
            self.hdts_system = System.objects.get(slug='hdts')
            for role_data in roles_data:
                role, created = Role.objects.get_or_create(
                    system=self.hdts_system,
                    name=role_data['name'],
                    defaults={
                        'description': role_data['description']
                    }
                )
                self.roles[role.name] = role
                if created:
                    self.stdout.write(f'Created role: {role.name}')
                else:
                    self.stdout.write(f'Role already exists: {role.name}')
        except System.DoesNotExist:
            self.stdout.write(self.style.ERROR('hdts system does not exist. Please create the system first.'))
            self.hdts_system = None

    def create_users(self):
        """Create predefined users for the hdts system."""
        if not self.hdts_system:
            return

        # Updated user data with different names, emails, and usernames
        predefined_users = [
            {
                'first_name': 'Alex',
                'last_name': 'Johnson',
                'email': 'alex.johnson@example.com',
                'username': 'alexj',
                'phone_number': '+639170000001',
                'role': 'Ticket Coordinator',
                'is_staff': True,
                'profile_picture': 'https://i.pinimg.com/736x/63/92/24/639224f094deff2ebf9cd261fba24004.jpg',
            },
            {
                'first_name': 'Maria',
                'last_name': 'Garcia',
                'email': 'maria.garcia@example.com',
                'username': 'mariag',
                'phone_number': '+639170000002',
                'role': 'Ticket Coordinator',
                'is_staff': False,
                'profile_picture': 'https://i.pinimg.com/736x/d6/4f/ad/d64fad416c52bee461fc185a0118aba8.jpg',
            },
            {
                'first_name': 'David',
                'last_name': 'Lee',
                'email': 'david.lee@example.com',
                'username': 'davidl',
                'phone_number': '+639170000003',
                'role': 'Admin',
                'is_staff': False,
                'profile_picture': 'https://i.pinimg.com/736x/55/29/f1/5529f10dd54c309092226f0f4b57a15d.jpg',
            },
            {
                'first_name': 'Sarah',
                'last_name': 'Chen',
                'email': 'sarah.chen@example.com',
                'username': 'sarahc',
                'phone_number': '+639170000004',
                'role': 'Employee',
                'is_staff': False,
                'profile_picture': 'https://i.pinimg.com/736x/15/78/a3/1578a3c53f3e4d29e9e1b79bd4d3f7c4.jpg',
            },
            {
                'first_name': 'Chris',
                'last_name': 'Wilson',
                'email': 'chris.wilson@example.com',
                'username': 'chrisw',
                'phone_number': '+639170000005',
                'role': 'Employee',
                'is_staff': False,
                'profile_picture': 'https://i.pinimg.com/736x/63/92/24/639224f094deff2ebf9cd261fba24004.jpg',
            },
        ]

        for user_data in predefined_users:
            role = self.roles.get(user_data['role'])
            if not role:
                self.stdout.write(self.style.ERROR(f"Role '{user_data['role']}' does not exist in self.roles. Skipping user {user_data['email']}"))
                continue

            user, created = User.objects.get_or_create(
                email=user_data['email'],
                defaults={
                    'username': user_data['username'],
                    'first_name': user_data['first_name'],
                    'last_name': user_data['last_name'],
                    'phone_number': user_data['phone_number'],
                    'is_active': True,
                    'is_staff': user_data['is_staff'],
                }
            )
            if created:
                user.set_password('password123')  # Default password
                user.save()
                self.stdout.write(f'Created user: {user.email} ({role.name})')
            else:
                self.stdout.write(f'User already exists: {user.email}')
            
            # Now create or update the UserSystemRole
            try:
                user_role, ur_created = UserSystemRole.objects.get_or_create(
                    user=user,
                    system=self.hdts_system,
                    role=role
                )
                
                if ur_created:
                    self.stdout.write(f'Assigned role {role.name} to {user.email} in {self.hdts_system.name} system')
                else:
                    self.stdout.write(f'User {user.email} already has role {role.name} in {self.hdts_system.name} system')
            except Exception as e:
                self.stdout.write(self.style.ERROR(f'Error assigning role to user: {str(e)}'))
                self.stdout.write(self.style.WARNING(f"Available fields in UserSystemRole: {[f.name for f in UserSystemRole._meta.get_fields()]}"))