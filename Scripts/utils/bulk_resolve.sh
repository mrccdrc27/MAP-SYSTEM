#!/bin/bash
# TTS Bulk Resolution Script (Local Development)
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

set -e

# Script directory and project root
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"
WORKFLOW_API_PATH="$PROJECT_ROOT/tts/workflow_api"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
GRAY='\033[0;90m'
NC='\033[0m' # No Color

# Default values
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
    echo -e "${CYAN}TTS Bulk Resolution Tool${NC}"
    echo -e "${CYAN}========================${NC}"
    echo ""
    echo "Resolves tasks with controlled outcomes for historical seeding validation."
    echo ""
    echo -e "${YELLOW}PARAMETERS:${NC}"
    echo "  --date <YYYY-MM-DD>         Single date to process"
    echo "  --start-date <YYYY-MM-DD>   Start of date range (default: all time)"
    echo "  --end-date <YYYY-MM-DD>     End of date range (default: today)"
    echo "  --resolution-rate <0-100>   Percentage of tasks to fully resolve (default: 70)"
    echo "  --halfway-rate <0-100>      Percentage of unresolved tasks to start (default: 80)"
    echo "  --max-progress-days <1+>    Max days after creation for halfway progress (default: 7)"
    echo "  --sla-rate <0-100>          Percentage of resolved tasks within SLA (default: 100)"
    echo "  --min-delay-days <1+>       Minimum delay days for SLA breaches (default: 1)"
    echo "  --max-delay-days <1+>       Maximum delay days for SLA breaches (default: 7)"
    echo "  --dry-run                   Preview changes without applying"
    echo "  --verbose                   Show detailed per-task progress"
    echo "  --json                      Output as JSON"
    echo "  --help, -h                  Show this help message"
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
    echo "  # SLA breaches delayed 2-5 days"
    echo "  ./bulk_resolve.sh --sla-rate 70 --min-delay-days 2 --max-delay-days 5"
    echo ""
    echo "  # Preview what would happen"
    echo "  ./bulk_resolve.sh --dry-run --verbose"
    echo ""
    exit 0
}

# Parse arguments
while [[ $# -gt 0 ]]; do
    case $1 in
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
echo -e "${CYAN}==========================================${NC}"
echo ""

# Check if workflow_api directory exists
if [[ ! -d "$WORKFLOW_API_PATH" ]]; then
    echo -e "${RED}ERROR: workflow_api directory not found at: $WORKFLOW_API_PATH${NC}"
    exit 1
fi

# Change to workflow_api directory
cd "$WORKFLOW_API_PATH"
echo -e "${GRAY}Working directory: $WORKFLOW_API_PATH${NC}"

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

echo -e "${GRAY}Executing: python manage.py bulk_resolve ${CMD_ARGS[*]}${NC}"
echo ""

# Execute the management command
python manage.py bulk_resolve "${CMD_ARGS[@]}"

EXIT_CODE=$?
if [[ $EXIT_CODE -ne 0 ]]; then
    echo ""
    echo -e "${YELLOW}Command exited with code: $EXIT_CODE${NC}"
fi

echo ""
