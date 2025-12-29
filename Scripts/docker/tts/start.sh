#!/bin/bash

set -e # Exit on any error

# Function to convert CRLF to LF in-place
convert_line_endings() {
    if [ -f "$1" ]; then
        # Use sed to convert CRLF to LF (cross-platform compatible)
        sed -i 's/\r$//' "$1"
        # Only echo if verbose
        # echo "Fixed line endings: $1"
    fi
}

echo "Preparing scripts..."
# Step 1: Convert script files to Unix-style line endings
# These paths are relative to PROJECT_ROOT
convert_line_endings "tts/frontend/start.sh"
convert_line_endings "tts/ticket_service/start.sh"
convert_line_endings "tts/workflow_api/start.sh"
convert_line_endings "hdts/helpdesk/entrypoint.sh"
convert_line_endings "hdts/helpdesk/start.sh"
convert_line_endings "auth/entrypoint.sh"
convert_line_endings "tts/messaging/entrypoint.sh"
convert_line_endings "tts/notification_service/entrypoint.sh"
convert_line_endings "tts/Docker/db-init/init-multiple-dbs.sh"

# Step 2: Navigate to Docker directory
# This assumes the script is run from PROJECT_ROOT
if [ -d "tts/Docker" ]; then
    cd tts/Docker
else
    echo "Error: tts/Docker directory not found from $(pwd)"
    exit 1
fi

# Step 3: Build and Start
echo "Building and Starting Docker Compose..."
docker-compose up -d --build

echo "TTS Docker environment started."
