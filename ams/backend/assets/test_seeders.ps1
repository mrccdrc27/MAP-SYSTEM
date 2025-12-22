# Test script for the updated seeders
# This script will seed 100 products and 100 assets

Write-Host "==========================================" -ForegroundColor Cyan
Write-Host "Testing Updated Seeders" -ForegroundColor Cyan
Write-Host "==========================================" -ForegroundColor Cyan
Write-Host ""

Write-Host "Step 1: Clearing and seeding 100 products..." -ForegroundColor Yellow
docker exec -it backend-dev python manage.py seed_products --clear

Write-Host ""
Write-Host "Step 2: Clearing and seeding 100 assets..." -ForegroundColor Yellow
docker exec -it backend-dev python manage.py seed_assets --clear

Write-Host ""
Write-Host "==========================================" -ForegroundColor Cyan
Write-Host "Verification" -ForegroundColor Cyan
Write-Host "==========================================" -ForegroundColor Cyan

Write-Host ""
Write-Host "Checking product count..." -ForegroundColor Yellow
docker exec -it backend-dev python manage.py shell -c "from assets_ms.models import Product; print(f'Total Products: {Product.objects.count()}')"

Write-Host ""
Write-Host "Checking asset count..." -ForegroundColor Yellow
docker exec -it backend-dev python manage.py shell -c "from assets_ms.models import Asset; print(f'Total Assets: {Asset.objects.count()}')"

Write-Host ""
Write-Host "Verifying all assets have valid products..." -ForegroundColor Yellow
docker exec -it backend-dev python manage.py shell -c "from assets_ms.models import Asset; print(f'Assets with valid products: {Asset.objects.filter(product__isnull=False).count()}')"

Write-Host ""
Write-Host "==========================================" -ForegroundColor Green
Write-Host "Seeding Complete!" -ForegroundColor Green
Write-Host "==========================================" -ForegroundColor Green

