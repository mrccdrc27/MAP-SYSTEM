"""
Management command to resolve a ticket by progressing it through the workflow.

This command simulates a user acting on a task to move it through all workflow
steps until completion. Used for integration testing.

Usage:
    python manage.py resolve_ticket HDTS-XXXXXX
    python manage.py resolve_ticket HDTS-XXXXXX --json
    python manage.py resolve_ticket HDTS-XXXXXX --dry-run
"""

from django.core.management.base import BaseCommand, CommandError
from django.utils import timezone
from tickets.models import WorkflowTicket
from task.models import Task, TaskItem, TaskItemHistory
from step.models import Steps, StepTransition
import json


class Command(BaseCommand):
    help = 'Resolve a ticket by progressing through all workflow steps'

    def add_arguments(self, parser):
        parser.add_argument(
            'ticket_number',
            type=str,
            help='Ticket number (e.g., HDTS-XXXXXX)'
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
            '--target-status',
            type=str,
            default='In Progress',
            choices=['In Progress', 'Resolved'],
            help='Target status for the ticket (default: In Progress)'
        )

    def handle(self, *args, **options):
        ticket_number = options['ticket_number']
        output_json = options['json']
        dry_run = options['dry_run']
        target_status = options['target_status']
        
        steps_log = []
        
        def log_step(message, level='info'):
            steps_log.append({'message': message, 'level': level})
            if not output_json:
                if level == 'success':
                    self.stdout.write(self.style.SUCCESS(f"   ✅ {message}"))
                elif level == 'warning':
                    self.stdout.write(self.style.WARNING(f"   ⚠️  {message}"))
                elif level == 'error':
                    self.stdout.write(self.style.ERROR(f"   ❌ {message}"))
                else:
                    self.stdout.write(f"   → {message}")
        
        if not output_json:
            self.stdout.write(self.style.MIGRATE_HEADING(f"\n🔄 Resolving Ticket: {ticket_number}\n"))
            if dry_run:
                self.stdout.write(self.style.WARNING("   [DRY RUN MODE - No changes will be made]\n"))
        
        # Find the workflow ticket
        try:
            workflow_ticket = WorkflowTicket.objects.get(ticket_number=ticket_number)
            log_step(f"Found WorkflowTicket (ID: {workflow_ticket.id})", 'success')
        except WorkflowTicket.DoesNotExist:
            error = f'WorkflowTicket {ticket_number} not found'
            if output_json:
                self.stdout.write(json.dumps({'success': False, 'error': error, 'steps': steps_log}))
                return
            raise CommandError(error)
        
        # Find the task for this ticket
        try:
            task = Task.objects.select_related(
                'workflow_id',
                'current_step',
                'current_step__role_id',
            ).get(ticket_id=workflow_ticket)
            log_step(f"Found Task (ID: {task.task_id}, Status: {task.status})", 'success')
        except Task.DoesNotExist:
            error = f'No Task found for WorkflowTicket {ticket_number}'
            if output_json:
                self.stdout.write(json.dumps({
                    'success': False, 
                    'error': error, 
                    'steps': steps_log,
                    'suggestion': 'Task may not have been created yet. Wait for Celery worker to process.'
                }))
                return
            raise CommandError(error)
        
        # Check if task is already completed
        if task.status == 'completed':
            log_step(f"Task is already completed!", 'warning')
            result = {
                'success': True,
                'ticket_number': ticket_number,
                'task_id': task.task_id,
                'task_status': task.status,
                'message': 'Task was already completed',
                'steps': steps_log,
            }
            if output_json:
                self.stdout.write(json.dumps(result))
            return
        
        # Get current task items (active assignments)
        task_items = TaskItem.objects.filter(task=task).select_related(
            'role_user', 'role_user__role_id', 'assigned_on_step'
        ).prefetch_related('taskitemhistory_set')
        
        if not task_items.exists():
            error = f'No TaskItems found for Task {task.task_id}'
            if output_json:
                self.stdout.write(json.dumps({'success': False, 'error': error, 'steps': steps_log}))
                return
            raise CommandError(error)
        
        log_step(f"Found {task_items.count()} TaskItem(s)", 'info')
        
        # Find an active task item to act with
        active_item = None
        for item in task_items:
            latest_history = item.taskitemhistory_set.order_by('-created_at').first()
            status = latest_history.status if latest_history else 'new'
            if status in ['new', 'in progress']:
                active_item = item
                log_step(f"Using active TaskItem (ID: {item.task_item_id}, User: {item.role_user.user_full_name}, Status: {status})", 'info')
                break
        
        if not active_item:
            error = 'No active TaskItem found (all are resolved/escalated)'
            if output_json:
                self.stdout.write(json.dumps({'success': False, 'error': error, 'steps': steps_log}))
                return
            raise CommandError(error)
        
        transitions_used = []
        
        # Process target_status
        if target_status == 'In Progress':
            # Just set the task to in progress
            if not dry_run:
                # Create history entry for 'in progress' if not already
                latest_history = active_item.taskitemhistory_set.order_by('-created_at').first()
                if not latest_history or latest_history.status != 'in progress':
                    TaskItemHistory.objects.create(task_item=active_item, status='in progress')
                    log_step(f"TaskItem status set to 'in progress'", 'success')
                
                # Update task status
                if task.status != 'in progress':
                    task.status = 'in progress'
                    task.save()
                    log_step(f"Task status updated to 'in progress'", 'success')
                
                # Update workflow ticket status
                ticket_data = workflow_ticket.ticket_data
                if ticket_data.get('status') != 'In Progress':
                    ticket_data['status'] = 'In Progress'
                    workflow_ticket.ticket_data = ticket_data
                    workflow_ticket.save()  # This triggers send_ticket_status task
                    log_step(f"WorkflowTicket status updated to 'In Progress' (sync triggered)", 'success')
            else:
                log_step(f"Would set TaskItem status to 'in progress'", 'info')
                log_step(f"Would update Task status to 'in progress'", 'info')
                log_step(f"Would update WorkflowTicket status to 'In Progress'", 'info')
        
        elif target_status == 'Resolved':
            # Progress through all steps until completion
            max_iterations = 10  # Safety limit
            iteration = 0
            
            # Get the maximum step order for this workflow to detect final step
            from step.models import Steps as AllSteps
            max_order = AllSteps.objects.filter(
                workflow_id=task.workflow_id
            ).order_by('-order').first()
            final_step_order = max_order.order if max_order else 999
            
            while iteration < max_iterations:
                iteration += 1
                current_step = task.current_step
                
                if not current_step:
                    log_step("No current step - task may be completed", 'warning')
                    break
                
                log_step(f"Processing step: {current_step.name} (order {current_step.order})", 'info')
                
                # Check if this is the final step (highest order)
                is_final_step = current_step.order >= final_step_order
                
                # Find available transitions from current step
                transitions = StepTransition.objects.filter(
                    from_step_id=current_step
                ).select_related('to_step_id', 'to_step_id__role_id')
                
                # Filter out backward transitions (to lower order steps)
                forward_transitions = [t for t in transitions if t.to_step_id and t.to_step_id.order > current_step.order]
                
                if not transitions.exists() or is_final_step or not forward_transitions:
                    # This is an end step - finalize
                    log_step(f"Final step '{current_step.name}' reached - completing task", 'info')
                    
                    if not dry_run:
                        # Mark task item as resolved
                        TaskItemHistory.objects.create(task_item=active_item, status='resolved')
                        active_item.acted_on = timezone.now()
                        active_item.assigned_on_step = current_step
                        active_item.notes = f"[Integration Test] Auto-resolved at final step"
                        active_item.save()
                        log_step(f"TaskItem marked as resolved", 'success')
                        
                        # Mark task as completed
                        task.status = 'completed'
                        task.resolution_time = timezone.now()
                        task.save()
                        log_step(f"Task marked as completed", 'success')
                        
                        # Update workflow ticket status to Resolved
                        ticket_data = workflow_ticket.ticket_data
                        ticket_data['status'] = 'Resolved'
                        workflow_ticket.ticket_data = ticket_data
                        workflow_ticket.save()  # This triggers send_ticket_status task
                        log_step(f"WorkflowTicket status updated to 'Resolved' (sync triggered)", 'success')
                        ticket_data['status'] = 'Resolved'
                        workflow_ticket.ticket_data = ticket_data
                        workflow_ticket.save()  # This triggers send_ticket_status task
                        log_step(f"WorkflowTicket status updated to 'Resolved' (sync triggered)", 'success')
                    else:
                        log_step(f"Would mark TaskItem as resolved", 'info')
                        log_step(f"Would mark Task as completed", 'info')
                        log_step(f"Would update WorkflowTicket status to 'Resolved'", 'info')
                    
                    break
                
                # Use the first forward transition (to avoid going backwards)
                transition = forward_transitions[0] if forward_transitions else transitions.first()
                transitions_used.append({
                    'transition_id': transition.transition_id,
                    'name': transition.name,
                    'from_step': current_step.name,
                    'to_step': transition.to_step_id.name if transition.to_step_id else 'END',
                })
                
                if not transition.to_step_id:
                    # Terminal transition
                    log_step(f"Using terminal transition: {transition.name}", 'info')
                    
                    if not dry_run:
                        # Mark task item as resolved
                        TaskItemHistory.objects.create(task_item=active_item, status='resolved')
                        active_item.acted_on = timezone.now()
                        active_item.assigned_on_step = current_step
                        active_item.notes = f"[Integration Test] Auto-resolved via terminal transition"
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
                        log_step(f"Task completed via terminal transition", 'success')
                    
                    break
                
                # Move to next step
                next_step = transition.to_step_id
                log_step(f"Transition: {transition.name} → {next_step.name}", 'info')
                
                if not dry_run:
                    # Mark current item as resolved for this step
                    TaskItemHistory.objects.create(task_item=active_item, status='resolved')
                    active_item.acted_on = timezone.now()
                    active_item.assigned_on_step = current_step
                    active_item.notes = f"[Integration Test] Progressed via {transition.name}"
                    active_item.save()
                    
                    # Update task to next step
                    task.current_step = next_step
                    task.status = 'in progress'
                    task.save()
                    
                    # Create new task item for next step (simplified - reuse same user)
                    new_item = TaskItem.objects.create(
                        task=task,
                        role_user=active_item.role_user,
                        assigned_on_step=next_step,
                        origin='System',
                    )
                    TaskItemHistory.objects.create(task_item=new_item, status='new')
                    
                    # Use the new item for next iteration
                    active_item = new_item
                    
                    log_step(f"Moved to step: {next_step.name}", 'success')
                    
                    # Refresh task from DB
                    task.refresh_from_db()
        
        result = {
            'success': True,
            'ticket_number': ticket_number,
            'task_id': task.task_id,
            'task_status': task.status,
            'dry_run': dry_run,
            'target_status': target_status,
            'transitions_used': transitions_used,
            'steps': steps_log,
        }
        
        if output_json:
            self.stdout.write(json.dumps(result))
        else:
            self.stdout.write(self.style.SUCCESS(f"\n✅ Ticket {ticket_number} processed successfully!"))
            self.stdout.write(f"   Final Task Status: {task.status}")
            if transitions_used:
                self.stdout.write(f"   Transitions Used: {len(transitions_used)}")
