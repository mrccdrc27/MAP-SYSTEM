# Scripts/start_rabbitmq.ps1
Write-Host "Starting RabbitMQ container..." -ForegroundColor Cyan

# Check if docker is available
if (-not (Get-Command docker -ErrorAction SilentlyContinue)) {
    Write-Error "Docker is not installed or not in PATH."
    exit 1
}

# Remove existing container if it exists (to avoid conflict)
docker rm -f rabbitmq 2>$null

# Run RabbitMQ
docker run --rm --name rabbitmq -p 5672:5672 -p 15672:15672 `
    -e RABBITMQ_DEFAULT_USER=admin `
    -e RABBITMQ_DEFAULT_PASS=admin `
    -e RABBITMQ_DEFAULT_VHOST=/ `
    rabbitmq:3.13-management-alpine
