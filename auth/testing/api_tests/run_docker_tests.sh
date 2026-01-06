#!/bin/bash
# run_docker_tests.sh
# Script to run Auth Service API tests in Docker

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Script directory
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR"

echo -e "${BLUE}================================================${NC}"
echo -e "${BLUE}     AUTH SERVICE API TESTS (Docker)${NC}"
echo -e "${BLUE}================================================${NC}"
echo ""

# Parse arguments
VERBOSE=""
MODULE=""
COVERAGE=""
HTML_REPORT=""

while [[ $# -gt 0 ]]; do
    case $1 in
        -v|--verbose)
            VERBOSE="-v"
            shift
            ;;
        -m|--module)
            MODULE="$2"
            shift 2
            ;;
        --coverage)
            COVERAGE="--cov=users --cov=emails --cov-report=term-missing"
            shift
            ;;
        --html)
            HTML_REPORT="--html=api_tests/reports/report.html --self-contained-html"
            shift
            ;;
        -h|--help)
            echo "Usage: $0 [options]"
            echo ""
            echo "Options:"
            echo "  -v, --verbose     Verbose output"
            echo "  -m, --module      Run specific test module (e.g., test_login)"
            echo "  --coverage        Generate coverage report"
            echo "  --html            Generate HTML report"
            echo "  -h, --help        Show this help message"
            exit 0
            ;;
        *)
            echo -e "${RED}Unknown option: $1${NC}"
            exit 1
            ;;
    esac
done

# Build test path
if [ -n "$MODULE" ]; then
    TEST_PATH="api_tests/${MODULE}.py"
else
    TEST_PATH="api_tests/"
fi

echo -e "${YELLOW}Starting Docker containers...${NC}"

# Build and start containers
docker-compose -f docker-compose.test.yml build

echo -e "${YELLOW}Running database migrations...${NC}"

# Run migrations
docker-compose -f docker-compose.test.yml run --rm test-runner \
    python manage.py migrate --noinput

echo -e "${YELLOW}Seeding test data...${NC}"

# Seed basic data for tests
docker-compose -f docker-compose.test.yml run --rm test-runner \
    python manage.py seed_systems 2>/dev/null || true

echo -e "${GREEN}Running tests...${NC}"
echo ""

# Run tests
docker-compose -f docker-compose.test.yml run --rm test-runner \
    python -m pytest $TEST_PATH $VERBOSE $COVERAGE $HTML_REPORT \
    --junitxml=api_tests/reports/junit_report.xml

# Get exit code
EXIT_CODE=$?

echo ""

if [ $EXIT_CODE -eq 0 ]; then
    echo -e "${GREEN}================================================${NC}"
    echo -e "${GREEN}     ALL TESTS PASSED! ✅${NC}"
    echo -e "${GREEN}================================================${NC}"
else
    echo -e "${RED}================================================${NC}"
    echo -e "${RED}     SOME TESTS FAILED! ❌${NC}"
    echo -e "${RED}================================================${NC}"
fi

echo ""
echo -e "${BLUE}Reports saved to: api_tests/reports/${NC}"

# Cleanup (optional)
# docker-compose -f docker-compose.test.yml down

exit $EXIT_CODE
