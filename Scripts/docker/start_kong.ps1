# Scripts/docker/start_kong.ps1
# Start Kong API Gateway in Docker for TTS ecosystem

param(
    [switch]$Detached,
    [switch]$Stop,
    [switch]$Logs,
    [switch]$Restart,
    [ValidateSet("auth", "full", "local")]
    [string]$Config = "local"  # Default to local for full TTS ecosystem
)

$ContainerName = "kong-gateway"
$KongConfigPath = (Resolve-Path "$PSScriptRoot/../../kong").Path

# Select config file based on parameter
$ConfigFile = switch ($Config) {
    "auth"  { "kong.auth.yml" }    # Auth service only (minimal config)
    "full"  { "kong.yml" }         # Full TTS ecosystem (Docker service discovery)
    "local" { "kong.local.yml" }   # Full TTS ecosystem (localhost URLs - recommended)
}
$KongYmlPath = "$KongConfigPath/$ConfigFile"

Write-Host "Kong API Gateway Manager" -ForegroundColor Cyan
Write-Host "========================" -ForegroundColor Cyan
Write-Host "Config: $ConfigFile" -ForegroundColor Gray

# Check if docker is available
if (-not (Get-Command docker -ErrorAction SilentlyContinue)) {
    Write-Error "Docker is not installed or not in PATH."
    exit 1
}

# Handle Stop command
if ($Stop) {
    Write-Host "Stopping Kong Gateway..." -ForegroundColor Yellow
    docker stop $ContainerName 2>$null
    docker rm $ContainerName 2>$null
    Write-Host "Kong Gateway stopped." -ForegroundColor Green
    exit 0
}

# Handle Logs command
if ($Logs) {
    Write-Host "Following Kong Gateway logs (Ctrl+C to exit)..." -ForegroundColor Yellow
    docker logs -f $ContainerName
    exit 0
}

# Handle Restart command
if ($Restart) {
    Write-Host "Restarting Kong Gateway..." -ForegroundColor Yellow
    docker restart $ContainerName
    Write-Host "Kong Gateway restarted." -ForegroundColor Green
    exit 0
}

# Validate kong.local.yml exists
if (-not (Test-Path $KongYmlPath)) {
    Write-Error "Kong configuration not found at: $KongYmlPath"
    exit 1
}

Write-Host "Using config: $KongYmlPath" -ForegroundColor Gray

# Remove existing container if it exists
$existing = docker ps -aq -f "name=$ContainerName" 2>$null
if ($existing) {
    Write-Host "Removing existing Kong container..." -ForegroundColor Yellow
    docker rm -f $ContainerName 2>$null
}

# Build docker run command
$dockerArgs = @(
    "run"
    if ($Detached) { "-d" } else { "--rm" }
    "--name", $ContainerName
    "-p", "8000:8000"   # Kong Proxy (API Gateway)
    "-p", "8001:8001"   # Kong Admin API
    "-e", "KONG_DATABASE=off"
    "-e", "KONG_DECLARATIVE_CONFIG=/kong/$ConfigFile"
    "-e", "KONG_PROXY_ACCESS_LOG=/dev/stdout"
    "-e", "KONG_ADMIN_ACCESS_LOG=/dev/stdout"
    "-e", "KONG_PROXY_ERROR_LOG=/dev/stderr"
    "-e", "KONG_ADMIN_ERROR_LOG=/dev/stderr"
    "-e", "KONG_ADMIN_LISTEN=0.0.0.0:8001"
    "-e", "KONG_LOG_LEVEL=info"
    # Mount the kong config directory
    "-v", "${KongConfigPath}:/kong:ro"
    # Add host network access for local development
    "--add-host", "host.docker.internal:host-gateway"
    "kong:3.4"
)

Write-Host ""
Write-Host "Starting Kong API Gateway..." -ForegroundColor Green
Write-Host "  Proxy:  http://localhost:8000" -ForegroundColor Cyan
Write-Host "  Admin:  http://localhost:8001" -ForegroundColor Cyan
Write-Host ""

if ($Detached) {
    Write-Host "Running in detached mode..." -ForegroundColor Yellow
    docker @dockerArgs
    
    # Wait a moment and check if it started
    Start-Sleep -Seconds 2
    $running = docker ps -q -f "name=$ContainerName" 2>$null
    if ($running) {
        Write-Host ""
        Write-Host "Kong Gateway started successfully!" -ForegroundColor Green
        Write-Host ""
        Write-Host "Useful commands:" -ForegroundColor Yellow
        Write-Host "  View logs:    .\start_kong.ps1 -Logs" -ForegroundColor Gray
        Write-Host "  Stop:         .\start_kong.ps1 -Stop" -ForegroundColor Gray
        Write-Host "  Restart:      .\start_kong.ps1 -Restart" -ForegroundColor Gray
        Write-Host ""
        Write-Host "Test endpoints:" -ForegroundColor Yellow
        Write-Host "  curl http://localhost:8001/status" -ForegroundColor Gray
        Write-Host "  curl http://localhost:8001/services" -ForegroundColor Gray
    } else {
        Write-Error "Kong Gateway failed to start. Check logs with: docker logs $ContainerName"
    }
} else {
    Write-Host "Running in foreground (Ctrl+C to stop)..." -ForegroundColor Yellow
    Write-Host ""
    docker @dockerArgs
}
