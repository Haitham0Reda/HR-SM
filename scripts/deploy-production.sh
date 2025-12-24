#!/bin/bash

# HRMS Production Deployment Script
# This script deploys both main backend and license server with proper configuration

set -e  # Exit on any error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
PROJECT_DIR="/var/www/hr-sm"
BACKUP_DIR="/var/backups/hrms"
LOG_FILE="/var/log/hrms-deploy.log"
NGINX_CONFIG="/etc/nginx/sites-available/hrms"
NGINX_ENABLED="/etc/nginx/sites-enabled/hrms"

# Functions
log() {
    echo -e "${GREEN}[$(date +'%Y-%m-%d %H:%M:%S')] $1${NC}" | tee -a "$LOG_FILE"
}

warn() {
    echo -e "${YELLOW}[$(date +'%Y-%m-%d %H:%M:%S')] WARNING: $1${NC}" | tee -a "$LOG_FILE"
}

error() {
    echo -e "${RED}[$(date +'%Y-%m-%d %H:%M:%S')] ERROR: $1${NC}" | tee -a "$LOG_FILE"
    exit 1
}

info() {
    echo -e "${BLUE}[$(date +'%Y-%m-%d %H:%M:%S')] $1${NC}" | tee -a "$LOG_FILE"
}

# Check if running as root
check_root() {
    if [[ $EUID -ne 0 ]]; then
        error "This script must be run as root (use sudo)"
    fi
}

# Check system requirements
check_requirements() {
    log "Checking system requirements..."
    
    # Check Node.js version
    if ! command -v node &> /dev/null; then
        error "Node.js is not installed"
    fi
    
    NODE_VERSION=$(node --version | cut -d'v' -f2 | cut -d'.' -f1)
    if [[ $NODE_VERSION -lt 18 ]]; then
        error "Node.js version 18 or higher is required (current: $(node --version))"
    fi
    
    # Check PM2
    if ! command -v pm2 &> /dev/null; then
        error "PM2 is not installed. Install with: npm install -g pm2"
    fi
    
    # Check MongoDB
    if ! command -v mongod &> /dev/null; then
        warn "MongoDB is not installed locally. Make sure it's available remotely."
    fi
    
    # Check Redis
    if ! command -v redis-server &> /dev/null; then
        warn "Redis is not installed locally. Make sure it's available remotely."
    fi
    
    # Check Nginx
    if ! command -v nginx &> /dev/null; then
        error "Nginx is not installed"
    fi
    
    log "System requirements check completed"
}

# Create necessary directories
create_directories() {
    log "Creating necessary directories..."
    
    mkdir -p "$PROJECT_DIR"
    mkdir -p "$BACKUP_DIR"
    mkdir -p "/var/log/hrms"
    mkdir -p "/var/log/nginx"
    mkdir -p "/etc/ssl/hrms"
    
    # Create directories for both backends
    mkdir -p "$PROJECT_DIR/logs"
    mkdir -p "$PROJECT_DIR/uploads"
    mkdir -p "$PROJECT_DIR/backups"
    mkdir -p "$PROJECT_DIR/hrsm-license-server/logs"
    mkdir -p "$PROJECT_DIR/hrsm-license-server/keys"
    
    log "Directories created successfully"
}

# Backup existing deployment
backup_existing() {
    if [[ -d "$PROJECT_DIR" ]]; then
        log "Creating backup of existing deployment..."
        
        BACKUP_NAME="hrms-backup-$(date +%Y%m%d-%H%M%S)"
        tar -czf "$BACKUP_DIR/$BACKUP_NAME.tar.gz" -C "$PROJECT_DIR" . 2>/dev/null || true
        
        log "Backup created: $BACKUP_DIR/$BACKUP_NAME.tar.gz"
    fi
}

# Deploy application code
deploy_code() {
    log "Deploying application code..."
    
    # Stop existing PM2 processes
    pm2 stop all || true
    
    # Clone or update repository
    if [[ -d "$PROJECT_DIR/.git" ]]; then
        cd "$PROJECT_DIR"
        git fetch origin
        git reset --hard origin/main
    else
        rm -rf "$PROJECT_DIR"
        git clone https://github.com/your-org/hr-sm.git "$PROJECT_DIR"
        cd "$PROJECT_DIR"
    fi
    
    # Install main backend dependencies
    log "Installing main backend dependencies..."
    npm ci --production
    
    # Install license server dependencies
    log "Installing license server dependencies..."
    cd "$PROJECT_DIR/hrsm-license-server"
    npm ci --production
    
    # Generate RSA keys for license server if they don't exist
    if [[ ! -f "keys/private.pem" ]]; then
        log "Generating RSA keys for license server..."
        npm run generate-keys
    fi
    
    # Install client dependencies and build
    log "Building client applications..."
    cd "$PROJECT_DIR/client"
    npm ci
    npm run build:hr-app
    npm run build:platform-admin
    
    cd "$PROJECT_DIR"
    log "Code deployment completed"
}

# Configure environment
configure_environment() {
    log "Configuring environment..."
    
    # Copy environment files if they don't exist
    if [[ ! -f "$PROJECT_DIR/.env" ]]; then
        if [[ -f "$PROJECT_DIR/.env.production.example" ]]; then
            cp "$PROJECT_DIR/.env.production.example" "$PROJECT_DIR/.env"
            warn "Environment file created from example. Please update with actual values."
        else
            error "No environment configuration found"
        fi
    fi
    
    # Configure license server environment
    if [[ ! -f "$PROJECT_DIR/hrsm-license-server/.env" ]]; then
        if [[ -f "$PROJECT_DIR/hrsm-license-server/.env.example" ]]; then
            cp "$PROJECT_DIR/hrsm-license-server/.env.example" "$PROJECT_DIR/hrsm-license-server/.env"
            warn "License server environment file created from example. Please update with actual values."
        fi
    fi
    
    log "Environment configuration completed"
}

