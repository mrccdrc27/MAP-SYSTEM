# Kong API Gateway Integration Tests
# Tests auth service endpoints through Kong Gateway

$KongUrl = "http://localhost:8000"
$TestResults = @()

function Test-Endpoint {
    param(
        [string]$Name,
        [string]$Url,
        [string]$Method = "GET",
        [hashtable]$Headers = @{},
        [string]$Body = $null,
        [int]$ExpectedStatus = 200
    )
    
    Write-Host "`n$('=' * 70)" -ForegroundColor Cyan
    Write-Host "TEST: $Name" -ForegroundColor Cyan
    Write-Host "$('=' * 70)" -ForegroundColor Cyan
    Write-Host "URL: $Method $Url" -ForegroundColor Gray
    
    try {
        $params = @{
            Uri = $Url
            Method = $Method
            Headers = $Headers
            UseBasicParsing = $true
        }
        
        if ($Body) {
            $params.Body = $Body
            $params.ContentType = "application/json"
            Write-Host "Body: $Body" -ForegroundColor Gray
        }
        
        $response = Invoke-WebRequest @params
        $statusCode = $response.StatusCode
        $content = $response.Content
        
        if ($statusCode -eq $ExpectedStatus) {
            Write-Host "[PASS]" -ForegroundColor Green
            Write-Host "Status: $statusCode" -ForegroundColor Green
            Write-Host "Response: $($content.Substring(0, [Math]::Min(200, $content.Length)))..." -ForegroundColor Gray
            $script:TestResults += [PSCustomObject]@{
                Test = $Name
                Status = "PASS"
                StatusCode = $statusCode
            }
            return $content
        } else {
            Write-Host "[FAIL] - Expected $ExpectedStatus, got $statusCode" -ForegroundColor Red
            $script:TestResults += [PSCustomObject]@{
                Test = $Name
                Status = "FAIL"
                StatusCode = $statusCode
            }
            return $null
        }
    } catch {
        $statusCode = $_.Exception.Response.StatusCode.value__
        $errorMsg = $_.Exception.Message
        
        if ($statusCode -eq $ExpectedStatus) {
            Write-Host "[PASS] (Expected Error)" -ForegroundColor Green
            Write-Host "Status: $statusCode" -ForegroundColor Green
            $script:TestResults += [PSCustomObject]@{
                Test = $Name
                Status = "PASS"
                StatusCode = $statusCode
            }
        } else {
            Write-Host "[FAIL]" -ForegroundColor Red
            Write-Host "Status: $statusCode" -ForegroundColor Red
            Write-Host "Error: $errorMsg" -ForegroundColor Red
            $script:TestResults += [PSCustomObject]@{
                Test = $Name
                Status = "FAIL"
                StatusCode = $statusCode
            }
        }
        return $null
    }
}

Write-Host "`n"
Write-Host "╔════════════════════════════════════════════════════════════════════╗" -ForegroundColor Cyan
Write-Host "║     Kong API Gateway - Auth Service Integration Tests             ║" -ForegroundColor Cyan
Write-Host "╚════════════════════════════════════════════════════════════════════╝" -ForegroundColor Cyan
Write-Host ""

# ==============================================================================
# TEST 1: Staff Login (User model)
# ==============================================================================
$staffLoginBody = '{"email":"admin@example.com","password":"adminpassword"}'

