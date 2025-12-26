# run_docker_tests.ps1
# PowerShell Script to run Auth Service API tests in Docker

param(
    [switch]$Verbose,
    [string]$Module = "",
    [switch]$Coverage,
    [switch]$Html,
    [switch]$Help,
    [switch]$Clean
)

# Colors
$Red = "Red"
$Green = "Green"
$Yellow = "Yellow"
$Blue = "Cyan"

# Script directory
$ScriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
Set-Location $ScriptDir

if ($Help) {
    Write-Host "Usage: .\run_docker_tests.ps1 [options]" -ForegroundColor $Blue
    Write-Host ""
    Write-Host "Options:"
    Write-Host "  -Verbose          Verbose output"
    Write-Host "  -Module <name>    Run specific test module (e.g., test_login)"
    Write-Host "  -Coverage         Generate coverage report"
    Write-Host "  -Html             Generate HTML report"
    Write-Host "  -Clean            Clean up containers before running"
    Write-Host "  -Help             Show this help message"
    exit 0
}

Write-Host "================================================" -ForegroundColor $Blue
Write-Host "     AUTH SERVICE API TESTS (Docker)" -ForegroundColor $Blue
Write-Host "================================================" -ForegroundColor $Blue
Write-Host ""

# Clean up old containers if requested
if ($Clean) {
    Write-Host "Cleaning up old containers..." -ForegroundColor $Yellow
    docker-compose -f docker-compose.test.yml down -v 2>$null
}

Write-Host "Starting test containers..." -ForegroundColor $Yellow

# Run the tests
docker-compose -f docker-compose.test.yml up --build --abort-on-container-exit test-runner

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

# Check if reports exist
if (Test-Path "$ScriptDir\reports\report.html") {
    Write-Host "  - HTML Report: reports\report.html" -ForegroundColor $Green
}
if (Test-Path "$ScriptDir\reports\junit_report.xml") {
    Write-Host "  - JUnit XML: reports\junit_report.xml" -ForegroundColor $Green
}
if (Test-Path "$ScriptDir\reports\test_output.log") {
    Write-Host "  - Test Log: reports\test_output.log" -ForegroundColor $Green
}

exit $ExitCode
