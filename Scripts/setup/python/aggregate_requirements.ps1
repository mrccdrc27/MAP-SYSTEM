# Aggregate Requirements Script
# This script aggregates all requirements.txt files from auth, TTS services, and HDTS backend

param(
    [string]$OutputFile = "requirements_aggregated.txt"
)

$ErrorActionPreference = "Stop"

Write-Host "======================================" -ForegroundColor Cyan
Write-Host "  Requirements Aggregation Script" -ForegroundColor Cyan
Write-Host "======================================" -ForegroundColor Cyan
Write-Host ""

# Get the root directory (MAP-SYSTEM)
$RootDir = (Resolve-Path "$PSScriptRoot\..\..\..").Path
Set-Location $RootDir

Write-Host "Working directory: $RootDir" -ForegroundColor Yellow
Write-Host ""

# Define service paths
$ServicePaths = @(
    "auth\requirements.txt",                          # Auth service at root
    "tts\workflow_api\requirements.txt",              # TTS - Workflow API
    "tts\messaging\requirements.txt",                 # TTS - Messaging
    "tts\notification_service\requirements.txt",      # TTS - Notification Service
    "hdts\helpdesk\requirements.txt"                  # HDTS - Helpdesk
)

Write-Host "Services to aggregate:" -ForegroundColor Cyan
foreach ($Path in $ServicePaths) {
    $ServiceName = Split-Path (Split-Path $Path -Parent) -Leaf
    if ($Path -like "auth\*") {
        $ServiceName = "auth"
    }
    Write-Host "  - $ServiceName" -ForegroundColor White
}
Write-Host ""

# Create a hashtable to store unique requirements
$RequirementsMap = @{}

# Process each service's requirements.txt
foreach ($Path in $ServicePaths) {
    $FullPath = Join-Path $RootDir $Path
    
    if (Test-Path $FullPath) {
        $ServiceName = Split-Path (Split-Path $Path -Parent) -Leaf
        if ($Path -like "auth\*") {
            $ServiceName = "auth"
        }
        
        Write-Host "Processing: $ServiceName" -ForegroundColor Yellow
        
        $Content = Get-Content $FullPath -Encoding UTF8
        
        foreach ($Line in $Content) {
            # Skip empty lines and comments
            if ([string]::IsNullOrWhiteSpace($Line) -or $Line.Trim().StartsWith("#")) {
                continue
            }
            
            $Line = $Line.Trim()
            
            # Extract package name (before ==, >=, <=, etc.)
            $PackageName = ""
            if ($Line -match "^([a-zA-Z0-9\-_\[\]\.]+)") {
                $PackageName = $Matches[1].ToLower()
            } else {
                continue
            }
            
            # Store or update requirement
            if ($RequirementsMap.ContainsKey($PackageName)) {
                # Keep the more specific version if there's a conflict
                $Existing = $RequirementsMap[$PackageName]
                
                # Prefer exact version (==) over range (>=, etc.)
                if ($Line -match "==" -and $Existing.Line -notmatch "==") {
                    $RequirementsMap[$PackageName] = @{
                        Line = $Line
                        Source = $ServiceName
                    }
                    Write-Host "  [~] Updated: $PackageName (from $ServiceName)" -ForegroundColor Cyan
                } elseif ($Existing.Line -ne $Line) {
                    Write-Host "  [!] Conflict: $PackageName" -ForegroundColor Yellow
                    Write-Host "    Existing: $($Existing.Line) (from $($Existing.Source))" -ForegroundColor Gray
                    Write-Host "    Found:    $Line (from $ServiceName)" -ForegroundColor Gray
                    Write-Host "    Keeping:  $($Existing.Line)" -ForegroundColor Gray
                }
            } else {
                $RequirementsMap[$PackageName] = @{
                    Line = $Line
                    Source = $ServiceName
                }
                Write-Host "  + Added: $PackageName" -ForegroundColor Green
            }
        }
        Write-Host ""
    } else {
        Write-Host "[!] Warning: File not found - $Path" -ForegroundColor Yellow
        Write-Host ""
    }
}

# Generate output file
$OutputPath = Join-Path $RootDir $OutputFile
Write-Host "Generating aggregated requirements file..." -ForegroundColor Cyan
Write-Host "Output: $OutputPath" -ForegroundColor White
Write-Host ""

# Create header
$Header = @"
# Aggregated Requirements for MAP-SYSTEM
# Generated on: $(Get-Date -Format "yyyy-MM-dd HH:mm:ss")
# 
# This file aggregates requirements from:
#   - auth (Authentication Service)
#   - tts/workflow_api (Workflow API)
#   - tts/messaging (Messaging Service)
#   - tts/notification_service (Notification Service)
#   - hdts/helpdesk (Helpdesk Service)
#
# Note: In case of version conflicts, the first encountered version is kept.
#

"@

# Write to file
$Header | Out-File -FilePath $OutputPath -Encoding UTF8

# Sort and write requirements
$SortedRequirements = $RequirementsMap.GetEnumerator() | Sort-Object Name

foreach ($Entry in $SortedRequirements) {
    $Entry.Value.Line | Out-File -FilePath $OutputPath -Append -Encoding UTF8
}

Write-Host "[OK] Aggregation complete!" -ForegroundColor Green
Write-Host ""
Write-Host "Summary:" -ForegroundColor Cyan
Write-Host "  Total unique packages: $($RequirementsMap.Count)" -ForegroundColor White
Write-Host "  Output file: $OutputFile" -ForegroundColor White
Write-Host ""
Write-Host "======================================" -ForegroundColor Cyan
Write-Host "To install these requirements, run:" -ForegroundColor Yellow
Write-Host "  .\Scripts\setup\install_requirements.ps1" -ForegroundColor White
Write-Host "======================================" -ForegroundColor Cyan

exit 0
