# Blue-Green Deployment Script for HR-SM Enterprise (Windows)
# PowerShell implementation of blue-green deployment strategy

param(
    [Parameter(Mandatory=$false)]
    [ValidateSet("deploy", "rollback", "status", "help")]
    [string]$Command = "help"
)

# Configuration
$PRODUCTION_DIR = "C:\opt\hrms-production"
$BLUE_DIR = "C:\opt\hrms-production-blue"
$GREEN_DIR = "C:\opt\hrms-production-green"
$NGINX_BLUE_CONFIG = "C:\nginx\conf\nginx-blue.conf"
$NGINX_GREEN_CONFIG = "C:\nginx\conf\nginx-green.conf"
$BACKUP_DIR = "C:\opt\hrms-backups"

# Colors for output
$RED = "Red"
$GREEN = "Green"
$YELLOW = "Yellow"
$BLUE = "Blue"

# Logging functions
function Write-Log {
    param([string]$Message)
    $timestamp = Get-Date -Format "yyyy-MM-dd HH:mm:ss"
    Write-Host "[$timestamp] $Message" -ForegroundColor $BLUE
}

function Write-Error-Log {
    param([string]$Message)
    Write-Host "[ERROR] $Message" -ForegroundColor $RED
}

function Write-Success {
    param([string]$Message)
    Write-Host "[SUCCESS] $Message" -ForegroundColor $GREEN
}

function Write-Warning-Log {
    param([string]$Message)
    Write-Host "[WARNING] $Message" -ForegroundColor $YELLOW
}

# Check if running as administrator
function Test-Administrator {
    $currentUser = [Security.Principal.WindowsIdentity]::GetCurrent()
    $principal = New-Object Security.Principal.WindowsPrincipal($currentUser)
    return $principal.IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)
}

# Determine current active environment
function Get-CurrentEnvironment {
    try {
        $pm2List = pm2 list --no-color 2>$null | Out-String
        if ($pm2List -match "hrms-main-blue") {
            return "blue"
        } elseif ($pm2List -match "hrms-main-green") {
            return "green"
        } else {
            return "none"
        }
    } catch {
        return "none"
    }
}

# Get next environment
function Get-NextEnvironment {
    param([string]$Current)
    
    switch ($Current) {
        "blue" { return "green" }
        "green" { return "blue" }
        default { return "blue" }
    }
}

# Health check function
function Test-ServiceHealth {
    param(
        [int]$Port,
        [string]$ServiceName
    )
    
    Write-Log "Performing health check for $ServiceName on port $Port..."
    
    $maxAttempts = 30
    $attempt = 1
    
    while ($attempt -le $maxAttempts) {
        try {
            $response = Invoke-WebRequest -Uri "http://localhost:$Port/health" -TimeoutSec 5 -UseBasicParsing
            if ($response.StatusCode -eq 200) {
                Write-Success "$ServiceName health check passed"
                return $true
            }
        } catch {
            # Continue to retry
        }
        
        Write-Log "Health check attempt $attempt/$maxAttempts failed, retrying in 2 seconds..."
        Start-Sleep -Seconds 2
        $attempt++
    }
    
    Write-Error-Log "$ServiceName health check failed after $maxAttempts attempts"
    return $false
}

# Backup database before deployment
function Backup-Database {
    Write-Log "Creating pre-deployment database backup..."
    
    $timestamp = Get-Date -Format "yyyyMMdd_HHmmss"
    $backupFile = "$BACKUP_DIR\pre-deployment-$timestamp"
    
    # Ensure backup directory exists
    if (!(Test-Path $BACKUP_DIR)) {
        New-Item -ItemType Directory -Path $BACKUP_DIR -Force | Out-Null
    }
    
    try {
        # Backup main database
        $mainDbBackup = "$backupFile\hrms"
        New-Item -ItemType Directory -Path $mainDbBackup -Force | Out-Null
        & mongodump --uri="$env:MONGODB_URI" --out="$mainDbBackup" --quiet
        
        # Backup license database
        $licenseDbBackup = "$backupFile\licenses"
        New-Item -ItemType Directory -Path $licenseDbBackup -Force | Out-Null
        & mongodump --uri="$env:LICENSE_MONGODB_URI" --out="$licenseDbBackup" --quiet
        
        # Compress backup
        $archivePath = "$backupFile.zip"
        Compress-Archive -Path $backupFile -DestinationPath $archivePath -Force
        Remove-Item -Path $backupFile -Recurse -Force
        
        Write-Success "Database backup created: $archivePath"
        $archivePath | Out-File -FilePath "$BACKUP_DIR\latest-backup.txt" -Encoding UTF8
        
        return $true
    } catch {
        Write-Error-Log "Failed to create database backup: $($_.Exception.Message)"
        return $false
    }
}

