$host.ui.RawUI.WindowTitle = "Helpdesk Backend Worker"
Write-Host "Starting Helpdesk Backend Worker..." -ForegroundColor Cyan

# Environment Variables
$env:DJANGO_ENV = "development"
$env:DJANGO_DEBUG = "True"

# Activate Venv
$VenvPath = "$PSScriptRoot\..\venv\Scripts\Activate.ps1"
if (Test-Path $VenvPath) { . $VenvPath } else { Write-Warning "Venv not found at $VenvPath" }

# Navigate and Run
Set-Location "$PSScriptRoot\..\hdts\helpdesk"
celery -A backend worker --loglevel=info --queues=hdts.user.sync,hdts.user_system_role.sync,hdts.employee.sync,ticket_tasks2 --pool=solo