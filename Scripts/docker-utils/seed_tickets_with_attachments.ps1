param (
    [int]$Count = 0,
    [int]$MinAttachments = 2,
    [int]$MaxAttachments = 4,
    [string]$Service = "helpdesk-service"
)

$ErrorActionPreference = "Stop"

# Get the script's directory and workspace root
$ScriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$WorkspaceRoot = (Get-Item $ScriptDir).Parent.Parent.FullName
$ComposeFile = Join-Path $WorkspaceRoot "tts\Docker\docker-compose.yml"

Write-Host "`n=== Seed Tickets with Attachments (Docker) ===" -ForegroundColor Cyan

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

Write-Host "Min attachments per ticket? (Default: $MinAttachments) " -ForegroundColor Yellow -NoNewline
$MinInput = Read-Host
if (-not [string]::IsNullOrWhiteSpace($MinInput) -and $MinInput -match "^\d+$") {
    $MinAttachments = [int]$MinInput
}

Write-Host "Max attachments per ticket? (Default: $MaxAttachments) " -ForegroundColor Yellow -NoNewline
$MaxInput = Read-Host
if (-not [string]::IsNullOrWhiteSpace($MaxInput) -and $MaxInput -match "^\d+$") {
    $MaxAttachments = [int]$MaxInput
}

# Ensure min <= max
if ($MinAttachments -gt $MaxAttachments) {
    Write-Host "Min attachments cannot be greater than max. Setting min = max." -ForegroundColor Yellow
    $MinAttachments = $MaxAttachments
}

Write-Host "`nSeeding $Count tickets with $MinAttachments-$MaxAttachments attachments each..." -ForegroundColor Cyan
Write-Host "File types: PDF, DOCX, XLSX, PNG" -ForegroundColor DarkGray

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
    docker-compose -f $ComposeFile exec -T $Service python manage.py seed_tickets_with_attachments --count $Count --min-attachments $MinAttachments --max-attachments $MaxAttachments
    
    if ($LASTEXITCODE -eq 0) {
        Write-Host "`nSuccess! Attachments saved to container's /app/media/ticket_attachments/" -ForegroundColor Green
    } else {
        Write-Host "Command failed with exit code $LASTEXITCODE" -ForegroundColor Red
        exit $LASTEXITCODE
    }
} catch {
    Write-Host "Error: $_" -ForegroundColor Red
    exit 1
}
