# Scripts/start_notification_worker.ps1
Write-Host "Starting Notification Worker..." -ForegroundColor Cyan

# Environment Variables
$env:DJANGO_ENV = "development"
$env:DJANGO_DEBUG = "True"
$env:DJANGO_CELERY_BROKER_URL = "amqp://admin:admin@localhost:5672/"
$env:DJANGO_NOTIFICATION_QUEUE = "notification-queue"
$env:DJANGO_INAPP_NOTIFICATION_QUEUE = "inapp-notification-queue"

# Activate Venv
$VenvPath = "$PSScriptRoot\..\venv\Scripts\Activate.ps1"
if (Test-Path $VenvPath) { . $VenvPath } else { Write-Warning "Venv not found at $VenvPath" }

# Navigate and Run
Set-Location "$PSScriptRoot\..\tts\notification_service"
celery -A notification_service worker --pool=solo --loglevel=info -Q notification-queue-default,inapp-notification-queue