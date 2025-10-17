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
convert_to_unix "frontend" "start.sh"
convert_to_unix "user_service" "start.sh"
convert_to_unix "ticket_service" "start.sh"
convert_to_unix "workflow_api" "start.sh"
convert_to_unix "Docker/db-init" "start.sh"

# auth uses entrypoint.sh instead of start.sh
convert_to_unix "auth" "entrypoint.sh"

# messaging also uses entrypoint.sh
convert_to_unix "messaging" "entrypoint.sh"

# Convert init-multiple-dbs.sh in Docker/db-init directory
convert_to_unix "Docker/db-init" "init-multiple-dbs.sh"

echo "Conversion complete."
