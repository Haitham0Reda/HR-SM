#!/bin/bash

# Database Migration Script for HR-SM Enterprise
# Handles migrations for both main HRMS database and license server database

set -e

# Configuration
BACKUP_DIR="/opt/hrms-backups/migrations"
LOG_FILE="/var/log/hrms/migration.log"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Logging function
log() {
    local message="[$(date +'%Y-%m-%d %H:%M:%S')] $1"
    echo -e "${BLUE}$message${NC}"
    echo "$message" >> "$LOG_FILE"
}

error() {
    local message="[ERROR] $1"
    echo -e "${RED}$message${NC}" >&2
    echo "$message" >> "$LOG_FILE"
}

success() {
    local message="[SUCCESS] $1"
    echo -e "${GREEN}$message${NC}"
    echo "$message" >> "$LOG_FILE"
}

warning() {
    local message="[WARNING] $1"
    echo -e "${YELLOW}$message${NC}"
    echo "$message" >> "$LOG_FILE"
}

# Ensure log directory exists
mkdir -p "$(dirname "$LOG_FILE")"
mkdir -p "$BACKUP_DIR"

# Check if MongoDB is accessible
check_mongodb_connection() {
    local uri=$1
    local db_name=$2
    
    log "Checking MongoDB connection for $db_name..."
    
    if mongosh "$uri" --eval "db.adminCommand('ping')" --quiet > /dev/null 2>&1; then
        success "MongoDB connection successful for $db_name"
        return 0
    else
        error "Failed to connect to MongoDB for $db_name"
        return 1
    fi
}

# Create pre-migration backup
create_backup() {
    local uri=$1
    local db_name=$2
    local backup_name=$3
    
    log "Creating pre-migration backup for $db_name..."
    
    local timestamp=$(date +%Y%m%d_%H%M%S)
    local backup_path="$BACKUP_DIR/${backup_name}_pre_migration_$timestamp"
    
    if mongodump --uri="$uri" --out="$backup_path" --quiet; then
        # Compress backup
        tar -czf "$backup_path.tar.gz" -C "$BACKUP_DIR" "$(basename "$backup_path")"
        rm -rf "$backup_path"
        
        success "Backup created: $backup_path.tar.gz"
        echo "$backup_path.tar.gz" > "$BACKUP_DIR/latest_${backup_name}_backup.txt"
        return 0
    else
        error "Failed to create backup for $db_name"
        return 1
    fi
}

# Restore from backup
restore_backup() {
    local uri=$1
    local db_name=$2
    local backup_name=$3
    
    local backup_file=""
    if [[ -f "$BACKUP_DIR/latest_${backup_name}_backup.txt" ]]; then
        backup_file=$(cat "$BACKUP_DIR/latest_${backup_name}_backup.txt")
    fi
    
    if [[ -z "$backup_file" || ! -f "$backup_file" ]]; then
        error "No backup file found for $db_name"
        return 1
    fi
    
    warning "Restoring $db_name from backup: $backup_file"
    
    # Extract backup
    local temp_dir=$(mktemp -d)
    tar -xzf "$backup_file" -C "$temp_dir"
    
    # Find the database directory
    local db_dir=$(find "$temp_dir" -type d -name "*" | head -1)
    
    if mongorestore --uri="$uri" --drop "$db_dir" --quiet; then
        success "Database $db_name restored from backup"
        rm -rf "$temp_dir"
        return 0
    else
        error "Failed to restore $db_name from backup"
        rm -rf "$temp_dir"
        return 1
    fi
}

# Run migrations for main HRMS database
migrate_main_database() {
    log "Starting migration for main HRMS database..."
    
    # Check connection
    if ! check_mongodb_connection "$MONGODB_URI" "HRMS"; then
        return 1
    fi
    
    # Create backup
    if ! create_backup "$MONGODB_URI" "HRMS" "hrms"; then
        return 1
    fi
    
    # Run migrations
    log "Running main database migrations..."
    cd /opt/hrms-production
    
    if npm run migrate; then
        success "Main database migrations completed successfully"
        return 0
    else
        error "Main database migrations failed"
        
        # Ask for rollback
        read -p "Do you want to restore from backup? (y/N): " -n 1 -r
        echo
        if [[ $REPLY =~ ^[Yy]$ ]]; then
            restore_backup "$MONGODB_URI" "HRMS" "hrms"
        fi
        return 1
    fi
}

