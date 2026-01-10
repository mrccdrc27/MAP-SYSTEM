#!/bin/bash
# Seed Employees in HDTS (Docker Version)
# Usage: ./seed_employees_hdts.sh [--count COUNT] [--service SERVICE]

set -e

# Default values
COUNT=0
SERVICE="helpdesk-service"

# Parse command line arguments
while [[ $# -gt 0 ]]; do
    case $1 in
        --count)
            COUNT="$2"
            shift 2
            ;;
        --service)
            SERVICE="$2"
            shift 2
            ;;
        *)
            echo "Unknown option: $1"
            echo "Usage: $0 [--count COUNT] [--service SERVICE]"
            exit 1
            ;;
    esac
done

# Get script directory and workspace root
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
WORKSPACE_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"
COMPOSE_FILE="$WORKSPACE_ROOT/tts/Docker/docker-compose.yml"

# Prompt for count if not provided
if [[ "$COUNT" -eq 0 ]]; then
    echo -n "How many employees do you want to seed in HDTS? (Default: 150) "
    read -r INPUT_VAL
    if [[ -z "$INPUT_VAL" ]]; then
        COUNT=150
    elif [[ "$INPUT_VAL" =~ ^[0-9]+$ ]]; then
        COUNT="$INPUT_VAL"
    else
        echo "Invalid number. Using default 150."
        COUNT=150
    fi
fi

echo "Seeding $COUNT employees in HDTS (Docker)..."

# Check if compose file exists
if [[ ! -f "$COMPOSE_FILE" ]]; then
    echo "ERROR: Docker Compose file not found at: $COMPOSE_FILE"
    exit 1
fi

# Check if service is running
if ! docker-compose -f "$COMPOSE_FILE" ps --services --filter "status=running" 2>/dev/null | grep -q "^$SERVICE$"; then
    echo "ERROR: Service '$SERVICE' is not running. Please start Docker services first."
    exit 1
fi

echo "Executing command in service: $SERVICE"

# Execute the Django management command using docker-compose exec
docker-compose -f "$COMPOSE_FILE" exec -T "$SERVICE" python manage.py seed_employees --count "$COUNT"

if [[ $? -eq 0 ]]; then
    echo "Success."
else
    echo "Command failed with exit code $?"
    exit 1
fi
