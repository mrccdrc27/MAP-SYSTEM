#!/bin/sh

# Apply migrations
python manage.py makemigrations
python manage.py migrate
python manage.py collectstatic --noinput
python manage.py seed_tickets
# python manage.py flush --no-inppythout
# python manage.py seed_role
# python manage.py seed_workflows2


# Start Gunicorn server
gunicorn ticket_service.wsgi:application --bind 0.0.0.0:7000
