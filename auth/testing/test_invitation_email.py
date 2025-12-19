#!/usr/bin/env python
"""
Test the invitation email functionality specifically
"""

import os
import sys
import django
from pathlib import Path

# Add the project root to Python path
BASE_DIR = Path(__file__).resolve().parent
sys.path.append(str(BASE_DIR))

# Setup Django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'auth.settings')
django.setup()

def test_invitation_email():
    """Test the invitation email function"""
    from system_roles.serializers import send_invitation_email
    from users.models import User
    from django.conf import settings
    
    print("=" * 60)
    print("TESTING INVITATION EMAIL FUNCTION")
    print("=" * 60)
    
    # Print current Django email settings
    print(f"Django EMAIL_BACKEND: {settings.EMAIL_BACKEND}")
    print(f"Django EMAIL_HOST: {settings.EMAIL_HOST}")
    print(f"Django EMAIL_PORT: {settings.EMAIL_PORT}")
    print(f"Django EMAIL_HOST_USER: {settings.EMAIL_HOST_USER}")
    print(f"Django EMAIL_HOST_PASSWORD: {'*' * len(settings.EMAIL_HOST_PASSWORD) if settings.EMAIL_HOST_PASSWORD else 'NOT SET'}")
    print(f"Django EMAIL_USE_TLS: {settings.EMAIL_USE_TLS}")
    print(f"Django DEFAULT_FROM_EMAIL: {settings.DEFAULT_FROM_EMAIL}")
    print()
    
    # Create a test user or get existing one
    test_email = "cubecore27@gmail.com"
    try:
        user = User.objects.get(email=test_email)
        print(f"Using existing user: {user.email}")
    except User.DoesNotExist:
        print(f"User {test_email} not found, creating temporary user for test...")
        user = User(
            email=test_email,
            username="testuser",
            first_name="Test",
            last_name="User"
        )
    
    # Test the invitation email function
    temp_password = "TestPassword123"
    system_name = "Test System"
    role_name = "Test Role"
    
    print(f"Sending invitation email to: {user.email}")
    print(f"Temporary password: {temp_password}")
    print(f"System: {system_name}")
    print(f"Role: {role_name}")
    print()
    
    try:
        result = send_invitation_email(user, temp_password, system_name, role_name)
        if result:
            print("✅ Invitation email sent successfully!")
        else:
            print("❌ Invitation email failed to send")
        return result
    except Exception as e:
        print(f"❌ Error calling send_invitation_email: {e}")
        return False

if __name__ == '__main__':
    success = test_invitation_email()
    
    if not success:
        print("\n" + "=" * 60)
        print("TROUBLESHOOTING SUGGESTIONS")
        print("=" * 60)
        print("1. Restart your Django development server to reload environment variables")
        print("2. Check if Django is using cached settings")
        print("3. Verify that the .env file is being loaded correctly by Django")
        print("4. Check for any Django processes that might be using old settings")
