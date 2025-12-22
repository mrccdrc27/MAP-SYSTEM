#!/bin/bash
# Bash script to test all context seeders
# Run this from the backend/contexts directory

echo "========================================"
echo "  Context Seeders Test Script"
echo "========================================"
echo ""

# Check if Docker is running
echo "Checking Docker status..."
if ! docker ps > /dev/null 2>&1; then
    echo "ERROR: Docker is not running!"
    echo "Please start Docker and try again."
    exit 1
fi

echo "Docker is running ✓"
echo ""

# Check if backend-dev container exists
echo "Checking for backend-dev container..."
if ! docker ps -a --filter "name=backend-dev" --format "{{.Names}}" | grep -q "backend-dev"; then
    echo "ERROR: backend-dev container not found!"
    echo "Please start your Docker containers first."
    exit 1
fi

echo "Container found ✓"
echo ""

# Seed all contexts
echo "========================================"
echo "  Seeding All Context Data"
echo "========================================"
echo ""

docker exec -it backend-dev python manage.py seed_all_contexts --clear

echo ""
echo "========================================"
echo "  Seeding Complete!"
echo "========================================"
echo ""
echo "Summary:"
echo "  - Categories: 10 records"
echo "  - Suppliers: 10 records"
echo "  - Manufacturers: 10 records"
echo "  - Statuses: 10 records"
echo "  - Depreciations: 10 records"
echo "  - Locations: 10 records"
echo "  - Tickets: 100 records"
echo "  - TOTAL: 160 records"
echo ""

