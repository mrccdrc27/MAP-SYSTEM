#!/bin/bash
# AMS Setup and Test Script
# This script installs dependencies, seeds data, and tests the AMS API integration
#
# Usage:
#   ./setup_and_test_ams.sh                    # Full setup and test
#   ./setup_and_test_ams.sh --skip-install     # Skip dependency installation
#   ./setup_and_test_ams.sh --skip-seed        # Skip seeding
#   ./setup_and_test_ams.sh --test-only        # Run tests only
#   ./setup_and_test_ams.sh --seed-only        # Seed only
#   ./setup_and_test_ams.sh --verbose          # Verbose test output
#   ./setup_and_test_ams.sh --clear            # Clear data before seeding

set -e

# Default values
SKIP_INSTALL=false
SKIP_SEED=false
TEST_ONLY=false
SEED_ONLY=false
VERBOSE=false
CLEAR_DATA=false
AUTH_URL="http://localhost:8000"
ASSETS_URL="http://localhost:8002"
CONTEXTS_URL="http://localhost:8003"

# Parse arguments
while [[ $# -gt 0 ]]; do
    case $1 in
        --skip-install)
            SKIP_INSTALL=true
            shift
            ;;
        --skip-seed)
            SKIP_SEED=true
            shift
            ;;
        --test-only)
            TEST_ONLY=true
            shift
            ;;
        --seed-only)
            SEED_ONLY=true
            shift
            ;;
        --verbose|-v)
            VERBOSE=true
            shift
            ;;
        --clear)
            CLEAR_DATA=true
            shift
            ;;
        --auth-url)
            AUTH_URL="$2"
            shift 2
            ;;
        --assets-url)
            ASSETS_URL="$2"
            shift 2
            ;;
        --contexts-url)
            CONTEXTS_URL="$2"
            shift 2
            ;;
        *)
            echo "Unknown option: $1"
            exit 1
            ;;
    esac
done

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
GRAY='\033[0;90m'
NC='\033[0m' # No Color

print_header() {
    echo ""
    echo -e "${CYAN}============================================================${NC}"
    echo -e "${CYAN} $1${NC}"
    echo -e "${CYAN}============================================================${NC}"
}

print_step() {
    echo -e " -> ${YELLOW}$1${NC}"
}

print_pass() {
    echo -e " ${GREEN}[PASS]${NC} $1"
}

print_fail() {
    echo -e " ${RED}[FAIL]${NC} $1"
}

print_info() {
    echo -e " ${GRAY}[INFO]${NC} $1"
}

# Get script directory and project paths
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"
AMS_ROOT="$PROJECT_ROOT/ams"
ASSETS_PATH="$AMS_ROOT/backend/assets"
CONTEXTS_PATH="$AMS_ROOT/backend/contexts"
AUTH_PATH="$PROJECT_ROOT/auth"

print_header "AMS Setup and Test Script"
echo " Project Root:  $PROJECT_ROOT"
echo " AMS Root:      $AMS_ROOT"
echo " Assets Path:   $ASSETS_PATH"
echo " Contexts Path: $CONTEXTS_PATH"
echo " Auth Path:     $AUTH_PATH"

# ============================================
# Phase 1: Install Dependencies
# ============================================
if [ "$SKIP_INSTALL" = false ] && [ "$TEST_ONLY" = false ] && [ "$SEED_ONLY" = false ]; then
    print_header "Phase 1: Installing Dependencies"
    
    # Install Assets dependencies
    if [ -d "$ASSETS_PATH" ]; then
        print_step "Installing Assets service dependencies..."
        cd "$ASSETS_PATH"
        if pip install -r requirements.txt --quiet 2>/dev/null; then
            print_pass "Assets dependencies installed"
        else
            print_fail "Failed to install Assets dependencies"
        fi
    else
        print_fail "Assets path not found: $ASSETS_PATH"
    fi
    
    # Install Contexts dependencies
    if [ -d "$CONTEXTS_PATH" ]; then
        print_step "Installing Contexts service dependencies..."
        cd "$CONTEXTS_PATH"
        if pip install -r requirements.txt --quiet 2>/dev/null; then
            print_pass "Contexts dependencies installed"
        else
            print_fail "Failed to install Contexts dependencies"
        fi
    else
        print_fail "Contexts path not found: $CONTEXTS_PATH"
    fi
