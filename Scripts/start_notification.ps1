# Scripts/start_notification.ps1
Write-Host "Starting Notification Service..." -ForegroundColor Cyan

# Environment Variables
$env:DJANGO_ENV = "development"
$env:DJANGO_DEBUG = "True"
$env:DJANGO_ALLOWED_HOSTS = "localhost,127.0.0.1,notification-service"
$env:DJANGO_CORS_ALLOWED_ORIGINS = "http://localhost:1000,http://127.0.0.1:1000"
$env:DJANGO_CORS_ALLOW_CREDENTIALS = "True"
$env:DJANGO_NOTIFICATION_SERVICE_PORT = "8006"
$env:DJANGO_AUTH_SERVICE_URL = "http://localhost:8003"
$env:DJANGO_NOTIFICATION_API_KEYS = "demo-api-key-123,test-api-key-456"
$env:DJANGO_API_KEY = "in-app-notification-api-key-secure"
$env:DJANGO_CELERY_BROKER_URL = "amqp://admin:admin@localhost:5672/"
$env:DJANGO_NOTIFICATION_QUEUE = "notification-queue"
$env:DJANGO_INAPP_NOTIFICATION_QUEUE = "inapp-notification-queue"

# Activate Venv
$VenvPath = "$PSScriptRoot\..\venv\Scripts\Activate.ps1"
if (Test-Path $VenvPath) { . $VenvPath } else { Write-Warning "Venv not found at $VenvPath" }

# Navigate and Run
Set-Location "$PSScriptRoot\..\tts\notification_service"
python manage.py runserver 0.0.0.0:8006