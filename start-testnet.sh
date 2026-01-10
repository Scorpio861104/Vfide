#!/bin/bash

# Quick Start Script - Launches testnet with minimal questions

set -e

clear

cat << "EOF"
 __     _______ ___ ____  _____   _____         _             _   
 \ \   / /  ___|_ _|  _ \| ____| |_   _|__  ___| |_ _ __   ___| |_ 
  \ \ / /| |_   | || | | |  _|     | |/ _ \/ __| __| '_ \ / _ \ __|
   \ V / |  _|  | || |_| | |___    | |  __/\__ \ |_| | | |  __/ |_ 
    \_/  |_|   |___|____/|_____|   |_|\___||___/\__|_| |_|\___|\__|
                                                                    
EOF

echo ""
echo "🚀 Welcome to VFIDE Testnet Quick Start!"
echo ""
echo "This script will deploy a fully functional testnet ecosystem that"
echo "operates just like mainnet with all features enabled."
echo ""

# Check if running for first time
if [ ! -f ".testnet-initialized" ]; then
    echo "📋 First-time setup detected. This will:"
    echo "   ✓ Install dependencies"
    echo "   ✓ Setup PostgreSQL database"
    echo "   ✓ Configure environment"
    echo "   ✓ Deploy WebSocket server"
    echo "   ✓ Launch frontend"
    echo ""
    read -p "Continue? (y/n) " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        echo "Cancelled."
        exit 0
    fi
    
    # Run full deployment
    ./scripts/deploy-testnet.sh
    
    # Mark as initialized
    touch .testnet-initialized
else
    echo "♻️  Testnet already initialized. Starting services..."
    echo ""
    
    # Quick start - just launch services
    cd docker
    docker-compose -f docker-compose.testnet.yml up -d postgres redis
    cd ..
    
    sleep 5
    
    # Start WebSocket in background
    cd websocket-server
    if [ -f ".env" ]; then
        npm start > ../logs/websocket.log 2>&1 &
        echo $! > .ws.pid
    else
        echo "⚠️  WebSocket .env not found, copying from .env.testnet"
        cp .env.testnet .env
        npm start > ../logs/websocket.log 2>&1 &
        echo $! > .ws.pid
    fi
    cd ..
    
    # Start Frontend in background
    cd frontend
    if [ -f ".env.local" ]; then
        npm run dev > ../logs/frontend.log 2>&1 &
        echo $! > .frontend.pid
    else
        echo "⚠️  Frontend .env.local not found, copying from .env.testnet"
        cp .env.testnet .env.local
        npm run dev > ../logs/frontend.log 2>&1 &
        echo $! > .frontend.pid
    fi
    cd ..
    
    echo ""
    echo "✅ Services started!"
fi

echo ""
echo "═══════════════════════════════════════════════════════════"
echo "  🎉 VFIDE Testnet is Ready!"
echo "═══════════════════════════════════════════════════════════"
echo ""
echo "  🌐 Frontend:   http://localhost:3000"
echo "  🔌 WebSocket:  http://localhost:8080"
echo "  🗄️  Database:   postgresql://postgres:postgres@localhost:5432/vfide_testnet"
echo ""
echo "  Network:      Base Sepolia (Chain ID: 84532)"
echo "  Get ETH:      https://www.coinbase.com/faucets/base-sepolia-faucet"
echo ""
echo "═══════════════════════════════════════════════════════════"
echo ""
echo "Commands:"
echo "  • Verify health:    ./scripts/verify-testnet.sh"
echo "  • View logs:        tail -f logs/*.log"
echo "  • Stop services:    ./scripts/stop-testnet.sh"
echo ""
echo "Press Ctrl+C to return to terminal (services will continue running)"
echo ""

# Keep script running to show it's active
tail -f /dev/null
