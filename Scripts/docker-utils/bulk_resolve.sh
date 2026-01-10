#!/bin/bash
# TTS Bulk Resolution Script (Docker Version)
# Resolves tasks with controlled resolution and halfway rates
#
# Usage Examples:
#   ./bulk_resolve.sh                                        # Interactive (70% resolved, 80% halfway)
#   ./bulk_resolve.sh --resolution-rate 80                   # 80% resolved, 80% halfway
#   ./bulk_resolve.sh --resolution-rate 70 --halfway-rate 90 # 70% resolved, 90% of rest halfway
#   ./bulk_resolve.sh --date "2025-08-13"                    # Specific date
#   ./bulk_resolve.sh --start-date "2025-01-01" --end-date "2025-12-31"  # Date range
#   ./bulk_resolve.sh --sla-rate 85                          # 85% within SLA
#   ./bulk_resolve.sh --dry-run                              # Preview changes
#   ./bulk_resolve.sh --verbose                              # Detailed output
#   ./bulk_resolve.sh --service workflow-api                 # Specify container/service

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
SERVICE="workflow-api"
DATE=""
START_DATE=""
END_DATE=""
RESOLUTION_RATE=70
HALFWAY_RATE=80
MAX_PROGRESS_DAYS=7
SLA_RATE=100
MIN_DELAY_DAYS=1
MAX_DELAY_DAYS=7
DRY_RUN=false
VERBOSE=false
JSON_OUTPUT=false

# Help function
show_help() {
    echo ""
    echo -e "${CYAN}TTS Bulk Resolution Tool (Docker)${NC}"
    echo -e "${CYAN}==================================${NC}"
    echo ""
    echo "Resolves tasks with controlled outcomes for historical seeding validation."
    echo "This version executes inside a Docker container."
    echo ""
    echo -e "${YELLOW}PARAMETERS:${NC}"
    echo "  --service <name>          Docker service name (default: workflow-api)"
    echo "  --date <YYYY-MM-DD>       Single date to process"
    echo "  --start-date <YYYY-MM-DD> Start of date range (default: all time)"
    echo "  --end-date <YYYY-MM-DD>   End of date range (default: today)"
    echo "  --resolution-rate <0-100> Percentage of tasks to fully resolve (default: 70)"
    echo "  --halfway-rate <0-100>    Percentage of unresolved tasks to start (default: 80)"
    echo "  --max-progress-days <1+>  Max days after creation for halfway progress (default: 7)"
    echo "  --sla-rate <0-100>        Percentage of resolved tasks within SLA (default: 100)"
    echo "  --min-delay-days <1+>     Minimum delay days for SLA breaches (default: 1)"
    echo "  --max-delay-days <1+>     Maximum delay days for SLA breaches (default: 7)"
    echo "  --dry-run                 Preview changes without applying"
    echo "  --verbose                 Show detailed per-task progress"
    echo "  --json                    Output as JSON"
    echo "  --help, -h                Show this help message"
    echo ""
    echo -e "${YELLOW}EXAMPLES:${NC}"
    echo "  # Resolve 70% of all tasks, 80% of rest started"
    echo "  ./bulk_resolve.sh"
    echo ""
    echo "  # Resolve 100% of tasks from a specific date"
    echo "  ./bulk_resolve.sh --date 2025-08-13 --resolution-rate 100"
    echo ""
    echo "  # Resolve 50% of Q4 2025 tasks"
    echo "  ./bulk_resolve.sh --start-date 2025-10-01 --end-date 2025-12-31 --resolution-rate 50"
    echo ""
    echo "  # 85% within SLA, 15% with 1-7 day delays"
    echo "  ./bulk_resolve.sh --resolution-rate 80 --sla-rate 85"
    echo ""
    echo "  # Use different service"
    echo "  ./bulk_resolve.sh --service tts-workflow --resolution-rate 70"
    echo ""
    echo "  # Preview what would happen"
    echo "  ./bulk_resolve.sh --dry-run --verbose"
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
        --date)
            DATE="$2"
            shift 2
            ;;
        --start-date)
            START_DATE="$2"
            shift 2
            ;;
        --end-date)
            END_DATE="$2"
            shift 2
            ;;
        --resolution-rate)
            RESOLUTION_RATE="$2"
            shift 2
            ;;
        --halfway-rate)
            HALFWAY_RATE="$2"
            shift 2
            ;;
        --max-progress-days)
            MAX_PROGRESS_DAYS="$2"
            shift 2
            ;;
        --sla-rate)
            SLA_RATE="$2"
            shift 2
            ;;
        --min-delay-days)
            MIN_DELAY_DAYS="$2"
            shift 2
            ;;
        --max-delay-days)
            MAX_DELAY_DAYS="$2"
            shift 2
            ;;
        --dry-run)
            DRY_RUN=true
            shift
            ;;
        --verbose)
            VERBOSE=true
            shift
            ;;
        --json)
            JSON_OUTPUT=true
            shift
            ;;
        --help|-h)
            show_help
            ;;
        *)
            echo -e "${RED}Unknown option: $1${NC}"
            echo "Use --help for usage information"
            exit 1
            ;;
    esac
done

echo ""
echo -e "${CYAN}==========================================${NC}"
echo -e "${CYAN}  TTS Bulk Resolution Tool${NC}"
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
CMD_ARGS=()

if [[ -n "$DATE" ]]; then
    CMD_ARGS+=("--date" "$DATE")
fi

if [[ -n "$START_DATE" && -z "$DATE" ]]; then
    CMD_ARGS+=("--start-date" "$START_DATE")
fi

if [[ -n "$END_DATE" && -z "$DATE" ]]; then
    CMD_ARGS+=("--end-date" "$END_DATE")
fi

CMD_ARGS+=("--resolution-rate" "$RESOLUTION_RATE")
CMD_ARGS+=("--halfway-rate" "$HALFWAY_RATE")
CMD_ARGS+=("--max-progress-days" "$MAX_PROGRESS_DAYS")
CMD_ARGS+=("--sla-rate" "$SLA_RATE")
CMD_ARGS+=("--min-delay-days" "$MIN_DELAY_DAYS")
CMD_ARGS+=("--max-delay-days" "$MAX_DELAY_DAYS")

if [[ "$DRY_RUN" == true ]]; then
    CMD_ARGS+=("--dry-run")
fi

if [[ "$VERBOSE" == true ]]; then
    CMD_ARGS+=("--verbose")
fi

if [[ "$JSON_OUTPUT" == true ]]; then
    CMD_ARGS+=("--json")
fi

echo -e "${GRAY}Service: $SERVICE${NC}"
echo -e "${GRAY}Executing: docker-compose exec $SERVICE python manage.py bulk_resolve ${CMD_ARGS[*]}${NC}"
echo ""

# Execute the management command using docker-compose exec
docker-compose -f "$COMPOSE_FILE" exec -T "$SERVICE" python manage.py bulk_resolve "${CMD_ARGS[@]}"

EXIT_CODE=$?
if [[ $EXIT_CODE -eq 0 ]]; then
    echo -e "${GREEN}Success.${NC}"
else
    echo -e "${RED}Command failed with exit code $EXIT_CODE${NC}"
    exit $EXIT_CODE
fi

echo ""
