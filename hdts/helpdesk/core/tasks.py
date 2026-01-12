from celery import shared_task
from django.utils import timezone
from datetime import timedelta
import logging

logger = logging.getLogger(__name__)

@shared_task(name='tickets.tasks.receive_ticket')
def push_ticket_to_workflow(ticket_data):
    # This will be picked up and executed by `workflow_api`
    pass

@shared_task(name='send_ticket_status')
def update_ticket_status_from_queue(ticket_number, new_status):
    from .models import Ticket
    try:
        ticket = Ticket.objects.get(ticket_number=ticket_number)
        ticket.status = new_status
        ticket.save()
        print(f"Ticket with ticket_number {ticket_number} status updated to {new_status}")
    except Ticket.DoesNotExist:
        print(f"Ticket with ticket_number {ticket_number} does not exist")


@shared_task(name='hdts.tasks.sync_ticket_status_to_tts')
def sync_ticket_status_to_tts(ticket_number, new_status, additional_data=None):
    """
    Sync ticket status changes from HDTS to TTS (workflow_api).
    This is especially important for 'Closed' status which only happens in HDTS.
    
    The task sends a message to TTS via Celery so that TTS can update
    its WorkflowTicket.status field accordingly.
    
    Args:
        ticket_number (str): The ticket number (e.g., TX20260111123456)
        new_status (str): The new status (e.g., 'Closed', 'Resolved', etc.)
        additional_data (dict, optional): Extra data like csat_rating, feedback, date_completed
    """
    from celery import current_app
    
    logger.info(f"📤 Syncing ticket status to TTS: {ticket_number} → {new_status}")
    
    try:
        # Build the payload for TTS
        payload = {
            'ticket_number': ticket_number,
            'status': new_status,
        }
        
        # Include additional data if provided (e.g., for Closed tickets)
        if additional_data:
            payload.update(additional_data)
        
        # Send task to TTS workflow_api worker via explicit queue routing
        result = current_app.send_task(
            'tts.tasks.receive_hdts_ticket_status',
            args=[payload],
            queue='TICKET_TASKS_PRODUCTION'  # TTS worker listens to this queue
        )
        logger.info(f"✅ Ticket status sync sent to TTS queue. Task ID: {result.id}")
        return {
            'status': 'success',
            'ticket_number': ticket_number,
            'new_status': new_status,
            'task_id': str(result.id)
        }
    except Exception as e:
        logger.error(f"❌ Failed to sync ticket status to TTS: {e}")
        return {
            'status': 'error',
            'ticket_number': ticket_number,
            'error': str(e)
        }


@shared_task(name='update_ticket_owner')
def update_ticket_owner_from_queue(ticket_number, owner_id):
    """
    Update the ticket_owner_id field for a ticket.
    Called when TTS assigns a Ticket Coordinator as the owner.
    """
    from .models import Ticket
    try:
        ticket = Ticket.objects.get(ticket_number=ticket_number)
        ticket.ticket_owner_id = owner_id
        ticket.save(update_fields=['ticket_owner_id'])
        print(f"Ticket {ticket_number} owner updated to user {owner_id}")
    except Ticket.DoesNotExist:
        print(f"Ticket with ticket_number {ticket_number} does not exist")


@shared_task(name='auto_close_resolved_tickets')
def auto_close_resolved_tickets():
    """
    Automatically close tickets that have been in 'Resolved' status for 72 hours or more.
    Sets date_completed but does NOT set csat_rating or feedback (only manual close does that).
    """
    from .models import Ticket, TicketComment
    
    # Calculate the cutoff time (72 hours ago)
    cutoff_time = timezone.now() - timedelta(hours=72)
    
    # Find all tickets that are Resolved and have been updated more than 72 hours ago
    resolved_tickets = Ticket.objects.filter(
        status='Resolved',
        update_date__lte=cutoff_time
    )
    
    closed_count = 0
    for ticket in resolved_tickets:
        try:
            ticket.status = 'Closed'
            ticket.time_closed = timezone.now()
            ticket.date_completed = timezone.now()
            
            # Calculate resolution time if not already set
            if ticket.submit_date and not ticket.resolution_time:
                ticket.resolution_time = timezone.now() - ticket.submit_date
            
            ticket.save()
            
            # Add a comment noting the auto-closure
            TicketComment.objects.create(
                ticket=ticket,
                user=None,
                comment="Ticket automatically closed after 72 hours in Resolved status.",
                is_internal=False
            )
            
            closed_count += 1
            print(f"Auto-closed ticket {ticket.ticket_number}")
            
        except Exception as e:
            print(f"Error auto-closing ticket {ticket.ticket_number}: {e}")
            continue
    
    return f"Auto-closed {closed_count} tickets"


