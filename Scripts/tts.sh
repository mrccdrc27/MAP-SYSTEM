#!/bin/bash

set -e # Exit on any error

# Function to copy .env if it doesn't exist
setup_env() {
    if [ ! -f .env ]; then
        cp .env.example .env
        echo ".env created from .env.example"
    else
        echo ".env already exists, skipping copy."
    fi
}
setup_env

# worker command - Workflow_API
cd workflow_api
python manage.py flush --no-input
celery -A workflow_api worker --pool=solo --loglevel=info -Q role_send-default,TICKET_TASKS_PRODUCTION,tts.role.sync,tts.user_system_role.sync
cd ..

# Start user_service
echo "Starting user_service..."
cd user_service
celery -A user_service worker --pool=solo --loglevel=info -Q notification-queue-prod & 
python manage.py flush --no-input
python manage.py makemigrations
python manage.py migrate
python manage.py seed_accounts
python manage.py runserver 0.0.0.0:8001 &
cd ..

echo "Celery worker for workflow_api started in background."

# Start workflow_api
echo "Starting workflow_api..."
cd workflow_api
python manage.py makemigrations --no-input
python manage.py migrate
python manage.py seed_workflows2

# Start Django server for workflow_api
python manage.py runserver 0.0.0.0:8002 &
cd ..

# Start ticket_service
echo "Starting ticket_service..."
cd ticket_service
python manage.py flush --no-input
python manage.py makemigrations
python manage.py migrate
python manage.py seed_tickets
python manage.py runserver 0.0.0.0:8004 &
cd ..

# Start React app
# echo "Starting React app..."
# cd frontend
# # setup_env
# # npx json-server --watch db.json --port 5000 --host 0.0.0.0 &
# npm install
# npm run dev &

echo "All services started."
