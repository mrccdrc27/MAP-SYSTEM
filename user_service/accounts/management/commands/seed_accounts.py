# management/commands/seed_accounts.py

import uuid
from django.core.management.base import BaseCommand
from django.contrib.auth import get_user_model
from role.models import Roles

User = get_user_model()

class Command(BaseCommand):
    help = 'Seed database with predefined roles and users using default lawrencearellanoafable+N@gmail.com emails'

    def handle(self, *args, **options):
        self.stdout.write('Seeding roles and users...')
        self.create_roles()
        self.create_users()
        self.stdout.write(self.style.SUCCESS('Done seeding roles and users.'))

    def create_roles(self):
        """Create only the required roles."""
        self.roles = {}
        roles_data = [
            {'name': 'Admin', 'description': 'System administrator with full access'},
            {'name': 'Asset Manager', 'description': 'Manages digital assets and metadata'},
            {'name': 'Budget Manager', 'description': 'Oversees budget allocation and approvals'},
        ]

        for role_data in roles_data:
            role, created = Roles.objects.get_or_create(
                name=role_data['name'],
                defaults={
                    'role_id': str(uuid.uuid4()),
                    'description': role_data['description']
                }
            )
            self.roles[role.name] = role
            if created:
                self.stdout.write(f'Created role: {role.name}')
            else:
                self.stdout.write(f'Role already exists: {role.name}')

    def create_users(self):
        """Create five users using default lawrencearellanoafable+N@gmail.com email format."""
        predefined_users = [
            {
                'first_name': 'Marc Cedric',
                'last_name': 'Mayuga',
                'middle_name': 'Cortes',
                'email': 'lawrencearellanoafable@gmail.com',
                'username': 'marco',
                'phone_number': '+10000000002',
                'role': 'Admin',
                'is_staff': True,
                'profile_picture': 'https://i.pinimg.com/736x/63/92/24/639224f094deff2ebf9cd261fba24004.jpg',
            },
            {
                'first_name': 'John',
                'last_name': 'Doe',
                'middle_name': 'Michael',
                'email': 'lawrencearellanoafable+1@gmail.com',
                'username': 'admin',
                'phone_number': '+10000000001',
                'role': 'Admin',
                'is_staff': True,
                'profile_picture': 'https://i.pinimg.com/736x/63/92/24/639224f094deff2ebf9cd261fba24004.jpg',
            },
            {
                'first_name': 'Jane',
                'last_name': 'Smith',
                'middle_name': 'Elizabeth',
                'email': 'lawrencearellanoafable+2@gmail.com',
                'username': 'assetmanager',
                'phone_number': '+10000000002',
                'role': 'Asset Manager',
                'is_staff': False,
                'profile_picture': 'https://i.pinimg.com/736x/d6/4f/ad/d64fad416c52bee461fc185a0118aba8.jpg',
            },
            {
                'first_name': 'Bob',
                'last_name': 'Johnson',
                'middle_name': '',
                'email': 'lawrencearellanoafable+3@gmail.com',
                'username': 'budgetmanager',
                'phone_number': '+10000000003',
                'role': 'Budget Manager',
                'is_staff': False,
                'profile_picture': 'https://i.pinimg.com/736x/55/29/f1/5529f10dd54c309092226f0f4b57a15d.jpg',
            },
            {
                'first_name': 'Alice',
                'last_name': 'Williams',
                'middle_name': 'Grace',
                'email': 'lawrencearellanoafable+4@gmail.com',
                'username': 'assetstaff',
                'phone_number': '+10000000004',
                'role': 'Asset Manager',
                'is_staff': False,
                'profile_picture': 'https://i.pinimg.com/736x/15/78/a3/1578a3c53f3e4d29e9e1b79bd4d3f7c4.jpg',
            },
        ]

        for user_data in predefined_users:
            role = self.roles[user_data['role']]
            user, created = User.objects.get_or_create(
                email=user_data['email'],
                defaults={
                    'username': user_data['username'],
                    'first_name': user_data['first_name'],
                    'last_name': user_data['last_name'],
                    'middle_name': user_data['middle_name'],
                    'phone_number': user_data['phone_number'],
                    'role': role,
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
