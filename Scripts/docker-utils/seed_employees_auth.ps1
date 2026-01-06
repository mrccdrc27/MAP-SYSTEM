param (
    [int]$Count = 0,
    [string]$Service = "auth-service"
)

$ErrorActionPreference = "Stop"

# Get the script's directory and workspace root
$ScriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$WorkspaceRoot = (Get-Item $ScriptDir).Parent.Parent.FullName
$ComposeFile = Join-Path $WorkspaceRoot "tts\Docker\docker-compose.yml"

if ($Count -eq 0) {
    Write-Host "How many random employees do you want to seed? (Default: 0) " -ForegroundColor Yellow -NoNewline
    $InputVal = Read-Host
    if ([string]::IsNullOrWhiteSpace($InputVal)) {
        $Count = 0
    } elseif ($InputVal -match "^\d+$") {
        $Count = [int]$InputVal
    } else {
        Write-Host "Invalid number. Using default 0." -ForegroundColor Yellow
        $Count = 0
    }
}

Write-Host "Seeding Employees in Auth Service (Docker)..." -ForegroundColor Cyan
if ($Count -gt 0) {
    Write-Host "Including $Count additional random employees." -ForegroundColor Cyan
}

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
    if ($Count -gt 0) {
        docker-compose -f $ComposeFile exec -T $Service python manage.py seed_employees --count $Count
    } else {
        docker-compose -f $ComposeFile exec -T $Service python manage.py seed_employees
    }
    
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
