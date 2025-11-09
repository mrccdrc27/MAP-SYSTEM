from django.core.management.base import BaseCommand, CommandError
from django.db import transaction, IntegrityError
from django.core.exceptions import ValidationError
from role.models import Roles
from workflow.models import Workflows, Category
from step.models import Steps, StepTransition
import random

# Revised instruction pool for the 3-step (Triage, Resolve, Finalize) process
instructions_pool = {
    'triage_generic': [
        "Verify ticket completeness: ensure all required fields, details, and justifications are present.",
        "Confirm the ticket is assigned to the correct department and category. Re-route if necessary.",
        "Assign the correct resolver or resolver group based on the request type (e.g., Asset, IT, Budget).",
        "Check for all required attachments (e.g., quotes, approval emails, photos) before submission.",
        "Set the initial priority level (Low, Medium, High) based on business impact and urgency.",
    ],
    'resolve_asset': [
        "For Check-in: Inspect physical condition, compare with documentation, and verify serial numbers/asset tags.",
        "For Check-out: Verify authorization, document asset condition at handover, and update custody records.",
        "Update the asset's status (e.g., 'In Stock', 'Assigned', 'In Repair') in the inventory system.",
        "Ensure all asset tracking requirements are met, including barcode scanning and location updates.",
        "Authorize the custody transfer and update the asset management system with the new location or custodian.",
    ],
    'resolve_budget': [
        "Analyze the proposed budget for accuracy, completeness, and alignment with departmental allocations.",
        "Review the project justification, ROI analysis, and risk factors against current fiscal priorities.",
        "Verify all required financial documentation is attached, including quotes, estimates, and vendor proposals.",
        "Final authorization of budget allocation, ensuring funds are available and properly coded.",
        "Authorize budget release and establish financial tracking mechanisms for the project.",
    ],
    'resolve_it': [
        "For Access Request: Verify the request complies with IT security policies and data classification standards.",
        "For Software Install: Confirm licensing compliance, check for existing licenses, and review for security vulnerabilities.",
        "Review technical requirements for compatibility with existing infrastructure and enterprise architecture.",
        "Provision the requested access or deploy the software using standard IT procedures.",
        "Final authorization for provisioning. Verify all security assessments and compliance checks are complete.",
    ],
    'finalize_generic': [
        "Confirm that the primary task is completed and all data has been accurately updated in the relevant systems.",
        "Notify the original requester and any other key stakeholders that the ticket has been resolved.",
        "Log or archive the ticket and all related documentation for future audit and compliance purposes.",
        "Add any final notes, resolution codes, or knowledge base articles related to the completed work.",
        "Formally close the ticket in the system to stop the clock and mark the workflow as complete.",
    ],
}

