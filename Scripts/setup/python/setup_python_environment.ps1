# Master Setup Script for MAP-SYSTEM
# This script orchestrates the complete environment setup:
#   1. Creates virtual environment
#   2. Aggregates requirements from all services
#   3. Installs aggregated requirements

param(
    [string]$VenvPath = ".\venv",
    [string]$RequirementsFile = "requirements_aggregated.txt",
    [switch]$SkipVenv = $false,
    [switch]$SkipAggregate = $false,
    [switch]$SkipInstall = $false
)

$ErrorActionPreference = "Stop"

Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  MAP-SYSTEM Setup Master Script" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# Get the root directory (MAP-SYSTEM)
$RootDir = (Resolve-Path "$PSScriptRoot\..\..\..").Path
Set-Location $RootDir

Write-Host "Root directory: $RootDir" -ForegroundColor Yellow
Write-Host ""

$StartTime = Get-Date

# Step 1: Create virtual environment
if (-not $SkipVenv) {
    Write-Host "----------------------------------------" -ForegroundColor Cyan
    Write-Host " Step 1/3: Create Virtual Environment" -ForegroundColor Cyan
    Write-Host "----------------------------------------" -ForegroundColor Cyan
    Write-Host ""
    
    & "$PSScriptRoot\create_venv.ps1" -VenvPath $VenvPath
    
    if ($LASTEXITCODE -ne 0) {
        Write-Host ""
        Write-Host "[X] Setup failed at Step 1" -ForegroundColor Red
        exit 1
    }
    
    Write-Host ""
    Start-Sleep -Seconds 1
} else {
    Write-Host "[~] Skipping Step 1: Virtual environment creation" -ForegroundColor Yellow
    Write-Host ""
}

# Step 2: Aggregate requirements
if (-not $SkipAggregate) {
    Write-Host "----------------------------------------" -ForegroundColor Cyan
    Write-Host " Step 2/3: Aggregate Requirements" -ForegroundColor Cyan
    Write-Host "----------------------------------------" -ForegroundColor Cyan
    Write-Host ""
    
    & "$PSScriptRoot\aggregate_requirements.ps1" -OutputFile $RequirementsFile
    
    if ($LASTEXITCODE -ne 0) {
        Write-Host ""
        Write-Host "[X] Setup failed at Step 2" -ForegroundColor Red
        exit 1
    }
    
    Write-Host ""
    Start-Sleep -Seconds 1
} else {
    Write-Host "[~] Skipping Step 2: Requirements aggregation" -ForegroundColor Yellow
    Write-Host ""
}

# Step 3: Install requirements
if (-not $SkipInstall) {
    Write-Host "----------------------------------------" -ForegroundColor Cyan
    Write-Host " Step 3/3: Install Requirements" -ForegroundColor Cyan
    Write-Host "----------------------------------------" -ForegroundColor Cyan
    Write-Host ""
    
    & "$PSScriptRoot\install_requirements.ps1" -RequirementsFile $RequirementsFile -VenvPath $VenvPath
    
    if ($LASTEXITCODE -ne 0) {
        Write-Host ""
        Write-Host "[X] Setup failed at Step 3" -ForegroundColor Red
        exit 1
    }
    
    Write-Host ""
} else {
    Write-Host "[~] Skipping Step 3: Requirements installation" -ForegroundColor Yellow
    Write-Host ""
}

$EndTime = Get-Date
$Duration = $EndTime - $StartTime

Write-Host ""
Write-Host "========================================" -ForegroundColor Green
Write-Host "  [OK] SETUP COMPLETED SUCCESSFULLY!" -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Green
Write-Host ""
Write-Host "Summary:" -ForegroundColor Cyan
Write-Host "  Duration: $($Duration.Minutes)m $($Duration.Seconds)s" -ForegroundColor White
Write-Host "  Virtual environment: $VenvPath" -ForegroundColor White
Write-Host "  Aggregated requirements: $RequirementsFile" -ForegroundColor White
Write-Host ""

# Run verification
Write-Host "Running installation verification..." -ForegroundColor Cyan
Write-Host ""
& "$PSScriptRoot\verify_installation.ps1" -RequirementsFile $RequirementsFile -VenvPath $VenvPath

if ($LASTEXITCODE -eq 0) {
    Write-Host ""
    Write-Host "Next steps:" -ForegroundColor Yellow
    Write-Host "  1. Activate the virtual environment:" -ForegroundColor White
    Write-Host "     .\venv\Scripts\Activate.ps1" -ForegroundColor Gray
    Write-Host ""
    Write-Host "  2. Start your services!" -ForegroundColor White
    Write-Host ""
} else {
    Write-Host ""
    Write-Host "Some packages may have issues. Review the verification report above." -ForegroundColor Yellow
    Write-Host ""
}
