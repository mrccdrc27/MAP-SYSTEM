param (
    [int]$Count = 0,
    [string]$Service = "helpdesk-service"
)

$ErrorActionPreference = "Stop"

# Get the script's directory and workspace root
$ScriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$WorkspaceRoot = (Get-Item $ScriptDir).Parent.Parent.FullName
$ComposeFile = Join-Path $WorkspaceRoot "tts\Docker\docker-compose.yml"

if ($Count -eq 0) {
    Write-Host "How many tickets do you want to seed? (Default: 10) " -ForegroundColor Yellow -NoNewline
    $InputVal = Read-Host
    if ([string]::IsNullOrWhiteSpace($InputVal)) {
        $Count = 10
    } elseif ($InputVal -match "^\d+$") {
        $Count = [int]$InputVal
    } else {
        Write-Host "Invalid number. Using default 10." -ForegroundColor Yellow
        $Count = 10
    }
}

Write-Host "Seeding $Count 'Open' tickets in HDTS (Docker)..." -ForegroundColor Cyan

try {
    # Check if compose file exists
    if (-not (Test-Path $ComposeFile)) {
        Write-Error "Docker Compose file not found at: $ComposeFile"
        exit 1
    }
    
    # Check if service is running using docker-compose
    $serviceStatus = docker-compose -f $ComposeFile ps --services --filter "status=running" 2>$null | Where-Object { $_ -eq $Service }
    
    if (-not $serviceStatus) {
        Write-Error "Service '$Service' is not running. Please start Docker services first."
        exit 1
    }
    
    Write-Host "Executing command in service: $Service" -ForegroundColor Gray
    
    # Execute the Django management command using docker-compose exec
    docker-compose -f $ComposeFile exec -T $Service python manage.py seed_tickets_open --count $Count
    
    if ($LASTEXITCODE -eq 0) {
        Write-Host "Success." -ForegroundColor Green
    } else {
        Write-Host "Command failed with exit code $LASTEXITCODE" -ForegroundColor Red
        exit $LASTEXITCODE
    }
}
catch {
    Write-Error $_
    exit 1
}
