"""
Celery tasks for notification service email sending via SendGrid/SMTP
"""

from celery import shared_task
from django.utils import timezone
from django.core.cache import cache
import logging
from .email_service import get_email_service
from .models import NotificationLog

logger = logging.getLogger(__name__)


def check_rate_limit(email, limit=10, window=60):
    """Check if rate limit is exceeded for an email address
    
    Args:
        email: Email address to check
        limit: Maximum number of emails allowed
        window: Time window in seconds
    
    Returns:
        tuple: (is_allowed: bool, remaining: int, retry_after: int)
    """
    rate_key = f"email_rate_limit_{email}"
    current_count = cache.get(rate_key, 0)
    
    if current_count >= limit:
        return False, 0, window
    
    cache.set(rate_key, current_count + 1, timeout=window)
    return True, limit - current_count - 1, 0


@shared_task(name="notifications.send_email_via_gmail")
def send_email_via_gmail(to_email, subject, body_text, body_html=None, notification_type=None, user_id=None, context_data=None):
    """
    Send an email (async task) - kept name for backward compatibility
    
    Args:
        to_email (str): Recipient email address
        subject (str): Email subject
        body_text (str): Plain text email body
        body_html (str, optional): HTML email body
        notification_type (str, optional): Type of notification for logging
        user_id (str, optional): User ID for logging
        context_data (dict, optional): Additional context data for logging
    
    Returns:
        dict: Result with status, message_id, and error if any
    """
    try:
        # Create notification log entry
        notification_log = NotificationLog.objects.create(
            user_id=user_id,
            user_email=to_email,
            notification_type=notification_type or 'email',
            recipient_email=to_email,
            subject=subject,
            message=body_text,
            context_data=context_data or {},
            status='pending'
        )
        
        # Send email via EmailService
        email_service = get_email_service()
        success, message_id, error = email_service.send_email(
            to_email=to_email,
            subject=subject,
            body_text=body_text,
            body_html=body_html
        )
        
        if success:
            # Update log status
            notification_log.status = 'sent'
            notification_log.sent_at = timezone.now()
            notification_log.save()
            
            logger.info(f"Email sent successfully to {to_email}. Message ID: {message_id}")
            
            return {
                "status": "success",
                "message_id": message_id,
                "to_email": to_email,
                "notification_log_id": str(notification_log.id)
            }
        else:
            # Update log with error
            notification_log.status = 'failed'
            notification_log.error_message = error
            notification_log.save()
            
            logger.error(f"Failed to send email to {to_email}: {error}")
            
            return {
                "status": "error",
                "error": error,
                "to_email": to_email,
                "notification_log_id": str(notification_log.id)
            }
            
    except Exception as e:
        error_msg = f"Task failed to send email to {to_email}: {str(e)}"
        logger.error(error_msg, exc_info=True)
        
        # Try to update log if it exists
        if 'notification_log' in locals():
            notification_log.status = 'failed'
            notification_log.error_message = error_msg
            notification_log.save()
        
        return {
            "status": "error",
            "error": error_msg,
            "to_email": to_email
        }


@shared_task(name="notifications.send_email_with_headers")
def send_email_with_headers(to_email, subject, headers, body_html=None, user_id=None):
    """
    Send an email with custom headers (no template)
    This is the preferred method when message should be in headers, not templated.
    
    Args:
        to_email (str): Recipient email address
        subject (str): Email subject
        headers (dict): Dictionary of email headers/metadata
        body_html (str, optional): HTML email body
        user_id (str, optional): User ID for logging
    
    Returns:
        dict: Result with status, message_id, and error if any
    """
    try:
        # Create notification log entry
        notification_log = NotificationLog.objects.create(
            user_id=user_id,
            user_email=to_email,
            notification_type='email_with_headers',
            recipient_email=to_email,
            subject=subject,
            message=str(headers),  # Store headers as message
            context_data=headers,
            status='pending'
        )
        
        # Send email via EmailService
        email_service = get_email_service()
        success, message_id, error = email_service.send_email_with_headers(
            to_email=to_email,
            subject=subject,
            headers=headers,
            body_html=body_html
        )
        
        if success:
            # Update log status
            notification_log.status = 'sent'
            notification_log.sent_at = timezone.now()
            notification_log.save()
            
            logger.info(f"Email with headers sent successfully to {to_email}. Message ID: {message_id}")
            
            return {
                "status": "success",
                "message_id": message_id,
                "to_email": to_email,
                "notification_log_id": str(notification_log.id)
            }
        else:
            # Update log with error
            notification_log.status = 'failed'
            notification_log.error_message = error
            notification_log.save()
            
            logger.error(f"Failed to send email with headers to {to_email}: {error}")
            
            return {
                "status": "error",
                "error": error,
                "to_email": to_email,
                "notification_log_id": str(notification_log.id)
            }
            
    except Exception as e:
        error_msg = f"Task failed to send email with headers to {to_email}: {str(e)}"
        logger.error(error_msg, exc_info=True)
        
        # Try to update log if it exists
        if 'notification_log' in locals():
            notification_log.status = 'failed'
            notification_log.error_message = error_msg
            notification_log.save()
        
        return {
            "status": "error",
            "error": error_msg,
            "to_email": to_email
        }


