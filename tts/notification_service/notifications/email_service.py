"""
Email Service for Notification Service

Simple, template-based email sending using SendGrid API.
Similar pattern to auth/emails/services.py
"""

import logging
from django.conf import settings
from django.core.mail import send_mail
from django.template.loader import render_to_string
from django.utils.html import strip_tags

logger = logging.getLogger(__name__)


class EmailService:
    """
    Email service using template files and Django's mail backend.
    Supports SendGrid when configured, falls back to console backend in development.
    """
    
    def __init__(self):
        self.from_email = getattr(settings, 'DEFAULT_FROM_EMAIL', 'noreply@ticketflow.com')
        self.sendgrid_enabled = getattr(settings, 'SENDGRID_ENABLED', False)
    
    def send_email(self, to_email, subject, body_text, body_html=None):
        """
        Send email directly with provided content
        
        Args:
            to_email: Recipient email address
            subject: Email subject
            body_text: Plain text email body
            body_html: HTML email body (optional)
        
        Returns:
            tuple: (success: bool, message_id: str or None, error: str or None)
        """
        try:
            send_mail(
                subject=subject,
                message=body_text,
                from_email=self.from_email,
                recipient_list=[to_email],
                html_message=body_html,
                fail_silently=False
            )
            
            logger.info(f"Email sent successfully to {to_email}")
            return True, 'sent', None
                
        except Exception as e:
            error_msg = f"Failed to send email: {str(e)}"
            logger.error(error_msg, exc_info=True)
            return False, None, error_msg
    
    def send_template_email(self, to_email, subject, template_name, context=None):
        """
        Send email using a template file
        
        Args:
            to_email: Recipient email address
            subject: Email subject
            template_name: Template file name (e.g., 'password_reset.html')
            context: Dictionary of context variables for the template
        
        Returns:
            tuple: (success: bool, message_id: str or None, error: str or None)
        """
        try:
            if context is None:
                context = {}
            
            # Add default context variables
            context.setdefault('site_name', 'TicketFlow')
            context.setdefault('support_email', getattr(settings, 'SUPPORT_EMAIL', 'support@ticketflow.com'))
            context.setdefault('current_year', 2025)
            
            # Render template
            template_path = f'emails/{template_name}'
            html_content = render_to_string(template_path, context)
            plain_message = strip_tags(html_content)
            
            return self.send_email(
                to_email=to_email,
                subject=subject,
                body_text=plain_message,
                body_html=html_content
            )
                
        except Exception as e:
            error_msg = f"Failed to send template email: {str(e)}"
            logger.error(error_msg, exc_info=True)
            return False, None, error_msg
    
    def send_email_with_headers(self, to_email, subject, headers, body_html=None):
        """
        Send an email with custom headers (builds body from headers)
        
        Args:
            to_email: Recipient email address
            subject: Email subject
            headers: Dictionary of email headers/metadata
            body_html: HTML email body (optional)
        
        Returns:
            tuple: (success: bool, message_id: str or None, error: str or None)
        """
        # Build body text from headers
        body_lines = []
        for key, value in headers.items():
            formatted_key = key.replace('_', ' ').title()
            body_lines.append(f"{formatted_key}: {value}")
        body_text = '\n'.join(body_lines)
        
        return self.send_email(
            to_email=to_email,
            subject=subject,
            body_text=body_text,
            body_html=body_html
        )
    
    # ==========================================================================
    # Convenience methods for system notification types
    # ==========================================================================
    
    def send_task_assignment_email(self, user_email, user_name, task_title, ticket_number, 
                                    role_name=None, priority=None, due_date=None, task_url=None):
        """Send task assignment notification email"""
        context = {
            'user_name': user_name,
            'task_title': task_title,
            'ticket_number': ticket_number,
            'role_name': role_name,
            'priority': priority,
            'due_date': due_date,
            'task_url': task_url,
        }
        return self.send_template_email(
            to_email=user_email,
            subject=f'New Task Assignment: {ticket_number}',
            template_name='task_assignment.html',
            context=context
        )
    
    def send_task_transfer_email(self, user_email, user_name, task_title, ticket_number,
                                  transfer_type='incoming', transferred_by=None, 
                                  transferred_to=None, transfer_notes=None, task_url=None):
        """Send task transfer notification email"""
        context = {
            'user_name': user_name,
            'task_title': task_title,
            'ticket_number': ticket_number,
            'transfer_type': transfer_type,
            'transferred_by': transferred_by,
            'transferred_to': transferred_to,
            'transfer_notes': transfer_notes,
            'task_url': task_url,
        }
        subject = f'Task Transferred {"to You" if transfer_type == "incoming" else "from You"}: {ticket_number}'
        return self.send_template_email(
            to_email=user_email,
            subject=subject,
            template_name='task_transfer.html',
            context=context
        )
    
    def send_ticket_status_email(self, user_email, user_name, ticket_number, ticket_subject,
                                  previous_status=None, new_status=None, updated_by=None, ticket_url=None):
        """Send ticket status update notification email"""
        context = {
            'user_name': user_name,
            'ticket_number': ticket_number,
            'ticket_subject': ticket_subject,
            'previous_status': previous_status,
            'new_status': new_status,
            'updated_by': updated_by,
            'ticket_url': ticket_url,
        }
        return self.send_template_email(
            to_email=user_email,
            subject=f'Ticket Status Updated: {ticket_number}',
            template_name='ticket_status.html',
            context=context
        )
    
    def send_comment_notification_email(self, user_email, user_name, ticket_number,
                                         commenter_name=None, comment_text=None, 
                                         comment_time=None, ticket_url=None):
        """Send new comment notification email"""
        context = {
            'user_name': user_name,
            'ticket_number': ticket_number,
            'commenter_name': commenter_name,
            'comment_text': comment_text,
            'comment_time': comment_time,
            'ticket_url': ticket_url,
        }
        return self.send_template_email(
            to_email=user_email,
            subject=f'New Comment on Ticket: {ticket_number}',
            template_name='comment.html',
            context=context
        )
    
    def send_sla_warning_email(self, user_email, user_name, ticket_number, ticket_subject,
                                sla_type=None, sla_deadline=None, time_remaining=None,
                                is_breach=False, ticket_url=None):
        """Send SLA warning or breach notification email"""
        context = {
            'user_name': user_name,
            'ticket_number': ticket_number,
            'ticket_subject': ticket_subject,
            'sla_type': sla_type,
            'sla_deadline': sla_deadline,
            'time_remaining': time_remaining,
            'is_breach': is_breach,
            'ticket_url': ticket_url,
        }
        subject_prefix = 'SLA BREACH' if is_breach else 'SLA Warning'
        return self.send_template_email(
            to_email=user_email,
            subject=f'{subject_prefix}: {ticket_number}',
            template_name='sla_warning.html',
            context=context
        )
    
    def send_escalation_email(self, user_email, user_name, task_title, ticket_number,
                               escalated_from=None, escalated_to=None, escalated_by=None,
                               escalation_reason=None, task_url=None):
        """Send task escalation notification email"""
        context = {
            'user_name': user_name,
            'task_title': task_title,
            'ticket_number': ticket_number,
            'escalated_from': escalated_from,
            'escalated_to': escalated_to,
            'escalated_by': escalated_by,
            'escalation_reason': escalation_reason,
            'task_url': task_url,
        }
        return self.send_template_email(
            to_email=user_email,
            subject=f'Task Escalated: {ticket_number}',
            template_name='escalation.html',
            context=context
        )
    
    def send_workflow_step_email(self, user_email, user_name, ticket_number, ticket_subject,
                                  workflow_name=None, previous_step=None, current_step=None,
                                  completed_by=None, ticket_url=None):
        """Send workflow step update notification email"""
        context = {
            'user_name': user_name,
            'ticket_number': ticket_number,
            'ticket_subject': ticket_subject,
            'workflow_name': workflow_name,
            'previous_step': previous_step,
            'current_step': current_step,
            'completed_by': completed_by,
            'ticket_url': ticket_url,
        }
        return self.send_template_email(
            to_email=user_email,
            subject=f'Workflow Step Update: {ticket_number}',
            template_name='workflow_step.html',
            context=context
        )


# Singleton instance
_email_service = None


def get_email_service():
    """Get or create the email service singleton"""
    global _email_service
    if _email_service is None:
        _email_service = EmailService()
    return _email_service
