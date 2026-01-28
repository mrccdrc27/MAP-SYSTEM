#!/bin/sh

# Exit immediately if a command exits with a non-zero status.
set -e

# Apply database migrations
echo "Applying budget_service migrations..."
python manage.py migrate --noinput

# --- MODIFICATION START: Production-Ready Logic ---

# 1. Always Initialize Master Data (Required for App to Function)
# This creates FY, Departments, Accounts, Categories needed for UI dropdowns
echo "Initializing Master Data (System Requirements)..."
python manage.py init_system_data

# 2. Optional: Seed Demo Data (Only if env var is set)
if [ "$SEED_DEMO_DATA" = "true" ]; then
    echo "SEED_DEMO_DATA is true. Running controlled seeder..."
    python manage.py cleanup_categories
    python manage.py controlled_seeder
    python manage.py fix_missing_allocations
    
    # 3. Seed Caps (Depends on Categories existing)
    echo "Seeding Budget Caps..."
    python manage.py seed_budget_caps
    
    # 4. Generate Forecasts (Depends on Expenses existing)
    echo "Generating Forecasts..."
    python manage.py generate_forecasts
else
    echo "Skipping Demo Data Seeding (Production Mode)"
    # We still run seed_budget_caps because it sets default policies for departments
    # which is valid Master Data, not just demo data
    python manage.py seed_budget_caps
fi
# --- MODIFICATION END ---

# Collect static files
echo "Collecting static files for budget_service..."
python manage.py collectstatic --no-input --clear

# Then exec the container's main process
exec "$@"