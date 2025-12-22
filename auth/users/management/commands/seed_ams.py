"""
Django management command to seed AMS (Asset Management System) test users.

Creates:
- AMS system in systems table
- Admin and Operator roles for AMS
- Test users with AMS system access

Usage:
    python manage.py seed_ams
    python manage.py seed_ams --clear  # Clear existing AMS data first
"""

from django.core.management.base import BaseCommand
from django.db import transaction
from users.models import User
from systems.models import System
from roles.models import Role
from system_roles.models import UserSystemRole


class Command(BaseCommand):
    help = 'Seed AMS (Asset Management System) test users and roles'

    def add_arguments(self, parser):
        parser.add_argument(
            '--clear',
            action='store_true',
            help='Clear existing AMS users before seeding',
        )

    def handle(self, *args, **options):
        self.stdout.write(self.style.NOTICE('Seeding AMS users and roles...'))
        
        try:
            with transaction.atomic():
                # Create or get AMS system
                ams_system, created = System.objects.get_or_create(
                    slug='ams',
                    defaults={
                        'name': 'Asset Management System',
                        'description': 'Asset Management System for tracking and managing organizational assets'
                    }
                )
                if created:
                    self.stdout.write(self.style.SUCCESS(f'  Created AMS system'))
                else:
                    self.stdout.write(f'  AMS system already exists')

                # Create roles for AMS
                roles_data = [
                    {
                        'name': 'Admin',
                        'description': 'AMS Administrator - Full access to all AMS features',
                        'is_custom': False
                    },
                    {
                        'name': 'Operator',
                        'description': 'AMS Operator - Can manage assets and perform operations',
                        'is_custom': False
                    },
                ]

                roles = {}
                for role_data in roles_data:
                    role, created = Role.objects.get_or_create(
                        name=role_data['name'],
                        system=ams_system,
                        defaults={
                            'description': role_data['description'],
                            'is_custom': role_data['is_custom']
                        }
                    )
                    roles[role_data['name']] = role
                    if created:
                        self.stdout.write(self.style.SUCCESS(f'  Created role: {role_data["name"]}'))
                    else:
                        self.stdout.write(f'  Role already exists: {role_data["name"]}')

                # Test users to create
                users_data = [
                    {
                        'email': 'amsadmin@test.local',
                        'password': 'amsadmin123',
                        'username': 'amsadmin',
                        'first_name': 'AMS',
                        'last_name': 'Admin',
                        'role': 'Admin'
                    },
                    {
                        'email': 'amsoperator@test.local',
                        'password': 'amsoperator123',
                        'username': 'amsoperator',
                        'first_name': 'AMS',
                        'last_name': 'Operator',
                        'role': 'Operator'
                    },
                ]

                # Clear existing AMS test users if requested
                if options['clear']:
                    emails = [u['email'] for u in users_data]
                    deleted_count, _ = User.objects.filter(email__in=emails).delete()
                    if deleted_count:
                        self.stdout.write(self.style.WARNING(f'  Cleared {deleted_count} existing AMS test users'))

                # Create users
                for user_data in users_data:
                    user, created = User.objects.get_or_create(
                        email=user_data['email'],
                        defaults={
                            'username': user_data['username'],
                            'first_name': user_data['first_name'],
                            'last_name': user_data['last_name'],
                            'is_active': True,
                            'status': 'Approved'
                        }
                    )
                    
                    if created:
                        user.set_password(user_data['password'])
                        user.save()
                        self.stdout.write(self.style.SUCCESS(f'  Created user: {user_data["email"]}'))
                    else:
                        self.stdout.write(f'  User already exists: {user_data["email"]}')
                    
                    # Assign AMS role
                    role = roles[user_data['role']]
                    user_role, role_created = UserSystemRole.objects.get_or_create(
                        user=user,
                        system=ams_system,
                        role=role
                    )
                    if role_created:
                        self.stdout.write(self.style.SUCCESS(
                            f'  Assigned {user_data["role"]} role to {user_data["email"]}'
                        ))
                    else:
                        self.stdout.write(
                            f'  {user_data["email"]} already has {user_data["role"]} role'
                        )

                self.stdout.write('')
                self.stdout.write(self.style.SUCCESS('AMS seeding complete!'))
                self.stdout.write('')
                self.stdout.write('Test credentials:')
                self.stdout.write('  Admin:    amsadmin@test.local / amsadmin123')
                self.stdout.write('  Operator: amsoperator@test.local / amsoperator123')

        except Exception as e:
            self.stdout.write(self.style.ERROR(f'Error seeding AMS: {e}'))
            raise
