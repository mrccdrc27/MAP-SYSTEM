"""
Management command for bulk resolution of tasks with controlled outcomes.

This command resolves tasks in bulk with support for:
- Date range filtering (all time or specific period)
- Resolution rate percentage (e.g., 70% resolved)
- Halfway completion rate for unresolved tasks
- SLA compliance rate (resolved within SLA vs late)
- Historical date backdating for resolutions
- Proper workflow step progression (not just status marking)

Usage:
    # Resolve 70% of all tasks, with 80% of unresolved at least started (using historical dates by default)
    python manage.py bulk_resolve --resolution-rate 70 --halfway-rate 80 --use-historical-dates

    # Resolve tasks from a specific date range with historical backdating
    python manage.py bulk_resolve --start-date 2025-01-01 --end-date 2025-12-31 --resolution-rate 70 --use-historical-dates

    # Resolve all tasks with custom historical date range (5-20 days after creation)
    python manage.py bulk_resolve --resolution-rate 100 --use-historical-dates --min-resolution-days 5 --max-resolution-days 20

    # Resolve tasks with today's date (old behavior - NOT recommended for historical data)
    python manage.py bulk_resolve --resolution-rate 70

    # Dry run to see what would happen
    python manage.py bulk_resolve --resolution-rate 70 --dry-run --use-historical-dates

    # Test with a single date
    python manage.py bulk_resolve --date 2025-08-13 --resolution-rate 100 --use-historical-dates

    # SLA compliance options with historical dates:
    # Resolve 70% of tasks, 85% within SLA, 15% with 1-7 day delays
    python manage.py bulk_resolve --resolution-rate 70 --sla-rate 85 --use-historical-dates

    # Custom delay range for SLA breaches (1-3 days)
    python manage.py bulk_resolve --resolution-rate 70 --sla-rate 80 --min-delay-days 1 --max-delay-days 3 --use-historical-dates
"""

from django.core.management.base import BaseCommand, CommandError
from django.utils import timezone
from django.db.models import Q
from datetime import datetime, timedelta
from decimal import Decimal
import random
import json

from tickets.models import WorkflowTicket
from task.models import Task, TaskItem, TaskItemHistory
from step.models import Steps, StepTransition


