#!/bin/bash

# HRMS Monitoring Setup Script
# Sets up Prometheus, Grafana, and Alertmanager for comprehensive monitoring

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
PROMETHEUS_VERSION="2.47.0"
GRAFANA_VERSION="10.1.0"
ALERTMANAGER_VERSION="0.26.0"
NODE_EXPORTER_VERSION="1.6.1"

INSTALL_DIR="/opt/monitoring"
CONFIG_DIR="/etc/monitoring"
DATA_DIR="/var/lib/monitoring"
LOG_DIR="/var/log/monitoring"

# Functions
log() {
    echo -e "${GREEN}[$(date +'%Y-%m-%d %H:%M:%S')] $1${NC}"
}

warn() {
    echo -e "${YELLOW}[$(date +'%Y-%m-%d %H:%M:%S')] WARNING: $1${NC}"
}

error() {
    echo -e "${RED}[$(date +'%Y-%m-%d %H:%M:%S')] ERROR: $1${NC}"
    exit 1
}

info() {
    echo -e "${BLUE}[$(date +'%Y-%m-%d %H:%M:%S')] $1${NC}"
}

# Check if running as root
check_root() {
    if [[ $EUID -ne 0 ]]; then
        error "This script must be run as root (use sudo)"
    fi
}

# Create monitoring user
create_monitoring_user() {
    log "Creating monitoring user..."
    
    if ! id "prometheus" &>/dev/null; then
        useradd --no-create-home --shell /bin/false prometheus
        log "Created prometheus user"
    fi
    
    if ! id "grafana" &>/dev/null; then
        useradd --no-create-home --shell /bin/false grafana
        log "Created grafana user"
    fi
    
    if ! id "alertmanager" &>/dev/null; then
        useradd --no-create-home --shell /bin/false alertmanager
        log "Created alertmanager user"
    fi
}

# Create directories
create_directories() {
    log "Creating monitoring directories..."
    
    mkdir -p "$INSTALL_DIR"/{prometheus,grafana,alertmanager,node_exporter}
    mkdir -p "$CONFIG_DIR"/{prometheus,grafana,alertmanager}
    mkdir -p "$DATA_DIR"/{prometheus,grafana,alertmanager}
    mkdir -p "$LOG_DIR"/{prometheus,grafana,alertmanager}
    
    # Set ownership
    chown prometheus:prometheus "$DATA_DIR/prometheus" "$LOG_DIR/prometheus"
    chown grafana:grafana "$DATA_DIR/grafana" "$LOG_DIR/grafana"
    chown alertmanager:alertmanager "$DATA_DIR/alertmanager" "$LOG_DIR/alertmanager"
    
    log "Directories created successfully"
}

# Download and install Prometheus
install_prometheus() {
    log "Installing Prometheus $PROMETHEUS_VERSION..."
    
    cd /tmp
    wget "https://github.com/prometheus/prometheus/releases/download/v$PROMETHEUS_VERSION/prometheus-$PROMETHEUS_VERSION.linux-amd64.tar.gz"
    tar xzf "prometheus-$PROMETHEUS_VERSION.linux-amd64.tar.gz"
    
    cp "prometheus-$PROMETHEUS_VERSION.linux-amd64/prometheus" "$INSTALL_DIR/prometheus/"
    cp "prometheus-$PROMETHEUS_VERSION.linux-amd64/promtool" "$INSTALL_DIR/prometheus/"
    cp -r "prometheus-$PROMETHEUS_VERSION.linux-amd64/consoles" "$INSTALL_DIR/prometheus/"
    cp -r "prometheus-$PROMETHEUS_VERSION.linux-amd64/console_libraries" "$INSTALL_DIR/prometheus/"
    
    chown -R prometheus:prometheus "$INSTALL_DIR/prometheus"
    chmod +x "$INSTALL_DIR/prometheus/prometheus"
    chmod +x "$INSTALL_DIR/prometheus/promtool"
    
    # Create symlinks
    ln -sf "$INSTALL_DIR/prometheus/prometheus" /usr/local/bin/prometheus
    ln -sf "$INSTALL_DIR/prometheus/promtool" /usr/local/bin/promtool
    
    rm -rf "prometheus-$PROMETHEUS_VERSION.linux-amd64"*
    
    log "Prometheus installed successfully"
}

