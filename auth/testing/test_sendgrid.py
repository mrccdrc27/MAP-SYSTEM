#!/usr/bin/env python
"""
Quick test script for SendGrid email service
Run: python manage.py shell < test_sendgrid.py
"""

from emails.services import get_email_service
from django.utils import timezone

print("=" * 60)
print("Testing SendGrid Email Service")
print("=" * 60)

email_service = get_email_service()

# Test email address (replace with your test email)
TEST_EMAIL = "rivovebayo@gmail.com"

print(f"\nSending test emails to: {TEST_EMAIL}")
print("Make sure to replace TEST_EMAIL with your actual email!\n")

# Test 1: Password Reset Email
print("1. Testing Password Reset Email...")
success, msg_id, error = email_service.send_password_reset_email(
    user_email=TEST_EMAIL,
    user_name='Test User',
    reset_url='https://example.com/reset?token=test123',
    reset_token='test123'
)
print(f"   Success: {success}")
if success:
    print(f"   Message ID: {msg_id}")
else:
    print(f"   Error: {error}")

# Test 2: OTP Email
print("\n2. Testing OTP Email...")
success, msg_id, error = email_service.send_otp_email(
    user_email=TEST_EMAIL,
    user_name='Test User',
    otp_code='123456'
)
print(f"   Success: {success}")
if success:
    print(f"   Message ID: {msg_id}")
else:
    print(f"   Error: {error}")

# Test 3: Account Locked Email
print("\n3. Testing Account Locked Email...")
locked_until = timezone.now() + timezone.timedelta(minutes=15)
success, msg_id, error = email_service.send_account_locked_email(
    user_email=TEST_EMAIL,
    user_name='Test User',
    locked_until=locked_until,
    failed_attempts=10,
    lockout_duration='15 minutes',
    ip_address='192.168.1.1'
)
print(f"   Success: {success}")
if success:
    print(f"   Message ID: {msg_id}")
else:
    print(f"   Error: {error}")

# Test 4: Account Unlocked Email
print("\n4. Testing Account Unlocked Email...")
success, msg_id, error = email_service.send_account_unlocked_email(
    user_email=TEST_EMAIL,
    user_name='Test User',
    ip_address='192.168.1.1'
)
print(f"   Success: {success}")
if success:
    print(f"   Message ID: {msg_id}")
else:
    print(f"   Error: {error}")

# Test 5: Failed Login Email
print("\n5. Testing Failed Login Email...")
success, msg_id, error = email_service.send_failed_login_email(
    user_email=TEST_EMAIL,
    user_name='Test User',
    ip_address='192.168.1.1',
    attempt_time=timezone.now(),
    failed_attempts=1
)
print(f"   Success: {success}")
if success:
    print(f"   Message ID: {msg_id}")
else:
    print(f"   Error: {error}")

print("\n" + "=" * 60)
print("Testing Complete!")
print("Check your email inbox for the test emails.")
print("=" * 60)
