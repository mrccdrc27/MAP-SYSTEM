#!/bin/sh

echo "Running migrations..."
python manage.py makemigrations --noinput
python manage.py migrate --noinput

echo "Starting messaging service with Gunicorn..."
exec gunicorn messaging.wsgi:application --bind 0.0.0.0:8001