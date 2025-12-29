# TTS Scripts Directory

This directory contains all scripts for managing the Ticket Tracking System.

## 📁 Directory Structure

```
Scripts/
├── cli/              # Node.js CLI manager
│   ├── index.js      # CLI entry point
│   └── package.json  # CLI dependencies
├── docker/           # Docker-related scripts
│   ├── docker.sh     # Docker Compose setup (with integrated dos2unix)
│   └── start_rabbitmq.ps1
├── services/         # Individual service startup scripts
│   ├── start_auth.ps1        # Shared auth service
│   ├── tts/                  # TTS system services
│   │   ├── start_frontend.ps1
│   │   ├── start_messaging.ps1
│   │   ├── start_notification.ps1
│   │   ├── start_notification_worker.ps1
│   │   ├── start_ticket.ps1
│   │   ├── start_workflow.ps1
│   │   └── start_workflow_worker.ps1
│   └── hdts/                 # HDTS system services
│       ├── start_helpdesk_backend.ps1
│       ├── start_helpdesk_backend_worker.ps1
│       └── start_helpdesk_frontend.ps1
├── setup/            # Setup and seeding scripts
│   ├── restart_all_services.ps1  # Main setup script
│   ├── seed_workflow_helpdesk.ps1
│   ├── setup_and_test_ams.ps1
│   ├── init.sh
│   ├── reset.sh
│   └── env.sh
├── testing/          # Test scripts
│   ├── test_ams_api.py
│   ├── test_bms_api.py
│   └── test_bms_api.ps1
├── utils/            # Utility scripts
│   └── delete_migrations_workflow_api.sh
├── ecosystem.config.js  # PM2 ecosystem configuration
├── scripts.cmd          # Windows CLI launcher
└── scripts.txt          # Quick reference scripts list
```

## 🚀 CLI Manager

The TTS CLI provides an easy way to run any script.

### Installation

```bash
cd Scripts/cli
npm install
```

### Usage

**Interactive Menu:**
```bash
node Scripts/cli/index.js
# or
.\Scripts\scripts.cmd
```

**List all scripts:**
```bash
node Scripts/cli/index.js list
```

**Run a specific script:**
```bash
node Scripts/cli/index.js run services:auth
node Scripts/cli/index.js run pm2:start-all
node Scripts/cli/index.js run setup:migrate-seed
```

**Quick Commands:**
```bash
node Scripts/cli/index.js start      # Start all with PM2
node Scripts/cli/index.js stop       # Stop all PM2 services
node Scripts/cli/index.js restart    # Restart all PM2 services
node Scripts/cli/index.js status     # Show PM2 status
node Scripts/cli/index.js logs       # View PM2 logs
node Scripts/cli/index.js seed       # Run migrations and seed
node Scripts/cli/index.js flush      # Flush DBs, migrate, and seed
```

## 📋 Script Categories

| Category | Description |
|----------|-------------|
| `services` | Start individual backend services and workers |
| `docker` | Docker-related commands (RabbitMQ, Docker Compose) |
| `setup` | Database migrations, seeding, and project setup |
| `testing` | API and integration tests |
| `utils` | Utility scripts (migrations cleanup, line endings) |
| `pm2` | PM2 process manager commands |

## 🔧 Common Workflows

### Fresh Development Setup
```bash
# 1. Start RabbitMQ
node Scripts/cli/index.js run docker:rabbitmq

# 2. Flush databases, migrate, and seed
node Scripts/cli/index.js flush

# 3. Start all services with PM2
node Scripts/cli/index.js start
# Note: This reads from Scripts/ecosystem.config.js

# 4. Check status
node Scripts/cli/index.js status
```

### Daily Development
```bash
# Start everything
node Scripts/cli/index.js start

# View logs
node Scripts/cli/index.js logs

# Restart a specific service
pm2 restart auth-service
```
