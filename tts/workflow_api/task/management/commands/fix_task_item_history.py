"""
Management command to fix TaskItemHistory entries where 'resolved' or other
terminal statuses have timestamps earlier than 'new' entries.

This fixes a bug in bulk_resolve where backdated 'resolved' entries could end up
with timestamps earlier than the original 'new' entries, causing the frontend
to incorrectly show tasks as not acted upon.

Usage:
    python manage.py fix_task_item_history
    python manage.py fix_task_item_history --dry-run  # Preview changes
"""

from django.core.management.base import BaseCommand
from django.db.models import Q
from datetime import timedelta

from task.models import TaskItem, TaskItemHistory


class Command(BaseCommand):
    help = 'Fix TaskItemHistory entries with incorrect timestamp ordering'

    def add_arguments(self, parser):
        parser.add_argument(
            '--dry-run',
            action='store_true',
            help='Show what would be fixed without making changes'
        )
        parser.add_argument(
            '--verbose',
            action='store_true',
            help='Show detailed output for each fix'
        )

    def handle(self, *args, **options):
        dry_run = options['dry_run']
        verbose = options['verbose']

        self.stdout.write(self.style.MIGRATE_HEADING("\n" + "=" * 60))
        self.stdout.write(self.style.MIGRATE_HEADING("  TTS TaskItemHistory Fix Tool"))
        self.stdout.write(self.style.MIGRATE_HEADING("=" * 60))
        
        if dry_run:
            self.stdout.write(self.style.WARNING("  DRY RUN - No changes will be made"))
        
        self.stdout.write("")

        # Terminal statuses that should be the "latest" when present
        terminal_statuses = ['resolved', 'escalated', 'reassigned', 'breached']
        
        # Find TaskItems that have both terminal and non-terminal statuses
        task_items_with_issues = []
        
        # Get TaskItems with terminal status
        terminal_items = TaskItem.objects.filter(
            taskitemhistory_set__status__in=terminal_statuses
        ).distinct().prefetch_related('taskitemhistory_set')

        for ti in terminal_items:
            # Check if the latest status is a terminal status
            latest_history = ti.taskitemhistory_set.order_by('-created_at').first()
            
            if latest_history and latest_history.status not in terminal_statuses:
                # Found an issue - terminal status exists but isn't the latest
                terminal_entry = ti.taskitemhistory_set.filter(
                    status__in=terminal_statuses
                ).order_by('-created_at').first()
                
                if terminal_entry:
                    task_items_with_issues.append({
                        'task_item': ti,
                        'latest_status': latest_history.status,
                        'terminal_entry': terminal_entry,
                        'terminal_status': terminal_entry.status,
                    })

        self.stdout.write(f"  Found {len(task_items_with_issues)} TaskItems with incorrect ordering")
        self.stdout.write("")

        if not task_items_with_issues:
            self.stdout.write(self.style.SUCCESS("  No issues found. All TaskItems have correct history ordering."))
            return

        fixed_count = 0
        for issue in task_items_with_issues:
            ti = issue['task_item']
            terminal_entry = issue['terminal_entry']
            
            if verbose:
                self.stdout.write(
                    f"  TaskItem {ti.task_item_id}: "
                    f"latest={issue['latest_status']}, should be={issue['terminal_status']}"
                )

            if not dry_run:
                # Fix: backdate all non-terminal entries to be before the terminal entry
                prior_time = terminal_entry.created_at - timedelta(minutes=1)
                
                conflicting_entries = ti.taskitemhistory_set.filter(
                    created_at__gte=terminal_entry.created_at
                ).exclude(status__in=terminal_statuses)
                
                conflicting_entries.update(created_at=prior_time)
            
            fixed_count += 1

        self.stdout.write("")
        if dry_run:
            self.stdout.write(self.style.WARNING(f"  Would fix {fixed_count} TaskItems"))
        else:
            self.stdout.write(self.style.SUCCESS(f"  Fixed {fixed_count} TaskItems"))
        
        self.stdout.write("")
        self.stdout.write(self.style.SUCCESS("  Done!\n"))
