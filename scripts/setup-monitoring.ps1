# HRMS Monitoring Setup Script (PowerShell)
# Sets up Prometheus, Grafana, and monitoring for Windows environments

param(
    [Parameter(Position=0)]
    [ValidateSet("install", "status", "restart", "stop", "help")]
    [string]$Command = "install"
)

# Configuration
$PrometheusVersion = "2.47.0"
$GrafanaVersion = "10.1.0"
$AlertmanagerVersion = "0.26.0"
$NodeExporterVersion = "1.6.1"

$InstallDir = "C:\monitoring"
$ConfigDir = "C:\monitoring\config"
$DataDir = "C:\monitoring\data"
$LogDir = "C:\monitoring\logs"

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
}

function Test-Administrator {
    $currentUser = [Security.Principal.WindowsIdentity]::GetCurrent()
    $principal = New-Object Security.Principal.WindowsPrincipal($currentUser)
    return $principal.IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)
}

function New-MonitoringDirectories {
    Write-Log "Creating monitoring directories..."
    
    $directories = @(
        $InstallDir,
        "$InstallDir\prometheus",
        "$InstallDir\grafana",
        "$InstallDir\alertmanager",
        "$InstallDir\node_exporter",
        $ConfigDir,
        "$ConfigDir\prometheus",
        "$ConfigDir\grafana",
        "$ConfigDir\alertmanager",
        $DataDir,
        "$DataDir\prometheus",
        "$DataDir\grafana",
        "$DataDir\alertmanager",
        $LogDir
    )
    
    foreach ($dir in $directories) {
        if (!(Test-Path $dir)) {
            New-Item -ItemType Directory -Path $dir -Force | Out-Null
            Write-Log "Created directory: $dir"
        }
    }
    
    Write-Log "Directories created successfully"
}

function Install-Prometheus {
    Write-Log "Installing Prometheus $PrometheusVersion..."
    
    $downloadUrl = "https://github.com/prometheus/prometheus/releases/download/v$PrometheusVersion/prometheus-$PrometheusVersion.windows-amd64.zip"
    $zipPath = "$env:TEMP\prometheus.zip"
    $extractPath = "$env:TEMP\prometheus"
    
    try {
        # Download Prometheus
        Invoke-WebRequest -Uri $downloadUrl -OutFile $zipPath -UseBasicParsing
        
        # Extract
        Expand-Archive -Path $zipPath -DestinationPath $extractPath -Force
        
        # Copy files
        $sourceDir = Get-ChildItem -Path $extractPath -Directory | Select-Object -First 1
        Copy-Item "$($sourceDir.FullName)\prometheus.exe" "$InstallDir\prometheus\" -Force
        Copy-Item "$($sourceDir.FullName)\promtool.exe" "$InstallDir\prometheus\" -Force
        
        # Cleanup
        Remove-Item $zipPath -Force
        Remove-Item $extractPath -Recurse -Force
        
        Write-Log "Prometheus installed successfully"
    }
    catch {
        Write-Log "Failed to install Prometheus: $($_.Exception.Message)" "ERROR"
        exit 1
    }
}

function Install-Alertmanager {
    Write-Log "Installing Alertmanager $AlertmanagerVersion..."
    
    $downloadUrl = "https://github.com/prometheus/alertmanager/releases/download/v$AlertmanagerVersion/alertmanager-$AlertmanagerVersion.windows-amd64.zip"
    $zipPath = "$env:TEMP\alertmanager.zip"
    $extractPath = "$env:TEMP\alertmanager"
    
    try {
        # Download Alertmanager
        Invoke-WebRequest -Uri $downloadUrl -OutFile $zipPath -UseBasicParsing
        
        # Extract
        Expand-Archive -Path $zipPath -DestinationPath $extractPath -Force
        
        # Copy files
        $sourceDir = Get-ChildItem -Path $extractPath -Directory | Select-Object -First 1
        Copy-Item "$($sourceDir.FullName)\alertmanager.exe" "$InstallDir\alertmanager\" -Force
        Copy-Item "$($sourceDir.FullName)\amtool.exe" "$InstallDir\alertmanager\" -Force
        
        # Cleanup
        Remove-Item $zipPath -Force
        Remove-Item $extractPath -Recurse -Force
        
        Write-Log "Alertmanager installed successfully"
    }
    catch {
        Write-Log "Failed to install Alertmanager: $($_.Exception.Message)" "ERROR"
        exit 1
    }
}

