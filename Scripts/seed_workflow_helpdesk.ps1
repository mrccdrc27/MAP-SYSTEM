<#
.SYNOPSIS
    Integrated Architecture Seeder for TTS & HDTS.
    
.DESCRIPTION
    This script tests the full event-driven architecture.
    It starts Celery workers, seeds the Auth service (Source of Truth), 
    and relies on RabbitMQ to propagate data to Workflow API and HDTS.
    
    Flow:
    1. Start RabbitMQ (Check).
    2. Start Workflow API Celery Worker (Background).
    3. Start Helpdesk Celery Worker (Background).
    4. Seed Auth Service.
       -> Triggers 'tts.role.sync' -> Workflow Worker creates Roles.
       -> Triggers 'tts.user.sync' -> Workflow Worker creates Users.
       -> Triggers 'workflow_seed' -> Workflow Worker runs seed_workflows2.
       -> Triggers 'hdts.employee.sync' -> Helpdesk Worker creates Employees.
    5. Verify data exists in downstream DBs.
    6. Stop Workers.

.NOTES
    File Name      : seed_workflow_helpdesk.ps1
    Prerequisite   : RabbitMQ must be running.
#>

$ErrorActionPreference = "Stop"

# --- Configuration ---
$ProjectRoot = Resolve-Path "$PSScriptRoot\.."
$VenvPath = "$ProjectRoot\venv\Scripts\Activate.ps1"
$AuthDir = "$ProjectRoot\auth"
$WorkflowDir = "$ProjectRoot\tts\workflow_api"
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

function Show-Progress {
    param (
        [int]$Seconds,
        [string]$Activity
    )
    Write-Host " -> $Activity..." -ForegroundColor Yellow
    for ($i = 1; $i -le $Seconds; $i++) {
        Write-Progress -Activity $Activity -Status "$i / $Seconds seconds" -PercentComplete (($i / $Seconds) * 100)
        Start-Sleep -Seconds 1
    }
    Write-Progress -Activity $Activity -Completed
}

function Check-RabbitMQ {
    Print-Step "Checking RabbitMQ connection (port 5672)..."
    try {
        $tcp = New-Object System.Net.Sockets.TcpClient
        $connect = $tcp.BeginConnect("localhost", 5672, $null, $null)
        $success = $connect.AsyncWaitHandle.WaitOne(2000, $false)
        if (-not $success) { throw "Timeout" }
        $tcp.EndConnect($connect)
        $tcp.Close()
        Print-Success "RabbitMQ is reachable."
    }
    catch {
        Print-Error "RabbitMQ is NOT reachable on localhost:5672."
        exit 1
    }
}

function Run-Django-Command {
    param (
        [string]$Directory,
        [string]$Command,
        [string]$Description
    )
    Print-Step "$Description..."
    Push-Location $Directory
    try {
        $argsList = $Command -split " "
        & python $argsList
        if ($LASTEXITCODE -ne 0) { throw "Command failed" }
        Print-Success "$Description complete."
    }
    catch {
        Print-Error "Failed: $Description"
        Write-Error $_ 
        Pop-Location
        exit 1
    }
    Pop-Location
}

# --- Main Execution ---

Print-Header "TTS & HDTS INTEGRATED SEEDER"

# 1. Setup Environment
Check-RabbitMQ
Print-Step "Activating Python Virtual Environment..."
if (Test-Path $VenvPath) { . $VenvPath } else { exit 1 }

# Set Environment Variables for all processes
$env:DJANGO_ENV = "development"
$env:DJANGO_DEBUG = "True"
$env:CELERY_BROKER_URL = "amqp://admin:admin@localhost:5672/"
$env:DJANGO_CELERY_BROKER_URL = "amqp://admin:admin@localhost:5672/"
$env:DJANGO_AUTH_SERVICE_URL = "http://localhost:8003"
# FORCE SQLITE for this test script to ensure we use local DBs
$env:DATABASE_URL = "sqlite:///db.sqlite3" 

# 2. Start Background Workers
Print-Header "STARTING BACKGROUND WORKERS"

# We use Start-Process with the venv python executable
$PythonExe = "$ProjectRoot\venv\Scripts\python.exe"

