import django
import os
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'workflow_api.settings')
django.setup()

from task.models import Task
tasks = Task.objects.order_by('-task_id')[:10]
print(f"{'Task ID':<10} | {'Submit Date':<15} | {'Target Res':<15}")
print("-" * 45)
for t in tasks:
    submit = t.ticket_id.ticket_data.get('submit_date', 'N/A')[:10]
    target = str(t.target_resolution)[:10] if t.target_resolution else 'N/A'
    print(f"{t.task_id:<10} | {submit:<15} | {target:<15}")
