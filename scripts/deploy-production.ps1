# HRMS Production Deployment Script (PowerShell)
# This script deploys both main backend and license server with proper configuration

param(
    [Parameter(Position=0)]
    [ValidateSet("deploy", "status", "restart", "stop", "logs", "help")]
    [string]$Command = "deploy"
)

# Configuration
$ProjectDir = "C:\inetpub\wwwroot\hr-sm"
$BackupDir = "C:\Backups\hrms"
$LogFile = "C:\Logs\hrms-deploy.log"

# Functions
function Write-Log {
    param([string]$Message, [string]$Level = "INFO")
    
    $timestamp = Get-Date -Format "yyyy-MM-dd HH:mm:ss"
    $logMessage = "[$timestamp] [$Level] $Message"
    
    switch ($Level) {
        "ERROR" { Write-Host $logMessage -ForegroundColor Red }
        "WARN"  { Write-Host $logMessage -ForegroundColor Yellow }
        "INFO"  { Write-Host $logMessage -ForegroundColor Green }
        default { Write-Host $logMessage -ForegroundColor White }
    }
    
    Add-Content -Path $LogFile -Value $logMessage
}

function Test-Requirements {
    Write-Log "Checking system requirements..."
    
    # Check Node.js
    try {
        $nodeVersion = node --version
        Write-Log "Node.js version: $nodeVersion"
        
        $versionNumber = [int]($nodeVersion -replace 'v(\d+)\..*', '$1')
        if ($versionNumber -lt 18) {
            throw "Node.js version 18 or higher is required"
        }
    }
    catch {
        Write-Log "Node.js is not installed or version check failed" "ERROR"
        exit 1
    }
    
    # Check PM2
    try {
        pm2 --version | Out-Null
        Write-Log "PM2 is installed"
    }
    catch {
        Write-Log "PM2 is not installed. Install with: npm install -g pm2" "ERROR"
        exit 1
    }
    
    Write-Log "System requirements check completed"
}

function New-Directories {
    Write-Log "Creating necessary directories..."
    
    $directories = @(
        $ProjectDir,
        $BackupDir,
        "C:\Logs\hrms",
        "$ProjectDir\logs",
        "$ProjectDir\uploads",
        "$ProjectDir\backups",
        "$ProjectDir\hrsm-license-server\logs",
        "$ProjectDir\hrsm-license-server\keys"
    )
    
    foreach ($dir in $directories) {
        if (!(Test-Path $dir)) {
            New-Item -ItemType Directory -Path $dir -Force | Out-Null
            Write-Log "Created directory: $dir"
        }
    }
    
    Write-Log "Directories created successfully"
}

function Backup-Existing {
    if (Test-Path $ProjectDir) {
        Write-Log "Creating backup of existing deployment..."
        
        $backupName = "hrms-backup-$(Get-Date -Format 'yyyyMMdd-HHmmss')"
        $backupPath = "$BackupDir\$backupName.zip"
        
        try {
            Compress-Archive -Path "$ProjectDir\*" -DestinationPath $backupPath -Force
            Write-Log "Backup created: $backupPath"
        }
        catch {
            Write-Log "Backup creation failed: $($_.Exception.Message)" "WARN"
        }
    }
}

function Deploy-Code {
    Write-Log "Deploying application code..."
    
    # Stop existing PM2 processes
    try {
        pm2 stop all
    }
    catch {
        Write-Log "No existing PM2 processes to stop" "WARN"
    }
    
    # Clone or update repository
    if (Test-Path "$ProjectDir\.git") {
        Set-Location $ProjectDir
        git fetch origin
        git reset --hard origin/main
    }
    else {
        if (Test-Path $ProjectDir) {
            Remove-Item -Path $ProjectDir -Recurse -Force
        }
        git clone https://github.com/your-org/hr-sm.git $ProjectDir
        Set-Location $ProjectDir
    }
    
    # Install main backend dependencies
    Write-Log "Installing main backend dependencies..."
    npm ci --production
    
    # Install license server dependencies
    Write-Log "Installing license server dependencies..."
    Set-Location "$ProjectDir\hrsm-license-server"
    npm ci --production
    
    # Generate RSA keys for license server if they don't exist
    if (!(Test-Path "keys\private.pem")) {
        Write-Log "Generating RSA keys for license server..."
        npm run generate-keys
    }
    
    # Install client dependencies and build
    Write-Log "Building client applications..."
    Set-Location "$ProjectDir\client"
    npm ci
    npm run build:hr-app
    npm run build:platform-admin
    
    Set-Location $ProjectDir
    Write-Log "Code deployment completed"
}