else
    print_info "Skipping dependency installation"
fi

# ============================================
# Phase 2: Run Migrations
# ============================================
if [ "$TEST_ONLY" = false ]; then
    print_header "Phase 2: Running Migrations"
    
    # Contexts migrations (must run first)
    if [ -d "$CONTEXTS_PATH" ]; then
        print_step "Running Contexts migrations..."
        cd "$CONTEXTS_PATH"
        if python manage.py migrate --noinput 2>/dev/null; then
            print_pass "Contexts migrations complete"
        else
            print_fail "Contexts migrations failed"
        fi
    fi
    
    # Assets migrations
    if [ -d "$ASSETS_PATH" ]; then
        print_step "Running Assets migrations..."
        cd "$ASSETS_PATH"
        if python manage.py migrate --noinput 2>/dev/null; then
            print_pass "Assets migrations complete"
        else
            print_fail "Assets migrations failed"
        fi
    fi
fi

# ============================================
# Phase 3: Seed Data
# ============================================
if ([ "$SKIP_SEED" = false ] && [ "$TEST_ONLY" = false ]) || [ "$SEED_ONLY" = true ]; then
    print_header "Phase 3: Seeding Data"
    
    CLEAR_FLAG=""
    if [ "$CLEAR_DATA" = true ]; then
        CLEAR_FLAG="--clear"
    fi
    
    # Seed Contexts FIRST
    if [ -d "$CONTEXTS_PATH" ]; then
        print_step "Seeding Contexts data..."
        cd "$CONTEXTS_PATH"
        if python manage.py seed_all_contexts $CLEAR_FLAG 2>/dev/null; then
            print_pass "Contexts data seeded"
        else
            print_info "Contexts seeding returned non-zero (may already have data)"
        fi
    fi
    
    # Seed Assets SECOND
    if [ -d "$ASSETS_PATH" ]; then
        print_step "Seeding Assets data..."
        cd "$ASSETS_PATH"
        if python manage.py seed_all $CLEAR_FLAG 2>/dev/null; then
            print_pass "Assets data seeded"
        else
            print_info "Assets seeding returned non-zero (may already have data)"
        fi
    fi
    
    # Seed AMS users in Auth service
    print_step "Seeding AMS users in Auth service..."
    if [ -d "$AUTH_PATH" ]; then
        cd "$AUTH_PATH"
        if python manage.py seed_ams 2>/dev/null; then
            print_pass "AMS users seeded in Auth service"
        else
            print_info "seed_ams command may not exist or failed"
        fi
    else
        print_fail "Auth path not found: $AUTH_PATH"
    fi
fi

if [ "$SEED_ONLY" = true ]; then
    print_header "Seeding Complete"
    exit 0
fi

# ============================================
# Phase 4: Run API Tests
# ============================================
print_header "Phase 4: Running API Tests"

TEST_SCRIPT="$SCRIPT_DIR/test_ams_api.py"

if [ -f "$TEST_SCRIPT" ]; then
    print_step "Running AMS API integration tests..."
    
    TEST_ARGS="--auth-url $AUTH_URL --assets-url $ASSETS_URL --contexts-url $CONTEXTS_URL"
    
    if [ "$VERBOSE" = true ]; then
        TEST_ARGS="$TEST_ARGS --verbose"
    fi
    
    if python "$TEST_SCRIPT" $TEST_ARGS; then
        print_header "All Tests Passed!"
        echo ""
        echo -e " ${GREEN}AMS API integration is working correctly.${NC}"
        echo -e " ${GREEN}The Assets and Contexts services are authenticating via the${NC}"
        echo -e " ${GREEN}centralized Auth service using shared JWT tokens.${NC}"
    else
        TEST_EXIT_CODE=$?
        print_header "Some Tests Failed"
        echo ""
        echo -e " ${YELLOW}$TEST_EXIT_CODE test(s) failed. Review the output above.${NC}"
        echo ""
        echo -e " ${YELLOW}Common issues:${NC}"
        echo -e "   ${GRAY}- Services not running (start with runserver)${NC}"
        echo -e "   ${GRAY}- JWT signing key mismatch between services${NC}"
        echo -e "   ${GRAY}- User doesn't have AMS system role in auth service${NC}"
    fi
else
    print_fail "Test script not found: $TEST_SCRIPT"
fi

print_header "Setup and Test Complete"
