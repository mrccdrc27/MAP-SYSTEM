# management/commands/seed_accounts.py
import uuid
from django.core.management.base import BaseCommand
from django.contrib.auth import get_user_model
from role.models import Roles
from faker import Faker
import random

User = get_user_model()
fake = Faker()

class Command(BaseCommand):
    help = 'Seed database with roles and users'

    def handle(self, *args, **options):
        self.stdout.write('Starting to seed accounts data...')
        
        # Create roles first
        self.create_roles()
        
        # Create users
        self.create_users()
        
        self.stdout.write(
            self.style.SUCCESS('Successfully seeded accounts data!')
        )

    def create_roles(self):
        """Create 4 predefined roles"""
        roles_data = [
            {
                'name': 'Admin',
                'description': 'System administrator with full access to all features and settings'
            },
            {
                'name': 'Manager',
                'description': 'Department manager with access to team management and reporting features'
            },
            {
                'name': 'Employee',
                'description': 'Regular employee with access to basic features and personal data'
            },
            {
                'name': 'Guest',
                'description': 'Limited access user with read-only permissions to public content'
            }
        ]
        
        created_roles = []
        for role_data in roles_data:
            role, created = Roles.objects.get_or_create(
                name=role_data['name'],
                defaults={
                    'role_id': str(uuid.uuid4()),
                    'description': role_data['description']
                }
            )
            if created:
                self.stdout.write(f'Created role: {role.name}')
            else:
                self.stdout.write(f'Role already exists: {role.name}')
            created_roles.append(role)
        
        return created_roles

    def create_users(self):
        """Create 20 users with realistic data"""
        roles = list(Roles.objects.all())
        
        # Predefined users for testing
        predefined_users = [
            {
                'first_name': 'John',
                'last_name': 'Doe',
                'middle_name': 'Michael',
                'email': 'cubecore27+1@gmail.com',
                'username': 'johndoe',
                'phone_number': '+1234567890',
                'role': 'Admin'
            },
            {
                'first_name': 'Jane',
                'last_name': 'Smith',
                'middle_name': 'Elizabeth',
                'email': 'cubecore27+2@gmail.com',
                'username': 'janesmith',
                'phone_number': '+1234567891',
                'role': 'Manager'
            },
            {
                'first_name': 'Bob',
                'last_name': 'Johnson',
                'middle_name': '',
                'email': 'cubecore27+3@gmail.com',
                'username': 'bobjohnson',
                'phone_number': '+1234567892',
                'role': 'Employee'
            },
            {
                'first_name': 'Alice',
                'last_name': 'Brown',
                'middle_name': 'Marie',
                'email': 'cubecore27+4@gmail.com',
                'username': 'alicebrown',
                'phone_number': '+1234567893',
                'role': 'Guest'
            }
        ]
        
        created_count = 0
        
        # Create predefined users
        for user_data in predefined_users:
            role = next((r for r in roles if r.name == user_data['role']), None)
            if role:
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
                    }
                )
                if created:
                    user.set_password('password123')  # Default password
                    user.save()
                    created_count += 1
                    self.stdout.write(f'Created user: {user.email} ({role.name})')
                else:
                    self.stdout.write(f'User already exists: {user.email}')
        
        # Create remaining random users to reach 20 total
        existing_users_count = User.objects.count()
        remaining_users = 10 - existing_users_count
        
        if remaining_users > 0:
            for i in range(remaining_users):
                # Generate unique email
                email = f"cubecore27+{i + 5}@gmail.com"
                # Ensure email doesn't already exist
                while User.objects.filter(email=email).exists():
                    i += 1
                    email = f"cubecore27+{i + 5}@gmail.com"

                
                # Generate username from email
                username = email.split('@')[0] + str(random.randint(100, 999))
                
                # Ensure username is unique
                while User.objects.filter(username=username).exists():
                    username = email.split('@')[0] + str(random.randint(100, 9999))
                
                # Generate phone number
                phone_number = f"+1{random.randint(2000000000, 9999999999)}"
                
                # Random role distribution (weighted)
                role_weights = {
                    'Employee': 0.5,    # 50% employees
                    'Manager': 0.25,    # 25% managers
                    'Admin': 0.15,      # 15% admins
                    'Guest': 0.1        # 10% guests
                }
                role_name = random.choices(
                    list(role_weights.keys()),
                    weights=list(role_weights.values())
                )[0]
                role = next(r for r in roles if r.name == role_name)
                
                user = User.objects.create(
                    username=username,
                    email=email,
                    first_name=fake.first_name(),
                    last_name=fake.last_name(),
                    middle_name=fake.first_name() if random.choice([True, False]) else '',
                    phone_number=phone_number,
                    role=role,
                    is_active=True,
                )
                user.set_password('password123')  # Default password
                user.save()
                created_count += 1
                self.stdout.write(f'Created user: {user.email} ({role.name})')
        
        self.stdout.write(f'Total users created: {created_count}')
        self.stdout.write(f'Total users in database: {User.objects.count()}')

# Alternative: Simple seed script (place in project root)
# seed_accounts.py

import os
import django
import uuid
from faker import Faker
import random

# Setup Django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'your_project.settings')
django.setup()

from django.contrib.auth import get_user_model
from role.models import Roles

User = get_user_model()
fake = Faker()

def seed_accounts():
    print("Starting to seed accounts data...")
    
    # Create roles
    roles_data = [
        {'name': 'Admin', 'description': 'System administrator with full access'},
        {'name': 'Manager', 'description': 'Department manager with team access'},
        {'name': 'Employee', 'description': 'Regular employee with basic access'},
        {'name': 'Guest', 'description': 'Limited access user with read-only permissions'}
    ]
    
    roles = []
    for role_data in roles_data:
        role, created = Roles.objects.get_or_create(
            name=role_data['name'],
            defaults={
                'role_id': str(uuid.uuid4()),
                'description': role_data['description']
            }
        )
        roles.append(role)
        if created:
            print(f"Created role: {role.name}")
    
    # Sample user data
    sample_users = [
        {'first_name': 'John', 'last_name': 'Doe', 'email': 'john.doe@example.com', 'role': 'Admin'},
        {'first_name': 'Jane', 'last_name': 'Smith', 'email': 'jane.smith@example.com', 'role': 'Manager'},
        {'first_name': 'Bob', 'last_name': 'Johnson', 'email': 'bob.johnson@example.com', 'role': 'Employee'},
        {'first_name': 'Alice', 'last_name': 'Brown', 'email': 'alice.brown@example.com', 'role': 'Guest'},
    ]
    
    # Create sample users
    for user_data in sample_users:
        role = Roles.objects.get(name=user_data['role'])
        user, created = User.objects.get_or_create(
            email=user_data['email'],
            defaults={
                'username': user_data['email'].split('@')[0],
                'first_name': user_data['first_name'],
                'last_name': user_data['last_name'],
                'phone_number': f"+1{random.randint(2000000000, 9999999999)}",
                'role': role,
                'is_active': True,
            }
        )
        if created:
            user.set_password('password123')
            user.save()
            print(f"Created user: {user.email}")
    
    # Create remaining random users
    existing_count = User.objects.count()