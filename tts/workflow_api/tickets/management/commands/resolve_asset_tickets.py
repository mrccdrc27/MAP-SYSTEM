"""
Management command to resolve asset tickets (Check-In and Check-Out) by category.

This command resolves tickets by progressing them through the workflow.
It filters tickets by category and sub-category matching Asset Check In/Out workflows.

Usage:
    # Resolve all Asset Check In tickets
    python manage.py resolve_asset_tickets --category "Asset Check In"
    
    # Resolve all Asset Check Out tickets  
    python manage.py resolve_asset_tickets --category "Asset Check Out"
    
    # Resolve both types
    python manage.py resolve_asset_tickets --all
    
    # Dry run to see what would happen
    python manage.py resolve_asset_tickets --category "Asset Check In" --dry-run
    
    # Limit number of tickets to resolve
    python manage.py resolve_asset_tickets --category "Asset Check Out" --limit 10
    
    # JSON output for scripting
    python manage.py resolve_asset_tickets --category "Asset Check In" --json
"""

from django.core.management.base import BaseCommand, CommandError
from django.utils import timezone
from django.db.models import Q
from tickets.models import WorkflowTicket
from task.models import Task, TaskItem, TaskItemHistory
from step.models import Steps, StepTransition
import json


# Category constants from seed_workflows2.py
ASSET_CHECKIN_CATEGORY = 'Asset Check In'
ASSET_CHECKIN_SUBCATEGORY = 'Check In'

ASSET_CHECKOUT_CATEGORY = 'Asset Check Out'
ASSET_CHECKOUT_SUBCATEGORY = 'Check Out'


