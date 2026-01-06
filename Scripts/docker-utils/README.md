# Docker Utility Scripts

Docker versions of the utility scripts for the TTS ecosystem. These scripts execute management commands inside running Docker containers using `docker-compose exec`.

## Prerequisites

- Docker and Docker Compose must be installed
- Services must be running via `docker-compose up -d` from `tts/Docker/`
- Services must be healthy and ready
- **Important**: Run `deploy_workflows.ps1` after seeding to enable ticket-workflow matching

## Available Scripts

### 1. deploy_workflows.ps1
Deploy all workflows to enable ticket-workflow matching. **Run this before seeding tickets!**

**Usage:**
```powershell
# Deploy all workflows (except broken test workflow)
.\Scripts\docker-utils\deploy_workflows.ps1

# Include broken workflow for testing
.\Scripts\docker-utils\deploy_workflows.ps1 -IncludeBroken
```

**Parameters:**
- `-Service`: Docker Compose service name (default: "workflow-api")
- `-IncludeBroken`: Include the intentionally broken test workflow

---

### 2. seed_tickets_open.ps1
Seed open tickets in the HDTS helpdesk service.

**Usage:**
```powershell
# Interactive mode (prompts for count)
.\Scripts\docker-utils\seed_tickets_open.ps1

# With parameters
.\Scripts\docker-utils\seed_tickets_open.ps1 -Count 20

# Use custom service name
.\Scripts\docker-utils\seed_tickets_open.ps1 -Count 10 -Service "helpdesk-service"
```

**Parameters:**
- `-Count`: Number of tickets to seed (default: 10)
- `-Service`: Docker Compose service name (default: "helpdesk-service")

---

### 3. seed_tickets_with_attachments.ps1
Seed tickets with file attachments (PDF, DOCX, XLSX, PNG).

**Usage:**
```powershell
# Interactive mode (prompts for all parameters)
.\Scripts\docker-utils\seed_tickets_with_attachments.ps1

# With parameters
.\Scripts\docker-utils\seed_tickets_with_attachments.ps1 -Count 15 -MinAttachments 1 -MaxAttachments 5

# Use custom service name
.\Scripts\docker-utils\seed_tickets_with_attachments.ps1 -Count 10 -Service "helpdesk-service"
```

**Parameters:**
- `-Count`: Number of tickets to seed (default: 10)
- `-MinAttachments`: Minimum attachments per ticket (default: 2)
- `-MaxAttachments`: Maximum attachments per ticket (default: 4)
- `-Service`: Docker Compose service name (default: "helpdesk-service")

---

### 4. seed_employees_auth.ps1
Seed employee records in the Auth service.

**Usage:**
```powershell
# Interactive mode (prompts for count)
.\Scripts\docker-utils\seed_employees_auth.ps1

# With parameters
.\Scripts\docker-utils\seed_employees_auth.ps1 -Count 50

# Use custom service name
.\Scripts\docker-utils\seed_employees_auth.ps1 -Count 25 -Service "auth-service"
```

**Parameters:**
- `-Count`: Number of random employees to seed (default: 0 - seeds only predefined employees)
- `-Service`: Docker Compose service name (default: "auth-service")

---

### 5. seed_employees_hdts.ps1
Seed employee records in the HDTS helpdesk service.

**Usage:**
```powershell
# Interactive mode (prompts for count)
.\Scripts\docker-utils\seed_employees_hdts.ps1

# With parameters
.\Scripts\docker-utils\seed_employees_hdts.ps1 -Count 200

# Use custom service name
.\Scripts\docker-utils\seed_employees_hdts.ps1 -Count 150 -Service "helpdesk-service"
```

**Parameters:**
- `-Count`: Number of employees to seed (default: 150)
- `-Service`: Docker Compose service name (default: "helpdesk-service")

---

### 6. bypass_transition.ps1
Admin tool to bypass and execute workflow transitions on behalf of users.

