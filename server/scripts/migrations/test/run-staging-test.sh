#!/bin/bash

###############################################################################
# Staging Migration Test Runner
#
# This script executes the comprehensive staging migration test suite.
# It sets up the environment, runs all test phases, and generates reports.
#
# Usage:
#   ./run-staging-test.sh [options]
#
# Options:
#   --skip-pre-migration    Skip pre-migration validation tests
#   --skip-migration        Skip migration execution (use existing migration)
#   --skip-post-migration   Skip post-migration verification tests
#   --skip-functional       Skip functional tests
#   --skip-rollback         Skip rollback test
#   --help                  Display this help message
#
# Requirements: 2.1, 2.5, 2.6, 7.5, 12.1, 12.2, 12.3
###############################################################################

set -e  # Exit on error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

# Script directory
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/../../../.." && pwd)"

# Default options
SKIP_PRE_MIGRATION=false
SKIP_MIGRATION=false
SKIP_POST_MIGRATION=false
SKIP_FUNCTIONAL=false
SKIP_ROLLBACK=false

# Parse command line arguments
while [[ $# -gt 0 ]]; do
  case $1 in
    --skip-pre-migration)
      SKIP_PRE_MIGRATION=true
      shift
      ;;
    --skip-migration)
      SKIP_MIGRATION=true
      shift
      ;;
    --skip-post-migration)
      SKIP_POST_MIGRATION=true
      shift
      ;;
    --skip-functional)
      SKIP_FUNCTIONAL=true
      shift
      ;;
    --skip-rollback)
      SKIP_ROLLBACK=true
      shift
      ;;
    --help)
      echo "Usage: $0 [options]"
      echo ""
      echo "Options:"
      echo "  --skip-pre-migration    Skip pre-migration validation tests"
      echo "  --skip-migration        Skip migration execution"
      echo "  --skip-post-migration   Skip post-migration verification tests"
      echo "  --skip-functional       Skip functional tests"
      echo "  --skip-rollback         Skip rollback test"
      echo "  --help                  Display this help message"
      exit 0
      ;;
    *)
      echo -e "${RED}Unknown option: $1${NC}"
      echo "Use --help for usage information"
      exit 1
      ;;
  esac
done

# Display header
echo -e "${CYAN}"
echo "================================================================================"
echo "                    STAGING MIGRATION TEST SUITE"
echo "================================================================================"
echo -e "${NC}"

# Check if we're in the right directory
if [ ! -f "$PROJECT_ROOT/package.json" ]; then
  echo -e "${RED}Error: Could not find project root${NC}"
  echo "Please run this script from the project directory"
  exit 1
fi

# Check if Node.js is installed
if ! command -v node &> /dev/null; then
  echo -e "${RED}Error: Node.js is not installed${NC}"
  exit 1
fi

# Check if .env file exists
if [ ! -f "$PROJECT_ROOT/server/.env" ]; then
  echo -e "${RED}Error: .env file not found${NC}"
  echo "Please create server/.env with database configuration"
  exit 1
fi

# Display test configuration
echo -e "${BLUE}Test Configuration:${NC}"
echo "  Project Root: $PROJECT_ROOT"
echo "  Skip Pre-Migration: $SKIP_PRE_MIGRATION"
echo "  Skip Migration: $SKIP_MIGRATION"
echo "  Skip Post-Migration: $SKIP_POST_MIGRATION"
echo "  Skip Functional: $SKIP_FUNCTIONAL"
echo "  Skip Rollback: $SKIP_ROLLBACK"
echo ""

# Confirm execution
echo -e "${YELLOW}⚠️  WARNING: This will execute a full migration test in staging${NC}"
echo -e "${YELLOW}   This includes running the migration and testing rollback${NC}"
echo ""
read -p "Do you want to continue? (y/N): " -n 1 -r
echo ""

if [[ ! $REPLY =~ ^[Yy]$ ]]; then
  echo -e "${YELLOW}Test cancelled by user${NC}"
  exit 0
fi

# Change to project root
cd "$PROJECT_ROOT"

# Create logs directory if it doesn't exist
mkdir -p logs/migrations/staging-tests

# Run the test suite
echo -e "\n${CYAN}Starting test suite...${NC}\n"

# Execute the Node.js test script
node server/scripts/migrations/test/staging-migration-test.js

# Capture exit code
TEST_EXIT_CODE=$?

# Display results
echo ""
if [ $TEST_EXIT_CODE -eq 0 ]; then
  echo -e "${GREEN}✓ Test suite completed successfully${NC}"
else
  echo -e "${RED}✗ Test suite failed with exit code $TEST_EXIT_CODE${NC}"
fi

# Display report location
echo ""
echo -e "${BLUE}Test reports available in:${NC}"
echo "  logs/migrations/staging-tests/"
echo ""

exit $TEST_EXIT_CODE
