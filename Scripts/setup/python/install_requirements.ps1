# Install Aggregated Requirements Script
# This script installs all aggregated requirements into the virtual environment

param(
    [string]$RequirementsFile = "requirements_aggregated.txt",
    [string]$VenvPath = ".\venv",
    [switch]$SkipVenvCheck = $false
)

$ErrorActionPreference = "Stop"

Write-Host "======================================" -ForegroundColor Cyan
Write-Host "  Requirements Installation Script" -ForegroundColor Cyan
Write-Host "======================================" -ForegroundColor Cyan
Write-Host ""

# Get the root directory (MAP-SYSTEM)
$RootDir = (Resolve-Path "$PSScriptRoot\..\..\..").Path
Set-Location $RootDir

Write-Host "Working directory: $RootDir" -ForegroundColor Yellow
Write-Host ""

# Check if requirements file exists
$RequirementsPath = Join-Path $RootDir $RequirementsFile
Write-Host "Looking for requirements at: $RequirementsPath" -ForegroundColor DarkGray

if (-not (Test-Path $RequirementsPath)) {
    Write-Host "[X] Requirements file not found: $RequirementsFile" -ForegroundColor Red
    Write-Host ""
    Write-Host "Please run the aggregation script first:" -ForegroundColor Yellow
    Write-Host "  .\Scripts\setup\aggregate_requirements.ps1" -ForegroundColor White
    exit 1
}

Write-Host "Requirements file: $RequirementsFile" -ForegroundColor Green
Write-Host ""

# Check if virtual environment exists
if (-not (Test-Path $VenvPath) -and -not $SkipVenvCheck) {
    Write-Host "[X] Virtual environment not found: $VenvPath" -ForegroundColor Red
    Write-Host ""
    Write-Host "Creating virtual environment..." -ForegroundColor Yellow
    & "$PSScriptRoot\create_venv.ps1" -VenvPath $VenvPath
    
    if ($LASTEXITCODE -ne 0) {
        Write-Host "[X] Failed to create virtual environment" -ForegroundColor Red
        exit 1
    }
    Write-Host ""
}

# Determine pip path
$PipPath = Join-Path $VenvPath "Scripts\pip.exe"
$PythonPath = Join-Path $VenvPath "Scripts\python.exe"

if ($SkipVenvCheck) {
    # Use system pip/python
    $PipPath = "pip"
    $PythonPath = "python"
    Write-Host "Using system Python/pip (venv check skipped)" -ForegroundColor Yellow
} else {
    # Check if virtual environment is valid
    if (-not (Test-Path $PipPath)) {
        Write-Host "[X] Virtual environment is invalid or corrupted" -ForegroundColor Red
        Write-Host "Please recreate it using:" -ForegroundColor Yellow
        Write-Host "  .\Scripts\setup\create_venv.ps1" -ForegroundColor White
        exit 1
    }
    
    Write-Host "Using virtual environment: $VenvPath" -ForegroundColor Green
}
Write-Host ""

# Upgrade pip first
Write-Host "Upgrading pip..." -ForegroundColor Cyan
& $PythonPath -m pip install --upgrade pip

if ($LASTEXITCODE -ne 0) {
    Write-Host "[!] Warning: Failed to upgrade pip, continuing..." -ForegroundColor Yellow
}
Write-Host ""

# Install/upgrade setuptools and wheel (required for building packages)
Write-Host "Installing setuptools and wheel..." -ForegroundColor Cyan
& $PipPath install --upgrade setuptools wheel

if ($LASTEXITCODE -ne 0) {
    Write-Host "[X] Failed to install setuptools and wheel" -ForegroundColor Red
    Write-Host "These are required to build packages. Please fix the error and try again." -ForegroundColor Yellow
    exit 1
}
Write-Host ""

# Count total packages
$TotalPackages = (Get-Content $RequirementsPath | Where-Object { 
    $_ -and $_.Trim() -and -not $_.Trim().StartsWith("#") 
}).Count

Write-Host "Installing $TotalPackages packages..." -ForegroundColor Cyan
Write-Host "This may take several minutes..." -ForegroundColor Yellow
Write-Host ""

# Install requirements
Write-Host "Running: pip install -r $RequirementsFile" -ForegroundColor White
Write-Host ""

& $PipPath install -r $RequirementsPath

if ($LASTEXITCODE -eq 0) {
    Write-Host ""
    Write-Host "[OK] All requirements installed successfully!" -ForegroundColor Green
} else {
    Write-Host ""
    Write-Host "[X] Some packages failed to install" -ForegroundColor Red
    Write-Host "Please check the errors above and try again." -ForegroundColor Yellow
    exit 1
}

Write-Host ""
Write-Host "======================================" -ForegroundColor Cyan
Write-Host "Installation Summary:" -ForegroundColor Yellow
Write-Host "  Requirements file: $RequirementsFile" -ForegroundColor White
Write-Host "  Virtual environment: $VenvPath" -ForegroundColor White
Write-Host "  Total packages: $TotalPackages" -ForegroundColor White
Write-Host ""
Write-Host "To verify installation, activate the venv and run:" -ForegroundColor Yellow
Write-Host "  .\venv\Scripts\Activate.ps1" -ForegroundColor White
Write-Host "  pip list" -ForegroundColor White
Write-Host "======================================" -ForegroundColor Cyan
exit 0