#!/bin/bash
# Wait for database to be ready (if using external DB)
# For SQLite, we don't need to wait

echo "Running migrations..."
python manage.py makemigrations
python manage.py migrate

echo "Starting messaging service on port 8001..."
python manage.py runserver 8001
exec "$@"