<#
.SYNOPSIS
    TTS Services Setup - Migrate and Seed.
    
.DESCRIPTION
    This script performs setup tasks for all TTS services:
    1. Starts RabbitMQ (Docker container) if not running
    2. Runs migrations for all Django services
    3. Seeds data (optional, with -Seed flag) - starts workers temporarily for async sync

.PARAMETER Seed
    If specified, runs seeding commands after migrations.

.PARAMETER SkipMigrations
    If specified, skips migration step.

.PARAMETER SkipRabbitMQ
    If specified, assumes RabbitMQ is already running.

.PARAMETER FlushDB
    If specified, deletes all SQLite database files before migrations.

.EXAMPLE
    .\restart_all_services.ps1
    # Runs migrations only
    
.EXAMPLE
    .\restart_all_services.ps1 -Seed
    # Runs migrations and seeds data

.EXAMPLE
    .\restart_all_services.ps1 -FlushDB -Seed
    # Flushes databases, runs migrations, and seeds data

.EXAMPLE
    .\restart_all_services.ps1 -SkipMigrations -Seed
    # Seeds data only (skips migrations)

.NOTES
    File Name: restart_all_services.ps1
    Uses SQLite (development mode) - No PostgreSQL required.
    Use individual start scripts (start_auth.ps1, start_workflow.ps1, etc.) to run services.
#>

param(
    [switch]$Seed,
    [switch]$SkipMigrations,
    [switch]$SkipRabbitMQ,
    [switch]$FlushDB
)

$ErrorActionPreference = "Stop"

# --- Configuration ---
# PSScriptRoot is Scripts\setup, so go up 2 levels to get project root
$ProjectRoot = Resolve-Path "$PSScriptRoot\..\.."
$VenvPath = "$ProjectRoot\venv\Scripts\Activate.ps1"
$PythonExe = "$ProjectRoot\venv\Scripts\python.exe"
$LogDir = "$PSScriptRoot\..\logs"

# Service directories
$AuthDir = "$ProjectRoot\auth"
$WorkflowDir = "$ProjectRoot\tts\workflow_api"
$MessagingDir = "$ProjectRoot\tts\messaging"
$NotificationDir = "$ProjectRoot\tts\notification_service"
$HelpdeskDir = "$ProjectRoot\hdts\helpdesk"

# --- Helper Functions ---

function Print-Header {
    param ([string]$Title)
    Write-Host "`n========================================================" -ForegroundColor Cyan
    Write-Host " $Title" -ForegroundColor Cyan
    Write-Host "========================================================" -ForegroundColor Cyan
}

function Print-Step {
    param ([string]$Message)
    Write-Host " -> $Message" -ForegroundColor Yellow
}

function Print-Success {
    param ([string]$Message)
    Write-Host " [OK] $Message" -ForegroundColor Green
}

function Print-Error {
    param ([string]$Message)
    Write-Host " [ERROR] $Message" -ForegroundColor Red
}

function Print-Info {
    param ([string]$Message)
    Write-Host " [INFO] $Message" -ForegroundColor Gray
}

