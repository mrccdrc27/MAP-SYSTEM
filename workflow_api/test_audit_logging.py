#!/usr/bin/env python
"""
Test script to verify audit logging is working
Run with: python manage.py shell < test_audit_logging.py
"""

import os
import django

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'workflow_api.settings')
django.setup()

from audit.models import AuditEvent, AuditLog
from audit.utils import log_action

print("\n" + "="*60)
print("AUDIT LOGGING TEST")
print("="*60)

# Check if audit app is installed
from django.apps import apps
audit_app = apps.get_app_config('audit')
print(f"\n✅ Audit app is installed: {audit_app.name}")

# Count existing audit events
event_count = AuditEvent.objects.count()
log_count = AuditLog.objects.count()
print(f"\n📊 Current counts:")
print(f"  - AuditEvent records: {event_count}")
print(f"  - AuditLog records: {log_count}")

# Test log_action directly
print(f"\n🧪 Testing log_action()...")
try:
    test_user = {
        'user_id': 1,
        'username': 'test_user',
        'email': 'test@example.com'
    }
    
    event = log_action(
        user_data=test_user,
        action='test_action',
        description='This is a test audit event'
    )
    
    if event:
        print(f"✅ Successfully created audit event:")
        print(f"   - Event ID: {event.id}")
        print(f"   - Action: {event.action}")
        print(f"   - User: {event.username}")
        print(f"   - Timestamp: {event.timestamp}")
    else:
        print(f"❌ log_action() returned None")
except Exception as e:
    print(f"❌ Error testing log_action(): {e}")
    import traceback
    traceback.print_exc()

# Recount
new_event_count = AuditEvent.objects.count()
new_log_count = AuditLog.objects.count()
print(f"\n📊 Updated counts:")
print(f"  - AuditEvent records: {new_event_count} (was {event_count})")
print(f"  - AuditLog records: {new_log_count} (was {log_count})")

# Show latest events
print(f"\n📋 Latest 3 AuditEvents:")
for i, event in enumerate(AuditEvent.objects.order_by('-timestamp')[:3], 1):
    print(f"  {i}. {event.action} by {event.username} at {event.timestamp}")

print("\n" + "="*60)
print("TEST COMPLETE")
print("="*60 + "\n")