# Download and install Alertmanager
install_alertmanager() {
    log "Installing Alertmanager $ALERTMANAGER_VERSION..."
    
    cd /tmp
    wget "https://github.com/prometheus/alertmanager/releases/download/v$ALERTMANAGER_VERSION/alertmanager-$ALERTMANAGER_VERSION.linux-amd64.tar.gz"
    tar xzf "alertmanager-$ALERTMANAGER_VERSION.linux-amd64.tar.gz"
    
    cp "alertmanager-$ALERTMANAGER_VERSION.linux-amd64/alertmanager" "$INSTALL_DIR/alertmanager/"
    cp "alertmanager-$ALERTMANAGER_VERSION.linux-amd64/amtool" "$INSTALL_DIR/alertmanager/"
    
    chown -R alertmanager:alertmanager "$INSTALL_DIR/alertmanager"
    chmod +x "$INSTALL_DIR/alertmanager/alertmanager"
    chmod +x "$INSTALL_DIR/alertmanager/amtool"
    
    # Create symlinks
    ln -sf "$INSTALL_DIR/alertmanager/alertmanager" /usr/local/bin/alertmanager
    ln -sf "$INSTALL_DIR/alertmanager/amtool" /usr/local/bin/amtool
    
    rm -rf "alertmanager-$ALERTMANAGER_VERSION.linux-amd64"*
    
    log "Alertmanager installed successfully"
}

# Download and install Node Exporter
install_node_exporter() {
    log "Installing Node Exporter $NODE_EXPORTER_VERSION..."
    
    cd /tmp
    wget "https://github.com/prometheus/node_exporter/releases/download/v$NODE_EXPORTER_VERSION/node_exporter-$NODE_EXPORTER_VERSION.linux-amd64.tar.gz"
    tar xzf "node_exporter-$NODE_EXPORTER_VERSION.linux-amd64.tar.gz"
    
    cp "node_exporter-$NODE_EXPORTER_VERSION.linux-amd64/node_exporter" "$INSTALL_DIR/node_exporter/"
    
    chown prometheus:prometheus "$INSTALL_DIR/node_exporter/node_exporter"
    chmod +x "$INSTALL_DIR/node_exporter/node_exporter"
    
    # Create symlink
    ln -sf "$INSTALL_DIR/node_exporter/node_exporter" /usr/local/bin/node_exporter
    
    rm -rf "node_exporter-$NODE_EXPORTER_VERSION.linux-amd64"*
    
    log "Node Exporter installed successfully"
}

# Install Grafana
install_grafana() {
    log "Installing Grafana $GRAFANA_VERSION..."
    
    # Add Grafana repository
    wget -q -O - https://packages.grafana.com/gpg.key | apt-key add -
    echo "deb https://packages.grafana.com/oss/deb stable main" > /etc/apt/sources.list.d/grafana.list
    
    apt-get update
    apt-get install -y grafana
    
    log "Grafana installed successfully"
}