# Run migrations for license server database
migrate_license_database() {
    log "Starting migration for license server database..."
    
    # Check connection
    if ! check_mongodb_connection "$LICENSE_MONGODB_URI" "License Server"; then
        return 1
    fi
    
    # Create backup
    if ! create_backup "$LICENSE_MONGODB_URI" "License Server" "licenses"; then
        return 1
    fi
    
    # Run migrations
    log "Running license server migrations..."
    cd /opt/hrms-production/hrsm-license-server
    
    if npm run migrate; then
        success "License server migrations completed successfully"
        return 0
    else
        error "License server migrations failed"
        
        # Ask for rollback
        read -p "Do you want to restore license database from backup? (y/N): " -n 1 -r
        echo
        if [[ $REPLY =~ ^[Yy]$ ]]; then
            restore_backup "$LICENSE_MONGODB_URI" "License Server" "licenses"
        fi
        return 1
    fi
}

# Verify migrations
verify_migrations() {
    log "Verifying migrations..."
    
    # Verify main database
    log "Verifying main database schema..."
    cd /opt/hrms-production
    if npm run migrate:verify; then
        success "Main database schema verification passed"
    else
        warning "Main database schema verification failed"
    fi
    
    # Verify license database
    log "Verifying license database schema..."
    cd /opt/hrms-production/hrsm-license-server
    if npm run migrate:verify; then
        success "License database schema verification passed"
    else
        warning "License database schema verification failed"
    fi
}

# Main migration function
run_migrations() {
    log "Starting database migrations for HR-SM Enterprise..."
    
    local main_success=false
    local license_success=false
    
    # Run main database migrations
    if migrate_main_database; then
        main_success=true
    fi
    
    # Run license database migrations
    if migrate_license_database; then
        license_success=true
    fi
    
    # Verify migrations
    verify_migrations
    
    # Summary
    if $main_success && $license_success; then
        success "All database migrations completed successfully!"
        return 0
    elif $main_success; then
        warning "Main database migrations succeeded, but license database migrations failed"
        return 1
    elif $license_success; then
        warning "License database migrations succeeded, but main database migrations failed"
        return 1
    else
        error "All database migrations failed"
        return 1
    fi
}

# Rollback function
rollback_migrations() {
    log "Starting migration rollback..."
    
    # Rollback main database
    log "Rolling back main database..."
    if restore_backup "$MONGODB_URI" "HRMS" "hrms"; then
        success "Main database rollback completed"
    else
        error "Main database rollback failed"
    fi
    
    # Rollback license database
    log "Rolling back license database..."
    if restore_backup "$LICENSE_MONGODB_URI" "License Server" "licenses"; then
        success "License database rollback completed"
    else
        error "License database rollback failed"
    fi
}

# Status function
show_status() {
    echo "=== Migration Status ==="
    
    # Check main database connection
    if check_mongodb_connection "$MONGODB_URI" "HRMS" > /dev/null 2>&1; then
        echo "✅ Main database: Connected"
    else
        echo "❌ Main database: Connection failed"
    fi
    
    # Check license database connection
    if check_mongodb_connection "$LICENSE_MONGODB_URI" "License Server" > /dev/null 2>&1; then
        echo "✅ License database: Connected"
    else
        echo "❌ License database: Connection failed"
    fi
    
    # Show recent backups
    echo ""
    echo "=== Recent Backups ==="
    if [[ -d "$BACKUP_DIR" ]]; then
        ls -la "$BACKUP_DIR"/*.tar.gz 2>/dev/null | tail -5 || echo "No backups found"
    else
        echo "Backup directory not found"
    fi
}

# Help function
show_help() {
    echo "HR-SM Database Migration Script"
    echo ""
    echo "Usage: $0 [COMMAND]"
    echo ""
    echo "Commands:"
    echo "  migrate   - Run migrations for both databases"
    echo "  rollback  - Rollback both databases to pre-migration state"
    echo "  status    - Show migration and database status"
    echo "  help      - Show this help message"
    echo ""
    echo "Environment Variables:"
    echo "  MONGODB_URI         - Main database connection string"
    echo "  LICENSE_MONGODB_URI - License database connection string"
    echo ""
    echo "Examples:"
    echo "  $0 migrate"
    echo "  $0 rollback"
    echo "  $0 status"
}

# Main script logic
main() {
    # Check required environment variables
    if [[ -z "$MONGODB_URI" ]]; then
        error "MONGODB_URI environment variable is required"
        exit 1
    fi
    
    if [[ -z "$LICENSE_MONGODB_URI" ]]; then
        error "LICENSE_MONGODB_URI environment variable is required"
        exit 1
    fi
    
    case "${1:-}" in
        migrate)
            run_migrations
            ;;
        rollback)
            rollback_migrations
            ;;
        status)
            show_status
            ;;
        help|--help|-h)
            show_help
            ;;
        *)
            error "Unknown command: ${1:-}"
            echo ""
            show_help
            exit 1
            ;;
    esac
}

# Run main function with all arguments
main "$@"