function Set-Environment {
    Write-Log "Configuring environment..."
    
    # Copy environment files if they don't exist
    if (!(Test-Path "$ProjectDir\.env")) {
        if (Test-Path "$ProjectDir\.env.production.example") {
            Copy-Item "$ProjectDir\.env.production.example" "$ProjectDir\.env"
            Write-Log "Environment file created from example. Please update with actual values." "WARN"
        }
        else {
            Write-Log "No environment configuration found" "ERROR"
            exit 1
        }
    }
    
    # Configure license server environment
    if (!(Test-Path "$ProjectDir\hrsm-license-server\.env")) {
        if (Test-Path "$ProjectDir\hrsm-license-server\.env.example") {
            Copy-Item "$ProjectDir\hrsm-license-server\.env.example" "$ProjectDir\hrsm-license-server\.env"
            Write-Log "License server environment file created from example. Please update with actual values." "WARN"
        }
    }
    
    Write-Log "Environment configuration completed"
}

function Start-Services {
    Write-Log "Starting services with PM2..."
    
    Set-Location $ProjectDir
    
    # Start main backend
    pm2 start ecosystem.config.js --env production
    
    # Start license server
    Set-Location "$ProjectDir\hrsm-license-server"
    pm2 start ecosystem.config.js --env production
    
    # Save PM2 configuration
    pm2 save
    
    Write-Log "Services started successfully"
}

function Test-Deployment {
    Write-Log "Verifying deployment..."
    
    # Wait for services to start
    Start-Sleep -Seconds 10
    
    # Check main backend health
    try {
        $response = Invoke-WebRequest -Uri "http://localhost:5000/health" -UseBasicParsing -TimeoutSec 10
        if ($response.StatusCode -eq 200) {
            Write-Log "✓ Main backend is healthy"
        }
        else {
            throw "Health check returned status code: $($response.StatusCode)"
        }
    }
    catch {
        Write-Log "✗ Main backend health check failed: $($_.Exception.Message)" "ERROR"
        exit 1
    }
    
    # Check license server health
    try {
        $response = Invoke-WebRequest -Uri "http://localhost:4000/health" -UseBasicParsing -TimeoutSec 10
        if ($response.StatusCode -eq 200) {
            Write-Log "✓ License server is healthy"
        }
        else {
            throw "Health check returned status code: $($response.StatusCode)"
        }
    }
    catch {
        Write-Log "✗ License server health check failed: $($_.Exception.Message)" "ERROR"
        exit 1
    }
    
    # Check PM2 processes
    $pm2List = pm2 list
    if ($pm2List -match "hrms-main-backend|hrsm-license-server") {
        Write-Log "✓ PM2 processes are running"
    }
    else {
        Write-Log "✗ PM2 processes not found" "ERROR"
        exit 1
    }
    
    Write-Log "Deployment verification completed successfully"
}

function Show-Status {
    Write-Log "Deployment Status:"
    Write-Host ""
    Write-Host "PM2 Processes:" -ForegroundColor Cyan
    pm2 list
    Write-Host ""
    Write-Host "Service URLs:" -ForegroundColor Cyan
    Write-Host "  Main Backend: http://localhost:5000"
    Write-Host "  License Server: http://localhost:4000"
    Write-Host "  HR App: http://localhost:3000"
    Write-Host "  Platform Admin: http://localhost:3001"
    Write-Host ""
    Write-Host "Logs:" -ForegroundColor Cyan
    Write-Host "  Main Backend: $ProjectDir\logs\"
    Write-Host "  License Server: $ProjectDir\hrsm-license-server\logs\"
    Write-Host "  Deployment: $LogFile"
    Write-Host ""
}

function Invoke-Deploy {
    Write-Log "Starting HRMS production deployment..."
    
    Test-Requirements
    New-Directories
    Backup-Existing
    Deploy-Code
    Set-Environment
    Start-Services
    Test-Deployment
    Show-Status
    
    Write-Log "HRMS production deployment completed successfully!"
    Write-Log "Please update environment files with actual production values before going live." "WARN"
}

# Main script logic
switch ($Command) {
    "deploy" {
        Invoke-Deploy
    }
    "status" {
        Show-Status
    }
    "restart" {
        Write-Log "Restarting HRMS services..."
        pm2 restart all
        Write-Log "Services restarted"
    }
    "stop" {
        Write-Log "Stopping HRMS services..."
        pm2 stop all
        Write-Log "Services stopped"
    }
    "logs" {
        pm2 logs
    }
    "help" {
        Write-Host "Usage: .\deploy-production.ps1 [deploy|status|restart|stop|logs|help]" -ForegroundColor Cyan
        Write-Host ""
        Write-Host "Commands:" -ForegroundColor Yellow
        Write-Host "  deploy  - Full deployment (default)"
        Write-Host "  status  - Show deployment status"
        Write-Host "  restart - Restart all services"
        Write-Host "  stop    - Stop all services"
        Write-Host "  logs    - Show PM2 logs"
        Write-Host "  help    - Show this help"
    }
    default {
        Write-Log "Unknown command: $Command. Use 'help' for usage information." "ERROR"
        exit 1
    }
}