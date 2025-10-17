from django.core.management.base import BaseCommand, CommandError
from django.db import transaction, IntegrityError
from django.core.exceptions import ValidationError
from role.models import Roles
from action.models import Actions
from workflow.models import Workflows
from step.models import Steps, StepTransition
import random

# Comprehensive instruction pool with workflow-specific and role-specific guidance
instructions_pool = {
    'asset_submit': [
        "Ensure all asset details (ID, serial number, condition) are accurately recorded. Attach photos of the asset if applicable and verify the asset tag is readable.",
        "Complete the asset form with location details, custodian information, and timestamp. Ensure the asset is physically present before submission.",
        "Verify asset documentation including purchase order, warranty information, and previous maintenance records. All fields marked as required must be completed.",
        "Record the current condition of the asset noting any damage, wear, or missing components. Include photos from multiple angles for verification.",
    ],
    'asset_review': [
        "Verify the asset exists in the inventory system and matches the submitted details. Check for any discrepancies in serial numbers or asset tags.",
        "Inspect the physical condition assessment and compare with the submitted documentation. Ensure all photos are clear and show current asset state.",
        "Review asset custody transfer documentation ensuring proper authorization from the previous custodian. Verify all signatures and approvals are present.",
        "Confirm asset location matches facility records and the assigned storage area. Check that all accessories and components are accounted for.",
    ],
    'asset_approve': [
        "Final review of asset check-in/check-out documentation ensuring compliance with asset management policies. Verify proper authorization levels.",
        "Validate that all asset tracking requirements are met including barcode scanning, location updates, and custodian assignment in the system.",
        "Ensure asset insurance and liability documentation is current and properly filed. Confirm depreciation schedules are updated if applicable.",
        "Authorize the custody transfer and update asset management system with new location, custodian, and status information.",
    ],
    'budget_submit': [
        "Provide detailed project justification including business case, expected ROI, and alignment with organizational goals. Attach supporting financial analysis.",
        "Complete budget breakdown by category including personnel, equipment, materials, and overhead costs. Ensure all cost estimates are documented with quotes.",
        "Submit project timeline with key milestones, deliverables, and resource requirements. Include risk assessment and contingency plans.",
        "Include funding source identification, cost-benefit analysis, and comparison with alternative solutions. Ensure all financial data is accurate.",
    ],
    'budget_review': [
        "Analyze the proposed budget for accuracy, completeness, and alignment with departmental budget allocation. Verify all cost calculations and projections.",
        "Review project justification against current fiscal priorities and available funding. Assess the feasibility and risk factors outlined in the proposal.",
        "Verify that all required financial documentation is attached including quotes, estimates, and vendor proposals. Check for budget policy compliance.",
        "Evaluate the project timeline and resource allocation for reasonableness. Ensure the proposal aligns with strategic planning objectives.",
    ],
    'budget_approve': [
        "Final authorization of budget allocation ensuring funds are available and properly allocated. Verify compliance with financial policies and approval thresholds.",
        "Confirm that all necessary financial reviews and risk assessments have been completed. Ensure proper account codes and cost centers are assigned.",
        "Validate that the project meets strategic objectives and funding priorities. Verify all required executive approvals have been obtained.",
        "Authorize budget release and establish financial tracking mechanisms for the project. Set up milestone-based payment schedules if applicable.",
    ],
    'it_submit': [
        "Specify exact system, application, or resource requiring access. Include business justification and required permission levels (read, write, admin).",
        "Provide detailed technical requirements including software version, operating system, hardware specifications, and compatibility needs.",
        "Submit manager approval for access request or software installation. Include security clearance level if accessing sensitive systems.",
        "Document the business need, expected usage duration, and compliance requirements. Attach vendor quotes for software licenses if applicable.",
    ],
    'it_review': [
        "Verify the access request complies with IT security policies and data classification requirements. Check that proper authorization has been obtained.",
        "Review technical requirements for compatibility with existing infrastructure. Assess security implications and potential vulnerabilities.",
        "Confirm software licensing compliance and availability. Check for existing licenses that can be reassigned before purchasing new ones.",
        "Evaluate the request against IT standards and approved software catalog. Ensure the solution aligns with enterprise architecture guidelines.",
    ],
    'it_approve': [
        "Final authorization for access provisioning or software installation. Verify all security assessments and compliance checks are complete.",
        "Confirm that proper licenses are available and assigned. Ensure installation will not conflict with existing systems or violate policies.",
        "Authorize IT team to proceed with implementation. Establish monitoring and audit requirements for the new access or software.",
        "Validate that user training requirements are identified and scheduled. Ensure proper documentation and support procedures are in place.",
    ],
}