@shared_task(name='hdts.tasks.sync_hdts_employee')
def sync_hdts_employee(employee_data):
    """
    Sync employee information to backend external employees table via message broker.
    Handles create, update, and delete actions for employee synchronization.
    
    This task receives employee data from auth2 service and processes it.
    
    Args:
        employee_data (dict): The employee data to sync including action type
    
    Returns:
        dict: Status of the sync operation
    """
    try:
        action = employee_data.get('action', 'update')
        employee_id = employee_data.get('employee_id')
        email = employee_data.get('email')
        
        logger.info(f"Processing HDTS employee sync: employee_id={employee_id}, email={email}, action={action}")
        
        # Call the actual processing function
        result = process_hdts_employee_sync(employee_data)
        return result
    
    except Exception as e:
        logger.error(f"Error in sync_hdts_employee task: {str(e)}", exc_info=True)
        return {
            "status": "error",
            "error": str(e),
            "employee_id": employee_data.get('employee_id'),
        }



@shared_task(name='hdts.tasks.sync_hdts_user')
def sync_hdts_user(user_data):
    """
    Sync combined user + role information to backend HDTSUser model.
    Handles create, update, and delete actions for total sync.
    
    The user_data includes both user profile and their role in a single object,
    eliminating the need for separate role syncs.
    
    Args:
        user_data (dict): The combined user + role data to sync including action type
            - user_id, email, username, first_name, last_name, middle_name, suffix
            - company_id, department, role, status, notified, profile_picture
            - action: 'create', 'update', or 'delete'
    """
    from .models import HDTSUser
    
    try:
        action = user_data.get('action', 'update')
        hdts_user_id = user_data.get('user_id')
        email = user_data.get('email')
        
        logger.info(f"Processing HDTS user sync: user_id={hdts_user_id}, email={email}, action={action}")
        
        if action == 'delete':
            # Delete the user record
            deleted_count, _ = HDTSUser.objects.filter(email=email).delete()
            logger.info(f"Deleted {deleted_count} HDTS user record(s) for {email}")
            return {
                "status": "success",
                "action": "delete",
                "user_id": hdts_user_id,
                "deleted_count": deleted_count,
            }
        
        elif action in ['create', 'update']:
            # Create or update the combined user record with role
            # Use get() with default empty strings for optional fields
            # For company_id, use None to avoid unique constraint violations with empty strings
            company_id = user_data.get('company_id') or None
            
            hdts_user, created = HDTSUser.objects.update_or_create(
                hdts_user_id=hdts_user_id,
                defaults={
                    'email': email or '',
                    'username': user_data.get('username') or '',
                    'first_name': user_data.get('first_name') or '',
                    'last_name': user_data.get('last_name') or '',
                    'middle_name': user_data.get('middle_name'),
                    'suffix': user_data.get('suffix'),
                    'company_id': company_id,
                    'department': user_data.get('department') or '',
                    'role': user_data.get('role') or '',
                    'status': user_data.get('status') or 'Pending',
                    'notified': user_data.get('notified', False),
                    'profile_picture': user_data.get('profile_picture'),
                }
            )
            
            action_verb = "Created" if created else "Updated"
            logger.info(f"{action_verb} HDTS user: {email} with role {user_data.get('role')}")
            
            return {
                "status": "success",
                "action": action,
                "user_id": hdts_user_id,
                "created": created,
                "hdts_user": {
                    "id": hdts_user.id,
                    "email": hdts_user.email,
                    "role": hdts_user.role,
                }
            }
        
        else:
            logger.warning(f"Unknown action '{action}' for user_id={hdts_user_id}")
            return {
                "status": "warning",
                "message": f"Unknown action: {action}",
                "user_id": hdts_user_id,
            }
    
    except Exception as e:
        logger.error(f"Error processing HDTS user sync: {str(e)}", exc_info=True)
        return {
            "status": "error",
            "error": str(e),
            "user_id": user_data.get('user_id'),
        }


