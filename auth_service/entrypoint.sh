#!/bin/sh

# Exit immediately if a command exits with a non-zero status.
set -e

# Apply database migrations
echo "Applying auth_service migrations..."
python manage.py migrate --noinput

# Run the seeder
echo "Running auth_service seeder..."
python manage.py auth_seeder

# Collect static files
echo "Collecting static files for auth_service..."
python manage.py collectstatic --no-input --clear

# Then exec the container's main process (what's set as CMD in the Dockerfile).
exec "$@"