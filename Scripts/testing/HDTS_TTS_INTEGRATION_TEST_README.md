# HDTS-TTS Integration Test

This test validates the end-to-end integration between **HDTS** (Helpdesk Ticket System) and **TTS** (Ticket Tracking System / workflow_api).

## Overview

The integration test verifies:

1. **Service Health** - All required services are running
2. **Ticket Creation** - HDTS can create tickets that trigger workflow processing
3. **Task Creation** - TTS (workflow_api) receives tickets and creates tasks via Celery
4. **Workflow Resolution** - Tasks can be progressed through workflow steps
5. **Status Sync** - Status changes in TTS sync back to HDTS

## Architecture

```
┌─────────────────┐    Celery Queue     ┌─────────────────────┐
│     HDTS        │ ─────────────────▶  │   TTS workflow_api  │
│   (Helpdesk)    │  TICKET_TASKS_      │                     │
│                 │  PRODUCTION         │                     │
│  Ticket.save()  │                     │  receive_ticket()   │
│     ↓           │                     │       ↓             │
│  post_save      │                     │  create_task()      │
│  signal         │                     │       ↓             │
└─────────────────┘                     │  Task + TaskItem    │
        ↑                               └──────────┬──────────┘
        │                                          │
        │         Celery Queue                     │
        │      ticket_status-default               │
        └──────────────────────────────────────────┘
                  send_ticket_status()
```

## Prerequisites

### 1. Services Running

Start all services using PM2:

```powershell
pm2 start Scripts/processes/tts-ecosystem.config.js
```

Required services:
- `auth-service` (port 8003)
- `workflow-api` (port 8002)
- `helpdesk-backend` (port 8000)
- `notification-service` (port 8006)
- `messaging-service` (port 8005)
- `workflow-worker` (Celery worker for TTS)
- `helpdesk-worker` (Celery worker for HDTS)

### 2. RabbitMQ Running

```powershell
# Start RabbitMQ (if using Docker)
docker start rabbitmq
```

### 3. Databases Seeded

```powershell
# Seed HDTS
cd hdts/helpdesk
python manage.py seed_employees

# Seed TTS workflows
cd tts/workflow_api
python manage.py seed_workflows2
```

## Usage

### Python Script

```powershell
# Basic run
python Scripts/testing/test_hdts_tts_integration.py

# With verbose output
python Scripts/testing/test_hdts_tts_integration.py --verbose

# Dry run (no changes)
python Scripts/testing/test_hdts_tts_integration.py --dry-run

# Custom options
python Scripts/testing/test_hdts_tts_integration.py \
    --target-status "In Progress" \
    --category "Asset Check In" \
    --department "Asset Department" \
    --verbose
```

### PowerShell Wrapper

```powershell
# Basic run
.\Scripts\testing\test_hdts_tts_integration.ps1

# With options
.\Scripts\testing\test_hdts_tts_integration.ps1 -TargetStatus InProgress -VerboseOutput

# Dry run
.\Scripts\testing\test_hdts_tts_integration.ps1 -DryRun
```

## Command-Line Options

| Option | Default | Description |
|--------|---------|-------------|
| `--auth-url` | http://localhost:8003 | Auth service URL |
| `--workflow-url` | http://localhost:8002 | Workflow API URL |
| `--hdts-url` | http://localhost:8000 | HDTS backend URL |
| `--target-status` | Resolved | Target ticket status: 'In Progress' or 'Resolved' |
| `--wait-timeout` | 30 | Max seconds to wait for task creation |
| `--poll-interval` | 2 | Seconds between status polls |
| `--category` | IT Support | Ticket category |
| `--department` | IT Department | Ticket department |
| `--verbose` | - | Enable verbose output |
| `--skip-health-check` | - | Skip service health check |
| `--dry-run` | - | Show flow without making changes |

## Management Commands

### HDTS Commands (hdts/helpdesk)

