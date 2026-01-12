from celery import shared_task
from tickets.models import WorkflowTicket
from datetime import datetime, timedelta
from django.utils.timezone import make_aware
from django.utils.dateparse import parse_datetime
from django.core.exceptions import ValidationError
from django.conf import settings
import requests
from urllib.parse import urlparse, urljoin
import os
import json
from workflow_api.safe_logging import safe_print as print  # Use safe print for Python 3.13 compatibility

@shared_task(name='tickets.tasks.receive_ticket')
def receive_ticket(ticket_data):
    import traceback
    try:
        # ✅ Generate or get ticket_number from various possible field names
        ticket_number = (
            ticket_data.get('ticket_number') or 
            ticket_data.get('ticket_id') or 
            ticket_data.get('id') or 
            ticket_data.get('original_ticket_id')
        )
        
        # # If still no ticket_number, generate one from timestamp
        # if not ticket_number:
        #     import uuid
        #     ticket_number = f"TK-{uuid.uuid4().hex[:12].upper()}"
        #     print(f"⚠️ No ticket identifier found, generated: {ticket_number}")
        
        # Ensure ticket_number is in the ticket_data
        ticket_data['ticket_number'] = ticket_number
        
        # ✅ Extract priority from ticket data
        priority = ticket_data.get('priority', 'Medium')
        ticket_data['priority'] = priority
        
        # ✅ Extract status from incoming ticket data
        status = ticket_data.get('status')
        
        # ✅ Create or update ticket with raw ticket_data, priority, and status
        ticket, created = WorkflowTicket.objects.update_or_create(
            ticket_number=ticket_number,
            defaults={'ticket_data': ticket_data, 'priority': priority, 'status': status}
        )
        
        # 🕒 Time Travel Support: Backdate creation timestamps if submit_date is in simulated past
        if ticket_data.get('submit_date'):
            try:
                submit_date_str = ticket_data.get('submit_date')
                parsed_date = parse_datetime(submit_date_str)
                if parsed_date:
                    # Force update auto_now_add fields
                    WorkflowTicket.objects.filter(pk=ticket.pk).update(
                        created_at=parsed_date,
                        fetched_at=parsed_date
                    )
                    # Refresh instance to have correct timestamps in memory if needed
                    ticket.refresh_from_db()
                    print(f"⏳ Backdated ticket {ticket_number} to {parsed_date}")
            except Exception as e:
                print(f"⚠️ Failed to backdate ticket: {e}")

        action = "created" if created else "updated"
        print(f"✅ Ticket {action} with number: {ticket_number}, status: {status}")

        # 🚀 NEW: Automatic workflow assignment and task creation
        if created:  # Only create tasks for new tickets
            try:
                # Call the task synchronously - it will execute immediately
                result = create_task_for_ticket(ticket.id)
                print(f"🎯 Task creation result: {result}")
            except Exception as e:
                print(f"❌ Failed to create task: {e}")
                import traceback
                traceback.print_exc()

        return {"status": "success", "ticket_number": ticket_number, "action": action}

    except Exception as e:
        return {
            "status": "error",
            "type": "exception",
            "error": str(e),
            "trace": traceback.format_exc()
        }


