from django.core.management.base import BaseCommand, CommandError
from django.db import transaction, IntegrityError
from django.core.exceptions import ValidationError
from role.models import Roles
from workflow.models import Workflows, Category
from step.models import Steps, StepTransition
from datetime import timedelta
import random

# Revised instruction pool for the 3-step (Triage, Resolve, Finalize) process
instructions_pool = {
    'triage_generic': [
        "Verify ticket completeness: Review the submission to ensure every mandatory field is filled. Check for a clear title, a detailed description, the business unit, and contact information. Ensure a strong 'Business Justification' is provided. If critical information is missing, return the ticket to the requester specifying what is required.",
        "Confirm department and category: Cross-reference the request type (e.g., 'new laptop,' 'password reset') with the internal service catalog. Confirm it is routed to the correct queue (e.g., IT Hardware, Finance). If misrouted, re-assign the ticket to the appropriate department and category with a note.",
        "Assign resolver group: Based on the validated category, assign the ticket to the specific specialist group responsible for that service (e.g., 'Network Team' for VPN, 'Asset Management' for a monitor). Avoid assigning to a general queue if a specialized team exists.",
        "Check for required attachments: Scrutinize the ticket for necessary supporting documentation. Purchasing requests must include vendor quotes. Access requests must have a manager's approval email attached. Bug reports should include screenshots or error logs. Do not proceed until all attachments are present.",
        "Set initial priority level: Evaluate the request's Impact (how many users or critical systems are affected?) and Urgency (how quickly is a resolution needed?). Use the organization's priority matrix (e.g., High Impact + High Urgency = P1) to set the initial priority (P1-P4) and apply the correct SLA.",
    ],
    'resolve_asset': [
        "For Check-in: Perform a detailed physical inspection of the returned asset. Note any new damage. Power on the device to test basic functionality. Compare the physical serial number and asset tag against the check-out documentation and the Asset Management Database. Flag any discrepancies.",
        "For Check-out: Verify in the system that the request has been fully approved by the user's line manager. Document the asset's condition (e.g., 'New in box' or 'Grade A refurbished') with time-stamped photos if necessary. Have the user digitally or physically sign a handover form acknowledging receipt.",
        "Update the asset's status in inventory: Immediately update the asset's record in the central Asset Management System (AMS). Change the status from 'In Stock' to 'Assigned' (or 'In Repair', 'Awaiting Disposal') to maintain a real-time, accurate inventory and prevent 'ghost' assets.",
        "Ensure all asset tracking requirements are met: Use a barcode scanner to log the asset's movement. Scan the asset tag and the new location (e.g., user's desk, repair-room shelf). This physical scan must match the digital update in the AMS to ensure a verifiable chain of custody.",
        "Authorize the custody transfer: After all physical checks and user sign-offs are complete, formally authorize the transfer in the AMS. This final action should update the asset's location, associate the custodian's employee ID with the asset record, and update the associated department code for depreciation.",
    ],
    'resolve_budget': [
        "Analyze the proposed budget for accuracy: Conduct a detailed line-item review of the submitted budget. Check all calculations for mathematical accuracy (sums, tax, unit costs). Verify that all anticipated costs (labor, materials, overhead) are included and that nothing significant is omitted.",
        "Review the project justification and ROI: Read the business case thoroughly. Assess the Return on Investment (ROI) calculation: are the projected benefits realistic and measurable? Does the project's justification align with current strategic goals (e.g., 'cost-cutting', 'market expansion')? Evaluate the listed risk factors.",
        "Verify all required financial documentation is attached: Confirm that all required financial attachments are present, valid, and from approved vendors. For procurement, this typically means at least two to three competing vendor quotes. For project work, a detailed Statement of Work (SOW) must be included.",
        "Final authorization of budget allocation: After confirming justification and documentation, perform a final check of the source fund or cost center. Verify that sufficient funds are available for this allocation. Formally authorize the allocation and apply the correct General Ledger (GL) codes and cost center tags.",
        "Authorize budget release and establish tracking: Execute the formal budget release, which may involve coordinating with the accounting department to move or reserve funds. Establish a tracking mechanism (e.g., a new project code) to monitor spending against the newly approved budget and set up reporting requirements.",
    ],
    'resolve_it': [
        "For Access Request: Verify the request complies with IT security policies. Review the request against the 'Principle of Least Privilege.' Does this user's role absolutely require this level of access (e.g., 'Admin')? Check the data's classification (e.g., 'Confidential', 'PII'). Any request for PII data must have explicit, multi-level approval from the data owner.",
        "For Software Install: Confirm licensing compliance and check for security vulnerabilities. Check the software against the 'Approved Software List.' If on the list, confirm a license is available. If the software is new, route the request to IT Security and Architecture for a vulnerability and compatibility review *before* purchase.",
        "Review technical requirements for compatibility: Evaluate the software or access's technical specifications. Will it run on the user's standard-build machine? Does it require specific firewall ports? Does it have dependencies (e.g., a specific Java version) that conflict with other enterprise applications?",
        "Provision the requested access or deploy the software: Once all checks and approvals are passed, proceed with the technical work. For access, add the user to the correct Active Directory security group. For software, use the approved deployment tool (e.g., SCCM, Intune) to push the application to the user's device. Avoid manual installs.",
        "Final authorization for provisioning: Before closing, perform a final check. Has the security assessment been completed and attached? Has the license been assigned in the asset system? Is the manager's and data owner's approval documented in the ticket? Formally authorize the provisioning only after all compliance checks are complete.",
    ],
    'finalize_generic': [
        "Confirm that the primary task is completed: Perform a final 'definition of done' check. Was the user's request *actually* fulfilled? Ask the user to confirm the software launches or they can access the folder. Double-check that all data has been accurately updated in all relevant systems (AMS, AD, Finance).",
        "Notify the original requester and key stakeholders: Send a clear, concise resolution notification to the original requester. Use plain language to summarize the work done and the final outcome. If the ticket involved other key stakeholders (e.g., the user's manager, a department head), ensure they are CC'd.",
        "Log or archive the ticket for audit: Ensure all conversations, approval emails, attachments (quotes, screenshots), and resolution notes are permanently logged within the ticket. The closed ticket must serve as a complete and standalone audit record of the entire workflow, from request to resolution.",
        "Add any final notes and resolution codes: In the private/resolver notes, add technical details that future support staff might need if this issue reappears. Select the correct resolution code (e.g., 'Software Install - Completed'). If this was a new issue, draft or update a Knowledge Base (KB) article.",
        "Formally close the ticket in the system: Change the ticket's status to 'Resolved' or 'Closed.' This action officially stops the SLA timer, removes the ticket from all active work queues, and marks the entire workflow as complete. This often triggers a customer satisfaction (CSAT) survey for the requester.",
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
            # Verify required roles exist in database
            try:
                role_map = {
                    'Admin': Roles.objects.get(name='Admin'),
                    'Asset_Manager': Roles.objects.get(name='Asset Manager'),
                    'Budget_Manager': Roles.objects.get(name='Budget Manager'),
                }
                self.stdout.write(self.style.SUCCESS('✓ All required roles found in database'))
                for role_key, role_obj in role_map.items():
                    self.stdout.write(f'  • {role_key}: {role_obj.name} (ID: {role_obj.role_id})')
            except Roles.DoesNotExist as e:
                raise CommandError(f"Missing expected role: {e}. Please ensure the following roles exist in the database: Admin, Asset Manager, Budget Manager")

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
                        'urgent_sla': timedelta(hours=4),
                        'high_sla': timedelta(hours=8),
                        'medium_sla': timedelta(days=2),
                        'low_sla': timedelta(days=5),
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

                    is_start = (idx == 0)
                    is_end = (idx == len(steps_cfg) - 1)
                    step, step_created = Steps.objects.get_or_create(
                        workflow_id=wf,
                        name=step_name,
                        defaults={
                            'description': step_cfg['description'],
                            'role_id': role_map[step_cfg['role']],
                            'escalate_to': role_map['Admin'],
                            'instruction': instruction,
                            'order': idx + 1,
                            'is_initialized': (idx == 0),
                            'is_start': is_start,
                            'is_end': is_end
                        }
                    )
                    
                    # Ensure escalate_to is set even for existing steps
                    if step.escalate_to is None:
                        step.escalate_to = role_map['Admin']
                        step.save()
                    
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
                                f'  	 ⚠ Skipped transition: {str(e)}'
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