# Configure Nginx
configure_nginx() {
    log "Configuring Nginx..."
    
    # Copy Nginx configuration
    cp "$PROJECT_DIR/config/nginx/hrms.conf" "$NGINX_CONFIG"
    
    # Enable site
    ln -sf "$NGINX_CONFIG" "$NGINX_ENABLED"
    
    # Test Nginx configuration
    nginx -t || error "Nginx configuration test failed"
    
    log "Nginx configuration completed"
}

# Configure MongoDB
configure_mongodb() {
    log "Configuring MongoDB..."
    
    # Copy MongoDB configuration if running locally
    if command -v mongod &> /dev/null; then
        cp "$PROJECT_DIR/config/mongodb/replica-set.conf" "/etc/mongod.conf"
        
        # Restart MongoDB service
        systemctl restart mongod || warn "Failed to restart MongoDB service"
        systemctl enable mongod || warn "Failed to enable MongoDB service"
    fi
    
    log "MongoDB configuration completed"
}

# Configure Redis
configure_redis() {
    log "Configuring Redis..."
    
    # Copy Redis configuration if running locally
    if command -v redis-server &> /dev/null; then
        cp "$PROJECT_DIR/config/redis/redis.conf" "/etc/redis/redis.conf"
        
        # Restart Redis service
        systemctl restart redis-server || warn "Failed to restart Redis service"
        systemctl enable redis-server || warn "Failed to enable Redis service"
    fi
    
    log "Redis configuration completed"
}

# Start services with PM2
start_services() {
    log "Starting services with PM2..."
    
    cd "$PROJECT_DIR"
    
    # Start main backend
    pm2 start ecosystem.config.js --env production
    
    # Start license server
    cd "$PROJECT_DIR/hrsm-license-server"
    pm2 start ecosystem.config.js --env production
    
    # Save PM2 configuration
    pm2 save
    
    # Setup PM2 startup script
    pm2 startup systemd -u deploy --hp /home/deploy || warn "Failed to setup PM2 startup script"
    
    log "Services started successfully"
}

# Restart Nginx
restart_nginx() {
    log "Restarting Nginx..."
    
    systemctl restart nginx || error "Failed to restart Nginx"
    systemctl enable nginx || warn "Failed to enable Nginx service"
    
    log "Nginx restarted successfully"
}

# Verify deployment
verify_deployment() {
    log "Verifying deployment..."
    
    # Wait for services to start
    sleep 10
    
    # Check main backend health
    if curl -f http://localhost:5000/health &> /dev/null; then
        log "✓ Main backend is healthy"
    else
        error "✗ Main backend health check failed"
    fi
    
    # Check license server health
    if curl -f http://localhost:4000/health &> /dev/null; then
        log "✓ License server is healthy"
    else
        error "✗ License server health check failed"
    fi
    
    # Check Nginx
    if curl -f http://localhost &> /dev/null; then
        log "✓ Nginx is serving requests"
    else
        error "✗ Nginx health check failed"
    fi
    
    # Check PM2 processes
    pm2 list | grep -E "(hrms-main-backend|hrsm-license-server)" || error "PM2 processes not running"
    
    log "Deployment verification completed successfully"
}

# Show deployment status
show_status() {
    log "Deployment Status:"
    echo ""
    echo "PM2 Processes:"
    pm2 list
    echo ""
    echo "Service URLs:"
    echo "  Main Backend: http://localhost:5000"
    echo "  License Server: http://localhost:4000"
    echo "  HR App: http://localhost:3000"
    echo "  Platform Admin: http://localhost:3001"
    echo ""
    echo "Logs:"
    echo "  Main Backend: $PROJECT_DIR/logs/"
    echo "  License Server: $PROJECT_DIR/hrsm-license-server/logs/"
    echo "  Nginx: /var/log/nginx/"
    echo "  Deployment: $LOG_FILE"
    echo ""
}

# Main deployment function
main() {
    log "Starting HRMS production deployment..."
    
    check_root
    check_requirements
    create_directories
    backup_existing
    deploy_code
    configure_environment
    configure_nginx
    configure_mongodb
    configure_redis
    start_services
    restart_nginx
    verify_deployment
    show_status
    
    log "HRMS production deployment completed successfully!"
    log "Please update environment files with actual production values before going live."
}

# Handle script arguments
case "${1:-deploy}" in
    "deploy")
        main
        ;;
    "status")
        show_status
        ;;
    "restart")
        log "Restarting HRMS services..."
        pm2 restart all
        systemctl restart nginx
        log "Services restarted"
        ;;
    "stop")
        log "Stopping HRMS services..."
        pm2 stop all
        log "Services stopped"
        ;;
    "logs")
        pm2 logs
        ;;
    "help")
        echo "Usage: $0 [deploy|status|restart|stop|logs|help]"
        echo ""
        echo "Commands:"
        echo "  deploy  - Full deployment (default)"
        echo "  status  - Show deployment status"
        echo "  restart - Restart all services"
        echo "  stop    - Stop all services"
        echo "  logs    - Show PM2 logs"
        echo "  help    - Show this help"
        ;;
    *)
        error "Unknown command: $1. Use 'help' for usage information."
        ;;
esac