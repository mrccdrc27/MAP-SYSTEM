#!/usr/bin/env python
"""
SMTP Test Script for Django Email Configuration
Run this script to test your email settings before using them in Django.
"""

import os
import sys
import smtplib
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from decouple import config
import django
from pathlib import Path

# Add the project root to Python path
BASE_DIR = Path(__file__).resolve().parent
sys.path.append(str(BASE_DIR))

# Setup Django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'auth.settings')
django.setup()

def test_smtp_connection():
    """Test SMTP connection using raw smtplib"""
    print("=" * 60)
    print("TESTING SMTP CONNECTION")
    print("=" * 60)
    
    # Load configuration
    email_host = config('EMAIL_HOST')
    email_port = config('EMAIL_PORT', cast=int)
    email_host_user = config('EMAIL_HOST_USER')
    email_host_password = config('EMAIL_HOST_PASSWORD')
    email_use_tls = config('EMAIL_USE_TLS', cast=bool)
    
    print(f"Host: {email_host}")
    print(f"Port: {email_port}")
    print(f"Username: {email_host_user}")
    print(f"Password: {'*' * len(email_host_password) if email_host_password else 'NOT SET'}")
    print(f"Use TLS: {email_use_tls}")
    print()
    
    # Check for common formatting issues
    if email_host_user.startswith("'") and email_host_user.endswith("'"):
        print("⚠️  WARNING: EMAIL_HOST_USER has quotes - remove them from .env file")
        email_host_user = email_host_user.strip("'")
    
    if email_host_password.startswith("'") and email_host_password.endswith("'"):
        print("⚠️  WARNING: EMAIL_HOST_PASSWORD has quotes - remove them from .env file")
        email_host_password = email_host_password.strip("'")
    
    try:
        # Create SMTP connection
        print("Connecting to SMTP server...")
        server = smtplib.SMTP(email_host, email_port)
        
        # Enable debug output
        server.set_debuglevel(1)
        
        if email_use_tls:
            print("Starting TLS...")
            server.starttls()
        
        print("Logging in...")
        server.login(email_host_user, email_host_password)
        
        print("✅ SMTP connection successful!")
        server.quit()
        return True
        
    except smtplib.SMTPAuthenticationError as e:
        print(f"❌ Authentication failed: {e}")
        print("This usually means:")
        print("  - Wrong email/password")
        print("  - Need to use App Password for Gmail")
        print("  - 2FA is enabled but App Password not used")
        return False
        
    except smtplib.SMTPException as e:
        print(f"❌ SMTP error: {e}")
        return False
        
    except Exception as e:
        print(f"❌ Connection error: {e}")
        return False

def test_django_email():
    """Test Django's email functionality"""
    print("\n" + "=" * 60)
    print("TESTING DJANGO EMAIL")
    print("=" * 60)
    
    from django.core.mail import send_mail
    from django.conf import settings
    
    print(f"Django EMAIL_BACKEND: {settings.EMAIL_BACKEND}")
    print(f"Django EMAIL_HOST: {settings.EMAIL_HOST}")
    print(f"Django EMAIL_PORT: {settings.EMAIL_PORT}")
    print(f"Django EMAIL_HOST_USER: {settings.EMAIL_HOST_USER}")
    print(f"Django EMAIL_USE_TLS: {settings.EMAIL_USE_TLS}")
    print(f"Django DEFAULT_FROM_EMAIL: {settings.DEFAULT_FROM_EMAIL}")
    print()
    
    try:
        # Send test email
        subject = 'SMTP Test Email'
        message = 'This is a test email sent from your Django application.'
        from_email = settings.DEFAULT_FROM_EMAIL
        recipient_list = [settings.EMAIL_HOST_USER]  # Send to self for testing
        
        print(f"Sending test email to: {recipient_list[0]}")
        
        send_mail(
            subject,
            message,
            from_email,
            recipient_list,
            fail_silently=False,
        )
        
        print("✅ Django email sent successfully!")
        return True
        
    except Exception as e:
        print(f"❌ Django email failed: {e}")
        return False

def check_env_file():
    """Check .env file for common issues"""
    print("=" * 60)
    print("CHECKING .ENV FILE")
    print("=" * 60)
    
    env_file = BASE_DIR / '.env'
    
    if not env_file.exists():
        print("❌ .env file not found!")
        return False
    
    print(f"Reading .env file: {env_file}")
    
    with open(env_file, 'r') as f:
        lines = f.readlines()
    
    email_lines = [line for line in lines if line.strip().startswith('EMAIL_HOST')]
    
    for line in email_lines:
        line = line.strip()
        if '=' in line:
            key, value = line.split('=', 1)
            if value.startswith("'") and value.endswith("'"):
                print(f"⚠️  {key} has quotes: {line}")
                cleaned_value = value.strip("'")
                print(f"   Should be: {key}={cleaned_value}")
            elif value.startswith('"') and value.endswith('"'):
                print(f"⚠️  {key} has quotes: {line}")
                cleaned_value = value.strip('"')
                print(f"   Should be: {key}={cleaned_value}")
            else:
                print(f"✅ {key} formatting looks good")
    
    return True

def main():
    """Run all tests"""
    print("SMTP Configuration Test Script")
    print("This script will test your email configuration")
    print()
    
    # Check .env file
    check_env_file()
    
    # Test raw SMTP connection
    smtp_success = test_smtp_connection()
    
    # Test Django email if SMTP works
    if smtp_success:
        django_success = test_django_email()
    else:
        print("\nSkipping Django email test due to SMTP connection failure")
        django_success = False
    
    # Summary
    print("\n" + "=" * 60)
    print("TEST SUMMARY")
    print("=" * 60)
    print(f"SMTP Connection: {'✅ PASS' if smtp_success else '❌ FAIL'}")
    print(f"Django Email: {'✅ PASS' if django_success else '❌ FAIL'}")
    
    if not smtp_success:
        print("\nTROUBLESHOoting TIPS:")
        print("1. Remove quotes from EMAIL_HOST_USER and EMAIL_HOST_PASSWORD in .env")
        print("2. For Gmail, use App Password instead of regular password")
        print("3. Make sure 2FA is enabled and App Password is generated")
        print("4. Check that the email address is correct")

if __name__ == '__main__':
    main()
