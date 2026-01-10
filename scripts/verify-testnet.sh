#!/bin/bash

# VFIDE Testnet Health Check & Verification Script

set -e

echo "🔍 VFIDE Testnet Health Check"
echo "=============================="
echo ""

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

PASS=0
FAIL=0
WARN=0

check_service() {
    local name=$1
    local test_cmd=$2
    
    if eval $test_cmd > /dev/null 2>&1; then
        echo -e "${GREEN}✓${NC} $name is healthy"
        ((PASS++))
        return 0
    else
        echo -e "${RED}✗${NC} $name is not responding"
        ((FAIL++))
        return 1
    fi
}

check_optional_service() {
    local name=$1
    local test_cmd=$2
    
    if eval $test_cmd > /dev/null 2>&1; then
        echo -e "${GREEN}✓${NC} $name is running (optional)"
        ((PASS++))
        return 0
    else
        echo -e "${YELLOW}⚠${NC} $name is not running (optional)"
        ((WARN++))
        return 1
    fi
}

echo "Checking infrastructure..."
echo ""

# Check PostgreSQL
check_service "PostgreSQL Database" "docker exec vfide-postgres pg_isready -U postgres"

# Check Redis (optional)
check_optional_service "Redis Cache" "docker exec vfide-redis redis-cli ping"

# Check WebSocket Server
check_service "WebSocket Server" "curl -s http://localhost:8080/health"

# Check Frontend
check_service "Frontend Application" "curl -s http://localhost:3000"

echo ""
echo "Checking blockchain connectivity..."
echo ""

# Check Base Sepolia RPC
check_service "Base Sepolia RPC" "curl -s -X POST -H 'Content-Type: application/json' --data '{\"jsonrpc\":\"2.0\",\"method\":\"eth_chainId\",\"params\":[],\"id\":1}' https://sepolia.base.org"

echo ""
echo "Checking database schema..."
echo ""

# Check if tables exist
TABLES_EXIST=$(docker exec vfide-postgres psql -U postgres -d vfide_testnet -t -c "SELECT COUNT(*) FROM information_schema.tables WHERE table_schema = 'public';" | xargs)

if [ "$TABLES_EXIST" -gt 0 ]; then
    echo -e "${GREEN}✓${NC} Database schema initialized ($TABLES_EXIST tables)"
    ((PASS++))
else
    echo -e "${RED}✗${NC} Database schema not initialized"
    ((FAIL++))
fi

# List key tables
echo ""
echo "Database tables:"
docker exec vfide-postgres psql -U postgres -d vfide_testnet -c "\dt" 2>/dev/null | head -n 20 || echo "Could not list tables"

echo ""
echo "Checking environment configuration..."
echo ""

# Check frontend env
if [ -f "frontend/.env.local" ]; then
    echo -e "${GREEN}✓${NC} Frontend environment configured"
    ((PASS++))
else
    echo -e "${RED}✗${NC} Frontend environment not configured"
    ((FAIL++))
fi

# Check WebSocket env
if [ -f "websocket-server/.env" ]; then
    echo -e "${GREEN}✓${NC} WebSocket environment configured"
    ((PASS++))
else
    echo -e "${RED}✗${NC} WebSocket environment not configured"
    ((FAIL++))
fi

echo ""
echo "Checking smart contract deployments..."
echo ""

# Verify contract addresses are set
TOKEN_ADDRESS=$(grep "NEXT_PUBLIC_TOKEN_ADDRESS" frontend/.env.local 2>/dev/null | cut -d'=' -f2)
DAO_ADDRESS=$(grep "NEXT_PUBLIC_DAO_ADDRESS" frontend/.env.local 2>/dev/null | cut -d'=' -f2)

if [ -n "$TOKEN_ADDRESS" ] && [ "$TOKEN_ADDRESS" != "0x0000000000000000000000000000000000000000" ]; then
    echo -e "${GREEN}✓${NC} Token contract configured: $TOKEN_ADDRESS"
    ((PASS++))
else
    echo -e "${RED}✗${NC} Token contract not configured"
    ((FAIL++))
fi

if [ -n "$DAO_ADDRESS" ] && [ "$DAO_ADDRESS" != "0x0000000000000000000000000000000000000000" ]; then
    echo -e "${GREEN}✓${NC} DAO contract configured: $DAO_ADDRESS"
    ((PASS++))
else
    echo -e "${RED}✗${NC} DAO contract not configured"
    ((FAIL++))
fi

echo ""
echo "=============================="
echo "Health Check Summary"
echo "=============================="
echo -e "${GREEN}Passed:${NC}  $PASS"
echo -e "${YELLOW}Warnings:${NC} $WARN"
echo -e "${RED}Failed:${NC}  $FAIL"
echo ""

if [ $FAIL -eq 0 ]; then
    echo -e "${GREEN}✓ All critical services are healthy!${NC}"
    echo ""
    echo "Your testnet is ready to use at:"
    echo -e "  ${BLUE}http://localhost:3000${NC}"
    echo ""
    exit 0
else
    echo -e "${RED}✗ Some critical services are not healthy${NC}"
    echo ""
    echo "Please check the logs:"
    echo "  docker-compose -f docker/docker-compose.testnet.yml logs"
    echo ""
    exit 1
fi
