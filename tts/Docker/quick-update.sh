#!/bin/bash

# Quick Update Script - Rebuilds and restarts services
# Use this for most updates (faster than full rebuild)

set -e

echo "🔄 Quick update: rebuilding and restarting services..."
docker-compose up --build -d

echo "📊 Checking service status..."
docker-compose ps

echo "✅ Services updated successfully!"