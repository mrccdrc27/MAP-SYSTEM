param (
    [string]$Service = "workflow-api",
    [switch]$IncludeBroken
)

$ErrorActionPreference = "Stop"

# Get the script's directory and workspace root
$ScriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$WorkspaceRoot = (Get-Item $ScriptDir).Parent.Parent.FullName
$ComposeFile = Join-Path $WorkspaceRoot "tts\Docker\docker-compose.yml"

Write-Host "`n=== Deploy Workflows (Docker) ===" -ForegroundColor Cyan

try {
    # Check if compose file exists
    if (-not (Test-Path $ComposeFile)) {
        Write-Error "Docker Compose file not found at: $ComposeFile"
        exit 1
    }
    
    # Check if service is running using docker-compose
    $serviceStatus = docker-compose -f $ComposeFile ps --services --filter "status=running" 2>$null | Where-Object { $_ -eq $Service }
    
    if (-not $serviceStatus) {
        Write-Error "Service '$Service' is not running. Please start Docker services first."
        exit 1
    }
    
    Write-Host "Executing command in service: $Service" -ForegroundColor Gray
    
    # Build the Python command based on whether to include broken workflows
    if ($IncludeBroken) {
        $pythonCmd = "from workflow.models import Workflows; count = Workflows.objects.update(status='deployed', is_published=True); print(f'Deployed {count} workflows (including broken)')"
    } else {
        $pythonCmd = "from workflow.models import Workflows; count = Workflows.objects.exclude(name__icontains='BROKEN').update(status='deployed', is_published=True); print(f'Deployed {count} workflows')"
    }
    
    # Execute the command
    docker-compose -f $ComposeFile exec -T $Service python manage.py shell -c $pythonCmd
    
    if ($LASTEXITCODE -eq 0) {
        Write-Host "`nListing all workflows:" -ForegroundColor Cyan
        docker-compose -f $ComposeFile exec -T $Service python manage.py shell -c "from workflow.models import Workflows; [print(f'  {w.workflow_id}: {w.name} - status={w.status}, is_published={w.is_published}') for w in Workflows.objects.all()]"
        Write-Host "`nSuccess." -ForegroundColor Green
    } else {
        Write-Host "Command failed with exit code $LASTEXITCODE" -ForegroundColor Red
        exit $LASTEXITCODE
    }
} catch {
    Write-Host "Error: $_" -ForegroundColor Red
    exit 1
}
