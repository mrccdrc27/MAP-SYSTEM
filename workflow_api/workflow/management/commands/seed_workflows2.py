from django.core.management.base import BaseCommand, CommandError
from django.db import transaction, IntegrityError
from django.core.exceptions import ValidationError
from role.models import Roles
from action.models import Actions
from workflow.models import Workflows
from step.models import Steps, StepTransition
import random

instructions_pool = [
    "Ensure all fields are filled before proceeding.",
    "Double-check your inputs before submission.",
    "Follow the guidelines provided in the documentation.",
    "Contact your supervisor if you're unsure how to proceed.",
    "This step requires careful attention to detail.",
    "Only proceed if all previous steps are completed."
]

class Command(BaseCommand):
    help = 'Seed selected workflows for Asset, Budget, and IT departments with steps, actions, and transitions.'

    def handle(self, *args, **options):
        with transaction.atomic():
            try:
                role_map = {
                    'Requester': Roles.objects.get(name='Admin'),
                    'Reviewer': Roles.objects.get(name='Asset Manager'),
                    'Approver': Roles.objects.get(name='Budget Manager'),
                }
            except Roles.DoesNotExist as e:
                raise CommandError(f"Missing expected role: {e}")

            workflows_to_create = [
                {
                    "name": "Asset - Asset Check-in",
                    "category": "Asset Category",
                    "sub_category": "Asset Check-in",
                    "department": "Asset Department",
                },
                {
                    "name": "Asset - Asset Check-out",
                    "category": "Asset Category",
                    "sub_category": "Asset Check-out",
                    "department": "Asset Department",
                },
                {
                    "name": "Budget - Project Proposal",
                    "category": "Budget Category",
                    "sub_category": "Project Proposal",
                    "department": "Budget Department",
                },
                {
                    "name": "IT - Access Request",
                    "category": "IT Category",
                    "sub_category": "Access Request",
                    "department": "IT Department",
                },
                {
                    "name": "IT - Software Installation",
                    "category": "IT Category",
                    "sub_category": "Software Installation",
                    "department": "IT Department",
                },
            ]

            end_logic_choices = ['asset', 'budget', 'notification']

            for wf_data in workflows_to_create:
                end_logic = random.choice(end_logic_choices)

                wf, created = Workflows.objects.get_or_create(
                    name=wf_data["name"],
                    defaults={
                        'user_id': 1,
                        'description': f'{wf_data["name"]} workflow',
                        'category': wf_data["category"],
                        'sub_category': wf_data["sub_category"],
                        'status': 'draft',
                        'end_logic': end_logic,
                        'department': wf_data["department"],
                    }
                )

                self.stdout.write(self.style.SUCCESS(
                    f'Workflow "{wf.name}" {"created" if created else "exists"} with end_logic="{end_logic}"'
                ))

                steps_cfg = [
                    ('Submit Form', 'Requester', ['start', 'submit']),
                    ('Review Documents', 'Reviewer', ['approve', 'reject']),
                    ('Final Approval', 'Approver', ['complete']),
                ]

                step_objs = []
                for idx, (label, role_key, _) in enumerate(steps_cfg):
                    step_name = f"{wf.name} - {label}"
                    step, _ = Steps.objects.get_or_create(
                        workflow_id=wf,
                        name=step_name,
                        defaults={
                            'description': label,
                            'role_id': role_map[role_key],
                            'instruction': random.choice(instructions_pool)
                        }
                    )
                    step_objs.append(step)

                for idx, (_, _, events) in enumerate(steps_cfg):
                    step = step_objs[idx]
                    for event in events:
                        act_name = f"{step.name} - {event}"
                        action, _ = Actions.objects.get_or_create(
                            name=act_name,
                            defaults={'description': f'{event} action on {step.name}'}
                        )

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
                            StepTransition.objects.get_or_create(
                                from_step_id=frm,
                                to_step_id=to,
                                action_id=action
                            )
                        except (ValidationError, IntegrityError):
                            continue

            self.stdout.write(self.style.SUCCESS(
                'Seeding complete: 5 unique workflows for Asset, Budget, and IT departments.'
            ))
