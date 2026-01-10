# Create Virtual Environment at Root
# This script creates a Python virtual environment at the root of the MAP-SYSTEM project

param(
    [string]$VenvPath = ".\venv"
)

$ErrorActionPreference = "Stop"

Write-Host "======================================" -ForegroundColor Cyan
Write-Host "  Virtual Environment Setup Script" -ForegroundColor Cyan
Write-Host "======================================" -ForegroundColor Cyan
Write-Host ""

# Get the root directory (MAP-SYSTEM)
$RootDir = (Resolve-Path "$PSScriptRoot\..\..\..").Path
Set-Location $RootDir

Write-Host "Working directory: $RootDir" -ForegroundColor Yellow
Write-Host ""

# Check if virtual environment already exists
if (Test-Path $VenvPath) {
    Write-Host "Virtual environment already exists at: $VenvPath" -ForegroundColor Green
    Write-Host "Skipping creation..." -ForegroundColor Yellow
    Write-Host ""
    
    # Check if it's a valid venv
    $ActivateScript = Join-Path $VenvPath "Scripts\Activate.ps1"
    if (Test-Path $ActivateScript) {
        Write-Host "[OK] Valid virtual environment detected" -ForegroundColor Green
    } else {
        Write-Host "[!] Virtual environment appears corrupted. Recreating..." -ForegroundColor Yellow
        Remove-Item -Path $VenvPath -Recurse -Force
        Write-Host "Creating new virtual environment..." -ForegroundColor Cyan
        python -m venv $VenvPath
        Write-Host "[OK] Virtual environment created successfully!" -ForegroundColor Green
    }
} else {
    Write-Host "Creating virtual environment at: $VenvPath" -ForegroundColor Cyan
    
    # Check if Python is available
    try {
        $PythonVersion = python --version 2>&1
        Write-Host "Python detected: $PythonVersion" -ForegroundColor Green
    } catch {
        Write-Host "[X] Python is not installed or not in PATH" -ForegroundColor Red
        Write-Host "Please install Python 3.8+ and try again." -ForegroundColor Yellow
        exit 1
    }
    
    # Create virtual environment
    Write-Host "Creating virtual environment..." -ForegroundColor Cyan
    python -m venv $VenvPath
    
    if ($LASTEXITCODE -eq 0) {
        Write-Host "[OK] Virtual environment created successfully!" -ForegroundColor Green
    } else {
        Write-Host "[X] Failed to create virtual environment" -ForegroundColor Red
        exit 1
    }
}

Write-Host ""
Write-Host "======================================" -ForegroundColor Cyan
Write-Host "To activate the virtual environment, run:" -ForegroundColor Yellow
Write-Host "  .\venv\Scripts\Activate.ps1" -ForegroundColor White
Write-Host "======================================" -ForegroundColor Cyan

exit 0
