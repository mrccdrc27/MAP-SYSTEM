# AMS Setup and Test Script
# This script installs dependencies, seeds data, and tests the AMS API integration
#
# Usage:
#   .\setup_and_test_ams.ps1                    # Full setup and test
#   .\setup_and_test_ams.ps1 -SkipInstall       # Skip dependency installation
#   .\setup_and_test_ams.ps1 -SkipSeed          # Skip seeding
#   .\setup_and_test_ams.ps1 -TestOnly          # Run tests only
#   .\setup_and_test_ams.ps1 -SeedOnly          # Seed only
#   .\setup_and_test_ams.ps1 -Verbose           # Verbose test output

param(
    [switch]$SkipInstall,
    [switch]$SkipSeed,
    [switch]$TestOnly,
    [switch]$SeedOnly,
    [switch]$Verbose,
    [switch]$ClearData,
    [string]$AuthUrl = "http://localhost:8000",
    [string]$AssetsUrl = "http://localhost:8002",
    [string]$ContextsUrl = "http://localhost:8003"
)

$ErrorActionPreference = "Continue"

# Colors
function Write-Header($text) {
    Write-Host ""
    Write-Host ("=" * 60) -ForegroundColor Cyan
    Write-Host " $text" -ForegroundColor Cyan
    Write-Host ("=" * 60) -ForegroundColor Cyan
}

function Write-Step($text) {
    Write-Host " -> $text" -ForegroundColor Yellow
}

function Write-Pass($text) {
    Write-Host " [PASS] $text" -ForegroundColor Green
}

function Write-Fail($text) {
    Write-Host " [FAIL] $text" -ForegroundColor Red
}

function Write-Info($text) {
    Write-Host " [INFO] $text" -ForegroundColor Gray
}

# Get script and project paths
$ScriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$ProjectRoot = Split-Path -Parent $ScriptDir
$AMSRoot = Join-Path $ProjectRoot "ams"
$AssetsPath = Join-Path $AMSRoot "backend\assets"
$ContextsPath = Join-Path $AMSRoot "backend\contexts"
$AuthPath = Join-Path $ProjectRoot "auth"

Write-Header "AMS Setup and Test Script"
Write-Host " Project Root:  $ProjectRoot"
Write-Host " AMS Root:      $AMSRoot"
Write-Host " Assets Path:   $AssetsPath"
Write-Host " Contexts Path: $ContextsPath"
Write-Host " Auth Path:     $AuthPath"

# ============================================
# Phase 1: Install Dependencies
# ============================================
if (-not $SkipInstall -and -not $TestOnly -and -not $SeedOnly) {
    Write-Header "Phase 1: Installing Dependencies"
    
    # Install Assets dependencies
    if (Test-Path $AssetsPath) {
        Write-Step "Installing Assets service dependencies..."
        Push-Location $AssetsPath
        try {
            pip install -r requirements.txt --quiet 2>$null
            if ($LASTEXITCODE -eq 0) {
                Write-Pass "Assets dependencies installed"
            } else {
                Write-Fail "Failed to install Assets dependencies"
            }
        } catch {
            Write-Fail "Error installing Assets dependencies: $_"
        }
        Pop-Location
    } else {
        Write-Fail "Assets path not found: $AssetsPath"
    }
    
    # Install Contexts dependencies
    if (Test-Path $ContextsPath) {
        Write-Step "Installing Contexts service dependencies..."
        Push-Location $ContextsPath
        try {
            pip install -r requirements.txt --quiet 2>$null
            if ($LASTEXITCODE -eq 0) {
                Write-Pass "Contexts dependencies installed"
            } else {
                Write-Fail "Failed to install Contexts dependencies"
            }
        } catch {
            Write-Fail "Error installing Contexts dependencies: $_"
        }
        Pop-Location
    } else {
        Write-Fail "Contexts path not found: $ContextsPath"
    }
} else {
    Write-Info "Skipping dependency installation"
}

# ============================================
# Phase 2: Run Migrations
# ============================================
if (-not $TestOnly) {
    Write-Header "Phase 2: Running Migrations"
    
    # Contexts migrations (must run first - provides reference data)
    if (Test-Path $ContextsPath) {
        Write-Step "Running Contexts migrations..."
        Push-Location $ContextsPath
        try {
            python manage.py migrate --noinput 2>$null
            if ($LASTEXITCODE -eq 0) {
                Write-Pass "Contexts migrations complete"
            } else {
                Write-Fail "Contexts migrations failed"
            }
        } catch {
            Write-Fail "Error running Contexts migrations: $_"
        }
        Pop-Location
    }
    
    # Assets migrations
    if (Test-Path $AssetsPath) {
        Write-Step "Running Assets migrations..."
        Push-Location $AssetsPath
        try {
            python manage.py migrate --noinput 2>$null
            if ($LASTEXITCODE -eq 0) {
                Write-Pass "Assets migrations complete"
            } else {
                Write-Fail "Assets migrations failed"
            }
        } catch {
            Write-Fail "Error running Assets migrations: $_"
        }
        Pop-Location
    }
}

