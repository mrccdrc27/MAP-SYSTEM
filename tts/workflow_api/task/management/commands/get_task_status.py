"""
Management command to get the status of a task by ticket number.

This command retrieves the workflow task associated with a ticket and shows
its current status, step, and assigned users.

Usage:
    python manage.py get_task_status HDTS-XXXXXX
    python manage.py get_task_status HDTS-XXXXXX --json
"""

from django.core.management.base import BaseCommand, CommandError
from tickets.models import WorkflowTicket
from task.models import Task, TaskItem, TaskItemHistory
import json


class Command(BaseCommand):
    help = 'Get the workflow task status for a ticket'

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

    def handle(self, *args, **options):
        ticket_number = options['ticket_number']
        output_json = options['json']
        
        # Find the workflow ticket
        try:
            workflow_ticket = WorkflowTicket.objects.get(ticket_number=ticket_number)
        except WorkflowTicket.DoesNotExist:
            if output_json:
                self.stdout.write(json.dumps({
                    'success': False,
                    'error': f'WorkflowTicket {ticket_number} not found'
                }))
                return
            raise CommandError(f'WorkflowTicket {ticket_number} not found')
        
        # Find the task for this ticket
        try:
            task = Task.objects.select_related(
                'workflow_id',
                'current_step',
                'current_step__role_id',
                'ticket_owner',
                'ticket_owner__role_id',
            ).get(ticket_id=workflow_ticket)
        except Task.DoesNotExist:
            if output_json:
                self.stdout.write(json.dumps({
                    'success': False,
                    'ticket_number': ticket_number,
                    'workflow_ticket_exists': True,
                    'task_exists': False,
                    'error': f'No Task found for WorkflowTicket {ticket_number}'
                }))
                return
            raise CommandError(f'No Task found for WorkflowTicket {ticket_number}')
        
        # Get task items (user assignments)
        task_items = TaskItem.objects.filter(task=task).select_related(
            'role_user', 'role_user__role_id', 'assigned_on_step'
        ).prefetch_related('taskitemhistory_set')
        
        assignments = []
        for item in task_items:
            latest_history = item.taskitemhistory_set.order_by('-created_at').first()
            assignments.append({
                'task_item_id': item.task_item_id,
                'user_id': item.role_user.user_id,
                'user_full_name': item.role_user.user_full_name,
                'role': item.role_user.role_id.name if item.role_user.role_id else None,
                'status': latest_history.status if latest_history else 'unknown',
                'assigned_on_step': item.assigned_on_step.name if item.assigned_on_step else None,
                'assigned_on': item.assigned_on.isoformat() if item.assigned_on else None,
                'acted_on': item.acted_on.isoformat() if item.acted_on else None,
            })
        
        result = {
            'success': True,
            'ticket_number': ticket_number,
            'workflow_ticket_id': workflow_ticket.id,
            'task_id': task.task_id,
            'task_status': task.status,
            'workflow_name': task.workflow_id.name if task.workflow_id else None,
            'current_step': {
                'step_id': task.current_step.step_id,
                'name': task.current_step.name,
                'role': task.current_step.role_id.name if task.current_step.role_id else None,
                'order': task.current_step.order,
            } if task.current_step else None,
            'ticket_owner': {
                'user_id': task.ticket_owner.user_id,
                'user_full_name': task.ticket_owner.user_full_name,
                'role': task.ticket_owner.role_id.name if task.ticket_owner.role_id else None,
            } if task.ticket_owner else None,
            'assignments': assignments,
            'created_at': task.created_at.isoformat() if task.created_at else None,
            'updated_at': task.updated_at.isoformat() if task.updated_at else None,
        }
        
        if output_json:
            self.stdout.write(json.dumps(result))
        else:
            self.stdout.write(self.style.SUCCESS(f"📋 Task Status for Ticket: {ticket_number}"))
            self.stdout.write(f"   Task ID:        {task.task_id}")
            self.stdout.write(f"   Task Status:    {task.status}")
            self.stdout.write(f"   Workflow:       {task.workflow_id.name if task.workflow_id else 'N/A'}")
            
            if task.current_step:
                self.stdout.write(f"   Current Step:   {task.current_step.name} (order {task.current_step.order})")
                self.stdout.write(f"   Step Role:      {task.current_step.role_id.name if task.current_step.role_id else 'N/A'}")
            else:
                self.stdout.write(f"   Current Step:   None (task may be completed)")
            
            if task.ticket_owner:
                self.stdout.write(f"   Ticket Owner:   {task.ticket_owner.user_full_name} (ID: {task.ticket_owner.user_id})")
            
            self.stdout.write(f"\n   Assignments ({len(assignments)}):")
            for a in assignments:
                self.stdout.write(f"      • {a['user_full_name']} ({a['role']}) - Status: {a['status']}")
