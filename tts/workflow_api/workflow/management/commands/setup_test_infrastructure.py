"""
Management command to set up complete test infrastructure for integration testing.

Usage:
    python manage.py setup_test_infrastructure [--json] [--delete] [--force]
    
This is a convenience command that orchestrates:
1. create_test_role - Creates the test role
2. create_test_user - Creates the test user with role assignment
3. create_test_workflow - Creates the test workflow with steps and transitions

After running this command, you can create tickets with:
- Category: "Integration Test"
- Sub-category: "Test Flow"
- Department: "Test Department"

And they will be routed to the test workflow and assigned to the test user.
"""

from django.core.management.base import BaseCommand
from django.core.management import call_command
from django.db import transaction
import json
import io


class Command(BaseCommand):
    help = 'Set up complete test infrastructure for integration testing'

    def add_arguments(self, parser):
        parser.add_argument(
            '--json',
            action='store_true',
            help='Output result as JSON'
        )
        parser.add_argument(
            '--delete',
            action='store_true',
            help='Delete all test infrastructure instead of creating it'
        )
        parser.add_argument(
            '--force',
            action='store_true',
            help='Force recreate if infrastructure already exists'
        )
        parser.add_argument(
            '--role-id',
            type=int,
            default=9999,
            help='Role ID for test infrastructure (default: 9999)'
        )
        parser.add_argument(
            '--user-id',
            type=int,
            default=9999,
            help='User ID for test infrastructure (default: 9999)'
        )
        parser.add_argument(
            '--workflow-id',
            type=int,
            default=9999,
            help='Workflow ID for test infrastructure (default: 9999)'
        )
        parser.add_argument(
            '--category',
            type=str,
            default='Integration Test',
            help='Category for test workflow (default: Integration Test)'
        )
        parser.add_argument(
            '--sub-category',
            type=str,
            default='Test Flow',
            help='Sub-category for test workflow (default: Test Flow)'
        )
        parser.add_argument(
            '--department',
            type=str,
            default='Test Department',
            help='Department for test workflow (default: Test Department)'
        )
        parser.add_argument(
            '--steps',
            type=int,
            default=2,
            choices=[1, 2, 3],
            help='Number of steps in test workflow (default: 2)'
        )

    def handle(self, *args, **options):
        output_json = options['json']
        delete = options['delete']
        force = options['force']
        role_id = options['role_id']
        user_id = options['user_id']
        workflow_id = options['workflow_id']
        category = options['category']
        sub_category = options['sub_category']
        department = options['department']
        num_steps = options['steps']

        results = {
            'operation': 'delete' if delete else 'create',
            'role': None,
            'user': None,
            'workflow': None,
            'success': True,
            'errors': []
        }

        try:
            # When using --force, we need to delete in proper order first before creating
            # Delete order: workflow -> user -> role (to handle foreign key constraints)
            # Create order: role -> user -> workflow
            
            if force and not delete:
                # Delete existing infrastructure in proper order first
                delete_order = ['workflow', 'user', 'role']
                for item in delete_order:
                    try:
                        stdout_capture = io.StringIO()
                        if item == 'role':
                            call_command('create_test_role', role_id=role_id, delete=True, json=True, stdout=stdout_capture)
                        elif item == 'user':
                            call_command('create_test_user', user_id=user_id, role_id=role_id, delete=True, json=True, stdout=stdout_capture)
                        elif item == 'workflow':
                            call_command('create_test_workflow', workflow_id=workflow_id, role_id=role_id, delete=True, json=True, stdout=stdout_capture)
                    except Exception:
                        pass  # Ignore errors during cleanup
            
            if delete:
                # Delete in reverse order: workflow -> user -> role
                order = ['workflow', 'user', 'role']
            else:
                # Create in order: role -> user -> workflow
                order = ['role', 'user', 'workflow']

            for item in order:
                try:
                    stdout_capture = io.StringIO()
                    
                    if item == 'role':
                        call_command(
                            'create_test_role',
                            role_id=role_id,
                            delete=delete,
                            force=False,  # Already handled above
                            json=True,
                            stdout=stdout_capture
                        )
                        results['role'] = json.loads(stdout_capture.getvalue())
                        
                    elif item == 'user':
                        call_command(
                            'create_test_user',
                            user_id=user_id,
                            role_id=role_id,
                            delete=delete,
                            force=False,  # Already handled above
                            json=True,
                            stdout=stdout_capture
                        )
                        results['user'] = json.loads(stdout_capture.getvalue())
                        
                    elif item == 'workflow':
                        call_command(
                            'create_test_workflow',
                            workflow_id=workflow_id,
                            role_id=role_id,
                            category=category,
                            sub_category=sub_category,
                            department=department,
                            steps=num_steps,
                            delete=delete,
                            force=False,  # Already handled above
                            json=True,
                            stdout=stdout_capture
                        )
                        results['workflow'] = json.loads(stdout_capture.getvalue())

                except Exception as e:
                    results['errors'].append({
                        'component': item,
                        'error': str(e)
                    })
                    results['success'] = False

            # Add summary
            results['summary'] = {
                'category': category,
                'sub_category': sub_category,
                'department': department,
                'role_id': role_id,
                'user_id': user_id,
                'workflow_id': workflow_id,
                'steps': num_steps
            }

            if output_json:
                self.stdout.write(json.dumps(results, indent=2))
            else:
                if delete:
                    self.stdout.write(self.style.MIGRATE_HEADING('\n=== Deleting Test Infrastructure ===\n'))
                else:
                    self.stdout.write(self.style.MIGRATE_HEADING('\n=== Setting Up Test Infrastructure ===\n'))

                # Role status
                if results['role']:
                    status = results['role'].get('status', 'unknown')
                    if status in ['created', 'deleted']:
                        self.stdout.write(self.style.SUCCESS(f"✅ Role: {results['role'].get('message', status)}"))
                    else:
                        self.stdout.write(self.style.WARNING(f"ℹ️ Role: {results['role'].get('message', status)}"))

                # User status
                if results['user']:
                    status = results['user'].get('status', 'unknown')
                    if status in ['created', 'deleted']:
                        self.stdout.write(self.style.SUCCESS(f"✅ User: {results['user'].get('message', status)}"))
                    else:
                        self.stdout.write(self.style.WARNING(f"ℹ️ User: {results['user'].get('message', status)}"))

                # Workflow status
                if results['workflow']:
                    status = results['workflow'].get('status', 'unknown')
                    if status in ['created', 'deleted']:
                        self.stdout.write(self.style.SUCCESS(f"✅ Workflow: {results['workflow'].get('message', status)}"))
                    else:
                        self.stdout.write(self.style.WARNING(f"ℹ️ Workflow: {results['workflow'].get('message', status)}"))

                # Errors
                if results['errors']:
                    self.stdout.write(self.style.ERROR('\n❌ Errors occurred:'))
                    for err in results['errors']:
                        self.stdout.write(self.style.ERROR(f"   • {err['component']}: {err['error']}"))

                # Summary
                if not delete and results['success']:
                    self.stdout.write(self.style.SUCCESS('\n' + '=' * 50))
                    self.stdout.write(self.style.SUCCESS('Test Infrastructure Ready!'))
                    self.stdout.write(self.style.SUCCESS('=' * 50))
                    self.stdout.write(f"\nTo use in integration tests, create tickets with:")
                    self.stdout.write(f"  • Category: {category}")
                    self.stdout.write(f"  • Sub-category: {sub_category}")
                    self.stdout.write(f"  • Department: {department}")
                    self.stdout.write(f"\nTest IDs:")
                    self.stdout.write(f"  • Role ID: {role_id}")
                    self.stdout.write(f"  • User ID: {user_id}")
                    self.stdout.write(f"  • Workflow ID: {workflow_id}")
                    self.stdout.write(f"  • Workflow Steps: {num_steps}")

        except Exception as e:
            results['success'] = False
            results['errors'].append({
                'component': 'setup',
                'error': str(e)
            })
            if output_json:
                self.stdout.write(json.dumps(results, indent=2))
            else:
                self.stderr.write(self.style.ERROR(f"❌ Setup failed: {e}"))
            raise