```bash
# Create a test ticket
python manage.py create_test_ticket --test-id TEST123 --status Open

# Update ticket status
python manage.py update_ticket_status HDTS-XXXXXX Open

# Get ticket status
python manage.py get_ticket_status HDTS-XXXXXX --json
```

### TTS Commands (tts/workflow_api)

```bash
# Get task status for a ticket
python manage.py get_task_status HDTS-XXXXXX

# Resolve a ticket through workflow
python manage.py resolve_ticket HDTS-XXXXXX --target-status Resolved

# Dry run resolution
python manage.py resolve_ticket HDTS-XXXXXX --dry-run
```

## Test Flow Details

### Step 1: Service Health Check

Validates HTTP connectivity to:
- Auth Service (8003)
- Workflow API (8002)
- HDTS Backend (8000)
- Notification Service (8006)
- Messaging Service (8005)

### Step 2: Create Test Ticket

Creates a ticket in HDTS with:
- Unique test ID (e.g., `INT-ABC12345`)
- Status: `Open` (triggers workflow signal)
- Category/Department matching a seeded workflow

The `post_save` signal on HDTS Ticket enqueues a Celery task to `TICKET_TASKS_PRODUCTION` queue.

### Step 3: Wait for Task Creation

Polls TTS `get_task_status` command until:
- Task is found, OR
- Timeout reached (default 30s)

The Celery worker (`workflow-worker`) processes the queue and:
1. Creates `WorkflowTicket` record
2. Matches ticket to a `Workflow`
3. Creates `Task` and `TaskItem` records

### Step 4: Resolve Ticket

Uses `resolve_ticket` command to:
1. Find active `TaskItem`
2. Progress through workflow steps
3. Create `TaskItemHistory` records
4. Update `WorkflowTicket.ticket_data.status`

### Step 5: Verify Sync

The `WorkflowTicket.save()` method triggers `send_ticket_status` Celery task when status changes.

HDTS worker processes `ticket_status-default` queue and updates local ticket.

Test polls HDTS `get_ticket_status` to verify sync.

## Troubleshooting

### Task Not Created

1. Check Celery worker is running:
   ```powershell
   pm2 logs workflow-worker
   ```

2. Check RabbitMQ queues:
   ```
   http://localhost:15672 (admin/admin)
   ```

3. Verify workflow exists:
   ```bash
   cd tts/workflow_api
   python manage.py shell -c "from workflow.models import Workflows; print(Workflows.objects.all())"
   ```

### Sync Not Working

1. Check HDTS worker:
   ```powershell
   pm2 logs helpdesk-worker
   ```

2. Check queue routing in settings:
   - TTS: `CELERY_TASK_ROUTES` in `workflow_api/settings.py`
   - HDTS: `CELERY_TASK_ROUTES` in `backend/settings.py`

### Workflow Mismatch

The test uses IT Support category by default. Ensure a matching workflow exists:

```python
# Check deployed workflows
from workflow.models import Workflows
Workflows.objects.filter(status='deployed', category='IT Support')
```

## Exit Codes

| Code | Meaning |
|------|---------|
| 0 | All tests passed |
| 1 | One or more tests failed |

## Files Created

| File | Description |
|------|-------------|
| `Scripts/testing/test_hdts_tts_integration.py` | Main Python test script |
| `Scripts/testing/test_hdts_tts_integration.ps1` | PowerShell wrapper |
| `hdts/helpdesk/core/management/commands/create_test_ticket.py` | HDTS ticket creation command |
| `hdts/helpdesk/core/management/commands/update_ticket_status.py` | HDTS status update command |
| `hdts/helpdesk/core/management/commands/get_ticket_status.py` | HDTS status query command |
| `tts/workflow_api/task/management/commands/get_task_status.py` | TTS task status command |
| `tts/workflow_api/task/management/commands/resolve_ticket.py` | TTS ticket resolution command |
