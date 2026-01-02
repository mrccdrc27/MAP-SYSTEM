from django.core.management.base import BaseCommand
from django.contrib.auth import get_user_model
from django.db import transaction

# Import Centralized Auth specific models
from systems.models import System
from roles.models import Role
from system_roles.models import UserSystemRole

User = get_user_model()

class Command(BaseCommand):
    help = 'Seed Centralized Auth with BMS-specific users and roles.'

    def handle(self, *args, **options):
        self.stdout.write(self.style.SUCCESS('Starting BMS Seeder...'))

        with transaction.atomic():
            # 1. Ensure BMS System exists
            bms_system, created = System.objects.get_or_create(
                slug='bms',  # Use slug for lookup
                defaults={'name': 'Budget Management System'}
            )

            # 2. Ensure BMS Roles exist
            roles_map = {}
            role_names = ['ADMIN', 'FINANCE_HEAD', 'GENERAL_USER']
            
            for r_name in role_names:
                role, _ = Role.objects.get_or_create(
                    name=r_name,
                    system=bms_system,
                    defaults={'description': f'{r_name} role for BMS', 'is_custom': False}
                )
                roles_map[r_name] = role

            # 3. Create Users
            # Mapping old IDs to New Model Choices
            # Choices: 'IT Department', 'Asset Department', 'Budget Department'
            dept_map = {
                1: 'Budget Department', # Finance -> Budget
                2: 'Asset Department',  # HR -> Asset (Closest match or leave None)
                3: 'IT Department',     # IT -> IT
                4: 'Asset Department',  # Ops -> Asset
                5: 'Budget Department'  # Mkt -> Budget
            }

            users_data = [
                {'email': 'admin@example.com', 'username': 'admin_auth', 'password': 'Password123!', 'first_name': 'AuthAdmin', 'last_name': 'User', 'role_code': 'ADMIN', 'dept_id': 1},
                {'email': 'finance_head@example.com', 'username': 'finance_head_auth', 'password': 'Password123!', 'first_name': 'Finance', 'last_name': 'Head', 'role_code': 'FINANCE_HEAD', 'dept_id': 1},
                {'email': 'it_user@example.com', 'username': 'it_user_auth', 'password': 'Password123!', 'first_name': 'IT', 'last_name': 'Support', 'role_code': 'ADMIN', 'dept_id': 3},
                {'email': 'ops_user@example.com', 'username': 'ops_user_auth', 'password': 'password123', 'first_name': 'Operations', 'last_name': 'Staff', 'role_code': 'GENERAL_USER', 'dept_id': 4},
                {'email': 'adibentulan@gmail.com', 'username': 'adi123', 'password': 'password123', 'first_name': 'Eldrin', 'last_name': 'Adi', 'role_code': 'ADMIN', 'dept_id': 3},
            ]

            for u_data in users_data:
                # Create User (New Model Fields)
                user, created = User.objects.update_or_create(
                    email=u_data['email'].lower(),
                    defaults={
                        'username': u_data['username'],
                        'first_name': u_data['first_name'],
                        'last_name': u_data['last_name'],
                        'department': dept_map.get(u_data['dept_id']),
                        'is_active': True,
                        'is_staff': u_data['role_code'] in ['ADMIN', 'FINANCE_HEAD'],
                        'status': 'Approved' # Set status to Approved so they can login
                    }
                )
                user.set_password(u_data['password'])
                user.save()

                # Assign Role in UserSystemRole table
                role_obj = roles_map.get(u_data['role_code'])
                if role_obj:
                    UserSystemRole.objects.get_or_create(
                        user=user,
                        role=role_obj,
                        system=bms_system,
                        defaults={'is_active': True}
                    )
                    self.stdout.write(f"Assigned {u_data['role_code']} to {user.email}")

        self.stdout.write(self.style.SUCCESS('BMS Seeding Complete!'))