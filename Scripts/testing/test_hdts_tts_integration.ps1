<# 
.SYNOPSIS
    HDTS-TTS Integration Test Runner

.DESCRIPTION
    Runs the end-to-end integration test between HDTS (Helpdesk) and TTS (Workflow API).
    Tests the complete ticket lifecycle: creation -> workflow processing -> status sync.

.PARAMETER TargetStatus
    Target status for the ticket: 'InProgress' or 'Resolved'. Default: Resolved

.PARAMETER Verbose
    Enable verbose output

.PARAMETER DryRun
    Show what would happen without making changes

.PARAMETER SkipHealthCheck
    Skip the service health check step

.EXAMPLE
    .\test_hdts_tts_integration.ps1

.EXAMPLE
    .\test_hdts_tts_integration.ps1 -TargetStatus InProgress -Verbose

.EXAMPLE
    .\test_hdts_tts_integration.ps1 -DryRun
#>

param(
    [ValidateSet('InProgress', 'Resolved')]
    [string]$TargetStatus = 'Resolved',
    
    [switch]$VerboseOutput,
    
    [switch]$DryRun,
    
    [switch]$SkipHealthCheck,
    
    [ValidateSet('IT Support', 'Asset Check In', 'Asset Check Out', 'New Budget Proposal', 'Others')]
    [string]$Category = 'IT Support',
    
    [ValidateSet('IT Department', 'Asset Department', 'Budget Department')]
    [string]$Department = 'IT Department'
)

$ErrorActionPreference = "Stop"

# Get script directory and project root
$ScriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$ProjectRoot = (Get-Item "$ScriptDir\..\..").FullName

# Python executable
$VenvPython = Join-Path $ProjectRoot "venv\Scripts\python.exe"
if (-not (Test-Path $VenvPython)) {
    Write-Warning "Virtual environment not found at $VenvPython"
    Write-Host "Using system Python..."
    $VenvPython = "python"
}

# Build arguments
$PythonScript = Join-Path $ScriptDir "test_hdts_tts_integration.py"
$Args = @()

# Map InProgress to "In Progress" (with space)
if ($TargetStatus -eq 'InProgress') {
    $Args += @("--target-status", "In Progress")
} else {
    $Args += @("--target-status", $TargetStatus)
}

$Args += @("--category", $Category)
$Args += @("--department", $Department)

if ($VerboseOutput) {
    $Args += "--verbose"
}

if ($DryRun) {
    $Args += "--dry-run"
}

if ($SkipHealthCheck) {
    $Args += "--skip-health-check"
}

Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
Write-Host " HDTS-TTS Integration Test Runner" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "  Python:    $VenvPython"
Write-Host "  Script:    $PythonScript"
Write-Host "  Arguments: $($Args -join ' ')"
Write-Host ""

# Run the test
& $VenvPython $PythonScript $Args

$ExitCode = $LASTEXITCODE

if ($ExitCode -eq 0) {
    Write-Host ""
    Write-Host "========================================" -ForegroundColor Green
    Write-Host " All Tests Passed!" -ForegroundColor Green
    Write-Host "========================================" -ForegroundColor Green
} else {
    Write-Host ""
    Write-Host "========================================" -ForegroundColor Red
    Write-Host " Some Tests Failed" -ForegroundColor Red
    Write-Host "========================================" -ForegroundColor Red
}

exit $ExitCode
