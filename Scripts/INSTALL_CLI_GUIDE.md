# CLI Installation Guide

This guide explains how to install the `scripts` CLI so you can run commands from anywhere in your system.

## Quick Start

### Windows (PowerShell)

```powershell
# Navigate to Scripts directory
cd Scripts

# Run installer
.\install-cli.ps1

# Follow the prompts to choose installation method
```

**or directly:**

```powershell
powershell -ExecutionPolicy Bypass -File "C:\Path\To\Scripts\install-cli.ps1"
```

### Linux/macOS (Bash)

```bash
# Navigate to Scripts directory
cd Scripts

# Run installer
bash install-cli.sh

# Follow the prompts
```

**or directly:**

```bash
bash /path/to/Scripts/install-cli.sh
```

---

## Installation Methods

### Option 1: Add to PATH (Recommended for Everyone)

**Windows:**
- Adds `Scripts` folder to your USER environment PATH
- Requires: PowerShell with admin privileges
- Effect: System-wide access to `scripts` command
- Permanent: Yes (persists after restart)

**Linux/macOS:**
- Adds `Scripts` folder to PATH in shell profiles (`.bashrc`, `.zshrc`, etc.)
- Requires: No sudo if using shell profiles
- Effect: Works in new terminal sessions
- Permanent: Yes (persists after restart)

### Option 2: Batch Wrapper (Windows Only)

- Creates `scripts.bat` in `%APPDATA%\Scripts`
- Adds that folder to PATH automatically
- Requires: No admin privileges
- Effect: System-wide access
- Permanent: Yes

### Option 3: Symlink (Linux/macOS)

- Creates symlink at `/usr/local/bin/scripts`
- Requires: `sudo` password
- Effect: Immediate system-wide access
- Permanent: Yes

### Option 4: PowerShell Alias (Windows)

- Adds alias to PowerShell profile
- Requires: No elevation
- Effect: Works in PowerShell sessions only
- Permanent: Yes (in PowerShell only)

---

## Verifying Installation

After installation and restarting your terminal:

```bash
# Check if command is available
scripts --version

# Or open interactive menu
scripts menu

# List all available scripts
scripts list
```

---

## Uninstalling

### Windows

```powershell
.\Scripts\install-cli.ps1 -Uninstall
```

### Linux/macOS

```bash
bash Scripts/install-cli.sh --uninstall
```

---

## Troubleshooting

### Command not found after installation

**Windows:**
- If using PATH method: Restart your terminal or run `refreshenv` in PowerShell
- Close and reopen PowerShell completely
- Check PATH: `$env:Path | Select-String Scripts`

**Linux/macOS:**
- Source your shell profile: `source ~/.bashrc` or `source ~/.zshrc`
- Log out and log back in for symlink method
- Check PATH: `echo $PATH | grep Scripts`

### Permission Denied (Linux/macOS)

- Run installer with bash: `bash install-cli.sh` not `sh install-cli.sh`
- Ensure node.js is installed and in PATH

### Admin Privileges Needed (Windows)

- Use Option 2 (Batch Wrapper) instead of Option 1 (PATH)
- Or run PowerShell as Administrator

---

## Usage Examples

Once installed, you can call `scripts` from anywhere:

```bash
# Interactive menu
scripts menu

# List all scripts
scripts list

# Run a specific script
scripts run setup install-cli
scripts run services tts workflow
scripts run docker tts start

# Shorthand versions
scripts m                    # menu
scripts ls                   # list
scripts r docker tts logs    # run docker tts logs
```

---

## Manual Setup (Alternative)

If the installer doesn't work, you can manually add the Scripts folder to your PATH:

### Windows (Manual)

1. Press `Win + X` → Settings
2. Search for "Environment Variables"
3. Click "Edit the system environment variables"
4. Click "Environment Variables..."
5. Under "User variables", click "New..."
6. Variable name: `Path`
7. Variable value: `C:\Path\To\Scripts` (replace with actual path)
8. Click OK and restart terminal

### Linux/macOS (Manual)

Add this line to `~/.bashrc`, `~/.zshrc`, or `~/.profile`:

```bash
export PATH="/path/to/Scripts:$PATH"
```

Then run: `source ~/.bashrc` (or appropriate file)

---

## Technical Details

### How It Works

1. **Main CLI**: `Scripts/cli/index.js` (Node.js)
2. **Windows Entry Point**: `Scripts/scripts.cmd` (Batch wrapper)
3. **Unix Entry Point**: `Scripts/scripts.cmd` or direct symlink

### Directory Structure

```
Scripts/
├── install-cli.ps1          # Windows installer
├── install-cli.sh           # Linux/macOS installer
├── scripts.cmd              # Windows batch wrapper
├── INSTALL_CLI_GUIDE.md     # This file
└── cli/
    └── index.js             # Main CLI application
```

### Environment Variables

The CLI reads from `Scripts/cli/.env` if it exists. You can customize:

```env
PYTHON_CMD=python          # Python executable
BASH_CMD=bash              # Bash executable
PM2_CMD=pm2                # PM2 executable
POWERSHELL_CMD=powershell  # PowerShell executable
```

---

## Support

For issues or questions:

1. Check `scripts list` to see available commands
2. Run `scripts menu` for interactive help
3. Review script logs for error messages
4. Verify Node.js is installed: `node --version`
