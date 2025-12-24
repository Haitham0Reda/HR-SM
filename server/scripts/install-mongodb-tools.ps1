# MongoDB Database Tools Installation Script for Windows
# This script downloads and installs MongoDB Database Tools

Write-Host "🔧 Installing MongoDB Database Tools for Windows" -ForegroundColor Blue
Write-Host "=================================================" -ForegroundColor Blue

# Check if running as administrator
$isAdmin = ([Security.Principal.WindowsPrincipal] [Security.Principal.WindowsIdentity]::GetCurrent()).IsInRole([Security.Principal.WindowsBuiltInRole] "Administrator")

if (-not $isAdmin) {
    Write-Host "⚠️  This script should be run as Administrator for best results" -ForegroundColor Yellow
    Write-Host "   Right-click PowerShell and select 'Run as Administrator'" -ForegroundColor Yellow
}

# Create temp directory
$tempDir = "$env:TEMP\mongodb-tools"
if (Test-Path $tempDir) {
    Remove-Item $tempDir -Recurse -Force
}
New-Item -ItemType Directory -Path $tempDir | Out-Null

# Download URL for MongoDB Database Tools
$downloadUrl = "https://fastdl.mongodb.org/tools/db/mongodb-database-tools-windows-x86_64-100.9.4.zip"
$zipFile = "$tempDir\mongodb-database-tools.zip"
$extractDir = "$tempDir\extracted"

Write-Host "📥 Downloading MongoDB Database Tools..." -ForegroundColor Cyan

try {
    # Download the tools
    Invoke-WebRequest -Uri $downloadUrl -OutFile $zipFile -UseBasicParsing
    Write-Host "✓ Download completed" -ForegroundColor Green
    
    # Extract the zip file
    Write-Host "📦 Extracting files..." -ForegroundColor Cyan
    Expand-Archive -Path $zipFile -DestinationPath $extractDir -Force
    
    # Find the extracted directory
    $toolsDir = Get-ChildItem -Path $extractDir -Directory | Select-Object -First 1
    $binDir = Join-Path $toolsDir.FullName "bin"
    
    if (Test-Path $binDir) {
        # Install to Program Files
        $installDir = "C:\Program Files\MongoDB\Tools\bin"
        
        if (-not (Test-Path "C:\Program Files\MongoDB\Tools")) {
            New-Item -ItemType Directory -Path "C:\Program Files\MongoDB\Tools" -Force | Out-Null
        }
        
        Write-Host "📁 Installing to $installDir..." -ForegroundColor Cyan
        Copy-Item -Path $binDir -Destination "C:\Program Files\MongoDB\Tools" -Recurse -Force
        
        # Add to PATH
        $currentPath = [Environment]::GetEnvironmentVariable("PATH", "Machine")
        if ($currentPath -notlike "*$installDir*") {
            Write-Host "🔧 Adding to system PATH..." -ForegroundColor Cyan
            [Environment]::SetEnvironmentVariable("PATH", "$currentPath;$installDir", "Machine")
            Write-Host "✓ Added to system PATH" -ForegroundColor Green
        }
        
        Write-Host "✅ MongoDB Database Tools installed successfully!" -ForegroundColor Green
        Write-Host "📍 Installed to: $installDir" -ForegroundColor Cyan
        
        # Test installation
        Write-Host "🧪 Testing installation..." -ForegroundColor Cyan
        $env:PATH = "$env:PATH;$installDir"
        
        try {
            $version = & "$installDir\mongodump.exe" --version 2>$null
            Write-Host "✓ mongodump is working: $version" -ForegroundColor Green
        } catch {
            Write-Host "⚠️  mongodump test failed, but files are installed" -ForegroundColor Yellow
        }
        
        Write-Host "`n🎉 Installation complete!" -ForegroundColor Green
        Write-Host "💡 You may need to restart your terminal/IDE to use the tools" -ForegroundColor Yellow
        
    } else {
        Write-Host "❌ Could not find bin directory in extracted files" -ForegroundColor Red
    }
    
} catch {
    Write-Host "❌ Installation failed: $($_.Exception.Message)" -ForegroundColor Red
    Write-Host "`n📋 Manual installation instructions:" -ForegroundColor Yellow
    Write-Host "1. Go to: https://www.mongodb.com/try/download/database-tools" -ForegroundColor Cyan
    Write-Host "2. Download MongoDB Database Tools for Windows" -ForegroundColor Cyan
    Write-Host "3. Extract the ZIP file" -ForegroundColor Cyan
    Write-Host "4. Add the bin directory to your system PATH" -ForegroundColor Cyan
} finally {
    # Cleanup
    if (Test-Path $tempDir) {
        Remove-Item $tempDir -Recurse -Force
    }
}

Write-Host "`n🔧 Next steps:" -ForegroundColor Blue
Write-Host "1. Restart your terminal/PowerShell" -ForegroundColor Cyan
Write-Host "2. Run: mongodump --version" -ForegroundColor Cyan
Write-Host "3. Run: node server/scripts/backup-status-report.js" -ForegroundColor Cyan