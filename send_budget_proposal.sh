#!/bin/bash

# Budget Proposal Script
# Fetches reference data and sends budget proposals to BMS external API

# Configuration
BASE_URL="https://budget-pro.onrender.com/api"
API_KEY="${1:-ams-live-key-774839w2e}"

# Available API Keys:
# DTS_CLIENT_API_KEY=dts-live-key-883920s8d
# TTS_CLIENT_API_KEY=tts-live-key-112233445
# AMS_CLIENT_API_KEY=ams-live-key-774839w2e
# HDS_CLIENT_API_KEY=hdts-live-key-992837q1w

# Colors for output
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

show_help() {
    echo ""
    echo "Usage: ./send_budget_proposal.sh [API_KEY] [COMMAND]"
    echo ""
    echo "Commands:"
    echo "  fiscal-years    - List all fiscal years"
    echo "  accounts        - List all accounts"
    echo "  send            - Send budget proposal (default)"
    echo "  help            - Show this help message"
    echo ""
    echo "Examples:"
    echo "  ./send_budget_proposal.sh                           # Send proposal with default key"
    echo "  ./send_budget_proposal.sh ams-live-key-774839w2e fiscal-years"
    echo "  ./send_budget_proposal.sh ams-live-key-774839w2e accounts"
    echo ""
}

# Function to list fiscal years
list_fiscal_years() {
    echo -e "${BLUE}Fetching Fiscal Years...${NC}"
    echo "URL: $BASE_URL/fiscal-years/"
    echo "=========================================="
    curl -s -X GET "$BASE_URL/fiscal-years/" \
        -H "Content-Type: application/json" \
        -H "X-API-Key: $API_KEY" | jq . 2>/dev/null || cat
    echo ""
    echo "=========================================="
}

# Function to list accounts
list_accounts() {
    echo -e "${BLUE}Fetching Accounts...${NC}"
    echo "URL: $BASE_URL/accounts/"
    echo "=========================================="
    curl -s -X GET "$BASE_URL/accounts/" \
        -H "Content-Type: application/json" \
        -H "X-API-Key: $API_KEY" | jq . 2>/dev/null || cat
    echo ""
    echo "=========================================="
}

# Function to send budget proposal
send_proposal() {
    # JSON Payload
    PAYLOAD='{
      "ticket_id": "AR-2025-001",
      "department_input": "IT",
      "title": "Purchase 5 Laptops",
      "project_summary": "Standard issue for devs",
      "project_description": "Detailed justification for purchasing 5 laptops for the development team to support ongoing projects and improve productivity.",
      "submitted_by_name": "John Doe",
      "fiscal_year": 4,
      "performance_start_date": "2026-01-01",
      "performance_end_date": "2026-12-31",
      "items": [
        {
          "cost_element": "Lenovo ThinkPad X1",
          "description": "i7/16GB/512GB",
          "estimated_cost": 425000.00,
          "account": 5
        }
      ]
    }'

    echo -e "${GREEN}Sending budget proposal to BMS...${NC}"
    echo "URL: $BASE_URL/external-budget-proposals/"
    echo "API Key: $API_KEY"
    echo ""
    echo "Payload:"
    echo "$PAYLOAD" | jq . 2>/dev/null || echo "$PAYLOAD"
    echo ""
    echo "Response:"
    echo "=========================================="

    curl -X POST "$BASE_URL/external-budget-proposals/" \
      -H "Content-Type: application/json" \
      -H "X-API-Key: $API_KEY" \
      -d "$PAYLOAD" \
      -w "\n\nHTTP Status: %{http_code}\n" \
      -s | jq . 2>/dev/null || cat

    echo "=========================================="
}

# Parse command (second argument, or first if no API key provided)
COMMAND="${2:-send}"

# If first arg looks like a command, use default API key
case "$1" in
    fiscal-years|accounts|send|help)
        COMMAND="$1"
        API_KEY="ams-live-key-774839w2e"
        ;;
esac

# Execute command
case "$COMMAND" in
    fiscal-years)
        list_fiscal_years
        ;;
    accounts)
        list_accounts
        ;;
    send)
        send_proposal
        ;;
    help)
        show_help
        ;;
    *)
        echo "Unknown command: $COMMAND"
        show_help
        exit 1
        ;;
esac
