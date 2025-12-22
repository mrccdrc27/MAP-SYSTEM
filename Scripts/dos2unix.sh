#!/bin/bash

set -e # Exit on any error

# Function to convert line endings to Unix-style
convert_to_unix() {
    if [ -f "$1/$2" ]; then
        dos2unix "$1/$2" > /dev/null 2>&1
        echo "Converted $1/$2"
    fi
}

# Convert start.sh in all service directories
echo "Converting script files to Unix-style line endings..."
convert_to_unix "tts/frontend" "start.sh"
convert_to_unix "tts/ticket_service" "start.sh"
convert_to_unix "tts/workflow_api" "start.sh"
convert_to_unix "hdts/helpdesk" "entrypoint.sh"
convert_to_unix "hdts/helpdesk" "start.sh"

# auth uses entrypoint.sh instead of start.sh
convert_to_unix "auth" "entrypoint.sh"

# messaging also uses entrypoint.sh
convert_to_unix "tts/messaging" "entrypoint.sh"

# notification service uses entrypoint.sh
convert_to_unix "tts/notification_service" "entrypoint.sh"

# Convert init-multiple-dbs.sh in Docker/db-init directory
convert_to_unix "tts/Docker/db-init" "init-multiple-dbs.sh"

echo "Conversion complete."