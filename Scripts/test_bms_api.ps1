<#
.SYNOPSIS
    API Test Script for BMS (Budget Management System) Integration.
    
.DESCRIPTION
    This script performs comprehensive API testing for the BMS service
    with centralized authentication from the Auth service.
    
    Steps:
    1. Apply database migrations (Auth and BMS)
    2. Seed Auth service with BMS system, roles, and users
    3. Seed BMS database with test data
    4. Authenticate via Auth service login endpoint
    5. Make various API calls to BMS using the access token
    6. Report results

.NOTES
    File Name      : test_bms_api.ps1
    Prerequisite   : Auth service running on port 8000, BMS running on port 8001
    Usage          : .\Scripts\test_bms_api.ps1

.EXAMPLE
    # From project root:
    .\Scripts\test_bms_api.ps1
#>

param(
    [string]$AuthUrl = "http://localhost:8000",
    [string]$BmsUrl = "http://localhost:8001",
    [switch]$SkipMigrations,
    [switch]$SkipSeeding,
    [switch]$Verbose
)

$ErrorActionPreference = "Continue"

# --- Configuration ---
$ProjectRoot = Resolve-Path "$PSScriptRoot\.."
$AuthDir = "$ProjectRoot\auth"
$BmsDir = "$ProjectRoot\bms\budget_service"

# Test credentials (from seed_bms.py)
$TestUsers = @{
    Admin = @{
        Email = "testadmin@bms.local"
        Password = "testadmin123"
        ExpectedRole = "ADMIN"
    }
    FinanceHead = @{
        Email = "testfinance@bms.local"
        Password = "testfinance123"
        ExpectedRole = "FINANCE_HEAD"
    }
    GeneralUser = @{
        Email = "testuser@bms.local"
        Password = "testuser123"
        ExpectedRole = "GENERAL_USER"
    }
}

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
    Write-Host " [PASS] $Message" -ForegroundColor Green
}

function Print-Error {
    param ([string]$Message)
    Write-Host " [FAIL] $Message" -ForegroundColor Red
}

function Print-Info {
    param ([string]$Message)
    Write-Host " [INFO] $Message" -ForegroundColor Gray
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
        $output = & python $argsList 2>&1
        if ($LASTEXITCODE -eq 0) {
            Print-Success "$Description completed"
            if ($Verbose) {
                $output | ForEach-Object { Print-Info $_ }
            }
            return $true
        } else {
            Print-Error "$Description failed with exit code $LASTEXITCODE"
            $output | ForEach-Object { Write-Host "   $_" -ForegroundColor Red }
            return $false
        }
    }
    catch {
        Print-Error "$Description failed: $_"
        return $false
    }
    finally {
        Pop-Location
    }
}

function Test-ServiceAvailable {
    param (
        [string]$Url,
        [string]$ServiceName
    )
    Print-Step "Checking $ServiceName availability at $Url..."
    try {
        $response = Invoke-WebRequest -Uri "$Url/health/" -Method GET -TimeoutSec 5 -ErrorAction SilentlyContinue
        if ($response.StatusCode -eq 200) {
            Print-Success "$ServiceName is available"
            return $true
        }
    }
    catch {
        # Try alternative endpoints
        try {
            $response = Invoke-WebRequest -Uri "$Url" -Method GET -TimeoutSec 5 -ErrorAction SilentlyContinue
            Print-Success "$ServiceName is available (root endpoint)"
            return $true
        }
        catch {
            Print-Error "$ServiceName is NOT available at $Url"
            return $false
        }
    }
    return $false
}

