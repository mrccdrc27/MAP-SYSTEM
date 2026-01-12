"""
AMS (Asset Management System) Seeder

This management command creates AMS-specific roles and users in the Auth service.
It ensures that the AMS system exists with proper roles and test users that can
authenticate and access the AMS Assets and Contexts APIs.

Roles:
- Admin: Full access to all AMS features including user management, asset CRUD, reports
- Operator: Basic access to view and checkout/checkin assets, components

Run with: python manage.py seed_ams
"""

from django.core.management.base import BaseCommand
from django.contrib.auth import get_user_model
from roles.models import Role
from systems.models import System
from system_roles.models import UserSystemRole

User = get_user_model()


class Command(BaseCommand):
    help = 'Seed database with AMS-specific roles and users.'

    def handle(self, *args, **options):
        self.stdout.write('Seeding roles and users for the AMS system...')
        
        # Ensure AMS system exists
        self.ams_system = self.get_or_create_system()
        if not self.ams_system:
            self.stdout.write(self.style.ERROR('Failed to get/create AMS system. Aborting.'))
            return
            
        self.create_roles()
        self.create_users()
        self.stdout.write(self.style.SUCCESS('Done seeding roles and users for the AMS system.'))
        self.print_credentials()

    def get_or_create_system(self):
        """Ensure AMS system exists."""
        try:
            system, created = System.objects.get_or_create(
                slug='ams',
                defaults={
                    'name': 'Asset Management System',
                }
            )
            if created:
                self.stdout.write(self.style.SUCCESS(f'Created system: {system.name}'))
            else:
                self.stdout.write(f'System already exists: {system.name}')
            return system
        except Exception as e:
            self.stdout.write(self.style.ERROR(f'Error creating AMS system: {str(e)}'))
            return None

    def create_roles(self):
        """Create roles specific to the AMS system."""
        self.roles = {}
        roles_data = [
            {
                'name': 'Admin',
                'description': 'Full access to all AMS features including user management, asset CRUD, reports, audits, and system configuration.'
            },
            {
                'name': 'Operator',
                'description': 'Basic access to view assets, perform checkout/checkin operations, view reports, and manage assigned tasks.'
            },
        ]

        for role_data in roles_data:
            role, created = Role.objects.get_or_create(
                system=self.ams_system,
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
        """Create predefined users for the AMS system."""
        predefined_users = [
            # Production-style users with secure passwords (mapactive domain)
            {
                'first_name': 'AMS',
                'last_name': 'Administrator',
                'email': 'assetmanagement.mapactive+admin@dev.mapactive.tech',
                'username': 'ams_admin_prod',
                'phone_number': '+639170000001',
                'role': 'Admin',
                'is_staff': True,
                'password': 'Ass3t.M@nag3m3nt!2026.Adm1n',
            },
            {
                'first_name': 'AMS',
                'last_name': 'Operator',
                'email': 'assetmanagement.mapactive+operator@dev.mapactive.tech',
                'username': 'ams_operator_prod',
                'phone_number': '+639170000002',
                'role': 'Operator',
                'is_staff': False,
                'password': 'Ass3t.M@nag3m3nt!2026.0per@tor',
            },
            # Simple test users with easy-to-remember credentials for API testing
            {
                'first_name': 'AMS',
                'last_name': 'Admin',
                'email': 'amsadmin@test.local',
                'username': 'amsadmin_test',
                'phone_number': '+10000002010',
                'role': 'Admin',
                'is_staff': True,
                'password': 'amsadmin123',  # Simple password for testing
            },
            {
                'first_name': 'AMS',
                'last_name': 'Operator',
                'email': 'amsoperator@test.local',
                'username': 'amsoperator_test',
                'phone_number': '+10000002011',
                'role': 'Operator',
                'is_staff': False,
                'password': 'amsoperator123',  # Simple password for testing
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
                    system=self.ams_system,
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

    def print_credentials(self):
        """Print test credentials for easy reference."""
        self.stdout.write('')
        self.stdout.write(self.style.SUCCESS('=' * 60))
        self.stdout.write(self.style.SUCCESS(' AMS Seeded Credentials'))
        self.stdout.write(self.style.SUCCESS('=' * 60))
        self.stdout.write('')
        self.stdout.write(' Production (mapactive):')
        self.stdout.write('   Admin:    assetmanagement.mapactive+admin@dev.mapactive.tech')
        self.stdout.write('             Password: Ass3t.M@nag3m3nt!2026.Adm1n')
        self.stdout.write('   Operator: assetmanagement.mapactive+operator@dev.mapactive.tech')
        self.stdout.write('             Password: Ass3t.M@nag3m3nt!2026.0per@tor')
        self.stdout.write('')
        self.stdout.write(' For API Testing:')
        self.stdout.write('   Admin:    amsadmin@test.local / amsadmin123')
        self.stdout.write('   Operator: amsoperator@test.local / amsoperator123')
        self.stdout.write('')
