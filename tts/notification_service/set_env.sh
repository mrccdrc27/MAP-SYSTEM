#!/bin/bash
# Environment variables for notification_service

# Django settings
export SECRET_KEY="django-insecure-16*1i1yo%z4_*-#82g=+c5*few2=q2#k&^z_)lo_r&tl2szy1k"
export DEBUG="True"
export ALLOWED_HOSTS="localhost,127.0.0.1"

# Celery configuration
export CELERY_BROKER_URL="amqp://admin:admin@localhost:5672/"
export NOTIFICATION_QUEUE="notification-queue"
export INAPP_NOTIFICATION_QUEUE="inapp-notification-queue"

# Service configurations
export NOTIFICATION_SERVICE_PORT="8001"
export AUTH_SERVICE_URL="http://localhost:8000"

# API keys
export NOTIFICATION_API_KEYS="demo-api-key-123,test-api-key-456"
export API_KEY="in-app-notification-api-key-secure"

# JWT authentication
export JWT_SHARED_SECRET_KEY="your-shared-jwt-secret-key-here"

echo "Environment variables set for notification_service"
echo "CELERY_BROKER_URL: $CELERY_BROKER_URL"
echo "INAPP_NOTIFICATION_QUEUE: $INAPP_NOTIFICATION_QUEUE"