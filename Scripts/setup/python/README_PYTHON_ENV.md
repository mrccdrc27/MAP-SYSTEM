# Python Environment Setup Scripts

This directory contains scripts to set up a unified Python virtual environment for all MAP-SYSTEM services.

## Overview

The scripts aggregate and install Python requirements from:
- **auth** (Authentication Service)
- **tts/workflow_api** (Workflow API)
- **tts/messaging** (Messaging Service)
- **tts/notification_service** (Notification Service)
- **hdts/helpdesk** (Helpdesk Service)

## Quick Start

Run the master setup script from the root directory:

```powershell
.\Scripts\setup\setup_python_environment.ps1
```

This will:
1. Create a virtual environment at `.\venv`
2. Aggregate all `requirements.txt` files into `requirements_aggregated.txt`
3. Install all packages into the virtual environment

## Individual Scripts

### 1. Create Virtual Environment

Creates a Python virtual environment at the project root.

```powershell
.\Scripts\setup\create_venv.ps1
```

**Options:**
- `-VenvPath <path>` - Custom path for virtual environment (default: `.\venv`)

**Example:**
```powershell
.\Scripts\setup\create_venv.ps1 -VenvPath .\my_venv
```

### 2. Aggregate Requirements

Aggregates all `requirements.txt` files from the services into a single file.

```powershell
.\Scripts\setup\aggregate_requirements.ps1
```

**Options:**
- `-OutputFile <filename>` - Output filename (default: `requirements_aggregated.txt`)

**Example:**
```powershell
.\Scripts\setup\aggregate_requirements.ps1 -OutputFile all_requirements.txt
```

**Features:**
- Removes duplicate packages
- Detects version conflicts and keeps the first encountered version
- Generates a timestamped header with source information
- Provides detailed console output showing all packages added

### 3. Install Requirements

Installs all packages from the aggregated requirements file.

```powershell
.\Scripts\setup\install_requirements.ps1
```

**Options:**
- `-RequirementsFile <filename>` - Requirements file to install (default: `requirements_aggregated.txt`)
- `-VenvPath <path>` - Virtual environment path (default: `.\venv`)
- `-SkipVenvCheck` - Use system Python instead of virtual environment

**Examples:**
```powershell
# Install into venv
.\Scripts\setup\install_requirements.ps1

# Install into custom venv
.\Scripts\setup\install_requirements.ps1 -VenvPath .\my_venv

# Install with system Python
.\Scripts\setup\install_requirements.ps1 -SkipVenvCheck
```

### 4. Verify Installation

Verifies that all packages were installed correctly and can be imported.

```powershell
.\Scripts\setup\verify_installation.ps1
```

**Options:**
- `-RequirementsFile <filename>` - Requirements file to verify against (default: `requirements_aggregated.txt`)
- `-VenvPath <path>` - Virtual environment path (default: `.\venv`)
- `-Detailed` - Show detailed output for all packages

**Examples:**
```powershell
# Basic verification
.\Scripts\setup\verify_installation.ps1

# Detailed verification
.\Scripts\setup\verify_installation.ps1 -Detailed

# Verify custom venv
.\Scripts\setup\verify_installation.ps1 -VenvPath .\my_venv
```

**Python Version:**
A Python-based verification script is also available:
```powershell
.\venv\Scripts\python.exe .\Scripts\setup\verify_installation.py

# With detailed output
.\venv\Scripts\python.exe .\Scripts\setup\verify_installation.py --detailed
```

**Features:**
- Checks Python and pip versions
- Verifies all required packages are installed
- Detects version mismatches
- Tests imports of critical packages (Django, Celery, etc.)
- Provides detailed diagnostics
- Returns exit code (0=success, 1=has issues)

## Master Setup Script

The master script orchestrates all three steps with options to skip specific steps.

```powershell
.\Scripts\setup\setup_python_environment.ps1
```

**Options:**
- `-VenvPath <path>` - Custom virtual environment path
- `-RequirementsFile <filename>` - Custom output filename
- `-SkipVenv` - Skip virtual environment creation
- `-SkipAggregate` - Skip requirements aggregation
- `-SkipInstall` - Skip requirements installation

**Examples:**
```powershell
# Full setup
.\Scripts\setup\setup_python_environment.ps1

# Only aggregate and install (venv already exists)
.\Scripts\setup\setup_python_environment.ps1 -SkipVenv

# Only install (venv and aggregation already done)
.\Scripts\setup\setup_python_environment.ps1 -SkipVenv -SkipAggregate

# Custom paths
.\Scripts\setup\setup_python_environment.ps1 -VenvPath .\env -RequirementsFile reqs.txt
```

## Workflow

### Initial Setup

```powershell
# Navigate to project root
cd C:\work\Capstone 2\MAP-SYSTEM

# Run master setup
.\Scripts\setup\setup_python_environment.ps1

# Activate virtual environment
.\venv\Scripts\Activate.ps1

# Verify installation
pip list
```

### Updating Dependencies

If any service's `requirements.txt` changes:

```powershell
# Re-aggregate, reinstall, and verify
.\Scripts\setup\aggregate_requirements.ps1
.\Scripts\setup\install_requirements.ps1
.\Scripts\setup\verify_installation.ps1

# Or use master script (skip venv creation)
.\Scripts\setup\setup_python_environment.ps1 -SkipVenv
```

### Verifying Installation

After installation or when troubleshooting:

```powershell
# PowerShell verification
.\Scripts\setup\verify_installation.ps1 -Detailed

# Python verification (more detailed)
.\venv\Scripts\python.exe .\Scripts\setup\verify_installation.py --detailed

**Package verification failures:**
```powershell
# Run detailed verification to see which packages are problematic
.\Scripts\setup\verify_installation.ps1 -Detailed

# Try reinstalling specific packages
.\venv\Scripts\pip.exe install --upgrade package-name
```

**Import errors for critical packages:**
Some packages require additional system dependencies. Check the package documentation for your OS.
```

### Troubleshooting

**Virtual environment corrupted:**
```powershell
# Delete and recreate
Remove-Item -Recurse -Force .\venv
.\Scripts\setup\create_venv.ps1
```

**Version conflicts:**
Check the console output during aggregation. The script will report conflicts and which version was kept.

**Installation failures:**
- Ensure you have the required system dependencies (e.g., build tools for compiled packages)
- Check if you're behind a proxy and configure pip accordingly
- Try installing problematic packages individually

## Services Included

| Service | Path | Purpose |
|---------|------|---------|
| auth | `auth/requirements.txt` | Authentication & authorization |
| workflow_api | `tts/workflow_api/requirements.txt` | Workflow orchestration |
| messaging | `tts/messaging/requirements.txt` | Real-time messaging |
| notification_service | `tts/notification_service/requirements.txt` | Notification delivery |
| helpdesk | `hdts/helpdesk/requirements.txt` | Helpdesk ticket management |

## Output Files

- **requirements_aggregated.txt** - Generated at project root, contains all unique packages
- **venv/** - Virtual environment directory (gitignored)

## Requirements

- Python 3.8 or higher
- PowerShell 5.1 or higher (Windows)
- Internet connection for pip downloads

## Notes

- The scripts are designed for Windows/PowerShell
- Version conflicts are resolved by keeping the first encountered version
- The aggregation script prefers exact versions (`==`) over ranges (`>=`, etc.)
- All scripts can be run from any directory; they automatically navigate to project root
