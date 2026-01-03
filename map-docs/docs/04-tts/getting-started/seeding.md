---
title: Seeding Data
sidebar_label: Seeding
sidebar_position: 3
---

# Seeding Data

TTS provides management commands to populate the database with sample data for testing and development.

## Available Seeders

| Command | Service | Description |
|---------|---------|-------------|
| `seed_workflows2` | Workflow API | Sample workflows with steps |
| `seed_role` | Workflow API | Default roles |
| `seed_tickets` | Ticket Service | Sample tickets |

## Seeding Workflows

### Command

```bash
cd tts/workflow_api
python manage.py seed_workflows2
```

### Created Workflows

The seeder creates these sample workflows:

#### 1. Asset Check-in

```
Department: IT
Category: Asset Management
Subcategory: Check-in

Steps:
├── Receive Asset (Agent) ─── weight: 0.2
├── Inspect Asset (Technician) ─── weight: 0.5
└── Update Inventory (Agent) ─── weight: 0.3

SLAs:
├── Low: 72 hours
├── Medium: 48 hours
├── High: 24 hours
└── Urgent: 4 hours
```

#### 2. Asset Check-out

```
Department: IT
Category: Asset Management
Subcategory: Check-out

Steps:
├── Verify Request (Agent) ─── weight: 0.3
├── Prepare Asset (Technician) ─── weight: 0.4
└── Deliver Asset (Agent) ─── weight: 0.3
```

#### 3. Budget Proposal

```
Department: Finance
Category: Budget
Subcategory: Proposal

Steps:
├── Review Proposal (Analyst) ─── weight: 0.3
├── Manager Approval (Manager) ─── weight: 0.4
└── Finance Approval (Finance Admin) ─── weight: 0.3
```

#### 4. IT Support Request

```
Department: IT
Category: Technology
Subcategory: Support

Steps:
├── Triage (Agent) ─── weight: 0.2
├── Diagnose (Technician) ─── weight: 0.3
├── Resolve (Technician) ─── weight: 0.3
└── Verify (Agent) ─── weight: 0.2
```

### Force Reseed

To clear and recreate workflows:

```bash
python manage.py seed_workflows2 --force
```

## Seeding Roles

### Command

```bash
cd tts/workflow_api
python manage.py seed_role
```

### Created Roles

| Role | Description |
|------|-------------|
| Admin | Full system access |
| Agent | First-line support |
| Technician | Technical specialist |
| Manager | Team manager |
| Ticket Coordinator | Ticket ownership |
| Analyst | Reporting and analysis |
| Finance Admin | Finance approval |

## Seeding Tickets

### Command

```bash
cd tts/ticket_service
python manage.py seed_tickets
```

### Options

```bash
# Seed specific count
python manage.py seed_tickets --count 50

# Force reseed (clear existing)
python manage.py seed_tickets --force
```

### Created Tickets

The seeder creates tickets with:
- Various priorities (Low, Medium, High, Critical)
- Different categories and departments
- Sample employee information
- Realistic subjects and descriptions

### Example Ticket

```json
{
  "ticket_id": "TX20240115123456",
  "subject": "Laptop not turning on",
  "description": "My laptop shows no signs of power when I press the button",
  "category": "Technology",
  "subcategory": "Hardware",
  "department": "IT",
  "priority": "High",
  "status": "New",
  "employee": {
    "id": 101,
    "name": "John Smith",
    "email": "john.smith@company.com"
  }
}
```

## Seeding Complete System

### Script

For a complete seed, run in order:

```bash
#!/bin/bash

# 1. Seed Roles (Workflow API)
cd tts/workflow_api
python manage.py seed_role
echo "✓ Roles seeded"

# 2. Seed Workflows
python manage.py seed_workflows2
echo "✓ Workflows seeded"

# 3. Seed Tickets (Ticket Service)
cd ../ticket_service
python manage.py seed_tickets
echo "✓ Tickets seeded"

echo "✓ All seeding complete!"
```

### PowerShell (Windows)

```powershell
# seed_all.ps1

# Seed Roles
Set-Location tts/workflow_api
python manage.py seed_role
Write-Host "✓ Roles seeded" -ForegroundColor Green

# Seed Workflows
python manage.py seed_workflows2
Write-Host "✓ Workflows seeded" -ForegroundColor Green

# Seed Tickets
Set-Location ../ticket_service
python manage.py seed_tickets
Write-Host "✓ Tickets seeded" -ForegroundColor Green

Write-Host "✓ All seeding complete!" -ForegroundColor Green
```

## Verifying Seeded Data

### Check Workflows

```bash
python manage.py shell

>>> from workflow.models import Workflows
>>> Workflows.objects.count()
4
>>> for w in Workflows.objects.all():
...     print(f"{w.name} ({w.status})")
Asset Check-in (initialized)
Asset Check-out (initialized)
Budget Proposal (initialized)
IT Support Request (initialized)
```

### Check Roles

```bash
>>> from role.models import Roles
>>> list(Roles.objects.values_list('name', flat=True))
['Admin', 'Agent', 'Technician', 'Manager', 'Ticket Coordinator', 'Analyst', 'Finance Admin']
```

### Check via API

```bash
# List workflows
curl http://localhost:8002/workflows/

# List roles
curl http://localhost:8002/roles/

# List tickets
curl http://localhost:8004/tickets/
```

## Troubleshooting

### "Workflow already exists"

Use `--force` flag to clear and reseed:

```bash
python manage.py seed_workflows2 --force
```

### "Role not found" during workflow seeding

Seed roles first:

```bash
python manage.py seed_role
python manage.py seed_workflows2
```

### Database errors

Ensure migrations are applied:

```bash
python manage.py migrate
python manage.py seed_workflows2
```
