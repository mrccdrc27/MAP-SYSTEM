#!/bin/sh

# Apply migrations
python manage.py makemigrations
python manage.py seed_workflows
python manage.py migrate

# Start Gunicorn server
gunicorn workflow_api.wsgi:application --bind 0.0.0.0:8000