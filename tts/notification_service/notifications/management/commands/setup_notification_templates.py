from django.core.management.base import BaseCommand
from notifications.models import NotificationTemplate


class Command(BaseCommand):
    help = 'Setup default notification templates for the notification service'

    def handle(self, *args, **options):
        templates = [
            {
                'notification_type': 'account_locked',
                'subject': 'Security Alert: Account Locked - {{ user_name }}',
                'body_text': '''Hello {{ user_name }},

Your account has been locked due to {{ failed_attempts }} failed login attempts.

For security reasons, your account will remain locked for {{ lockout_duration }}.

If this wasn't you, please contact our support team immediately.

Timestamp: {{ timestamp }}

Best regards,
Security Team'''
            },
            {
                'notification_type': 'account_unlocked',
                'subject': 'Account Unlocked - {{ user_name }}',
                'body_text': '''Hello {{ user_name }},

Your account has been successfully unlocked and you can now log in again.

If you didn't request this unlock or have any concerns, please contact our support team.

Timestamp: {{ timestamp }}

Best regards,
Security Team'''
            },
            {
                'notification_type': 'failed_login_attempt',
                'subject': 'Security Alert: Failed Login Attempt - {{ user_name }}',
                'body_text': '''Hello {{ user_name }},

We detected a failed login attempt for your account.

Details:
- Time: {{ timestamp }}
- IP Address: {{ ip_address }}

If this was you, please make sure you're using the correct credentials. If this wasn't you, please secure your account immediately.

Best regards,
Security Team'''
            },
            {
                'notification_type': 'password_reset',
                'subject': 'Password Reset Request - {{ user_name }}',
                'body_text': '''Hello {{ user_name }},

A password reset was requested for your account.

If you requested this reset, please use the provided link to reset your password.
If you didn't request this, please ignore this email and contact support if you have concerns.

Timestamp: {{ timestamp }}

Best regards,
Security Team'''
            },
            {
                'notification_type': 'account_created',
                'subject': 'Welcome to our platform - {{ user_name }}',
                'body_text': '''Hello {{ user_name }},

Welcome to our platform! Your account has been successfully created.

You can now log in using your email address and the password you provided during registration.

If you have any questions, please don't hesitate to contact our support team.

Timestamp: {{ timestamp }}

Best regards,
Support Team'''
            },
            {
                'notification_type': 'login_success',
                'subject': 'Successful Login - {{ user_name }}',
                'body_text': '''Hello {{ user_name }},

We're notifying you of a successful login to your account.

Details:
- Time: {{ timestamp }}
- IP Address: {{ ip_address }}

If this wasn't you, please contact our support team immediately.

Best regards,
Security Team'''
            },
        ]

        created_count = 0
        for template_data in templates:
            template, created = NotificationTemplate.objects.get_or_create(
                notification_type=template_data['notification_type'],
                defaults={
                    'subject': template_data['subject'],
                    'body_text': template_data['body_text'],
                    'is_active': True
                }
            )
            
            if created:
                created_count += 1
                self.stdout.write(
                    self.style.SUCCESS(
                        f'Created template: {template.notification_type}'
                    )
                )
            else:
                self.stdout.write(
                    self.style.WARNING(
                        f'Template already exists: {template.notification_type}'
                    )
                )

        self.stdout.write(
            self.style.SUCCESS(
                f'Successfully set up {created_count} new notification templates.'
            )
        )