"""
Simple Email Service

Pure template-based email sending using Django's default mail backend
"""

import logging
from django.conf import settings
from django.core.mail import send_mail
from django.template.loader import render_to_string
from django.utils.html import strip_tags

logger = logging.getLogger(__name__)


class EmailService:
    """
    Simple email service using template files and Django's mail backend
    """
    
    def __init__(self):
        self.from_email = getattr(settings, 'DEFAULT_FROM_EMAIL', 'noreply@ticketflow.com')
    
    def send_email(self, to_email, subject, template_name, context=None):
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
            # Render the HTML template
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
            
            # Send email
            send_mail(
                subject=subject,
                message=plain_message,
                from_email=self.from_email,
                recipient_list=[to_email],
                html_message=html_content,
                fail_silently=False
            )
            
            logger.info(f"Email sent successfully to {to_email} using template {template_name}")
            return True, 'sent', None
                
        except Exception as e:
            error_msg = f"Failed to send email: {str(e)}"
            logger.error(error_msg, exc_info=True)
            return False, None, error_msg
    
    def send_password_reset_email(self, user_email, user_name, reset_url, reset_token):
        """
        Send password reset email
        """
        context = {
            'user_name': user_name,
            'reset_url': reset_url,
            'reset_token': reset_token,
            'expiry_hours': 1,
        }
        return self.send_email(
            to_email=user_email,
            subject='Password Reset Request - TicketFlow',
            template_name='password_reset.html',
            context=context
        )
    
    def send_otp_email(self, user_email, user_name, otp_code):
        """
        Send OTP verification email
        """
        context = {
            'user_name': user_name,
            'otp_code': otp_code,
            'expiry_minutes': 10,
        }
        return self.send_email(
            to_email=user_email,
            subject='Your Verification Code - TicketFlow',
            template_name='otp.html',
            context=context
        )
    
    def send_account_locked_email(self, user_email, user_name, locked_until=None, failed_attempts=None, lockout_duration=None, ip_address=None):
        """
        Send account locked notification
        """
        context = {
            'user_name': user_name,
            'locked_until': locked_until,
            'failed_attempts': failed_attempts or 10,
            'lockout_duration': lockout_duration or '15 minutes',
            'ip_address': ip_address,
        }
        return self.send_email(
            to_email=user_email,
            subject='Account Locked - TicketFlow',
            template_name='account_locked.html',
            context=context
        )
    
    def send_account_unlocked_email(self, user_email, user_name, ip_address=None):
        """
        Send account unlocked notification
        """
        context = {
            'user_name': user_name,
            'ip_address': ip_address,
        }
        return self.send_email(
            to_email=user_email,
            subject='Account Unlocked - TicketFlow',
            template_name='account_unlocked.html',
            context=context
        )
    
    def send_failed_login_email(self, user_email, user_name, ip_address, attempt_time=None, failed_attempts=None):
        """
        Send failed login attempt notification
        """
        context = {
            'user_name': user_name,
            'ip_address': ip_address,
            'attempt_time': attempt_time,
            'failed_attempts': failed_attempts or 1,
        }
        return self.send_email(
            to_email=user_email,
            subject='Failed Login Attempt - TicketFlow',
            template_name='failed_login.html',
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


# Convenience alias
get_sendgrid_service = get_email_service