# Restore database from backup
function Restore-Database {
    $backupFile = ""
    if (Test-Path "$BACKUP_DIR\latest-backup.txt") {
        $backupFile = Get-Content "$BACKUP_DIR\latest-backup.txt" -Raw
        $backupFile = $backupFile.Trim()
    }
    
    if ([string]::IsNullOrEmpty($backupFile) -or !(Test-Path $backupFile)) {
        Write-Error-Log "No backup file found for restoration"
        return $false
    }
    
    Write-Warning-Log "Restoring database from backup: $backupFile"
    
    try {
        # Extract backup
        $tempDir = New-TemporaryFile | ForEach-Object { Remove-Item $_; New-Item -ItemType Directory -Path $_ }
        Expand-Archive -Path $backupFile -DestinationPath $tempDir.FullName
        
        # Restore main database
        $hrmsBackup = Get-ChildItem -Path $tempDir.FullName -Recurse -Name "hrms" | Select-Object -First 1
        if ($hrmsBackup) {
            & mongorestore --uri="$env:MONGODB_URI" --drop "$($tempDir.FullName)\$hrmsBackup" --quiet
        }
        
        # Restore license database
        $licenseBackup = Get-ChildItem -Path $tempDir.FullName -Recurse -Name "licenses" | Select-Object -First 1
        if ($licenseBackup) {
            & mongorestore --uri="$env:LICENSE_MONGODB_URI" --drop "$($tempDir.FullName)\$licenseBackup" --quiet
        }
        
        # Cleanup
        Remove-Item -Path $tempDir.FullName -Recurse -Force
        
        Write-Success "Database restored from backup"
        return $true
    } catch {
        Write-Error-Log "Failed to restore database: $($_.Exception.Message)"
        return $false
    }
}

# Deploy to specific environment
function Deploy-ToEnvironment {
    param([string]$Environment)
    
    $envDir = ""
    $mainPort = 0
    $licensePort = 0
    
    switch ($Environment) {
        "blue" {
            $envDir = $BLUE_DIR
            $mainPort = 5000
            $licensePort = 4000
        }
        "green" {
            $envDir = $GREEN_DIR
            $mainPort = 5001
            $licensePort = 4001
        }
    }
    
    Write-Log "Deploying to $Environment environment ($envDir)..."
    
    # Ensure directory exists
    if (!(Test-Path $envDir)) {
        Write-Log "Creating $Environment environment directory..."
        Copy-Item -Path $PRODUCTION_DIR -Destination $envDir -Recurse -Force
    }
    
    Set-Location $envDir
    
    try {
        # Pull latest code
        Write-Log "Pulling latest code..."
        & git pull origin main
        
        # Install dependencies
        Write-Log "Installing main backend dependencies..."
        & npm ci --production --silent
        
        Write-Log "Installing license server dependencies..."
        Set-Location "hrsm-license-server"
        & npm ci --production --silent
        Set-Location ".."
        
        # Run database migrations
        Write-Log "Running database migrations..."
        & npm run migrate
        Set-Location "hrsm-license-server"
        & npm run migrate
        Set-Location ".."
        
        # Start services
        Write-Log "Starting services in $Environment environment..."
        $env:PM2_HOME = "C:\opt\.pm2-$Environment"
        & pm2 start ecosystem.config.js --env "production-$Environment"
        
        # Health checks
        if (!(Test-ServiceHealth -Port $mainPort -ServiceName "Main Backend ($Environment)")) {
            throw "Main backend health check failed"
        }
        
        if (!(Test-ServiceHealth -Port $licensePort -ServiceName "License Server ($Environment)")) {
            throw "License server health check failed"
        }
        
        Write-Success "$Environment environment deployment completed"
        return $true
    } catch {
        Write-Error-Log "Deployment to $Environment failed: $($_.Exception.Message)"
        return $false
    }
}

