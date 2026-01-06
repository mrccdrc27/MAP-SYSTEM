# Scripts/docker/start_rabbitmq.ps1
param (
    [Switch]$Attached
)

Write-Host "Starting RabbitMQ container..." -ForegroundColor Cyan

# Check if docker is available
if (-not (Get-Command docker -ErrorAction SilentlyContinue)) {
    Write-Error "Docker is not installed or not in PATH."
    exit 1
}

# Remove existing container if it exists (to avoid conflict)
docker rm -f rabbitmq 2>$null

# Determine mode
$Mode = "-d" # Default to detached
if ($Attached) { $Mode = "" }

# Run RabbitMQ
docker run $Mode --rm --name rabbitmq -p 5672:5672 -p 15672:15672 `
    -e RABBITMQ_DEFAULT_USER=admin `
    -e RABBITMQ_DEFAULT_PASS=admin `
    -e RABBITMQ_DEFAULT_VHOST=/ `
    rabbitmq:3.13-management-alpine

if (-not $Attached) {
    Write-Host "RabbitMQ started in background." -ForegroundColor Green
    Write-Host "Waiting for service to be ready..." -ForegroundColor DarkGray
    
    # Simple wait loop for port 5672
    $Ready = $false
    for ($i=0; $i -lt 30; $i++) {
        try {
            $tcp = New-Object System.Net.Sockets.TcpClient
            $connect = $tcp.BeginConnect("localhost", 5672, $null, $null)
            $success = $connect.AsyncWaitHandle.WaitOne(500, $false)
            if ($success) {
                $tcp.EndConnect($connect)
                $tcp.Close()
                $Ready = $true
                break
            }
        } catch {}
        Start-Sleep -Milliseconds 500
    }

    if ($Ready) {
        Write-Host "RabbitMQ is up and running on port 5672." -ForegroundColor Green
    } else {
        Write-Host "Warning: RabbitMQ container started but port 5672 is not yet reachable." -ForegroundColor Yellow
    }
}