@shared_task(name='tickets.tasks.create_task_for_ticket')
def create_task_for_ticket(ticket_id):
    """
    Creates a task for a newly received ticket by:
    1. Finding matching workflow based on department-category
    2. Getting the first step and associated role
    3. Fetching users for that role from auth service
    4. Creating TaskItem records for assigned users using round-robin logic
    """
    from workflow.models import Workflows
    from step.models import Steps
    from task.models import Task
    from task.utils.assignment import assign_users_for_step
    from django.utils import timezone
    import traceback
    
    try:
        # Get the ticket
        ticket = WorkflowTicket.objects.get(id=ticket_id)
        subject = ticket.ticket_data.get('subject', 'Unknown')
        department = ticket.ticket_data.get('department')
        category = ticket.ticket_data.get('category')
        sub_category = ticket.ticket_data.get('sub_category') or ticket.ticket_data.get('subcategory')
        
        print(f"🎫 Processing ticket: {subject}")
        
        # 1. Find matching workflow based on department-category
        matching_workflow = find_matching_workflow(department, category, sub_category)
        
        if not matching_workflow:
            print(f"⚠️ No matching workflow found for ticket {ticket_id}")
            return {"status": "error", "message": "No matching workflow found"}
        
        print(f"✅ Found matching workflow: {matching_workflow.name}")
        
        # 2. Find the first step from workflow
        first_step = Steps.objects.filter(
            workflow_id=matching_workflow
        ).order_by('order').first()
        
        if not first_step:
            print(f"⚠️ No steps found for workflow {matching_workflow.name}")
            return {"status": "error", "message": "No steps found in workflow"}
        
        print(f"🏁 First step: {first_step.name}, Role: {first_step.role_id.name}")
        
        # Get the latest workflow version
        from workflow.models import WorkflowVersion
        workflow_version = WorkflowVersion.objects.filter(
            workflow=matching_workflow,
            is_active=True
        ).order_by('-version').first()
        
        if workflow_version:
            print(f"📋 Using WorkflowVersion {workflow_version.version}")
        else:
            # ⚠️ If no version exists, try to create one now
            print(f"⚠️ No active WorkflowVersion found for workflow {matching_workflow.name}")
            print(f"🔄 Attempting to create WorkflowVersion on-demand...")
            try:
                from workflow.signals import create_workflow_version
                create_workflow_version(matching_workflow)
                # Try to fetch again
                workflow_version = WorkflowVersion.objects.filter(
                    workflow=matching_workflow,
                    is_active=True
                ).order_by('-version').first()
                if workflow_version:
                    print(f"✅ WorkflowVersion {workflow_version.version} created successfully")
                else:
                    print(f"⚠️ Still no WorkflowVersion available after creation attempt")
            except Exception as e:
                print(f"❌ Failed to create WorkflowVersion: {e}")
        
        # 3. Create the task (without users - TaskItems will be created separately)
        task = Task.objects.create(
            ticket_id=ticket,
            workflow_id=matching_workflow,
            workflow_version=workflow_version,  # ✅ Assign the workflow version (may be None if creation failed)
            current_step=first_step,
            status='pending',
            fetched_at=timezone.now()
        )

        # 🕒 Time Travel Support: Backdate task if ticket has simulated past date
        historical_date = None
        try:
            submit_date_str = ticket.ticket_data.get('submit_date')
            if submit_date_str:
                parsed_date = parse_datetime(submit_date_str)
                if parsed_date:
                    historical_date = parsed_date
                    # Force update task timestamps
                    Task.objects.filter(pk=task.pk).update(
                        created_at=parsed_date,
                        fetched_at=parsed_date,
                    )
                    # Refresh to get updated fields
                    task.refresh_from_db()
                    print(f"⏳ Backdated task {task.task_id} to {parsed_date}")
        except Exception as e:
            print(f"⚠️ Failed to backdate task: {e}")
        
        # 4. Assign ticket owner (Ticket Coordinator)
        # Use HDTS-assigned coordinator if provided, otherwise fall back to round-robin
        from task.utils.assignment import assign_ticket_owner
        hdts_owner_id = ticket.ticket_data.get('ticket_owner_id')
        ticket_owner = assign_ticket_owner(task, hdts_owner_id=hdts_owner_id)
        if ticket_owner:
            source = "HDTS" if hdts_owner_id else "round-robin"
            print(f"👑 Ticket owner assigned ({source}): {ticket_owner.user_full_name} (User ID: {ticket_owner.user_id})")
        else:
            print(f"⚠️ No ticket owner assigned (Ticket Coordinator role may not exist or have no users)")
        
        # 5. Assign users for the first step using round-robin (creates TaskItem records)
        assigned_items = assign_users_for_step(task, first_step, first_step.role_id.name)
        
        if not assigned_items:
            print(f"⚠️ No users assigned for role {first_step.role_id.name}")
            return {"status": "error", "message": "No users found for role"}
        
        # 🕒 Time Travel Support: Backdate TaskItems and their History
        if historical_date and assigned_items:
            try:
                from task.models import TaskItem, TaskItemHistory
                item_ids = [item.task_item_id for item in assigned_items]
                
                # Update TaskItems assigned_on
                TaskItem.objects.filter(task_item_id__in=item_ids).update(assigned_on=historical_date)
                
                # Update initial History records (status='new')
                TaskItemHistory.objects.filter(
                    task_item_id__in=item_ids, 
                    status='new'
                ).update(created_at=historical_date)
                
                print(f"⏳ Backdated {len(item_ids)} TaskItems and history to {historical_date}")
            except Exception as e:
                print(f"⚠️ Failed to backdate TaskItems: {e}")

        # Mark ticket as task allocated
        ticket.is_task_allocated = True
        ticket.save()
        
        print(f"🎯 Task created successfully: {task.task_id}")
        print(f"👥 Assigned users: {[item.role_user.user_id for item in assigned_items]}")
        
        return {
            "status": "success", 
            "task_id": task.task_id,
            "workflow": matching_workflow.name,
            "step": first_step.name,
            "assigned_users": [item.to_dict() for item in assigned_items],
            "ticket_owner": {
                "user_id": ticket_owner.user_id,
                "user_full_name": ticket_owner.user_full_name,
                "role": ticket_owner.role_id.name
            } if ticket_owner else None
        }
        
    except WorkflowTicket.DoesNotExist:
        return {"status": "error", "message": f"Ticket {ticket_id} not found"}
    except Exception as e:
        print(f"❌ Task creation failed: {e}")
        print(traceback.format_exc())
        return {"status": "error", "message": str(e)}


