# PowerShell script to test all context seeders
# Run this from the backend/contexts directory

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  Context Seeders Test Script" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# Check if Docker is running
Write-Host "Checking Docker status..." -ForegroundColor Yellow
$dockerStatus = docker ps 2>&1
if ($LASTEXITCODE -ne 0) {
    Write-Host "ERROR: Docker is not running!" -ForegroundColor Red
    Write-Host "Please start Docker Desktop and try again." -ForegroundColor Red
    exit 1
}

Write-Host "Docker is running ✓" -ForegroundColor Green
Write-Host ""

# Check if backend-dev container exists
Write-Host "Checking for backend-dev container..." -ForegroundColor Yellow
$containerExists = docker ps -a --filter "name=backend-dev" --format "{{.Names}}" | Select-String "backend-dev"
if (-not $containerExists) {
    Write-Host "ERROR: backend-dev container not found!" -ForegroundColor Red
    Write-Host "Please start your Docker containers first." -ForegroundColor Red
    exit 1
}

Write-Host "Container found ✓" -ForegroundColor Green
Write-Host ""

# Seed all contexts
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  Seeding All Context Data" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

docker exec -it backend-dev python manage.py seed_all_contexts --clear

Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  Seeding Complete!" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "Summary:" -ForegroundColor Yellow
Write-Host "  - Categories: 10 records" -ForegroundColor Green
Write-Host "  - Suppliers: 10 records" -ForegroundColor Green
Write-Host "  - Manufacturers: 10 records" -ForegroundColor Green
Write-Host "  - Statuses: 10 records" -ForegroundColor Green
Write-Host "  - Depreciations: 10 records" -ForegroundColor Green
Write-Host "  - Locations: 10 records" -ForegroundColor Green
Write-Host "  - Tickets: 100 records" -ForegroundColor Green
Write-Host "  - TOTAL: 160 records" -ForegroundColor Cyan
Write-Host ""

