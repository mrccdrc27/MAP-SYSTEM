#!/bin/bash

set -e # Exit on any error

# Function to convert CRLF to LF in-place
convert_line_endings() {
    if [ -f "$1" ]; then
        # Use sed to convert CRLF to LF (cross-platform compatible)
        sed -i 's/\r$//' "$1"
        echo "Fixed line endings: $1"
    fi
}

# Step 1: Convert script files to Unix-style line endings
echo "Converting script files to Unix-style line endings..."
convert_line_endings "tts/frontend/start.sh"
convert_line_endings "tts/ticket_service/start.sh"
convert_line_endings "tts/workflow_api/start.sh"
convert_line_endings "hdts/helpdesk/entrypoint.sh"
convert_line_endings "hdts/helpdesk/start.sh"
convert_line_endings "auth/entrypoint.sh"
convert_line_endings "tts/messaging/entrypoint.sh"
convert_line_endings "tts/notification_service/entrypoint.sh"
convert_line_endings "tts/Docker/db-init/init-multiple-dbs.sh"
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