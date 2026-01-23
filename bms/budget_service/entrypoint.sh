#!/bin/sh

# Exit immediately if a command exits with a non-zero status.
set -e

# Apply database migrations
echo "Applying budget_service migrations..."
python manage.py migrate --noinput

# --- MODIFICATION START: Data Cleanup ---
# Ensure legacy categories don't break new seeders
echo "Cleaning up legacy categories..."
python manage.py cleanup_categories
# --- MODIFICATION END ---

# Run the main seeder (Creates Fiscal Years, Users, Departments, Base Categories, Proposals)
echo "Running budget_service seeder..."
python manage.py controlled_seeder

# --- MODIFICATION START: Data Integrity & Rules ---
# 1. Ensure allocations exist for all approved proposals (Critical for Expenses)
echo "Fixing missing allocations..."
python manage.py fix_missing_allocations

# 2. Seed Budget Caps (Governance Rules)
echo "Seeding Budget Caps (Governance Rules)..."
python manage.py seed_budget_caps
# --- MODIFICATION END ---

# Generate the initial forecast data (Depends on Expenses existing)
echo "Generating budget_service forecast data..."
python manage.py generate_forecasts

# Collect static files
echo "Collecting static files for budget_service..."
python manage.py collectstatic --no-input --clear

# Then exec the container's main process (what's set as CMD in the Dockerfile).
exec "$@"