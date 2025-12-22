#!/bin/bash

set -e # Exit on any error

# Step 1: Execute the dos2unix.sh script
if [ -f "./Scripts/dos2unix.sh" ]; then
    echo "Running dos2unix.sh..."
    bash ./Scripts/dos2unix.sh
else
    echo "dos2unix.sh script not found!"
    exit 1
fi

# Step 2: Navigate to Docker directory
echo "Navigating to Docker directory..."
cd tts/Docker

# Step 3: Build Docker images
echo "Building Docker images..."
docker-compose build

# Step 4: Start Docker Compose
echo "Starting Docker Compose..."
docker-compose up -d

echo "Docker setup complete."