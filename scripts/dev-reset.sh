#!/bin/bash

# VFIDE Development Reset Script
# Complete reset: clean + reinstall dependencies

set -e

echo "🔄 Resetting VFIDE development environment..."

# Colors for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Run clean script first
echo -e "${BLUE}Step 1: Cleaning build artifacts...${NC}"
bash scripts/dev-clean.sh

# Remove node_modules
echo ""
echo -e "${YELLOW}Step 2: Removing node_modules...${NC}"

cd frontend
rm -rf node_modules
rm -rf package-lock.json
echo -e "${GREEN}✓ Frontend node_modules removed${NC}"

cd ../websocket-server 2>/dev/null || true
if [ -d "../websocket-server" ]; then
  rm -rf node_modules
  rm -rf package-lock.json
  echo -e "${GREEN}✓ WebSocket server node_modules removed${NC}"
fi

cd ..

# Reinstall dependencies
echo ""
echo -e "${YELLOW}Step 3: Reinstalling dependencies...${NC}"

echo -e "${BLUE}Installing frontend dependencies...${NC}"
cd frontend
npm install
echo -e "${GREEN}✓ Frontend dependencies installed${NC}"

cd ..

if [ -d "websocket-server" ]; then
  echo -e "${BLUE}Installing WebSocket server dependencies...${NC}"
  cd websocket-server
  npm install
  echo -e "${GREEN}✓ WebSocket server dependencies installed${NC}"
  cd ..
fi

# Rebuild contracts
echo ""
echo -e "${YELLOW}Step 4: Rebuilding smart contracts...${NC}"
forge build 2>/dev/null || echo -e "${YELLOW}⚠ Foundry not found, skipping contract build${NC}"

echo ""
echo -e "${GREEN}✅ Development environment reset complete!${NC}"
echo ""
echo "Next steps:"
echo "  1. Update .env files if needed"
echo "  2. Run 'npm run dev' in frontend/"
echo "  3. Run 'npm run dev' in websocket-server/ (optional)"
