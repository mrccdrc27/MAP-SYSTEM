#!/bin/bash
# HDTS Controlled Ticket Seeder Script (Local Development)
# Seeds tickets with historical patterns from CSV/JSON files
#
# Usage Examples:
#   ./seed_controlled.sh                                  # Interactive file selection
#   ./seed_controlled.sh historical_seed_plan.csv         # Specific CSV file
#   ./seed_controlled.sh seed_plan.json                   # Specific JSON file
#   ./seed_controlled.sh --help                           # Show help

set -e

# Script directory and project root
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"
HDTS_PATH="$PROJECT_ROOT/hdts/helpdesk"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
GRAY='\033[0;90m'
NC='\033[0m' # No Color

# Help function
show_help() {
    echo ""
    echo -e "${CYAN}HDTS Controlled Ticket Seeder${NC}"
    echo -e "${CYAN}==============================${NC}"
    echo ""
    echo "Seeds tickets with a controlled historical pattern from a JSON or CSV file."
    echo ""
    echo -e "${YELLOW}USAGE:${NC}"
    echo "  ./seed_controlled.sh [FILE]"
    echo ""
    echo -e "${YELLOW}ARGUMENTS:${NC}"
    echo "  FILE    Path to the seed plan file (JSON or CSV)"
    echo "          If not provided, will prompt for interactive selection"
    echo ""
    echo -e "${YELLOW}FILE FORMAT (CSV):${NC}"
    echo "  days_ago,date,time,category,sub_category,count,priority,department"
    echo "  0,2025-01-10,09:00,IT Support,Technical Assistance,5,High,IT Department"
    echo ""
    echo -e "${YELLOW}FILE FORMAT (JSON):${NC}"
    echo "  ["
    echo "    {"
    echo "      \"days_ago\": 30,"
    echo "      \"date\": \"2025-01-10\","
    echo "      \"time\": \"09:00\","
    echo "      \"tickets\": ["
    echo "        {\"category\": \"IT Support\", \"sub_category\": \"Technical Assistance\", \"count\": 5}"
    echo "      ]"
    echo "    }"
    echo "  ]"
    echo ""
    echo -e "${YELLOW}EXAMPLES:${NC}"
    echo "  # Interactive file selection"
    echo "  ./seed_controlled.sh"
    echo ""
    echo "  # Seed from a specific CSV file"
    echo "  ./seed_controlled.sh historical_seed_plan.csv"
    echo ""
    echo "  # Seed from a JSON file"
    echo "  ./seed_controlled.sh my_seed_plan.json"
    echo ""
    exit 0
}

# Parse arguments
FILE_PATH=""

if [[ "$1" == "--help" || "$1" == "-h" ]]; then
    show_help
fi

if [[ -n "$1" ]]; then
    FILE_PATH="$1"
fi

echo ""
echo -e "${CYAN}==========================================${NC}"
echo -e "${CYAN}  HDTS Controlled Ticket Seeder${NC}"
echo -e "${CYAN}==========================================${NC}"
echo ""

# Check if HDTS path exists
if [[ ! -d "$HDTS_PATH" ]]; then
    echo -e "${RED}ERROR: HDTS helpdesk directory not found at: $HDTS_PATH${NC}"
    exit 1
fi

# Change to HDTS directory
cd "$HDTS_PATH"
echo -e "${GRAY}Working directory: $HDTS_PATH${NC}"

# Build command arguments
CMD_ARGS=()

if [[ -n "$FILE_PATH" ]]; then
    # Check if file exists (either absolute or relative to HDTS_PATH)
    if [[ -f "$FILE_PATH" ]]; then
        CMD_ARGS+=("$FILE_PATH")
    elif [[ -f "$HDTS_PATH/$FILE_PATH" ]]; then
        CMD_ARGS+=("$FILE_PATH")
    else
        echo -e "${RED}ERROR: File not found: $FILE_PATH${NC}"
        exit 1
    fi
fi

echo -e "${GRAY}Executing: python manage.py seed_controlled ${CMD_ARGS[*]}${NC}"
echo ""

# Execute the management command
python manage.py seed_controlled "${CMD_ARGS[@]}"

EXIT_CODE=$?
if [[ $EXIT_CODE -ne 0 ]]; then
    echo ""
    echo -e "${YELLOW}Command exited with code: $EXIT_CODE${NC}"
fi

echo ""
