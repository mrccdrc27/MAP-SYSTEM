"""
Email notification service for in-app notifications.
Uses locally synced user email cache instead of HTTP calls to auth service.
"""

import logging
from django.conf import settings
from django.core.mail import send_mail
from django.template.loader import render_to_string
from django.utils.html import strip_tags

logger = logging.getLogger(__name__)


def build_ticket_url(ticket_identifier=None, explicit_url=None):
    """Build a ticket link to the TTS frontend."""
    if explicit_url:
        return explicit_url
    if not ticket_identifier:
        return None

    base_url = getattr(settings, 'TTS_FRONTEND_URL', 'http://localhost:1000')
    path_template = getattr(settings, 'TTS_TICKET_PATH_TEMPLATE', '/ticket/{id}')

    try:
        ticket_id = str(ticket_identifier)
        path = path_template.format(id=ticket_id)
        return f"{base_url.rstrip('/')}/{path.lstrip('/')}"
    except Exception:
        return None


def get_user_email(user_id):
    """
    Get user email from local cache.
    The cache is synced from auth service via Celery tasks.
    
    Args:
        user_id (int): User ID from auth service
    
    Returns:
        str or None: User email if found and active, None otherwise
    """
    try:
        from .models import UserEmailCache
        return UserEmailCache.get_email(user_id)
    except Exception as e:
        logger.error(f"Error getting email for user {user_id}: {str(e)}")
        return None


def get_user_info(user_id):
    """
    Get full user info from local cache.
    
    Args:
        user_id (int): User ID from auth service
    
    Returns:
        dict or None: User info dict or None if not found
    """
    try:
        from .models import UserEmailCache
        return UserEmailCache.get_user_info(user_id)
    except Exception as e:
        logger.error(f"Error getting user info for user {user_id}: {str(e)}")
        return None


def send_notification_email(
    user_id,
    subject,
    message,
    notification_type,
    template_name=None,
    context=None,
    user_email=None
):
    """
    Send an email notification to a user.
    
    Args:
        user_id (int): User ID to send email to
        subject (str): Email subject
        message (str): Plain text message
        notification_type (str): Type of notification
        template_name (str): Optional HTML template name
        context (dict): Optional context for template rendering
        user_email (str): Optional pre-fetched email address
    
    Returns:
        tuple: (success: bool, error: str or None)
    """
    # Get user email if not provided
    if not user_email:
        user_email = get_user_email(user_id)
    
    if not user_email:
        logger.warning(f"Cannot send email notification - no email for user {user_id}")
        return False, f"No email found for user {user_id}"
    
    try:
        from_email = getattr(settings, 'DEFAULT_FROM_EMAIL', 'noreply@tickettracking.local')
        user_info = get_user_info(user_id)

        template_context = dict(context or {})
        if user_info:
            full_name = user_info.get('full_name') or user_info.get('name')
            template_context.setdefault('user_name', full_name or user_info.get('email') or 'User')
        # Use ticket_number for deep-linking
        ticket_identifier = (
            template_context.get('ticket_number')
            or template_context.get('ticket_id')
        )
        ticket_url = build_ticket_url(ticket_identifier, explicit_url=template_context.get('ticket_url'))
        if ticket_url:
            template_context['ticket_url'] = ticket_url
        template_context.setdefault('subject', subject)
        template_context.setdefault('message', message)
        template_context.setdefault('notification_type', notification_type)
        template_context.setdefault('site_name', 'TicketFlow')
        
        # Build HTML content
        html_message = None
        if template_name:
            try:
                html_message = render_to_string(f'emails/{template_name}', template_context)
            except Exception as e:
                logger.warning(f"Could not render template {template_name}: {e}")
        
        # Fallback to simple HTML if no template
        if not html_message:
            html_message = f"""
            <html>
            <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
                <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
                    <h2 style="color: #2c3e50; border-bottom: 2px solid #3498db; padding-bottom: 10px;">
                        {subject}
                    </h2>
                    <p style="font-size: 16px;">{message}</p>
                    <hr style="border: none; border-top: 1px solid #eee; margin: 20px 0;">
                    <p style="font-size: 12px; color: #666;">
                        This is an automated notification from TicketFlow.
                    </p>
                </div>
            </body>
            </html>
            """
        
        send_mail(
            subject=subject,
            message=message,
            from_email=from_email,
            recipient_list=[user_email],
            html_message=html_message,
            fail_silently=False
        )
        
        logger.info(f"📧 Email sent to {user_email} for notification type: {notification_type}")
        return True, None
        
    except Exception as e:
        error_msg = f"Failed to send email to {user_email}: {str(e)}"
        logger.error(error_msg, exc_info=True)
        return False, error_msg


# Template mapping for different notification types
NOTIFICATION_TEMPLATES = {
    'task_assignment': 'task_assignment.html',
    'task_transfer_in': 'task_transfer.html',
    'task_transfer_out': 'task_transfer.html',
    'task_escalation_in': 'escalation.html',
    'task_escalation_out': 'escalation.html',
    'task_completed': 'ticket_status.html',
    'workflow_step_change': 'workflow_step.html',
    'sla_warning': 'sla_warning.html',
    'sla_breach': 'sla_warning.html',
    'ticket_resolved': 'ticket_status.html',
    'ticket_closed': 'ticket_status.html',
    'ticket_reopened': 'ticket_status.html',
    'comment_added': 'comment.html',
    'mention': 'comment.html',
}


def get_template_for_notification(notification_type):
    """Get the appropriate template for a notification type."""
    return NOTIFICATION_TEMPLATES.get(notification_type)
