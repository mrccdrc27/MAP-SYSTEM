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

# Set up environment for all services
echo "Setting up environment for all services..."
cd tts/frontend
setup_env
cd ../..

cd user_service
setup_env
cd ..

cd tts/ticket_service
setup_env
cd ../..

# developmental part

# Start JSON Server
echo "Starting JSON server..."
cd tts/frontend
npx json-server --watch db.json --port 5000 --host 0.0.0.0 &
cd ../..

# Start user_service
echo "Starting user_service..."
cd user_service
python manage.py migrate
python manage.py runserver 0.0.0.0:3000 &
cd ..

# Start ticket_service
echo "Starting ticket_service..."
cd tts/ticket_service
python manage.py flush --no-input
python manage.py makemigrations
python manage.py migrate
python manage.py seed_tickets
python manage.py runserver 0.0.0.0:4000 &
cd ../..

# Start React app
echo "Starting React app..."
cd tts/frontend
npm install
npm run dev &
cd ../..

echo "All services started successfully."
