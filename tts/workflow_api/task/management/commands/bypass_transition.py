"""
Management command to bypass user transition approval and execute transitions on behalf of users.

This command allows admins to manually progress tickets through the workflow
without requiring user login. Useful for testing, stuck tickets, or emergency processing.

Usage:
    python manage.py bypass_transition                          # Interactive mode (continuous)
    python manage.py bypass_transition HDTS-XXXXXX              # Start with specific ticket
    python manage.py bypass_transition HDTS-XXXXXX --auto       # Auto-select first available transition
    python manage.py bypass_transition HDTS-XXXXXX --finalize   # Finalize end step
    python manage.py bypass_transition --json                   # JSON output mode
    python manage.py bypass_transition --once                   # Single run (no loop)
    
    Press Ctrl+C to exit interactive mode.
"""

from django.core.management.base import BaseCommand, CommandError
from django.utils import timezone
from tickets.models import WorkflowTicket
from task.models import Task, TaskItem, TaskItemHistory
from step.models import Steps, StepTransition
from task.utils.assignment import assign_users_for_step
import json
import sys


class Command(BaseCommand):
    help = 'Bypass user transition approval and execute workflow transitions on behalf of users'

    def add_arguments(self, parser):
        parser.add_argument(
            'ticket_number',
            type=str,
            nargs='?',
            default=None,
            help='Ticket number (e.g., HDTS-XXXXXX). If not provided, will prompt interactively.'
        )
        parser.add_argument(
            '--json',
            action='store_true',
            help='Output result as JSON for scripting'
        )
        parser.add_argument(
            '--auto',
            action='store_true',
            help='Auto-select first available forward transition'
        )
        parser.add_argument(
            '--finalize',
            action='store_true',
            help='Finalize the current step (for end steps)'
        )
        parser.add_argument(
            '--notes',
            type=str,
            default='Admin bypass - executed via management command',
            help='Notes to record for this transition'
        )
        parser.add_argument(
            '--dry-run',
            action='store_true',
            help='Show what would happen without making changes'
        )
        parser.add_argument(
            '--transition-id',
            type=int,
            default=None,
            help='Specific transition ID to execute'
        )
        parser.add_argument(
            '--once',
            action='store_true',
            help='Run once and exit (no continuous loop)'
        )

    def handle(self, *args, **options):
        output_json = options['json']
        once_mode = options['once'] or options['ticket_number'] is not None
        
        if not output_json:
            self.stdout.write(self.style.MIGRATE_HEADING("\n" + "=" * 50))
            self.stdout.write(self.style.MIGRATE_HEADING("  Bypass Transition - Admin Workflow Tool"))
            self.stdout.write(self.style.MIGRATE_HEADING("=" * 50))
            if not once_mode:
                self.stdout.write(self.style.WARNING("  Press Ctrl+C to exit\n"))
        
        while True:
            try:
                self._process_ticket(*args, **options)
                
                # If once mode or json mode, exit after single run
                if once_mode or output_json:
                    break
                    
                self.stdout.write("")
                
            except KeyboardInterrupt:
                self.stdout.write(self.style.SUCCESS("\n\n   Exiting bypass transition tool. Goodbye!\n"))
                sys.exit(0)
            except Exception as e:
                if output_json:
                    self.stdout.write(json.dumps({'success': False, 'error': str(e)}))
                    if once_mode:
                        break
                else:
                    self.stdout.write(self.style.ERROR(f"\n   ERROR: {str(e)}"))
                    if once_mode:
                        break
                    self.stdout.write(self.style.WARNING("   Try again or press Ctrl+C to exit.\n"))

    def _process_ticket(self, *args, **options):
        """Process a single ticket transition"""
        ticket_number = options['ticket_number']
        output_json = options['json']
        auto_mode = options['auto']
        finalize = options['finalize']
        notes = options['notes']
        dry_run = options['dry_run']
        transition_id = options['transition_id']
        
        steps_log = []
        
        def log_step(message, level='info'):
            steps_log.append({'message': message, 'level': level})
            if not output_json:
                if level == 'success':
                    self.stdout.write(self.style.SUCCESS(f"   [OK] {message}"))
                elif level == 'warning':
                    self.stdout.write(self.style.WARNING(f"   [WARNING] {message}"))
                elif level == 'error':
                    self.stdout.write(self.style.ERROR(f"   [ERROR] {message}"))
                else:
                    self.stdout.write(f"   - {message}")
        
        # Interactive ticket number input
        if not ticket_number:
            if output_json:
                self.stdout.write(json.dumps({'success': False, 'error': 'ticket_number is required in JSON mode'}))
                return
            ticket_number = input("\nEnter ticket number (e.g., HDTS-123456): ").strip()
            if not ticket_number:
                self.stdout.write(self.style.WARNING("   [WARNING] No ticket number provided. Skipping.\n"))
                return
        
        if not output_json:
            self.stdout.write(self.style.MIGRATE_HEADING(f"\nBypass Transition for Ticket: {ticket_number}\n"))
            if dry_run:
                self.stdout.write(self.style.WARNING("   [DRY RUN MODE - No changes will be made]\n"))
        
        # Find the workflow ticket
        try:
            workflow_ticket = WorkflowTicket.objects.get(ticket_number=ticket_number)
            log_step(f"Found WorkflowTicket (ID: {workflow_ticket.id})", 'success')
        except WorkflowTicket.DoesNotExist:
            error = f'WorkflowTicket {ticket_number} not found'
            log_step(error, 'error')
            if output_json:
                self.stdout.write(json.dumps({'success': False, 'error': error, 'steps': steps_log}))
            return
        
        # Find the task for this ticket
        try:
            task = Task.objects.select_related(
                'workflow_id',
                'workflow_version',
                'current_step',
                'current_step__role_id',
            ).get(ticket_id=workflow_ticket)
            log_step(f"Found Task (ID: {task.task_id}, Status: {task.status})", 'success')
        except Task.DoesNotExist:
            error = f'No Task found for WorkflowTicket {ticket_number}'
            log_step(error, 'error')
            if output_json:
                self.stdout.write(json.dumps({
                    'success': False, 
                    'error': error, 
                    'steps': steps_log,
                    'suggestion': 'Task may not have been created yet. Wait for Celery worker to process.'
                }))
            return
        
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
        
        current_step = task.current_step
        if not current_step:
            error = 'Task has no current step assigned'
            log_step(error, 'error')
            if output_json:
                self.stdout.write(json.dumps({'success': False, 'error': error, 'steps': steps_log}))
            return
        
        log_step(f"Current Step: {current_step.name} (ID: {current_step.step_id}, Order: {current_step.order})", 'info')
        
        # Get active task item (user assignment)
        task_items = TaskItem.objects.filter(task=task).select_related(
            'role_user', 'role_user__role_id', 'assigned_on_step'
        ).prefetch_related('taskitemhistory_set')
        
        active_item = None
        for item in task_items:
            latest_history = item.taskitemhistory_set.order_by('-created_at').first()
            item_status = latest_history.status if latest_history else 'new'
            if item_status in ['new', 'in progress']:
                active_item = item
                log_step(f"Active User: {item.role_user.user_full_name} (User ID: {item.role_user.user_id}, Status: {item_status})", 'info')
                break
        
        if not active_item:
            error = 'No active TaskItem found (all are resolved/escalated)'
            log_step(error, 'error')
            if output_json:
                self.stdout.write(json.dumps({'success': False, 'error': error, 'steps': steps_log}))
            return
        
        # Get available transitions from current step
        transitions = StepTransition.objects.filter(
            from_step_id=current_step
        ).select_related('to_step_id', 'to_step_id__role_id')
        
        is_end_step = not transitions.exists()
        
        if not output_json:
            self.stdout.write(f"\n   Available Actions:")
        
        available_actions = []
        
        # Add transitions
        for idx, trans in enumerate(transitions, 1):
            to_step_name = trans.to_step_id.name if trans.to_step_id else "TERMINAL (Complete)"
            action_label = trans.name or f'Transition #{trans.transition_id}'
            action = {
                'index': idx,
                'type': 'transition',
                'transition_id': trans.transition_id,
                'action_label': action_label,
                'to_step': to_step_name,
                'to_step_id': trans.to_step_id.step_id if trans.to_step_id else None,
            }
            available_actions.append(action)
            if not output_json:
                self.stdout.write(f"      [{idx}] {action_label} → {to_step_name}")
        
        # Add finalize option for end steps
        if is_end_step:
            action = {
                'index': len(available_actions) + 1,
                'type': 'finalize',
                'transition_id': None,
                'action_label': 'Finalize (Complete Task)',
                'to_step': None,
                'to_step_id': None,
            }
            available_actions.append(action)
            if not output_json:
                self.stdout.write(self.style.SUCCESS(f"      [{len(available_actions)}] Finalize (Complete Task)"))
        
        if not available_actions:
            error = 'No available actions for current step'
            log_step(error, 'error')
            if output_json:
                self.stdout.write(json.dumps({'success': False, 'error': error, 'steps': steps_log}))
            return
        
        # Determine which action to take
        selected_action = None
        
        if finalize:
            # Find finalize action
            for action in available_actions:
                if action['type'] == 'finalize':
                    selected_action = action
                    break
            if not selected_action:
                error = 'Finalize option not available (not an end step)'
                log_step(error, 'error')
                if output_json:
                    self.stdout.write(json.dumps({'success': False, 'error': error, 'steps': steps_log}))
                return
        elif transition_id is not None:
            # Find specific transition
            for action in available_actions:
                if action['type'] == 'transition' and action['transition_id'] == transition_id:
                    selected_action = action
                    break
            if not selected_action:
                error = f'Transition ID {transition_id} not available from current step'
                log_step(error, 'error')
                if output_json:
                    self.stdout.write(json.dumps({'success': False, 'error': error, 'steps': steps_log}))
                return
        elif auto_mode:
            # Auto-select first forward transition or finalize
            for action in available_actions:
                if action['type'] == 'transition' and action['to_step_id']:
                    # Check if it's a forward transition
                    if action['to_step_id']:
                        try:
                            to_step = Steps.objects.get(step_id=action['to_step_id'])
                            if to_step.order > current_step.order:
                                selected_action = action
                                break
                        except Steps.DoesNotExist:
                            continue
            if not selected_action and is_end_step:
                selected_action = next((a for a in available_actions if a['type'] == 'finalize'), None)
            if not selected_action:
                # Just pick first action
                selected_action = available_actions[0]
        else:
            # Interactive selection
            if output_json:
                self.stdout.write(json.dumps({
                    'success': False,
                    'error': 'Selection required',
                    'available_actions': available_actions,
                    'steps': steps_log
                }))
                return
            
            self.stdout.write("")
            choice = input("   Select action number: ").strip()
            try:
                choice_idx = int(choice)
                if 1 <= choice_idx <= len(available_actions):
                    selected_action = available_actions[choice_idx - 1]
                else:
                    self.stdout.write(self.style.WARNING(f"   [WARNING] Invalid selection: {choice}. Please try again.\n"))
                    return
            except ValueError:
                self.stdout.write(self.style.WARNING(f"   [WARNING] Invalid input: {choice}. Please enter a number.\n"))
                return
        
        log_step(f"Selected: {selected_action['action_label']}", 'success')
        
        if dry_run:
            log_step(f"[DRY RUN] Would execute {selected_action['type']}: {selected_action['action_label']}", 'info')
            result = {
                'success': True,
                'dry_run': True,
                'ticket_number': ticket_number,
                'task_id': task.task_id,
                'selected_action': selected_action,
                'message': 'Dry run completed - no changes made',
                'steps': steps_log,
            }
            if output_json:
                self.stdout.write(json.dumps(result))
            else:
                self.stdout.write(self.style.SUCCESS(f"\n   [OK] Dry run completed successfully!\n"))
            return
        
        # Execute the action
        if selected_action['type'] == 'finalize':
            self._execute_finalize(task, active_item, notes, log_step, workflow_ticket)
        else:
            self._execute_transition(
                task, active_item, selected_action['transition_id'], 
                notes, log_step, workflow_ticket
            )
        
        # Build result
        task.refresh_from_db()
        result = {
            'success': True,
            'ticket_number': ticket_number,
            'task_id': task.task_id,
            'task_status': task.status,
            'action_executed': selected_action,
            'current_step': {
                'step_id': task.current_step.step_id if task.current_step else None,
                'name': task.current_step.name if task.current_step else None,
            },
            'steps': steps_log,
        }
        
        if output_json:
            self.stdout.write(json.dumps(result))
        else:
            self.stdout.write(self.style.SUCCESS(f"\n   [OK] Transition executed successfully!\n"))
            if task.status == 'completed':
                self.stdout.write(self.style.SUCCESS(f"   [COMPLETED] Task completed!\n"))
            else:
                self.stdout.write(f"   Current step: {task.current_step.name if task.current_step else 'None'}\n")
    
    def _execute_finalize(self, task, active_item, notes, log_step, workflow_ticket):
        """Execute finalize action on end step"""
        current_step = task.current_step
        
        # Create resolved history
        TaskItemHistory.objects.create(task_item=active_item, status='resolved')
        log_step("Created 'resolved' history entry", 'success')
        
        # Update task item
        active_item.acted_on = timezone.now()
        active_item.assigned_on_step = current_step
        active_item.notes = notes
        active_item.save()
        log_step("Updated TaskItem with action details", 'success')
        
        # Mark task as completed
        task.status = 'completed'
        task.save()
        log_step("Task marked as completed", 'success')
        
        # Update local WorkflowTicket status
        try:
            if hasattr(workflow_ticket, 'ticket_data'):
                workflow_ticket.ticket_data['status'] = 'Resolved'
                workflow_ticket.save()
                log_step("Updated local ticket status to 'Resolved'", 'success')
        except Exception as e:
            log_step(f"Failed to update local ticket status: {str(e)}", 'warning')
        
        # Sync to HDTS
        self._sync_status_to_hdts(workflow_ticket.ticket_number, 'Resolved', log_step)
    
    def _execute_transition(self, task, active_item, transition_id, notes, log_step, workflow_ticket):
        """Execute a normal transition"""
        transition = StepTransition.objects.select_related(
            'from_step_id', 'to_step_id', 'to_step_id__role_id'
        ).get(transition_id=transition_id)
        
        # Handle terminal transitions
        if not transition.to_step_id:
            log_step("Terminal transition detected - completing task", 'info')
            return self._execute_finalize(task, active_item, notes, log_step, workflow_ticket)
        
        next_step = transition.to_step_id
        previous_step = task.current_step
        
        # Create resolved history for current user
        TaskItemHistory.objects.create(task_item=active_item, status='resolved')
        log_step("Created 'resolved' history entry", 'success')
        
        # Update task item
        active_item.acted_on = timezone.now()
        active_item.assigned_on_step = previous_step
        active_item.notes = notes
        active_item.save()
        log_step("Updated TaskItem with action details", 'success')
        
        # Assign users for next step
        if next_step.role_id:
            assigned_items = assign_users_for_step(task, next_step, next_step.role_id.name)
            if assigned_items:
                log_step(f"Assigned {len(assigned_items)} user(s) to step '{next_step.name}'", 'success')
            else:
                log_step(f"Warning: No users assigned for step '{next_step.name}'", 'warning')
        
        # Update task
        task.current_step = next_step
        task.status = 'pending'
        task.save()
        log_step(f"Task moved to step '{next_step.name}'", 'success')
        
        # Update local WorkflowTicket status
        try:
            if hasattr(workflow_ticket, 'ticket_data'):
                workflow_ticket.ticket_data['status'] = 'In Progress'
                workflow_ticket.save()
                log_step("Updated local ticket status to 'In Progress'", 'success')
        except Exception as e:
            log_step(f"Failed to update local ticket status: {str(e)}", 'warning')
        
        # Sync to HDTS
        self._sync_status_to_hdts(workflow_ticket.ticket_number, 'In Progress', log_step)
    
    def _sync_status_to_hdts(self, ticket_number, status, log_step):
        """Send status update to HDTS via Celery"""
        try:
            from celery import current_app
            current_app.send_task(
                'send_ticket_status',
                args=[ticket_number, status],
                queue='ticket_status-default'
            )
            log_step(f"Sent status sync to HDTS: {status}", 'success')
        except Exception as e:
            log_step(f"Failed to sync status to HDTS: {str(e)}", 'warning')
