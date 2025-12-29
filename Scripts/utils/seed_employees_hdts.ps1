param (
    [int]$Count = 0
)

$ErrorActionPreference = "Stop"

if ($Count -eq 0) {
    Write-Host "How many employees do you want to seed in HDTS? (Default: 150) " -ForegroundColor Yellow -NoNewline
    $InputVal = Read-Host
    if ([string]::IsNullOrWhiteSpace($InputVal)) {
        $Count = 150
    } elseif ($InputVal -match "^\d+$") {
        $Count = [int]$InputVal
    } else {
        Write-Host "Invalid number. Using default 150." -ForegroundColor Yellow
        $Count = 150
    }
}

$ProjectRoot = Resolve-Path "$PSScriptRoot\..\.."
$HelpdeskDir = Join-Path $ProjectRoot "hdts\helpdesk"

Write-Host "Seeding $Count employees in HDTS..." -ForegroundColor Cyan

if (-not (Test-Path "$HelpdeskDir\manage.py")) {
    Write-Error "manage.py not found at $HelpdeskDir\manage.py"
    exit 1
}

Push-Location $HelpdeskDir

try {
    $VenvPython = Join-Path $ProjectRoot "venv\Scripts\python.exe"
    if (Test-Path $VenvPython) {
        & $VenvPython manage.py seed_employees --count $Count
    } else {
        python manage.py seed_employees --count $Count
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