@shared_task(name='core.tasks.process_hdts_employee_sync')
def process_hdts_employee_sync(employee_data):
    """
    Process employee sync from auth2 HDTS service and save to ExternalEmployee model.
    Handles create, update, and delete actions for external employee synchronization.
    
    Args:
        employee_data (dict): The employee data to sync including action type
            - employee_id, user_id, email, username, first_name, last_name
            - middle_name, suffix, phone_number, company_id, department
            - status, notified, profile_picture, role, action
    """
    from .models import ExternalEmployee
    
    try:
        action = employee_data.get('action', 'update')
        employee_id = employee_data.get('employee_id')
        email = employee_data.get('email')
        
        logger.info(f"Processing HDTS employee sync: employee_id={employee_id}, email={email}, action={action}")
        
        if action == 'delete':
            # Delete the employee record
            deleted_count, _ = ExternalEmployee.objects.filter(email=email).delete()
            logger.info(f"Deleted {deleted_count} external employee record(s) for {email}")
            return {
                "status": "success",
                "action": "delete",
                "employee_id": employee_id,
                "deleted_count": deleted_count,
            }
        
        elif action in ['create', 'update']:
            # Create or update the external employee record
            # company_id can be None (unlike the regular Employee model)
            external_employee, created = ExternalEmployee.objects.update_or_create(
                external_employee_id=employee_id,
                defaults={
                    'email': email,
                    'username': employee_data.get('username') or '',
                    'first_name': employee_data.get('first_name') or '',
                    'last_name': employee_data.get('last_name') or '',
                    'middle_name': employee_data.get('middle_name'),
                    'suffix': employee_data.get('suffix'),
                    'phone_number': employee_data.get('phone_number'),
                    'company_id': employee_data.get('company_id'),  # Can be None
                    'department': employee_data.get('department'),
                    'role': employee_data.get('role') or 'Employee',
                    'status': employee_data.get('status') or 'Pending',
                    'notified': employee_data.get('notified', False),
                    'image': employee_data.get('profile_picture'),  # Map profile_picture to image field
                    'external_user_id': employee_data.get('user_id'),
                }
            )
            
            action_verb = "Created" if created else "Updated"
            logger.info(f"{action_verb} external employee: {email} with role {employee_data.get('role')}")
            
            return {
                "status": "success",
                "action": action,
                "employee_id": employee_id,
                "created": created,
                "external_employee": {
                    "id": external_employee.id,
                    "email": external_employee.email,
                    "role": external_employee.role,
                }
            }
        
        else:
            logger.warning(f"Unknown action '{action}' for employee_id={employee_id}")
            return {
                "status": "warning",
                "message": f"Unknown action: {action}",
                "employee_id": employee_id,
            }
    
    except Exception as e:
        logger.error(f"Error processing HDTS employee sync: {str(e)}", exc_info=True)
        return {
            "status": "error",
            "error": str(e),
            "employee_id": employee_data.get('employee_id'),
        }


@shared_task(name='core.tasks.prefetch_external_profiles')
def prefetch_external_profiles(user_ids):
    """
    Given a list of external user IDs (external_user_id from auth), fetch each
    from the auth internal endpoint and upsert into ExternalEmployee. This
    runs asynchronously to warm the cache and avoid blocking web requests.
    """
    try:
        from django.conf import settings
        import requests
        from .models import ExternalEmployee

        auth_service = getattr(settings, 'DJANGO_AUTH_SERVICE', None)
        if not auth_service:
            return {'status': 'no-auth-service'}

        results = []
        for uid in (user_ids or []):
            try:
                api_url = f"{auth_service}/api/v1/hdts/employees/internal/{uid}/"
                r = requests.get(api_url, timeout=5)
                if r.status_code == 200:
                    data = r.json()
                    # Reuse existing sync processor to upsert
                    try:
                        process_hdts_employee_sync({
                            'action': 'update',
                            'employee_id': data.get('id'),
                            'user_id': data.get('id'),
                            'email': data.get('email'),
                            'username': data.get('username'),
                            'first_name': data.get('first_name'),
                            'last_name': data.get('last_name'),
                            'middle_name': data.get('middle_name'),
                            'suffix': data.get('suffix'),
                            'phone_number': data.get('phone_number'),
                            'company_id': data.get('company_id'),
                            'department': data.get('department'),
                            'status': data.get('status'),
                            'profile_picture': data.get('profile_picture'),
                        })
                        results.append({'id': uid, 'status': 'cached'})
                    except Exception as _e:
                        results.append({'id': uid, 'status': 'error', 'error': str(_e)})
                else:
                    results.append({'id': uid, 'status': 'not_found', 'code': r.status_code})
            except Exception as e:
                results.append({'id': uid, 'status': 'request_error', 'error': str(e)})

        return {'status': 'completed', 'results': results}
    except Exception as e:
        logger.exception('prefetch_external_profiles failed')
        return {'status': 'failed', 'error': str(e)}
