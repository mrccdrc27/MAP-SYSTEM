#!/bin/bash

set -e # Exit on any error

# Function to convert line endings to Unix-style
convert_to_unix() {
    if [ -f "$1/$2" ]; then
        dos2unix "$1/$2" > /dev/null 2>&1
        echo "Converted $1/$2"
    fi
}

# Step 1: Convert script files to Unix-style line endings
echo "Converting script files to Unix-style line endings..."
convert_to_unix "tts/frontend" "start.sh"
convert_to_unix "tts/ticket_service" "start.sh"
convert_to_unix "tts/workflow_api" "start.sh"
convert_to_unix "hdts/helpdesk" "entrypoint.sh"
convert_to_unix "hdts/helpdesk" "start.sh"
convert_to_unix "auth" "entrypoint.sh"
convert_to_unix "tts/messaging" "entrypoint.sh"
convert_to_unix "tts/notification_service" "entrypoint.sh"
convert_to_unix "tts/Docker/db-init" "init-multiple-dbs.sh"
echo "Line ending conversion complete."

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