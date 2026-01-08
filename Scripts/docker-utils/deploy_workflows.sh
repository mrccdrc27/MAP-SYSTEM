#!/bin/bash
# Deploy Workflows Script (Docker Version)
# Usage: ./deploy_workflows.sh [--service SERVICE] [--include-broken]

set -e

# Default values
SERVICE="workflow-api"
INCLUDE_BROKEN=false

# Parse command line arguments
while [[ $# -gt 0 ]]; do
    case $1 in
        --service)
            SERVICE="$2"
            shift 2
            ;;
        --include-broken)
            INCLUDE_BROKEN=true
            shift
            ;;
        *)
            echo "Unknown option: $1"
            echo "Usage: $0 [--service SERVICE] [--include-broken]"
            exit 1
            ;;
    esac
done

# Get script directory and workspace root
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
WORKSPACE_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"
COMPOSE_FILE="$WORKSPACE_ROOT/tts/Docker/docker-compose.yml"

echo ""
echo "=== Deploy Workflows (Docker) ==="

# Check if compose file exists
if [[ ! -f "$COMPOSE_FILE" ]]; then
    echo "ERROR: Docker Compose file not found at: $COMPOSE_FILE"
    exit 1
fi

# Check if service is running
if ! docker-compose -f "$COMPOSE_FILE" ps --services --filter "status=running" 2>/dev/null | grep -q "^$SERVICE$"; then
    echo "ERROR: Service '$SERVICE' is not running. Please start Docker services first."
    exit 1
fi

echo "Executing command in service: $SERVICE"

# Build the Python command based on whether to include broken workflows
if [[ "$INCLUDE_BROKEN" == true ]]; then
    PYTHON_CMD="from workflow.models import Workflows; count = Workflows.objects.update(status='deployed', is_published=True); print(f'Deployed {count} workflows (including broken)')"
else
    PYTHON_CMD="from workflow.models import Workflows; count = Workflows.objects.exclude(name__icontains='BROKEN').update(status='deployed', is_published=True); print(f'Deployed {count} workflows')"
fi

# Execute the command
docker-compose -f "$COMPOSE_FILE" exec -T "$SERVICE" python manage.py shell -c "$PYTHON_CMD"

if [[ $? -eq 0 ]]; then
    echo ""
    echo "Listing all workflows:"
    docker-compose -f "$COMPOSE_FILE" exec -T "$SERVICE" python manage.py shell -c "from workflow.models import Workflows; [print(f'  {w.workflow_id}: {w.name} - status={w.status}, is_published={w.is_published}') for w in Workflows.objects.all()]"
    echo ""
    echo "Success."
else
    echo "Command failed with exit code $?"
    exit 1
fi
