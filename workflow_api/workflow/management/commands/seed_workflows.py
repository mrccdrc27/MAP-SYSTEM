from django.core.management.base import BaseCommand
from django.db import transaction, IntegrityError
from role.models import Roles
from workflow.models import Workflows, Category
from step.models import Steps, StepTransition
from django.core.exceptions import ValidationError
import random


class Command(BaseCommand):
    help = 'Seed workflows with step transitions and end logic.'

    def handle(self, *args, **options):
        with transaction.atomic():
            # Get existing roles (Admin, Asset Manager, Budget Manager)
            existing_roles = Roles.objects.all()
            if not existing_roles.exists():
                self.stdout.write(self.style.ERROR('❌ No roles found. Run seed_role first!'))
                return
            
            roles = list(existing_roles)
            self.stdout.write(self.style.SUCCESS(
                f'✅ Found {len(roles)} existing roles: {", ".join([r.name for r in roles])}'
            ))
            
            # Define main and sub category names
            main_names = ['General Inquiry', 'Technical Issue', 'Billing']
            sub_names = ['Software', 'Hardware', 'Payment']
            end_logic_choices = ['asset', 'budget', 'notification']

            for main in main_names:
                main_cat, _ = Category.objects.get_or_create(name=main, parent=None)
                for sub in sub_names:
                    # Ensure subcategory exists (respecting uniqueness)
                    try:
                        sub_cat, _ = Category.objects.get_or_create(name=sub, parent=main_cat)
                    except IntegrityError:
                        sub_cat = Category.objects.get(name=sub)

                    wf_name = f"{main} - {sub}"
                    end_logic = random.choice(end_logic_choices)
                    wf, created = Workflows.objects.get_or_create(
                        name=wf_name,
                        defaults={
                            'user_id': 1,
                            'description': f'{wf_name} workflow',
                            'category': main,
                            'sub_category': sub,
                            'department': 'General',
                            'status': 'deployed',
                            'is_published': True,
                            'end_logic': end_logic
                        }
                    )
                    self.stdout.write(self.style.SUCCESS(
                        f'Workflow "{wf_name}" {"created" if created else "exists"} with end_logic="{end_logic}".'
                    ))

                    # Define step configurations: (step label, role index, events)
                    steps_cfg = [
                        ('Submit Form', 0, ['start', 'submit']),
                        ('Review Documents', 1, ['approve', 'reject']),
                        ('Final Approval', 2, ['complete']),
                    ]

                    step_objs = []
                    for idx, (label, role_idx, _) in enumerate(steps_cfg):
                        step_name = f"{wf_name} - {label}"
                        step, _ = Steps.objects.get_or_create(
                            workflow_id=wf,
                            name=step_name,
                            defaults={
                                'description': label,
                                'order': idx + 1,
                                'role_id': roles[role_idx % len(roles)]
                            }
                        )
                        step_objs.append(step)

                    # Create transitions without actions
                    for idx, (label, _, events) in enumerate(steps_cfg):
                        step = step_objs[idx]
                        for event in events:
                            # Determine transition logic
                            if event == 'start':
                                frm, to = None, step
                            elif event == 'submit':
                                frm, to = step, step_objs[idx + 1] if idx + 1 < len(step_objs) else None
                            elif event == 'approve':
                                frm, to = step, step_objs[idx + 1] if idx + 1 < len(step_objs) else None
                            elif event == 'reject':
                                frm, to = step_objs[idx - 1] if idx > 0 else None, step
                            else:  # 'complete'
                                frm, to = step, None

                            try:
                                StepTransition.objects.get_or_create(
                                    from_step_id=frm,
                                    to_step_id=to
                                )
                            except (ValidationError, IntegrityError):
                                continue

            self.stdout.write(self.style.SUCCESS(
                '✅ Seeding complete: workflows, steps, transitions, end_logic.'
            ))
