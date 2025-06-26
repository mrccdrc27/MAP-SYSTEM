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

# === Start workflow_api ===
cd workflow_api
python manage.py makemigrations --no-input
python manage.py migrate
# Start Celery workers
celery -A workflow_api worker --pool=solo --loglevel=info -Q role_send9 & 
celery -A workflow_api worker --pool=solo --loglevel=info -Q ticket_tasks9 &

# Start Django server
echo "Starting workflow_api..."
python manage.py runserver 0.0.0.0:2000 &
cd ..

# === Start user_service ===
echo "Starting user_service..."
cd user_service
python manage.py makemigrations
python manage.py migrate
python manage.py runserver 0.0.0.0:3000 &
cd ..

# === Start ticket_service ===
echo "Starting ticket_service..."
cd ticket_service
python manage.py makemigrations
python manage.py migrate
python manage.py runserver 0.0.0.0:8000 &
cd ..

# === Optionally Start task_service ===
# echo "Starting task_service..."
# cd task_service
# python manage.py makemigrations
# python manage.py migrate
# python manage.py runserver 0.0.0.0:4000 &
# cd ..

# === Start React App ===
echo "Starting React app..."
cd frontend
setup_env
npx json-server --watch db.json --port 5000 --host 0.0.0.0 &
npm install
npm run dev &

echo "All services started (no seed or flush)."