function Set-EnvironmentVariables {
    # Common environment variables for development (SQLite)
    $env:DJANGO_ENV = "development"
    $env:DJANGO_DEBUG = "True"
    $env:CELERY_BROKER_URL = "amqp://admin:admin@localhost:5672/"
    $env:DJANGO_CELERY_BROKER_URL = "amqp://admin:admin@localhost:5672/"
    $env:DJANGO_NOTIFICATION_SERVICE_BROKER_URL = "amqp://admin:admin@localhost:5672/"
    $env:DJANGO_AUTH_SERVICE_URL = "http://localhost:8003"
    $env:DJANGO_NOTIFICATION_SERVICE_URL = "http://localhost:8006"
    $env:DJANGO_TTS_SERVICE_URL = "http://localhost:8002"
    $env:DJANGO_USER_SERVICE_URL = "http://localhost:3000"
    $env:DJANGO_BASE_URL = "http://localhost:8002"
    $env:DJANGO_FRONTEND_URL = "http://localhost:1000/register"
    $env:DJANGO_CORS_ALLOWED_ORIGINS = "http://localhost:1000,http://127.0.0.1:1000"
    $env:DJANGO_CORS_ALLOW_CREDENTIALS = "True"
    $env:DJANGO_ALLOWED_HOSTS = "localhost,127.0.0.1"
    $env:DJANGO_NOTIFICATION_QUEUE = "notification-queue-default"
    $env:DJANGO_TICKET_STATUS_QUEUE = "ticket_status-default"
    $env:DJANGO_INAPP_NOTIFICATION_QUEUE = "inapp-notification-queue"
    $env:DJANGO_NOTIFICATION_API_KEYS = "demo-api-key-123,test-api-key-456"
    $env:DJANGO_API_KEY = "in-app-notification-api-key-secure"
    $env:DJANGO_MEDIA_BASE_URL = "http://localhost:8005"
    $env:TTS_SYSTEM_URL = "http://localhost:1000/"
    $env:AMS_SYSTEM_URL = "http://localhost:3000/ams"
    $env:HDTS_SYSTEM_URL = "http://localhost:3000/hdts"
    $env:BMS_SYSTEM_URL = "http://localhost:3000/bms"
    $env:DEFAULT_SYSTEM_URL = "http://localhost:3000/dashboard"
    $env:VITE_AUTH_URL = "http://localhost:8003"
    $env:VITE_WORKFLOW_API = "http://localhost:8002/workflow"
    $env:VITE_BACKEND_API = "http://localhost:8002/"
    $env:C_FORCE_ROOT = "false"
}

function Check-RabbitMQ {
    try {
        $tcp = New-Object System.Net.Sockets.TcpClient
        $connect = $tcp.BeginConnect("localhost", 5672, $null, $null)
        $success = $connect.AsyncWaitHandle.WaitOne(2000, $false)
        if (-not $success) { 
            $tcp.Close()
            return $false 
        }
        $tcp.EndConnect($connect)
        $tcp.Close()
        return $true
    }
    catch {
        return $false
    }
}

function Start-RabbitMQ {
    Print-Step "Starting RabbitMQ container..."
    
    if (-not (Get-Command docker -ErrorAction SilentlyContinue)) {
        Print-Error "Docker is not installed or not in PATH."
        return $false
    }
    
    # Remove existing container if it exists
    docker rm -f rabbitmq 2>$null
    
    # Run RabbitMQ in detached mode
    docker run -d --name rabbitmq -p 5672:5672 -p 15672:15672 `
        -e RABBITMQ_DEFAULT_USER=admin `
        -e RABBITMQ_DEFAULT_PASS=admin `
        -e RABBITMQ_DEFAULT_VHOST=/ `
        rabbitmq:3.13-management-alpine
    
    # Wait for RabbitMQ to be ready
    Print-Step "Waiting for RabbitMQ to be ready..."
    $maxAttempts = 30
    $attempt = 0
    while ($attempt -lt $maxAttempts) {
        Start-Sleep -Seconds 2
        if (Check-RabbitMQ) {
            Print-Success "RabbitMQ is ready."
            return $true
        }
        $attempt++
        Write-Host "." -NoNewline
    }
    Print-Error "RabbitMQ failed to start in time."
    return $false
}

