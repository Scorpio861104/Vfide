#!/bin/bash

# VFIDE WebSocket Server Quick Start Script

set -e

echo "🚀 Starting VFIDE WebSocket Server..."
echo ""

# Colors for output
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Check if we're in the websocket-server directory
if [ ! -f "package.json" ]; then
    echo "${YELLOW}⚠️  Not in websocket-server directory. Changing directory...${NC}"
    cd websocket-server
fi

# Check if .env file exists
if [ ! -f ".env" ]; then
    echo "${YELLOW}⚠️  No .env file found. Creating from .env.example...${NC}"
    cp .env.example .env
    echo "${BLUE}📝 Please edit .env file with your configuration${NC}"
    echo ""
fi

# Check if node_modules exists
if [ ! -d "node_modules" ]; then
    echo "${BLUE}📦 Installing dependencies...${NC}"
    npm install
    echo ""
fi

# Start the server
echo "${GREEN}✅ Starting WebSocket server...${NC}"
echo ""
npm run dev
