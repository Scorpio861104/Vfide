#!/bin/bash

# VFIDE Development Clean Script
# Cleans all build artifacts and caches for a fresh start

set -e

echo "🧹 Cleaning VFIDE development environment..."

# Colors for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Frontend cleanup
echo -e "${YELLOW}Cleaning frontend build artifacts...${NC}"
cd frontend 2>/dev/null || { echo "Frontend directory not found"; exit 1; }

# Remove build outputs
rm -rf .next
rm -rf out
rm -rf dist
rm -rf build

# Remove caches
rm -rf .turbo
rm -rf .eslintcache
rm -rf .tsbuildinfo
rm -rf node_modules/.cache

# Remove test outputs
rm -rf coverage
rm -rf .nyc_output
rm -rf playwright-report
rm -rf test-results

echo -e "${GREEN}✓ Frontend cleaned${NC}"

# WebSocket server cleanup
echo -e "${YELLOW}Cleaning WebSocket server...${NC}"
cd ../websocket-server 2>/dev/null || echo "WebSocket server not found, skipping..."

if [ -d "../websocket-server" ]; then
  rm -rf dist
  rm -rf build
  rm -rf node_modules/.cache
  echo -e "${GREEN}✓ WebSocket server cleaned${NC}"
fi

cd ..

# Contract artifacts cleanup
echo -e "${YELLOW}Cleaning contract artifacts...${NC}"
rm -rf out
rm -rf cache
rm -rf broadcast
rm -rf deployments/localhost

echo -e "${GREEN}✓ Contract artifacts cleaned${NC}"

# Temporary files
echo -e "${YELLOW}Cleaning temporary files...${NC}"
find . -name "*.log" -type f -delete 2>/dev/null || true
find . -name ".DS_Store" -type f -delete 2>/dev/null || true
find . -name "*.swp" -type f -delete 2>/dev/null || true
find . -name "*.swo" -type f -delete 2>/dev/null || true

echo -e "${GREEN}✓ Temporary files cleaned${NC}"

echo ""
echo -e "${GREEN}✅ Development environment cleaned successfully!${NC}"
echo ""
echo "To reinstall dependencies, run:"
echo "  npm run dev:reset"
