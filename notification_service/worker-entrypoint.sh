#!/bin/bash

set -e

echo "Starting Notification Worker..."

# Wait for database to be ready (if using external database)
echo "Waiting for database..."
sleep 2

# No need to run migrations or setup templates in the worker
# The main service will handle that

echo "Starting Celery worker..."
exec celery -A notification_service worker --loglevel=info -Q notification-queue,inapp-notification-queue