# Failed Notifications System

## Overview

A robust notification queue system that captures and stores failed notification attempts when RabbitMQ/Celery is unavailable. This prevents 500 errors and allows notifications to be retried later.

## Components

### 1. Database Model: `FailedNotification`

**Location:** [task/models.py](c:\work\Capstone 2\Ticket-Tracking-System\workflow_api\task\models.py#L303)

Stores failed notification attempts with:
- User ID, Task ID, Task Title, Role Name
- Status: `pending`, `retrying`, `failed`, `success`
- Error message and retry count tracking
- Timestamps for creation, last retry, and success

### 2. Automatic Capture

**Location:** [task/utils/assignment.py](c:\work\Capstone 2\Ticket-Tracking-System\workflow_api\task\utils\assignment.py#L118)

When `notify_task.delay()` fails (e.g., RabbitMQ down), the system:
- ✅ Catches the exception
- ✅ Stores the notification in `FailedNotification` table
- ✅ Continues processing (no 500 error)
- ✅ Logs the issue with a warning

### 3. Retry Mechanisms

#### A. Management Command
```bash
# Retry all pending notifications
python manage.py retry_failed_notifications

# Retry notifications from last 24 hours only
python manage.py retry_failed_notifications --max-age 24

# Process max 50 notifications
python manage.py retry_failed_notifications --limit 50

# Force retry even if max retries reached
python manage.py retry_failed_notifications --force
```

**Location:** [task/management/commands/retry_failed_notifications.py](c:\work\Capstone 2\Ticket-Tracking-System\workflow_api\task\management\commands\retry_failed_notifications.py)

#### B. REST API Endpoints

**List failed notifications:**
```
GET /tasks/failed-notifications/
GET /tasks/failed-notifications/?status=pending
GET /tasks/failed-notifications/?user_id=123
```

**Retry single notification:**
```
POST /tasks/failed-notifications/{id}/retry/
```

**Retry all pending:**
```
POST /tasks/failed-notifications/retry_all/
```

**Location:** [task/views.py](c:\work\Capstone 2\Ticket-Tracking-System\workflow_api\task\views.py#L1160) - `FailedNotificationViewSet`

#### C. Django Admin Interface

**Location:** Admin at `/admin/task/failednotification/`

Features:
- View all failed notifications
- Filter by status, role, date
- Bulk actions:
  - Retry selected notifications
  - Mark as failed
  - Mark as pending

## Workflow

### When RabbitMQ is Down:

```
User triggers transition
    ↓
Task assigned successfully
    ↓
Notification attempt fails (RabbitMQ unavailable)
    ↓
Exception caught → FailedNotification created
    ↓
✅ HTTP 200 response (not 500!)
```

### When RabbitMQ is Back:

```
Admin runs: python manage.py retry_failed_notifications
    ↓
System queries pending notifications
    ↓
For each notification:
    - Update status to 'retrying'
    - Attempt notify_task.delay()
    - If success → status='success', succeeded_at=now
    - If failed → retry_count++, check max_retries
    ↓
Summary report shows success/failed counts
```

## Database Schema

```sql
CREATE TABLE task_failednotification (
    failed_notification_id INT PRIMARY KEY AUTO_INCREMENT,
    user_id INT NOT NULL,
    task_id VARCHAR(50) NOT NULL,
    task_title VARCHAR(255) NOT NULL,
    role_name VARCHAR(100) NOT NULL,
    status VARCHAR(20) DEFAULT 'pending',
    error_message TEXT,
    retry_count INT DEFAULT 0,
    max_retries INT DEFAULT 3,
    created_at DATETIME NOT NULL,
    last_retry_at DATETIME,
    succeeded_at DATETIME,
    INDEX idx_status_created (status, created_at),
    INDEX idx_user_task (user_id, task_id)
);
```

## Configuration

**Max Retries:** Default is 3 per notification (configurable per record)

**Status Flow:**
- `pending` → New failed notification waiting for retry
- `retrying` → Currently attempting to send
- `success` → Successfully sent
- `failed` → Exceeded max retries or manually marked

## Monitoring

### Check Failed Notifications
```python
from task.models import FailedNotification

# Count by status
FailedNotification.objects.filter(status='pending').count()
FailedNotification.objects.filter(status='failed').count()

# Recent failures
recent = FailedNotification.objects.filter(
    created_at__gte=timezone.now() - timedelta(hours=24)
)
```

### Logs
```
⚠️ Failed to send assignment notification: [WinError 10061] No connection...
✅ Task assignment succeeded, notification queued for retry
```

## Benefits

1. **No More 500 Errors** - System continues working even when RabbitMQ is down
2. **Guaranteed Delivery** - Notifications are never lost, stored for retry
3. **Audit Trail** - Complete history of failed/retried notifications
4. **Multiple Retry Options** - CLI, API, or Admin interface
5. **Automatic Recovery** - When services restore, simply run retry command
6. **Monitoring** - Track notification health via database queries or API

## Scheduled Retry (Optional)

Set up a cron job or scheduled task:

```bash
# Linux crontab - every 15 minutes
*/15 * * * * cd /path/to/workflow_api && python manage.py retry_failed_notifications --max-age 24

# Windows Task Scheduler - similar schedule
```

Or use Celery Beat (when available):
```python
# In celery.py
app.conf.beat_schedule = {
    'retry-failed-notifications': {
        'task': 'task.tasks.retry_failed_notifications',
        'schedule': crontab(minute='*/15'),
    },
}
```

## Testing

```bash
# 1. Stop RabbitMQ
# 2. Trigger a transition: POST /transitions/
# 3. Check FailedNotification table:
python manage.py shell
>>> from task.models import FailedNotification
>>> FailedNotification.objects.all()

# 4. Start RabbitMQ
# 5. Retry notifications:
python manage.py retry_failed_notifications

# 6. Verify success:
>>> FailedNotification.objects.filter(status='success')
```
