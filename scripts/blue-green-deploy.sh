#!/bin/bash

# Blue-Green Deployment Script for HR-SM Enterprise
# This script implements blue-green deployment strategy for zero-downtime deployments

set -e

# Configuration
PRODUCTION_DIR="/opt/hrms-production"
BLUE_DIR="/opt/hrms-production-blue"
GREEN_DIR="/opt/hrms-production-green"
NGINX_BLUE_CONFIG="/etc/nginx/nginx-blue.conf"
NGINX_GREEN_CONFIG="/etc/nginx/nginx-green.conf"
BACKUP_DIR="/opt/hrms-backups"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Logging function
log() {
    echo -e "${BLUE}[$(date +'%Y-%m-%d %H:%M:%S')]${NC} $1"
}

error() {
    echo -e "${RED}[ERROR]${NC} $1" >&2
}

success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

# Check if running as root
check_root() {
    if [[ $EUID -ne 0 ]]; then
        error "This script must be run as root"
        exit 1
    fi
}

# Determine current active environment
get_current_environment() {
    if pm2 list | grep -q "hrms-main-blue"; then
        echo "blue"
    elif pm2 list | grep -q "hrms-main-green"; then
        echo "green"
    else
        echo "none"
    fi
}

# Get next environment
get_next_environment() {
    local current=$1
    if [[ "$current" == "blue" ]]; then
        echo "green"
    elif [[ "$current" == "green" ]]; then
        echo "blue"
    else
        echo "blue"  # Default to blue if none active
    fi
}

# Health check function
health_check() {
    local port=$1
    local service_name=$2
    local max_attempts=30
    local attempt=1
    
    log "Performing health check for $service_name on port $port..."
    
    while [[ $attempt -le $max_attempts ]]; do
        if curl -f -s "http://localhost:$port/health" > /dev/null; then
            success "$service_name health check passed"
            return 0
        fi
        
        log "Health check attempt $attempt/$max_attempts failed, retrying in 2 seconds..."
        sleep 2
        ((attempt++))
    done
    
    error "$service_name health check failed after $max_attempts attempts"
    return 1
}

# Backup database before deployment
backup_database() {
    log "Creating pre-deployment database backup..."
    
    local timestamp=$(date +%Y%m%d_%H%M%S)
    local backup_file="$BACKUP_DIR/pre-deployment-$timestamp"
    
    mkdir -p "$BACKUP_DIR"
    
    # Backup main database
    mongodump --uri="$MONGODB_URI" --out="$backup_file/hrms" --quiet
    
    # Backup license database
    mongodump --uri="$LICENSE_MONGODB_URI" --out="$backup_file/licenses" --quiet
    
    # Compress backup
    tar -czf "$backup_file.tar.gz" -C "$BACKUP_DIR" "pre-deployment-$timestamp"
    rm -rf "$backup_file"
    
    success "Database backup created: $backup_file.tar.gz"
    echo "$backup_file.tar.gz" > "$BACKUP_DIR/latest-backup.txt"
}

# Restore database from backup
restore_database() {
    local backup_file=$(cat "$BACKUP_DIR/latest-backup.txt" 2>/dev/null || echo "")
    
    if [[ -z "$backup_file" || ! -f "$backup_file" ]]; then
        error "No backup file found for restoration"
        return 1
    fi
    
    warning "Restoring database from backup: $backup_file"
    
    # Extract backup
    local temp_dir=$(mktemp -d)
    tar -xzf "$backup_file" -C "$temp_dir"
    
    # Restore main database
    mongorestore --uri="$MONGODB_URI" --drop "$temp_dir"/*/hrms --quiet
    
    # Restore license database
    mongorestore --uri="$LICENSE_MONGODB_URI" --drop "$temp_dir"/*/licenses --quiet
    
    # Cleanup
    rm -rf "$temp_dir"
    
    success "Database restored from backup"
}

# Deploy to specific environment
deploy_to_environment() {
    local env=$1
    local env_dir=""
    local main_port=""
    local license_port=""
    
    if [[ "$env" == "blue" ]]; then
        env_dir="$BLUE_DIR"
        main_port="5000"
        license_port="4000"
    else
        env_dir="$GREEN_DIR"
        main_port="5001"
        license_port="4001"
    fi
    
    log "Deploying to $env environment ($env_dir)..."
    
    # Ensure directory exists
    if [[ ! -d "$env_dir" ]]; then
        log "Creating $env environment directory..."
        cp -r "$PRODUCTION_DIR" "$env_dir"
    fi
    
    cd "$env_dir"
    
    # Pull latest code
    log "Pulling latest code..."
    git pull origin main
    
    # Install dependencies
    log "Installing main backend dependencies..."
    npm ci --production --silent
    
    log "Installing license server dependencies..."
    cd hrsm-license-server
    npm ci --production --silent
    cd ..
    
    # Run database migrations
    log "Running database migrations..."
    npm run migrate --silent
    cd hrsm-license-server
    npm run migrate --silent
    cd ..
    
    # Start services
    log "Starting services in $env environment..."
    PM2_HOME="/opt/.pm2-$env" pm2 start ecosystem.config.js --env "production-$env"
    
    # Health checks
    health_check "$main_port" "Main Backend ($env)"
    health_check "$license_port" "License Server ($env)"
    
    success "$env environment deployment completed"
}