class Command(BaseCommand):
    help = """
    Seed comprehensive workflows for Asset, Budget, and IT departments with role-specific configurations.
    
    This command creates:
    - 5 distinct workflows across 3 departments (Asset, Budget, IT)
    - Department-specific steps with appropriate role assignments
    - Workflow-specific instructions tailored to each department's processes
    - Actions and transitions that reflect real-world approval flows
    
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
        
        self.stdout.write(self.style.MIGRATE_HEADING('Starting workflow seeding process...'))
        
        with transaction.atomic():
            # Verify required roles exist
            try:
                role_map = {
                    'Requester': Roles.objects.get(name='Admin'),
                    'Asset_Reviewer': Roles.objects.get(name='Asset Manager'),
                    'Budget_Reviewer': Roles.objects.get(name='Budget Manager'),
                    'Budget_Approver': Roles.objects.get(name='Budget Manager'),
                    'IT_Reviewer': Roles.objects.get(name='Asset Manager'),  # Using Asset Manager for IT reviews
                }
                self.stdout.write(self.style.SUCCESS('✓ All required roles found'))
            except Roles.DoesNotExist as e:
                raise CommandError(f"Missing expected role: {e}. Please ensure roles are seeded first.")

            # Comprehensive workflow definitions with department-specific metadata
            workflows_to_create = [
                {
                    "name": "Asset - Asset Check-in",
                    "category": "Asset Category",
                    "sub_category": "Asset Check-in",
                    "department": "Asset Department",
                    "description": "Workflow for checking in company assets when returned by employees or newly acquired. Tracks asset condition, verifies documentation, updates inventory location, and completes custody transfer.",
                    "steps_config": [
                        {
                            'label': 'Submit Check-in Request',
                            'role': 'Requester',
                            'actions': ['start', 'submit'],
                            'description': 'Employee or admin submits asset check-in form with asset details, condition report, and photos. System generates check-in ticket.',
                            'instruction_type': 'asset_submit'
                        },
                        {
                            'label': 'Asset Manager Review',
                            'role': 'Asset_Reviewer',
                            'actions': ['approve', 'reject'],
                            'description': 'Asset Manager verifies asset condition, checks inventory records, confirms asset tag matches, and validates documentation completeness.',
                            'instruction_type': 'asset_review'
                        },
                        {
                            'label': 'Final Check-in Approval',
                            'role': 'Asset_Reviewer',
                            'actions': ['complete'],
                            'description': 'Asset Manager completes check-in process, updates asset status to available, records location in warehouse, and closes custody transfer.',
                            'instruction_type': 'asset_approve'
                        },
                    ]
                },
                {
                    "name": "Asset - Asset Check-out",
                    "category": "Asset Category",
                    "sub_category": "Asset Check-out",
                    "department": "Asset Department",
                    "description": "Workflow for checking out company assets to employees or contractors. Verifies authorization, documents asset condition at handover, establishes accountability, and updates custody records.",
                    "steps_config": [
                        {
                            'label': 'Submit Check-out Request',
                            'role': 'Requester',
                            'actions': ['start', 'submit'],
                            'description': 'Employee submits request specifying required asset, usage purpose, expected duration, and manager approval. System checks asset availability.',
                            'instruction_type': 'asset_submit'
                        },
                        {
                            'label': 'Asset Manager Review',
                            'role': 'Asset_Reviewer',
                            'actions': ['approve', 'reject'],
                            'description': 'Asset Manager verifies asset availability, reviews requester authorization, checks if similar assets exist, and validates business justification.',
                            'instruction_type': 'asset_review'
                        },
                        {
                            'label': 'Complete Check-out',
                            'role': 'Asset_Reviewer',
                            'actions': ['complete'],
                            'description': 'Asset Manager authorizes asset release, updates custody records, schedules return date, and provides asset to employee with documented handover.',
                            'instruction_type': 'asset_approve'
                        },
                    ]
                },
                {
                    "name": "Budget - Project Proposal",
                    "category": "Budget Category",
                    "sub_category": "Project Proposal",
                    "department": "Budget Department",
                    "description": "Workflow for submitting and approving new project proposals requiring budget allocation. Includes detailed cost analysis, ROI projections, funding approval, and financial tracking setup.",
                    "steps_config": [
                        {
                            'label': 'Submit Project Proposal',
                            'role': 'Requester',
                            'actions': ['start', 'submit'],
                            'description': 'Department head or project manager submits detailed proposal including budget breakdown, timeline, resources, ROI analysis, and strategic alignment justification.',
                            'instruction_type': 'budget_submit'
                        },
                        {
                            'label': 'Budget Analysis Review',
                            'role': 'Budget_Reviewer',
                            'actions': ['approve', 'reject'],
                            'description': 'Budget Manager analyzes financial feasibility, reviews cost estimates, verifies funding availability, assesses risk factors, and evaluates alignment with fiscal priorities.',
                            'instruction_type': 'budget_review'
                        },
                        {
                            'label': 'Budget Authorization',
                            'role': 'Budget_Approver',
                            'actions': ['complete'],
                            'description': 'Budget Manager authorizes fund allocation, assigns account codes, establishes financial controls, sets up milestone tracking, and releases approved budget.',
                            'instruction_type': 'budget_approve'
                        },
                    ]
                },
                {
                    "name": "IT - Access Request",
                    "category": "IT Category",
                    "sub_category": "Access Request",
                    "department": "IT Department",
                    "description": "Workflow for requesting access to systems, applications, databases, or network resources. Ensures proper security clearance, verifies authorization, and maintains access audit trail.",
                    "steps_config": [
                        {
                            'label': 'Submit Access Request',
                            'role': 'Requester',
                            'actions': ['start', 'submit'],
                            'description': 'Employee submits request specifying system/application, required access level, business justification, and manager approval with expected usage duration.',
                            'instruction_type': 'it_submit'
                        },
                        {
                            'label': 'IT Security Review',
                            'role': 'IT_Reviewer',
                            'actions': ['approve', 'reject'],
                            'description': 'IT reviewer validates request against security policies, verifies authorization, checks data classification requirements, and assesses security risks.',
                            'instruction_type': 'it_review'
                        },
                        {
                            'label': 'Grant Access',
                            'role': 'IT_Reviewer',
                            'actions': ['complete'],
                            'description': 'IT admin provisions access with appropriate permissions, documents access grant in security logs, notifies user, and schedules access review.',
                            'instruction_type': 'it_approve'
                        },
                    ]
                },
                {
                    "name": "IT - Software Installation",
                    "category": "IT Category",
                    "sub_category": "Software Installation",
                    "department": "IT Department",
                    "description": "Workflow for requesting installation of software on company devices. Includes license verification, compatibility checks, security assessment, and compliance validation.",
                    "steps_config": [
                        {
                            'label': 'Submit Installation Request',
                            'role': 'Requester',
                            'actions': ['start', 'submit'],
                            'description': 'Employee submits software installation request with software name, version, business justification, device details, and manager approval.',
                            'instruction_type': 'it_submit'
                        },
                        {
                            'label': 'IT Technical Review',
                            'role': 'IT_Reviewer',
                            'actions': ['approve', 'reject'],
                            'description': 'IT reviewer verifies software is on approved list, checks license availability, assesses compatibility, reviews security implications, and validates compliance.',
                            'instruction_type': 'it_review'
                        },
                        {
                            'label': 'Authorize Installation',
                            'role': 'IT_Reviewer',
                            'actions': ['complete'],
                            'description': 'IT admin authorizes installation, assigns license, schedules deployment, updates asset management system, and arranges user training if needed.',
                            'instruction_type': 'it_approve'
                        },
                    ]
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
            total_actions = 0
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
                        'status': 'draft',
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
                    step_name = f"{wf.name} - {step_cfg['label']}"
                    instruction = random.choice(instructions_pool[step_cfg['instruction_type']])
                    
                    step, step_created = Steps.objects.get_or_create(
                        workflow_id=wf,
                        name=step_name,
                        defaults={
                            'description': step_cfg['description'],
                            'role_id': role_map[step_cfg['role']],
                            'instruction': instruction
                        }
                    )
                    step_objs.append(step)
                    
                    if step_created:
                        total_steps += 1
                        self.stdout.write(f'    ✓ Created step: {step_cfg["label"]} (Role: {role_map[step_cfg["role"]].name})')

                # Create actions and transitions with workflow context
                for idx, step_cfg in enumerate(steps_cfg):
                    step = step_objs[idx]
                    
                    for event in step_cfg['actions']:
                        # Create shorter action names to fit within 64 character limit
                        # Format: "WF_SubCategory - Event" instead of full step name
                        act_name = f"{wf_data['sub_category']} - {step_cfg['label']} - {event}"
                        
                        # If still too long, use abbreviations
                        if len(act_name) > 64:
                            # Use abbreviations for common terms
                            act_name = act_name.replace('Installation', 'Install')
                            act_name = act_name.replace('Request', 'Req')
                            act_name = act_name.replace('Check-in', 'ChkIn')
                            act_name = act_name.replace('Check-out', 'ChkOut')
                            act_name = act_name.replace('Project Proposal', 'Proj Prop')
                            act_name = act_name.replace('Access Request', 'Access Req')
                            act_name = act_name.replace('Submit', 'Sub')
                            act_name = act_name.replace('Review', 'Rev')
                            act_name = act_name.replace('Approval', 'Appr')
                        
                        # Create workflow-specific action descriptions
                        action_descriptions = {
                            'start': f'Initiates the {wf_data["sub_category"]} workflow at the {step_cfg["label"]} step for {wf_data["department"]}',
                            'submit': f'Submits the {wf_data["sub_category"]} request and routes to {role_map[steps_cfg[idx+1]["role"]].name if idx+1 < len(steps_cfg) else "completion"} for review',
                            'approve': f'Approves the {wf_data["sub_category"]} request and advances to {steps_cfg[idx+1]["label"] if idx+1 < len(steps_cfg) else "completion"}',
                            'reject': f'Rejects the {wf_data["sub_category"]} request and returns to {steps_cfg[idx-1]["label"] if idx > 0 else "requester"} for corrections',
                            'complete': f'Completes the {wf_data["sub_category"]} workflow and triggers {end_logic} end logic'
                        }
                        
                        action, action_created = Actions.objects.get_or_create(
                            name=act_name,
                            defaults={'description': action_descriptions.get(event, f'{event} action on {step.name}')}
                        )
                        
                        if action_created:
                            total_actions += 1

                        # Define step transitions based on action type
                        if event == 'start':
                            frm, to = None, step
                        elif event == 'submit':
                            frm, to = step, step_objs[idx + 1] if idx + 1 < len(step_objs) else None
                        elif event == 'approve':
                            frm, to = step, step_objs[idx + 1] if idx + 1 < len(step_objs) else None
                        elif event == 'reject':
                            frm, to = step, step_objs[idx - 1] if idx > 0 else None
                        else:  # complete
                            frm, to = step, None

                        try:
                            transition, trans_created = StepTransition.objects.get_or_create(
                                from_step_id=frm,
                                to_step_id=to,
                                action_id=action
                            )
                            if trans_created:
                                total_transitions += 1
                        except (ValidationError, IntegrityError) as e:
                            self.stdout.write(self.style.WARNING(
                                f'    ⚠ Skipped transition {event}: {str(e)}'
                            ))
                            continue

            # Comprehensive summary output
            self.stdout.write('\n' + '='*70)
            self.stdout.write(self.style.SUCCESS('✓ SEEDING COMPLETED SUCCESSFULLY'))
            self.stdout.write('='*70)
            self.stdout.write(f'{self.style.MIGRATE_LABEL("Total Workflows Created:")} {total_workflows}')
            self.stdout.write(f'{self.style.MIGRATE_LABEL("Total Steps Created:")} {total_steps}')
            self.stdout.write(f'{self.style.MIGRATE_LABEL("Total Actions Created:")} {total_actions}')
            self.stdout.write(f'{self.style.MIGRATE_LABEL("Total Transitions Created:")} {total_transitions}')
            self.stdout.write('\n' + self.style.MIGRATE_HEADING('Department-Specific Workflow Summary:'))
            self.stdout.write('  • Asset Department (end_logic: asset):')
            self.stdout.write('    - Asset Check-in: Track returned/new assets with condition verification')
            self.stdout.write('    - Asset Check-out: Authorize asset assignment with custody transfer')
            self.stdout.write('  • Budget Department (end_logic: budget):')
            self.stdout.write('    - Project Proposal: Approve funding with financial analysis')
            self.stdout.write('  • IT Department (end_logic: notification):')
            self.stdout.write('    - Access Request: Grant system access with security verification')
            self.stdout.write('    - Software Installation: Deploy software with license compliance')
            self.stdout.write('\n' + self.style.MIGRATE_HEADING('Role Assignments:'))
            self.stdout.write(f'  • Requester: {role_map["Requester"].name} (initiates all workflows)')
            self.stdout.write(f'  • Asset Reviews: {role_map["Asset_Reviewer"].name}')
            self.stdout.write(f'  • Budget Reviews: {role_map["Budget_Reviewer"].name}')
            self.stdout.write(f'  • IT Reviews: {role_map["IT_Reviewer"].name}')
            self.stdout.write('\n' + '='*70)
