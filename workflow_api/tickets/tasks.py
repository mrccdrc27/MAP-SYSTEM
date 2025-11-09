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

@shared_task(name='tickets.tasks.receive_ticket')
def receive_ticket(ticket_data):
    import traceback
    try:
        # ✅ Map incoming fields to model fields
        field_mapping = {
            'id': 'original_ticket_id',
            'ticket_number': 'ticket_number',
            'sub_category': 'sub_category',
        }
        
        # Apply field mapping
        for old_key, new_key in field_mapping.items():
            if old_key in ticket_data:
                ticket_data[new_key] = ticket_data.pop(old_key)

        # ✅ Parse datetime fields
        datetime_fields = ['submit_date', 'update_date', 'fetched_at']
        for field in datetime_fields:
            if isinstance(ticket_data.get(field), str):
                try:
                    dt = parse_datetime(ticket_data[field])
                    ticket_data[field] = make_aware(dt) if dt and dt.tzinfo is None else dt
                except Exception:
                    ticket_data[field] = None

        # ✅ Parse date fields
        date_fields = ['scheduled_date', 'expected_return_date', 'performance_start_date', 'performance_end_date']
        for field in date_fields:
            if isinstance(ticket_data.get(field), str):
                try:
                    ticket_data[field] = datetime.fromisoformat(ticket_data[field]).date()
                except Exception:
                    ticket_data[field] = None

        # ✅ Parse duration fields
        for dur_field in ['response_time', 'resolution_time']:
            if isinstance(ticket_data.get(dur_field), str):
                try:
                    h, m, s = map(float, ticket_data[dur_field].split(':'))
                    ticket_data[dur_field] = timedelta(hours=h, minutes=m, seconds=s)
                except Exception:
                    ticket_data[dur_field] = None

        # ✅ Handle decimal fields
        if ticket_data.get('requested_budget'):
            try:
                ticket_data['requested_budget'] = float(ticket_data['requested_budget'])
            except (ValueError, TypeError):
                ticket_data['requested_budget'] = None

        # ✅ Ensure JSON fields have proper defaults
        if 'dynamic_data' not in ticket_data or ticket_data['dynamic_data'] is None:
            ticket_data['dynamic_data'] = {}
        if 'attachments' not in ticket_data or ticket_data['attachments'] is None:
            ticket_data['attachments'] = []
        if 'cost_items' not in ticket_data or ticket_data['cost_items'] is None:
            ticket_data['cost_items'] = None

        # ✅ Filter allowed fields for the updated model
        allowed_fields = {
            'ticket_id', 'original_ticket_id', 'ticket_number', 'source_service',
            'employee', 'employee_cookie_id',
            'subject', 'category', 'subcategory', 'sub_category', 'description', 
            'scheduled_date', 'submit_date', 'update_date', 'assigned_to',
            'priority', 'status', 'department',
            'asset_name', 'serial_number', 'location', 'expected_return_date', 'issue_type', 'other_issue',
            'performance_start_date', 'performance_end_date',
            'approved_by', 'rejected_by', 'cost_items', 'requested_budget', 'fiscal_year', 'department_input',
            'dynamic_data', 'attachments',
            'response_time', 'resolution_time', 'time_closed', 'rejection_reason',
            'is_task_allocated', 'fetched_at'
        }
        ticket_data = {k: v for k, v in ticket_data.items() if k in allowed_fields}

        # ✅ Validate required fields
        required_fields = ['subject']
        missing = [field for field in required_fields if not ticket_data.get(field)]
        if missing:
            return {
                "status": "error",
                "type": "validation_error",
                "errors": {field: "This field is required." for field in missing}
            }

        # ✅ Create and save - let Django handle transactions naturally
        lookup_fields = {}
        if ticket_data.get('original_ticket_id'):
            lookup_fields['original_ticket_id'] = ticket_data['original_ticket_id']
        elif ticket_data.get('ticket_number'):
            lookup_fields['ticket_number'] = ticket_data['ticket_number']
        
        if lookup_fields:
            ticket, created = WorkflowTicket.objects.update_or_create(
                **lookup_fields,
                defaults=ticket_data
            )
            action = "created" if created else "updated"
        else:
            ticket = WorkflowTicket(**ticket_data)
            ticket.full_clean()
            ticket.save()
            action = "created"
        
        print(f"✅ Ticket {action} with ID: {ticket.pk}")

        # 🚀 NEW: Automatic workflow assignment and task creation
        if created:  # Only create tasks for new tickets
            try:
                # Call the task synchronously - it will execute immediately
                result = create_task_for_ticket(ticket.ticket_id)
                print(f"🎯 Task creation result: {result}")
            except Exception as e:
                print(f"❌ Failed to create task: {e}")
                import traceback
                traceback.print_exc()

        return {"status": "success", "ticket_id": ticket.ticket_id or ticket.original_ticket_id, "action": action}

    except ValidationError as ve:
        return {
            "status": "error",
            "type": "validation_error",
            "errors": ve.message_dict
        }

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
    4. Assigning users using round-robin logic
    """
    from tickets.models import WorkflowTicket
    from workflow.models import Workflows
    from step.models import Steps
    from task.models import Task
    from django.utils import timezone
    import traceback
    
    try:
        # Get the ticket
        ticket = WorkflowTicket.objects.get(ticket_id=ticket_id)
        print(f"🎫 Processing ticket: {ticket.subject}")
        
        # 1. Find matching workflow based on department-category
        matching_workflow = find_matching_workflow(
            ticket.department, 
            ticket.category, 
            ticket.sub_category or ticket.subcategory
        )
        
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
        
        # 3. Fetch users for the role from auth service
        user_ids_for_role = fetch_users_for_role(first_step.role_id.name)
        
        if not user_ids_for_role:
            print(f"⚠️ No users found for role {first_step.role_id.name}")
            return {"status": "error", "message": "No users found for role"}
        
        # 4. Apply round-robin assignment
        assigned_users = apply_round_robin_assignment(
            user_ids_for_role, 
            first_step.role_id.name
        )
        
        # 5. Create the task
        task = Task.objects.create(
            ticket_id=ticket,
            workflow_id=matching_workflow,
            current_step=first_step,
            users=assigned_users,
            status='pending',
            fetched_at=timezone.now()
        )
        
        # Mark ticket as task allocated
        ticket.is_task_allocated = True
        ticket.save()
        
        print(f"🎯 Task created successfully: {task.task_id}")
        print(f"👥 Assigned users: {[user['userID'] for user in assigned_users]}")
        
        return {
            "status": "success", 
            "task_id": task.task_id,
            "workflow": matching_workflow.name,
            "step": first_step.name,
            "assigned_users": assigned_users
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
    """
    from workflow.models import Workflows
    
    # Match on department + category only
    workflow = Workflows.objects.filter(
        department=department,
        category=category,
        is_published=True,
        status='initialized'
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
    
    Args:
        user_ids: List of user IDs [3, 6, 7, ...]
        role_name: Name of the role for state tracking
        max_assignments: Maximum number of users to assign (default 1)
    
    Returns:
        List of user assignment objects with status, role, and assignment time
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

    assigned_user = {
        "userID": user_id,
        "status": "assigned",
        "assigned_on": timezone.now().isoformat(),
        "role": role_name
    }

    # Update round-robin state for next assignment
    round_robin_state.current_index = (current_index + 1) % len(user_ids)
    round_robin_state.save()

    return [assigned_user]


@shared_task(name="send_ticket_status")
def send_ticket_status(ticket_id, status):
    data = {
        "ticket_number": ticket_id,
        "new_status": status
    }
    json_data = json.dumps(data)
    print("Sending to queue:", json_data)
    return json_data
