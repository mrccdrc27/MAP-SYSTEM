# Database Seeding Helper Script for Windows PowerShell
# This script makes it easy to seed your database with sample data

$CONTAINER_NAME = "assets-service"

Write-Host "╔════════════════════════════════════════════════════════════╗" -ForegroundColor Cyan
Write-Host "║         Asset Management System - Database Seeder         ║" -ForegroundColor Cyan
Write-Host "╚════════════════════════════════════════════════════════════╝" -ForegroundColor Cyan
Write-Host ""

# Check if container is running
$containerRunning = docker ps --format "{{.Names}}" | Select-String -Pattern $CONTAINER_NAME -Quiet

if (-not $containerRunning) {
    Write-Host "❌ Error: Container '$CONTAINER_NAME' is not running." -ForegroundColor Red
    Write-Host "   Please start your Docker containers first:" -ForegroundColor Yellow
    Write-Host "   docker-compose -f docker-compose.dev.yml up -d" -ForegroundColor Yellow
    exit 1
}

Write-Host "Select seeding option:" -ForegroundColor Green
Write-Host ""
Write-Host "  1) Seed Components (7 sample items)"
Write-Host "  2) Seed All Data (Products, Assets, Components)"
Write-Host "  3) Bulk Seed Components (50+ random items)"
Write-Host "  4) Clear All Data"
Write-Host "  5) Clear and Reseed All"
Write-Host "  6) Custom Component Count"
Write-Host ""

$choice = Read-Host "Enter your choice (1-6)"

switch ($choice) {
    "1" {
        Write-Host ""
        Write-Host "🌱 Seeding components..." -ForegroundColor Green
        docker exec -it $CONTAINER_NAME python manage.py seed_components
    }
    "2" {
        Write-Host ""
        Write-Host "🌱 Seeding all data (products, assets, components)..." -ForegroundColor Green
        docker exec -it $CONTAINER_NAME python manage.py seed_all
    }
    "3" {
        Write-Host ""
        Write-Host "🌱 Bulk seeding 50 components..." -ForegroundColor Green
        docker exec -it $CONTAINER_NAME python manage.py seed_components_bulk --count 50
    }
    "4" {
        Write-Host ""
        $confirm = Read-Host "⚠️  Are you sure you want to clear all data? (yes/no)"
        if ($confirm -eq "yes") {
            Write-Host "🗑️  Clearing all data..." -ForegroundColor Yellow
            docker exec -it $CONTAINER_NAME python manage.py seed_all --clear
            Write-Host "✓ Data cleared successfully" -ForegroundColor Green
        } else {
            Write-Host "Cancelled." -ForegroundColor Yellow
        }
    }
    "5" {
        Write-Host ""
        $confirm = Read-Host "⚠️  This will clear and reseed all data. Continue? (yes/no)"
        if ($confirm -eq "yes") {
            Write-Host "🗑️  Clearing and reseeding..." -ForegroundColor Yellow
            docker exec -it $CONTAINER_NAME python manage.py seed_all --clear
            Write-Host "✓ Data cleared and reseeded successfully" -ForegroundColor Green
        } else {
            Write-Host "Cancelled." -ForegroundColor Yellow
        }
    }
    "6" {
        Write-Host ""
        $count = Read-Host "Enter number of components to create"
        Write-Host "🌱 Creating $count components..." -ForegroundColor Green
        docker exec -it $CONTAINER_NAME python manage.py seed_components_bulk --count $count
    }
    default {
        Write-Host "❌ Invalid choice. Please run the script again." -ForegroundColor Red
        exit 1
    }
}

Write-Host ""
Write-Host "✓ Seeding operation completed!" -ForegroundColor Green
Write-Host ""
Write-Host "You can now access your data at:" -ForegroundColor Cyan
Write-Host "  - Frontend: http://localhost:8000" -ForegroundColor White
Write-Host "  - Assets API: http://localhost:8002/assets/" -ForegroundColor White
Write-Host "  - Components API: http://localhost:8002/components/" -ForegroundColor White
Write-Host ""

