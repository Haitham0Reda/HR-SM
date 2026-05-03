# HR-SM Docker Deployment Verification Script (PowerShell)
# This script verifies that all services are running and healthy

$ErrorActionPreference = "Stop"

Write-Host "==========================================" -ForegroundColor Cyan
Write-Host "HR-SM Docker Deployment Verification" -ForegroundColor Cyan
Write-Host "==========================================" -ForegroundColor Cyan
Write-Host ""

# Check if docker-compose is available
try {
    $null = docker-compose --version
    Write-Host "✓ docker-compose found" -ForegroundColor Green
} catch {
    Write-Host "✗ docker-compose not found" -ForegroundColor Red
    exit 1
}

Write-Host ""

# Check if services are running
Write-Host "Checking service status..." -ForegroundColor Yellow
Write-Host ""

$services = @("postgres", "redis", "license-server", "api-server", "hr-app", "platform-admin", "nginx-proxy")
$allHealthy = $true

foreach ($service in $services) {
    Write-Host "Checking $service... " -NoNewline
    
    # Check if container is running
    $containerStatus = docker-compose -f docker-compose.production.yml ps $service 2>$null
    
    if ($containerStatus -match "Up") {
        # Check health status
        $health = docker inspect --format='{{.State.Health.Status}}' "hrms-$service" 2>$null
        
        if ($health -eq "healthy") {
            Write-Host "✓ Running and Healthy" -ForegroundColor Green
        } elseif ($health -eq "starting") {
            Write-Host "⚠ Starting..." -ForegroundColor Yellow
            $allHealthy = $false
        } elseif ($null -eq $health -or $health -eq "") {
            Write-Host "⚠ Running (no health check)" -ForegroundColor Yellow
        } else {
            Write-Host "✗ Unhealthy" -ForegroundColor Red
            $allHealthy = $false
        }
    } else {
        Write-Host "✗ Not Running" -ForegroundColor Red
        $allHealthy = $false
    }
}

Write-Host ""

# Check volumes
Write-Host "Checking volumes..." -ForegroundColor Yellow
$volumes = @("pgdata", "redisdata", "license_keys", "license_logs", "hrms_uploads", "hrms_logs", "hrms_backups", "nginx_logs")

foreach ($volume in $volumes) {
    $volumeExists = docker volume ls | Select-String "hr-sm_$volume"
    
    if ($volumeExists) {
        Write-Host "✓ Volume $volume exists" -ForegroundColor Green
    } else {
        Write-Host "✗ Volume $volume missing" -ForegroundColor Red
        $allHealthy = $false
    }
}

Write-Host ""

# Check network
Write-Host "Checking network..." -ForegroundColor Yellow
$networkExists = docker network ls | Select-String "hr-sm_hrms-network"

if ($networkExists) {
    Write-Host "✓ Network hrms-network exists" -ForegroundColor Green
} else {
    Write-Host "✗ Network hrms-network missing" -ForegroundColor Red
    $allHealthy = $false
}

Write-Host ""

# Wait for services to be ready
Write-Host "Waiting for services to be ready (max 2 minutes)..." -ForegroundColor Yellow
$timeout = 120
$elapsed = 0

while ($elapsed -lt $timeout) {
    $ready = $true
    
    foreach ($service in $services) {
        $health = docker inspect --format='{{.State.Health.Status}}' "hrms-$service" 2>$null
        
        if ($health -ne "healthy" -and $health -ne "" -and $null -ne $health) {
            $ready = $false
            break
        }
    }
    
    if ($ready) {
        Write-Host "✓ All services ready" -ForegroundColor Green
        break
    }
    
    Start-Sleep -Seconds 5
    $elapsed += 5
    Write-Host "." -NoNewline
}

Write-Host ""

if ($elapsed -ge $timeout) {
    Write-Host "✗ Timeout waiting for services to be ready" -ForegroundColor Red
    $allHealthy = $false
}

# Test API endpoints (if nginx-proxy is running)
$nginxStatus = docker-compose -f docker-compose.production.yml ps nginx-proxy 2>$null

if ($nginxStatus -match "Up") {
    Write-Host ""
    Write-Host "Testing API endpoints..." -ForegroundColor Yellow
    
    try {
        $response = Invoke-WebRequest -Uri "http://localhost/health" -UseBasicParsing -TimeoutSec 5
        if ($response.StatusCode -eq 200) {
            Write-Host "✓ Nginx proxy health check passed" -ForegroundColor Green
        } else {
            Write-Host "✗ Nginx proxy health check failed" -ForegroundColor Red
            $allHealthy = $false
        }
    } catch {
        Write-Host "✗ Nginx proxy health check failed: $_" -ForegroundColor Red
        $allHealthy = $false
    }
}

Write-Host ""
Write-Host "==========================================" -ForegroundColor Cyan

if ($allHealthy) {
    Write-Host "✓ All checks passed!" -ForegroundColor Green
    Write-Host ""
    Write-Host "Your HR-SM deployment is ready." -ForegroundColor Cyan
    Write-Host ""
    Write-Host "Access points:"
    Write-Host "  - HR App: https://your-domain.com"
    Write-Host "  - Platform Admin: https://admin.your-domain.com"
    Write-Host "  - API: https://your-domain.com/api"
    Write-Host ""
    exit 0
} else {
    Write-Host "✗ Some checks failed" -ForegroundColor Red
    Write-Host ""
    Write-Host "Please review the errors above and check logs:"
    Write-Host "  docker-compose -f docker-compose.production.yml logs"
    Write-Host ""
    exit 1
}
