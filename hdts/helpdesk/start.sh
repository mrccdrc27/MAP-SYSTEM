#!/bin/sh

# Apply migrations
python manage.py makemigrations
python manage.py migrate

# Seed data (only if needed - check if already seeded to avoid duplicates)
python manage.py seed_employees --count=20 || true
python manage.py seed_tickets_open --count=25 || true

# Start Django development server
echo "Starting Django development server on 0.0.0.0:8000..."
python manage.py runserver 0.0.0.0:8000
