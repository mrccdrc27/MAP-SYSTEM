"""
Management command to create a controlled test user with role assignment for integration testing.

Usage:
    python manage.py create_test_user [--user-id 9999] [--role-id 9999] [--name "Test User"] [--json] [--delete]
    
This creates a dedicated test user assignment (RoleUsers) that can be used by the 
integration test suite to ensure predictable task assignment without interfering 
with production data.
"""

from django.core.management.base import BaseCommand
from django.db import transaction
from role.models import Roles, RoleUsers
import json


class Command(BaseCommand):
    help = 'Create or manage a test user role assignment for integration testing'

    def add_arguments(self, parser):
        parser.add_argument(
            '--user-id',
            type=int,
            default=9999,
            help='User ID for the test user (default: 9999)'
        )
        parser.add_argument(
            '--role-id',
            type=int,
            default=9999,
            help='Role ID to assign the user to (default: 9999)'
        )
        parser.add_argument(
            '--role-name',
            type=str,
            default=None,
            help='Role name to assign (alternative to --role-id)'
        )
        parser.add_argument(
            '--name',
            type=str,
            default='Integration Test User',
            help='Full name of the test user (default: Integration Test User)'
        )
        parser.add_argument(
            '--json',
            action='store_true',
            help='Output result as JSON'
        )
        parser.add_argument(
            '--delete',
            action='store_true',
            help='Delete the test user assignment instead of creating it'
        )
        parser.add_argument(
            '--force',
            action='store_true',
            help='Force recreate if user assignment already exists'
        )
        parser.add_argument(
            '--inactive',
            action='store_true',
            help='Create user as inactive (for testing inactive user scenarios)'
        )

    def handle(self, *args, **options):
        user_id = options['user_id']
        role_id = options['role_id']
        role_name = options['role_name']
        user_full_name = options['name']
        output_json = options['json']
        delete = options['delete']
        force = options['force']
        is_inactive = options['inactive']

        try:
            with transaction.atomic():
                # Find the role
                if role_name:
                    role = Roles.objects.filter(name=role_name).first()
                    if not role:
                        raise ValueError(f"Role with name '{role_name}' not found")
                else:
                    role = Roles.objects.filter(role_id=role_id).first()
                    if not role:
                        raise ValueError(f"Role with ID {role_id} not found. Create it first with: python manage.py create_test_role")

                if delete:
                    # Delete mode
                    deleted_count, _ = RoleUsers.objects.filter(user_id=user_id, role_id=role).delete()
                    if deleted_count > 0:
                        result = {
                            'status': 'deleted',
                            'user_id': user_id,
                            'role_id': role.role_id,
                            'role_name': role.name,
                            'message': f'Test user assignment deleted successfully'
                        }
                    else:
                        result = {
                            'status': 'not_found',
                            'user_id': user_id,
                            'role_id': role.role_id,
                            'message': f'Test user assignment not found'
                        }
                else:
                    # Create mode
                    existing = RoleUsers.objects.filter(user_id=user_id, role_id=role).first()
                    
                    if existing and force:
                        existing.delete()
                        existing = None
                    
                    if existing:
                        result = {
                            'status': 'exists',
                            'user_id': existing.user_id,
                            'role_id': existing.role_id.role_id,
                            'role_name': existing.role_id.name,
                            'user_full_name': existing.user_full_name,
                            'is_active': existing.is_active,
                            'message': f'Test user assignment already exists (use --force to recreate)'
                        }
                    else:
                        role_user = RoleUsers.objects.create(
                            user_id=user_id,
                            role_id=role,
                            user_full_name=user_full_name,
                            is_active=not is_inactive,
                            settings={'is_test_user': True}
                        )
                        result = {
                            'status': 'created',
                            'user_id': role_user.user_id,
                            'role_id': role_user.role_id.role_id,
                            'role_name': role_user.role_id.name,
                            'user_full_name': role_user.user_full_name,
                            'is_active': role_user.is_active,
                            'message': f'Test user assignment created successfully'
                        }

            if output_json:
                self.stdout.write(json.dumps(result))
            else:
                if result['status'] == 'created':
                    status_str = 'active' if result['is_active'] else 'inactive'
                    self.stdout.write(self.style.SUCCESS(
                        f"✅ Created test user: {result['user_full_name']} "
                        f"(User ID: {result['user_id']}, Role: {result['role_name']}, Status: {status_str})"
                    ))
                elif result['status'] == 'deleted':
                    self.stdout.write(self.style.SUCCESS(
                        f"✅ Deleted test user assignment: User {result['user_id']} from role {result['role_name']}"
                    ))
                elif result['status'] == 'exists':
                    self.stdout.write(self.style.WARNING(
                        f"ℹ️ Test user assignment already exists: {result['user_full_name']} "
                        f"(User ID: {result['user_id']}, Role: {result['role_name']})"
                    ))
                else:
                    self.stdout.write(self.style.WARNING(f"ℹ️ {result['message']}"))

        except Exception as e:
            error_result = {
                'status': 'error',
                'error': str(e)
            }
            if output_json:
                self.stdout.write(json.dumps(error_result))
            else:
                self.stderr.write(self.style.ERROR(f"❌ Error: {e}"))
            raise
