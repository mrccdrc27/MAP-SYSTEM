#!/usr/bin/env powershell

<#
.SYNOPSIS
    Install the Capstone Scripts CLI globally for system-wide access
.DESCRIPTION
    This script sets up the 'scripts' command to be callable from anywhere
    on your system by adding it to your PATH or creating a global alias.
.EXAMPLE
    .\install-cli.ps1
    # or
    powershell -ExecutionPolicy Bypass -File install-cli.ps1
#>

param(
    [switch]$Uninstall
)

$ErrorActionPreference = "Stop"
$ScriptsRoot = Split-Path -Parent $MyInvocation.MyCommand.Path
$ProjectRoot = Split-Path -Parent $ScriptsRoot
$CheckMark = [char]0x2713
$Warning = [char]0x26A0

Write-Host "`n=== Capstone Scripts CLI Installer ===" -ForegroundColor Cyan

if ($Uninstall) {
    Write-Host "`nUninstalling CLI..." -ForegroundColor Yellow
    
    # Remove from PATH if added
    $existingPath = [Environment]::GetEnvironmentVariable('Path', 'User')
    $newPath = $existingPath -replace [regex]::Escape($ScriptsRoot + ';?'), ''
    [Environment]::SetEnvironmentVariable('Path', $newPath, 'User')
    Write-Host "$CheckMark Removed from PATH" -ForegroundColor Green
    
    # Remove batch file wrapper if exists
    $batchPath = "$env:APPDATA\Scripts\scripts.bat"
    if (Test-Path $batchPath) {
        Remove-Item $batchPath -Force
        Write-Host "$CheckMark Removed batch wrapper" -ForegroundColor Green
    }
    
    # Remove PowerShell alias if exists
    $profilePath = $PROFILE.CurrentUserCurrentHost
    if (Test-Path $profilePath) {
        $content = Get-Content $profilePath -Raw
        if ($content -match '# Capstone CLI') {
            $newContent = $content -replace "(?s)(# Capstone CLI.*?# End Capstone CLI\n?)", ""
            Set-Content $profilePath $newContent
            Write-Host "$CheckMark Removed PowerShell alias" -ForegroundColor Green
        }
    }
    
    Write-Host "`n$CheckMark CLI uninstalled successfully!`n" -ForegroundColor Green
    exit 0
}

# --- Install Mode ---

Write-Host "`nDetected System: Windows PowerShell"
Write-Host "Scripts Location: $ScriptsRoot`n"

# Method 1: Add to PATH (Option A)
Write-Host "Installation Methods:" -ForegroundColor Yellow
Write-Host "  1. Add Scripts folder to USER PATH (Requires elevation)" -ForegroundColor Cyan
Write-Host "  2. Create batch wrapper in AppData/Scripts (No elevation)" -ForegroundColor Cyan
Write-Host "  3. Both methods (Recommended)" -ForegroundColor Cyan
Write-Host "  4. Create PowerShell alias only (Current session only)" -ForegroundColor Cyan

$choice = Read-Host "`nSelect option (1-4)"

$installPath = $false
$installBatch = $false
$installAlias = $false

switch ($choice) {
    "1" { $installPath = $true }
    "2" { $installBatch = $true }
    "3" { $installPath = $true; $installBatch = $true }
    "4" { $installAlias = $true }
    default { Write-Host "Invalid choice. Exiting." -ForegroundColor Red; exit 1 }
}

# Method 1: Add to PATH
if ($installPath) {
    Write-Host "`n[PATH Method]" -ForegroundColor Yellow
    
    $isAdmin = ([Security.Principal.WindowsPrincipal] [Security.Principal.WindowsIdentity]::GetCurrent()).IsInRole([Security.Principal.WindowsBuiltInRole] "Administrator")
    
    if ($isAdmin) {
        $existingPath = [Environment]::GetEnvironmentVariable('Path', 'User')
        if ($existingPath -notlike "*$ScriptsRoot*") {
            $newPath = "$ScriptsRoot;$existingPath"
            [Environment]::SetEnvironmentVariable('Path', $newPath, 'User')
            Write-Host "$CheckMark Added Scripts to USER PATH" -ForegroundColor Green
            Write-Host "  Location: $ScriptsRoot" -ForegroundColor Gray
        } else {
            Write-Host "$CheckMark Scripts already in PATH" -ForegroundColor Green
        }
    } else {
        Write-Host "$Warning Admin privileges required for PATH modification." -ForegroundColor Yellow
        Write-Host "  Right-click PowerShell and select 'Run as Administrator'" -ForegroundColor Gray
        $installPath = $false
    }
}

