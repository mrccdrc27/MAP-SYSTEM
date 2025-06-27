#!/bin/sh

# Apply migrations
python manage.py makemigrations
python manage.py migrate
python manage.py collectstatic --noinput
# python manage.py seed_accounts

# Start Gunicorn server
gunicorn user_service.wsgi:application --bind 0.0.0.0:8000