function Install-NodeExporter {
    Write-Log "Installing Node Exporter $NodeExporterVersion..."
    
    $downloadUrl = "https://github.com/prometheus/node_exporter/releases/download/v$NodeExporterVersion/node_exporter-$NodeExporterVersion.windows-amd64.zip"
    $zipPath = "$env:TEMP\node_exporter.zip"
    $extractPath = "$env:TEMP\node_exporter"
    
    try {
        # Download Node Exporter
        Invoke-WebRequest -Uri $downloadUrl -OutFile $zipPath -UseBasicParsing
        
        # Extract
        Expand-Archive -Path $zipPath -DestinationPath $extractPath -Force
        
        # Copy files
        $sourceDir = Get-ChildItem -Path $extractPath -Directory | Select-Object -First 1
        Copy-Item "$($sourceDir.FullName)\node_exporter.exe" "$InstallDir\node_exporter\" -Force
        
        # Cleanup
        Remove-Item $zipPath -Force
        Remove-Item $extractPath -Recurse -Force
        
        Write-Log "Node Exporter installed successfully"
    }
    catch {
        Write-Log "Failed to install Node Exporter: $($_.Exception.Message)" "ERROR"
        exit 1
    }
}

function Install-Grafana {
    Write-Log "Installing Grafana $GrafanaVersion..."
    
    $downloadUrl = "https://dl.grafana.com/oss/release/grafana-$GrafanaVersion.windows-amd64.zip"
    $zipPath = "$env:TEMP\grafana.zip"
    $extractPath = "$env:TEMP\grafana"
    
    try {
        # Download Grafana
        Invoke-WebRequest -Uri $downloadUrl -OutFile $zipPath -UseBasicParsing
        
        # Extract
        Expand-Archive -Path $zipPath -DestinationPath $extractPath -Force
        
        # Copy files
        $sourceDir = Get-ChildItem -Path $extractPath -Directory | Select-Object -First 1
        Copy-Item "$($sourceDir.FullName)\*" "$InstallDir\grafana\" -Recurse -Force
        
        # Cleanup
        Remove-Item $zipPath -Force
        Remove-Item $extractPath -Recurse -Force
        
        Write-Log "Grafana installed successfully"
    }
    catch {
        Write-Log "Failed to install Grafana: $($_.Exception.Message)" "ERROR"
        exit 1
    }
}

function Copy-Configurations {
    Write-Log "Copying configuration files..."
    
    try {
        # Copy Prometheus configuration
        if (Test-Path "server\config\prometheus.yml") {
            Copy-Item "server\config\prometheus.yml" "$ConfigDir\prometheus\" -Force
        }
        if (Test-Path "config\prometheus\prometheus-alerts.yml") {
            Copy-Item "config\prometheus\prometheus-alerts.yml" "$ConfigDir\prometheus\" -Force
        }
        
        # Copy Alertmanager configuration
        if (Test-Path "config\alertmanager\alertmanager.yml") {
            Copy-Item "config\alertmanager\alertmanager.yml" "$ConfigDir\alertmanager\" -Force
        }
        
        # Copy Grafana configuration
        if (Test-Path "config\grafana") {
            Copy-Item "config\grafana\*" "$ConfigDir\grafana\" -Recurse -Force
        }
        
        Write-Log "Configuration files copied successfully"
    }
    catch {
        Write-Log "Failed to copy configuration files: $($_.Exception.Message)" "WARN"
    }
}

