#!/bin/sh

# Apply migrations
python manage.py makemigrations
python manage.py migrate
python manage.py collectstatic --noinput
# python manage.py flush --no-inppythout
python manage.py seed_role
python manage.py seed_workflows2


# Start Gunicorn server
gunicorn workflow_api.wsgi:application --bind 0.0.0.0:8000
