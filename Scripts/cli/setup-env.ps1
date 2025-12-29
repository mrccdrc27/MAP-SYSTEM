# Setup environment configuration for CLI
# Run this once to auto-detect and configure your environment

Write-Host "`n🔧 Setting up CLI environment...`n" -ForegroundColor Cyan

# Navigate to cli directory
$cliDir = Split-Path -Parent $MyInvocation.MyCommand.Path
Push-Location $cliDir

# Run setup script
node setup-env.js

Pop-Location

Write-Host "Setup complete!`n" -ForegroundColor Green
