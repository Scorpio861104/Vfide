#!/bin/bash

# Stop VFIDE Testnet Services

set -e

echo "🛑 Stopping VFIDE Testnet Services"
echo "===================================="

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
BLUE='\033[0;34m'
NC='\033[0m'

print_status() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

print_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

# Stop frontend
if [ -f "frontend/.frontend.pid" ]; then
    FRONTEND_PID=$(cat frontend/.frontend.pid)
    if kill -0 $FRONTEND_PID 2>/dev/null; then
        print_status "Stopping frontend (PID: $FRONTEND_PID)..."
        kill $FRONTEND_PID
        rm frontend/.frontend.pid
        print_success "Frontend stopped"
    else
        print_status "Frontend not running"
        rm frontend/.frontend.pid
    fi
else
    print_status "Frontend PID file not found"
fi

# Stop WebSocket server
if [ -f "websocket-server/.ws.pid" ]; then
    WS_PID=$(cat websocket-server/.ws.pid)
    if kill -0 $WS_PID 2>/dev/null; then
        print_status "Stopping WebSocket server (PID: $WS_PID)..."
        kill $WS_PID
        rm websocket-server/.ws.pid
        print_success "WebSocket server stopped"
    else
        print_status "WebSocket server not running"
        rm websocket-server/.ws.pid
    fi
else
    print_status "WebSocket PID file not found"
fi

# Stop Docker services
print_status "Stopping Docker services..."
cd docker
docker-compose -f docker-compose.testnet.yml down
cd ..
print_success "Docker services stopped"

echo ""
print_success "All testnet services stopped"
