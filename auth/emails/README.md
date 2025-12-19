# Email Service - SendGrid Implementation

## Overview

This is a **simple, template-based email service** using SendGrid API. No database models, no Celery queues - just pure template rendering and direct email sending.

## Architecture

```
auth/emails/
├── services.py              # SendGrid email service
├── models.py                # (empty - no database models)
├── admin.py                 # (empty - no admin needed)
├── templates/
│   └── emails/              # HTML email templates
│       ├── password_reset.html
│       ├── otp.html
│       ├── account_locked.html
│       ├── account_unlocked.html
│       └── failed_login.html
└── management/commands/     # (no seed commands needed)
```

## Features

✅ **Pure Template-Based**: Email templates are HTML files in `templates/emails/`  
✅ **No Database**: No EmailLog or EmailTemplate models  
✅ **Direct Sending**: Synchronous email sending via SendGrid API  
✅ **Simple Integration**: Easy to use from any Django view or service  

## Configuration

### 1. Environment Variables

Add these to your `.env` file:

```bash
# SendGrid Configuration
SENDGRID_API_KEY=your-sendgrid-api-key-here
SENDGRID_FROM_EMAIL=noreply@yourdomain.com
SENDGRID_FROM_NAME=TicketFlow
SENDGRID_ENABLED=True
SUPPORT_EMAIL=support@ticketflow.com
```

### 2. Get SendGrid API Key

