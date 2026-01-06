# Verify Python Installation Script
# This script verifies that all requirements were installed correctly

param(
    [string]$RequirementsFile = "requirements_aggregated.txt",
    [string]$VenvPath = ".\venv",
    [switch]$Detailed = $false
)

$ErrorActionPreference = "Stop"

# Normalize package name for comparison (handle hyphens/underscores)
function Normalize-PackageName {
    param([string]$Name)
    return $Name.ToLower().Replace("-", "_").Replace("[", "").Replace("]", "")
}

Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  Installation Verification Script" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# Get the root directory (MAP-SYSTEM)
$RootDir = (Resolve-Path "$PSScriptRoot\..\..\..").Path
Set-Location $RootDir

Write-Host "Working directory: $RootDir" -ForegroundColor Yellow
Write-Host ""

# Check if requirements file exists
$RequirementsPath = Join-Path $RootDir $RequirementsFile
if (-not (Test-Path $RequirementsPath)) {
    Write-Host "[X] Requirements file not found: $RequirementsFile" -ForegroundColor Red
    Write-Host "Run the aggregation script first." -ForegroundColor Yellow
    exit 1
}

# Check if virtual environment exists
$PythonPath = Join-Path $VenvPath "Scripts\python.exe"
$PipPath = Join-Path $VenvPath "Scripts\pip.exe"

if (-not (Test-Path $PythonPath)) {
    Write-Host "[X] Virtual environment not found: $VenvPath" -ForegroundColor Red
    Write-Host "Run create_venv.ps1 first." -ForegroundColor Yellow
    exit 1
}

Write-Host "[OK] Virtual environment found: $VenvPath" -ForegroundColor Green
Write-Host ""

# Get Python version
Write-Host "Checking Python version..." -ForegroundColor Cyan
$PythonVersion = & $PythonPath --version 2>&1
Write-Host "  $PythonVersion" -ForegroundColor White
Write-Host ""

# Get pip version
Write-Host "Checking pip version..." -ForegroundColor Cyan
$PipVersion = & $PipPath --version 2>&1
Write-Host "  $PipVersion" -ForegroundColor White
Write-Host ""

# Get installed packages from pip list
Write-Host "Retrieving installed packages..." -ForegroundColor Cyan
$InstalledOutput = & $PipPath list --format=freeze 2>&1
$InstalledPackages = @{}

foreach ($Line in $InstalledOutput) {
    if ($Line -match "^([^=]+)==(.+)$") {
        $OriginalName = $Matches[1]
        $NormalizedName = Normalize-PackageName $OriginalName
        $Version = $Matches[2]
        $InstalledPackages[$NormalizedName] = @{
            Original = $OriginalName
            Version = $Version
        }
    }
}

Write-Host "Installed packages: $($InstalledPackages.Count)" -ForegroundColor White
Write-Host ""

# Parse expected packages from requirements file
$ExpectedPackages = @()
$RequirementLines = Get-Content $RequirementsPath | Where-Object { 
    $_ -and $_.Trim() -and -not $_.Trim().StartsWith("#") 
}

foreach ($Line in $RequirementLines) {
    $Line = $Line.Trim()
    
    # Extract package name and version
    if ($Line -match "^([a-zA-Z0-9\-_\[\]\.]+)(==|>=|<=|>|<|!=)(.+)$") {
        $OriginalName = $Matches[1]
        $Operator = $Matches[2]
        $Version = $Matches[3]
        $ExpectedPackages += @{
            Original = $OriginalName
            Normalized = Normalize-PackageName $OriginalName
            Operator = $Operator
            Version = $Version
        }
    } elseif ($Line -match "^([a-zA-Z0-9\-_\[\]\.]+)$") {
        $OriginalName = $Matches[1]
        $ExpectedPackages += @{
            Original = $OriginalName
            Normalized = Normalize-PackageName $OriginalName
            Operator = $null
            Version = $null
        }
    }
}

Write-Host "Expected packages: $($ExpectedPackages.Count)" -ForegroundColor Cyan
Write-Host ""

# Verify each expected package
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "Verifying Required Packages" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

$MissingPackages = @()
$VersionMismatches = @()
$VerifiedPackages = @()

foreach ($Pkg in $ExpectedPackages) {
    $NormalizedName = $Pkg.Normalized
    
    if ($InstalledPackages.ContainsKey($NormalizedName)) {
        $Installed = $InstalledPackages[$NormalizedName]
        
        # Check version match (only for == operator)
        if ($Pkg.Operator -eq "==" -and $Pkg.Version -and $Installed.Version -ne $Pkg.Version) {
            $VersionMismatches += @{
                Package = $Pkg.Original
                Expected = $Pkg.Version
                Installed = $Installed.Version
            }
            if ($Detailed) {
                Write-Host "  [~] $($Pkg.Original)" -ForegroundColor Yellow
                Write-Host "      Expected: $($Pkg.Version)" -ForegroundColor Gray
                Write-Host "      Installed: $($Installed.Version)" -ForegroundColor Gray
            }
        } else {
            $VerifiedPackages += $Pkg.Original
            if ($Detailed) {
                Write-Host "  [OK] $($Pkg.Original) ($($Installed.Version))" -ForegroundColor Green
            }
        }
    } else {
        $MissingPackages += $Pkg.Original
        if ($Detailed) {
            Write-Host "  [X] $($Pkg.Original) - MISSING" -ForegroundColor Red
        }
    }
}

# Summary
Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "Verification Summary" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

Write-Host "Total expected packages: $($ExpectedPackages.Count)" -ForegroundColor White
Write-Host "Verified packages:       $($VerifiedPackages.Count)" -ForegroundColor Green
Write-Host "Version mismatches:      $($VersionMismatches.Count)" -ForegroundColor Yellow
Write-Host "Missing packages:        $($MissingPackages.Count)" -ForegroundColor Red
Write-Host ""

# Show problems
if ($MissingPackages.Count -gt 0) {
    Write-Host "Missing Packages:" -ForegroundColor Red
    foreach ($Pkg in $MissingPackages) {
        Write-Host "  - $Pkg" -ForegroundColor Red
    }
    Write-Host ""
}

if ($VersionMismatches.Count -gt 0) {
    Write-Host "Version Mismatches:" -ForegroundColor Yellow
    foreach ($Mismatch in $VersionMismatches) {
        Write-Host "  - $($Mismatch.Package): expected $($Mismatch.Expected), got $($Mismatch.Installed)" -ForegroundColor Yellow
    }
    Write-Host ""
}

# Final verdict
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "Final Verdict" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

$HasIssues = ($MissingPackages.Count -gt 0)

if ($MissingPackages.Count -gt 0) {
    Write-Host "[X] Installation has missing packages!" -ForegroundColor Red
}

if ($VersionMismatches.Count -gt 0) {
    Write-Host "[!] Some packages have version mismatches" -ForegroundColor Yellow
    Write-Host "    (This may or may not cause issues)" -ForegroundColor Gray
}

if (-not $HasIssues) {
    Write-Host "[OK] All required packages are installed!" -ForegroundColor Green
    Write-Host ""
    Write-Host "Your Python environment is ready to use." -ForegroundColor White
} else {
    Write-Host ""
    Write-Host "Recommendation: Re-run the installation script:" -ForegroundColor Yellow
    Write-Host "  .\Scripts\setup\install_requirements.ps1" -ForegroundColor White
}

Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# Return exit code based on results
if ($HasIssues) {
    exit 1
} else {
    exit 0
}
