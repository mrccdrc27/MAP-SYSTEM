"""
Management command to create a controlled test workflow for integration testing.

Usage:
    python manage.py create_test_workflow [options]
    
This creates a dedicated test workflow with predictable steps and transitions
that can be used by the integration test suite without interfering with production data.

The workflow uses:
- Category: "Integration Test"
- Sub-category: "Test Flow"  
- Department: "Test Department"
- A simple 2-step flow: Start → Complete

This ensures tickets with these specific category/department values are routed
to the test workflow and assigned to the test user.
"""

from django.core.management.base import BaseCommand
from django.db import transaction
from role.models import Roles
from workflow.models import Workflows
from step.models import Steps, StepTransition
from datetime import timedelta
import json


class Command(BaseCommand):
    help = 'Create a test workflow for integration testing'

    def add_arguments(self, parser):
        parser.add_argument(
            '--workflow-id',
            type=int,
            default=9999,
            help='Workflow ID for the test workflow (default: 9999)'
        )
        parser.add_argument(
            '--name',
            type=str,
            default='Integration Test Workflow',
            help='Name of the test workflow'
        )
        parser.add_argument(
            '--category',
            type=str,
            default='Integration Test',
            help='Category for workflow matching (default: Integration Test)'
        )
        parser.add_argument(
            '--sub-category',
            type=str,
            default='Test Flow',
            help='Sub-category for workflow matching (default: Test Flow)'
        )
        parser.add_argument(
            '--department',
            type=str,
            default='Test Department',
            help='Department for workflow matching (default: Test Department)'
        )
        parser.add_argument(
            '--role-id',
            type=int,
            default=9999,
            help='Role ID to use for workflow steps (default: 9999)'
        )
        parser.add_argument(
            '--role-name',
            type=str,
            default=None,
            help='Role name to use for workflow steps (alternative to --role-id)'
        )
        parser.add_argument(
            '--json',
            action='store_true',
            help='Output result as JSON'
        )
        parser.add_argument(
            '--delete',
            action='store_true',
            help='Delete the test workflow instead of creating it'
        )
        parser.add_argument(
            '--force',
            action='store_true',
            help='Force recreate if workflow already exists'
        )
        parser.add_argument(
            '--steps',
            type=int,
            default=2,
            choices=[1, 2, 3],
            help='Number of steps in workflow (1, 2, or 3; default: 2)'
        )

    def handle(self, *args, **options):
        workflow_id = options['workflow_id']
        workflow_name = options['name']
        category = options['category']
        sub_category = options['sub_category']
        department = options['department']
        role_id = options['role_id']
        role_name = options['role_name']
        output_json = options['json']
        delete = options['delete']
        force = options['force']
        num_steps = options['steps']

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
                    # Delete mode - cascade deletes steps and transitions
                    workflow = Workflows.objects.filter(workflow_id=workflow_id).first()
                    if workflow:
                        # Get counts before deletion
                        step_count = Steps.objects.filter(workflow_id=workflow).count()
                        transition_count = StepTransition.objects.filter(workflow_id=workflow).count()
                        workflow.delete()
                        result = {
                            'status': 'deleted',
                            'workflow_id': workflow_id,
                            'name': workflow_name,
                            'steps_deleted': step_count,
                            'transitions_deleted': transition_count,
                            'message': f'Test workflow deleted successfully'
                        }
                    else:
                        result = {
                            'status': 'not_found',
                            'workflow_id': workflow_id,
                            'message': f'Test workflow {workflow_id} not found'
                        }
                else:
                    # Create mode
                    existing = Workflows.objects.filter(workflow_id=workflow_id).first()
                    
                    if existing and force:
                        existing.delete()
                        existing = None
                    
                    if existing:
                        result = {
                            'status': 'exists',
                            'workflow_id': existing.workflow_id,
                            'name': existing.name,
                            'category': existing.category,
                            'sub_category': existing.sub_category,
                            'department': existing.department,
                            'message': f'Test workflow already exists (use --force to recreate)'
                        }
                    else:
                        # Create the workflow
                        workflow = Workflows.objects.create(
                            workflow_id=workflow_id,
                            user_id=9999,  # Test user
                            name=workflow_name,
                            description=f'Automated test workflow for integration testing ({num_steps} steps)',
                            category=category,
                            sub_category=sub_category,
                            department=department,
                            is_published=True,
                            status='initialized',
                            # Set SLAs for testing
                            low_sla=timedelta(hours=72),
                            medium_sla=timedelta(hours=48),
                            high_sla=timedelta(hours=24),
                            urgent_sla=timedelta(hours=4)
                        )

                        # Create steps based on num_steps
                        steps_created = []
                        step_configs = self._get_step_configs(num_steps)
                        
                        for idx, step_config in enumerate(step_configs):
                            step = Steps.objects.create(
                                workflow_id=workflow,
                                role_id=role,
                                escalate_to=role,  # Self-escalate for simplicity
                                name=step_config['name'],
                                description=step_config['description'],
                                instruction=step_config['instruction'],
                                order=idx + 1,
                                weight=step_config['weight'],
                                is_initialized=True,
                                is_start=step_config['is_start'],
                                is_end=step_config['is_end']
                            )
                            steps_created.append(step)

                        # Create transitions between consecutive steps
                        transitions_created = []
                        for i in range(len(steps_created) - 1):
                            from_step = steps_created[i]
                            to_step = steps_created[i + 1]
                            transition = StepTransition.objects.create(
                                workflow_id=workflow,
                                from_step_id=from_step,
                                to_step_id=to_step,
                                name=f'{from_step.name} → {to_step.name}'
                            )
                            transitions_created.append({
                                'id': transition.transition_id,
                                'from': from_step.name,
                                'to': to_step.name
                            })

                        result = {
                            'status': 'created',
                            'workflow_id': workflow.workflow_id,
                            'name': workflow.name,
                            'category': workflow.category,
                            'sub_category': workflow.sub_category,
                            'department': workflow.department,
                            'role_id': role.role_id,
                            'role_name': role.name,
                            'steps': [
                                {
                                    'id': s.step_id,
                                    'name': s.name,
                                    'order': s.order,
                                    'is_start': s.is_start,
                                    'is_end': s.is_end
                                }
                                for s in steps_created
                            ],
                            'transitions': transitions_created,
                            'message': f'Test workflow created successfully with {len(steps_created)} steps'
                        }

            if output_json:
                self.stdout.write(json.dumps(result))
            else:
                if result['status'] == 'created':
                    self.stdout.write(self.style.SUCCESS(f"✅ Created test workflow: {result['name']}"))
                    self.stdout.write(f"   Workflow ID: {result['workflow_id']}")
                    self.stdout.write(f"   Category: {result['category']}")
                    self.stdout.write(f"   Sub-category: {result['sub_category']}")
                    self.stdout.write(f"   Department: {result['department']}")
                    self.stdout.write(f"   Role: {result['role_name']} (ID: {result['role_id']})")
                    self.stdout.write(f"   Steps:")
                    for step in result['steps']:
                        flags = []
                        if step['is_start']:
                            flags.append('START')
                        if step['is_end']:
                            flags.append('END')
                        flag_str = f" [{', '.join(flags)}]" if flags else ""
                        self.stdout.write(f"     [{step['order']}] {step['name']}{flag_str}")
                    if result['transitions']:
                        self.stdout.write(f"   Transitions:")
                        for t in result['transitions']:
                            self.stdout.write(f"     • {t['from']} → {t['to']}")
                elif result['status'] == 'deleted':
                    self.stdout.write(self.style.SUCCESS(f"✅ Deleted test workflow: {result['workflow_id']}"))
                    self.stdout.write(f"   Steps deleted: {result['steps_deleted']}")
                    self.stdout.write(f"   Transitions deleted: {result['transitions_deleted']}")
                elif result['status'] == 'exists':
                    self.stdout.write(self.style.WARNING(f"ℹ️ Test workflow already exists: {result['name']}"))
                    self.stdout.write(f"   Use --force to recreate")
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

    def _get_step_configs(self, num_steps):
        """Get step configurations based on the number of steps requested."""
        if num_steps == 1:
            return [
                {
                    'name': 'Process Request',
                    'description': 'Single-step processing for test tickets',
                    'instruction': 'Process the test ticket and mark as complete.',
                    'weight': 1.0,
                    'is_start': True,
                    'is_end': True
                }
            ]
        elif num_steps == 2:
            return [
                {
                    'name': 'Start Processing',
                    'description': 'Initial processing step for test tickets',
                    'instruction': 'Review the test ticket and prepare for completion.',
                    'weight': 0.5,
                    'is_start': True,
                    'is_end': False
                },
                {
                    'name': 'Complete Request',
                    'description': 'Final step to complete test tickets',
                    'instruction': 'Finalize and close the test ticket.',
                    'weight': 0.5,
                    'is_start': False,
                    'is_end': True
                }
            ]
        else:  # num_steps == 3
            return [
                {
                    'name': 'Triage Request',
                    'description': 'Initial triage for test tickets',
                    'instruction': 'Review and categorize the test ticket.',
                    'weight': 0.33,
                    'is_start': True,
                    'is_end': False
                },
                {
                    'name': 'Process Request',
                    'description': 'Main processing step for test tickets',
                    'instruction': 'Process the test ticket requirements.',
                    'weight': 0.34,
                    'is_start': False,
                    'is_end': False
                },
                {
                    'name': 'Complete Request',
                    'description': 'Final step to complete test tickets',
                    'instruction': 'Finalize and close the test ticket.',
                    'weight': 0.33,
                    'is_start': False,
                    'is_end': True
                }
            ]
