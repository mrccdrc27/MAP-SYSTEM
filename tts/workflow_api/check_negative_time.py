import os
import django
import sys
from django.db.models import F, Count

# Setup Django environment
sys.path.append(os.getcwd())
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'workflow_api.settings')
django.setup()

from task.models import TaskItem

def check_negative_time():
    print("Checking for TaskItems with acted_on < assigned_on...")
    
    # Filter items where acted_on is earlier than assigned_on
    negative_items = TaskItem.objects.filter(
        acted_on__lt=F('assigned_on'),
        acted_on__isnull=False,
        assigned_on__isnull=False
    )
    
    count = negative_items.count()
    print(f"Found {count} items with negative time to action.")
    
    if count > 0:
        print("\nSample items:")
        for item in negative_items[:5]:
            print(f"ID: {item.task_item_id}")
            print(f"  Assigned: {item.assigned_on}")
            print(f"  Acted:    {item.acted_on}")
            delta = item.acted_on - item.assigned_on
            print(f"  Delta:    {delta}")
            print("-" * 30)

if __name__ == '__main__':
    check_negative_time()