# Switch traffic to new environment
function Switch-Traffic {
    param([string]$NewEnvironment)
    
    $nginxConfig = ""
    switch ($NewEnvironment) {
        "blue" { $nginxConfig = $NGINX_BLUE_CONFIG }
        "green" { $nginxConfig = $NGINX_GREEN_CONFIG }
    }
    
    Write-Log "Switching traffic to $NewEnvironment environment..."
    
    try {
        # Test nginx configuration
        & nginx -t -c $nginxConfig
        
        # Reload nginx with new configuration
        & nginx -s reload -c $nginxConfig
        
        Write-Success "Traffic switched to $NewEnvironment environment"
        return $true
    } catch {
        Write-Error-Log "Failed to switch traffic: $($_.Exception.Message)"
        return $false
    }
}

# Stop environment
function Stop-Environment {
    param([string]$Environment)
    
    Write-Log "Stopping $Environment environment..."
    
    try {
        $env:PM2_HOME = "C:\opt\.pm2-$Environment"
        & pm2 stop all 2>$null
        & pm2 delete all 2>$null
        
        Write-Success "$Environment environment stopped"
    } catch {
        Write-Warning-Log "Some processes may not have stopped cleanly"
    }
}

# Main deployment function
function Start-Deployment {
    Write-Log "Starting blue-green deployment..."
    
    # Get current environment
    $currentEnv = Get-CurrentEnvironment
    $nextEnv = Get-NextEnvironment -Current $currentEnv
    
    Write-Log "Current environment: $currentEnv"
    Write-Log "Deploying to: $nextEnv"
    
    # Create database backup
    if (!(Backup-Database)) {
        Write-Error-Log "Database backup failed. Aborting deployment."
        return $false
    }
    
    # Deploy to next environment
    if (!(Deploy-ToEnvironment -Environment $nextEnv)) {
        Write-Error-Log "Deployment failed. Aborting."
        return $false
    }
    
    # Switch traffic
    if (!(Switch-Traffic -NewEnvironment $nextEnv)) {
        Write-Error-Log "Traffic switch failed. Manual intervention required."
        return $false
    }
    
    # Wait for traffic to drain
    Write-Log "Waiting 30 seconds for traffic to drain from $currentEnv environment..."
    Start-Sleep -Seconds 30
    
    # Stop old environment
    if ($currentEnv -ne "none") {
        Stop-Environment -Environment $currentEnv
    }
    
    Write-Success "Blue-green deployment completed successfully!"
    Write-Log "Active environment: $nextEnv"
    return $true
}

# Rollback function
function Start-Rollback {
    Write-Log "Starting rollback procedure..."
    
    $currentEnv = Get-CurrentEnvironment
    $previousEnv = Get-NextEnvironment -Current $currentEnv
    
    Write-Log "Current environment: $currentEnv"
    Write-Log "Rolling back to: $previousEnv"
    
    # Start previous environment
    Write-Log "Starting $previousEnv environment..."
    $envDir = if ($previousEnv -eq "blue") { $BLUE_DIR } else { $GREEN_DIR }
    
    Set-Location $envDir
    $env:PM2_HOME = "C:\opt\.pm2-$previousEnv"
    & pm2 start ecosystem.config.js --env "production-$previousEnv"
    
    # Health checks
    $mainPort = if ($previousEnv -eq "blue") { 5000 } else { 5001 }
    $licensePort = if ($previousEnv -eq "blue") { 4000 } else { 4001 }
    
    if (!(Test-ServiceHealth -Port $mainPort -ServiceName "Main Backend ($previousEnv)")) {
        Write-Error-Log "Rollback health check failed for main backend"
        return $false
    }
    
    if (!(Test-ServiceHealth -Port $licensePort -ServiceName "License Server ($previousEnv)")) {
        Write-Error-Log "Rollback health check failed for license server"
        return $false
    }
    
    # Switch traffic back
    if (!(Switch-Traffic -NewEnvironment $previousEnv)) {
        Write-Error-Log "Failed to switch traffic during rollback"
        return $false
    }
    
    # Stop failed environment
    Stop-Environment -Environment $currentEnv
    
    # Ask about database restoration
    $restore = Read-Host "Do you want to restore the database from backup? (y/N)"
    if ($restore -eq "y" -or $restore -eq "Y") {
        Restore-Database
    }
    
    Write-Success "Rollback completed successfully!"
    Write-Log "Active environment: $previousEnv"
    return $true
}

