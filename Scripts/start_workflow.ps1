# Scripts/start_workflow.ps1
Write-Host "Starting Workflow API Service..." -ForegroundColor Cyan

# Environment Variables
$env:DJANGO_ENV = "development" # Set to dev for SQLite
$env:DJANGO_DEBUG = "True"
$env:DJANGO_ALLOWED_HOSTS = "localhost,127.0.0.1,workflow-api"
$env:DJANGO_CELERY_BROKER_URL = "amqp://admin:admin@localhost:5672/"
$env:DJANGO_NOTIFICATION_SERVICE_BROKER_URL = "amqp://admin:admin@localhost:5672/"
$env:DJANGO_NOTIFICATION_QUEUE = "notification-queue-default"
$env:DJANGO_TICKET_STATUS_QUEUE = "ticket_status-default"
$env:DJANGO_INAPP_NOTIFICATION_QUEUE = "inapp-notification-queue"
$env:DJANGO_AUTH_SERVICE_URL = "http://localhost:8003" # Localhost port
$env:DJANGO_NOTIFICATION_SERVICE_URL = "http://localhost:8006" # Localhost port
$env:DJANGO_TTS_SERVICE_URL = "http://localhost:8002"
$env:DJANGO_USER_SERVICE_URL = "http://localhost:3000" # NOTE: Check if this service exists or is Auth
$env:DJANGO_BASE_URL = "http://localhost:8002"
$env:DJANGO_FRONTEND_URL = "http://localhost:1000/register"
$env:DJANGO_CORS_ALLOWED_ORIGINS = "http://localhost:1000,http://127.0.0.1:1000"

# Activate Venv
$VenvPath = "$PSScriptRoot\..\venv\Scripts\Activate.ps1"
if (Test-Path $VenvPath) { . $VenvPath } else { Write-Warning "Venv not found at $VenvPath" }

# Navigate and Run
Set-Location "$PSScriptRoot\..\tts\workflow_api"
python manage.py runserver 0.0.0.0:8002