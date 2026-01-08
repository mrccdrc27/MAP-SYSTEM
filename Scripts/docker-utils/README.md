# Docker Utility Scripts

Docker versions of the utility scripts for the TTS ecosystem. These scripts execute management commands inside running Docker containers using `docker-compose exec`.

**Available in two versions:**
- **PowerShell** (`.ps1`) - For Windows
- **Bash** (`.sh`) - For Linux/macOS

Both versions provide identical functionality with platform-appropriate syntax.

## Prerequisites

- Docker and Docker Compose must be installed
- Services must be running via `docker-compose up -d` from `tts/Docker/`
- Services must be healthy and ready
- **Important**: Run `deploy_workflows` script after seeding to enable ticket-workflow matching

## Available Scripts

### 1. deploy_workflows
Deploy all workflows to enable ticket-workflow matching. **Run this before seeding tickets!**

**PowerShell Usage:**
```powershell
# Deploy all workflows (except broken test workflow)
.\Scripts\docker-utils\deploy_workflows.ps1

# Include broken workflow for testing
.\Scripts\docker-utils\deploy_workflows.ps1 -IncludeBroken
```

**Bash Usage:**
```bash
# Deploy all workflows (except broken test workflow)
./Scripts/docker-utils/deploy_workflows.sh

# Include broken workflow for testing
./Scripts/docker-utils/deploy_workflows.sh --include-broken
```

**Parameters:**
- `--service SERVICE`: Docker Compose service name (default: "workflow-api")
- `--include-broken`: Include the intentionally broken test workflow

---

### 2. seed_tickets_open
Seed open tickets in the HDTS helpdesk service.

**PowerShell Usage:**
```powershell
# Interactive mode (prompts for count)
.\Scripts\docker-utils\seed_tickets_open.ps1

# With parameters
.\Scripts\docker-utils\seed_tickets_open.ps1 -Count 20

# Use custom service name
.\Scripts\docker-utils\seed_tickets_open.ps1 -Count 10 -Service "helpdesk-service"
```

**Bash Usage:**
```bash
# Interactive mode (prompts for count)
./Scripts/docker-utils/seed_tickets_open.sh

# With parameters
./Scripts/docker-utils/seed_tickets_
Seed tickets with file attachments (PDF, DOCX, XLSX, PNG).

**PowerShell Usage:**
```powershell
# Interactive mode (prompts for all parameters)
.\Scripts\docker-utils\seed_tickets_with_attachments.ps1

# With parameters
.\Scripts\docker-utils\seed_tickets_with_attachments.ps1 -Count 15 -MinAttachments 1 -MaxAttachments 5

# Use custom service name
.\Scripts\docker-utils\seed_tickets_with_attachments.ps1 -Count 10 -Service "helpdesk-service"
```

**Bash Usage:**
```bash
# Interactive mode (prompts for all parameters)
./Scripts/docker-utils/seed_tickets_with_attachments.sh

# With parameters
./Scripts/docker-utils/seed_tickets_with_attachments.sh --count 15 --min-attachments 1 --max-attachments 5

# Use custom service name
./Scripts/docker-utils/seed_tickets_with_attachments.sh --count 10 --service "helpdesk-service"
```

**Parameters:**
- `--count NUM`: Number of tickets to seed (default: 10)
- `--min-attachments NUM`: Minimum attachments per ticket (default: 2)
- `--max-attachments NUM`: Maximum attachments per ticket (default: 4)
- `--service NAME
# With parameters
.\Scripts\docker-utils\seed_tickets_with_attachments.ps1 -Count 15 -MinAttachments 1 -MaxAttachments 5

# Use custom service name
Seed employee records in the Auth service.

**PowerShell Usage:**
```powershell
# Interactive mode (prompts for count)
.\Scripts\docker-utils\seed_employees_auth.ps1

# With parameters
.\Scripts\docker-utils\seed_employees_auth.ps1 -Count 50

# Use custom service name
.\Scripts\docker-utils\seed_employees_auth.ps1 -Count 25 -Service "auth-service"
```

