# TTS Bulk Resolution Script
# Resolves tasks with controlled resolution and halfway rates
#
# Usage Examples:
#   .\bulk_resolve.ps1                                        # Interactive (70% resolved, 80% halfway)
#   .\bulk_resolve.ps1 -ResolutionRate 80                     # 80% resolved, 80% halfway
#   .\bulk_resolve.ps1 -ResolutionRate 70 -HalfwayRate 90     # 70% resolved, 90% of rest halfway
#   .\bulk_resolve.ps1 -Date "2025-08-13"                     # Specific date
#   .\bulk_resolve.ps1 -StartDate "2025-01-01" -EndDate "2025-12-31"  # Date range
#   .\bulk_resolve.ps1 -SlaRate 85                            # 85% within SLA
#   .\bulk_resolve.ps1 -SlaRate 80 -MinDelayDays 2 -MaxDelayDays 5  # SLA breach delays
#   .\bulk_resolve.ps1 -DryRun                                # Preview changes
#   .\bulk_resolve.ps1 -Verbose                               # Detailed output

param(
    [Parameter(Position=0)]
    [string]$Date,
    
    [string]$StartDate,
    [string]$EndDate,
    
    [int]$ResolutionRate = 70,
    [int]$HalfwayRate = 80,
    [int]$MaxProgressDays = 7,
    [int]$SlaRate = 100,
    [int]$MinDelayDays = 1,
    [int]$MaxDelayDays = 7,
    
    [switch]$DryRun,
    [switch]$ShowDetails,
    [switch]$Json,
    [switch]$Help
)

$ErrorActionPreference = "Stop"
$ScriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$ProjectRoot = (Get-Item $ScriptDir).Parent.Parent.FullName
$WorkflowApiPath = Join-Path $ProjectRoot "tts\workflow_api"

if ($Help) {
    Write-Host ""
    Write-Host "TTS Bulk Resolution Tool" -ForegroundColor Cyan
    Write-Host "========================" -ForegroundColor Cyan
    Write-Host ""
    Write-Host "Resolves tasks with controlled outcomes for historical seeding validation."
    Write-Host ""
    Write-Host "PARAMETERS:" -ForegroundColor Yellow
    Write-Host "  -Date <YYYY-MM-DD>       Single date to process"
    Write-Host "  -StartDate <YYYY-MM-DD>  Start of date range (default: all time)"
    Write-Host "  -EndDate <YYYY-MM-DD>    End of date range (default: today)"
    Write-Host "  -ResolutionRate <0-100>  Percentage of tasks to fully resolve (default: 70)"
    Write-Host "  -HalfwayRate <0-100>     Percentage of unresolved tasks to start (default: 80)"
    Write-Host "  -MaxProgressDays <1+>    Max days after creation for halfway progress (default: 7)"
    Write-Host "  -SlaRate <0-100>         Percentage of resolved tasks within SLA (default: 100)"
    Write-Host "  -MinDelayDays <1+>       Minimum delay days for SLA breaches (default: 1)"
    Write-Host "  -MaxDelayDays <1+>       Maximum delay days for SLA breaches (default: 7)"
    Write-Host "  -DryRun                  Preview changes without applying"
    Write-Host "  -ShowDetails             Show detailed per-task progress"
    Write-Host "  -Json                    Output as JSON"
    Write-Host ""
    Write-Host "EXAMPLES:" -ForegroundColor Yellow
    Write-Host "  # Resolve 70% of all tasks, 80% of rest started"
    Write-Host "  .\bulk_resolve.ps1"
    Write-Host ""
    Write-Host "  # Resolve 100% of tasks from a specific date"
    Write-Host "  .\bulk_resolve.ps1 -Date 2025-08-13 -ResolutionRate 100"
    Write-Host ""
    Write-Host "  # Resolve 50% of Q4 2025 tasks"
    Write-Host "  .\bulk_resolve.ps1 -StartDate 2025-10-01 -EndDate 2025-12-31 -ResolutionRate 50"
    Write-Host ""
    Write-Host "  # 85% within SLA, 15% with 1-7 day delays"
    Write-Host "  .\bulk_resolve.ps1 -ResolutionRate 80 -SlaRate 85"
    Write-Host ""
    Write-Host "  # SLA breaches delayed 2-5 days"
    Write-Host "  .\bulk_resolve.ps1 -SlaRate 70 -MinDelayDays 2 -MaxDelayDays 5"
    Write-Host ""
    Write-Host "  # Preview what would happen"
    Write-Host "  .\bulk_resolve.ps1 -DryRun -ShowDetails"
    Write-Host ""
    exit 0
}

Write-Host ""
Write-Host "==========================================" -ForegroundColor Cyan
Write-Host "  TTS Bulk Resolution Tool" -ForegroundColor Cyan
Write-Host "==========================================" -ForegroundColor Cyan
Write-Host ""

# Check if workflow_api directory exists
if (-not (Test-Path $WorkflowApiPath)) {
    Write-Host "ERROR: workflow_api directory not found at: $WorkflowApiPath" -ForegroundColor Red
    exit 1
}

# Build command arguments
$cmdArgs = @()

if ($Date) {
    $cmdArgs += "--date"
    $cmdArgs += $Date
}

if ($StartDate -and -not $Date) {
    $cmdArgs += "--start-date"
    $cmdArgs += $StartDate
}

if ($EndDate -and -not $Date) {
    $cmdArgs += "--end-date"
    $cmdArgs += $EndDate
}

$cmdArgs += "--resolution-rate"
$cmdArgs += $ResolutionRate

$cmdArgs += "--halfway-rate"
$cmdArgs += $HalfwayRate

$cmdArgs += "--max-progress-days"
$cmdArgs += $MaxProgressDays

$cmdArgs += "--sla-rate"
$cmdArgs += $SlaRate

$cmdArgs += "--min-delay-days"
$cmdArgs += $MinDelayDays

$cmdArgs += "--max-delay-days"
$cmdArgs += $MaxDelayDays

if ($DryRun) {
    $cmdArgs += "--dry-run"
}

if ($ShowDetails) {
    $cmdArgs += "--verbose"
}

if ($Json) {
    $cmdArgs += "--json"
}

# Change to workflow_api directory
Push-Location $WorkflowApiPath

try {
    Write-Host "Working directory: $WorkflowApiPath" -ForegroundColor Gray
    Write-Host "Executing: python manage.py bulk_resolve $($cmdArgs -join ' ')" -ForegroundColor Gray
    Write-Host ""
    
    # Execute the management command
    & python manage.py bulk_resolve $cmdArgs
    
    if ($LASTEXITCODE -ne 0) {
        Write-Host ""
        Write-Host "Command exited with code: $LASTEXITCODE" -ForegroundColor Yellow
    }
}
finally {
    Pop-Location
}

Write-Host ""