function Flush-Databases {
    Print-Header "FLUSHING DATABASES"
    
    Write-Host "WARNING: This will PERMANENTLY DELETE all local SQLite database files!" -ForegroundColor Red
    Write-Host "This action cannot be undone." -ForegroundColor Red
    $confirmation = Read-Host "Are you sure you want to proceed? (yes/no)"
    
    if ($confirmation -notmatch "^y(es)?$") {
        Print-Info "Database flush cancelled by user."
        return
    }

    # List of database files to delete
    $dbFiles = @(
        "$AuthDir\db.sqlite3",
        "$WorkflowDir\db.sqlite3",
        "$MessagingDir\db.sqlite3",
        "$NotificationDir\db.sqlite3",
        "$HelpdeskDir\db.sqlite3"
    )
    
    $failedCount = 0
    foreach ($dbFile in $dbFiles) {
        if (Test-Path $dbFile) {
            # Try multiple times in case of temporary locks
            $maxRetries = 3
            $deleted = $false
            for ($retry = 1; $retry -le $maxRetries; $retry++) {
                try {
                    Remove-Item $dbFile -Force -ErrorAction Stop
                    Print-Success "Deleted: $dbFile"
                    $deleted = $true
                    break
                }
                catch {
                    if ($retry -lt $maxRetries) {
                        Print-Info "Retry $retry/$maxRetries for: $dbFile"
                        Start-Sleep -Seconds 1
                    }
                }
            }
            if (-not $deleted) {
                Print-Error "Could not delete (file locked): $dbFile"
                Print-Info "The file may be locked by VSCode or another process."
                Print-Info "Continuing anyway - migrations will update the existing database."
                $failedCount++
            }
        } else {
            Print-Info "Not found (skipping): $dbFile"
        }
    }
    
    if ($failedCount -eq 0) {
        Print-Success "Database flush complete"
    } else {
        Print-Info "Database flush completed with $failedCount locked files"
    }
}

function Run-Migrations {
    Print-Header "RUNNING MIGRATIONS"
    
    # Auth Service
    if (Test-Path $AuthDir) {
        Print-Step "Migrating Auth Service..."
        Push-Location $AuthDir
        try {
            & $PythonExe manage.py migrate --noinput
            if ($LASTEXITCODE -ne 0) { throw "Migration failed with exit code $LASTEXITCODE" }
            Print-Success "Auth migrations complete"
        }
        catch {
            Print-Error "Auth migrations failed: $_"
            Pop-Location
            throw
        }
        Pop-Location
    }
    
    # Workflow API
    if (Test-Path $WorkflowDir) {
        Print-Step "Migrating Workflow API..."
        Push-Location $WorkflowDir
        try {
            & $PythonExe manage.py migrate --noinput
            if ($LASTEXITCODE -ne 0) { throw "Migration failed with exit code $LASTEXITCODE" }
            Print-Success "Workflow migrations complete"
        }
        catch {
            Print-Error "Workflow migrations failed: $_"
            Pop-Location
            throw
        }
        Pop-Location
    }
    
    # Messaging Service
    if (Test-Path $MessagingDir) {
        Print-Step "Migrating Messaging Service..."
        Push-Location $MessagingDir
        try {
            & $PythonExe manage.py migrate --noinput
            if ($LASTEXITCODE -ne 0) { throw "Migration failed with exit code $LASTEXITCODE" }
            Print-Success "Messaging migrations complete"
        }
        catch {
            Print-Error "Messaging migrations failed: $_"
            Pop-Location
            throw
        }
        Pop-Location
    }
    
    # Notification Service
    if (Test-Path $NotificationDir) {
        Print-Step "Migrating Notification Service..."
        Push-Location $NotificationDir
        try {
            & $PythonExe manage.py migrate --noinput
            if ($LASTEXITCODE -ne 0) { throw "Migration failed with exit code $LASTEXITCODE" }
            Print-Success "Notification migrations complete"
        }
        catch {
            Print-Error "Notification migrations failed: $_"
            Pop-Location
            throw
        }
        Pop-Location
    }
    
    # Helpdesk Service
    if (Test-Path $HelpdeskDir) {
        Print-Step "Migrating Helpdesk Service..."
        Push-Location $HelpdeskDir
        try {
            & $PythonExe manage.py migrate --noinput
            if ($LASTEXITCODE -ne 0) { throw "Migration failed with exit code $LASTEXITCODE" }
            Print-Success "Helpdesk migrations complete"
        }
        catch {
            Print-Error "Helpdesk migrations failed: $_"
            Pop-Location
            throw
        }
        Pop-Location
    }
}