class Command(BaseCommand):
    help = """
    Seed comprehensive workflows based on a 3-step (Triage, Resolve, Finalize) model.
    
    This command creates:
    - 5 distinct workflows across 3 departments (Asset, Budget, IT)
    - A standardized 3-step process for each workflow:
      1. Triage Ticket (Admin)
      2. Resolve Ticket (Department-specific: Asset Manager, Budget Manager)
      3. Finalize Ticket (Admin)
    - Department-specific instructions for the 'Resolve' step
    - Clean transitions between steps
    
    Usage: python manage.py seed_workflows2
    
    Prerequisites:
    - Roles must exist: Admin, Asset Manager, Budget Manager
    - Database must be accessible and migrations applied
    """

    def add_arguments(self, parser):
        parser.add_argument(
            '--dry-run',
            action='store_true',
            help='Run the command without making database changes',
        )

    def handle(self, *args, **options):
        dry_run = options.get('dry_run', False)
        
        if dry_run:
            self.stdout.write(self.style.WARNING('Running in DRY RUN mode - no changes will be made'))
        
        self.stdout.write(self.style.MIGRATE_HEADING('Starting 3-step workflow seeding process...'))
        
        with transaction.atomic():
            # Verify required roles exist
            try:
                role_map = {
                    'Admin': Roles.objects.get(name='Admin'),
                    'Asset_Manager': Roles.objects.get(name='Asset Manager'),
                    'Budget_Manager': Roles.objects.get(name='Budget Manager'),
                }
                self.stdout.write(self.style.SUCCESS('✓ All required roles found'))
            except Roles.DoesNotExist as e:
                raise CommandError(f"Missing expected role: {e}. Please ensure seed_role is run first.")

            # Define the standardized 3-step configuration generator
            def create_3_step_config(resolver_role, resolver_instruction, resolve_desc):
                return [
                    {
                        'label': 'Triage Ticket',
                        'role': 'Admin',
                        'description': 'Initial triage to verify ticket completeness, assign category, and route to the correct resolver.',
                        'instruction_type': 'triage_generic'
                    },
                    {
                        'label': 'Resolve Ticket',
                        'role': resolver_role,
                        'description': resolve_desc,
                        'instruction_type': resolver_instruction
                    },
                    {
                        'label': 'Finalize Ticket',
                        'role': 'Admin',
                        'description': 'Final verification that all records are updated, tasks are completed, and the requester is notified.',
                        'instruction_type': 'finalize_generic'
                    },
                ]

            # Comprehensive workflow definitions with department-specific metadata
            workflows_to_create = [
                {
                    "name": "Asset Check In Workflow",
                    "category": "Asset Check In",
                    "sub_category": "Check In",
                    "department": "Asset Department",
                    "description": "Workflow for checking in company assets. (Triage -> Resolve -> Finalize)",
                    "steps_config": create_3_step_config(
                        resolver_role='Asset_Manager',
                        resolver_instruction='resolve_asset',
                        resolve_desc='Asset Manager performs the check-in: verifies asset, inspects condition, and updates inventory.'
                    )
                },
                {
                    "name": "Asset Check Out Workflow",
                    "category": "Asset Check Out",
                    "sub_category": "Check Out",
                    "department": "Asset Department",
                    "description": "Workflow for checking out company assets. (Triage -> Resolve -> Finalize)",
                    "steps_config": create_3_step_config(
                        resolver_role='Asset_Manager',
                        resolver_instruction='resolve_asset',
                        resolve_desc='Asset Manager performs the check-out: verifies authorization, documents condition, and updates custody.'
                    )
                },
                {
                    "name": "New Budget Proposal Workflow",
                    "category": "New Budget Proposal",
                    "sub_category": "Budget Approval",
                    "department": "Budget Department",
                    "description": "Workflow for submitting and approving new project proposals. (Triage -> Resolve -> Finalize)",
                    "steps_config": create_3_step_config(
                        resolver_role='Budget_Manager',
                        resolver_instruction='resolve_budget',
                        resolve_desc='Budget Manager reviews financial feasibility, verifies funding, and authorizes budget allocation.'
                    )
                },
                {
                    "name": "IT Support Access Request Workflow",
                    "category": "IT Support",
                    "sub_category": "Access Request",
                    "department": "IT Department",
                    "description": "Workflow for requesting access to systems or applications. (Triage -> Resolve -> Finalize)",
                    "steps_config": create_3_step_config(
                        resolver_role='Asset_Manager',
                        resolver_instruction='resolve_it',
                        resolve_desc='IT Reviewer verifies security policy, checks authorization, and provisions the requested system access.'
                    )
                },
                {
                    "name": "IT Support Software Installation Workflow",
                    "category": "Others",
                    "sub_category": "Software Installation",
                    "department": "IT Department",
                    "description": "Workflow for requesting software installation. (Triage -> Resolve -> Finalize)",
                    "steps_config": create_3_step_config(
                        resolver_role='Asset_Manager',
                        resolver_instruction='resolve_it',
                        resolve_desc='IT Reviewer verifies license compliance, checks for security risks, and deploys the software.'
                    )
                },
            ]

            # End logic options mapped to departments
            end_logic_map = {
                'Asset Department': 'asset',
                'Budget Department': 'budget',
                'IT Department': 'notification',
            }
            
            total_workflows = 0
            total_steps = 0
            total_transitions = 0

            for wf_data in workflows_to_create:
                # Assign end logic based on department
                end_logic = end_logic_map.get(wf_data['department'], 'notification')

                self.stdout.write(f'\n{self.style.MIGRATE_LABEL("Processing workflow:")} {wf_data["name"]}')

                wf, created = Workflows.objects.get_or_create(
                    name=wf_data["name"],
                    defaults={
                        'user_id': 1,
                        'description': wf_data.get("description", f'{wf_data["name"]} workflow'),
                        'category': wf_data["category"],
                        'sub_category': wf_data["sub_category"],
                        'status': 'deployed',
                        'is_published': True,
                        'end_logic': end_logic,
                        'department': wf_data["department"],
                    }
                )

                if created:
                    total_workflows += 1
                    self.stdout.write(self.style.SUCCESS(
                        f'  ✓ Created workflow with end_logic="{end_logic}" for {wf_data["department"]}'
                    ))
                else:
                    self.stdout.write(self.style.WARNING(
                        f'  ⚠ Workflow already exists (end_logic="{end_logic}")'
                    ))

                # Get workflow-specific step configuration
                steps_cfg = wf_data['steps_config']

                # Create steps with role-specific and workflow-specific details
                step_objs = []
                for idx, step_cfg in enumerate(steps_cfg):
                    # Step names are namespaced by workflow but use the clean labels
                    step_name = f"{wf.name} - {step_cfg['label']}"
                    instruction = random.choice(instructions_pool[step_cfg['instruction_type']])
                    
                    step, step_created = Steps.objects.get_or_create(
                        workflow_id=wf,
                        name=step_name,
                        defaults={
                            'description': step_cfg['description'],
                            'role_id': role_map[step_cfg['role']],
                            'instruction': instruction,
                            'order': idx + 1,
                            'is_initialized': (idx == 0)
                        }
                    )
                    step_objs.append(step)
                    
                    if step_created:
                        total_steps += 1
                        self.stdout.write(f'  	✓ Created step: {step_cfg["label"]} (Role: {role_map[step_cfg["role"]].name})')

                # Create transitions (no actions field)
                for idx, step_cfg in enumerate(steps_cfg):
                    step = step_objs[idx]
                    
                    # Determine transitions based on step position
                    transitions = []
                    
                    if idx == 0:  # Triage step
                        transitions = [
                            (None, step),  # start
                            (step, step_objs[idx + 1])  # submit -> Resolve
                        ]
                    elif idx == 1:  # Resolve step
                        transitions = [
                            (step, step_objs[idx + 1]),  # approve -> Finalize
                            (step, step_objs[idx - 1])   # reject -> Triage
                        ]
                    elif idx == 2:  # Finalize step
                        transitions = [
                            (step, None)  # complete -> End
                        ]
                    
                    for frm, to in transitions:
                        try:
                            # Create transition without triggering initialization checks
                            trans = StepTransition(
                                from_step_id=frm,
                                to_step_id=to,
                                workflow_id=wf
                            )
                            trans.save()
                            total_transitions += 1
                        except (ValidationError, IntegrityError) as e:
                            self.stdout.write(self.style.WARNING(
                                f'  	⚠ Skipped transition: {str(e)}'
                            ))
                            continue

            # Comprehensive summary output
            self.stdout.write('\n' + '='*70)
            self.stdout.write(self.style.SUCCESS('✓ 3-STEP SEEDING COMPLETED SUCCESSFULLY'))
            self.stdout.write('='*70)
            self.stdout.write(f'{self.style.MIGRATE_LABEL("Total Workflows Created:")} {total_workflows}')
            self.stdout.write(f'{self.style.MIGRATE_LABEL("Total Steps Created:")} {total_steps} ({total_workflows} workflows * 3 steps each)')
            self.stdout.write(f'{self.style.MIGRATE_LABEL("Total Transitions Created:")} {total_transitions}')
            
            self.stdout.write('\n' + self.style.MIGRATE_HEADING('Standardized 3-Step Workflow Summary:'))
            self.stdout.write('  • Asset Department (end_logic: asset)')
            self.stdout.write(f'    - Triage (Admin) -> Resolve (Asset Manager) -> Finalize (Admin)')
            self.stdout.write('  • Budget Department (end_logic: budget)')
            self.stdout.write(f'    - Triage (Admin) -> Resolve (Budget Manager) -> Finalize (Admin)')
            self.stdout.write('  • IT Department (end_logic: notification)')
            self.stdout.write(f'    - Triage (Admin) -> Resolve (Asset Manager) -> Finalize (Admin)')
            
            self.stdout.write('\n' + self.style.MIGRATE_HEADING('Workflows Created:'))
            self.stdout.write('  1. Asset Check In Workflow (Asset Management -> Check In)')
            self.stdout.write('  2. Asset Check Out Workflow (Asset Management -> Check Out)')
            self.stdout.write('  3. New Budget Proposal Workflow (Budget Management -> Budget Approval)')
            self.stdout.write('  4. IT Support Access Request Workflow (IT Support -> Access Request)')
            self.stdout.write('  5. IT Support Software Installation Workflow (IT Support -> Software Installation)')
            self.stdout.write('\n' + '='*70)

            if dry_run:
                self.stdout.write(self.style.WARNING('DRY RUN successful. No database changes were made.'))
                # Raise an exception to force a transaction rollback
                raise CommandError('Dry run complete, rolling back transaction.')