**Usage:**
```powershell
# Interactive mode - will prompt for ticket selection
.\Scripts\docker-utils\bypass_transition.ps1

# Specific ticket number
.\Scripts\docker-utils\bypass_transition.ps1 -TicketNumber "TTS-001"

# Auto-execute next transition
.\Scripts\docker-utils\bypass_transition.ps1 -TicketNumber "TTS-001" -Auto

# Finalize ticket (skip to end)
.\Scripts\docker-utils\bypass_transition.ps1 -TicketNumber "TTS-001" -Finalize

# Dry run (preview without executing)
.\Scripts\docker-utils\bypass_transition.ps1 -TicketNumber "TTS-001" -DryRun

# Specific transition ID
.\Scripts\docker-utils\bypass_transition.ps1 -TicketNumber "TTS-001" -TransitionId 5

# With custom notes
.\Scripts\docker-utils\bypass_transition.ps1 -TicketNumber "TTS-001" -Auto -Notes "Emergency bypass"

# Use custom service name
.\Scripts\docker-utils\bypass_transition.ps1 -Service "workflow-api"
```

**Parameters:**
- `-TicketNumber`: The ticket number to process
- `-Auto`: Automatically execute the next available transition
- `-Finalize`: Skip to the final state (close ticket)
- `-DryRun`: Preview the transition without executing
- `-TransitionId`: Specific transition ID to execute
- `-Notes`: Custom notes for the transition (default: "Admin bypass - executed via CLI script")
- `-Service`: Docker Compose service name (default: "workflow-api")

---

## How It Works

These scripts use `docker-compose exec` to run commands inside the appropriate service containers. The scripts automatically:

1. Locate the `docker-compose.yml` file at `tts/Docker/docker-compose.yml`
2. Check if the target service is running
3. Execute the Django management command inside the container

## Service Names

Default service names used by these scripts (as defined in docker-compose.yml):
- **Auth Service**: `auth-service`
- **Helpdesk Service**: `helpdesk-service`  
- **Workflow API**: `workflow-api`

Check running services:
```powershell
cd tts/Docker
docker-compose ps
```

## Common Issues

### Service Not Running
```
ERROR: Service 'helpdesk-service' is not running.
```
**Solution**: Start Docker services with `docker-compose up -d` in the `tts/Docker/` directory

### Docker Compose File Not Found
```
ERROR: Docker Compose file not found
```
**Solution**: Run scripts from the workspace root (`MAP-SYSTEM/`) directory

### Permission Denied
```
docker: permission denied
```
**Solution**: Run PowerShell as Administrator or ensure your user is in the `docker-users` group

## Examples

### Complete Seeding Workflow
```powershell
# 1. Seed employees in auth
.\Scripts\docker-utils\seed_employees_auth.ps1 -Count 50

# 2. Seed employees in helpdesk
.\Scripts\docker-utils\seed_employees_hdts.ps1 -Count 150

# 3. Seed basic tickets
.\Scripts\docker-utils\seed_tickets_open.ps1 -Count 30

# 4. Seed tickets with attachments
.\Scripts\docker-utils\seed_tickets_with_attachments.ps1 -Count 20 -MinAttachments 2 -MaxAttachments 5
```

### Workflow Management
```powershell
# Preview transition for a ticket
.\Scripts\docker-utils\bypass_transition.ps1 -TicketNumber "TTS-123" -DryRun

# Execute next transition
.\Scripts\docker-utils\bypass_transition.ps1 -TicketNumber "TTS-123" -Auto

# Close ticket immediately
.\Scripts\docker-utils\bypass_transition.ps1 -TicketNumber "TTS-123" -Finalize
```

## Notes

- All scripts include interactive prompts if parameters are not provided
- Container health checks are performed before executing commands
- Exit codes are preserved from the Docker container execution
- Media files (attachments) are stored in Docker volumes and persist across container restarts
