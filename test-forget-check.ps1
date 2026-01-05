# Test Forget-Check API with PowerShell
Write-Host "🧪 Testing Forget-Check API..." -ForegroundColor Cyan

try {
    # Step 1: Login
    Write-Host "🔐 Step 1: Login..." -ForegroundColor Yellow
    $loginBody = @{
        email = 'admin@techcorp.com'
        password = 'admin123'
        tenantId = 'techcorp_solutions'
    } | ConvertTo-Json
    
    $loginResponse = Invoke-RestMethod -Uri 'http://localhost:5000/api/v1/auth/login' -Method POST -Body $loginBody -ContentType 'application/json'
    
    if ($loginResponse.success) {
        Write-Host "✅ Login successful!" -ForegroundColor Green
        Write-Host "📋 User: $($loginResponse.data.user.username) ($($loginResponse.data.user.email))" -ForegroundColor White
        Write-Host "📋 User ID: $($loginResponse.data.user._id)" -ForegroundColor White
        Write-Host "📋 Tenant ID: $($loginResponse.data.user.tenantId)" -ForegroundColor White
        Write-Host "📋 Role: $($loginResponse.data.user.role)" -ForegroundColor White
        
        $token = $loginResponse.data.token
        
        # Step 2: Test User Profile
        Write-Host "`n🔍 Step 2: Test User Profile..." -ForegroundColor Yellow
        $headers = @{
            'Authorization' = "Bearer $token"
            'Content-Type' = 'application/json'
        }
        
        $profileResponse = Invoke-RestMethod -Uri 'http://localhost:5000/api/v1/auth/me' -Method GET -Headers $headers
        
        if ($profileResponse.success) {
            Write-Host "✅ User Profile Retrieved:" -ForegroundColor Green
            Write-Host "📋 User: $($profileResponse.data.username) ($($profileResponse.data.email))" -ForegroundColor White
            Write-Host "📋 User ID: $($profileResponse.data._id)" -ForegroundColor White
            Write-Host "📋 Tenant ID: $($profileResponse.data.tenantId)" -ForegroundColor White
            Write-Host "📋 Role: $($profileResponse.data.role)" -ForegroundColor White
        }
        
        # Step 3: Test Forget-Check Creation
        Write-Host "`n🧪 Step 3: Test Forget-Check Creation..." -ForegroundColor Yellow
        $forgetCheckBody = @{
            date = '2026-01-02'
            requestType = 'check-in'
            requestedTime = '09:00'
            reason = 'Test forget check request from PowerShell script'
        } | ConvertTo-Json
        
        Write-Host "📡 Sending request to: http://localhost:5000/api/v1/attendance/forget-checks" -ForegroundColor White
        Write-Host "📄 Request body: $forgetCheckBody" -ForegroundColor White
        
        try {
            $forgetCheckResponse = Invoke-RestMethod -Uri 'http://localhost:5000/api/v1/attendance/forget-checks' -Method POST -Body $forgetCheckBody -Headers $headers
            
            Write-Host "✅ Forget-check created successfully!" -ForegroundColor Green
            Write-Host "📋 Response: $($forgetCheckResponse | ConvertTo-Json -Depth 3)" -ForegroundColor White
            
        } catch {
            Write-Host "❌ Forget-check failed!" -ForegroundColor Red
            Write-Host "📄 Error: $($_.Exception.Message)" -ForegroundColor Red
            
            if ($_.Exception.Response) {
                $reader = New-Object System.IO.StreamReader($_.Exception.Response.GetResponseStream())
                $responseBody = $reader.ReadToEnd()
                Write-Host "📄 Response Body: $responseBody" -ForegroundColor Red
            }
        }
        
    } else {
        Write-Host "❌ Login failed!" -ForegroundColor Red
    }
    
} catch {
    Write-Host "❌ Test error: $($_.Exception.Message)" -ForegroundColor Red
}