class Command(BaseCommand):
    help = 'Bulk resolve tasks with controlled resolution and halfway rates'

    def add_arguments(self, parser):
        # Date filtering
        parser.add_argument(
            '--start-date',
            type=str,
            default=None,
            help='Start date for filtering tasks (YYYY-MM-DD). If not provided, uses all time.'
        )
        parser.add_argument(
            '--end-date',
            type=str,
            default=None,
            help='End date for filtering tasks (YYYY-MM-DD). If not provided, uses today.'
        )
        parser.add_argument(
            '--date',
            type=str,
            default=None,
            help='Single date to process (YYYY-MM-DD). Overrides start-date/end-date.'
        )
        
        # Resolution control
        parser.add_argument(
            '--resolution-rate',
            type=int,
            default=70,
            help='Percentage of tasks to fully resolve (0-100). Default: 70'
        )
        parser.add_argument(
            '--halfway-rate',
            type=int,
            default=80,
            help='Percentage of unresolved tasks to be "halfway" (started but not finished). Default: 80'
        )
        parser.add_argument(
            '--max-progress-days',
            type=int,
            default=7,
            help='Max days after task creation for halfway progress timestamp. Default: 7'
        )
        
        # SLA compliance options
        parser.add_argument(
            '--sla-rate',
            type=int,
            default=100,
            help='Percentage of resolved tasks that are within SLA (0-100). Default: 100 (all within SLA)'
        )
        parser.add_argument(
            '--min-delay-days',
            type=int,
            default=1,
            help='Minimum delay in days for SLA breaches. Default: 1'
        )
        parser.add_argument(
            '--max-delay-days',
            type=int,
            default=7,
            help='Maximum delay in days for SLA breaches. Default: 7'
        )
        
        # Historical date options
        parser.add_argument(
            '--use-historical-dates',
            action='store_true',
            default=False,
            help='Use historical dates for resolutions (relative to task creation date)'
        )
        parser.add_argument(
            '--min-resolution-days',
            type=int,
            default=1,
            help='Minimum days after task creation to resolve (only with --use-historical-dates). Default: 1'
        )
        parser.add_argument(
            '--max-resolution-days',
            type=int,
            default=30,
            help='Maximum days after task creation to resolve (only with --use-historical-dates). Default: 30'
        )
        
        # Output options
        parser.add_argument(
            '--json',
            action='store_true',
            help='Output results as JSON'
        )
        parser.add_argument(
            '--dry-run',
            action='store_true',
            help='Show what would happen without making changes'
        )
        parser.add_argument(
            '--verbose',
            action='store_true',
            help='Show detailed progress for each task'
        )

    def handle(self, *args, **options):
        start_date = options['start_date']
        end_date = options['end_date']
        single_date = options['date']
        resolution_rate = options['resolution_rate']
        halfway_rate = options['halfway_rate']
        max_progress_days = options['max_progress_days']
        sla_rate = options['sla_rate']
        min_delay_days = options['min_delay_days']
        max_delay_days = options['max_delay_days']
        use_historical_dates = options['use_historical_dates']
        min_resolution_days = options['min_resolution_days']
        max_resolution_days = options['max_resolution_days']
        output_json = options['json']
        dry_run = options['dry_run']
        verbose = options['verbose']

        # Validate rates
        if not 0 <= resolution_rate <= 100:
            raise CommandError('Resolution rate must be between 0 and 100')
        if not 0 <= halfway_rate <= 100:
            raise CommandError('Halfway rate must be between 0 and 100')
        if not 0 <= sla_rate <= 100:
            raise CommandError('SLA rate must be between 0 and 100')
        if min_delay_days < 1:
            raise CommandError('Minimum delay days must be at least 1')
        if max_delay_days < min_delay_days:
            raise CommandError('Maximum delay days must be >= minimum delay days')
        if max_progress_days < 1:
            raise CommandError('Max progress days must be at least 1')
        if min_resolution_days < 1:
            raise CommandError('Minimum resolution days must be at least 1')
        if max_resolution_days < min_resolution_days:
            raise CommandError('Maximum resolution days must be >= minimum resolution days')

        # Store max_progress_days for use in _progress_task_halfway
        self.max_progress_days = max_progress_days
        
        # Store historical date settings
        self.use_historical_dates = use_historical_dates
        self.min_resolution_days = min_resolution_days
        self.max_resolution_days = max_resolution_days

        # Parse dates
        if single_date:
            try:
                target_date = datetime.strptime(single_date, '%Y-%m-%d').date()
                start_dt = timezone.make_aware(datetime.combine(target_date, datetime.min.time()))
                end_dt = timezone.make_aware(datetime.combine(target_date, datetime.max.time()))
            except ValueError:
                raise CommandError(f'Invalid date format: {single_date}. Use YYYY-MM-DD.')
        else:
            if start_date:
                try:
                    start_dt = timezone.make_aware(datetime.strptime(start_date, '%Y-%m-%d'))
                except ValueError:
                    raise CommandError(f'Invalid start date format: {start_date}. Use YYYY-MM-DD.')
            else:
                start_dt = None  # All time
            
            if end_date:
                try:
                    end_dt = timezone.make_aware(datetime.strptime(end_date, '%Y-%m-%d'))
                    end_dt = end_dt.replace(hour=23, minute=59, second=59)
                except ValueError:
                    raise CommandError(f'Invalid end date format: {end_date}. Use YYYY-MM-DD.')
            else:
                end_dt = timezone.now()

        # Build query
        query = Q(status__in=['pending', 'in progress'])
        if start_dt:
            query &= Q(created_at__gte=start_dt)
        if end_dt:
            query &= Q(created_at__lte=end_dt)

        # Get tasks
        tasks = Task.objects.filter(query).select_related(
            'workflow_id', 'current_step', 'ticket_id'
        ).order_by('created_at')

        total_tasks = tasks.count()

        if not output_json:
            self.stdout.write(self.style.MIGRATE_HEADING("\n" + "=" * 60))
            self.stdout.write(self.style.MIGRATE_HEADING("  TTS Bulk Resolution Tool"))
            self.stdout.write(self.style.MIGRATE_HEADING("=" * 60))
            self.stdout.write("")
            self.stdout.write(f"  Date Range: {start_dt.date() if start_dt else 'All Time'} → {end_dt.date() if end_dt else 'Now'}")
            self.stdout.write(f"  Total Tasks Found: {total_tasks}")
            self.stdout.write(f"  Resolution Rate: {resolution_rate}%")
            self.stdout.write(f"  Halfway Rate (for unresolved): {halfway_rate}%")
            self.stdout.write(f"  SLA Compliance Rate: {sla_rate}%")
            if sla_rate < 100:
                self.stdout.write(f"  SLA Breach Delay: {min_delay_days}-{max_delay_days} days")
            if use_historical_dates:
                self.stdout.write(f"  Historical Dates: Enabled (resolve {min_resolution_days}-{max_resolution_days} days after creation)")
            else:
                self.stdout.write(self.style.WARNING("  Historical Dates: Disabled (using current date for resolutions)"))
            if dry_run:
                self.stdout.write(self.style.WARNING("\n  [DRY RUN MODE - No changes will be made]"))
            self.stdout.write("")

        if total_tasks == 0:
            if output_json:
                self.stdout.write(json.dumps({
                    'success': True,
                    'message': 'No tasks found in the specified date range',
                    'total_tasks': 0
                }))
            else:
                self.stdout.write(self.style.WARNING("  No tasks found in the specified date range.\n"))
            return

        # Calculate distribution
        num_to_resolve = int(total_tasks * (resolution_rate / 100))
        num_unresolved = total_tasks - num_to_resolve
        num_halfway = int(num_unresolved * (halfway_rate / 100))
        num_ignored = num_unresolved - num_halfway
        
        # SLA distribution for resolved tasks
        num_within_sla = int(num_to_resolve * (sla_rate / 100))
        num_outside_sla = num_to_resolve - num_within_sla

        if not output_json:
            self.stdout.write(f"  Distribution Plan:")
            self.stdout.write(self.style.SUCCESS(f"    → Fully Resolved: {num_to_resolve} tasks"))
            if sla_rate < 100:
                self.stdout.write(self.style.SUCCESS(f"        - Within SLA: {num_within_sla} tasks"))
                self.stdout.write(self.style.WARNING(f"        - Outside SLA (delayed): {num_outside_sla} tasks"))
            self.stdout.write(self.style.WARNING(f"    → Halfway (started): {num_halfway} tasks"))
            self.stdout.write(f"    → Ignored (untouched): {num_ignored} tasks")
            self.stdout.write("")

        # Shuffle and categorize tasks
        task_list = list(tasks)
        random.shuffle(task_list)

        tasks_to_resolve = task_list[:num_to_resolve]
        tasks_halfway = task_list[num_to_resolve:num_to_resolve + num_halfway]
        tasks_ignored = task_list[num_to_resolve + num_halfway:]
        
        # Split resolved tasks into SLA compliant and breached
        random.shuffle(tasks_to_resolve)  # Shuffle again for SLA distribution
        tasks_within_sla = tasks_to_resolve[:num_within_sla]
        tasks_outside_sla = tasks_to_resolve[num_within_sla:]

        # Process results
        results = {
            'resolved': [],
            'resolved_within_sla': [],
            'resolved_outside_sla': [],
            'halfway': [],
            'ignored': [],
            'errors': []
        }

        # Process RESOLVED tasks WITHIN SLA (immediate resolution)
        if not output_json:
            self.stdout.write(self.style.MIGRATE_HEADING("  Processing RESOLVED tasks (Within SLA)..."))
        
        for task in tasks_within_sla:
            try:
                if verbose and not output_json:
                    self.stdout.write(f"    → Resolving Task {task.task_id} (within SLA)...")
                
                if not dry_run:
                    self._resolve_task_fully(task, sla_delay_days=0)
                
                result_entry = {
                    'task_id': task.task_id,
                    'ticket_number': task.ticket_id.ticket_number if task.ticket_id else None,
                    'created_at': task.created_at.isoformat() if task.created_at else None,
                    'sla_status': 'within_sla',
                    'delay_days': 0,
                }
                results['resolved'].append(result_entry)
                results['resolved_within_sla'].append(result_entry)
            except Exception as e:
                results['errors'].append({
                    'task_id': task.task_id,
                    'error': str(e),
                    'action': 'resolve_within_sla'
                })
                if verbose and not output_json:
                    self.stdout.write(self.style.ERROR(f"    ✗ Error resolving Task {task.task_id}: {e}"))

        # Process RESOLVED tasks OUTSIDE SLA (with random delay)
        if tasks_outside_sla and not output_json:
            self.stdout.write(self.style.MIGRATE_HEADING("  Processing RESOLVED tasks (Outside SLA - delayed)..."))
        
        for task in tasks_outside_sla:
            try:
                # Generate random delay between min and max days
                delay_days = random.randint(min_delay_days, max_delay_days)
                
                if verbose and not output_json:
                    self.stdout.write(f"    → Resolving Task {task.task_id} (outside SLA, +{delay_days} days)...")
                
                if not dry_run:
                    self._resolve_task_fully(task, sla_delay_days=delay_days)
                
                result_entry = {
                    'task_id': task.task_id,
                    'ticket_number': task.ticket_id.ticket_number if task.ticket_id else None,
                    'created_at': task.created_at.isoformat() if task.created_at else None,
                    'sla_status': 'outside_sla',
                    'delay_days': delay_days,
                }
                results['resolved'].append(result_entry)
                results['resolved_outside_sla'].append(result_entry)
            except Exception as e:
                results['errors'].append({
                    'task_id': task.task_id,
                    'error': str(e),
                    'action': 'resolve_outside_sla'
                })
                if verbose and not output_json:
                    self.stdout.write(self.style.ERROR(f"    ✗ Error resolving Task {task.task_id}: {e}"))

        # Process HALFWAY tasks (approve first step only)
        if not output_json:
            self.stdout.write(self.style.MIGRATE_HEADING("  Processing HALFWAY tasks..."))
        
        for task in tasks_halfway:
            try:
                if verbose and not output_json:
                    self.stdout.write(f"    → Starting Task {task.task_id} (halfway)...")
                
                if not dry_run:
                    self._progress_task_halfway(task, max_progress_days=self.max_progress_days)
                
                results['halfway'].append({
                    'task_id': task.task_id,
                    'ticket_number': task.ticket_id.ticket_number if task.ticket_id else None,
                    'created_at': task.created_at.isoformat() if task.created_at else None,
                })
            except Exception as e:
                results['errors'].append({
                    'task_id': task.task_id,
                    'error': str(e),
                    'action': 'halfway'
                })
                if verbose and not output_json:
                    self.stdout.write(self.style.ERROR(f"    ✗ Error on Task {task.task_id}: {e}"))

        # Mark IGNORED tasks (no action, just record)
        for task in tasks_ignored:
            results['ignored'].append({
                'task_id': task.task_id,
                'ticket_number': task.ticket_id.ticket_number if task.ticket_id else None,
                'created_at': task.created_at.isoformat() if task.created_at else None,
            })

        # Summary
        summary = {
            'success': True,
            'dry_run': dry_run,
            'date_range': {
                'start': start_dt.isoformat() if start_dt else None,
                'end': end_dt.isoformat() if end_dt else None,
            },
            'total_tasks': total_tasks,
            'resolution_rate': resolution_rate,
            'halfway_rate': halfway_rate,
            'sla_rate': sla_rate,
            'delay_range': {
                'min_days': min_delay_days,
                'max_days': max_delay_days,
            },
            'counts': {
                'resolved': len(results['resolved']),
                'resolved_within_sla': len(results['resolved_within_sla']),
                'resolved_outside_sla': len(results['resolved_outside_sla']),
                'halfway': len(results['halfway']),
                'ignored': len(results['ignored']),
                'errors': len(results['errors']),
            },
            'results': results if verbose else None,
        }

        if output_json:
            self.stdout.write(json.dumps(summary, default=str))
        else:
            self.stdout.write("")
            self.stdout.write(self.style.MIGRATE_HEADING("  Summary:"))
            self.stdout.write(self.style.SUCCESS(f"    ✓ Resolved: {len(results['resolved'])} tasks"))
            if sla_rate < 100:
                self.stdout.write(self.style.SUCCESS(f"        - Within SLA: {len(results['resolved_within_sla'])} tasks"))
                self.stdout.write(self.style.WARNING(f"        - Outside SLA: {len(results['resolved_outside_sla'])} tasks"))
            self.stdout.write(self.style.WARNING(f"    ○ Halfway: {len(results['halfway'])} tasks"))
            self.stdout.write(f"    - Ignored: {len(results['ignored'])} tasks")
            if results['errors']:
                self.stdout.write(self.style.ERROR(f"    ✗ Errors: {len(results['errors'])} tasks"))
            self.stdout.write("")
            self.stdout.write(self.style.SUCCESS("  Done!\n"))

    def _backdate_prior_history_entries(self, task_item, resolved_time):
        """
        Ensure all prior history entries have timestamps BEFORE the resolved_time.
        This fixes the issue where backdated 'resolved' entries might have timestamps
        earlier than existing 'new' or 'in progress' entries, causing incorrect
        'latest status' detection.
        
        Args:
            task_item: The TaskItem whose history needs fixing
            resolved_time: The timestamp for the 'resolved' entry
        """
        # Get all history entries for this task item that have timestamps >= resolved_time
        conflicting_entries = TaskItemHistory.objects.filter(
            task_item=task_item,
            created_at__gte=resolved_time
        ).exclude(status='resolved')  # Don't update resolved entries
        
        if conflicting_entries.exists():
            # Set them to 1 minute before resolved_time to maintain order
            prior_time = resolved_time - timedelta(minutes=1)
            conflicting_entries.update(created_at=prior_time)
    
    def _resolve_task_fully(self, task, sla_delay_days=0):
        """
        Progress task through ALL workflow steps until completion.
        Simulates proper workflow execution.
        
        Args:
            task: The Task object to resolve
            sla_delay_days: Number of days to delay resolution (for SLA breaches)
        """
        max_iterations = 10  # Safety limit
        iteration = 0
        
        # Calculate resolution timestamp
        base_resolution_time = task.created_at or timezone.now()
        
        if self.use_historical_dates:
            # Historical mode: resolve X days after task creation
            # Pick a random resolution time within the specified range
            resolution_days = random.randint(self.min_resolution_days, self.max_resolution_days)
            resolution_time = base_resolution_time + timedelta(
                days=resolution_days,
                hours=random.randint(1, 23),
                minutes=random.randint(0, 59)
            )
            
            # Don't let resolution time be in the future
            if resolution_time > timezone.now():
                # Ensure resolution_time is after created_at (at least 1 hour after)
                min_resolution = base_resolution_time + timedelta(hours=1)
                max_resolution = timezone.now() - timedelta(hours=1)
                if max_resolution > min_resolution:
                    # Pick a random time between creation and now
                    time_range = (max_resolution - min_resolution).total_seconds()
                    random_seconds = random.randint(0, int(time_range))
                    resolution_time = min_resolution + timedelta(seconds=random_seconds)
                else:
                    # If created_at is recent, just use current time
                    resolution_time = timezone.now()
        else:
            # Current mode: resolve with today's date (old behavior)
            if sla_delay_days > 0:
                # Add delay days plus some random hours for realism
                delay = timedelta(days=sla_delay_days, hours=random.randint(1, 23), minutes=random.randint(0, 59))
                resolution_time = timezone.now() + delay
            else:
                # Within SLA: resolve within 1-3 days for realism
                quick_delay = timedelta(days=random.randint(0, 2), hours=random.randint(1, 12), minutes=random.randint(0, 59))
                resolution_time = timezone.now() + quick_delay

        # Get active task item
        active_item = self._get_or_create_active_task_item(task)

        # Get final step order for this workflow
        final_step = Steps.objects.filter(
            workflow_id=task.workflow_id
        ).order_by('-order').first()
        final_step_order = final_step.order if final_step else 999
        
        # Calculate step timing for realistic progression
        total_steps = Steps.objects.filter(workflow_id=task.workflow_id).count()
        if total_steps > 0:
            time_per_step = (resolution_time - base_resolution_time) / total_steps
        else:
            time_per_step = timedelta(hours=1)
        
        current_step_time = base_resolution_time + timedelta(hours=random.randint(1, 4))  # Start after ticket creation

        # IMPORTANT: Backdate the initial task item's assigned_on to match task creation time
        # This ensures acted_on will always be >= assigned_on when using historical dates
        if self.use_historical_dates and active_item:
            initial_assigned_time = base_resolution_time + timedelta(minutes=random.randint(1, 30))
            TaskItem.objects.filter(pk=active_item.pk).update(assigned_on=initial_assigned_time)
            # Also backdate its history entries
            TaskItemHistory.objects.filter(
                task_item=active_item,
                created_at__gt=initial_assigned_time
            ).update(created_at=initial_assigned_time)
            active_item.refresh_from_db()

        while iteration < max_iterations:
            iteration += 1
            current_step = task.current_step

            if not current_step:
                # No step - mark as completed
                task.status = 'completed'
                task.resolution_time = resolution_time
                task.save()
                break

            is_final_step = current_step.order >= final_step_order

            # Find forward transitions
            transitions = StepTransition.objects.filter(
                from_step_id=current_step,
                workflow_id=task.workflow_id
            ).select_related('to_step_id')

            forward_transitions = [
                t for t in transitions 
                if t.to_step_id and t.to_step_id.order > current_step.order
            ]

            if is_final_step or not forward_transitions:
                # Final step - complete the task
                # First, ensure prior history entries don't have timestamps >= resolution_time
                self._backdate_prior_history_entries(active_item, resolution_time)
                
                history = TaskItemHistory.objects.create(task_item=active_item, status='resolved')
                # Backdate the history entry
                TaskItemHistory.objects.filter(pk=history.pk).update(created_at=resolution_time)
                
                active_item.acted_on = resolution_time
                active_item.assigned_on_step = current_step
                sla_note = "" if sla_delay_days == 0 else f" (SLA breach: +{sla_delay_days} days)"
                active_item.notes = f"[Bulk Resolution] Auto-resolved at final step{sla_note}"
                active_item.save()

                task.status = 'completed'
                task.resolution_time = resolution_time
                task.save()

                # Update workflow ticket status
                if task.ticket_id:
                    ticket_data = task.ticket_id.ticket_data
                    ticket_data['status'] = 'Resolved'
                    ticket_data['date_completed'] = resolution_time.isoformat()
                    task.ticket_id.ticket_data = ticket_data
                    task.ticket_id.status = 'Resolved'
                    task.ticket_id.save()
                break

            # Move to next step - calculate step completion time
            current_step_time = current_step_time + time_per_step
            transition = forward_transitions[0]
            next_step = transition.to_step_id

            # Mark current item as resolved
            # First, ensure prior history entries don't have timestamps >= current_step_time
            self._backdate_prior_history_entries(active_item, current_step_time)
            
            history = TaskItemHistory.objects.create(task_item=active_item, status='resolved')
            # Backdate the history entry
            TaskItemHistory.objects.filter(pk=history.pk).update(created_at=current_step_time)
            
            active_item.acted_on = current_step_time
            active_item.assigned_on_step = current_step
            active_item.notes = f"[Bulk Resolution] Progressed via {transition.name or 'auto'}"
            active_item.save()

            # Update task
            task.current_step = next_step
            task.status = 'in progress'
            task.save()

            # Create new task item for next step
            old_role_user = active_item.role_user
            active_item = TaskItem.objects.create(
                task=task,
                role_user=old_role_user,
                assigned_on_step=next_step,
                origin='System',
            )
            # Backdate the assigned_on field (must use update() to bypass auto_now_add)
            TaskItem.objects.filter(pk=active_item.pk).update(assigned_on=current_step_time)
            active_item.refresh_from_db()
            
            new_history = TaskItemHistory.objects.create(task_item=active_item, status='new')
            # Backdate the new history entry
            TaskItemHistory.objects.filter(pk=new_history.pk).update(created_at=current_step_time)

            task.refresh_from_db()

    def _progress_task_halfway(self, task, max_progress_days=7):
        """
        Progress task through the FIRST step only.
        Makes the task "started" but not completed.
        
        The "in progress" timestamp is set relative to when the task was created,
        within max_progress_days (default 7 days).
        
        Args:
            task: The Task object to progress
            max_progress_days: Maximum days after task creation for the progress timestamp
        """
        current_step = task.current_step
        if not current_step:
            return

        # Get active task item
        active_item = self._get_or_create_active_task_item(task)
        
        # Calculate a realistic "in progress" timestamp relative to task creation
        # Progress happens 1 hour to max_progress_days after task creation
        base_time = task.created_at or timezone.now()
        progress_delay = timedelta(
            days=random.randint(0, max_progress_days - 1),
            hours=random.randint(1, 23),
            minutes=random.randint(0, 59)
        )
        progress_time = base_time + progress_delay

        # Just set it to "in progress" - don't complete the step
        latest_history = active_item.taskitemhistory_set.order_by('-created_at').first()
        if not latest_history or latest_history.status != 'in progress':
            # Ensure prior history entries don't have timestamps >= progress_time
            self._backdate_prior_history_entries(active_item, progress_time)
            
            history = TaskItemHistory.objects.create(task_item=active_item, status='in progress')
            # Backdate the history entry to the calculated progress time
            TaskItemHistory.objects.filter(pk=history.pk).update(created_at=progress_time)

        # Update task status
        if task.status != 'in progress':
            task.status = 'in progress'
            task.save()

        # Update workflow ticket status
        if task.ticket_id:
            ticket_data = task.ticket_id.ticket_data
            if ticket_data.get('status') != 'In Progress':
                ticket_data['status'] = 'In Progress'
                task.ticket_id.ticket_data = ticket_data
                task.ticket_id.status = 'In Progress'
                task.ticket_id.save()

    def _get_or_create_active_task_item(self, task):
        """
        Get an active task item for the task, or create one if none exist.
        """
        task_items = TaskItem.objects.filter(task=task).select_related(
            'role_user', 'assigned_on_step'
        ).prefetch_related('taskitemhistory_set')

        # Find an active item
        for item in task_items:
            latest_history = item.taskitemhistory_set.order_by('-created_at').first()
            status = latest_history.status if latest_history else 'new'
            if status in ['new', 'in progress']:
                return item

        # If no active item, use the first one
        if task_items.exists():
            return task_items.first()

        # If no items at all, we need to create one
        # This shouldn't happen normally, but handle it gracefully
        from role.models import RoleUsers
        role_user = RoleUsers.objects.first()
        if not role_user:
            raise Exception("No RoleUsers found to assign task item")

        item = TaskItem.objects.create(
            task=task,
            role_user=role_user,
            assigned_on_step=task.current_step,
            origin='System',
        )
        TaskItemHistory.objects.create(task_item=item, status='new')
        return item
