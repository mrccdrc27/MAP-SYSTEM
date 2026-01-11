#!/bin/bash
# Seed Asset Tickets for AMS Integration (Docker Version)
# Creates HDTS tickets for Asset Check-In/Check-Out workflows
# Usage: ./seed_asset_tickets.sh [--count COUNT] [--type TYPE] [--days-ago DAYS] [--days-range RANGE]

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
GRAY='\033[0;90m'
NC='\033[0m' # No Color

# Default values
COUNT=0
TICKET_TYPE="both"
DAYS_AGO=0
DAYS_RANGE=0
SERVICE="helpdesk-service"

# Parse command line arguments
while [[ $# -gt 0 ]]; do
    case $1 in
        --count|-c)
            COUNT="$2"
            shift 2
            ;;
        --type|-t)
            TICKET_TYPE="$2"
            shift 2
            ;;
        --days-ago|-d)
            DAYS_AGO="$2"
            shift 2
            ;;
        --days-range|-r)
            DAYS_RANGE="$2"
            shift 2
            ;;
        --service|-s)
            SERVICE="$2"
            shift 2
            ;;
        --help|-h)
            echo ""
            echo "Seed Asset Tickets for AMS Integration"
            echo ""
            echo "Usage: $0 [OPTIONS]"
            echo ""
            echo "Options:"
            echo "  --count, -c COUNT        Number of tickets to create (default: prompts)"
            echo "  --type, -t TYPE          Type of tickets: checkout, checkin, both (default: both)"
            echo "  --days-ago, -d DAYS      Create tickets N days in the past (default: 0)"
            echo "  --days-range, -r RANGE   Randomize days-ago within range (default: 0)"
            echo "  --service, -s SERVICE    Docker service name (default: helpdesk-service)"
            echo "  --help, -h               Show this help message"
            echo ""
            echo "Examples:"
            echo "  $0 --count 10                      # Create 10 mixed tickets"
            echo "  $0 --count 5 --type checkout       # Create 5 checkout tickets"
            echo "  $0 --count 5 --type checkin        # Create 5 checkin tickets"
            echo "  $0 --count 20 --days-ago 30        # Create 20 tickets dated 30 days ago"
            echo "  $0 -c 10 -t both -d 15 -r 10       # 10 tickets, 5-25 days ago"
            echo ""
            exit 0
            ;;
        *)
            echo -e "${RED}Unknown option: $1${NC}"
            echo "Use --help for usage information"
            exit 1
            ;;
    esac
done

# Get script directory and workspace root
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
WORKSPACE_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"
COMPOSE_FILE="$WORKSPACE_ROOT/tts/Docker/docker-compose.yml"

echo ""
echo -e "${CYAN}=== Seed Asset Tickets for AMS Integration (Docker) ===${NC}"
echo ""

# Prompt for count if not provided
if [[ "$COUNT" -eq 0 ]]; then
    echo -n "How many asset tickets do you want to create? (Default: 10): "
    read -r INPUT_VAL
    if [[ -z "$INPUT_VAL" ]]; then
        COUNT=10
    elif [[ "$INPUT_VAL" =~ ^[0-9]+$ ]]; then
        COUNT="$INPUT_VAL"
    else
        echo -e "${YELLOW}Invalid number. Using default 10.${NC}"
        COUNT=10
    fi
fi

# Prompt for ticket type if using default
if [[ "$TICKET_TYPE" == "both" ]]; then
    echo ""
    echo "Ticket type options:"
    echo "  1) both     - Mix of checkout and checkin tickets"
    echo "  2) checkout - Only asset checkout tickets"
    echo "  3) checkin  - Only asset checkin tickets"
    echo ""
    echo -n "Select ticket type [1-3] (Default: 1 - both): "
    read -r TYPE_INPUT
    case "$TYPE_INPUT" in
        2)
            TICKET_TYPE="checkout"
            ;;
        3)
            TICKET_TYPE="checkin"
            ;;
        *)
            TICKET_TYPE="both"
            ;;
    esac
