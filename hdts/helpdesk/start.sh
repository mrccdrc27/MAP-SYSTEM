#!/bin/sh
set -e

echo "Waiting for database to be ready..."
until python manage.py showmigrations >/dev/null 2>&1; do
  echo "Database unavailable, retrying in 2s..."
  sleep 2
done

echo "Database is ready!"

# Apply migrations
echo "Running makemigrations..."
python manage.py makemigrations --noinput

echo "Applying migrations..."
python manage.py migrate --noinput

# Seed data (only if needed - check if already seeded to avoid duplicates)
python manage.py seed_employees --count=20 || true
python manage.py seed_tickets_open --count=25 || true

# Start Django development server
echo "Starting Django development server on 0.0.0.0:8000..."
python manage.py runserver 0.0.0.0:8000
