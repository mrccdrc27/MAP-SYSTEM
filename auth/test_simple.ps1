# Simple Kong test
$KongUrl = "http://localhost:8000"

Write-Host "Testing Kong Gateway..." -ForegroundColor Cyan

# Test staff login
$body = '{"email":"admin@example.com","password":"adminpassword"}'
Write-Host "`nTest 1: Staff Login" -ForegroundColor Yellow
Write-Host "URL: POST $KongUrl/api/v1/users/login/api/" -ForegroundColor Gray

try {
    $response = Invoke-WebRequest -Uri "$KongUrl/api/v1/users/login/api/" -Method POST -Body $body -ContentType "application/json" -UseBasicParsing
    Write-Host "`[PASS`] Status: $($response.StatusCode)" -ForegroundColor Green
    
    $data = $response.Content | ConvertFrom-Json
    $token = $data.access_token
    
    if ($token) {
        Write-Host "`[+`] Got token: $($token.Substring(0, 50))..." -ForegroundColor Green
        
        # Test profile with JWT
        Write-Host "`nTest 2: Staff Profile with JWT" -ForegroundColor Yellow
        $headers = @{Authorization = "Bearer $token"}
        $profileResponse = Invoke-WebRequest -Uri "$KongUrl/api/v1/users/profile/" -Method GET -Headers $headers -UseBasicParsing
        Write-Host "`[PASS`] Status: $($profileResponse.StatusCode)" -ForegroundColor Green
        
        $profile = $profileResponse.Content | ConvertFrom-Json
        Write-Host "`[+`] Profile: $($profile.email) - $($profile.first_name) $($profile.last_name)" -ForegroundColor Green
    } else {
        Write-Host "`[-`] No access_token in response!" -ForegroundColor Red
    }
} catch {
    Write-Host "`[FAIL`] $($_.Exception.Message)" -ForegroundColor Red
}

# Test HDTS employee login
$employeeBody = '{"email":"john.doe@gmail.com","password":"TestPassword123!"}'
Write-Host "`nTest 3: HDTS Employee Login" -ForegroundColor Yellow
Write-Host "URL: POST $KongUrl/api/v1/hdts/employees/api/login/" -ForegroundColor Gray

try {
    $response = Invoke-WebRequest -Uri "$KongUrl/api/v1/hdts/employees/api/login/" -Method POST -Body $employeeBody -ContentType "application/json" -UseBasicParsing
    Write-Host "`[PASS`] Status: $($response.StatusCode)" -ForegroundColor Green
    
    $data = $response.Content | ConvertFrom-Json
    $empToken = $data.access_token
    
    if ($empToken) {
        Write-Host "`[+`] Got employee token: $($empToken.Substring(0, 50))..." -ForegroundColor Green
    }
} catch {
    Write-Host "`[FAIL`] $($_.Exception.Message)" -ForegroundColor Red
}

# Test token refresh
Write-Host "`nTest 4: Token Refresh" -ForegroundColor Yellow
if ($data.refresh_token) {
    $refreshBody = @{refresh = $data.refresh_token} | ConvertTo-Json
    try {
        $refreshResponse = Invoke-WebRequest -Uri "$KongUrl/api/auth/token/refresh/" -Method POST -Body $refreshBody -ContentType "application/json" -UseBasicParsing
        Write-Host "`[PASS`] Status: $($refreshResponse.StatusCode)" -ForegroundColor Green
    } catch {
        Write-Host "`[FAIL`] $($_.Exception.Message)" -ForegroundColor Red
    }
} else {
    Write-Host "`[SKIP`] No refresh_token available" -ForegroundColor Yellow
}

# Test invalid credentials
Write-Host "`nTest 5: Invalid Credentials (should fail)" -ForegroundColor Yellow
$invalidBody = '{"email":"wrong@example.com","password":"wrongpass"}'
try {
    $invalidResponse = Invoke-WebRequest -Uri "$KongUrl/api/v1/users/login/api/" -Method POST -Body $invalidBody -ContentType "application/json" -UseBasicParsing
    Write-Host "`[FAIL`] Should have failed but got: $($invalidResponse.StatusCode)" -ForegroundColor Red
} catch {
    $statusCode = $_.Exception.Response.StatusCode.value__
    if ($statusCode -eq 400 -or $statusCode -eq 401) {
        Write-Host "`[PASS`] Correctly failed with status: $statusCode" -ForegroundColor Green
    } else {
        Write-Host "`[FAIL`] Wrong status code: $statusCode" -ForegroundColor Red
    }
}

Write-Host "`n`nAll tests completed!" -ForegroundColor Cyan
