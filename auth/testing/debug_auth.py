#!/usr/bin/env python
"""
Debug script to test authentication credentials directly
"""
import os
import sys
import django

# Setup Django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'auth.settings')
django.setup()

from django.contrib.auth import authenticate
from django.test import RequestFactory
from users.models import User
from users.forms import LoginForm

def test_authentication():
    print("=== Authentication Debug Script ===")
    
    # Get user email from input
    email = input("Enter email address: ").strip()
    password = input("Enter password: ").strip()
    
    print(f"\n1. Testing with email: {email}")
    
    # Check if user exists
    try:
        user = User.objects.get(email=email)
        print(f"✓ User found: {user.username} (ID: {user.id})")
        print(f"  - Is active: {user.is_active}")
        print(f"  - Is locked: {user.is_locked}")
        print(f"  - Failed attempts: {user.failed_login_attempts}")
        print(f"  - 2FA enabled: {user.otp_enabled}")
    except User.DoesNotExist:
        print("✗ User not found in database")
        return
    
    # Test password verification
    print(f"\n2. Testing password verification...")
    password_valid = user.check_password(password)
    print(f"  - Password valid: {password_valid}")
    
    # Test Django authenticate function (without request)
    print(f"\n3. Testing Django authenticate function (no request)...")
    authenticated_user = authenticate(username=email, password=password)
    print(f"  - Authenticate result: {authenticated_user}")
    
    # Test Django authenticate function (with request)
    print(f"\n4. Testing Django authenticate function (with request)...")
    request_factory = RequestFactory()
    request = request_factory.post('/login/')
    authenticated_user_with_request = authenticate(request=request, username=email, password=password)
    print(f"  - Authenticate with request result: {authenticated_user_with_request}")
    
    # Test with LoginForm
    print(f"\n5. Testing with LoginForm...")
    from systems.models import System
    
    # Get a system for testing
    try:
        system = System.objects.first()
        if not system:
            print("  - No systems found in database")
            return
            
        form_data = {
            'email': email,
            'password': password,
            'system': system.id,
            'otp_code': '',
            'captcha_0': 'dummy',  # Captcha hash
            'captcha_1': 'PASSED',  # Captcha response (dummy)
            'remember_me': False
        }
        
        form = LoginForm(data=form_data, request=request)
        print(f"  - Form is valid: {form.is_valid()}")
        
        if not form.is_valid():
            print(f"  - Form errors: {form.errors}")
            print(f"  - Non-field errors: {form.non_field_errors()}")
        else:
            print("  - Form validation passed!")
            form_user = form.get_user()
            print(f"  - Form authenticated user: {form_user}")
            
    except Exception as e:
        print(f"  - Error testing form: {e}")
    
    if authenticated_user:
        print("\n✓ Basic authentication successful!")
    else:
        print("\n✗ Basic authentication failed!")
        
        # Additional debugging
        print("\n6. Additional checks:")
        print(f"  - User has_usable_password: {user.has_usable_password()}")
        print(f"  - User password hash: {user.password[:50]}...")
        
        # Check authentication backends
        from django.conf import settings
        print(f"  - Authentication backends: {getattr(settings, 'AUTHENTICATION_BACKENDS', ['default'])}")

if __name__ == "__main__":
    test_authentication()