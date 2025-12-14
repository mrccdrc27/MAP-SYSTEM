#!/bin/sh
# Start Celery worker for notification_service
# Use -P solo on Windows to avoid multiprocessing permission issues
celery -A notification_service worker --loglevel=info -P solo -Q inapp-notification-queue,notification-queue-default