# A. Workflow Worker
Print-Step "Starting Workflow API Worker..."
$WorkflowWorkerArgs = "-m celery -A workflow_api worker --pool=solo --loglevel=info -Q role_send-default,TICKET_TASKS_PRODUCTION,tts.role.sync,tts.user_system_role.sync,workflow_seed_queue,workflow_seed"
$WorkflowWorkerProcess = Start-Process -FilePath $PythonExe -ArgumentList $WorkflowWorkerArgs -WorkingDirectory $WorkflowDir -PassThru -NoNewWindow -RedirectStandardOutput "$ProjectRoot\workflow_worker.log" -RedirectStandardError "$ProjectRoot\workflow_worker_err.log"

if ($WorkflowWorkerProcess.Id) {
    Print-Success "Workflow Worker started (PID: $($WorkflowWorkerProcess.Id))"
} else {
    Print-Error "Failed to start Workflow Worker"
    exit 1
}

# B. Helpdesk Worker
Print-Step "Starting Helpdesk Worker..."
$HelpdeskWorkerArgs = "-m celery -A backend worker --loglevel=info --queues=hdts.user.sync,hdts.user_system_role.sync,hdts.employee.sync,ticket_tasks2 --pool=solo"
$HelpdeskWorkerProcess = Start-Process -FilePath $PythonExe -ArgumentList $HelpdeskWorkerArgs -WorkingDirectory $HelpdeskDir -PassThru -NoNewWindow -RedirectStandardOutput "$ProjectRoot\helpdesk_worker.log" -RedirectStandardError "$ProjectRoot\helpdesk_worker_err.log"

if ($HelpdeskWorkerProcess.Id) {
    Print-Success "Helpdesk Worker started (PID: $($HelpdeskWorkerProcess.Id))"
} else {
    Print-Error "Failed to start Helpdesk Worker"
    Stop-Process -Id $WorkflowWorkerProcess.Id -Force
    exit 1
}

Show-Progress -Seconds 10 -Activity "Waiting for workers to initialize"

# 3. Seed Auth (The Trigger)
Print-Header "SEEDING AUTH SERVICE (SOURCE OF TRUTH)"

try {
    # Migrations first
    Run-Django-Command $AuthDir "manage.py migrate" "Auth Migrations"
    Run-Django-Command $WorkflowDir "manage.py migrate" "Workflow Migrations"
    Run-Django-Command $HelpdeskDir "manage.py migrate" "Helpdesk Migrations"

    # Seeding triggers
    Run-Django-Command $AuthDir "manage.py seed_systems" "Seeding Systems"
    
    Print-Step "Seeding TTS (Should trigger Workflow Worker)..."
    Run-Django-Command $AuthDir "manage.py seed_tts" "Seeding TTS Data"
    
    Print-Step "Seeding HDTS (Should trigger Helpdesk Worker)..."
    Run-Django-Command $AuthDir "manage.py seed_hdts" "Seeding HDTS Data"
    
    Print-Step "Seeding Employees (Should trigger Helpdesk Worker)..."
    Run-Django-Command $AuthDir "manage.py seed_employees" "Seeding Employees"

    Show-Progress -Seconds 20 -Activity "Waiting for async synchronization"

} catch {
    Print-Error "Seeding failed. Checking Worker Logs..."
    Get-Content "$ProjectRoot\workflow_worker_err.log" -Tail 10 | Write-Host -ForegroundColor Gray
    Get-Content "$ProjectRoot\helpdesk_worker_err.log" -Tail 10 | Write-Host -ForegroundColor Gray
} finally {
    # 4. Cleanup
    Print-Header "CLEANUP"
    Print-Step "Stopping Workers..."
    
    if (-not $WorkflowWorkerProcess.HasExited) { Stop-Process -Id $WorkflowWorkerProcess.Id -Force; Print-Success "Stopped Workflow Worker" }
    if (-not $HelpdeskWorkerProcess.HasExited) { Stop-Process -Id $HelpdeskWorkerProcess.Id -Force; Print-Success "Stopped Helpdesk Worker" }
    
    # Remove log files if you want, or keep them for debug
    # Remove-Item "$ProjectRoot\*.log" -ErrorAction SilentlyContinue
}

Print-Header "VERIFICATION (MANUAL CHECK REQUIRED)"
Write-Host "Check the log files '$ProjectRoot\workflow_worker.log' and '$ProjectRoot\helpdesk_worker.log'"
Write-Host "to confirm tasks were processed successfully."

Write-Host "`nUse these commands to verify data manually:" -ForegroundColor Cyan
Write-Host "1. Workflow Roles: python tts/workflow_api/manage.py shell -c 'from role.models import Roles; print(Roles.objects.all())'"
Write-Host "2. Helpdesk Employees: python hdts/helpdesk/manage.py shell -c 'from core.models import Employee; print(Employee.objects.count())'"