@shared_task(
    name="notifications.send_password_reset_email",
    bind=True,
    max_retries=3,
    default_retry_delay=60,
    autoretry_for=(Exception,),
    retry_backoff=True,
    retry_jitter=True
)
def send_password_reset_email(self, user_email, user_name, reset_token, reset_url, user_id=None):
    """
    Send password reset email via Gmail API
    
    Args:
        user_email (str): Recipient email address
        user_name (str): User's full name
        reset_token (str): Password reset token
        reset_url (str): Full password reset URL
        user_id (str, optional): User ID for logging
    
    Returns:
        dict: Result with status and message_id
    """
    subject = 'Password Reset Request'
    
    headers = {
        'User_Name': user_name or user_email.split('@')[0],
        'User_Email': user_email,
        'Reset_URL': reset_url,
        'Reset_Token': reset_token,
        'Expiry_Time': '1 hour',
        'Timestamp': timezone.now().strftime('%Y-%m-%d %H:%M:%S UTC'),
        'Message': 'Please click the reset URL to reset your password. If you did not request this, ignore this email.'
    }
    
    # Use send_email_with_headers task
    return send_email_with_headers(
        to_email=user_email,
        subject=subject,
        headers=headers,
        user_id=user_id
    )


@shared_task(
    name="notifications.send_invitation_email",
    bind=True,
    max_retries=3,
    default_retry_delay=60,
    autoretry_for=(Exception,),
    retry_backoff=True,
    retry_jitter=True
)
def send_invitation_email(self, user_email, user_name, temp_password, system_name, role_name, user_id=None):
    """
    Send invitation email with temporary credentials via Gmail API
    
    Args:
        user_email (str): Recipient email address
        user_name (str): User's full name
        temp_password (str): Temporary password
        system_name (str): System name
        role_name (str): Role name
        user_id (str, optional): User ID for logging
    
    Returns:
        dict: Result with status and message_id
    """
    subject = f'Welcome! Your Account has been Created for {system_name}'
    
    headers = {
        'User_Name': user_name or user_email,
        'User_Email': user_email,
        'System_Name': system_name,
        'Role_Name': role_name,
        'Temporary_Password': temp_password,
        'Timestamp': timezone.now().strftime('%Y-%m-%d %H:%M:%S UTC'),
        'Message': 'You have been invited to join the system. Please log in with your temporary password and change it immediately.',
        'Security_Notice': 'For security reasons, please change your password after your first login.'
    }
    
    return send_email_with_headers(
        to_email=user_email,
        subject=subject,
        headers=headers,
        user_id=user_id
    )


@shared_task(
    name="notifications.send_otp_email",
    bind=True,
    max_retries=3,
    default_retry_delay=30,
    autoretry_for=(Exception,),
    retry_backoff=True,
    retry_jitter=True
)
def send_otp_email(self, user_email, user_name, otp_code, user_id=None):
    """
    Send OTP code via Gmail API
    
    Args:
        user_email (str): Recipient email address
        user_name (str): User's full name
        otp_code (str): OTP code
        user_id (str, optional): User ID for logging
    
    Returns:
        dict: Result with status and message_id
    """
    subject = 'Your Authentication Code'
    
    headers = {
        'User_Name': user_name or user_email.split('@')[0],
        'User_Email': user_email,
        'OTP_Code': otp_code,
        'Expiry_Time': '5 minutes',
        'Timestamp': timezone.now().strftime('%Y-%m-%d %H:%M:%S UTC'),
        'Security_Notice': 'Do not share this code with anyone. If you did not request this code, please ignore this email.'
    }
    
    return send_email_with_headers(
        to_email=user_email,
        subject=subject,
        headers=headers,
        user_id=user_id
    )


@shared_task(name="notifications.send_system_addition_email")
def send_system_addition_email(user_email, user_name, system_name, role_name, user_id=None):
    """
    Send system addition notification via Gmail API
    
    Args:
        user_email (str): Recipient email address
        user_name (str): User's full name
        system_name (str): System name
        role_name (str): Role name
        user_id (str, optional): User ID for logging
    
    Returns:
        dict: Result with status and message_id
    """
    subject = f'You have been added to {system_name}'
    
    headers = {
        'User_Name': user_name or user_email,
        'User_Email': user_email,
        'System_Name': system_name,
        'Role_Name': role_name,
        'Timestamp': timezone.now().strftime('%Y-%m-%d %H:%M:%S UTC'),
        'Message': 'You have been granted access to the system. You can now log in using your existing credentials.'
    }
    
    return send_email_with_headers(
        to_email=user_email,
        subject=subject,
        headers=headers,
        user_id=user_id
    )
