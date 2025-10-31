from django.core.management.base import BaseCommand
from django.contrib.auth import get_user_model
from roles.models import Role
from systems.models import System
from system_roles.models import UserSystemRole

User = get_user_model()

class Command(BaseCommand):
    help = 'Seed database with predefined roles and users for the TTS system.'

    def handle(self, *args, **options):
        self.stdout.write('Seeding roles and users for the TTS system...')
        self.create_roles()
        self.create_users()
        self.stdout.write(self.style.SUCCESS('Done seeding roles and users for the TTS system.'))

    def create_roles(self):
        """Create roles specific to the TTS system."""
        self.roles = {}
        roles_data = [
            {'name': 'Admin', 'description': 'System administrator with full access'},
            {'name': 'Asset Manager', 'description': 'Manages digital assets and metadata'},
            {'name': 'Budget Manager', 'description': 'Oversees budget allocation and approvals'},
        ]

        try:
            self.tts_system = System.objects.get(slug='tts')
            for role_data in roles_data:
                role, created = Role.objects.get_or_create(
                    system=self.tts_system,
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
            self.stdout.write(self.style.ERROR('TTS system does not exist. Please create the system first.'))
            self.tts_system = None

    def create_users(self):
        """Create predefined users for the TTS system."""
        if not self.tts_system:
            return

        predefined_users = [
            {
                'first_name': 'Marc Cedric',
                'last_name': 'Mayuga',
                'email': 'burnthisway22@gmail.com',
                'username': 'marco',
                'phone_number': '+10000000002',
                'role': 'Admin',
                'is_staff': True,
                'profile_picture': 'https://i.pinimg.com/736x/63/92/24/639224f094deff2ebf9cd261fba24004.jpg',
            },
            {
                'first_name': 'John',
                'last_name': 'Doe',
                'email': 'burnthisway22+1@gmail.com',
                'username': 'admin1',  # Updated username to avoid conflict
                'phone_number': '+10000000011',  # Updated phone number to ensure uniqueness
                'role': 'Admin',
                'is_staff': True,
                'profile_picture': 'https://i.pinimg.com/736x/63/92/24/639224f094deff2ebf9cd261fba24004.jpg',
            },
            {
                'first_name': 'Jane',
                'last_name': 'Smith',
                'email': 'burnthisway22+2@gmail.com',
                'username': 'assetmanager',
                'phone_number': '+10000000012',  # Updated phone number to ensure uniqueness
                'role': 'Asset Manager',
                'is_staff': False,
                'profile_picture': 'https://i.pinimg.com/736x/d6/4f/ad/d64fad416c52bee461fc185a0118aba8.jpg',
            },
            {
                'first_name': 'Bob',
                'last_name': 'Johnson',
                'email': 'burnthisway22+3@gmail.com',
                'username': 'budgetmanager',
                'phone_number': '+10000000013',  # Updated phone number to ensure uniqueness
                'role': 'Budget Manager',
                'is_staff': False,
                'profile_picture': 'https://i.pinimg.com/736x/55/29/f1/5529f10dd54c309092226f0f4b57a15d.jpg',
            },
            {
                'first_name': 'Alice',
                'last_name': 'Williams',
                'email': 'burnthisway22+4@gmail.com',
                'username': 'assetstaff',
                'phone_number': '+10000000014',  # Updated phone number to ensure uniqueness
                'role': 'Asset Manager',
                'is_staff': False,
                'profile_picture': 'https://i.pinimg.com/736x/15/78/a3/1578a3c53f3e4d29e9e1b79bd4d3f7c4.jpg',
            },
        ]

        for user_data in predefined_users:
            role = self.roles.get(user_data['role'])
            if not role:
                self.stdout.write(self.style.ERROR(f"Role '{user_data['role']}' does not exist. Skipping user {user_data['email']}"))
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
            
            # Now create or update the UserSystemRole with simplified structure
            try:
                user_role, ur_created = UserSystemRole.objects.get_or_create(
                    user=user,
                    system=self.tts_system,
                    role=role
                )
                
                if ur_created:
                    self.stdout.write(f'Assigned role {role.name} to {user.email} in {self.tts_system.name} system')
                else:
                    self.stdout.write(f'User {user.email} already has role {role.name} in {self.tts_system.name} system')
            except Exception as e:
                self.stdout.write(self.style.ERROR(f'Error assigning role to user: {str(e)}'))
                # Print more debug information
                self.stdout.write(self.style.WARNING(f"Available fields in UserSystemRole: {[f.name for f in UserSystemRole._meta.get_fields()]}"))