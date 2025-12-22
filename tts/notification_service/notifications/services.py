from django.conf import settings
from django.utils import timezone
from django.template import Template, Context
from .models import NotificationTemplate, NotificationLog, NotificationRequest
from .gmail_service import get_gmail_service
import logging

logger = logging.getLogger(__name__)


class NotificationService:
    """
    Notification service for sending emails based on templates
    """
    
    @staticmethod
    def process_notification_request(notification_request):
        """
        Process a notification request from another service
        
        Args:
            notification_request: Either a NotificationRequest model instance or dict
        
        Returns:
            bool: True if notification was processed successfully, False otherwise
        """
        try:
            # Handle both model instance and dict
            if isinstance(notification_request, NotificationRequest):
                # It's already a model instance, just process it
                success = NotificationService.send_notification(
                    user_id=notification_request.user_id,  # Can be None
                    user_email=notification_request.user_email,
                    user_name=notification_request.user_name,
                    notification_type=notification_request.notification_type,
                    context_data=notification_request.context_data
                )
                
                # Mark as processed
                notification_request.processed = True
                notification_request.processed_at = timezone.now()
            else:
                # It's a dict, create the model instance first
                request_data = notification_request
                notification_request = NotificationRequest.objects.create(
                    user_id=request_data.get('user_id'),  # Can be None now
                    user_email=request_data.get('user_email'),
                    user_name=request_data.get('user_name', ''),
                    notification_type=request_data.get('notification_type'),
                    context_data=request_data.get('context_data', {}),
                    ip_address=request_data.get('ip_address'),
                    user_agent=request_data.get('user_agent', ''),
                )
                
                # Process the notification
                success = NotificationService.send_notification(
                    user_id=notification_request.user_id,  # Can be None
                    user_email=notification_request.user_email,
                    user_name=notification_request.user_name,
                    notification_type=notification_request.notification_type,
                    context_data=notification_request.context_data
                )
                
                # Mark as processed
                notification_request.processed = True
                notification_request.processed_at = timezone.now()
            notification_request.save()
            
            return success
            
        except Exception as e:
            logger.error(f"Error processing notification request: {str(e)}")
            return False
    
    @staticmethod
    def send_notification(user_id, user_email, user_name, notification_type, context_data=None):
        """
        Send a notification email based on the notification type
        
        Args:
            user_id: UUID of the user
            user_email: Email address of the user
            user_name: Name of the user
            notification_type: String matching NotificationTemplate.notification_type
            context_data: Dict of additional context variables for template rendering
        
        Returns:
            bool: True if notification was sent successfully, False otherwise
        """
        try:
            # Get the notification template
            template = NotificationTemplate.objects.filter(
                notification_type=notification_type,
                is_active=True
            ).first()
            
            if not template:
                logger.warning(f"No active template found for notification type: {notification_type}")
                return False
            
            # Prepare context data
            context = {
                'user_name': user_name or user_email.split('@')[0],
                'user_email': user_email,
                'timestamp': timezone.now().strftime('%Y-%m-%d %H:%M:%S UTC'),
            }
            
            if context_data:
                context.update(context_data)
            
            # Render subject and body
            subject_template = Template(template.subject)
            body_template = Template(template.body_text)
            
            rendered_subject = subject_template.render(Context(context))
            rendered_body = body_template.render(Context(context))
            
            # Create notification log entry
            notification_log = NotificationLog.objects.create(
                user_id=user_id,
                user_email=user_email,
                notification_type=notification_type,
                recipient_email=user_email,
                subject=rendered_subject,
                message=rendered_body,
                context_data=context_data or {},
                status='pending'
            )
            
            try:
                # Send the email using Gmail API
                gmail_service = get_gmail_service()
                success, message_id, error = gmail_service.send_email(
                    to_email=user_email,
                    subject=rendered_subject,
                    body_text=rendered_body,
                    body_html=template.body_html if template.body_html else None
                )
                
                if success:
                    # Update log status
                    notification_log.status = 'sent'
                    notification_log.sent_at = timezone.now()
                    notification_log.save()
                    
                    logger.info(f"Notification '{notification_type}' sent successfully to {user_email}. Message ID: {message_id}")
                    return True
                else:
                    # Update log with error
                    notification_log.status = 'failed'
                    notification_log.error_message = error
                    notification_log.save()
                    logger.error(f"Failed to send notification '{notification_type}' to {user_email}: {error}")
                    return False
                
            except Exception as e:
                # Update log with error
                notification_log.status = 'failed'
                notification_log.error_message = str(e)
                notification_log.save()
                
                logger.error(f"Failed to send notification '{notification_type}' to {user_email}: {str(e)}")
                return False
                
        except Exception as e:
            logger.error(f"Error processing notification '{notification_type}' for user {user_email}: {str(e)}")
            return False
    
    @staticmethod
    def get_notification_history(user_id=None, user_email=None, notification_type=None, limit=50):
        """
        Get notification history with optional filters
        """
        queryset = NotificationLog.objects.all()
        
        if user_id:
            queryset = queryset.filter(user_id=user_id)
        if user_email:
            queryset = queryset.filter(user_email=user_email)
        if notification_type:
            queryset = queryset.filter(notification_type=notification_type)
        
        return queryset[:limit]
    
    @staticmethod
    def send_email_direct(recipient_email, subject, message, html_message=None):
        """
        Send email directly without using templates (for flexible email endpoint)
        
        Args:
            recipient_email: Email address to send to
            subject: Email subject
            message: Plain text message content
            html_message: HTML message content (optional)
        
        Returns:
            bool: True if email was sent successfully, False otherwise
        """
        try:
            from django.core.mail import EmailMultiAlternatives
            
            # Create email message
            email = EmailMultiAlternatives(
                subject=subject,
                body=message,
                from_email=settings.DEFAULT_FROM_EMAIL,
                to=[recipient_email]
            )
            
            # Add HTML alternative if provided
            if html_message:
                email.attach_alternative(html_message, "text/html")
            
            # Send the email
            email.send(fail_silently=False)
            
            logger.info(f"Direct email sent successfully to {recipient_email}")
            return True
            
        except Exception as e:
            logger.error(f"Failed to send direct email to {recipient_email}: {str(e)}")
            return False