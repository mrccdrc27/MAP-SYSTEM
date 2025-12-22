#!/bin/bash

# Test script for the updated seeders
# This script will seed 100 products and 100 assets

echo "=========================================="
echo "Testing Updated Seeders"
echo "=========================================="
echo ""

echo "Step 1: Clearing and seeding 100 products..."
docker exec -it backend-dev python manage.py seed_products --clear

echo ""
echo "Step 2: Clearing and seeding 100 assets..."
docker exec -it backend-dev python manage.py seed_assets --clear

echo ""
echo "=========================================="
echo "Verification"
echo "=========================================="

echo ""
echo "Checking product count..."
docker exec -it backend-dev python manage.py shell -c "from assets_ms.models import Product; print(f'Total Products: {Product.objects.count()}')"

echo ""
echo "Checking asset count..."
docker exec -it backend-dev python manage.py shell -c "from assets_ms.models import Asset; print(f'Total Assets: {Asset.objects.count()}')"

echo ""
echo "Verifying all assets have valid products..."
docker exec -it backend-dev python manage.py shell -c "from assets_ms.models import Asset; print(f'Assets with valid products: {Asset.objects.filter(product__isnull=False).count()}')"

echo ""
echo "=========================================="
echo "Seeding Complete!"
echo "=========================================="

