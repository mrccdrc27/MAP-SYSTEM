#!/bin/bash
# Bypass Transition Script (Docker Version)
# Calls the Django management command to execute workflow transitions on behalf of users
# Usage: ./bypass_transition.sh [TICKET_NUMBER] [OPTIONS]

set -e

# Default values
SERVICE="workflow-api"
NOTES="Admin bypass - executed via CLI script"
TRANSITION_ID=-1
AUTO=false
FINALIZE=false
DRY_RUN=false
TICKET_NUMBER=""

# Parse command line arguments
while [[ $# -gt 0 ]]; do
    case $1 in
        --auto)
            AUTO=true
            shift
            ;;
        --finalize)
            FINALIZE=true
            shift
            ;;
        --dry-run)
            DRY_RUN=true
            shift
            ;;
        --transition-id)
            TRANSITION_ID="$2"
            shift 2
            ;;
        --notes)
            NOTES="$2"
            shift 2
            ;;
        --service)
            SERVICE="$2"
            shift 2
            ;;
        *)
            if [[ -z "$TICKET_NUMBER" ]]; then
                TICKET_NUMBER="$1"
            fi
            shift
            ;;
    esac
done

# Get script directory and workspace root
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
WORKSPACE_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"
COMPOSE_FILE="$WORKSPACE_ROOT/tts/Docker/docker-compose.yml"

echo ""
echo "=========================================="
echo "  Bypass Transition - Admin Workflow Tool"
echo "  (Docker Version)"
echo "=========================================="
echo ""

# Check if compose file exists
if [[ ! -f "$COMPOSE_FILE" ]]; then
    echo "ERROR: Docker Compose file not found at: $COMPOSE_FILE"
    exit 1
fi

# Check if service is running
if ! docker-compose -f "$COMPOSE_FILE" ps --services --filter "status=running" 2>/dev/null | grep -q "^$SERVICE$"; then
    echo "ERROR: Service '$SERVICE' is not running."
    echo "Please start Docker services first."
    exit 1
fi

# Build command arguments
CMD_ARGS=()

if [[ -n "$TICKET_NUMBER" ]]; then
    CMD_ARGS+=("$TICKET_NUMBER")
fi

if [[ "$AUTO" == true ]]; then
    CMD_ARGS+=("--auto")
fi

if [[ "$FINALIZE" == true ]]; then
    CMD_ARGS+=("--finalize")
fi

if [[ "$DRY_RUN" == true ]]; then
    CMD_ARGS+=("--dry-run")
fi

if [[ "$TRANSITION_ID" -ge 0 ]]; then
    CMD_ARGS+=("--transition-id" "$TRANSITION_ID")
fi

if [[ -n "$NOTES" ]]; then
    CMD_ARGS+=("--notes" "$NOTES")
fi

echo "Service: $SERVICE"
echo "Executing: docker-compose exec $SERVICE python manage.py bypass_transition ${CMD_ARGS[*]}"
echo ""

# Execute the management command using docker-compose exec
docker-compose -f "$COMPOSE_FILE" exec -T "$SERVICE" python manage.py bypass_transition "${CMD_ARGS[@]}"

EXIT_CODE=$?
if [[ $EXIT_CODE -ne 0 ]]; then
    echo ""
    echo "Command exited with code: $EXIT_CODE"
fi

echo ""
