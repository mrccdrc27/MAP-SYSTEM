# run_local_tests.ps1
# PowerShell Script to run Auth Service API tests locally (no Docker)
# Uses SQLite for testing - simpler setup

param(
    [switch]$Verbose,
    [string]$Module = "",
    [switch]$Coverage,
    [switch]$Help,
    [switch]$Install
)

$Blue = "Cyan"
$Green = "Green"
$Yellow = "Yellow"
$Red = "Red"

# Get script directory and auth directory
$ScriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$AuthDir = Split-Path -Parent $ScriptDir

if ($Help) {
    Write-Host "Usage: .\run_local_tests.ps1 [options]" -ForegroundColor $Blue
    Write-Host ""
    Write-Host "Options:"
    Write-Host "  -Verbose          Verbose output"
    Write-Host "  -Module <name>    Run specific test module (e.g., test_login)"
    Write-Host "  -Coverage         Generate coverage report"
    Write-Host "  -Install          Install test dependencies first"
    Write-Host "  -Help             Show this help message"
    Write-Host ""
    Write-Host "Examples:"
    Write-Host "  .\run_local_tests.ps1                    # Run all tests"
    Write-Host "  .\run_local_tests.ps1 -Module test_login # Run login tests only"
    Write-Host "  .\run_local_tests.ps1 -Verbose -Coverage # Verbose with coverage"
    exit 0
}

Write-Host "================================================" -ForegroundColor $Blue
Write-Host "     AUTH SERVICE API TESTS (Local)" -ForegroundColor $Blue
Write-Host "================================================" -ForegroundColor $Blue
Write-Host ""

# Change to auth directory
Set-Location $AuthDir
Write-Host "Working directory: $AuthDir" -ForegroundColor $Yellow

# Install dependencies if requested
if ($Install) {
    Write-Host "Installing test dependencies..." -ForegroundColor $Yellow
    pip install -r api_tests/requirements-test.txt
    Write-Host ""
}

# Build pytest arguments
$Args = @()
$Args += "api_tests/"

if ($Module) {
    $Args = @("api_tests/$Module.py")
}

if ($Verbose) {
    $Args += "-v"
} else {
    $Args += "-q"
}

# Always generate JUnit report
$Timestamp = Get-Date -Format "yyyyMMdd_HHmmss"
$Args += "--junitxml=api_tests/reports/junit_$Timestamp.xml"

# HTML report
$Args += "--html=api_tests/reports/report_$Timestamp.html"
$Args += "--self-contained-html"

if ($Coverage) {
    $Args += "--cov=users"
    $Args += "--cov=emails"
    $Args += "--cov-report=term-missing"
    $Args += "--cov-report=html:api_tests/reports/coverage_$Timestamp"
}

# Show local variables on failure
$Args += "-l"

# Reuse database for speed
$Args += "--reuse-db"

Write-Host "Running: python -m pytest $($Args -join ' ')" -ForegroundColor $Yellow
Write-Host ""

# Set environment for testing
$env:DJANGO_ENV = "testing"
$env:RECAPTCHA_ENABLED = "False"

# Run pytest
python -m pytest @Args

$ExitCode = $LASTEXITCODE

Write-Host ""

if ($ExitCode -eq 0) {
    Write-Host "================================================" -ForegroundColor $Green
    Write-Host "     ALL TESTS PASSED!" -ForegroundColor $Green
    Write-Host "================================================" -ForegroundColor $Green
} else {
    Write-Host "================================================" -ForegroundColor $Red
    Write-Host "     SOME TESTS FAILED!" -ForegroundColor $Red
    Write-Host "================================================" -ForegroundColor $Red
}

Write-Host ""
Write-Host "Reports saved to: $ScriptDir\reports\" -ForegroundColor $Blue

# List generated reports
$ReportFiles = Get-ChildItem "$ScriptDir\reports\*$Timestamp*" -ErrorAction SilentlyContinue
foreach ($file in $ReportFiles) {
    Write-Host "  - $($file.Name)" -ForegroundColor $Green
}

exit $ExitCode
