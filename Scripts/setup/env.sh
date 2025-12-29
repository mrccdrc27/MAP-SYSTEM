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