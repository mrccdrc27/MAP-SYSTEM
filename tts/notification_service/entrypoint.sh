#!/bin/bash

set -e

echo "Starting Notification Service..."

# Wait for database to be ready (if using external database)
echo "Waiting for database..."
sleep 2

# Run migrations
echo "Running migrations..."
python manage.py makemigrations
python manage.py migrate
python manage.py migrate django_celery_results

# Create superuser if it doesn't exist
# echo "Creating superuser if it doesn't exist..."
# python manage.py shell -c "
# from django.contrib.auth import get_user_model;
# User = get_user_model();
# if not User.objects.filter(username='admin').exists():
#     User.objects.create_superuser('admin', 'admin@example.com', 'admin123')
#     print('Superuser created successfully')
# else:
#     print('Superuser already exists')
# "

# Setup notification templates
echo "Setting up notification templates..."
python manage.py setup_notification_templates

# Collect static files
echo "Collecting static files..."
python manage.py collectstatic --noinput

# Start Daphne ASGI server (supports WebSockets)
echo "Starting Daphne ASGI server..."
exec daphne -b 0.0.0.0 -p 8001 notification_service.asgi:application