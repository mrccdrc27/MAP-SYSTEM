#!/bin/bash
# Database Seeding Helper Script
# This script makes it easy to seed your database with sample data

set -e

CONTAINER_NAME="assets-service"

echo "╔════════════════════════════════════════════════════════════╗"
echo "║         Asset Management System - Database Seeder         ║"
echo "╚════════════════════════════════════════════════════════════╝"
echo ""

# Check if container is running
if ! docker ps | grep -q $CONTAINER_NAME; then
    echo "❌ Error: Container '$CONTAINER_NAME' is not running."
    echo "   Please start your Docker containers first:"
    echo "   docker-compose -f docker-compose.dev.yml up -d"
    exit 1
fi

echo "Select seeding option:"
echo ""
echo "  1) Seed Components (7 sample items)"
echo "  2) Seed All Data (Products, Assets, Components)"
echo "  3) Bulk Seed Components (50+ random items)"
echo "  4) Clear All Data"
echo "  5) Clear and Reseed All"
echo "  6) Custom Component Count"
echo ""
read -p "Enter your choice (1-6): " choice

case $choice in
    1)
        echo ""
        echo "🌱 Seeding components..."
        docker exec -it $CONTAINER_NAME python manage.py seed_components
        ;;
    2)
        echo ""
        echo "🌱 Seeding all data (products, assets, components)..."
        docker exec -it $CONTAINER_NAME python manage.py seed_all
        ;;
    3)
        echo ""
        echo "🌱 Bulk seeding 50 components..."
        docker exec -it $CONTAINER_NAME python manage.py seed_components_bulk --count 50
        ;;
    4)
        echo ""
        read -p "⚠️  Are you sure you want to clear all data? (yes/no): " confirm
        if [ "$confirm" = "yes" ]; then
            echo "🗑️  Clearing all data..."
            docker exec -it $CONTAINER_NAME python manage.py seed_all --clear
            echo "✓ Data cleared successfully"
        else
            echo "Cancelled."
        fi
        ;;
    5)
        echo ""
        read -p "⚠️  This will clear and reseed all data. Continue? (yes/no): " confirm
        if [ "$confirm" = "yes" ]; then
            echo "🗑️  Clearing and reseeding..."
            docker exec -it $CONTAINER_NAME python manage.py seed_all --clear
            echo "✓ Data cleared and reseeded successfully"
        else
            echo "Cancelled."
        fi
        ;;
    6)
        echo ""
        read -p "Enter number of components to create: " count
        echo "🌱 Creating $count components..."
        docker exec -it $CONTAINER_NAME python manage.py seed_components_bulk --count $count
        ;;
    *)
        echo "❌ Invalid choice. Please run the script again."
        exit 1
        ;;
esac

echo ""
echo "✓ Seeding operation completed!"
echo ""
echo "You can now access your data at:"
echo "  - Frontend: http://localhost:8000"
echo "  - Assets API: http://localhost:8002/assets/"
echo "  - Components API: http://localhost:8002/components/"
echo ""

