# Database Migration Script for HR-SM Enterprise (Windows)
# PowerShell implementation for handling migrations of both databases

param(
    [Parameter(Mandatory=$false)]
    [ValidateSet("migrate", "rollback", "status", "help")]
    [string]$Command = "help"
)

# Configuration
$BACKUP_DIR = "C:\opt\hrms-backups\migrations"
$LOG_FILE = "C:\logs\hrms\migration.log"

# Colors for output
$RED = "Red"
$GREEN = "Green"
$YELLOW = "Yellow"
$BLUE = "Blue"

# Logging functions
function Write-Log {
    param([string]$Message)
    $timestamp = Get-Date -Format "yyyy-MM-dd HH:mm:ss"
    $logMessage = "[$timestamp] $Message"
    Write-Host $logMessage -ForegroundColor $BLUE
    
    # Ensure log directory exists
    $logDir = Split-Path $LOG_FILE -Parent
    if (!(Test-Path $logDir)) {
        New-Item -ItemType Directory -Path $logDir -Force | Out-Null
    }
    
    Add-Content -Path $LOG_FILE -Value $logMessage
}

function Write-Error-Log {
    param([string]$Message)
    $logMessage = "[ERROR] $Message"
    Write-Host $logMessage -ForegroundColor $RED
    Add-Content -Path $LOG_FILE -Value $logMessage
}

function Write-Success {
    param([string]$Message)
    $logMessage = "[SUCCESS] $Message"
    Write-Host $logMessage -ForegroundColor $GREEN
    Add-Content -Path $LOG_FILE -Value $logMessage
}

function Write-Warning-Log {
    param([string]$Message)
    $logMessage = "[WARNING] $Message"
    Write-Host $logMessage -ForegroundColor $YELLOW
    Add-Content -Path $LOG_FILE -Value $logMessage
}

# Ensure backup directory exists
if (!(Test-Path $BACKUP_DIR)) {
    New-Item -ItemType Directory -Path $BACKUP_DIR -Force | Out-Null
}

# Check MongoDB connection
function Test-MongoDBConnection {
    param(
        [string]$Uri,
        [string]$DatabaseName
    )
    
    Write-Log "Checking MongoDB connection for $DatabaseName..."
    
    try {
        $result = & mongosh $Uri --eval "db.adminCommand('ping')" --quiet 2>$null
        if ($LASTEXITCODE -eq 0) {
            Write-Success "MongoDB connection successful for $DatabaseName"
            return $true
        } else {
            Write-Error-Log "Failed to connect to MongoDB for $DatabaseName"
            return $false
        }
    } catch {
        Write-Error-Log "Failed to connect to MongoDB for $DatabaseName : $($_.Exception.Message)"
        return $false
    }
}

# Create pre-migration backup
function New-Backup {
    param(
        [string]$Uri,
        [string]$DatabaseName,
        [string]$BackupName
    )
    
    Write-Log "Creating pre-migration backup for $DatabaseName..."
    
    $timestamp = Get-Date -Format "yyyyMMdd_HHmmss"
    $backupPath = "$BACKUP_DIR\${BackupName}_pre_migration_$timestamp"
    
    try {
        # Create backup
        & mongodump --uri="$Uri" --out="$backupPath" --quiet
        
        if ($LASTEXITCODE -eq 0) {
            # Compress backup
            $archivePath = "$backupPath.zip"
            Compress-Archive -Path $backupPath -DestinationPath $archivePath -Force
            Remove-Item -Path $backupPath -Recurse -Force
            
            Write-Success "Backup created: $archivePath"
            $archivePath | Out-File -FilePath "$BACKUP_DIR\latest_${BackupName}_backup.txt" -Encoding UTF8
            return $true
        } else {
            Write-Error-Log "Failed to create backup for $DatabaseName"
            return $false
        }
    } catch {
        Write-Error-Log "Failed to create backup for $DatabaseName : $($_.Exception.Message)"
        return $false
    }
}

