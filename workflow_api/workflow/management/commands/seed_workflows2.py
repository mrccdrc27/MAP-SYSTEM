from django.core.management.base import BaseCommand, CommandError
from django.db import transaction, IntegrityError
from django.core.exceptions import ValidationError
from role.models import Roles
from action.models import Actions
from workflow.models import Workflows
from step.models import Steps, StepTransition
import random


class Command(BaseCommand):
    help = 'Seed workflows with step-specific actions and robust transitions, including random end logic.'

    def handle(self, *args, **options):
        with transaction.atomic():
            # Ensure required roles exist
            try:
                role_map = {
                    'Requester': Roles.objects.get(name='Admin'),
                    'Reviewer': Roles.objects.get(name='Manager'),
                    'Approver': Roles.objects.get(name='Employee'),
                }
            except Roles.DoesNotExist as e:
                raise CommandError(f"Missing expected role: {e}")

            main_names = ['General Inquiry', 'Technical Issue', 'Billing']
            sub_names = ['Software', 'Hardware', 'Payment']
            end_logic_choices = ['asset', 'budget', 'notification']

            for main in main_names:
                for sub in sub_names:
                    wf_name = f"{main} - {sub}"
                    end_logic = random.choice(end_logic_choices)

                    wf, created = Workflows.objects.get_or_create(
                        name=wf_name,
                        defaults={
                            'user_id': 1,
                            'description': f'{wf_name} workflow',
                            'category': main,           # now a CharField
                            'sub_category': sub,        # now a CharField
                            'status': 'draft',
                            'end_logic': end_logic,
                        }
                    )
                    self.stdout.write(self.style.SUCCESS(
                        f'Workflow "{wf_name}" {"created" if created else "exists"} '
                        f'with end_logic="{end_logic}"'
                    ))

                    # Define the step/action structure
                    steps_cfg = [
                        ('Submit Form', 'Requester', ['start', 'submit']),
                        ('Review Documents', 'Reviewer', ['approve', 'reject']),
                        ('Final Approval', 'Approver', ['complete']),
                    ]

                    # Create or fetch steps
                    step_objs = []
                    for idx, (label, role_key, _) in enumerate(steps_cfg):
                        step_name = f"{wf_name} - {label}"
                        step, _ = Steps.objects.get_or_create(
                            workflow_id=wf,  # assuming a FK to Workflows
                            name=step_name,
                            defaults={
                                'description': label,
                                'order': idx + 1,
                                'role_id': role_map[role_key]
                            }
                        )
                        step_objs.append(step)

                    # Create transitions for each event
                    for idx, (_, _, events) in enumerate(steps_cfg):
                        step = step_objs[idx]
                        for event in events:
                            act_name = f"{step.name} - {event}"
                            action, _ = Actions.objects.get_or_create(
                                name=act_name,
                                defaults={'description': f'{event} action on {step.name}'}
                            )

                            # Determine from/to
                            if event == 'start':
                                frm, to = None, step
                            elif event == 'submit':
                                frm, to = step, step_objs[idx + 1] if idx + 1 < len(step_objs) else None
                            elif event in ('approve',):
                                frm, to = step, step_objs[idx + 1] if idx + 1 < len(step_objs) else None
                            elif event == 'reject':
                                frm, to = step, step_objs[idx - 1] if idx > 0 else None
                            else:  # 'complete'
                                frm, to = step, None

                            try:
                                StepTransition.objects.get_or_create(
                                    from_step_id=frm,
                                    to_step_id=to,
                                    action_id=action
                                )
                            except (ValidationError, IntegrityError):
                                # skip invalid or duplicate
                                continue

            self.stdout.write(self.style.SUCCESS(
                'Seeding complete: workflows, steps, actions, transitions with random end logic.'
            ))