function Start-WorkersForSeeding {
    Print-Header "STARTING WORKERS FOR SEEDING"
    
    # Create log directory
    if (-not (Test-Path $LogDir)) {
        New-Item -ItemType Directory -Path $LogDir -Force | Out-Null
    }
    
    $script:workerPids = @{}
    
    # Workflow Worker (needed for TTS sync)
    Print-Step "Starting Workflow Worker for seeding..."
    $workflowWorkerArgs = "-m celery -A workflow_api worker --pool=solo --loglevel=info -Q role_send-default,TICKET_TASKS_PRODUCTION,tts.role.sync,tts.user_system_role.sync,workflow_seed_queue,workflow_seed"
    $workflowWorkerProc = Start-Process -FilePath $PythonExe -ArgumentList $workflowWorkerArgs `
        -WorkingDirectory $WorkflowDir -PassThru -NoNewWindow `
        -RedirectStandardOutput "$LogDir\workflow_worker.log" -RedirectStandardError "$LogDir\workflow_worker_err.log"
    if ($workflowWorkerProc.Id) {
        $script:workerPids["workflow_worker"] = $workflowWorkerProc.Id
        Print-Success "Workflow Worker started (PID: $($workflowWorkerProc.Id))"
    }
    
    # Helpdesk Worker (needed for HDTS sync)
    if (Test-Path $HelpdeskDir) {
        Print-Step "Starting Helpdesk Worker for seeding..."
        $helpdeskWorkerArgs = "-m celery -A backend worker --loglevel=info --queues=hdts.user.sync,hdts.user_system_role.sync,hdts.employee.sync,ticket_tasks2 --pool=solo"
        $helpdeskWorkerProc = Start-Process -FilePath $PythonExe -ArgumentList $helpdeskWorkerArgs `
            -WorkingDirectory $HelpdeskDir -PassThru -NoNewWindow `
            -RedirectStandardOutput "$LogDir\helpdesk_worker.log" -RedirectStandardError "$LogDir\helpdesk_worker_err.log"
        if ($helpdeskWorkerProc.Id) {
            $script:workerPids["helpdesk_worker"] = $helpdeskWorkerProc.Id
            Print-Success "Helpdesk Worker started (PID: $($helpdeskWorkerProc.Id))"
        }
    }
    
    # Notification Worker
    Print-Step "Starting Notification Worker for seeding..."
    $notificationWorkerArgs = "-m celery -A notification_service worker --pool=solo --loglevel=info -Q notification-queue-default,inapp-notification-queue"
    $notificationWorkerProc = Start-Process -FilePath $PythonExe -ArgumentList $notificationWorkerArgs `
        -WorkingDirectory $NotificationDir -PassThru -NoNewWindow `
        -RedirectStandardOutput "$LogDir\notification_worker.log" -RedirectStandardError "$LogDir\notification_worker_err.log"
    if ($notificationWorkerProc.Id) {
        $script:workerPids["notification_worker"] = $notificationWorkerProc.Id
        Print-Success "Notification Worker started (PID: $($notificationWorkerProc.Id))"
    }
    
    # Wait for workers to initialize
    Print-Step "Waiting for workers to initialize (10s)..."
    Start-Sleep -Seconds 10
}

function Stop-SeedingWorkers {
    Print-Step "Stopping seeding workers..."
    foreach ($service in $script:workerPids.Keys) {
        $procId = $script:workerPids[$service]
        try {
            $proc = Get-Process -Id $procId -ErrorAction SilentlyContinue
            if ($proc) {
                Stop-Process -Id $procId -Force -ErrorAction SilentlyContinue
                Print-Info "Stopped $service (PID: $procId)"
            }
        }
        catch {}
    }
}

