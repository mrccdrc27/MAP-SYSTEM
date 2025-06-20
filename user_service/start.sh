#!/bin/sh

# Apply migrations
python manage.py makemigrations
python manage.py seed_workflows
python manage.py migrate
celery -A workflow_api worker --pool=solo --loglevel=info -Q ticket_tasks9
celery -A workflow_api worker --pool=solo --loglevel=info -Q role_send9
# Start Gunicorn server
gunicorn workflow_api.wsgi:application --bind 0.0.0.0:8000