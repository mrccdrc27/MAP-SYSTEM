# Scripts/start_messaging.ps1
Write-Host "Starting Messaging Service..." -ForegroundColor Cyan

# Environment Variables
$env:DJANGO_ENV = "development"
$env:DJANGO_DEBUG = "True"
$env:DJANGO_ALLOWED_HOSTS = "localhost,127.0.0.1,messaging-service"
$env:DJANGO_CORS_ALLOWED_ORIGINS = "http://localhost:1000,http://127.0.0.1:1000"
$env:DJANGO_CORS_ALLOW_CREDENTIALS = "True"
$env:DJANGO_MEDIA_BASE_URL = "http://localhost:8005"

# Activate Venv
$VenvPath = "$PSScriptRoot\..\..\..\venv\Scripts\Activate.ps1"
if (Test-Path $VenvPath) { . $VenvPath } else { Write-Warning "Venv not found at $VenvPath" }

# Navigate and Run
Set-Location "$PSScriptRoot\..\..\..\tts\messaging"
python manage.py runserver 0.0.0.0:8005