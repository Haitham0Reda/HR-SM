#!/bin/bash

# Modular HRMS Integration Script
# This script helps integrate the new modular system with your existing HRMS

set -e  # Exit on error

echo "╔═══════════════════════════════════════════════════════════╗"
echo "║                                                           ║"
echo "║   🚀 Modular HRMS Integration Script                     ║"
echo "║                                                           ║"
echo "╚═══════════════════════════════════════════════════════════╝"
echo ""

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Function to print colored output
print_success() {
    echo -e "${GREEN}✓${NC} $1"
}

print_error() {
    echo -e "${RED}✗${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}⚠${NC} $1"
}

print_info() {
    echo -e "${BLUE}ℹ${NC} $1"
}

# Check if .env file exists
if [ ! -f .env ]; then
    print_error ".env file not found!"
    echo "Please create a .env file based on .env.example"
    exit 1
fi

print_success ".env file found"

# Step 1: Backup current system
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "Step 1: Creating backup"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

# Check if git is initialized
if [ -d .git ]; then
    print_info "Creating backup branch..."
    git checkout -b backup-before-modular-$(date +%Y%m%d-%H%M%S) 2>/dev/null || true
    git add . 2>/dev/null || true
    git commit -m "Backup before modular HRMS integration" 2>/dev/null || true
    print_success "Backup branch created"
else
    print_warning "Git not initialized. Skipping git backup."
fi

# Step 2: Check Node.js and npm
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "Step 2: Checking prerequisites"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

if command -v node &> /dev/null; then
    NODE_VERSION=$(node -v)
    print_success "Node.js installed: $NODE_VERSION"
else
    print_error "Node.js not found. Please install Node.js 18+"
    exit 1
fi

if command -v npm &> /dev/null; then
    NPM_VERSION=$(npm -v)
    print_success "npm installed: $NPM_VERSION"
else
    print_error "npm not found"
    exit 1
fi

# Step 3: Install dependencies
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "Step 3: Installing dependencies"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

print_info "Installing server dependencies..."
npm install
print_success "Server dependencies installed"

# Step 4: Check MongoDB connection
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "Step 4: Checking MongoDB connection"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

# Try to connect to MongoDB
if command -v mongosh &> /dev/null; then
    print_info "Testing MongoDB connection..."
    # This will fail gracefully if MongoDB is not running
    mongosh --eval "db.version()" --quiet 2>/dev/null && print_success "MongoDB is running" || print_warning "MongoDB may not be running. Please start MongoDB before proceeding."
else
    print_warning "mongosh not found. Cannot verify MongoDB connection."
fi

# Step 5: Run database migrations
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "Step 5: Database migration"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

read -p "Do you want to add tenantId to existing data? (y/n) " -n 1 -r
echo
if [[ $REPLY =~ ^[Yy]$ ]]; then
    print_info "Running tenant ID migration..."
    node server/scripts/migrations/addTenantId.js
    print_success "Migration completed"
else
    print_warning "Skipping migration. You can run it later with: node server/scripts/migrations/addTenantId.js"
fi

# Step 6: Create initial tenant
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "Step 6: Tenant configuration"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

read -p "Do you want to create initial tenant configuration? (y/n) " -n 1 -r
echo
if [[ $REPLY =~ ^[Yy]$ ]]; then
    print_info "Creating tenant configuration..."
    node server/scripts/setup/createInitialTenant.js
    print_success "Tenant configuration created"
else
    print_warning "Skipping tenant creation. You can run it later with: node server/scripts/setup/createInitialTenant.js"
fi

# Step 7: Create upload directories
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "Step 7: Creating upload directories"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

mkdir -p uploads/task-reports
mkdir -p uploads/documents
mkdir -p uploads/profile-pictures
print_success "Upload directories created"

# Step 8: Integration choice
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "Step 8: Choose integration approach"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

echo ""
echo "Choose integration approach:"
echo "1) Side-by-side (Recommended) - Run both systems together"
echo "2) Full modular - Use only new modular system"
echo "3) Skip - I'll configure manually"
echo ""
read -p "Enter choice (1-3): " -n 1 -r
echo

case $REPLY in
    1)
        print_info "Setting up side-by-side integration..."
        if [ -f server/app.integrated.js ]; then
            # Backup existing files
            [ -f server/app.js ] && cp server/app.js server/app.backup.js
            # Use integrated version
            cp server/app.integrated.js server/app.js
            print_success "Side-by-side integration configured"
        else
            print_error "server/app.integrated.js not found"
        fi
        ;;
    2)
        print_info "Using full modular system..."
        print_success "Already configured (server/app.js)"
        ;;
    3)
        print_warning "Skipping integration configuration"
        ;;
    *)
        print_warning "Invalid choice. Skipping integration configuration"
        ;;
esac

# Step 9: Run tests
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "Step 9: Running tests"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

read -p "Do you want to run tests? (y/n) " -n 1 -r
echo
if [[ $REPLY =~ ^[Yy]$ ]]; then
    print_info "Running tests..."
    npm test || print_warning "Some tests failed. Please review."
else
    print_warning "Skipping tests. You can run them later with: npm test"
fi

# Final summary
echo ""
echo "╔═══════════════════════════════════════════════════════════╗"
echo "║                                                           ║"
echo "║   ✓ Integration Complete!                                ║"
echo "║                                                           ║"
echo "╚═══════════════════════════════════════════════════════════╝"
echo ""
echo "Next steps:"
echo ""
echo "1. Start the server:"
echo "   npm start"
echo ""
echo "2. Test the health endpoint:"
echo "   curl http://localhost:5000/health"
echo ""
echo "3. Review the documentation:"
echo "   - MIGRATION_GUIDE.md"
echo "   - API_DOCUMENTATION.md"
echo "   - QUICK_START.md"
echo ""
echo "4. Access the new modular API:"
echo "   - Auth: http://localhost:5000/api/v1/hr-core/auth"
echo "   - Tasks: http://localhost:5000/api/v1/tasks"
echo ""
echo "For help, see MIGRATION_GUIDE.md"
echo ""