# Restore from backup
function Restore-Backup {
    param(
        [string]$Uri,
        [string]$DatabaseName,
        [string]$BackupName
    )
    
    $backupFile = ""
    $backupListFile = "$BACKUP_DIR\latest_${BackupName}_backup.txt"
    
    if (Test-Path $backupListFile) {
        $backupFile = Get-Content $backupListFile -Raw
        $backupFile = $backupFile.Trim()
    }
    
    if ([string]::IsNullOrEmpty($backupFile) -or !(Test-Path $backupFile)) {
        Write-Error-Log "No backup file found for $DatabaseName"
        return $false
    }
    
    Write-Warning-Log "Restoring $DatabaseName from backup: $backupFile"
    
    try {
        # Extract backup
        $tempDir = New-TemporaryFile | ForEach-Object { Remove-Item $_; New-Item -ItemType Directory -Path $_ }
        Expand-Archive -Path $backupFile -DestinationPath $tempDir.FullName
        
        # Find the database directory
        $dbDir = Get-ChildItem -Path $tempDir.FullName -Directory | Select-Object -First 1
        
        if ($dbDir) {
            & mongorestore --uri="$Uri" --drop $dbDir.FullName --quiet
            
            if ($LASTEXITCODE -eq 0) {
                Write-Success "Database $DatabaseName restored from backup"
                Remove-Item -Path $tempDir.FullName -Recurse -Force
                return $true
            } else {
                Write-Error-Log "Failed to restore $DatabaseName from backup"
                Remove-Item -Path $tempDir.FullName -Recurse -Force
                return $false
            }
        } else {
            Write-Error-Log "No database directory found in backup"
            Remove-Item -Path $tempDir.FullName -Recurse -Force
            return $false
        }
    } catch {
        Write-Error-Log "Failed to restore $DatabaseName from backup: $($_.Exception.Message)"
        return $false
    }
}

# Run migrations for main HRMS database
function Start-MainDatabaseMigration {
    Write-Log "Starting migration for main HRMS database..."
    
    # Check connection
    if (!(Test-MongoDBConnection -Uri $env:MONGODB_URI -DatabaseName "HRMS")) {
        return $false
    }
    
    # Create backup
    if (!(New-Backup -Uri $env:MONGODB_URI -DatabaseName "HRMS" -BackupName "hrms")) {
        return $false
    }
    
    # Run migrations
    Write-Log "Running main database migrations..."
    Set-Location "C:\opt\hrms-production"
    
    try {
        & npm run migrate
        
        if ($LASTEXITCODE -eq 0) {
            Write-Success "Main database migrations completed successfully"
            return $true
        } else {
            Write-Error-Log "Main database migrations failed"
            
            # Ask for rollback
            $restore = Read-Host "Do you want to restore from backup? (y/N)"
            if ($restore -eq "y" -or $restore -eq "Y") {
                Restore-Backup -Uri $env:MONGODB_URI -DatabaseName "HRMS" -BackupName "hrms"
            }
            return $false
        }
    } catch {
        Write-Error-Log "Main database migrations failed: $($_.Exception.Message)"
        return $false
    }
}

# Run migrations for license server database
function Start-LicenseDatabaseMigration {
    Write-Log "Starting migration for license server database..."
    
    # Check connection
    if (!(Test-MongoDBConnection -Uri $env:LICENSE_MONGODB_URI -DatabaseName "License Server")) {
        return $false
    }
    
    # Create backup
    if (!(New-Backup -Uri $env:LICENSE_MONGODB_URI -DatabaseName "License Server" -BackupName "licenses")) {
        return $false
    }
    
    # Run migrations
    Write-Log "Running license server migrations..."
    Set-Location "C:\opt\hrms-production\hrsm-license-server"
    
    try {
        & npm run migrate
        
        if ($LASTEXITCODE -eq 0) {
            Write-Success "License server migrations completed successfully"
            return $true
        } else {
            Write-Error-Log "License server migrations failed"
            
            # Ask for rollback
            $restore = Read-Host "Do you want to restore license database from backup? (y/N)"
            if ($restore -eq "y" -or $restore -eq "Y") {
                Restore-Backup -Uri $env:LICENSE_MONGODB_URI -DatabaseName "License Server" -BackupName "licenses"
            }
            return $false
        }
    } catch {
        Write-Error-Log "License server migrations failed: $($_.Exception.Message)"
        return $false
    }
}

# Verify migrations
function Test-Migrations {
    Write-Log "Verifying migrations..."
    
    # Verify main database
    Write-Log "Verifying main database schema..."
    Set-Location "C:\opt\hrms-production"
    try {
        & npm run migrate:verify
        if ($LASTEXITCODE -eq 0) {
            Write-Success "Main database schema verification passed"
        } else {
            Write-Warning-Log "Main database schema verification failed"
        }
    } catch {
        Write-Warning-Log "Main database schema verification failed: $($_.Exception.Message)"
    }
    
    # Verify license database
    Write-Log "Verifying license database schema..."
    Set-Location "C:\opt\hrms-production\hrsm-license-server"
    try {
        & npm run migrate:verify
        if ($LASTEXITCODE -eq 0) {
            Write-Success "License database schema verification passed"
        } else {
            Write-Warning-Log "License database schema verification failed"
        }
    } catch {
        Write-Warning-Log "License database schema verification failed: $($_.Exception.Message)"
    }
}