**Bash Usage:**
```bash
# Interactive mode (prompts for count)
./Scripts/docker-utils/seed_employees_auth.sh

# With parameters
./Scripts/docker-utils/seed_employees_auth.sh --count 50

# Use custom service name
./Scripts/docker-utils/seed_employees_auth.sh --count 25 --service "auth-service"
```

**Parameters:**
- `--count NUM`: Number of random employees to seed (default: 0 - seeds only predefined employees)
- `--service NAMEve mode (prompts for count)
.\Scripts\docker-utils\seed_employees_auth.ps1

# With parameters
.\Scripts\docker-utils\see
Seed employee records in the HDTS helpdesk service.

**PowerShell Usage:**
```powershell
# Interactive mode (prompts for count)
.\Scripts\docker-utils\seed_employees_hdts.ps1

# With parameters
.\Scripts\docker-utils\seed_employees_hdts.ps1 -Count 200

# Use custom service name
.\Scripts\docker-utils\seed_employees_hdts.ps1 -Count 150 -Service "helpdesk-service"
```

**Bash Usage:**
```bash
# Interactive mode (prompts for count)
./Scripts/docker-utils/seed_employees_hdts.sh

# With parameters
./Scripts/docker-utils/s
Admin tool to bypass and execute workflow transitions on behalf of users.

**PowerShell Usage:**
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

**Bash Usage:**
```bash
# Interactive mode - will prompt for ticket selection
./Scripts/docker-utils/bypass_transition.sh

# Specific ticket number
./Scripts/docker-utils/bypass_transition.sh TTS-001

# Auto-execute next transition
./Scripts/docker-utils/bypass_transition.sh TTS-001 --auto

# Finalize ticket (skip to end)
./Scripts/docker-utils/bypass_transition.sh TTS-001 --finalize

# Dry run (preview without executing)
./Scripts/docker-utils/bypass_transition.sh TTS-001 --dry-run

# Specific transition ID
./Scripts/docker-utils/bypass_transition.sh TTS-001 --transition-id 5

# With custom notes
./Scripts/docker-utils/bypass_transition.sh TTS-001 --auto --notes "Emergency bypass"

# Use custom service name
./Scripts/docker-utils/bypass_transition.sh --service "workflow-api"
```

**Parameters:**
- `TICKET_NUMBER`: The ticket number to process (positional argument)
- `--auto`: Automatically execute the next available transition
- `--finalize`: Skip to the final state (close ticket)
- `--dry-run`: Preview the transition without executing
- `--transition-id NUM`: Specific transition ID to execute
- `--notes "TEXT"`: Custom notes for the transition (default: "Admin bypass - executed via CLI script")
- `--service NAME
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

**PowerShell:**
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

**Bash:**
```bash
# 1. Seed employees in auth
./Scripts/docker-utils/seed_employees_auth.sh --count 50

# 2. Seed employees in helpdesk
./Scripts/docker-utils/seed_employees_hdts.sh --count 150

# 3. Seed basic tickets
./Scripts/docker-utils/seed_tickets_open.sh --count 30

# 4. Seed tickets with attachments
./Scripts/docker-utils/seed_tickets_with_attachments.sh --count 20 --min-attachments 2 --max-attachments 5
```

### Workflow Management

**PowerShell:**
```powershell
# Preview transition for a ticket
.\Scripts\docker-utils\bypass_transition.ps1 -TicketNumber "TTS-123" -DryRun

# Execute next transition
.\Scripts\docker-utils\bypass_transition.ps1 -TicketNumber "TTS-123" -Auto

# Close ticket immediately
.\Scripts\docker-utils\bypass_transition.ps1 -TicketNumber "TTS-123" -Finalize
```

**Bash:**
```bash
# Preview transition for a ticket
./Scripts/docker-utils/bypass_transition.sh TTS-123 --dry-run

# Execute next transition
./Scripts/docker-utils/bypass_transition.sh TTS-123 --auto

# Close ticket immediately
./Scripts/docker-utils/bypass_transition.sh TTS-123 --f
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
