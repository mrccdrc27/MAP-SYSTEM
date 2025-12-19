$host.ui.RawUI.WindowTitle = "helpdesk backend"
Write-Host "Starting Helpdesk Backend..." -ForegroundColor Cyan

# Environment Variables
$env:DJANGO_ENV = "development"
$env:DJANGO_DEBUG = "True"

# Activate Venv
$VenvPath = "$PSScriptRoot\..\venv\Scripts\Activate.ps1"
if (Test-Path $VenvPath) { . $VenvPath } else { Write-Warning "Venv not found at $VenvPath" }

# Navigate and Run
Set-Location "$PSScriptRoot\..\helpdesk"
python manage.py runserver
