#!/bin/sh

# Apply migrations
python manage.py makemigrations
python manage.py migrate
python manage.py seed_employees --count=20
python manage.py seed_tickets_open --count=25


# # Start Gunicorn server
# gunicorn workflow_api.wsgi:application --bind 0.0.0.0:8000