function Get-AuthToken {
    param (
        [string]$Email,
        [string]$Password
    )
    
    Print-Step "Authenticating with email: $Email..."
    
    $body = @{
        email = $Email
        password = $Password
    } | ConvertTo-Json
    
    # Try /token/ endpoint first, then fallback to other endpoints
    $endpoints = @(
        "$AuthUrl/token/",
        "$AuthUrl/api/v1/users/login/",
        "$AuthUrl/api/users/login/"
    )
    
    foreach ($endpoint in $endpoints) {
        try {
            $response = Invoke-RestMethod -Uri $endpoint -Method POST `
                -Body $body -ContentType "application/json" -ErrorAction Stop
            
            # Check for access token in different response formats
            $accessToken = $response.access
            if (-not $accessToken) { $accessToken = $response.access_token }
            
            if ($accessToken) {
                Print-Success "Authentication successful!"
                return @{
                    AccessToken = $accessToken
                    RefreshToken = if ($response.refresh) { $response.refresh } else { $response.refresh_token }
                    User = $response.user
                }
            }
        }
        catch {
            # Try next endpoint
            continue
        }
    }
    
    Print-Error "Authentication failed for $Email"
    return $null
}

function Invoke-BmsApi {
    param (
        [string]$Endpoint,
        [string]$Method = "GET",
        [string]$Token,
        [hashtable]$Body = $null,
        [string]$Description
    )
    
    Print-Step "API Call: $Method $Endpoint - $Description..."
    
    $headers = @{
        "Authorization" = "Bearer $Token"
        "Content-Type" = "application/json"
    }
    
    $uri = "$BmsUrl$Endpoint"
    
    try {
        $params = @{
            Uri = $uri
            Method = $Method
            Headers = $headers
            ErrorAction = "Stop"
        }
        
        if ($Body -and $Method -ne "GET") {
            $params.Body = ($Body | ConvertTo-Json -Depth 10)
        }
        
        $response = Invoke-RestMethod @params
        
        Print-Success "$Description - OK"
        if ($Verbose) {
            Print-Info "Response: $($response | ConvertTo-Json -Depth 2 -Compress)"
        }
        
        return @{
            Success = $true
            Data = $response
            StatusCode = 200
        }
    }
    catch {
        $statusCode = 0
        try {
            $statusCode = $_.Exception.Response.StatusCode.value__
        } catch {}
        
        # 401/403 are auth issues, others might be expected
        if ($statusCode -eq 401) {
            Print-Error "$Description - Unauthorized (401)"
        } elseif ($statusCode -eq 403) {
            Print-Error "$Description - Forbidden (403)"
        } elseif ($statusCode -eq 404) {
            Print-Info "$Description - Not Found (404) - may be expected"
        } else {
            Print-Error "$Description - HTTP $statusCode : $($_.Exception.Message)"
        }
        
        return @{
            Success = $false
            StatusCode = $statusCode
            Error = $_.Exception.Message
        }
    }
}

# --- Test Result Tracking ---
$TestResults = @{
    Total = 0
    Passed = 0
    Failed = 0
    Skipped = 0
}

function Record-TestResult {
    param (
        [bool]$Success,
        [string]$TestName
    )
    $TestResults.Total++
    if ($Success) {
        $TestResults.Passed++
    } else {
        $TestResults.Failed++
    }
}

# ===================================================================
# MAIN SCRIPT EXECUTION
# ===================================================================

Print-Header "BMS API Integration Test Suite"
Write-Host " Auth URL: $AuthUrl"
Write-Host " BMS URL:  $BmsUrl"
Write-Host ""

# --- Phase 1: Database Migrations ---
if (-not $SkipMigrations) {
    Print-Header "Phase 1: Database Migrations"
    
    $authMigrate = Run-Django-Command -Directory $AuthDir -Command "manage.py migrate" -Description "Auth service migrations"
    Record-TestResult -Success $authMigrate -TestName "Auth migrations"
    
    $bmsMigrate = Run-Django-Command -Directory $BmsDir -Command "manage.py migrate" -Description "BMS service migrations"
    Record-TestResult -Success $bmsMigrate -TestName "BMS migrations"
} else {
    Print-Info "Skipping migrations (--SkipMigrations flag)"
}

# --- Phase 2: Database Seeding ---
if (-not $SkipSeeding) {
    Print-Header "Phase 2: Database Seeding"
    
    # Seed systems first
    $seedSystems = Run-Django-Command -Directory $AuthDir -Command "manage.py seed_systems" -Description "Seed systems (including BMS)"
    Record-TestResult -Success $seedSystems -TestName "Seed systems"
    
    # Seed BMS-specific roles and users
    $seedBms = Run-Django-Command -Directory $AuthDir -Command "manage.py seed_bms" -Description "Seed BMS roles and users"
    Record-TestResult -Success $seedBms -TestName "Seed BMS"
    
    # Seed BMS data (comprehensive_seeder)
    $seedBmsData = Run-Django-Command -Directory $BmsDir -Command "manage.py comprehensive_seeder" -Description "Seed BMS test data"
    Record-TestResult -Success $seedBmsData -TestName "Seed BMS data"
} else {
    Print-Info "Skipping seeding (--SkipSeeding flag)"
}

# --- Phase 3: Service Availability Check ---
Print-Header "Phase 3: Service Availability Check"

$authAvailable = Test-ServiceAvailable -Url $AuthUrl -ServiceName "Auth Service"
Record-TestResult -Success $authAvailable -TestName "Auth service available"

$bmsAvailable = Test-ServiceAvailable -Url $BmsUrl -ServiceName "BMS Service"
Record-TestResult -Success $bmsAvailable -TestName "BMS service available"

if (-not $authAvailable -or -not $bmsAvailable) {
    Print-Error "Services not available. Please start them before running tests."
    Print-Info "Start Auth:  cd auth && python manage.py runserver 0.0.0.0:8000"
    Print-Info "Start BMS:   cd bms/budget_service && python manage.py runserver 0.0.0.0:8001"
    exit 1
}

# --- Phase 4: Authentication Tests ---
Print-Header "Phase 4: Authentication Tests"

$tokens = @{}

foreach ($userType in $TestUsers.Keys) {
    $userData = $TestUsers[$userType]
    $authResult = Get-AuthToken -Email $userData.Email -Password $userData.Password
    
    if ($authResult) {
        $tokens[$userType] = $authResult.AccessToken
        Record-TestResult -Success $true -TestName "Auth $userType"
        
        # Verify role in token
        if ($Verbose -and $authResult.User) {
            Print-Info "User: $($authResult.User | ConvertTo-Json -Compress)"
        }
    } else {
        Record-TestResult -Success $false -TestName "Auth $userType"
    }
}

# --- Phase 5: BMS API Tests ---
Print-Header "Phase 5: BMS API Tests (Admin User)"

if ($tokens.Admin) {
    $adminToken = $tokens.Admin
    
    # Dashboard endpoints
    $r = Invoke-BmsApi -Endpoint "/api/dashboard/budget-summary/" -Token $adminToken -Description "Get budget summary"
    Record-TestResult -Success $r.Success -TestName "Dashboard budget summary"
    
    $r = Invoke-BmsApi -Endpoint "/api/dashboard/department-status/" -Token $adminToken -Description "Get department status"
    Record-TestResult -Success $r.Success -TestName "Dashboard department status"
    
    $r = Invoke-BmsApi -Endpoint "/api/dashboard/category-budget-status/" -Token $adminToken -Description "Get category budget status"
    Record-TestResult -Success $r.Success -TestName "Dashboard category status"
    
    # Dropdown endpoints
    $r = Invoke-BmsApi -Endpoint "/api/dropdowns/fiscal-years/" -Token $adminToken -Description "Get fiscal years dropdown"
    Record-TestResult -Success $r.Success -TestName "Dropdown fiscal years"
    
    $r = Invoke-BmsApi -Endpoint "/api/dropdowns/departments/" -Token $adminToken -Description "Get departments dropdown"
    Record-TestResult -Success $r.Success -TestName "Dropdown departments"
    
    $r = Invoke-BmsApi -Endpoint "/api/dropdowns/accounts/" -Token $adminToken -Description "Get accounts dropdown"
    Record-TestResult -Success $r.Success -TestName "Dropdown accounts"
    
    $r = Invoke-BmsApi -Endpoint "/api/dropdowns/expense-categories/" -Token $adminToken -Description "Get expense categories"
    Record-TestResult -Success $r.Success -TestName "Dropdown expense categories"
    
    # Budget Proposals
    $r = Invoke-BmsApi -Endpoint "/api/budget-proposals/" -Token $adminToken -Description "Get budget proposals list"
    Record-TestResult -Success $r.Success -TestName "Budget proposals list"
    
    $r = Invoke-BmsApi -Endpoint "/api/budget-proposals/summary/" -Token $adminToken -Description "Get budget proposals summary"
    Record-TestResult -Success $r.Success -TestName "Budget proposals summary"
    
    # Expenses
    $r = Invoke-BmsApi -Endpoint "/api/expenses/" -Token $adminToken -Description "Get expenses list"
    Record-TestResult -Success $r.Success -TestName "Expenses list"
    
    $r = Invoke-BmsApi -Endpoint "/api/expenses/history/" -Token $adminToken -Description "Get expense history"
    Record-TestResult -Success $r.Success -TestName "Expense history"
    
    # Journal entries
    $r = Invoke-BmsApi -Endpoint "/api/journal-entries/" -Token $adminToken -Description "Get journal entries"
    Record-TestResult -Success $r.Success -TestName "Journal entries"
    
    # Ledger
    $r = Invoke-BmsApi -Endpoint "/api/ledger/" -Token $adminToken -Description "Get ledger view"
    Record-TestResult -Success $r.Success -TestName "Ledger view"
    
    # Projects
    $r = Invoke-BmsApi -Endpoint "/api/projects/all/" -Token $adminToken -Description "Get all projects"
    Record-TestResult -Success $r.Success -TestName "All projects"
    
    # Reports
    $r = Invoke-BmsApi -Endpoint "/api/reports/budget-variance/" -Token $adminToken -Description "Get budget variance report"
    Record-TestResult -Success $r.Success -TestName "Budget variance report"
    
} else {
    Print-Error "Skipping Admin API tests - no token available"
}

# --- Phase 6: Role-Based Access Tests ---
Print-Header "Phase 6: Role-Based Access Tests"

if ($tokens.FinanceHead) {
    $financeToken = $tokens.FinanceHead
    
    $r = Invoke-BmsApi -Endpoint "/api/budget-proposals/" -Token $financeToken -Description "Finance Head: Get budget proposals"
    Record-TestResult -Success $r.Success -TestName "Finance Head access"
    
    $r = Invoke-BmsApi -Endpoint "/api/journal-entries/" -Token $financeToken -Description "Finance Head: Get journal entries"
    Record-TestResult -Success $r.Success -TestName "Finance Head journal entries"
} else {
    Print-Error "Skipping Finance Head tests - no token available"
}

if ($tokens.GeneralUser) {
    $userToken = $tokens.GeneralUser
    
    $r = Invoke-BmsApi -Endpoint "/api/dashboard/budget-summary/" -Token $userToken -Description "General User: Get budget summary"
    Record-TestResult -Success $r.Success -TestName "General User dashboard access"
    
    $r = Invoke-BmsApi -Endpoint "/api/expenses/" -Token $userToken -Description "General User: Get expenses"
    Record-TestResult -Success $r.Success -TestName "General User expenses access"
} else {
    Print-Error "Skipping General User tests - no token available"
}

# --- Phase 7: Unauthenticated Access Tests ---
Print-Header "Phase 7: Unauthenticated Access Tests (Should Fail)"

$r = Invoke-BmsApi -Endpoint "/api/dashboard/budget-summary/" -Token "invalid_token_12345" -Description "Invalid token test"
$expectedFail = ($r.StatusCode -eq 401 -or $r.StatusCode -eq 403)
if ($expectedFail) {
    Print-Success "Invalid token correctly rejected"
}
Record-TestResult -Success $expectedFail -TestName "Invalid token rejected"

# --- Test Summary ---
Print-Header "Test Results Summary"

$successRate = if ($TestResults.Total -gt 0) { 
    [math]::Round(($TestResults.Passed / $TestResults.Total) * 100, 1) 
} else { 0 }

Write-Host ""
Write-Host " Total Tests:  $($TestResults.Total)" -ForegroundColor White
Write-Host " Passed:       $($TestResults.Passed)" -ForegroundColor Green
Write-Host " Failed:       $($TestResults.Failed)" -ForegroundColor $(if ($TestResults.Failed -gt 0) { "Red" } else { "Green" })
Write-Host " Success Rate: $successRate%" -ForegroundColor $(if ($successRate -ge 80) { "Green" } elseif ($successRate -ge 50) { "Yellow" } else { "Red" })
Write-Host ""

if ($TestResults.Failed -eq 0) {
    Write-Host " All tests passed! BMS API integration is working correctly." -ForegroundColor Green
} else {
    Write-Host " Some tests failed. Review the output above for details." -ForegroundColor Yellow
}

Print-Header "Test Complete"

exit $TestResults.Failed