1. Sign up at [https://sendgrid.com](https://sendgrid.com)
2. Go to Settings → API Keys
3. Create a new API key with "Mail Send" permissions
4. Copy the API key to your `.env` file

### 3. Verify Sender Email

SendGrid requires sender verification:
- Single Sender Verification (free): Verify individual email addresses
- Domain Authentication (recommended): Verify your entire domain

## Usage

### Basic Usage

```python
from emails.services import get_email_service

# Get the service
email_service = get_email_service()

# Send password reset email
success, message_id, error = email_service.send_password_reset_email(
    user_email='user@example.com',
    user_name='John Doe',
    reset_url='https://yourapp.com/reset?token=abc123',
    reset_token='abc123'
)

if success:
    print(f"Email sent! Message ID: {message_id}")
else:
    print(f"Failed to send email: {error}")
```

### Available Email Methods

```python
email_service = get_email_service()

# 1. Password Reset Email
email_service.send_password_reset_email(
    user_email='user@example.com',
    user_name='John Doe',
    reset_url='https://yourapp.com/reset?token=abc123',
    reset_token='abc123'
)

# 2. OTP Code Email
email_service.send_otp_email(
    user_email='user@example.com',
    user_name='John Doe',
    otp_code='123456'
)

# 3. Account Locked Email
email_service.send_account_locked_email(
    user_email='user@example.com',
    user_name='John Doe',
    locked_until=datetime.now() + timedelta(minutes=15),
    failed_attempts=10,
    lockout_duration='15 minutes',
    ip_address='192.168.1.1'
)

# 4. Account Unlocked Email
email_service.send_account_unlocked_email(
    user_email='user@example.com',
    user_name='John Doe',
    ip_address='192.168.1.1'
)

# 5. Failed Login Attempt Email
email_service.send_failed_login_email(
    user_email='user@example.com',
    user_name='John Doe',
    ip_address='192.168.1.1',
    attempt_time=datetime.now(),
    failed_attempts=1
)
```

### Using the Notification Client

For convenience, use the notification client (used throughout the auth service):

```python
from notification_client import get_notification_client

client = get_notification_client()

# Send password reset
client.send_password_reset_email_async(user, reset_token, request)

# Send OTP
client.send_otp_email_async(user, otp_code)

# Send account locked notification
client.send_account_locked_notification(user, failed_attempts=10)

# Send account unlocked notification
client.send_account_unlocked_notification(user)

# Send failed login notification
client.send_failed_login_notification(user, ip_address='192.168.1.1')
```

## Email Templates

Templates are located in `auth/emails/templates/emails/` and use Django template syntax.

### Template Context Variables

Each template receives specific context variables:

#### `password_reset.html`
- `user_name`: Recipient's name
- `reset_url`: Full password reset URL
- `reset_token`: Reset token string
- `expiry_hours`: Token expiry time (default: 1)
- `site_name`: Application name (default: 'TicketFlow')
- `support_email`: Support email address
- `current_year`: Current year for copyright

#### `otp.html`
- `user_name`: Recipient's name
- `otp_code`: 6-digit OTP code
- `expiry_minutes`: OTP expiry time (default: 10)
- `site_name`, `support_email`, `current_year`

#### `account_locked.html`
- `user_name`: Recipient's name
- `locked_until`: DateTime when account unlocks
- `failed_attempts`: Number of failed login attempts
- `lockout_duration`: Human-readable duration (e.g., "15 minutes")
- `ip_address`: IP address of failed attempts
- `site_name`, `support_email`, `current_year`

#### `account_unlocked.html`
- `user_name`: Recipient's name
- `ip_address`: IP address where unlock happened
- `site_name`, `support_email`, `current_year`

#### `failed_login.html`
- `user_name`: Recipient's name
- `ip_address`: IP address of failed attempt
- `attempt_time`: DateTime of the attempt
- `failed_attempts`: Number of failed attempts
- `site_name`, `support_email`, `current_year`

### Customizing Templates

To customize an email template:

1. Edit the HTML file in `auth/emails/templates/emails/`
2. Use Django template syntax for variables: `{{ user_name }}`
3. Changes take effect immediately (no restart needed in DEBUG mode)

Example:

```html
<!DOCTYPE html>
<html>
<head>
    <title>Password Reset</title>
</head>
<body>
    <h1>Hi {{ user_name }}!</h1>
    <p>Click the link below to reset your password:</p>
    <a href="{{ reset_url }}">Reset Password</a>
    <p>This link expires in {{ expiry_hours }} hour(s).</p>
    <p>Need help? Contact {{ support_email }}</p>
</body>
</html>
```

## Testing

### Test Email Sending

Create a test script:

```python
# auth/test_email.py
from emails.services import get_email_service
from django.utils import timezone

email_service = get_email_service()

# Test password reset
success, msg_id, error = email_service.send_password_reset_email(
    user_email='your-test-email@example.com',
    user_name='Test User',
    reset_url='https://example.com/reset?token=test123',
    reset_token='test123'
)

print(f"Success: {success}")
print(f"Message ID: {msg_id}")
print(f"Error: {error}")
```

Run it:

```bash
cd /workspaces/Ticket-Tracking-System/auth
python manage.py shell < test_email.py
```

### Console Email Backend (Development)

For local development without SendGrid, the system falls back to console output:

```python
# In settings.py (automatically configured)
if not SENDGRID_API_KEY and DEBUG:
    EMAIL_BACKEND = 'django.core.mail.backends.console.EmailBackend'
```

Emails will be printed to the console instead of sent.

## Migration from Gmail API

### What Changed

| Before (Gmail API) | After (SendGrid) |
|-------------------|------------------|
| Gmail API OAuth2 authentication | SendGrid API key |
| Token refresh logic | Simple API key |
| `notification_service/` with Celery | Direct sending in `auth/emails/` |
| Database models (EmailLog, EmailTemplate) | Pure template files |
| Async task queues | Synchronous sending |
| Complex setup with credentials.json | Simple API key in .env |

### Migration Steps

1. ✅ **Remove Gmail dependencies**: Removed `google-auth`, `google-api-python-client`
2. ✅ **Add SendGrid**: Added `sendgrid>=6.11.0` to requirements.txt
3. ✅ **Simplify models**: Removed database models (EmailLog, EmailTemplate)
4. ✅ **Update services**: Created simple `SendGridEmailService` class
5. ✅ **Keep templates**: Moved templates to `auth/emails/templates/emails/`
6. ✅ **Update client**: Simplified `notification_client.py` for direct sending
7. ✅ **Update settings**: Added SendGrid configuration

### No Breaking Changes

The public API remains the same:

```python
# This still works!
from notification_client import notification_client

notification_client.send_password_reset_email_async(user, reset_token, request)
```

## Troubleshooting

### "SendGrid API key not configured"

**Solution**: Add `SENDGRID_API_KEY` to your `.env` file

### "SendGrid returned status 401"

**Solution**: Invalid API key. Get a new one from SendGrid dashboard

### "SendGrid returned status 403"

**Solution**: Email address not verified. Complete sender verification in SendGrid

### "Template not found"

**Solution**: Ensure template exists in `auth/emails/templates/emails/`

### Emails not sending in production

**Solution**: Check these settings:
- `SENDGRID_ENABLED=True`
- `SENDGRID_API_KEY` is set correctly
- `SENDGRID_FROM_EMAIL` is verified in SendGrid
- Check Django logs for errors

## Best Practices

1. **Always verify sender emails** in SendGrid before going to production
2. **Use environment variables** for configuration (never hardcode API keys)
3. **Test templates** before deployment
4. **Monitor SendGrid dashboard** for delivery statistics
5. **Set up domain authentication** for better deliverability
6. **Handle errors gracefully** in your views

## SendGrid Features

SendGrid provides additional features you can integrate:

- **Email Analytics**: Track opens, clicks, bounces
- **Webhooks**: Receive delivery events
- **Template Editor**: Visual template builder
- **A/B Testing**: Test subject lines and content
- **Scheduled Sending**: Send emails at specific times

See SendGrid docs: https://docs.sendgrid.com

## Support

For issues with:
- **SendGrid API**: Contact SendGrid support
- **Template rendering**: Check Django template docs
- **Integration issues**: Check auth service logs

---

**Last Updated**: December 8, 2025  
**Author**: TicketFlow Team
