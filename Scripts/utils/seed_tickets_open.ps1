param (
    [int]$Count = 0
)

$ErrorActionPreference = "Stop"

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

$ProjectRoot = Resolve-Path "$PSScriptRoot\..\.."
$HelpdeskDir = Join-Path $ProjectRoot "hdts\helpdesk"

Write-Host "Seeding $Count 'Open' tickets in HDTS..." -ForegroundColor Cyan

if (-not (Test-Path "$HelpdeskDir\manage.py")) {
    Write-Error "manage.py not found at $HelpdeskDir\manage.py"
    exit 1
}

Push-Location $HelpdeskDir

try {
    # Assuming 'python' is in PATH. 
    # If the project relies on a specific venv, it should ideally be activated before calling this script,
    # or this script should call the venv python.
    # We will attempt to use the venv python if it exists in the standard location.
    
    $VenvPython = Join-Path $ProjectRoot "venv\Scripts\python.exe"
    if (Test-Path $VenvPython) {
        & $VenvPython manage.py seed_tickets_open --count $Count
    } else {
        python manage.py seed_tickets_open --count $Count
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
finally {
    Pop-Location
}