# Status function
function Show-Status {
    $currentEnv = Get-CurrentEnvironment
    
    Write-Host "=== HR-SM Deployment Status ===" -ForegroundColor $BLUE
    Write-Host "Current active environment: $currentEnv"
    Write-Host ""
    
    Write-Host "=== PM2 Processes ===" -ForegroundColor $BLUE
    try {
        $env:PM2_HOME = "C:\opt\.pm2-blue"
        $blueProcesses = pm2 list --no-color 2>$null | Out-String
        if ($blueProcesses -match "hrms") {
            Write-Host "Blue environment processes:"
            Write-Host $blueProcesses
        } else {
            Write-Host "No blue processes running"
        }
    } catch {
        Write-Host "No blue processes running"
    }
    
    try {
        $env:PM2_HOME = "C:\opt\.pm2-green"
        $greenProcesses = pm2 list --no-color 2>$null | Out-String
        if ($greenProcesses -match "hrms") {
            Write-Host "Green environment processes:"
            Write-Host $greenProcesses
        } else {
            Write-Host "No green processes running"
        }
    } catch {
        Write-Host "No green processes running"
    }
    
    Write-Host ""
    Write-Host "=== Health Checks ===" -ForegroundColor $BLUE
    
    # Check all possible ports
    $ports = @(
        @{Port=5000; Name="Main Backend (port 5000)"},
        @{Port=4000; Name="License Server (port 4000)"},
        @{Port=5001; Name="Main Backend (port 5001)"},
        @{Port=4001; Name="License Server (port 4001)"}
    )
    
    foreach ($service in $ports) {
        try {
            $response = Invoke-WebRequest -Uri "http://localhost:$($service.Port)/health" -TimeoutSec 2 -UseBasicParsing
            if ($response.StatusCode -eq 200) {
                Write-Host "✅ $($service.Name): Healthy" -ForegroundColor $GREEN
            } else {
                Write-Host "❌ $($service.Name): Unhealthy" -ForegroundColor $RED
            }
        } catch {
            Write-Host "❌ $($service.Name): Unhealthy" -ForegroundColor $RED
        }
    }
}

# Help function
function Show-Help {
    Write-Host "HR-SM Blue-Green Deployment Script (PowerShell)" -ForegroundColor $BLUE
    Write-Host ""
    Write-Host "Usage: .\blue-green-deploy.ps1 -Command <COMMAND>"
    Write-Host ""
    Write-Host "Commands:"
    Write-Host "  deploy    - Deploy to the inactive environment and switch traffic"
    Write-Host "  rollback  - Rollback to the previous environment"
    Write-Host "  status    - Show current deployment status"
    Write-Host "  help      - Show this help message"
    Write-Host ""
    Write-Host "Environment Variables:"
    Write-Host "  MONGODB_URI         - Main database connection string"
    Write-Host "  LICENSE_MONGODB_URI - License database connection string"
}

# Main script logic
function Main {
    # Check if running as administrator
    if (!(Test-Administrator)) {
        Write-Error-Log "This script must be run as Administrator"
        exit 1
    }
    
    switch ($Command) {
        "deploy" {
            if (Start-Deployment) {
                exit 0
            } else {
                exit 1
            }
        }
        "rollback" {
            if (Start-Rollback) {
                exit 0
            } else {
                exit 1
            }
        }
        "status" {
            Show-Status
        }
        "help" {
            Show-Help
        }
        default {
            Write-Error-Log "Unknown command: $Command"
            Write-Host ""
            Show-Help
            exit 1
        }
    }
}

# Run main function
Main