# Main migration function
function Start-Migrations {
    Write-Log "Starting database migrations for HR-SM Enterprise..."
    
    $mainSuccess = Start-MainDatabaseMigration
    $licenseSuccess = Start-LicenseDatabaseMigration
    
    # Verify migrations
    Test-Migrations
    
    # Summary
    if ($mainSuccess -and $licenseSuccess) {
        Write-Success "All database migrations completed successfully!"
        return $true
    } elseif ($mainSuccess) {
        Write-Warning-Log "Main database migrations succeeded, but license database migrations failed"
        return $false
    } elseif ($licenseSuccess) {
        Write-Warning-Log "License database migrations succeeded, but main database migrations failed"
        return $false
    } else {
        Write-Error-Log "All database migrations failed"
        return $false
    }
}

# Rollback function
function Start-Rollback {
    Write-Log "Starting migration rollback..."
    
    # Rollback main database
    Write-Log "Rolling back main database..."
    if (Restore-Backup -Uri $env:MONGODB_URI -DatabaseName "HRMS" -BackupName "hrms") {
        Write-Success "Main database rollback completed"
    } else {
        Write-Error-Log "Main database rollback failed"
    }
    
    # Rollback license database
    Write-Log "Rolling back license database..."
    if (Restore-Backup -Uri $env:LICENSE_MONGODB_URI -DatabaseName "License Server" -BackupName "licenses") {
        Write-Success "License database rollback completed"
    } else {
        Write-Error-Log "License database rollback failed"
    }
}

# Status function
function Show-Status {
    Write-Host "=== Migration Status ===" -ForegroundColor $BLUE
    
    # Check main database connection
    if (Test-MongoDBConnection -Uri $env:MONGODB_URI -DatabaseName "HRMS") {
        Write-Host "✅ Main database: Connected" -ForegroundColor $GREEN
    } else {
        Write-Host "❌ Main database: Connection failed" -ForegroundColor $RED
    }
    
    # Check license database connection
    if (Test-MongoDBConnection -Uri $env:LICENSE_MONGODB_URI -DatabaseName "License Server") {
        Write-Host "✅ License database: Connected" -ForegroundColor $GREEN
    } else {
        Write-Host "❌ License database: Connection failed" -ForegroundColor $RED
    }
    
    # Show recent backups
    Write-Host ""
    Write-Host "=== Recent Backups ===" -ForegroundColor $BLUE
    if (Test-Path $BACKUP_DIR) {
        $backups = Get-ChildItem -Path $BACKUP_DIR -Filter "*.zip" | Sort-Object LastWriteTime -Descending | Select-Object -First 5
        if ($backups) {
            $backups | ForEach-Object {
                Write-Host "$($_.Name) - $($_.LastWriteTime)"
            }
        } else {
            Write-Host "No backups found"
        }
    } else {
        Write-Host "Backup directory not found"
    }
}

# Help function
function Show-Help {
    Write-Host "HR-SM Database Migration Script (PowerShell)" -ForegroundColor $BLUE
    Write-Host ""
    Write-Host "Usage: .\database-migration.ps1 -Command <COMMAND>"
    Write-Host ""
    Write-Host "Commands:"
    Write-Host "  migrate   - Run migrations for both databases"
    Write-Host "  rollback  - Rollback both databases to pre-migration state"
    Write-Host "  status    - Show migration and database status"
    Write-Host "  help      - Show this help message"
    Write-Host ""
    Write-Host "Environment Variables:"
    Write-Host "  MONGODB_URI         - Main database connection string"
    Write-Host "  LICENSE_MONGODB_URI - License database connection string"
    Write-Host ""
    Write-Host "Examples:"
    Write-Host "  .\database-migration.ps1 -Command migrate"
    Write-Host "  .\database-migration.ps1 -Command rollback"
    Write-Host "  .\database-migration.ps1 -Command status"
}

# Main script logic
function Main {
    # Check required environment variables
    if ([string]::IsNullOrEmpty($env:MONGODB_URI)) {
        Write-Error-Log "MONGODB_URI environment variable is required"
        exit 1
    }
    
    if ([string]::IsNullOrEmpty($env:LICENSE_MONGODB_URI)) {
        Write-Error-Log "LICENSE_MONGODB_URI environment variable is required"
        exit 1
    }
    
    switch ($Command) {
        "migrate" {
            if (Start-Migrations) {
                exit 0
            } else {
                exit 1
            }
        }
        "rollback" {
            Start-Rollback
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