# Method 2: Batch Wrapper
if ($installBatch) {
    Write-Host "`n[Batch Wrapper Method]" -ForegroundColor Yellow
    
    $batchDir = "$env:APPDATA\Scripts"
    
    if (-not (Test-Path $batchDir)) {
        New-Item -ItemType Directory -Path $batchDir -Force | Out-Null
        Write-Host "$CheckMark Created $batchDir" -ForegroundColor Green
    }
    
    $batchPath = "$batchDir\scripts.bat"
    
    # Create batch file content using string concatenation to avoid @ symbol issues
    $batchContent = "@echo off`nnode `"$ScriptsRoot\cli\index.js`" %*"
    
    Set-Content -Path $batchPath -Value $batchContent -Encoding ASCII
    Write-Host "$CheckMark Created batch wrapper at:" -ForegroundColor Green
    Write-Host "  $batchPath" -ForegroundColor Gray
    
    # Add to PATH if not already there
    $existingPath = [Environment]::GetEnvironmentVariable('Path', 'User')
    if ($existingPath -notlike "*$batchDir*") {
        $newPath = "$batchDir;$existingPath"
        [Environment]::SetEnvironmentVariable('Path', $newPath, 'User')
        Write-Host "$CheckMark Added $batchDir to PATH" -ForegroundColor Green
    }
}

# Method 3: PowerShell Alias
if ($installAlias) {
    Write-Host "`n[PowerShell Alias Method]" -ForegroundColor Yellow
    
    $profileDir = Split-Path $PROFILE.CurrentUserCurrentHost
    if (-not (Test-Path $profileDir)) {
        New-Item -ItemType Directory -Path $profileDir -Force | Out-Null
    }
    
    $profilePath = $PROFILE.CurrentUserCurrentHost
    
    # Create alias code using string concatenation to avoid backtick issues
    $aliasCode = "# Capstone CLI`n"
    $aliasCode += "if (-not (Get-Alias scripts -ErrorAction SilentlyContinue)) {`n"
    $aliasCode += "    New-Alias -Name scripts -Value `"$ScriptsRoot\scripts.cmd`" -Force`n"
    $aliasCode += "}`n"
    $aliasCode += "# End Capstone CLI"
    
    if (Test-Path $profilePath) {
        if ((Get-Content $profilePath -Raw) -notmatch '# Capstone CLI') {
            Add-Content $profilePath "`n$aliasCode"
            Write-Host "$CheckMark Added alias to PowerShell profile" -ForegroundColor Green
            Write-Host "  Profile: $profilePath" -ForegroundColor Gray
        }
    } else {
        Set-Content $profilePath $aliasCode
        Write-Host "$CheckMark Created PowerShell profile with alias" -ForegroundColor Green
        Write-Host "  Profile: $profilePath" -ForegroundColor Gray
    }
    
    # Apply to current session
    New-Alias -Name scripts -Value "$ScriptsRoot\scripts.cmd" -Force
    Write-Host "$CheckMark Alias active in current session" -ForegroundColor Green
}

# Completion message
Write-Host "`n" -ForegroundColor Cyan
Write-Host "$CheckMark CLI Installation Complete!" -ForegroundColor Green
Write-Host "`nUsage:" -ForegroundColor Cyan
Write-Host "  scripts list          # Show all available scripts" -ForegroundColor Gray
Write-Host "  scripts menu          # Open interactive menu" -ForegroundColor Gray
Write-Host "  scripts run tts start # Run specific script" -ForegroundColor Gray

if ($installPath -or $installBatch) {
    Write-Host "`n$Warning Please restart your terminal/PowerShell for PATH changes to take effect" -ForegroundColor Yellow
}

if ($installAlias) {
    Write-Host "`n$CheckMark Alias 'scripts' is ready to use in this session" -ForegroundColor Green
}

Write-Host "`nTo uninstall: .\install-cli.ps1 -Uninstall`n" -ForegroundColor Gray
