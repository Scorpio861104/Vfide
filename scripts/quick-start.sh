#!/bin/bash

# VFIDE Quick Start Setup Script
# Automated setup for local development

set -e

echo "🚀 VFIDE Quick Start Setup"
echo "=========================="
echo ""

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
RED='\033[0;31m'
NC='\033[0m'

# Function to check if command exists
command_exists() {
  command -v "$1" >/dev/null 2>&1
}

# Function to print step
step() {
  echo ""
  echo -e "${BLUE}▸ $1${NC}"
}

# Function to print success
success() {
  echo -e "${GREEN}✓ $1${NC}"
}

# Function to print warning
warn() {
  echo -e "${YELLOW}⚠ $1${NC}"
}

# Function to print error
error() {
  echo -e "${RED}✗ $1${NC}"
}

# Check prerequisites
step "Checking prerequisites..."

MISSING_PREREQS=0

if ! command_exists node; then
  error "Node.js is not installed"
  echo "  Install from: https://nodejs.org/"
  MISSING_PREREQS=1
else
  NODE_VERSION=$(node --version)
  success "Node.js $NODE_VERSION"
fi

if ! command_exists npm; then
  error "npm is not installed"
  MISSING_PREREQS=1
else
  NPM_VERSION=$(npm --version)
  success "npm $NPM_VERSION"
fi

if ! command_exists git; then
  error "Git is not installed"
  echo "  Install from: https://git-scm.com/"
  MISSING_PREREQS=1
else
  GIT_VERSION=$(git --version)
  success "Git installed"
fi

if command_exists forge; then
  success "Foundry installed"
else
  warn "Foundry not installed (optional for contract development)"
  echo "  Install: curl -L https://foundry.paradigm.xyz | bash"
fi

if [ $MISSING_PREREQS -eq 1 ]; then
  error "Missing required prerequisites. Please install them and try again."
  exit 1
fi

# Install frontend dependencies
step "Installing frontend dependencies..."
cd frontend
if npm install; then
  success "Frontend dependencies installed"
else
  error "Failed to install frontend dependencies"
  exit 1
fi

# Install WebSocket server dependencies (if exists)
if [ -d "../websocket-server" ]; then
  step "Installing WebSocket server dependencies..."
  cd ../websocket-server
  if npm install; then
    success "WebSocket server dependencies installed"
  else
    warn "Failed to install WebSocket server dependencies"
  fi
  cd ..
else
  cd ..
fi

# Setup environment files
step "Setting up environment files..."

# Frontend .env.local
if [ ! -f "frontend/.env.local" ]; then
  if [ -f "frontend/.env.example" ]; then
    cp frontend/.env.example frontend/.env.local
    success "Created frontend/.env.local from .env.example"
    echo ""
    echo -e "${YELLOW}⚠ IMPORTANT: Edit frontend/.env.local with your configuration:${NC}"
    echo "  - NEXT_PUBLIC_CHAIN_ID (e.g., 84532 for Base Sepolia)"
    echo "  - NEXT_PUBLIC_CONTRACT_ADDRESS (your deployed contract)"
    echo "  - NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID (from cloud.walletconnect.com)"
    echo ""
  else
    warn "frontend/.env.example not found"
  fi
else
  success "frontend/.env.local already exists"
fi

# WebSocket server .env
if [ -d "websocket-server" ] && [ ! -f "websocket-server/.env" ]; then
  if [ -f "websocket-server/.env.example" ]; then
    cp websocket-server/.env.example websocket-server/.env
    success "Created websocket-server/.env from .env.example"
    echo ""
    echo -e "${YELLOW}⚠ IMPORTANT: Edit websocket-server/.env with your configuration:${NC}"
    echo "  - JWT_SECRET (random secure string)"
    echo "  - ETHEREUM_RPC_URL (your RPC endpoint)"
    echo ""
  fi
else
  if [ -d "websocket-server" ]; then
    success "websocket-server/.env already exists"
  fi
fi

# Validate environment
step "Validating environment configuration..."
if npm run validate:env 2>/dev/null; then
  success "Environment configuration valid"
else
  warn "Environment validation failed - please check your .env files"
  echo "  Run 'npm run validate:env' for detailed error messages"
fi

# Build contracts (if Foundry is available)
if command_exists forge; then
  step "Building smart contracts..."
  if forge build 2>/dev/null; then
    success "Smart contracts compiled"
  else
    warn "Failed to compile contracts (this is OK if you're only working on frontend)"
  fi
fi

# Run tests to verify setup
step "Running quick test suite..."
cd frontend
if npm run test -- --passWithNoTests --bail 2>/dev/null; then
  success "Test suite passed"
else
  warn "Some tests failed - this might be OK for initial setup"
fi
cd ..

# Summary
echo ""
echo -e "${BLUE}════════════════════════════════════════${NC}"
echo -e "${GREEN}✅ Setup Complete!${NC}"
echo -e "${BLUE}════════════════════════════════════════${NC}"
echo ""
echo "Next steps:"
echo ""
echo "1. Configure environment variables:"
echo "   ${BLUE}vim frontend/.env.local${NC}"
echo ""
echo "2. Start local blockchain (for development):"
echo "   ${BLUE}anvil${NC}"
echo "   See LOCAL-BLOCKCHAIN-SETUP.md for details"
echo ""
echo "3. Deploy contracts (if needed):"
echo "   ${BLUE}forge script script/DeployLocal.s.sol --rpc-url http://localhost:8545 --broadcast${NC}"
echo ""
echo "4. Start development server:"
echo "   ${BLUE}cd frontend && npm run dev${NC}"
echo ""
echo "5. (Optional) Start WebSocket server:"
echo "   ${BLUE}cd websocket-server && npm run dev${NC}"
echo ""
echo "6. Open browser:"
echo "   ${BLUE}http://localhost:3000${NC}"
echo ""
echo "Documentation:"
echo "  • Quick Start: ${BLUE}README.md${NC}"
echo "  • Developer Guide: ${BLUE}DEVELOPER-GUIDE.md${NC}"
echo "  • Local Blockchain: ${BLUE}LOCAL-BLOCKCHAIN-SETUP.md${NC}"
echo "  • Testing: ${BLUE}TESTING.md${NC}"
echo ""
echo "Happy coding! 🎉"
