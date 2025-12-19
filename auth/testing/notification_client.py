"""
Simple email notification client using local SendGrid service
No database logging, pure template-based email sending
"""

import logging
from django.conf import settings

logger = logging.getLogger(__name__)


class NotificationClient:
    """
    Simple notification client using local SendGrid email service
    No Celery, no external service - direct email sending
    """
    
    def __init__(self):
        self.email_service = None
    
    def _get_email_service(self):
        """Get the SendGrid email service (lazy loading)"""
        if self.email_service is None:
            from emails.services import get_email_service
            self.email_service = get_email_service()
        return self.email_service
    
    def send_password_reset_email_async(self, user, reset_token, request=None):
        """
        Send password reset email directly using SendGrid
        
        Args:
            user: User model instance
            reset_token: PasswordResetToken instance
            request: Optional Django request object for building URLs
        """
        try:
            # Build reset URL
            if request:
                base_url = f"{request.scheme}://{request.get_host()}"
            else:
                base_url = getattr(settings, 'FRONTEND_URL', 'http://localhost:3000')
            
            reset_url = f"{base_url}/api/v1/users/password/reset?token={reset_token.token}"
            
            # Send email
            email_service = self._get_email_service()
            success, message_id, error = email_service.send_password_reset_email(
                user_email=user.email,
                user_name=user.get_full_name() or user.username,
                reset_url=reset_url,
                reset_token=reset_token.token
            )
            
            if success:
                logger.info(f"Password reset email sent to {user.email}")
            else:
                logger.error(f"Failed to send password reset email to {user.email}: {error}")
            
            return success
            
        except Exception as e:
            logger.error(f"Error sending password reset email: {str(e)}", exc_info=True)
            return False
    
    def send_otp_email_async(self, user, otp_code):
        """
        Send OTP verification email
        """
        try:
            email_service = self._get_email_service()
            success, message_id, error = email_service.send_otp_email(
                user_email=user.email,
                user_name=user.get_full_name() or user.username,
                otp_code=otp_code
            )
            
            if success:
                logger.info(f"OTP email sent to {user.email}")
            else:
                logger.error(f"Failed to send OTP email to {user.email}: {error}")
            
            return success
            
        except Exception as e:
            logger.error(f"Error sending OTP email: {str(e)}", exc_info=True)
            return False
    
    def send_account_locked_notification(self, user, failed_attempts=None, lockout_duration="15 minutes", ip_address=None, user_agent=None):
        """
        Send account locked notification
        """
        try:
            from django.utils import timezone
            locked_until = timezone.now() + timezone.timedelta(minutes=15)
            
            email_service = self._get_email_service()
            success, message_id, error = email_service.send_account_locked_email(
                user_email=user.email,
                user_name=user.get_full_name() or user.username,
                locked_until=locked_until,
                failed_attempts=failed_attempts,
                lockout_duration=lockout_duration,
                ip_address=ip_address
            )
            
            if success:
                logger.info(f"Account locked email sent to {user.email}")
            else:
                logger.error(f"Failed to send account locked email to {user.email}: {error}")
            
            return success
            
        except Exception as e:
            logger.error(f"Error sending account locked email: {str(e)}", exc_info=True)
            return False
    
    def send_account_unlocked_notification(self, user, ip_address=None, user_agent=None):
        """
        Send account unlocked notification
        """
        try:
            email_service = self._get_email_service()
            success, message_id, error = email_service.send_account_unlocked_email(
                user_email=user.email,
                user_name=user.get_full_name() or user.username,
                ip_address=ip_address
            )
            
            if success:
                logger.info(f"Account unlocked email sent to {user.email}")
            else:
                logger.error(f"Failed to send account unlocked email to {user.email}: {error}")
            
            return success
            
        except Exception as e:
            logger.error(f"Error sending account unlocked email: {str(e)}", exc_info=True)
            return False
    
    def send_failed_login_notification(self, user, ip_address=None, user_agent=None):
        """
        Send failed login attempt notification
        """
        try:
            from django.utils import timezone
            
            email_service = self._get_email_service()
            success, message_id, error = email_service.send_failed_login_email(
                user_email=user.email,
                user_name=user.get_full_name() or user.username,
                ip_address=ip_address,
                attempt_time=timezone.now()
            )
            
            if success:
                logger.info(f"Failed login email sent to {user.email}")
            else:
                logger.error(f"Failed to send failed login email to {user.email}: {error}")
            
            return success
            
        except Exception as e:
            logger.error(f"Error sending failed login email: {str(e)}", exc_info=True)
            return False


# Singleton instance
_notification_client = None

def get_notification_client():
    """Get or create the notification client singleton"""
    global _notification_client
    if _notification_client is None:
        _notification_client = NotificationClient()
    return _notification_client


# Global instance for backward compatibility
notification_client = get_notification_client()


# Convenience function for backward compatibility
def send_password_reset_email(user, reset_token, request=None):
    """Send password reset email - convenience function"""
    client = get_notification_client()
    return client.send_password_reset_email_async(user, reset_token, request)