# Switch traffic to new environment
switch_traffic() {
    local new_env=$1
    local nginx_config=""
    
    if [[ "$new_env" == "blue" ]]; then
        nginx_config="$NGINX_BLUE_CONFIG"
    else
        nginx_config="$NGINX_GREEN_CONFIG"
    fi
    
    log "Switching traffic to $new_env environment..."
    
    # Test nginx configuration
    nginx -t -c "$nginx_config"
    
    # Reload nginx with new configuration
    nginx -s reload -c "$nginx_config"
    
    success "Traffic switched to $new_env environment"
}

# Stop environment
stop_environment() {
    local env=$1
    
    log "Stopping $env environment..."
    
    PM2_HOME="/opt/.pm2-$env" pm2 stop all || true
    PM2_HOME="/opt/.pm2-$env" pm2 delete all || true
    
    success "$env environment stopped"
}

# Main deployment function
deploy() {
    log "Starting blue-green deployment..."
    
    # Get current environment
    local current_env=$(get_current_environment)
    local next_env=$(get_next_environment "$current_env")
    
    log "Current environment: $current_env"
    log "Deploying to: $next_env"
    
    # Create database backup
    backup_database
    
    # Deploy to next environment
    deploy_to_environment "$next_env"
    
    # Switch traffic
    switch_traffic "$next_env"
    
    # Wait for traffic to drain
    log "Waiting 30 seconds for traffic to drain from $current_env environment..."
    sleep 30
    
    # Stop old environment
    if [[ "$current_env" != "none" ]]; then
        stop_environment "$current_env"
    fi
    
    success "Blue-green deployment completed successfully!"
    log "Active environment: $next_env"
}

# Rollback function
rollback() {
    log "Starting rollback procedure..."
    
    local current_env=$(get_current_environment)
    local previous_env=$(get_next_environment "$current_env")
    
    log "Current environment: $current_env"
    log "Rolling back to: $previous_env"
    
    # Start previous environment
    log "Starting $previous_env environment..."
    local env_dir=""
    if [[ "$previous_env" == "blue" ]]; then
        env_dir="$BLUE_DIR"
    else
        env_dir="$GREEN_DIR"
    fi
    
    cd "$env_dir"
    PM2_HOME="/opt/.pm2-$previous_env" pm2 start ecosystem.config.js --env "production-$previous_env"
    
    # Health checks
    if [[ "$previous_env" == "blue" ]]; then
        health_check "5000" "Main Backend (blue)"
        health_check "4000" "License Server (blue)"
    else
        health_check "5001" "Main Backend (green)"
        health_check "4001" "License Server (green)"
    fi
    
    # Switch traffic back
    switch_traffic "$previous_env"
    
    # Stop failed environment
    stop_environment "$current_env"
    
    # Restore database if needed
    read -p "Do you want to restore the database from backup? (y/N): " -n 1 -r
    echo
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        restore_database
    fi
    
    success "Rollback completed successfully!"
    log "Active environment: $previous_env"
}

# Status function
status() {
    local current_env=$(get_current_environment)
    
    echo "=== HR-SM Deployment Status ==="
    echo "Current active environment: $current_env"
    echo
    
    echo "=== PM2 Processes ==="
    PM2_HOME="/opt/.pm2-blue" pm2 list 2>/dev/null | grep -E "(blue|Process)" || echo "No blue processes running"
    PM2_HOME="/opt/.pm2-green" pm2 list 2>/dev/null | grep -E "(green|Process)" || echo "No green processes running"
    echo
    
    echo "=== Health Checks ==="
    if curl -f -s "http://localhost:5000/health" > /dev/null; then
        echo "✅ Main Backend (port 5000): Healthy"
    else
        echo "❌ Main Backend (port 5000): Unhealthy"
    fi
    
    if curl -f -s "http://localhost:4000/health" > /dev/null; then
        echo "✅ License Server (port 4000): Healthy"
    else
        echo "❌ License Server (port 4000): Unhealthy"
    fi
    
    if curl -f -s "http://localhost:5001/health" > /dev/null; then
        echo "✅ Main Backend (port 5001): Healthy"
    else
        echo "❌ Main Backend (port 5001): Unhealthy"
    fi
    
    if curl -f -s "http://localhost:4001/health" > /dev/null; then
        echo "✅ License Server (port 4001): Healthy"
    else
        echo "❌ License Server (port 4001): Unhealthy"
    fi
}

# Help function
show_help() {
    echo "HR-SM Blue-Green Deployment Script"
    echo
    echo "Usage: $0 [COMMAND]"
    echo
    echo "Commands:"
    echo "  deploy    - Deploy to the inactive environment and switch traffic"
    echo "  rollback  - Rollback to the previous environment"
    echo "  status    - Show current deployment status"
    echo "  help      - Show this help message"
    echo
    echo "Environment Variables:"
    echo "  MONGODB_URI         - Main database connection string"
    echo "  LICENSE_MONGODB_URI - License database connection string"
}

# Main script logic
main() {
    check_root
    
    case "${1:-}" in
        deploy)
            deploy
            ;;
        rollback)
            rollback
            ;;
        status)
            status
            ;;
        help|--help|-h)
            show_help
            ;;
        *)
            error "Unknown command: ${1:-}"
            echo
            show_help
            exit 1
            ;;
    esac
}

# Run main function with all arguments
main "$@"