$staffLoginResponse = Test-Endpoint `
    -Name "Staff Login - admin user" `
    -Url "$KongUrl/api/v1/users/login/api/" `
    -Method POST `
    -Body $staffLoginBody `
    -ExpectedStatus 200

$staffToken = $null
if ($staffLoginResponse) {
    Write-Host "`[DEBUG`] Staff login response received" -ForegroundColor Yellow
    Write-Host "`[DEBUG`] Raw response: $staffLoginResponse" -ForegroundColor Yellow
    $staffData = $staffLoginResponse | ConvertFrom-Json
    Write-Host "`[DEBUG`] Parsed data - access_token exists: $($null -ne $staffData.access_token)" -ForegroundColor Yellow
    if ($staffData.access_token) {
        $staffToken = $staffData.access_token
        Write-Host "`[+`] Access Token: $($staffToken.Substring(0, 50))..." -ForegroundColor Green
    } else {
        Write-Host "`[DEBUG`] No access_token in response. Available properties: $($staffData | Get-Member -MemberType NoteProperty | Select-Object -ExpandProperty Name)" -ForegroundColor Yellow
    }
} else {
    Write-Host "`[DEBUG`] Staff login failed - no response" -ForegroundColor Yellow
}

# ==============================================================================
# TEST 2: Staff Profile (with JWT)
# ==============================================================================
if ($staffToken) {
    Test-Endpoint `
        -Name "Staff Profile with JWT" `
        -Url "$KongUrl/api/v1/users/profile/" `
        -Method GET `
        -Headers @{Authorization = "Bearer $staffToken"} `
        -ExpectedStatus 200
}

# ==============================================================================
# TEST 3: Staff Profile WITHOUT JWT (should fail)
# ==============================================================================
Test-Endpoint `
    -Name "Staff Profile WITHOUT JWT (should fail)" `
    -Url "$KongUrl/api/v1/users/profile/" `
    -Method GET `
    -ExpectedStatus 401

# ==============================================================================
# TEST 4: HDTS Employee Login
# ==============================================================================
$employeeLoginBody = '{
    "email": "john.doe@gmail.com",
    "password": "TestPassword123!"
}'

$employeeLoginResponse = Test-Endpoint `
    -Name "HDTS Employee Login john.doe" `
    -Url "$KongUrl/api/v1/hdts/employees/api/login/" `
    -Method POST `
    -Body $employeeLoginBody `
    -ExpectedStatus 200

$employeeToken = $null
if ($employeeLoginResponse) {
    $employeeData = $employeeLoginResponse | ConvertFrom-Json
    if ($employeeData.access_token) {
        $employeeToken = $employeeData.access_token
        Write-Host "`[+`] Access Token: $($employeeToken.Substring(0, 50))..." -ForegroundColor Green
    }
}

# ==============================================================================
# TEST 5: HDTS Employee Profile (with JWT)
# ==============================================================================
if ($employeeToken) {
    Test-Endpoint `
        -Name "HDTS Employee Profile with JWT" `
        -Url "$KongUrl/api/v1/hdts/employees/me/" `
        -Method GET `
        -Headers @{Authorization = "Bearer $employeeToken"} `
        -ExpectedStatus 200
}

# ==============================================================================
# TEST 6: Alternative Staff Login (TTS Admin)
# ==============================================================================
$ttsAdminLoginBody = '{
    "email": "admintts@example.com",
    "password": "admin"
}'

Test-Endpoint `
    -Name "TTS Admin Login" `
    -Url "$KongUrl/api/v1/users/login/api/" `
    -Method POST `
    -Body $ttsAdminLoginBody `
    -ExpectedStatus 200

# ==============================================================================
# TEST 7: HDTS Staff Login
# ==============================================================================
$hdtsStaffLoginBody = '{
    "email": "alex.johnson@gmail.com",
    "password": "password123"
}'

Test-Endpoint `
    -Name "HDTS Staff Login alex.johnson" `
    -Url "$KongUrl/api/v1/users/login/api/" `
    -Method POST `
    -Body $hdtsStaffLoginBody `
    -ExpectedStatus 200

# ==============================================================================
# TEST 8: Token Refresh
# ==============================================================================
if ($staffToken) {
    $staffData = $staffLoginResponse | ConvertFrom-Json
    $refreshToken = $staffData.refresh
    
    $refreshBody = "{
        `"refresh`": `"$refreshToken`"
    }"
    
    Test-Endpoint `
        -Name "Token Refresh" `
        -Url "$KongUrl/api/v1/users/token/refresh/" `
        -Method POST `
        -Body $refreshBody `
        -ExpectedStatus 200
}

# ==============================================================================
# TEST 9: Invalid Credentials (should fail)
# ==============================================================================
$invalidLoginBody = '{
    "email": "invalid@example.com",
    "password": "wrongpassword"
}'

Test-Endpoint `
    -Name "Invalid Login (should fail with 400)" `
    -Url "$KongUrl/api/v1/users/login/api/" `
    -Method POST `
    -Body $invalidLoginBody `
    -ExpectedStatus 400

# ==============================================================================
# TEST 10: Kong Health Check
# ==============================================================================
Test-Endpoint `
    -Name "Kong Admin Status" `
    -Url "http://localhost:8001/status" `
    -Method GET `
    -ExpectedStatus 200

# ==============================================================================
# SUMMARY
# ==============================================================================
Write-Host "`n"
Write-Host "╔════════════════════════════════════════════════════════════════════╗" -ForegroundColor Cyan
Write-Host "║                         TEST SUMMARY                               ║" -ForegroundColor Cyan
Write-Host "╚════════════════════════════════════════════════════════════════════╝" -ForegroundColor Cyan
Write-Host ""

$TestResults | Format-Table -AutoSize

$passCount = ($TestResults | Where-Object { $_.Status -eq "PASS" }).Count
$failCount = ($TestResults | Where-Object { $_.Status -eq "FAIL" }).Count
$total = $TestResults.Count

Write-Host "`nTotal Tests: $total" -ForegroundColor White
Write-Host "Passed: $passCount" -ForegroundColor Green
Write-Host "Failed: $failCount" -ForegroundColor Red

if ($failCount -eq 0) {
    Write-Host "`n[PASS] All tests passed!" -ForegroundColor Green
} else {
    Write-Host "`n[FAIL] Some tests failed. Please review the output above." -ForegroundColor Red
}

Write-Host ""

