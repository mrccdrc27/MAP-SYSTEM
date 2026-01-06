# Docker Utils - Quick Reference

Quick reference for Docker utility scripts. These scripts execute Django management commands inside running Docker containers.

## Prerequisites

Start Docker services first:
```powershell
cd tts/Docker
docker-compose up -d
```

## CLI Usage (Recommended)

### Interactive Menu
```powershell
.\Scripts\scripts.cmd
# Select: Docker Utils → Choose script
```

### Direct Execution
```powershell
# Seed tickets
node Scripts/cli/index.js run docker-utils:seed-tickets

# Seed tickets with attachments  
node Scripts/cli/index.js run docker-utils:seed-tickets-attachments

# Seed employees in Auth
node Scripts/cli/index.js run docker-utils:seed-employees-auth

# Seed employees in HDTS
node Scripts/cli/index.js run docker-utils:seed-employees-hdts

# Bypass workflow transition
node Scripts/cli/index.js run docker-utils:bypass-transition
```

## Direct Script Usage

### Seed Open Tickets
```powershell
# Interactive
.\Scripts\docker-utils\seed_tickets_open.ps1

# With parameters
.\Scripts\docker-utils\seed_tickets_open.ps1 -Count 20 -Container "helpdesk-service"
```

### Seed Tickets with Attachments
```powershell
# Interactive
.\Scripts\docker-utils\seed_tickets_with_attachments.ps1

# With parameters
.\Scripts\docker-utils\seed_tickets_with_attachments.ps1 -Count 15 -MinAttachments 1 -MaxAttachments 5
```

### Seed Employees (Auth)
```powershell
# Interactive
.\Scripts\docker-utils\seed_employees_auth.ps1

# With parameters (0 = only predefined employees)
.\Scripts\docker-utils\seed_employees_auth.ps1 -Count 50
```

### Seed Employees (HDTS)
```powershell
# Interactive
.\Scripts\docker-utils\seed_employees_hdts.ps1

# With parameters
.\Scripts\docker-utils\seed_employees_hdts.ps1 -Count 150
```

### Bypass Transition
```powershell
# Interactive ticket selection
.\Scripts\docker-utils\bypass_transition.ps1

# Specific ticket
.\Scripts\docker-utils\bypass_transition.ps1 -TicketNumber "TTS-001"

# Auto-execute next transition
.\Scripts\docker-utils\bypass_transition.ps1 -TicketNumber "TTS-001" -Auto

# Close ticket immediately
.\Scripts\docker-utils\bypass_transition.ps1 -TicketNumber "TTS-001" -Finalize
```

## Complete Workflow Example

```powershell
# 1. Start Docker services
cd tts/Docker
docker-compose up -d

# 2. Wait for services to be ready (check logs)
docker-compose logs -f

# 3. Run seeding via CLI
node Scripts/cli/index.js run docker-utils:seed-employees-auth
node Scripts/cli/index.js run docker-utils:seed-employees-hdts
node Scripts/cli/index.js run docker-utils:seed-tickets
node Scripts/cli/index.js run docker-utils:seed-tickets-attachments

# 4. Manage workflows
node Scripts/cli/index.js run docker-utils:bypass-transition
```

## Troubleshooting

### Container not running
```
ERROR: Container 'helpdesk-service' is not running.
```
**Fix**: Start Docker services: `docker-compose up -d`

### Check running containers
```powershell
docker ps --format "table {{.Names}}\t{{.Status}}"
```

### View container logs
```powershell
docker logs helpdesk-service
docker logs auth-service
docker logs workflow-api
```

## Container Names

Default containers:
- `auth-service` - Auth and user management
- `helpdesk-service` - HDTS helpdesk backend
- `workflow-api` - Workflow orchestration
- `notification-service` - Notifications
- `messaging-service` - Messaging and comments

## See Also

- [Full Documentation](README.md)
- [Local Utils](../utils/) - Non-Docker versions
- [Docker Compose Config](../../tts/Docker/docker-compose.yml)
