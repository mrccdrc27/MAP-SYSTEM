#!/usr/bin/env python
"""
Test email sending via SendGrid
"""
import os
import django

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'auth.settings')
django.setup()

from emails.services import get_email_service
from django.conf import settings

def test_email():
    print('=== SendGrid Configuration ===')
    print(f'API Key present: {bool(settings.SENDGRID_API_KEY)}')
    print(f'API Key (first 20 chars): {settings.SENDGRID_API_KEY[:20]}...' if settings.SENDGRID_API_KEY else 'None')
    print(f'From Email: {settings.SENDGRID_FROM_EMAIL}')
    print(f'From Name: {settings.SENDGRID_FROM_NAME}')
    print(f'Enabled: {settings.SENDGRID_ENABLED}')
    
    print('\n=== Testing Email Service ===')
    service = get_email_service()
    
    # Test sending password reset email
    print('\nSending test password reset email...')
    success, message_id, error = service.send_password_reset_email(
        user_email='rivoherinjatovo@gmail.com',
        user_name='Test User',
        reset_url='http://localhost:3000/reset-password?token=test123',
        reset_token='test123'
    )
    
    print(f'\nResult:')
    print(f'  Success: {success}')
    print(f'  Message ID: {message_id}')
    print(f'  Error: {error}')
    
    if success:
        print('\n[OK] Email sent successfully! Check your inbox.')
    else:
        print(f'\n[FAIL] Failed to send email: {error}')

if __name__ == '__main__':
    test_email()