# ============================================
# Phase 3: Seed Data
# ============================================
if ((-not $SkipSeed -and -not $TestOnly) -or $SeedOnly) {
    Write-Header "Phase 3: Seeding Data"
    
    $clearFlag = if ($ClearData) { "--clear" } else { "" }
    
    # Seed Contexts FIRST (provides reference data for Assets)
    if (Test-Path $ContextsPath) {
        Write-Step "Seeding Contexts data (categories, suppliers, statuses, etc.)..."
        Push-Location $ContextsPath
        try {
            if ($ClearData) {
                python manage.py seed_all_contexts --clear 2>&1 | Out-Null
            } else {
                python manage.py seed_all_contexts 2>&1 | Out-Null
            }
            if ($LASTEXITCODE -eq 0) {
                Write-Pass "Contexts data seeded"
            } else {
                Write-Info "Contexts seeding returned non-zero (may already have data)"
            }
        } catch {
            Write-Fail "Error seeding Contexts: $_"
        }
        Pop-Location
    }
    
    # Seed Assets SECOND (references Contexts data)
    if (Test-Path $AssetsPath) {
        Write-Step "Seeding Assets data (products, assets, components, etc.)..."
        Push-Location $AssetsPath
        try {
            if ($ClearData) {
                python manage.py seed_all --clear 2>&1 | Out-Null
            } else {
                python manage.py seed_all 2>&1 | Out-Null
            }
            if ($LASTEXITCODE -eq 0) {
                Write-Pass "Assets data seeded"
            } else {
                Write-Info "Assets seeding returned non-zero (may already have data)"
            }
        } catch {
            Write-Fail "Error seeding Assets: $_"
        }
        Pop-Location
    }
    
    # Seed AMS users in Auth service
    Write-Step "Seeding AMS users in Auth service..."
    if (Test-Path $AuthPath) {
        Push-Location $AuthPath
        try {
            # Check if seed_ams command exists
            $seedCmd = python manage.py help 2>&1 | Select-String "seed_ams"
            if ($seedCmd) {
                python manage.py seed_ams 2>&1 | Out-Null
                Write-Pass "AMS users seeded in Auth service"
            } else {
                Write-Info "seed_ams command not found. Creating AMS users manually..."
                # Create AMS system and users via Python script
                $pythonScript = @"
import django
import os
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'auth.settings')
django.setup()

from users.models import User
from systems.models import System
from roles.models import Role
from system_roles.models import UserSystemRole

# Create or get AMS system
ams_system, created = System.objects.get_or_create(
    slug='ams',
    defaults={'name': 'Asset Management System', 'description': 'Asset Management System'}
)
if created:
    print('Created AMS system')

# Create roles for AMS
admin_role, _ = Role.objects.get_or_create(
    name='Admin', system=ams_system,
    defaults={'description': 'AMS Administrator', 'is_custom': False}
)
operator_role, _ = Role.objects.get_or_create(
    name='Operator', system=ams_system,
    defaults={'description': 'AMS Operator', 'is_custom': False}
)

# Create test users
users_data = [
    {'email': 'amsadmin@test.local', 'password': 'amsadmin123', 'first_name': 'AMS', 'last_name': 'Admin', 'role': admin_role},
    {'email': 'amsoperator@test.local', 'password': 'amsoperator123', 'first_name': 'AMS', 'last_name': 'Operator', 'role': operator_role},
]

for ud in users_data:
    user, created = User.objects.get_or_create(
        email=ud['email'],
        defaults={
            'username': ud['email'].split('@')[0],
            'first_name': ud['first_name'],
            'last_name': ud['last_name'],
            'is_active': True,
            'status': 'Approved'
        }
    )
    if created:
        user.set_password(ud['password'])
        user.save()
        print(f'Created user: {ud["email"]}')
    
    # Assign role
    UserSystemRole.objects.get_or_create(
        user=user, system=ams_system, role=ud['role']
    )
    print(f'Assigned {ud["role"].name} role to {ud["email"]}')

print('AMS users setup complete')
"@
                $pythonScript | python 2>&1 | ForEach-Object { Write-Info $_ }
            }
        } catch {
            Write-Fail "Error seeding AMS users: $_"
        }
        Pop-Location
    } else {
        Write-Fail "Auth path not found: $AuthPath"
    }
}

if ($SeedOnly) {
    Write-Header "Seeding Complete"
    exit 0
}

# ============================================
# Phase 4: Run API Tests
# ============================================
Write-Header "Phase 4: Running API Tests"

$testScript = Join-Path $ScriptDir "test_ams_api.py"

if (Test-Path $testScript) {
    Write-Step "Running AMS API integration tests..."
    
    $testArgs = @(
        $testScript,
        "--auth-url", $AuthUrl,
        "--assets-url", $AssetsUrl,
        "--contexts-url", $ContextsUrl
    )
    
    if ($Verbose) {
        $testArgs += "--verbose"
    }
    
    python @testArgs
    $testExitCode = $LASTEXITCODE
    
    if ($testExitCode -eq 0) {
        Write-Header "All Tests Passed!"
        Write-Host ""
        Write-Host " AMS API integration is working correctly." -ForegroundColor Green
        Write-Host " The Assets and Contexts services are authenticating via the" -ForegroundColor Green
        Write-Host " centralized Auth service using shared JWT tokens." -ForegroundColor Green
    } else {
        Write-Header "Some Tests Failed"
        Write-Host ""
        Write-Host " $testExitCode test(s) failed. Review the output above." -ForegroundColor Yellow
        Write-Host ""
        Write-Host " Common issues:" -ForegroundColor Yellow
        Write-Host "   - Services not running (start with runserver)" -ForegroundColor Gray
        Write-Host "   - JWT signing key mismatch between services" -ForegroundColor Gray
        Write-Host "   - User doesn't have AMS system role in auth service" -ForegroundColor Gray
    }
} else {
    Write-Fail "Test script not found: $testScript"
}

Write-Header "Setup and Test Complete"
