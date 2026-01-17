# File: core/management/commands/fix_missing_allocations.py

from django.core.management.base import BaseCommand
from django.db import transaction
from core.models import BudgetProposal, BudgetAllocation, Project

class Command(BaseCommand):
    help = 'Creates missing BudgetAllocations for approved proposals that have projects but no allocations'

    def handle(self, *args, **kwargs):
        # Find approved proposals with projects but missing allocations
        approved_proposals = BudgetProposal.objects.filter(
            status='APPROVED'
        ).prefetch_related('items', 'project', 'allocations')

        fixed_count = 0
        skipped_count = 0
        error_count = 0

        for proposal in approved_proposals:
            try:
                # Skip if no project exists
                if not hasattr(proposal, 'project') or proposal.project is None:
                    self.stdout.write(
                        self.style.WARNING(
                            f"⚠️  Proposal {proposal.id} ({proposal.external_system_id}) has no project. Skipping."
                        )
                    )
                    skipped_count += 1
                    continue

                project = proposal.project
                
                # Check if allocations already exist for this project
                existing_allocations = BudgetAllocation.objects.filter(
                    project=project,
                    is_active=True
                ).count()

                if existing_allocations > 0:
                    self.stdout.write(
                        self.style.SUCCESS(
                            f"✓ Proposal {proposal.id} ({proposal.external_system_id}) already has {existing_allocations} allocation(s). Skipping."
                        )
                    )
                    skipped_count += 1
                    continue

                # Create missing allocations
                items_processed = 0
                with transaction.atomic():
                    for item in proposal.items.all():
                        # Validate category exists
                        if not item.category:
                            self.stdout.write(
                                self.style.ERROR(
                                    f"❌ Item {item.id} in Proposal {proposal.id} has no category. Cannot create allocation."
                                )
                            )
                            continue

                        BudgetAllocation.objects.create(
                            fiscal_year=proposal.fiscal_year,
                            department=proposal.department,
                            category=item.category,
                            account=item.account,
                            project=project,
                            proposal=proposal,
                            amount=item.estimated_cost,
                            created_by_name='System Migration',
                            is_active=True,
                            is_locked=False  # Unlock so expenses can be submitted
                        )
                        items_processed += 1

                if items_processed > 0:
                    self.stdout.write(
                        self.style.SUCCESS(
                            f"✅ Created {items_processed} allocation(s) for Proposal {proposal.id} ({proposal.external_system_id})"
                        )
                    )
                    fixed_count += 1

            except Exception as e:
                self.stdout.write(
                    self.style.ERROR(
                        f"❌ Error processing Proposal {proposal.id}: {str(e)}"
                    )
                )
                error_count += 1
                continue

        # Summary
        self.stdout.write("\n" + "="*60)
        self.stdout.write(self.style.SUCCESS(f"✅ Fixed: {fixed_count} proposals"))
        self.stdout.write(self.style.WARNING(f"⚠️  Skipped: {skipped_count} proposals"))
        self.stdout.write(self.style.ERROR(f"❌ Errors: {error_count} proposals"))
        self.stdout.write("="*60 + "\n")

        if fixed_count > 0:
            self.stdout.write(
                self.style.SUCCESS(
                    f"\n🎉 Successfully created budget allocations for {fixed_count} approved proposals!"
                )
            )