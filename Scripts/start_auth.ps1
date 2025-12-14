# Scripts/start_auth.ps1
Write-Host "Starting Auth Service..." -ForegroundColor Cyan

# Environment Variables
$env:DJANGO_ENV = "development"
$env:DJANGO_DEBUG = "True"
$env:DJANGO_ALLOWED_HOSTS = "localhost,127.0.0.1,auth-service"
$env:CELERY_BROKER_URL = "amqp://admin:admin@localhost:5672/"
$env:DJANGO_CORS_ALLOWED_ORIGINS = "http://localhost:1000,http://127.0.0.1:1000"
$env:TTS_SYSTEM_URL = "http://localhost:1000/"
$env:AMS_SYSTEM_URL = "http://localhost:3000/ams"
$env:HDTS_SYSTEM_URL = "http://localhost:3000/hdts"
$env:BMS_SYSTEM_URL = "http://localhost:3000/bms"
$env:DEFAULT_SYSTEM_URL = "http://localhost:3000/dashboard"

# Activate Venv
$VenvPath = "$PSScriptRoot\..\venv\Scripts\Activate.ps1"
if (Test-Path $VenvPath) { . $VenvPath } else { Write-Warning "Venv not found at $VenvPath" }

# Navigate and Run
Set-Location "$PSScriptRoot\..\auth"
python manage.py runserver 0.0.0.0:8003
