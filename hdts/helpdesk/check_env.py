import os
import sys

# Add the parent directory to Python path
sys.path.insert(0, os.path.dirname(os.path.dirname(__file__)))

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'backend.settings')

import django
django.setup()

from django.conf import settings

print("=== HDTS Environment Check ===")
print(f"DJANGO_SECRET_KEY from env: {os.environ.get('DJANGO_SECRET_KEY', 'NOT SET')}")
print(f"DJANGO_JWT_SIGNING_KEY from env: {os.environ.get('DJANGO_JWT_SIGNING_KEY', 'NOT SET')}")
print(f"SECRET_KEY in settings: {settings.SECRET_KEY}")
print(f"JWT_SIGNING_KEY in settings: {getattr(settings, 'JWT_SIGNING_KEY', 'NOT SET')}")
print(f"SIMPLE_JWT SIGNING_KEY: {settings.SIMPLE_JWT.get('SIGNING_KEY', 'NOT SET')}")
print(f"DEBUG: {settings.DEBUG}")
print(f"ALLOWED_HOSTS: {settings.ALLOWED_HOSTS}")