def find_matching_workflow(department, category, sub_category):
    """Find workflow that matches department-category combination
    
    Only requires department and category to match.
    Sub-category is ignored in matching logic.
    Accepts workflows with status 'initialized' or 'deployed'.
    """
    from workflow.models import Workflows
    
    # Match on department + category only
    # Accept both 'initialized' and 'deployed' statuses as active workflows
    workflow = Workflows.objects.filter(
        department=department,
        category=category,
        is_published=True,
        status__in=['initialized', 'deployed']
    ).first()
    
    return workflow


def fetch_users_for_role(role_name):
    """Fetch users for a role using round-robin endpoint
    
    Calls the TTS round-robin endpoint which returns user IDs directly
    Endpoint: /api/v1/tts/round-robin/?role_name={role_name}
    Returns: [user_id1, user_id2, user_id3, ...]
    """
    try:
        # Configuration for auth service
        AUTH_SERVICE_URL = getattr(settings, 'AUTH_SERVICE_URL', 'http://localhost:8002')
        
        # Call the round-robin endpoint with role name
        response = requests.get(
            f"{AUTH_SERVICE_URL}/api/v1/tts/round-robin/",
            params={"role_name": role_name},
            timeout=10
        )
        
        if response.status_code == 200:
            user_ids = response.json()  # Returns [3, 6, 7, ...]
            print(f"👥 Found {len(user_ids)} users for role '{role_name}': {user_ids}")
            return user_ids
        else:
            print(f"❌ Failed to fetch users for role '{role_name}': {response.status_code}")
            return []
            
    except requests.RequestException as e:
        print(f"❌ Network error fetching users for role '{role_name}': {e}")
        return []
    except Exception as e:
        print(f"❌ Unexpected error fetching users for role '{role_name}': {e}")
        return []


def apply_round_robin_assignment(user_ids, role_name, max_assignments=1):
    """Apply round-robin logic to assign a single user to a task using persistent storage.
    
    This function is deprecated and kept for backward compatibility.
    Use task.utils.assignment.apply_round_robin_assignment instead, which creates TaskItem records.
    
    Args:
        user_ids: List of user IDs [3, 6, 7, ...]
        role_name: Name of the role for state tracking
        max_assignments: Maximum number of users to assign (default 1)
    
    Returns:
        List of user assignment objects with status, role, and assignment time
        (kept for backward compatibility, but TaskItem records are created via assign_users_for_step)
    """
    from django.utils import timezone
    from tickets.models import RoundRobin

    if not user_ids:
        return []

    # Get or create the round-robin state for this role
    round_robin_state, _ = RoundRobin.objects.get_or_create(role_name=role_name, defaults={"current_index": 0})

    # Determine the user to assign
    current_index = round_robin_state.current_index
    user_index = current_index % len(user_ids)
    user_id = user_ids[user_index]

    # This returns data in old format for backward compatibility
    assigned_user = {
        "user_id": user_id,
        "status": "assigned",
        "assigned_on": timezone.now().isoformat(),
        "role": role_name
    }

    # Update round-robin state for next assignment
    round_robin_state.current_index = (current_index + 1) % len(user_ids)
    round_robin_state.save()

    return [assigned_user]


# Note: The send_ticket_status task is defined in HDTS (core/tasks.py) as:
#   @shared_task(name='send_ticket_status')
#   def update_ticket_status_from_queue(ticket_number, new_status)
# 
# TTS sends tasks to this queue by using current_app.send_task() with explicit queue routing.
# This avoids the need for a local task definition and ensures the task runs on HDTS worker.

