#!/bin/bash
# HDTS Controlled Ticket Seeder Script (Docker Version)
# Seeds tickets with historical patterns from CSV/JSON files
#
# Usage Examples:
#   ./seed_controlled.sh                                  # Interactive file selection
#   ./seed_controlled.sh historical_seed_plan.csv         # Specific CSV file
#   ./seed_controlled.sh --service helpdesk-service       # Specify container/service
#   ./seed_controlled.sh --help                           # Show help

set -e

# Script directory and project root
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"
COMPOSE_FILE="$PROJECT_ROOT/tts/Docker/docker-compose.yml"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
GRAY='\033[0;90m'
NC='\033[0m' # No Color

# Default values
SERVICE="helpdesk-service"
FILE_PATH=""

# Help function
show_help() {
    echo ""
    echo -e "${CYAN}HDTS Controlled Ticket Seeder (Docker)${NC}"
    echo -e "${CYAN}=======================================${NC}"
    echo ""
    echo "Seeds tickets with a controlled historical pattern from a JSON or CSV file."
    echo "This version executes inside a Docker container."
    echo ""
    echo -e "${YELLOW}USAGE:${NC}"
    echo "  ./seed_controlled.sh [OPTIONS] [FILE]"
    echo ""
    echo -e "${YELLOW}OPTIONS:${NC}"
    echo "  --service <name>    Docker service name (default: helpdesk-service)"
    echo "  --help, -h          Show this help message"
    echo ""
    echo -e "${YELLOW}ARGUMENTS:${NC}"
    echo "  FILE    Path to the seed plan file (JSON or CSV)"
    echo "          The file must exist inside the container or be mounted"
    echo "          If not provided, will use default 'historical_seed_plan.csv'"
    echo ""
    echo -e "${YELLOW}FILE FORMAT (CSV):${NC}"
    echo "  days_ago,date,time,category,sub_category,count,priority,department"
    echo "  0,2025-01-10,09:00,IT Support,Technical Assistance,5,High,IT Department"
    echo ""
    echo -e "${YELLOW}EXAMPLES:${NC}"
    echo "  # Use default file"
    echo "  ./seed_controlled.sh"
    echo ""
    echo "  # Seed from a specific CSV file (must exist in container)"
    echo "  ./seed_controlled.sh historical_seed_plan.csv"
    echo ""
    echo "  # Use different service"
    echo "  ./seed_controlled.sh --service hdts-service seed_plan.csv"
    echo ""
    exit 0
}

# Parse arguments
while [[ $# -gt 0 ]]; do
    case $1 in
        --service)
            SERVICE="$2"
            shift 2
            ;;
        --help|-h)
            show_help
            ;;
        -*)
            echo -e "${RED}Unknown option: $1${NC}"
            echo "Use --help for usage information"
            exit 1
            ;;
        *)
            FILE_PATH="$1"
            shift
            ;;
    esac
done

echo ""
echo -e "${CYAN}==========================================${NC}"
echo -e "${CYAN}  HDTS Controlled Ticket Seeder${NC}"
echo -e "${CYAN}  (Docker Version)${NC}"
echo -e "${CYAN}==========================================${NC}"
echo ""

# Check if compose file exists
if [[ ! -f "$COMPOSE_FILE" ]]; then
    echo -e "${RED}ERROR: Docker Compose file not found at: $COMPOSE_FILE${NC}"
    exit 1
fi

# Check if service is running
SERVICE_STATUS=$(docker-compose -f "$COMPOSE_FILE" ps --services --filter "status=running" 2>/dev/null | grep -w "$SERVICE" || true)

if [[ -z "$SERVICE_STATUS" ]]; then
    echo -e "${RED}ERROR: Service '$SERVICE' is not running.${NC}"
    echo -e "${YELLOW}Please start Docker services first.${NC}"
    exit 1
fi

# Build command arguments
CMD_ARGS=""
if [[ -n "$FILE_PATH" ]]; then
    CMD_ARGS="$FILE_PATH"
fi

echo -e "${GRAY}Service: $SERVICE${NC}"
echo -e "${GRAY}Executing: docker-compose exec $SERVICE python manage.py seed_controlled $CMD_ARGS${NC}"
echo ""

# Execute the management command using docker-compose exec
if [[ -n "$CMD_ARGS" ]]; then
    docker-compose -f "$COMPOSE_FILE" exec -T "$SERVICE" python manage.py seed_controlled "$CMD_ARGS"
else
    docker-compose -f "$COMPOSE_FILE" exec -T "$SERVICE" python manage.py seed_controlled
fi

EXIT_CODE=$?
if [[ $EXIT_CODE -eq 0 ]]; then
    echo -e "${GREEN}Success.${NC}"
else
    echo -e "${RED}Command failed with exit code $EXIT_CODE${NC}"
    exit $EXIT_CODE
fi

echo ""