fi

# Prompt for days-ago (simulation mode)
if [[ "$DAYS_AGO" -eq 0 ]]; then
    echo ""
    echo -n "Create tickets in the past? Enter days ago (Default: 0 - today): "
    read -r DAYS_INPUT
    if [[ -n "$DAYS_INPUT" ]] && [[ "$DAYS_INPUT" =~ ^[0-9]+$ ]]; then
        DAYS_AGO="$DAYS_INPUT"
    fi
fi

# Prompt for days-range if days-ago > 0
if [[ "$DAYS_AGO" -gt 0 ]] && [[ "$DAYS_RANGE" -eq 0 ]]; then
    echo -n "Randomize within range? Enter +/- days (Default: 0 - exact): "
    read -r RANGE_INPUT
    if [[ -n "$RANGE_INPUT" ]] && [[ "$RANGE_INPUT" =~ ^[0-9]+$ ]]; then
        DAYS_RANGE="$RANGE_INPUT"
    fi
fi

# Display configuration
echo ""
echo -e "${CYAN}Configuration:${NC}"
echo -e "  Count:      ${GREEN}$COUNT${NC} tickets"
echo -e "  Type:       ${GREEN}$TICKET_TYPE${NC}"
if [[ "$DAYS_AGO" -gt 0 ]]; then
    if [[ "$DAYS_RANGE" -gt 0 ]]; then
        echo -e "  Date range: ${YELLOW}$((DAYS_AGO - DAYS_RANGE)) - $((DAYS_AGO + DAYS_RANGE)) days ago${NC}"
    else
        echo -e "  Date:       ${YELLOW}$DAYS_AGO days ago${NC}"
    fi
else
    echo -e "  Date:       ${GREEN}Today${NC}"
fi
echo -e "  Service:    ${GRAY}$SERVICE${NC}"
echo ""

# Check if compose file exists
if [[ ! -f "$COMPOSE_FILE" ]]; then
    echo -e "${RED}ERROR: Docker Compose file not found at: $COMPOSE_FILE${NC}"
    exit 1
fi

# Check if service is running
if ! docker-compose -f "$COMPOSE_FILE" ps --services --filter "status=running" 2>/dev/null | grep -q "^$SERVICE$"; then
    echo -e "${RED}ERROR: Service '$SERVICE' is not running.${NC}"
    echo "Please start Docker services first: cd $WORKSPACE_ROOT/tts/Docker && docker-compose up -d"
    exit 1
fi

# Build the command arguments
CMD_ARGS="--count $COUNT --type $TICKET_TYPE"
if [[ "$DAYS_AGO" -gt 0 ]]; then
    CMD_ARGS="$CMD_ARGS --days-ago $DAYS_AGO"
fi
if [[ "$DAYS_RANGE" -gt 0 ]]; then
    CMD_ARGS="$CMD_ARGS --days-range $DAYS_RANGE"
fi

echo -e "${GRAY}Executing: docker-compose exec $SERVICE python manage.py seed_asset_tickets $CMD_ARGS${NC}"
echo ""

# Execute the Django management command using docker-compose exec
docker-compose -f "$COMPOSE_FILE" exec -T "$SERVICE" python manage.py seed_asset_tickets $CMD_ARGS

EXIT_CODE=$?

if [[ $EXIT_CODE -eq 0 ]]; then
    echo ""
    echo -e "${GREEN}✅ Asset tickets seeded successfully!${NC}"
    echo ""
    echo -e "${CYAN}Next steps:${NC}"
    echo "  - View tickets in HDTS frontend"
    echo "  - Tickets will be processed through TTS workflow"
    echo "  - AMS will consume completed tickets for asset operations"
else
    echo ""
    echo -e "${RED}❌ Command failed with exit code $EXIT_CODE${NC}"
    exit $EXIT_CODE
fi