class Command(BaseCommand):
    help = 'Resolve asset tickets (Check-In/Check-Out) by progressing through workflow steps'

    def add_arguments(self, parser):
        parser.add_argument(
            '--category',
            type=str,
            choices=[ASSET_CHECKIN_CATEGORY, ASSET_CHECKOUT_CATEGORY],
            help=f'Category to resolve: "{ASSET_CHECKIN_CATEGORY}" or "{ASSET_CHECKOUT_CATEGORY}"'
        )
        parser.add_argument(
            '--all',
            action='store_true',
            help='Resolve all asset tickets (both Check-In and Check-Out)'
        )
        parser.add_argument(
            '--limit',
            type=int,
            default=None,
            help='Maximum number of tickets to resolve'
        )
        parser.add_argument(
            '--json',
            action='store_true',
            help='Output result as JSON for scripting'
        )
        parser.add_argument(
            '--dry-run',
            action='store_true',
            help='Show what would happen without making changes'
        )
        parser.add_argument(
            '--status',
            type=str,
            default='Open',
            help='Source status of tickets to resolve (default: Open)'
        )
        parser.add_argument(
            '--target-status',
            type=str,
            default='Resolved',
            choices=['In Progress', 'Resolved'],
            help='Target status for tickets (default: Resolved)'
        )

    def handle(self, *args, **options):
        category = options.get('category')
        resolve_all = options.get('all')
        limit = options.get('limit')
        output_json = options.get('json')
        dry_run = options.get('dry_run')
        source_status = options.get('status')
        target_status = options.get('target_status')
        
        # Validate arguments
        if not category and not resolve_all:
            raise CommandError('Please specify --category or --all')
        
        # Determine categories to process
        if resolve_all:
            categories = [ASSET_CHECKIN_CATEGORY, ASSET_CHECKOUT_CATEGORY]
        else:
            categories = [category]
        
        results = {
            'success': True,
            'dry_run': dry_run,
            'categories_processed': categories,
            'source_status': source_status,
            'target_status': target_status,
            'tickets_processed': [],
            'summary': {
                'total': 0,
                'resolved': 0,
                'failed': 0,
                'skipped': 0,
            }
        }
        
        if not output_json:
            self.stdout.write(self.style.MIGRATE_HEADING(
                f'\n🔄 Resolving Asset Tickets\n'
            ))
            self.stdout.write(f'   Categories: {", ".join(categories)}')
            self.stdout.write(f'   Source Status: {source_status}')
            self.stdout.write(f'   Target Status: {target_status}')
            if dry_run:
                self.stdout.write(self.style.WARNING('   [DRY RUN MODE]\n'))
        
        # Find tickets matching criteria
        queryset = WorkflowTicket.objects.filter(
            ticket_data__category__in=categories,
            ticket_data__status=source_status
        ).order_by('-created_at')
        
        if limit:
            queryset = queryset[:limit]
        
        tickets = list(queryset)
        results['summary']['total'] = len(tickets)
        
        if not output_json:
            self.stdout.write(f'   Found {len(tickets)} ticket(s) to process\n')
        
        for ticket in tickets:
            ticket_result = self._resolve_ticket(
                ticket, 
                target_status, 
                dry_run, 
                output_json
            )
            results['tickets_processed'].append(ticket_result)
            
            if ticket_result['success']:
                results['summary']['resolved'] += 1
            elif ticket_result.get('skipped'):
                results['summary']['skipped'] += 1
            else:
                results['summary']['failed'] += 1
        
        # Output results
        if output_json:
            self.stdout.write(json.dumps(results, indent=2, default=str))
        else:
            self.stdout.write('\n' + '='*60)
            self.stdout.write(self.style.SUCCESS(f'✅ Resolution Complete!'))
            self.stdout.write(f'   Total: {results["summary"]["total"]}')
            self.stdout.write(self.style.SUCCESS(f'   Resolved: {results["summary"]["resolved"]}'))
            if results['summary']['failed'] > 0:
                self.stdout.write(self.style.ERROR(f'   Failed: {results["summary"]["failed"]}'))
            if results['summary']['skipped'] > 0:
                self.stdout.write(self.style.WARNING(f'   Skipped: {results["summary"]["skipped"]}'))

    def _resolve_ticket(self, workflow_ticket, target_status, dry_run, output_json):
        """Resolve a single ticket through its workflow."""
        ticket_number = workflow_ticket.ticket_number
        ticket_data = workflow_ticket.ticket_data or {}
        category = ticket_data.get('category', 'Unknown')
        
        result = {
            'ticket_number': ticket_number,
            'category': category,
            'success': False,
            'skipped': False,
            'message': '',
            'steps': [],
        }
        
        if not output_json:
            self.stdout.write(f'\n   Processing: {ticket_number} ({category})')
        
        # Find the task for this ticket
        try:
            task = Task.objects.select_related(
                'workflow_id',
                'current_step',
                'current_step__role_id',
            ).get(ticket_id=workflow_ticket)
        except Task.DoesNotExist:
            result['message'] = 'No Task found - ticket may not have been processed by workflow yet'
            result['skipped'] = True
            if not output_json:
                self.stdout.write(self.style.WARNING(f'      ⚠️  {result["message"]}'))
            return result
        
        # Check if task is already completed
        if task.status == 'completed':
            result['message'] = 'Task already completed'
            result['skipped'] = True
            result['success'] = True
            if not output_json:
                self.stdout.write(self.style.WARNING(f'      ⚠️  Task already completed'))
            return result
        
        # Get active task item
        task_items = TaskItem.objects.filter(task=task).select_related(
            'role_user', 'role_user__role_id', 'assigned_on_step'
        ).prefetch_related('taskitemhistory_set')
        
        if not task_items.exists():
            result['message'] = 'No TaskItems found'
            if not output_json:
                self.stdout.write(self.style.ERROR(f'      ❌ No TaskItems found'))
            return result
        
        # Find active task item
        active_item = None
        for item in task_items:
            latest_history = item.taskitemhistory_set.order_by('-created_at').first()
            status = latest_history.status if latest_history else 'new'
            if status in ['new', 'in progress']:
                active_item = item
                break
        
        if not active_item:
            result['message'] = 'No active TaskItem found'
            if not output_json:
                self.stdout.write(self.style.ERROR(f'      ❌ No active TaskItem found'))
            return result
        
        # Get final step order for this workflow
        max_order_step = Steps.objects.filter(
            workflow_id=task.workflow_id
        ).order_by('-order').first()
        final_step_order = max_order_step.order if max_order_step else 999
        
        # Process based on target status
        if target_status == 'In Progress':
            result = self._set_in_progress(
                task, active_item, workflow_ticket, 
                result, dry_run, output_json
            )
        else:  # Resolved
            result = self._resolve_through_steps(
                task, active_item, workflow_ticket,
                final_step_order, result, dry_run, output_json
            )
        
        return result

    def _set_in_progress(self, task, active_item, workflow_ticket, result, dry_run, output_json):
        """Set task to In Progress status."""
        if not dry_run:
            # Update task item status
            latest_history = active_item.taskitemhistory_set.order_by('-created_at').first()
            if not latest_history or latest_history.status != 'in progress':
                TaskItemHistory.objects.create(task_item=active_item, status='in progress')
            
            # Update task status
            if task.status != 'in progress':
                task.status = 'in progress'
                task.save()
            
            # Update workflow ticket status
            ticket_data = workflow_ticket.ticket_data
            if ticket_data.get('status') != 'In Progress':
                ticket_data['status'] = 'In Progress'
                workflow_ticket.ticket_data = ticket_data
                workflow_ticket.save()
        
        result['success'] = True
        result['message'] = 'Set to In Progress'
        result['steps'].append('Set status to In Progress')
        
        if not output_json:
            self.stdout.write(self.style.SUCCESS(f'      ✅ Set to In Progress'))
        
        return result

    def _resolve_through_steps(self, task, active_item, workflow_ticket, 
                               final_step_order, result, dry_run, output_json):
        """Progress task through all steps until resolution."""
        max_iterations = 10
        iteration = 0
        
        while iteration < max_iterations:
            iteration += 1
            current_step = task.current_step
            
            if not current_step:
                result['steps'].append('No current step - task may be completed')
                break
            
            result['steps'].append(f'Processing step: {current_step.name}')
            
            is_final_step = current_step.order >= final_step_order
            
            # Find available transitions
            transitions = StepTransition.objects.filter(
                from_step_id=current_step
            ).select_related('to_step_id', 'to_step_id__role_id')
            
            # Filter forward transitions
            forward_transitions = [
                t for t in transitions 
                if t.to_step_id and t.to_step_id.order > current_step.order
            ]
            
            if not transitions.exists() or is_final_step or not forward_transitions:
                # Final step - complete the task
                result['steps'].append(f'Final step reached: {current_step.name}')
                
                if not dry_run:
                    # Mark task item as resolved
                    TaskItemHistory.objects.create(task_item=active_item, status='resolved')
                    active_item.acted_on = timezone.now()
                    active_item.assigned_on_step = current_step
                    active_item.notes = f"[Asset Resolution] Auto-resolved at final step"
                    active_item.save()
                    
                    # Mark task as completed
                    task.status = 'completed'
                    task.resolution_time = timezone.now()
                    task.save()
                    
                    # Update workflow ticket status
                    ticket_data = workflow_ticket.ticket_data
                    ticket_data['status'] = 'Resolved'
                    workflow_ticket.ticket_data = ticket_data
                    workflow_ticket.save()
                
                result['success'] = True
                result['message'] = 'Resolved successfully'
                
                if not output_json:
                    self.stdout.write(self.style.SUCCESS(f'      ✅ Resolved'))
                
                break
            
            # Use forward transition
            transition = forward_transitions[0] if forward_transitions else transitions.first()
            
            if not transition.to_step_id:
                # Terminal transition
                if not dry_run:
                    TaskItemHistory.objects.create(task_item=active_item, status='resolved')
                    active_item.acted_on = timezone.now()
                    active_item.assigned_on_step = current_step
                    active_item.notes = f"[Asset Resolution] Terminal transition"
                    active_item.save()
                    
                    task.status = 'completed'
                    task.resolution_time = timezone.now()
                    task.save()
                    
                    ticket_data = workflow_ticket.ticket_data
                    ticket_data['status'] = 'Resolved'
                    workflow_ticket.ticket_data = ticket_data
                    workflow_ticket.save()
                
                result['success'] = True
                result['message'] = 'Resolved via terminal transition'
                break
            
            # Move to next step
            next_step = transition.to_step_id
            result['steps'].append(f'Transition: {transition.name} → {next_step.name}')
            
            if not dry_run:
                # Mark current item as resolved
                TaskItemHistory.objects.create(task_item=active_item, status='resolved')
                active_item.acted_on = timezone.now()
                active_item.assigned_on_step = current_step
                active_item.notes = f"[Asset Resolution] Progressed via {transition.name}"
                active_item.save()
                
                # Update task to next step
                task.current_step = next_step
                task.status = 'in progress'
                task.save()
                
                # Create new task item for next step
                new_item = TaskItem.objects.create(
                    task=task,
                    role_user=active_item.role_user,
                    assigned_on_step=next_step,
                    origin='System',
                )
                TaskItemHistory.objects.create(task_item=new_item, status='new')
                
                active_item = new_item
                task.refresh_from_db()
        
        return result
