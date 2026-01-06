param (
    [int]$Count = 0
)

$ErrorActionPreference = "Stop"

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

$ProjectRoot = Resolve-Path "$PSScriptRoot\..\.."
$AuthDir = Join-Path $ProjectRoot "auth"

Write-Host "Seeding Employees in Auth Service..." -ForegroundColor Cyan
if ($Count -gt 0) {
    Write-Host "Including $Count additional random employees." -ForegroundColor Cyan
}

if (-not (Test-Path "$AuthDir\manage.py")) {
    Write-Error "manage.py not found at $AuthDir\manage.py"
    exit 1
}

Push-Location $AuthDir

try {
    $VenvPython = Join-Path $ProjectRoot "venv\Scripts\python.exe"
    
    $ArgsList = @("manage.py", "seed_employees")
    if ($Count -gt 0) {
        $ArgsList += "--count"
        $ArgsList += "$Count"
    }

    if (Test-Path $VenvPython) {
        & $VenvPython $ArgsList
    } else {
        python $ArgsList
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
