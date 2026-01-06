# Bypass Transition Script (Docker Version)
# Calls the Django management command to execute workflow transitions on behalf of users
# Usage: .\bypass_transition.ps1 [-TicketNumber <string>] [-Auto] [-Finalize] [-DryRun] [-TransitionId <int>] [-Container <string>]

param(
    [Parameter(Position=0)]
    [string]$TicketNumber,
    
    [switch]$Auto,
    [switch]$Finalize,
    [switch]$DryRun,
    [int]$TransitionId = -1,
    [string]$Notes = "Admin bypass - executed via CLI script",
    [string]$Service = "workflow-api"
)

$ErrorActionPreference = "Stop"

# Get the script's directory and workspace root
$ScriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$WorkspaceRoot = (Get-Item $ScriptDir).Parent.Parent.FullName
$ComposeFile = Join-Path $WorkspaceRoot "tts\Docker\docker-compose.yml"

Write-Host ""
Write-Host "==========================================" -ForegroundColor Cyan
Write-Host "  Bypass Transition - Admin Workflow Tool" -ForegroundColor Cyan
Write-Host "  (Docker Version)" -ForegroundColor Cyan
Write-Host "==========================================" -ForegroundColor Cyan
Write-Host ""

# Check if compose file exists
if (-not (Test-Path $ComposeFile)) {
    Write-Host "ERROR: Docker Compose file not found at: $ComposeFile" -ForegroundColor Red
    exit 1
}

# Check if service is running using docker-compose
$serviceStatus = docker-compose -f $ComposeFile ps --services --filter "status=running" 2>$null | Where-Object { $_ -eq $Service }

if (-not $serviceStatus) {
    Write-Host "ERROR: Service '$Service' is not running." -ForegroundColor Red
    Write-Host "Please start Docker services first." -ForegroundColor Yellow
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

try {
    Write-Host "Service: $Service" -ForegroundColor Gray
    Write-Host "Executing: docker-compose exec $Service python manage.py bypass_transition $($cmdArgs -join ' ')" -ForegroundColor Gray
    Write-Host ""
    
    # Execute the management command using docker-compose exec
    if ($cmdArgs.Count -gt 0) {
        docker-compose -f $ComposeFile exec -T $Service python manage.py bypass_transition @cmdArgs
    } else {
        docker-compose -f $ComposeFile exec -T $Service python manage.py bypass_transition
    }
    
    if ($LASTEXITCODE -ne 0) {
        Write-Host ""
        Write-Host "Command exited with code: $LASTEXITCODE" -ForegroundColor Yellow
    }
}
catch {
    Write-Error $_
    exit 1
}

Write-Host ""
