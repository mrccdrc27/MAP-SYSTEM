#!/usr/bin/env python
"""
Diagnostic script to trace audit logging flow
Run from workflow_api directory: python manage.py shell < test_audit_diagnostic.py
"""

import os
import django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'workflow_api.settings')
django.setup()

import logging
from django.conf import settings

print("\n" + "="*70)
print("AUDIT LOGGING DIAGNOSTIC")
print("="*70 + "\n")

# 1. Check settings
print("1️⃣  CHECKING SETTINGS")
print("-" * 70)
installed_apps = settings.INSTALLED_APPS
print(f"✓ INSTALLED_APPS count: {len(installed_apps)}")
if 'audit' in installed_apps:
    print(f"✅ 'audit' app is installed in INSTALLED_APPS")
else:
    print(f"❌ 'audit' app is NOT in INSTALLED_APPS - THIS IS A PROBLEM!")
    print(f"   Add 'audit' to INSTALLED_APPS in settings.py")

# 2. Check imports
print("\n2️⃣  CHECKING IMPORTS")
print("-" * 70)
try:
    from audit.utils import log_action, compare_models
    print("✅ Successfully imported audit.utils.log_action")
    print("✅ Successfully imported audit.utils.compare_models")
except ImportError as e:
    print(f"❌ Failed to import: {e}")
    
try:
    from audit.models import AuditEvent, AuditLog
    print("✅ Successfully imported audit.models.AuditEvent")
    print("✅ Successfully imported audit.models.AuditLog")
except ImportError as e:
    print(f"❌ Failed to import: {e}")

# 3. Check database tables
print("\n3️⃣  CHECKING DATABASE TABLES")
print("-" * 70)
from django.apps import apps
from django.db import connection

try:
    with connection.cursor() as cursor:
        cursor.execute("SELECT name FROM sqlite_master WHERE type='table' AND name LIKE 'audit%';")
        tables = cursor.fetchall()
        if tables:
            print(f"✅ Found audit tables in database:")
            for table in tables:
                print(f"   - {table[0]}")
        else:
            print(f"❌ No audit tables found - RUN: python manage.py migrate audit")
except Exception as e:
    print(f"⚠️  Could not check tables: {e}")

# 4. Check model availability
print("\n4️⃣  CHECKING MODELS")
print("-" * 70)
try:
    from audit.models import AuditEvent
    event_count = AuditEvent.objects.count()
    print(f"✅ AuditEvent model accessible")
    print(f"   Current count: {event_count} events in database")
except Exception as e:
    print(f"❌ Cannot access AuditEvent model: {e}")

# 5. Test logging flow
print("\n5️⃣  TESTING LOGGING FLOW")
print("-" * 70)

# Enable debug logging temporarily
logging.basicConfig(level=logging.DEBUG)
audit_logger = logging.getLogger('audit.utils')
audit_logger.setLevel(logging.DEBUG)

console_handler = logging.StreamHandler()
console_handler.setLevel(logging.DEBUG)
formatter = logging.Formatter('%(levelname)s: %(message)s')
console_handler.setFormatter(formatter)
audit_logger.addHandler(console_handler)

try:
    from audit.utils import log_action
    print("Calling log_action()...\n")
    
    test_user = {
        'user_id': 999,
        'username': 'diagnostic_user',
        'email': 'diag@test.com'
    }
    
    result = log_action(
        user_data=test_user,
        action='other',
        description='Diagnostic test event'
    )
    
    if result:
        print(f"\n✅ log_action() returned event object")
        print(f"   Event ID: {result.id}")
        print(f"   Action: {result.action}")
        print(f"   User: {result.username}")
        print(f"   Timestamp: {result.timestamp}")
    else:
        print(f"\n❌ log_action() returned None")
        
except Exception as e:
    print(f"❌ Exception in log_action(): {e}")
    import traceback
    traceback.print_exc()

# 6. Verify it was saved
print("\n6️⃣  VERIFYING DATABASE SAVE")
print("-" * 70)
try:
    from audit.models import AuditEvent
    latest = AuditEvent.objects.order_by('-timestamp').first()
    if latest and latest.username == 'diagnostic_user':
        print(f"✅ Test event successfully saved to database!")
        print(f"   ID: {latest.id}")
        print(f"   Action: {latest.action}")
        print(f"   User: {latest.username}")
        print(f"   Timestamp: {latest.timestamp}")
    else:
        print(f"⚠️  Test event not found in database")
        print(f"   Latest event: {latest}")
except Exception as e:
    print(f"❌ Error checking database: {e}")

print("\n" + "="*70)
print("DIAGNOSTIC COMPLETE")
print("="*70 + "\n")

print("\n📋 SUMMARY:")
print("-" * 70)
print("""
If you see all ✅ marks above, audit logging should be working.

If you see ❌ marks, check:
1. 'audit' is in INSTALLED_APPS
2. Migrations are run: python manage.py migrate audit
3. No errors in import statements
4. Database connection is working

Next step: Test with actual API calls:
- Create a workflow/task
- Check console logs for 📝 and ✅ messages
- Query database for new AuditEvent records
""")