# Copy configuration files
copy_configurations() {
    log "Copying configuration files..."
    
    # Copy Prometheus configuration
    cp /var/www/hr-sm/server/config/prometheus.yml "$CONFIG_DIR/prometheus/"
    cp /var/www/hr-sm/config/prometheus/prometheus-alerts.yml "$CONFIG_DIR/prometheus/"
    chown prometheus:prometheus "$CONFIG_DIR/prometheus"/*
    
    # Copy Alertmanager configuration
    cp /var/www/hr-sm/config/alertmanager/alertmanager.yml "$CONFIG_DIR/alertmanager/"
    chown alertmanager:alertmanager "$CONFIG_DIR/alertmanager"/*
    
    # Copy Grafana configuration
    cp -r /var/www/hr-sm/config/grafana/* "$CONFIG_DIR/grafana/"
    chown -R grafana:grafana "$CONFIG_DIR/grafana"
    
    log "Configuration files copied successfully"
}

# Create systemd services
create_systemd_services() {
    log "Creating systemd services..."
    
    # Prometheus service
    cat > /etc/systemd/system/prometheus.service << EOF
[Unit]
Description=Prometheus Server
Documentation=https://prometheus.io/docs/
After=network-online.target

[Service]
User=prometheus
Restart=on-failure
ExecStart=$INSTALL_DIR/prometheus/prometheus \\
  --config.file=$CONFIG_DIR/prometheus/prometheus.yml \\
  --storage.tsdb.path=$DATA_DIR/prometheus \\
  --web.console.templates=$INSTALL_DIR/prometheus/consoles \\
  --web.console.libraries=$INSTALL_DIR/prometheus/console_libraries \\
  --web.listen-address=0.0.0.0:9091 \\
  --web.external-url=http://localhost:9091 \\
  --storage.tsdb.retention.time=200h \\
  --web.enable-lifecycle

[Install]
WantedBy=multi-user.target
EOF

    # Alertmanager service
    cat > /etc/systemd/system/alertmanager.service << EOF
[Unit]
Description=Alertmanager
Documentation=https://prometheus.io/docs/alerting/alertmanager/
After=network-online.target

[Service]
User=alertmanager
Restart=on-failure
ExecStart=$INSTALL_DIR/alertmanager/alertmanager \\
  --config.file=$CONFIG_DIR/alertmanager/alertmanager.yml \\
  --storage.path=$DATA_DIR/alertmanager \\
  --web.listen-address=0.0.0.0:9093

[Install]
WantedBy=multi-user.target
EOF

    # Node Exporter service
    cat > /etc/systemd/system/node_exporter.service << EOF
[Unit]
Description=Node Exporter
Documentation=https://prometheus.io/docs/guides/node-exporter/
After=network-online.target

[Service]
User=prometheus
Restart=on-failure
ExecStart=$INSTALL_DIR/node_exporter/node_exporter \\
  --web.listen-address=0.0.0.0:9100

[Install]
WantedBy=multi-user.target
EOF

    # Reload systemd
    systemctl daemon-reload
    
    log "Systemd services created successfully"
}

# Start and enable services
start_services() {
    log "Starting monitoring services..."
    
    # Start and enable services
    systemctl enable prometheus
    systemctl start prometheus
    
    systemctl enable alertmanager
    systemctl start alertmanager
    
    systemctl enable node_exporter
    systemctl start node_exporter
    
    systemctl enable grafana-server
    systemctl start grafana-server
    
    log "All monitoring services started successfully"
}

# Verify installation
verify_installation() {
    log "Verifying installation..."
    
    # Check service status
    services=("prometheus" "alertmanager" "node_exporter" "grafana-server")
    
    for service in "${services[@]}"; do
        if systemctl is-active --quiet "$service"; then
            log "✓ $service is running"
        else
            error "✗ $service is not running"
        fi
    done
    
    # Check endpoints
    sleep 5
    
    endpoints=(
        "http://localhost:9091/-/healthy:Prometheus"
        "http://localhost:9093/-/healthy:Alertmanager"
        "http://localhost:9100/metrics:Node Exporter"
        "http://localhost:3002/api/health:Grafana"
    )
    
    for endpoint in "${endpoints[@]}"; do
        url="${endpoint%:*}"
        name="${endpoint#*:}"
        
        if curl -f "$url" &>/dev/null; then
            log "✓ $name is responding"
        else
            warn "✗ $name is not responding at $url"
        fi
    done
    
    log "Installation verification completed"
}

# Show status and URLs
show_status() {
    log "Monitoring Stack Status:"
    echo ""
    echo "Service URLs:"
    echo "  Prometheus: http://localhost:9091"
    echo "  Alertmanager: http://localhost:9093"
    echo "  Node Exporter: http://localhost:9100"
    echo "  Grafana: http://localhost:3002 (admin/admin)"
    echo ""
    echo "Configuration Files:"
    echo "  Prometheus: $CONFIG_DIR/prometheus/prometheus.yml"
    echo "  Alertmanager: $CONFIG_DIR/alertmanager/alertmanager.yml"
    echo "  Grafana: $CONFIG_DIR/grafana/"
    echo ""
    echo "Data Directories:"
    echo "  Prometheus: $DATA_DIR/prometheus"
    echo "  Alertmanager: $DATA_DIR/alertmanager"
    echo "  Grafana: $DATA_DIR/grafana"
    echo ""
    echo "Log Files:"
    echo "  Prometheus: $LOG_DIR/prometheus"
    echo "  Alertmanager: $LOG_DIR/alertmanager"
    echo "  Grafana: $LOG_DIR/grafana"
    echo ""
}

# Main installation function
main() {
    log "Starting HRMS monitoring stack installation..."
    
    check_root
    create_monitoring_user
    create_directories
    install_prometheus
    install_alertmanager
    install_node_exporter
    install_grafana
    copy_configurations
    create_systemd_services
    start_services
    verify_installation
    show_status
    
    log "HRMS monitoring stack installation completed successfully!"
    log "Please configure Grafana dashboards and alert notification channels."
}

# Handle script arguments
case "${1:-install}" in
    "install")
        main
        ;;
    "status")
        show_status
        ;;
    "restart")
        log "Restarting monitoring services..."
        systemctl restart prometheus alertmanager node_exporter grafana-server
        log "Services restarted"
        ;;
    "stop")
        log "Stopping monitoring services..."
        systemctl stop prometheus alertmanager node_exporter grafana-server
        log "Services stopped"
        ;;
    "help")
        echo "Usage: $0 [install|status|restart|stop|help]"
        echo ""
        echo "Commands:"
        echo "  install - Install monitoring stack (default)"
        echo "  status  - Show service status and URLs"
        echo "  restart - Restart all monitoring services"
        echo "  stop    - Stop all monitoring services"
        echo "  help    - Show this help"
        ;;
    *)
        error "Unknown command: $1. Use 'help' for usage information."
        ;;
esac