def send_ticket_status_to_hdts(ticket_number, new_status):
    """
    Send ticket status update to HDTS via Celery.
    
    This function sends a task to the 'ticket_status-default' queue,
    which HDTS worker listens to. The HDTS task 'send_ticket_status'
    will update the ticket status in the HDTS database.
    """
    from celery import current_app
    
    print(f"📤 Sending ticket status update to HDTS: {ticket_number} → {new_status}")
    
    try:
        # Send task to HDTS worker via explicit queue routing
        result = current_app.send_task(
            'send_ticket_status',
            args=[ticket_number, new_status],
            queue='ticket_status-default'
        )
        print(f"✅ Ticket status update sent to HDTS queue. Task ID: {result.id}")
        return result
    except Exception as e:
        print(f"❌ Failed to send ticket status to HDTS: {e}")
        raise


@shared_task(name="send_ticket_status")
def send_ticket_status(ticket_id, status):
    """
    Legacy wrapper for backwards compatibility.
    
    When called via .delay(), this task runs locally on TTS worker,
    then forwards the request to HDTS via send_ticket_status_to_hdts().
    """
    return send_ticket_status_to_hdts(ticket_id, status)


@shared_task(name="tts.tasks.receive_hdts_ticket_status")
def receive_hdts_ticket_status(payload):
    """
    Receive ticket status updates from HDTS (helpdesk).
    
    This is especially important for 'Closed' status which only happens
    in HDTS (when user closes ticket with CSAT rating).
    
    Updates the WorkflowTicket status and ticket_data to reflect the new status.
    
    Args:
        payload (dict): Contains:
            - ticket_number (str): The ticket number (e.g., TX20260111123456)
            - status (str): The new status (e.g., 'Closed', 'Resolved', etc.)
            - csat_rating (int, optional): Customer satisfaction rating (1-5)
            - feedback (str, optional): Customer feedback text
            - date_completed (str, optional): ISO format datetime
    """
    import traceback
    
    try:
        ticket_number = payload.get('ticket_number')
        new_status = payload.get('status')
        
        if not ticket_number or not new_status:
            print(f"❌ Missing required fields: ticket_number={ticket_number}, status={new_status}")
            return {
                'status': 'error',
                'error': 'Missing ticket_number or status'
            }
        
        print(f"📥 Received HDTS ticket status update: {ticket_number} → {new_status}")
        
        # Find the WorkflowTicket
        try:
            ticket = WorkflowTicket.objects.get(ticket_number=ticket_number)
        except WorkflowTicket.DoesNotExist:
            print(f"⚠️ WorkflowTicket not found for {ticket_number}")
            return {
                'status': 'not_found',
                'ticket_number': ticket_number
            }
        
        # Update the ticket status
        old_status = ticket.status
        ticket.status = new_status
        
        # Update ticket_data as well (for consistency)
        if ticket.ticket_data:
            ticket.ticket_data['status'] = new_status
            
            # Add additional HDTS data if provided
            if payload.get('csat_rating'):
                ticket.ticket_data['csat_rating'] = payload['csat_rating']
            if payload.get('feedback'):
                ticket.ticket_data['feedback'] = payload['feedback']
            if payload.get('date_completed'):
                ticket.ticket_data['date_completed'] = payload['date_completed']
            if payload.get('time_closed'):
                ticket.ticket_data['time_closed'] = payload['time_closed']
        
        # Save without triggering the outbound status sync (to avoid loops)
        # Use update() to bypass the model save() method
        WorkflowTicket.objects.filter(pk=ticket.pk).update(
            status=new_status,
            ticket_data=ticket.ticket_data
        )
        
        print(f"✅ WorkflowTicket {ticket_number} status updated: {old_status} → {new_status}")
        
        # If status is Closed, also update the related Task status
        if new_status == 'Closed':
            try:
                from task.models import Task
                tasks = Task.objects.filter(ticket_id=ticket)
                for task in tasks:
                    if task.status != 'completed':
                        task.status = 'completed'
                        task.save(update_fields=['status'])
                        print(f"✅ Task {task.task_id} marked as completed")
            except Exception as e:
                print(f"⚠️ Failed to update task status: {e}")
        
        return {
            'status': 'success',
            'ticket_number': ticket_number,
            'old_status': old_status,
            'new_status': new_status
        }
        
    except Exception as e:
        print(f"❌ Error processing HDTS ticket status: {e}")
        traceback.print_exc()
        return {
            'status': 'error',
            'error': str(e),
            'trace': traceback.format_exc()
        }
