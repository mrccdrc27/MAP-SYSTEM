#!/bin/bash
# Quick Test Runner for Workflow API
# Usage: bash run_tests.sh [options]

set -e

WORKFLOW_API_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$WORKFLOW_API_DIR"

# Colors for output
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Functions
print_header() {
    echo -e "\n${BLUE}═══════════════════════════════════════════════════${NC}"
    echo -e "${BLUE}$1${NC}"
    echo -e "${BLUE}═══════════════════════════════════════════════════${NC}\n"
}

print_success() {
    echo -e "${GREEN}✅ $1${NC}"
}

print_warning() {
    echo -e "${YELLOW}⚠️  $1${NC}"
}

# Check if Django project is set up
if [ ! -f "manage.py" ]; then
    print_warning "manage.py not found. Make sure you're in the workflow_api directory."
    exit 1
fi

# Default option
OPTION="${1:-all}"

case $OPTION in
    all)
        print_header "Running All Tests"
        python manage.py test tests -v 2
        print_success "All tests completed!"
        ;;
    
    models)
        print_header "Running Task Model Tests"
        python manage.py test tests.unit.task.test_models -v 2
        print_success "Model tests completed!"
        ;;
    
    utils)
        print_header "Running Task Utils Tests"
        python manage.py test tests.unit.task.test_utils -v 2
        print_success "Utils tests completed!"
        ;;
    
    assignment)
        print_header "Running Round-Robin Assignment Tests"
        python manage.py test tests.unit.task.test_utils.RoundRobinAssignmentTests -v 2
        print_success "Assignment tests completed!"
        ;;
    
    sla)
        print_header "Running SLA Calculation Tests"
        python manage.py test tests.unit.task.test_utils.SLACalculationTests -v 2
        print_success "SLA tests completed!"
        ;;
    
    escalation)
        print_header "Running Escalation Logic Tests"
        python manage.py test tests.unit.task.test_utils.EscalationLogicTests -v 2
        print_success "Escalation tests completed!"
        ;;
    
    coverage)
        print_header "Running Tests with Coverage"
        
        if ! command -v coverage &> /dev/null; then
            print_warning "coverage not installed. Installing..."
            pip install coverage
        fi
        
        coverage run --source='.' manage.py test tests
        echo ""
        coverage report --skip-covered
        
        print_success "Coverage report generated!"
        print_header "Coverage HTML Report"
        coverage html
        echo -e "${GREEN}Open htmlcov/index.html in your browser to view detailed coverage${NC}"
        ;;
    
    quick)
        print_header "Running Quick Tests (models only)"
        python manage.py test tests.unit.task.test_models --no-header -q
        print_success "Quick tests completed!"
        ;;
    
    *)
        cat << EOF
${BLUE}Workflow API Test Runner${NC}

Usage: bash run_tests.sh [option]

Options:
  all            Run all tests (default)
  models         Run task model tests only
  utils          Run task utils tests only
  assignment     Run round-robin assignment tests
  sla            Run SLA calculation tests
  escalation     Run escalation logic tests
  coverage       Run tests with coverage report
  quick          Run quick tests (models only)

Examples:
  bash run_tests.sh
  bash run_tests.sh models
  bash run_tests.sh coverage

For more options, run:
  python manage.py test --help
EOF
        exit 1
        ;;
esac
