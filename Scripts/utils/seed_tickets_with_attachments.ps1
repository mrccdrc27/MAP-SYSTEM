param (
    [int]$Count = 0,
    [int]$MinAttachments = 2,
    [int]$MaxAttachments = 4
)

$ErrorActionPreference = "Stop"

Write-Host "`n=== Seed Tickets with Attachments ===" -ForegroundColor Cyan

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

$ProjectRoot = Resolve-Path "$PSScriptRoot\..\.."
$HelpdeskDir = Join-Path $ProjectRoot "hdts\helpdesk"

Write-Host "`nSeeding $Count tickets with $MinAttachments-$MaxAttachments attachments each..." -ForegroundColor Cyan
Write-Host "File types: PDF, DOCX, XLSX, PNG" -ForegroundColor DarkGray

if (-not (Test-Path "$HelpdeskDir\manage.py")) {
    Write-Error "manage.py not found at $HelpdeskDir\manage.py"
    exit 1
}

Push-Location $HelpdeskDir

try {
    $VenvPython = Join-Path $ProjectRoot "venv\Scripts\python.exe"
    $PythonCmd = if (Test-Path $VenvPython) { $VenvPython } else { "python" }
    
    & $PythonCmd manage.py seed_tickets_with_attachments --count $Count --min-attachments $MinAttachments --max-attachments $MaxAttachments
    
    if ($LASTEXITCODE -eq 0) {
        Write-Host "`nSuccess! Attachments saved to: $HelpdeskDir\media\ticket_attachments\" -ForegroundColor Green
    } else {
        Write-Host "Command failed with exit code $LASTEXITCODE" -ForegroundColor Red
        exit $LASTEXITCODE
    }
} catch {
    Write-Host "Error: $_" -ForegroundColor Red
    exit 1
} finally {
    Pop-Location
}
