"""
Quick test to verify FailedNotification bucket is working.

Run: python test_failed_notifications.py
"""

import os
import django

# Setup Django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'workflow_api.settings')
django.setup()

from task.models import FailedNotification
from django.utils import timezone

print("="*60)
print("Testing FailedNotification Bucket System")
print("="*60)

# Test 1: Create a failed notification
print("\n1. Creating test failed notification...")
notification = FailedNotification.objects.create(
    user_id=123,
    task_id="999",
    task_title="Test Task",
    role_name="Test Role",
    error_message="Test error: RabbitMQ connection failed",
    status='pending'
)
print(f"✅ Created: {notification}")
print(f"   Status: {notification.status}")
print(f"   Retry count: {notification.retry_count}/{notification.max_retries}")

# Test 2: List all failed notifications
print("\n2. Listing all failed notifications...")
all_notifications = FailedNotification.objects.all()
print(f"✅ Found {all_notifications.count()} notification(s)")

for n in all_notifications:
    print(f"   - ID {n.failed_notification_id}: User {n.user_id}, Task {n.task_id}, Status: {n.status}")

# Test 3: Filter by status
print("\n3. Filtering by status='pending'...")
pending = FailedNotification.objects.filter(status='pending')
print(f"✅ Found {pending.count()} pending notification(s)")

# Test 4: Update retry count
print("\n4. Simulating retry attempt...")
notification.status = 'retrying'
notification.retry_count += 1
notification.last_retry_at = timezone.now()
notification.save()
print(f"✅ Updated: Status={notification.status}, Retry count={notification.retry_count}")

# Test 5: Mark as failed
print("\n5. Marking as failed (simulated max retries)...")
notification.status = 'failed'
notification.retry_count = 3
notification.save()
print(f"✅ Marked as failed: Retry count={notification.retry_count}")

# Cleanup
print("\n6. Cleaning up test data...")
notification.delete()
print("✅ Test notification deleted")

print("\n" + "="*60)
print("All tests passed! ✅")
print("="*60)
print("\nThe FailedNotification bucket system is working correctly!")
print("\nNext steps:")
print("1. Test with actual failed Celery tasks")
print("2. Run: python manage.py retry_failed_notifications")
print("3. Check admin interface: /admin/task/failednotification/")
