#!/usr/bin/env python
"""
Test JWT token generation and validation
Run with: python test_jwt.py
"""
import os
import sys
import django

# Setup Django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'auth.settings')
django.setup()

from users.models import User
from users.serializers import CustomTokenObtainPairSerializer
import jwt as pyjwt

def test_jwt_generation():
    """Test JWT token generation and inspect claims"""
    
    # Get or create test user
    email = "admin@example.com"
    try:
        user = User.objects.get(email=email)
        print(f"✓ Found user: {user.email}")
    except User.DoesNotExist:
        print(f"✗ User {email} not found. Run: python manage.py seed_systems")
        return
    
    # Generate token
    refresh = CustomTokenObtainPairSerializer.get_token(user)
    access_token = str(refresh.access_token)
    
    print(f"\n{'='*60}")
    print("ACCESS TOKEN GENERATED")
    print(f"{'='*60}")
    print(f"\nToken (first 50 chars): {access_token[:50]}...")
    
    # Decode token (without verification to see claims)
    decoded = pyjwt.decode(access_token, options={"verify_signature": False})
    
    print(f"\n{'='*60}")
    print("TOKEN CLAIMS")
    print(f"{'='*60}")
    for key, value in decoded.items():
        if key in ['exp', 'iat']:
            from datetime import datetime
            value = f"{value} ({datetime.fromtimestamp(value)})"
        print(f"  {key:20s}: {value}")
    
    # Check required Kong claims
    print(f"\n{'='*60}")
    print("KONG VALIDATION CHECKS")
    print(f"{'='*60}")
    
    required_claims = {
        'iss': 'tts-jwt-issuer',
        'exp': 'Present (expiration time)',
    }
    
    for claim, expected in required_claims.items():
        if claim in decoded:
            if claim == 'iss':
                matches = decoded[claim] == 'tts-jwt-issuer'
                status = "✓ MATCH" if matches else f"✗ MISMATCH (got: {decoded[claim]})"
            else:
                status = "✓ Present"
            print(f"  {claim:20s}: {status}")
        else:
            print(f"  {claim:20s}: ✗ MISSING")
    
    # Test with Django's signing key
    from django.conf import settings
    print(f"\n{'='*60}")
    print("SIGNING KEY CONFIGURATION")
    print(f"{'='*60}")
    print(f"  DJANGO_JWT_SIGNING_KEY : {settings.JWT_SIGNING_KEY}")
    print(f"  Algorithm              : HS256")
    print(f"  Kong expects           : signing-key-1234")
    print(f"  Match                  : {'✓ YES' if settings.JWT_SIGNING_KEY == 'signing-key-1234' else '✗ NO'}")
    
    # Verify signature
    try:
        pyjwt.decode(access_token, settings.JWT_SIGNING_KEY, algorithms=['HS256'])
        print(f"\n✓ Token signature valid with Django's signing key")
    except Exception as e:
        print(f"\n✗ Token signature invalid: {e}")
    
    print(f"\n{'='*60}")
    print("CURL TEST COMMAND")
    print(f"{'='*60}")
    print(f'\ncurl -H "Authorization: Bearer {access_token}" http://localhost:8000/api/v1/users/profile/\n')

if __name__ == '__main__':
    test_jwt_generation()
