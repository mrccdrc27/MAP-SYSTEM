"""
BMS (Budget Management System) Seeder

This management command creates BMS-specific roles and users in the Auth service.
It ensures that the BMS system exists with proper roles and test users that can
authenticate and access the BMS budget_service APIs.

Roles:
- ADMIN: Full access to all BMS features
- FINANCE_HEAD: Budget approval, financial reports, journal entries
- GENERAL_USER: Basic view access, submit expenses

Run with: python manage.py seed_bms
"""

from django.core.management.base import BaseCommand
from django.contrib.auth import get_user_model
from roles.models import Role
from systems.models import System
from system_roles.models import UserSystemRole

User = get_user_model()


class Command(BaseCommand):
    help = 'Seed database with BMS-specific roles and users.'

    def handle(self, *args, **options):
        self.stdout.write('Seeding roles and users for the BMS system...')
        
        # Ensure BMS system exists
        self.bms_system = self.get_or_create_system()
        if not self.bms_system:
            self.stdout.write(self.style.ERROR('Failed to get/create BMS system. Aborting.'))
            return
            
        self.create_roles()
        self.create_users()
        self.stdout.write(self.style.SUCCESS('Done seeding roles and users for the BMS system.'))

    def get_or_create_system(self):
        """Ensure BMS system exists."""
        try:
            system, created = System.objects.get_or_create(
                slug='bms',
                defaults={
                    'name': 'Budget Management System',
                }
            )
            if created:
                self.stdout.write(self.style.SUCCESS(f'Created system: {system.name}'))
            else:
                self.stdout.write(f'System already exists: {system.name}')
            return system
        except Exception as e:
            self.stdout.write(self.style.ERROR(f'Error creating BMS system: {str(e)}'))
            return None

    def create_roles(self):
        """Create roles specific to the BMS system."""
        self.roles = {}
        roles_data = [
            {'name': 'ADMIN', 'description': 'Full access to all BMS features including user management, budget creation, approval, and reporting.'},
            {'name': 'FINANCE_HEAD', 'description': 'Budget approval authority, financial reports access, journal entry management.'},
            {'name': 'GENERAL_USER', 'description': 'Basic view access, expense submission, budget proposal viewing.'},
        ]

        for role_data in roles_data:
            role, created = Role.objects.get_or_create(
                system=self.bms_system,
                name=role_data['name'],
                defaults={
                    'description': role_data['description'],
                    'is_custom': False
                }
            )
            self.roles[role.name] = role
            if created:
                self.stdout.write(self.style.SUCCESS(f'Created role: {role.name}'))
            else:
                self.stdout.write(f'Role already exists: {role.name}')

    def create_users(self):
        """Create predefined users for the BMS system."""
        predefined_users = [
            {
                'first_name': 'Budget',
                'last_name': 'Administrator',
                'email': 'bms.admin@example.com',
                'username': 'bmsadmin',
                'phone_number': '+10000001001',
                'role': 'ADMIN',
                'is_staff': True,
                'password': 'BmsAdmin@2025!Secure',
            },
            {
                'first_name': 'Finance',
                'last_name': 'Head',
                'email': 'finance.head@example.com',
                'username': 'financehead',
                'phone_number': '+10000001002',
                'role': 'FINANCE_HEAD',
                'is_staff': True,
                'password': 'FinanceHead@2025!Secure',
            },
            {
                'first_name': 'General',
                'last_name': 'User',
                'email': 'general.user@example.com',
                'username': 'generaluser',
                'phone_number': '+10000001003',
                'role': 'GENERAL_USER',
                'is_staff': False,
                'password': 'GeneralUser@2025!Secure',
            },
            # Simple test users with easy-to-remember credentials for API testing
            {
                'first_name': 'Test',
                'last_name': 'Admin',
                'email': 'testadmin@bms.local',
                'username': 'testadmin_bms',
                'phone_number': '+10000001010',
                'role': 'ADMIN',
                'is_staff': True,
                'password': 'testadmin123',  # Simple password for testing
            },
            {
                'first_name': 'Test',
                'last_name': 'Finance',
                'email': 'testfinance@bms.local',
                'username': 'testfinance_bms',
                'phone_number': '+10000001011',
                'role': 'FINANCE_HEAD',
                'is_staff': True,
                'password': 'testfinance123',  # Simple password for testing
            },
            {
                'first_name': 'Test',
                'last_name': 'User',
                'email': 'testuser@bms.local',
                'username': 'testuser_bms',
                'phone_number': '+10000001012',
                'role': 'GENERAL_USER',
                'is_staff': False,
                'password': 'testuser123',  # Simple password for testing
            },
        ]

        for user_data in predefined_users:
            role = self.roles.get(user_data['role'])
            if not role:
                self.stdout.write(self.style.ERROR(
                    f"Role '{user_data['role']}' does not exist. Skipping user {user_data['email']}"
                ))
                continue

            try:
                user, created = User.objects.get_or_create(
                    email=user_data['email'],
                    defaults={
                        'username': user_data['username'],
                        'first_name': user_data['first_name'],
                        'last_name': user_data['last_name'],
                        'phone_number': user_data.get('phone_number', ''),
                        'is_active': True,
                        'is_staff': user_data.get('is_staff', False),
                    }
                )
                if created:
                    user.set_password(user_data['password'])
                    user.save()
                    self.stdout.write(self.style.SUCCESS(
                        f'Created user: {user.email} with role {role.name}'
                    ))
                else:
                    self.stdout.write(f'User already exists: {user.email}')

                # Assign role to user
                user_role, ur_created = UserSystemRole.objects.get_or_create(
                    user=user,
                    system=self.bms_system,
                    role=role
                )
                if ur_created:
                    self.stdout.write(f'  Assigned role {role.name} to {user.email}')
                else:
                    self.stdout.write(f'  User already has role {role.name}')

            except Exception as e:
                self.stdout.write(self.style.ERROR(
                    f'Error creating user {user_data["email"]}: {str(e)}'
                ))
