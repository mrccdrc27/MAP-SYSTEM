# Scripts CLI - Setup & Usage Guide

## Overview

The Capstone Scripts CLI is a Node.js-based script manager that automatically detects and configures your environment on first run.

## Auto-Setup Feature

The CLI now includes an **automatic environment setup** that runs on first launch:

1. **Checks for `.env` file** in `Scripts/cli/`
2. **If missing**, runs the setup script automatically
3. **Detects executables**: bash, python, pm2, powershell
4. **Creates `.env`** with detected paths
5. **Reloads configuration** and continues

### First Run

Simply run:
```powershell
.\Scripts\scripts.cmd
```

Or directly:
```powershell
node Scripts/cli/index.js menu
```

The setup will run automatically if needed.

## Manual Setup

If you want to re-run setup or configure manually:

### PowerShell
```powershell
.\Scripts\cli\setup-env.ps1
```

### Bash / Git Bash
```bash
bash Scripts/cli/setup-env.sh
```

### Direct Node
```bash
node Scripts/cli/setup-env.js
```

## Configuration (`.env`)

The `.env` file is auto-generated in `Scripts/cli/.env`:

```env
BASH_CMD=C:\Program Files\Git\bin\bash.exe
PYTHON_CMD=python
PM2_CMD=pm2
POWERSHELL_CMD=powershell
```

### Override Commands

If your setup is non-standard, edit `.env`:

```env
# Use Python 3.11
PYTHON_CMD=python3.11

# Use custom bash installation
BASH_CMD=C:\custom\bash.exe

# Use local PM2
PM2_CMD=.\node_modules\.bin\pm2
```

## CLI Commands

### Interactive Menu
```powershell
.\Scripts\scripts.cmd
# or
node Scripts/cli/index.js menu
```

### List All Scripts
```powershell
node Scripts/cli/index.js list
```

### Run Specific Script
```powershell
# Simple script
node Scripts/cli/index.js run docker:rabbitmq

# Subcategory script
node Scripts/cli/index.js run services:tts:workflow
```

### Quick Commands
```powershell
node Scripts/cli/index.js start        # Start all with PM2
node Scripts/cli/index.js stop         # Stop all PM2 services
node Scripts/cli/index.js restart      # Restart all PM2 services
node Scripts/cli/index.js seed         # Run migrations and seed
node Scripts/cli/index.js flush        # Flush DBs, migrate, and seed
node Scripts/cli/index.js status       # Show PM2 status
node Scripts/cli/index.js logs         # View PM2 logs
```

## Environment Detection

The setup script detects:

- **Bash**: Git Bash, WSL bash, MSYS2
- **Python**: System python, venv python
- **PM2**: Local or global installation
- **PowerShell**: Windows PowerShell or PowerShell Core

### Detection Order

1. **Common paths** (Git Bash at `C:\Program Files\Git\bin\bash.exe`)
2. **`where` command** (Windows PATH lookup)
3. **`which` command** (POSIX PATH lookup)
4. **Default fallback** (assumes it's in PATH)

## Troubleshooting

### "Command not found"

If you see `Failed to start command: python`:

1. Make sure the tool is installed
2. Re-run setup: `node Scripts/cli/setup-env.js`
3. Or manually edit `.env` with correct path

### Virtual Environment Warning

If you see the venv warning:
```
⚠️  Warning: No Virtual Environment detected.
```

Activate your venv first:
```powershell
.\venv\Scripts\activate
```

### Setup Fails

If auto-setup fails during first run:

1. Run manual setup: `node Scripts/cli/setup-env.js`
2. Check `.env` was created: `cat Scripts/cli/.env`
3. Verify paths are correct

## Files

```
Scripts/cli/
├── index.js              # Main CLI entry point
├── setup-env.js          # Environment detection script
├── setup-env.ps1         # PowerShell wrapper
├── setup-env.sh          # Bash wrapper
├── .env                  # Auto-generated configuration
├── package.json          # Dependencies
└── node_modules/         # Installed packages
```

## Dependencies

```json
{
  "cross-spawn": "^7.x",
  "dotenv": "^16.x",
  "commander": "^11.x",
  "inquirer": "^8.x",
  "chalk": "^5.x"
}
```

Install with: `npm install` in `Scripts/cli/`
