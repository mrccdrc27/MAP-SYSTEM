# Scripts/start_frontend.ps1
Write-Host "Starting Frontend (Vite)..." -ForegroundColor Cyan

# Environment Variables
$env:VITE_AUTH_URL = "http://localhost:8003"
$env:VITE_WORKFLOW_API = "http://localhost:8002/workflow"
$env:VITE_BACKEND_API = "http://localhost:8002/"

# Navigate and Run
Set-Location "$PSScriptRoot\..\frontend"
npm run dev
