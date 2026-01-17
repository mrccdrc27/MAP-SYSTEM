#!/bin/sh

# Exit immediately if a command exits with a non-zero status.
set -e

# Apply database migrations
echo "Applying budget_service migrations..."
python manage.py migrate --noinput

# Run the main seeder
echo "Running budget_service seeder..."
python manage.py controlled_seeder

# --- MODIFICATION START ---
# Run the Budget Caps seeder (Depends on controlled_seeder data)
echo "Seeding Budget Caps (Governance Rules)..."
python manage.py seed_budget_caps
# --- MODIFICATION END ---

# Generate the initial forecast data after seeding
echo "Generating budget_service forecast data..."
python manage.py generate_forecasts

# Collect static files
echo "Collecting static files for budget_service..."
python manage.py collectstatic --no-input --clear

# Then exec the container's main process (what's set as CMD in the Dockerfile).
exec "$@"