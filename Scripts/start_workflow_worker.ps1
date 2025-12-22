# Scripts/start_workflow_worker.ps1
Write-Host "Starting Workflow Worker..." -ForegroundColor Cyan

# Environment Variables
$env:DJANGO_ENV = "development"
$env:DJANGO_DEBUG = "True"
$env:DJANGO_CELERY_BROKER_URL = "amqp://admin:admin@localhost:5672/"
$env:DJANGO_NOTIFICATION_SERVICE_BROKER_URL = "amqp://admin:admin@localhost:5672/"
$env:DJANGO_AUTH_SERVICE_URL = "http://localhost:8003"
$env:DJANGO_NOTIFICATION_SERVICE_URL = "http://localhost:8006"
$env:C_FORCE_ROOT = "false"

# Activate Venv
$VenvPath = "$PSScriptRoot\..\venv\Scripts\Activate.ps1"
if (Test-Path $VenvPath) { . $VenvPath } else { Write-Warning "Venv not found at $VenvPath" }

# Navigate and Run
Set-Location "$PSScriptRoot\..\tts\workflow_api"
celery -A workflow_api worker --pool=solo --loglevel=info -Q role_send-default,TICKET_TASKS_PRODUCTION,tts.role.sync,tts.user_system_role.sync,workflow_seed_queue,workflow_seed