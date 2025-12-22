#!/bin/bash

# Start Celery worker for in-app notifications
echo "Starting Celery worker for in-app notifications..."
# Use -P solo on Windows to avoid multiprocessing permission issues
celery -A notification_service worker --loglevel=info -P solo -Q inapp-notification-queue
