#!/bin/bash
# Seed Tickets with Attachments (Docker Version)
# Usage: ./seed_tickets_with_attachments.sh [--count COUNT] [--min-attachments MIN] [--max-attachments MAX] [--service SERVICE]

set -e

# Default values
COUNT=0
MIN_ATTACHMENTS=2
MAX_ATTACHMENTS=4
SERVICE="helpdesk-service"

# Parse command line arguments
while [[ $# -gt 0 ]]; do
    case $1 in
        --count)
            COUNT="$2"
            shift 2
            ;;
        --min-attachments)
            MIN_ATTACHMENTS="$2"
            shift 2
            ;;
        --max-attachments)
            MAX_ATTACHMENTS="$2"
            shift 2
            ;;
        --service)
            SERVICE="$2"
            shift 2
            ;;
        *)
            echo "Unknown option: $1"
            echo "Usage: $0 [--count COUNT] [--min-attachments MIN] [--max-attachments MAX] [--service SERVICE]"
            exit 1
            ;;
    esac
done

# Get script directory and workspace root
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
WORKSPACE_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"
COMPOSE_FILE="$WORKSPACE_ROOT/tts/Docker/docker-compose.yml"

echo ""
echo "=== Seed Tickets with Attachments (Docker) ==="

# Prompt for count if not provided
if [[ "$COUNT" -eq 0 ]]; then
    echo -n "How many tickets do you want to seed? (Default: 10) "
    read -r INPUT_VAL
    if [[ -z "$INPUT_VAL" ]]; then
        COUNT=10
    elif [[ "$INPUT_VAL" =~ ^[0-9]+$ ]]; then
        COUNT="$INPUT_VAL"
    else
        echo "Invalid number. Using default 10."
        COUNT=10
    fi
fi

# Prompt for min attachments
echo -n "Min attachments per ticket? (Default: $MIN_ATTACHMENTS) "
read -r MIN_INPUT
if [[ -n "$MIN_INPUT" ]] && [[ "$MIN_INPUT" =~ ^[0-9]+$ ]]; then
    MIN_ATTACHMENTS="$MIN_INPUT"
fi

# Prompt for max attachments
echo -n "Max attachments per ticket? (Default: $MAX_ATTACHMENTS) "
read -r MAX_INPUT
if [[ -n "$MAX_INPUT" ]] && [[ "$MAX_INPUT" =~ ^[0-9]+$ ]]; then
    MAX_ATTACHMENTS="$MAX_INPUT"
fi

# Ensure min <= max
if [[ "$MIN_ATTACHMENTS" -gt "$MAX_ATTACHMENTS" ]]; then
    echo "Min attachments cannot be greater than max. Setting min = max."
    MIN_ATTACHMENTS="$MAX_ATTACHMENTS"
fi

echo ""
echo "Seeding $COUNT tickets with $MIN_ATTACHMENTS-$MAX_ATTACHMENTS attachments each..."
echo "File types: PDF, DOCX, XLSX, PNG"

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
docker-compose -f "$COMPOSE_FILE" exec -T "$SERVICE" python manage.py seed_tickets_with_attachments \
    --count "$COUNT" \
    --min-attachments "$MIN_ATTACHMENTS" \
    --max-attachments "$MAX_ATTACHMENTS"

if [[ $? -eq 0 ]]; then
    echo ""
    echo "Success! Attachments saved to container's /app/media/ticket_attachments/"
else
    echo "Command failed with exit code $?"
    exit 1
fi
