#!/bin/bash

# HR-SM Docker Deployment Verification Script
# This script verifies that all services are running and healthy

set -e

echo "=========================================="
echo "HR-SM Docker Deployment Verification"
echo "=========================================="
echo ""

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Check if docker-compose is available
if ! command -v docker-compose &> /dev/null; then
    echo -e "${RED}✗ docker-compose not found${NC}"
    exit 1
fi

echo -e "${GREEN}✓ docker-compose found${NC}"
echo ""

# Check if services are running
echo "Checking service status..."
echo ""

SERVICES=("postgres" "redis" "license-server" "api-server" "hr-app" "platform-admin" "nginx-proxy")
ALL_HEALTHY=true

for service in "${SERVICES[@]}"; do
    echo -n "Checking $service... "
    
    # Check if container is running
    if docker-compose -f docker-compose.production.yml ps | grep -q "$service.*Up"; then
        # Check health status
        HEALTH=$(docker inspect --format='{{.State.Health.Status}}' "hrms-$service" 2>/dev/null || echo "no-healthcheck")
        
        if [ "$HEALTH" = "healthy" ]; then
            echo -e "${GREEN}✓ Running and Healthy${NC}"
        elif [ "$HEALTH" = "no-healthcheck" ]; then
            echo -e "${YELLOW}⚠ Running (no health check)${NC}"
        elif [ "$HEALTH" = "starting" ]; then
            echo -e "${YELLOW}⚠ Starting...${NC}"
            ALL_HEALTHY=false
        else
            echo -e "${RED}✗ Unhealthy${NC}"
            ALL_HEALTHY=false
        fi
    else
        echo -e "${RED}✗ Not Running${NC}"
        ALL_HEALTHY=false
    fi
done

echo ""

# Check volumes
echo "Checking volumes..."
VOLUMES=("pgdata" "redisdata" "license_keys" "license_logs" "hrms_uploads" "hrms_logs" "hrms_backups" "nginx_logs")

for volume in "${VOLUMES[@]}"; do
    if docker volume ls | grep -q "hr-sm_$volume"; then
        echo -e "${GREEN}✓ Volume $volume exists${NC}"
    else
        echo -e "${RED}✗ Volume $volume missing${NC}"
        ALL_HEALTHY=false
    fi
done

echo ""

# Check network
echo "Checking network..."
if docker network ls | grep -q "hr-sm_hrms-network"; then
    echo -e "${GREEN}✓ Network hrms-network exists${NC}"
else
    echo -e "${RED}✗ Network hrms-network missing${NC}"
    ALL_HEALTHY=false
fi

echo ""

# Test health endpoints
echo "Testing health endpoints..."

# Wait for services to be ready
echo "Waiting for services to be ready (max 2 minutes)..."
TIMEOUT=120
ELAPSED=0

while [ $ELAPSED -lt $TIMEOUT ]; do
    READY=true
    
    for service in "${SERVICES[@]}"; do
        HEALTH=$(docker inspect --format='{{.State.Health.Status}}' "hrms-$service" 2>/dev/null || echo "no-healthcheck")
        if [ "$HEALTH" != "healthy" ] && [ "$HEALTH" != "no-healthcheck" ]; then
            READY=false
            break
        fi
    done
    
    if [ "$READY" = true ]; then
        echo -e "${GREEN}✓ All services ready${NC}"
        break
    fi
    
    sleep 5
    ELAPSED=$((ELAPSED + 5))
    echo -n "."
done

echo ""

if [ $ELAPSED -ge $TIMEOUT ]; then
    echo -e "${RED}✗ Timeout waiting for services to be ready${NC}"
    ALL_HEALTHY=false
fi

# Test API endpoints (if nginx-proxy is running)
if docker-compose -f docker-compose.production.yml ps | grep -q "nginx-proxy.*Up"; then
    echo ""
    echo "Testing API endpoints..."
    
    # Test health endpoint
    if curl -f -s http://localhost/health > /dev/null 2>&1; then
        echo -e "${GREEN}✓ Nginx proxy health check passed${NC}"
    else
        echo -e "${RED}✗ Nginx proxy health check failed${NC}"
        ALL_HEALTHY=false
    fi
fi

echo ""
echo "=========================================="

if [ "$ALL_HEALTHY" = true ]; then
    echo -e "${GREEN}✓ All checks passed!${NC}"
    echo ""
    echo "Your HR-SM deployment is ready."
    echo ""
    echo "Access points:"
    echo "  - HR App: https://your-domain.com"
    echo "  - Platform Admin: https://admin.your-domain.com"
    echo "  - API: https://your-domain.com/api"
    echo ""
    exit 0
else
    echo -e "${RED}✗ Some checks failed${NC}"
    echo ""
    echo "Please review the errors above and check logs:"
    echo "  docker-compose -f docker-compose.production.yml logs"
    echo ""
    exit 1
fi