function New-WindowsServices {
    Write-Log "Creating Windows services..."
    
    try {
        # Create Prometheus service
        $prometheusArgs = @(
            "--config.file=$ConfigDir\prometheus\prometheus.yml",
            "--storage.tsdb.path=$DataDir\prometheus",
            "--web.listen-address=0.0.0.0:9091",
            "--storage.tsdb.retention.time=200h",
            "--web.enable-lifecycle"
        )
        
        New-Service -Name "Prometheus" -BinaryPathName "`"$InstallDir\prometheus\prometheus.exe`" $($prometheusArgs -join ' ')" -DisplayName "Prometheus Server" -StartupType Automatic
        
        # Create Alertmanager service
        $alertmanagerArgs = @(
            "--config.file=$ConfigDir\alertmanager\alertmanager.yml",
            "--storage.path=$DataDir\alertmanager",
            "--web.listen-address=0.0.0.0:9093"
        )
        
        New-Service -Name "Alertmanager" -BinaryPathName "`"$InstallDir\alertmanager\alertmanager.exe`" $($alertmanagerArgs -join ' ')" -DisplayName "Prometheus Alertmanager" -StartupType Automatic
        
        # Create Node Exporter service
        New-Service -Name "NodeExporter" -BinaryPathName "`"$InstallDir\node_exporter\node_exporter.exe`" --web.listen-address=0.0.0.0:9100" -DisplayName "Prometheus Node Exporter" -StartupType Automatic
        
        Write-Log "Windows services created successfully"
    }
    catch {
        Write-Log "Failed to create Windows services: $($_.Exception.Message)" "ERROR"
    }
}

function Start-MonitoringServices {
    Write-Log "Starting monitoring services..."
    
    $services = @("Prometheus", "Alertmanager", "NodeExporter")
    
    foreach ($service in $services) {
        try {
            Start-Service -Name $service
            Write-Log "Started $service service"
        }
        catch {
            Write-Log "Failed to start $service service: $($_.Exception.Message)" "ERROR"
        }
    }
    
    # Start Grafana manually (not as service in this setup)
    Write-Log "Starting Grafana server..."
    Start-Process -FilePath "$InstallDir\grafana\bin\grafana-server.exe" -WorkingDirectory "$InstallDir\grafana" -WindowStyle Hidden
}

function Test-Installation {
    Write-Log "Verifying installation..."
    
    # Check services
    $services = @("Prometheus", "Alertmanager", "NodeExporter")
    
    foreach ($service in $services) {
        $serviceStatus = Get-Service -Name $service -ErrorAction SilentlyContinue
        if ($serviceStatus -and $serviceStatus.Status -eq 'Running') {
            Write-Log "✓ $service is running"
        } else {
            Write-Log "✗ $service is not running" "WARN"
        }
    }
    
    # Check endpoints
    Start-Sleep -Seconds 5
    
    $endpoints = @(
        @{Url="http://localhost:9091/-/healthy"; Name="Prometheus"},
        @{Url="http://localhost:9093/-/healthy"; Name="Alertmanager"},
        @{Url="http://localhost:9100/metrics"; Name="Node Exporter"}
    )
    
    foreach ($endpoint in $endpoints) {
        try {
            $response = Invoke-WebRequest -Uri $endpoint.Url -UseBasicParsing -TimeoutSec 5
            if ($response.StatusCode -eq 200) {
                Write-Log "✓ $($endpoint.Name) is responding"
            }
        }
        catch {
            Write-Log "✗ $($endpoint.Name) is not responding at $($endpoint.Url)" "WARN"
        }
    }
    
    Write-Log "Installation verification completed"
}

function Show-Status {
    Write-Log "Monitoring Stack Status:"
    Write-Host ""
    Write-Host "Service URLs:" -ForegroundColor Cyan
    Write-Host "  Prometheus: http://localhost:9091"
    Write-Host "  Alertmanager: http://localhost:9093"
    Write-Host "  Node Exporter: http://localhost:9100"
    Write-Host "  Grafana: http://localhost:3002 (admin/admin)"
    Write-Host ""
    Write-Host "Installation Directories:" -ForegroundColor Cyan
    Write-Host "  Install: $InstallDir"
    Write-Host "  Config: $ConfigDir"
    Write-Host "  Data: $DataDir"
    Write-Host "  Logs: $LogDir"
    Write-Host ""
    Write-Host "Windows Services:" -ForegroundColor Cyan
    
    $services = @("Prometheus", "Alertmanager", "NodeExporter")
    foreach ($service in $services) {
        $serviceStatus = Get-Service -Name $service -ErrorAction SilentlyContinue
        if ($serviceStatus) {
            Write-Host "  $service`: $($serviceStatus.Status)"
        } else {
            Write-Host "  $service`: Not Installed" -ForegroundColor Red
        }
    }
    Write-Host ""
}

function Invoke-MonitoringInstall {
    Write-Log "Starting HRMS monitoring stack installation..."
    
    if (!(Test-Administrator)) {
        Write-Log "This script must be run as Administrator" "ERROR"
        exit 1
    }
    
    New-MonitoringDirectories
    Install-Prometheus
    Install-Alertmanager
    Install-NodeExporter
    Install-Grafana
    Copy-Configurations
    New-WindowsServices
    Start-MonitoringServices
    Test-Installation
    Show-Status
    
    Write-Log "HRMS monitoring stack installation completed successfully!"
    Write-Log "Please configure Grafana dashboards and alert notification channels." "INFO"
}

# Main script logic
switch ($Command) {
    "install" {
        Invoke-MonitoringInstall
    }
    "status" {
        Show-Status
    }
    "restart" {
        Write-Log "Restarting monitoring services..."
        $services = @("Prometheus", "Alertmanager", "NodeExporter")
        foreach ($service in $services) {
            Restart-Service -Name $service -ErrorAction SilentlyContinue
        }
        Write-Log "Services restarted"
    }
    "stop" {
        Write-Log "Stopping monitoring services..."
        $services = @("Prometheus", "Alertmanager", "NodeExporter")
        foreach ($service in $services) {
            Stop-Service -Name $service -ErrorAction SilentlyContinue
        }
        Write-Log "Services stopped"
    }
    "help" {
        Write-Host "Usage: .\setup-monitoring.ps1 [install|status|restart|stop|help]" -ForegroundColor Cyan
        Write-Host ""
        Write-Host "Commands:" -ForegroundColor Yellow
        Write-Host "  install - Install monitoring stack (default)"
        Write-Host "  status  - Show service status and URLs"
        Write-Host "  restart - Restart all monitoring services"
        Write-Host "  stop    - Stop all monitoring services"
        Write-Host "  help    - Show this help"
    }
    default {
        Write-Log "Unknown command: $Command. Use 'help' for usage information." "ERROR"
        exit 1
    }
}