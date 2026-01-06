"""
Management command to create a controlled test role for integration testing.

Usage:
    python manage.py create_test_role [--name "Test Role"] [--role-id 9999] [--json] [--delete]
    
This creates a dedicated test role that can be used by the integration test suite
to ensure predictable workflow routing without interfering with production data.
"""

from django.core.management.base import BaseCommand
from django.db import transaction
from role.models import Roles
import json


class Command(BaseCommand):
    help = 'Create or manage a test role for integration testing'

    def add_arguments(self, parser):
        parser.add_argument(
            '--name',
            type=str,
            default='Integration Test Role',
            help='Name of the test role (default: Integration Test Role)'
        )
        parser.add_argument(
            '--role-id',
            type=int,
            default=9999,
            help='Role ID for the test role (default: 9999)'
        )
        parser.add_argument(
            '--system',
            type=str,
            default='tts',
            help='System identifier (default: tts)'
        )
        parser.add_argument(
            '--json',
            action='store_true',
            help='Output result as JSON'
        )
        parser.add_argument(
            '--delete',
            action='store_true',
            help='Delete the test role instead of creating it'
        )
        parser.add_argument(
            '--force',
            action='store_true',
            help='Force recreate if role already exists'
        )

    def handle(self, *args, **options):
        role_name = options['name']
        role_id = options['role_id']
        system = options['system']
        output_json = options['json']
        delete = options['delete']
        force = options['force']

        try:
            with transaction.atomic():
                if delete:
                    # Delete mode
                    deleted_count, _ = Roles.objects.filter(role_id=role_id).delete()
                    if deleted_count > 0:
                        result = {
                            'status': 'deleted',
                            'role_id': role_id,
                            'name': role_name,
                            'message': f'Test role {role_id} deleted successfully'
                        }
                    else:
                        result = {
                            'status': 'not_found',
                            'role_id': role_id,
                            'message': f'Test role {role_id} not found'
                        }
                else:
                    # Create mode
                    existing = Roles.objects.filter(role_id=role_id).first()
                    
                    if existing and force:
                        existing.delete()
                        existing = None
                    
                    if existing:
                        result = {
                            'status': 'exists',
                            'role_id': existing.role_id,
                            'name': existing.name,
                            'system': existing.system,
                            'message': f'Test role already exists (use --force to recreate)'
                        }
                    else:
                        role = Roles.objects.create(
                            role_id=role_id,
                            name=role_name,
                            system=system
                        )
                        result = {
                            'status': 'created',
                            'role_id': role.role_id,
                            'name': role.name,
                            'system': role.system,
                            'message': f'Test role created successfully'
                        }

            if output_json:
                self.stdout.write(json.dumps(result))
            else:
                if result['status'] == 'created':
                    self.stdout.write(self.style.SUCCESS(f"✅ Created test role: {result['name']} (ID: {result['role_id']})"))
                elif result['status'] == 'deleted':
                    self.stdout.write(self.style.SUCCESS(f"✅ Deleted test role: {result['role_id']}"))
                elif result['status'] == 'exists':
                    self.stdout.write(self.style.WARNING(f"ℹ️ Test role already exists: {result['name']} (ID: {result['role_id']})"))
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
