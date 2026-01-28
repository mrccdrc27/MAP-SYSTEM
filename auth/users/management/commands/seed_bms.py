# File: auth/users/management/commands/seed_bms.py

from django.core.management.base import BaseCommand
from django.contrib.auth import get_user_model
from django.db import transaction
from django.utils import timezone

# Import Centralized Auth specific models
# Adjust these import paths if your central auth structure is slightly different
# based on your INSTALLED_APPS ['systems', 'roles', 'system_roles']
from systems.models import System
from roles.models import Role
from system_roles.models import UserSystemRole

User = get_user_model()

class Command(BaseCommand):
    help = 'Seed Centralized Auth with BMS-specific users and roles.'

    def handle(self, *args, **options):
        self.stdout.write(self.style.WARNING('Starting BMS Central Auth Seeder...'))

        with transaction.atomic():
            # 1. Ensure BMS System exists
            # This slug 'bms' MUST match what your Frontend AuthContext looks for
            bms_system, created = System.objects.get_or_create(
                slug='bms',
                defaults={
                    'name': 'Budget Management System',
                    'description': 'Financial planning and tracking system',
                    'url': 'http://localhost:5173', # Local default
                    'icon': 'monitor' 
                }
            )
            if created:
                self.stdout.write(f"Created System: {bms_system.name}")

            # 2. Ensure BMS Roles exist
            roles_map = {}
            role_names = ['ADMIN', 'FINANCE_HEAD', 'GENERAL_USER']
            
            for r_name in role_names:
                role, _ = Role.objects.get_or_create(
                    name=r_name,
                    system=bms_system,
                    defaults={
                        'description': f'{r_name} role for BMS', 
                        'is_custom': False,
                        'is_active': True
                    }
                )
                roles_map[r_name] = role
                self.stdout.write(f"Ensured Role: {r_name}")

            # 3. Create Users
            # These map to the Department Names stored in BMS Core Service
            dept_map = {
                1: 'Finance Department',
                2: 'Human Resources',
                3: 'IT Application & Data',
                4: 'Operations Department',
                5: 'Marketing / Marketing Communications'
            }

            users_data = [
                # Admin (Finance Dept)
                {'email': 'admin@example.com', 'username': 'admin_auth', 'password': 'Password123!', 'first_name': 'AuthAdmin', 'last_name': 'User', 'role_code': 'ADMIN', 'dept_id': 1},
                
                # Finance Head
                {'email': 'finance_head@example.com', 'username': 'finance_head_auth', 'password': 'Password123!', 'first_name': 'Leon', 'last_name': 'Kennedy', 'role_code': 'FINANCE_HEAD', 'dept_id': 1},
                
                # IT Support (Admin Access)
                {'email': 'it_user@example.com', 'username': 'it_user_auth', 'password': 'Password123!', 'first_name': 'IT', 'last_name': 'Support', 'role_code': 'ADMIN', 'dept_id': 3},
                
                # Operations User (General User - Restricted to Dept)
                {'email': 'ops_user@example.com', 'username': 'ops_user_auth', 'password': 'password123', 'first_name': 'Chris', 'last_name': 'Redfield', 'role_code': 'GENERAL_USER', 'dept_id': 4},
                
                # Marketing User
                {'email': 'mkt_user@example.com', 'username': 'mkt_user_auth', 'password': 'Password123!', 'first_name': 'Jill', 'last_name': 'Valentine', 'role_code': 'GENERAL_USER', 'dept_id': 5},

                # HR User
                {'email': 'hr_user@example.com', 'username': 'hr_user_auth', 'password': 'Password123!', 'first_name': 'Ada', 'last_name': 'Wong', 'role_code': 'GENERAL_USER', 'dept_id': 2},
                
                # Extra Admin
                {'email': 'adibentulan@gmail.com', 'username': 'adi123', 'password': 'password123', 'first_name': 'Eldrin', 'last_name': 'Adi', 'role_code': 'ADMIN', 'dept_id': 3},
            ]

            for u_data in users_data:
                # Create or Update User
                # Note: 'department' field is used to store the name string
                user, created = User.objects.update_or_create(
                    email=u_data['email'].lower(),
                    defaults={
                        'username': u_data['username'],
                        'first_name': u_data['first_name'],
                        'last_name': u_data['last_name'],
                        'department': dept_map.get(u_data['dept_id']), 
                        'is_active': True,
                        # is_staff usually grants access to Django Admin, mostly for Superusers/Admins
                        'is_staff': u_data['role_code'] in ['ADMIN', 'FINANCE_HEAD'],
                        'status': 'Approved', # Important for login checks
                        'notified': True
                    }
                )
                user.set_password(u_data['password'])
                user.save()

                # 4. Assign System Role (The Critical Part)
                role_obj = roles_map.get(u_data['role_code'])
                if role_obj:
                    UserSystemRole.objects.update_or_create(
                        user=user,
                        system=bms_system,
                        role=role_obj,
                        defaults={
                            'is_active': True,
                            'assigned_at': timezone.now()
                        }
                    )
                    self.stdout.write(f"  > Assigned {u_data['role_code']} to {user.email}")

        self.stdout.write(self.style.SUCCESS('BMS Central Auth Seeding Complete!'))