function Run-Seeding {
    Print-Header "SEEDING DATA"
    
    # Auth Service Seeds (Source of Truth)
    if (Test-Path $AuthDir) {
        Push-Location $AuthDir
        
        try {
            Print-Step "Creating default admin..."
            & $PythonExe manage.py create_default_admin
            if ($LASTEXITCODE -ne 0) { Print-Error "create_default_admin failed with exit code $LASTEXITCODE" }
            
            Print-Step "Seeding systems..."
            & $PythonExe manage.py seed_systems
            if ($LASTEXITCODE -ne 0) { throw "seed_systems failed with exit code $LASTEXITCODE" }
            
            Print-Step "Seeding TTS data (roles and users)..."
            & $PythonExe manage.py seed_tts
            if ($LASTEXITCODE -ne 0) { throw "seed_tts failed with exit code $LASTEXITCODE" }
            
            # Re-sync TTS roles with delay to avoid SQLite lock issues
            # This ensures all roles are properly synced to workflow_api
            Print-Step "Re-syncing TTS roles to workflow_api (with delay)..."
            & $PythonExe manage.py sync_tts_roles --delay 0.5
            if ($LASTEXITCODE -ne 0) { Print-Error "sync_tts_roles failed with exit code $LASTEXITCODE" }
            
            Print-Step "Seeding HDTS data..."
            & $PythonExe manage.py seed_hdts
            if ($LASTEXITCODE -ne 0) { throw "seed_hdts failed with exit code $LASTEXITCODE" }
            
            Print-Step "Seeding employees..."
            & $PythonExe manage.py seed_employees
            if ($LASTEXITCODE -ne 0) { throw "seed_employees failed with exit code $LASTEXITCODE" }
            
            Print-Step "Syncing user emails to notification service..."
            & $PythonExe manage.py sync_user_emails
            if ($LASTEXITCODE -ne 0) { Print-Error "sync_user_emails failed with exit code $LASTEXITCODE" }
            
            Print-Success "Auth seeding complete"
        }
        catch {
            Print-Error "Seeding failed: $_"
            Pop-Location
            throw
        }
        Pop-Location
    }
    
    # Wait for async sync and monitor workers
    Print-Step "Waiting for async synchronization (role/user sync)..."
    $waitTime = 15
    for ($i = 1; $i -le $waitTime; $i++) {
        Write-Progress -Activity "Async Sync Progress" -Status "$i / $waitTime seconds" -PercentComplete (($i / $waitTime) * 100)
        Start-Sleep -Seconds 1
        
        # Check if workers are still running
        $allRunning = $true
        foreach ($service in $script:workerPids.Keys) {
            $procId = $script:workerPids[$service]
            $proc = Get-Process -Id $procId -ErrorAction SilentlyContinue
            if (-not $proc) {
                Print-Error "Worker $service (PID: $procId) has stopped unexpectedly!"
                $allRunning = $false
            }
        }
        
        if (-not $allRunning) {
            Print-Error "One or more workers crashed. Check logs in $LogDir"
            throw "Worker process failed"
        }
    }
    Write-Progress -Activity "Async Sync Progress" -Completed
    Print-Success "Async synchronization complete"
    
    # Workflow API seeding (after roles are synced)
    # NOTE: seed_tts triggers async workflow seeding, but due to SQLite concurrency issues
    # and race conditions, we run it directly here after sync is complete
    if (Test-Path $WorkflowDir) {
        Print-Step "Seeding Workflow API (workflows)..."
        Push-Location $WorkflowDir
        try {
            & $PythonExe manage.py seed_workflows2 --force
            if ($LASTEXITCODE -ne 0) { 
                Print-Error "seed_workflows2 failed with exit code $LASTEXITCODE"
                # Check if roles exist
                Print-Info "Checking synced roles in workflow_api..."
                & $PythonExe -c "from role.models import Roles; print('Roles:', list(Roles.objects.values_list('role_id', 'name')))"
            } else {
                Print-Success "Workflow seeding complete"
            }
        }
        catch {
            Print-Error "Workflow seeding failed: $_"
        }
        Pop-Location
    }
}

