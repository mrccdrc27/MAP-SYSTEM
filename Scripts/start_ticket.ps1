# Scripts/start_ticket.ps1
Write-Host "Starting Ticket Service..." -ForegroundColor Cyan

# Environment Variables
$env:DJANGO_ENV = "development"
$env:DJANGO_DEBUG = "True"
$env:DJANGO_ALLOWED_HOSTS = "localhost,127.0.0.1,ticket-service"
$env:CELERY_BROKER_URL = "amqp://admin:admin@localhost:5672/"
$env:CELERY_TASK_DEFAULT_QUEUE = "TICKET_TASKS_PRODUCTION"
$env:DJANGO_CORS_ALLOWED_ORIGINS = "http://localhost:1000,http://127.0.0.1:1000"
$env:DJANGO_CORS_ALLOW_ALL_ORIGINS = "False"

# Activate Venv
$VenvPath = "$PSScriptRoot\..\venv\Scripts\Activate.ps1"
if (Test-Path $VenvPath) { . $VenvPath } else { Write-Warning "Venv not found at $VenvPath" }

# Navigate and Run
Set-Location "$PSScriptRoot\..\ticket_service"
python manage.py runserver 0.0.0.0:8004

