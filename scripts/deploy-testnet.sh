#!/bin/bash

# VFIDE Testnet Deployment Script
# This script deploys the full VFIDE testnet stack

set -e

echo "🚀 VFIDE Testnet Deployment"
echo "================================"
echo ""

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Helper functions
print_status() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

print_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

continue    echo -e "${RED}[ERROR]${NC} $1"
}

# Check prerequisites
check_prerequisites() {
    print_status "Checking prerequisites..."
    
    command -v docker >/dev/null 2>&1 || {
        print_error "Docker is not installed. Please install Docker first."
        exit 1
    }
    
    command -v docker-compose >/dev/null 2>&1 || {
        print_error "Docker Compose is not installed. Please install Docker Compose first."
        exit 1
    }
    
    command -v node >/dev/null 2>&1 || {
        print_error "Node.js is not installed. Please install Node.js first."
        exit 1
    }
    
    command -v npm >/dev/null 2>&1 || {
        print_error "npm is not installed. Please install npm first."
        exit 1
    }
    
    print_success "All prerequisites are installed"
}

# Setup environment files
setup_environment() {
    print_status "Setting up environment files..."
    
    # Frontend
    if [ ! -f "frontend/.env.testnet" ]; then
        print_error "frontend/.env.testnet not found!"
        exit 1
    fi
    
    if [ ! -f "frontend/.env.local" ]; then
        cp frontend/.env.testnet frontend/.env.local
        print_success "Created frontend/.env.local from .env.testnet"
    fi
    
    # WebSocket Server
    if [ ! -f "websocket-server/.env.testnet" ]; then
        print_error "websocket-server/.env.testnet not found!"
        exit 1
    fi
    
    if [ ! -f "websocket-server/.env" ]; then
        cp websocket-server/.env.testnet websocket-server/.env
        print_success "Created websocket-server/.env from .env.testnet"
    fi
    
    print_success "Environment files configured"
}

# Install dependencies
install_dependencies() {
    print_status "Installing dependencies..."
    
    # Frontend
    print_status "Installing frontend dependencies..."
    cd frontend
    npm install
    cd ..
    
    # WebSocket Server
    print_status "Installing WebSocket server dependencies..."
    cd websocket-server
    npm install
    cd ..
    
    print_success "Dependencies installed"
}

# Build services
build_services() {
    print_status "Building services..."
    
    # Build WebSocket server
    print_status "Building WebSocket server..."
    cd websocket-server
    npm run build
    cd ..
    
    # Build frontend
    print_status "Building frontend..."
    cd frontend
    npm run build
    cd ..
    
    print_success "Services built successfully"
}

# Start Docker services
start_docker_services() {
    print_status "Starting Docker services..."
    
    cd docker
    docker-compose -f docker-compose.testnet.yml up -d postgres redis
    
    # Wait for database to be ready
    print_status "Waiting for database to be ready..."
    sleep 10
    
    # Check database health
    docker-compose -f docker-compose.testnet.yml exec -T postgres pg_isready -U postgres || {
        print_error "Database failed to start"
        exit 1
    }
    
    print_success "Docker services started"
    cd ..
}

# Run database migrations
run_migrations() {
    print_status "Running database migrations..."
    
    # The schema.sql is automatically loaded by docker-compose init script
    print_success "Database schema initialized"
    
    # Load seed data for demo purposes
    print_status "Loading demo seed data..."
    cd docker
    if docker-compose -f docker-compose.testnet.yml exec -T postgres psql -U postgres -d vfide_testnet < ../database/seed-data.sql > /dev/null 2>&1; then
        print_success "Demo data loaded (15 users, 4 proposals, messages, badges, etc.)"
    else
        print_warning "Seed data failed to load (may already exist)"
    fi
    cd ..
}

# Start WebSocket server
start_websocket() {
    print_status "Starting WebSocket server..."
    
    cd websocket-server
    npm start &
    WS_PID=$!
    echo $WS_PID > .ws.pid
    cd ..
    
    # Wait for WebSocket to be ready
    sleep 5
    
    print_success "WebSocket server started (PID: $WS_PID)"
}

# Start frontend
start_frontend() {
    print_status "Starting frontend..."
    
    cd frontend
    npm run dev &
    FRONTEND_PID=$!
    echo $FRONTEND_PID > .frontend.pid
    cd ..
    
    # Wait for frontend to be ready
    sleep 5
    
    print_success "Frontend started (PID: $FRONTEND_PID)"
}

# Verify deployment
verify_deployment() {
    print_status "Verifying deployment..."
    
    # Check PostgreSQL
    if docker ps | grep -q vfide-postgres; then
        print_success "✓ PostgreSQL is running"
    else
        print_error "✗ PostgreSQL is not running"
    fi
    
    # Check Redis
    if docker ps | grep -q vfide-redis; then
        print_success "✓ Redis is running"
    else
        print_warning "✗ Redis is not running (optional)"
    fi
    
    # Check WebSocket
    if lsof -i :8080 > /dev/null 2>&1; then
        print_success "✓ WebSocket server is running on port 8080"
    else
        print_error "✗ WebSocket server is not running"
    fi
    
    # Check Frontend
    if lsof -i :3000 > /dev/null 2>&1; then
        print_success "✓ Frontend is running on port 3000"
    else
        print_error "✗ Frontend is not running"
    fi
}

# Main deployment flow
main() {
    echo ""
    check_prerequisites
    echo ""
    setup_environment
    echo ""
    install_dependencies
    echo ""
    build_services
    echo ""
    start_docker_services
    echo ""
    run_migrations
    echo ""
    start_websocket
    echo ""
    start_frontend
    echo ""
    verify_deployment
    echo ""
    
    print_success "======================================"
    print_success "🎉 VFIDE Testnet Deployment Complete!"
    print_success "======================================"
    echo ""
    echo -e "${GREEN}Access your testnet:${NC}"
    echo -e "  ${BLUE}Frontend:${NC}        http://localhost:3000"
    echo -e "  ${BLUE}WebSocket:${NC}       http://localhost:8080"
    echo -e "  ${BLUE}Database:${NC}        postgresql://postgres:postgres@localhost:5432/vfide_testnet"
    echo -e "  ${BLUE}Redis:${NC}           redis://localhost:6379"
    echo ""
    echo -e "${YELLOW}Blockchain Info:${NC}"
    echo -e "  ${BLUE}Network:${NC}         Base Sepolia Testnet"
    echo -e "  ${BLUE}Chain ID:${NC}        84532"
    echo -e "  ${BLUE}RPC URL:${NC}         https://sepolia.base.org"
    echo -e "  ${BLUE}Explorer:${NC}        https://sepolia.basescan.org"
    echo ""
    echo -e "${YELLOW}Smart Contracts:${NC}"
    echo -e "  ${BLUE}Token:${NC}           0xf57992ab9F8887650C2a220A34fe86ebD00c02f5"
    echo -e "  ${BLUE}DAO:${NC}             0xA462F4C2825f48545a9217FD65B7eB621ea8b507"
    echo -e "  ${BLUE}Commerce:${NC}        0x7637455897FabeE627ba56D10965A73ad7FddadC"
    echo ""
    echo -e "${GREEN}To stop all services:${NC}"
    echo -e "  ./scripts/stop-testnet.sh"
    echo ""
}

# Run main function
main