# --- Main Execution ---

Print-Header "TTS SERVICE MANAGER"
Print-Info "Process: 1. Infra Check → 2. Cleanup/Migrate → 3. Start Workers → 4. Seed → 5. Monitor & Stop Workers"

try {
    # 1. INFRASTRUCTURE CHECK
    Print-Header "STEP 1: INFRASTRUCTURE CHECK"
    
    # Activate virtual environment
    Print-Step "Activating Python Virtual Environment..."
    if (Test-Path $VenvPath) { 
        . $VenvPath 
        Print-Success "Virtual environment activated"
    } else { 
        throw "Virtual environment not found at $VenvPath"
    }

    # Set environment variables
    Set-EnvironmentVariables
    Print-Success "Environment variables configured"

    # Check and Start RabbitMQ
    if (-not $SkipRabbitMQ) {
        if (Check-RabbitMQ) {
            Print-Success "RabbitMQ is already running"
        } else {
            Print-Step "RabbitMQ is not running - starting it now..."
            if (-not (Start-RabbitMQ)) {
                throw "Failed to start RabbitMQ"
            }
        }
    } else {
        if (-not (Check-RabbitMQ)) {
            throw "RabbitMQ is not running and -SkipRabbitMQ was specified"
        }
        Print-Success "RabbitMQ check passed"
    }

    # 2. CLEANUP AND MIGRATE
    Print-Header "STEP 2: CLEANUP AND MIGRATE"
    
    # Flush databases if requested
    if ($FlushDB) {
        Flush-Databases
    }

    # Run migrations
    if (-not $SkipMigrations) {
        Run-Migrations
    } else {
        Print-Info "Skipping migrations"
    }

    # 3, 4, 5. SEED WITH WORKERS (if requested)
    if ($Seed) {
        Print-Header "STEP 3: START WORKERS"
        Start-WorkersForSeeding
        
        Print-Header "STEP 4: RUN SEEDS"
        Run-Seeding
        
        Print-Header "STEP 5: STOP WORKERS"
        Stop-SeedingWorkers
    }

    # Success Summary
    Print-Header "COMPLETED SUCCESSFULLY"
    Write-Host ""
    Write-Host "  Tasks completed:" -ForegroundColor White
    if ($FlushDB) { Write-Host "    [OK] Databases flushed" -ForegroundColor Green }
    if (-not $SkipMigrations) { Write-Host "    [OK] Migrations applied" -ForegroundColor Green }
    if ($Seed) { Write-Host "    [OK] Data seeded" -ForegroundColor Green }
    Write-Host ""
    Write-Host "  RabbitMQ Management: http://localhost:15672 (admin/admin)" -ForegroundColor Gray
    Write-Host ""
    Write-Host "  Use individual start scripts to run services:" -ForegroundColor Yellow
    Write-Host "    .\Scripts\start_auth.ps1" -ForegroundColor White
    Write-Host "    .\Scripts\start_workflow.ps1" -ForegroundColor White
    Write-Host "    .\Scripts\start_frontend.ps1" -ForegroundColor White
    Write-Host "    etc." -ForegroundColor White
    Write-Host ""
    
    exit 0
}
catch {
    Print-Header "SCRIPT FAILED"
    Print-Error $_.Exception.Message
    Print-Error "Stack Trace: $($_.ScriptStackTrace)"
    
    # Try to stop any running workers
    if ($script:workerPids -and $script:workerPids.Count -gt 0) {
        Print-Step "Attempting to stop any running workers..."
        Stop-SeedingWorkers
    }
    
    Write-Host ""
    Write-Host "Check logs in: $LogDir" -ForegroundColor Yellow
    Write-Host ""
    
    exit 1
}
