<#
.SYNOPSIS
    Ultimate Setup Script for TTS Ecosystem (Kong Edition).

.DESCRIPTION
    This script automates the full setup of the TTS Ecosystem with Kong API Gateway.
    It handles:
    1. Python Environment (Creation & Requirements)
    2. Node.js Dependencies (Frontends & CLI)
    3. Infrastructure (RabbitMQ, Kong) via Docker
    4. Database Seeding (Auth, Workflow, Helpdesk)
    5. PM2 Ecosystem Start

.PARAMETER SkipInstall
    Skip Python and Node.js dependency installation.

.PARAMETER SkipDocker
    Skip Docker infrastructure startup (RabbitMQ, Kong).

.PARAMETER SkipSeed
    Skip database seeding.

.PARAMETER SkipPM2
    Skip starting the PM2 ecosystem.

.PARAMETER VerboseOutput
    Show detailed output for all commands. Default is to show only errors.

.EXAMPLE
    .\setup_tts_ecosystem.ps1
    .\setup_tts_ecosystem.ps1 -VerboseOutput
#>

param (
    [Switch]$SkipInstall,
    [Switch]$SkipDocker,
    [Switch]$SkipSeed,
    [Switch]$SkipPM2,
    [Switch]$VerboseOutput
)

$ErrorActionPreference = "Stop"

# --- Configuration ---
$ScriptPath = $PSScriptRoot
$ProjectRoot = Resolve-Path "$ScriptPath\..\..\.."
$VenvPath = "$ProjectRoot\venv"
$VenvActivate = "$VenvPath\Scripts\Activate.ps1"
$LogsDir = "$ProjectRoot\Scripts\logs"

# Ensure logs directory exists
if (-not (Test-Path $LogsDir)) { New-Item -ItemType Directory -Path $LogsDir | Out-Null }

# --- Helper Functions ---

function Print-Header {
    param ([string]$Title)
    Write-Host "`n========================================================" -ForegroundColor Cyan
    Write-Host " $Title" -ForegroundColor Cyan
    Write-Host "========================================================" -ForegroundColor Cyan
}