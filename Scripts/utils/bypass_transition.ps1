# Bypass Transition Script
# Calls the Django management command to execute workflow transitions on behalf of users
# Usage: .\bypass_transition.ps1 [-TicketNumber <string>] [-Auto] [-Finalize] [-DryRun] [-TransitionId <int>]

param(
    [Parameter(Position=0)]
    [string]$TicketNumber,
    
    [switch]$Auto,
    [switch]$Finalize,
    [switch]$DryRun,
    [int]$TransitionId = -1,
    [string]$Notes = "Admin bypass - executed via CLI script"
)

$ErrorActionPreference = "Stop"
$ScriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$ProjectRoot = (Get-Item $ScriptDir).Parent.Parent.FullName
$WorkflowApiPath = Join-Path $ProjectRoot "tts\workflow_api"

Write-Host ""
Write-Host "==========================================" -ForegroundColor Cyan
Write-Host "  Bypass Transition - Admin Workflow Tool" -ForegroundColor Cyan
Write-Host "==========================================" -ForegroundColor Cyan
Write-Host ""

# Check if workflow_api directory exists
if (-not (Test-Path $WorkflowApiPath)) {
    Write-Host "ERROR: workflow_api directory not found at: $WorkflowApiPath" -ForegroundColor Red
    exit 1
}

# Build command arguments
$cmdArgs = @()

if ($TicketNumber) {
    $cmdArgs += $TicketNumber
}

if ($Auto) {
    $cmdArgs += "--auto"
}

if ($Finalize) {
    $cmdArgs += "--finalize"
}

if ($DryRun) {
    $cmdArgs += "--dry-run"
}

if ($TransitionId -ge 0) {
    $cmdArgs += "--transition-id"
    $cmdArgs += $TransitionId
}

if ($Notes) {
    $cmdArgs += "--notes"
    $cmdArgs += "`"$Notes`""
}

# Change to workflow_api directory
Push-Location $WorkflowApiPath

try {
    Write-Host "Working directory: $WorkflowApiPath" -ForegroundColor Gray
    Write-Host "Executing: python manage.py bypass_transition $($cmdArgs -join ' ')" -ForegroundColor Gray
    Write-Host ""
    
    # Execute the management command
    $argString = $cmdArgs -join ' '
    if ($argString) {
        & python manage.py bypass_transition $cmdArgs
    } else {
        & python manage.py bypass_transition
    }
    
    if ($LASTEXITCODE -ne 0) {
        Write-Host ""
        Write-Host "Command exited with code: $LASTEXITCODE" -ForegroundColor Yellow
    }
}
finally {
    Pop-Location
}

Write-Host ""
