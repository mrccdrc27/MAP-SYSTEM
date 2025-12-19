"""
Email utilities for HDTS employee app.
Handles all email sending with HTML templates.
"""
import logging
from django.conf import settings
from django.core.mail import send_mail
from django.template.loader import render_to_string
from django.utils.html import strip_tags

logger = logging.getLogger(__name__)


def send_welcome_email(employee):
    """
    Send welcome email to newly registered employee.
    """
    context = {
        'full_name': employee.get_full_name(),
    }
    
    html_message = render_to_string('hdts/emails/welcome.html', context)
    plain_message = strip_tags(html_message)
    
    try:
        send_mail(
            subject='Welcome to HDTS',
            message=plain_message,
            from_email=settings.DEFAULT_FROM_EMAIL,
            recipient_list=[employee.email],
            html_message=html_message,
            fail_silently=False
        )
        logger.info(f"Welcome email sent to {employee.email}")
        return True
    except Exception as e:
        logger.error(f"Failed to send welcome email to {employee.email}: {str(e)}")
        return False


def send_otp_email(employee, otp_code, expiration_minutes=10):
    """
    Send OTP email for 2FA login.
    """
    context = {
        'otp_code': otp_code,
        'expiration_time': expiration_minutes,
    }
    
    html_message = render_to_string('hdts/emails/otp.html', context)
    plain_message = strip_tags(html_message)
    
    try:
        send_mail(
            subject='Your OTP Code',
            message=plain_message,
            from_email=settings.DEFAULT_FROM_EMAIL,
            recipient_list=[employee.email],
            html_message=html_message,
            fail_silently=False
        )
        logger.info(f"OTP email sent to {employee.email}")
        return True
    except Exception as e:
        logger.error(f"Failed to send OTP email to {employee.email}: {str(e)}")
        return False


def send_password_change_email(employee):
    """
    Send password change confirmation email.
    """
    from django.utils import timezone
    
    context = {
        'full_name': employee.get_full_name(),
        'timestamp': timezone.now().strftime('%Y-%m-%d %H:%M:%S'),
    }
    
    html_message = render_to_string('hdts/emails/password_change.html', context)
    plain_message = strip_tags(html_message)
    
    try:
        send_mail(
            subject='Password Changed',
            message=plain_message,
            from_email=settings.DEFAULT_FROM_EMAIL,
            recipient_list=[employee.email],
            html_message=html_message,
            fail_silently=False
        )
        logger.info(f"Password change email sent to {employee.email}")
        return True
    except Exception as e:
        logger.error(f"Failed to send password change email to {employee.email}: {str(e)}")
        return False


def send_2fa_enabled_email(employee):
    """
    Send 2FA enabled notification email.
    """
    context = {
        'full_name': employee.get_full_name(),
    }
    
    html_message = render_to_string('hdts/emails/2fa_enabled.html', context)
    plain_message = strip_tags(html_message)
    
    try:
        send_mail(
            subject='Two-Factor Authentication Enabled',
            message=plain_message,
            from_email=settings.DEFAULT_FROM_EMAIL,
            recipient_list=[employee.email],
            html_message=html_message,
            fail_silently=False
        )
        logger.info(f"2FA enabled email sent to {employee.email}")
        return True
    except Exception as e:
        logger.error(f"Failed to send 2FA enabled email to {employee.email}: {str(e)}")
        return False


def send_2fa_disabled_email(employee):
    """
    Send 2FA disabled notification email.
    """
    context = {
        'full_name': employee.get_full_name(),
    }
    
    html_message = render_to_string('hdts/emails/2fa_disabled.html', context)
    plain_message = strip_tags(html_message)
    
    try:
        send_mail(
            subject='Two-Factor Authentication Disabled',
            message=plain_message,
            from_email=settings.DEFAULT_FROM_EMAIL,
            recipient_list=[employee.email],
            html_message=html_message,
            fail_silently=False
        )
        logger.info(f"2FA disabled email sent to {employee.email}")
        return True
    except Exception as e:
        logger.error(f"Failed to send 2FA disabled email to {employee.email}: {str(e)}")
        return False


def send_password_reset_email(employee, reset_link):
    """
    Send password reset link email.
    """
    context = {
        'reset_link': reset_link,
    }
    
    html_message = render_to_string('hdts/emails/password_reset.html', context)
    plain_message = strip_tags(html_message)
    
    try:
        send_mail(
            subject='Password Reset Request',
            message=plain_message,
            from_email=settings.DEFAULT_FROM_EMAIL,
            recipient_list=[employee.email],
            html_message=html_message,
            fail_silently=False
        )
        logger.info(f"Password reset email sent to {employee.email}")
        return True
    except Exception as e:
        logger.error(f"Failed to send password reset email to {employee.email}: {str(e)}")
        return False
