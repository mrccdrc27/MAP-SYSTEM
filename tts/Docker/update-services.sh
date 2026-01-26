#!/bin/bash

# Seamless Docker Compose Update Script
# This script provides a clean way to update and restart all services

set -e  # Exit on any error

echo "🧹 Cleaning up old containers and images..."
docker-compose down --remove-orphans

echo "🗑️  Removing dangling images..."
docker image prune -f

echo "🔨 Building fresh images..."
docker-compose build --no-cache

echo "🚀 Starting all services..."
docker-compose up -d

echo "📊 Checking service status..."
docker-compose ps

echo "✅ All services updated and running successfully!"
echo ""
echo "📋 Service URLs:"
echo "  Kong Gateway: http://localhost:8080"
echo "  Kong Admin: http://localhost:8001"
echo "  Workflow API: http://localhost:1001"
echo "  Auth Service: http://localhost:8003"
echo "  Helpdesk: http://localhost:5001"
echo "  Messaging: http://localhost:1002"
echo "  Notifications: http://localhost:1003"
echo "  Mailpit: http://localhost:8025"
echo "  RabbitMQ: http://localhost:15672"