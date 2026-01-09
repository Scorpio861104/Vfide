#!/bin/bash

# VFIDE Environment Validation Script
# Validates that all required environment variables are set

set -e

echo "🔐 Validating VFIDE environment configuration..."

# Colors for output
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

ERRORS=0
WARNINGS=0

# Function to check required variable
check_required() {
  local var_name=$1
  local var_value=$2
  local description=$3
  
  if [ -z "$var_value" ]; then
    echo -e "${RED}✗ Missing required: ${var_name}${NC}"
    echo -e "  ${description}"
    ERRORS=$((ERRORS + 1))
  else
    echo -e "${GREEN}✓ ${var_name}${NC}"
  fi
}

# Function to check optional variable
check_optional() {
  local var_name=$1
  local var_value=$2
  local description=$3
  
  if [ -z "$var_value" ]; then
    echo -e "${YELLOW}⚠ Optional not set: ${var_name}${NC}"
    echo -e "  ${description}"
    WARNINGS=$((WARNINGS + 1))
  else
    echo -e "${GREEN}✓ ${var_name}${NC}"
  fi
}

# Function to validate URL format
validate_url() {
  local url=$1
  if [[ $url =~ ^https?:// ]] || [[ $url =~ ^wss?:// ]]; then
    return 0
  else
    return 1
  fi
}

# Check if .env.local exists
echo ""
echo -e "${BLUE}Checking frontend/.env.local...${NC}"
if [ ! -f "frontend/.env.local" ]; then
  echo -e "${RED}✗ frontend/.env.local not found${NC}"
  echo -e "  Copy frontend/.env.example to frontend/.env.local and configure it"
  exit 1
fi

# Load environment variables
export $(grep -v '^#' frontend/.env.local | xargs)

echo ""
echo -e "${BLUE}════════════════════════════════════════${NC}"
echo -e "${BLUE}Required Variables${NC}"
echo -e "${BLUE}════════════════════════════════════════${NC}"

check_required "NEXT_PUBLIC_CHAIN_ID" "$NEXT_PUBLIC_CHAIN_ID" "Blockchain network ID (e.g., 84532 for Base Sepolia)"
check_required "NEXT_PUBLIC_CONTRACT_ADDRESS" "$NEXT_PUBLIC_CONTRACT_ADDRESS" "Deployed contract address"
check_required "NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID" "$NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID" "WalletConnect project ID from cloud.walletconnect.com"

# Validate contract address format
if [ -n "$NEXT_PUBLIC_CONTRACT_ADDRESS" ]; then
  if [[ ! $NEXT_PUBLIC_CONTRACT_ADDRESS =~ ^0x[a-fA-F0-9]{40}$ ]]; then
    echo -e "${RED}  ✗ Invalid contract address format (should be 0x... with 40 hex chars)${NC}"
    ERRORS=$((ERRORS + 1))
  fi
fi

echo ""
echo -e "${BLUE}════════════════════════════════════════${NC}"
echo -e "${BLUE}Optional Variables${NC}"
echo -e "${BLUE}════════════════════════════════════════${NC}"

check_optional "NEXT_PUBLIC_WEBSOCKET_URL" "$NEXT_PUBLIC_WEBSOCKET_URL" "WebSocket server URL for real-time updates (e.g., ws://localhost:3001)"
check_optional "NEXT_PUBLIC_ALCHEMY_KEY" "$NEXT_PUBLIC_ALCHEMY_KEY" "Alchemy API key for RPC provider"
check_optional "NEXT_PUBLIC_INFURA_KEY" "$NEXT_PUBLIC_INFURA_KEY" "Infura API key for RPC provider"

# Validate WebSocket URL if provided
if [ -n "$NEXT_PUBLIC_WEBSOCKET_URL" ]; then
  if ! validate_url "$NEXT_PUBLIC_WEBSOCKET_URL"; then
    echo -e "${YELLOW}  ⚠ WebSocket URL should start with ws:// or wss://${NC}"
    WARNINGS=$((WARNINGS + 1))
  fi
fi

# Check WebSocket server configuration if directory exists
if [ -d "websocket-server" ]; then
  echo ""
  echo -e "${BLUE}════════════════════════════════════════${NC}"
  echo -e "${BLUE}WebSocket Server Configuration${NC}"
  echo -e "${BLUE}════════════════════════════════════════${NC}"
  
  if [ ! -f "websocket-server/.env" ]; then
    echo -e "${YELLOW}⚠ websocket-server/.env not found${NC}"
    echo -e "  Copy websocket-server/.env.example to websocket-server/.env to configure the server"
    WARNINGS=$((WARNINGS + 1))
  else
    echo -e "${GREEN}✓ websocket-server/.env exists${NC}"
    
    # Load WebSocket server env
    export $(grep -v '^#' websocket-server/.env | xargs)
    
    check_optional "PORT" "$PORT" "WebSocket server port (default: 3001)"
    check_optional "JWT_SECRET" "$JWT_SECRET" "Secret for JWT token signing"
    check_optional "ETHEREUM_RPC_URL" "$ETHEREUM_RPC_URL" "Ethereum RPC endpoint"
  fi
fi

# Summary
echo ""
echo -e "${BLUE}════════════════════════════════════════${NC}"
echo -e "${BLUE}Summary${NC}"
echo -e "${BLUE}════════════════════════════════════════${NC}"

if [ $ERRORS -eq 0 ] && [ $WARNINGS -eq 0 ]; then
  echo -e "${GREEN}✅ All environment variables are properly configured!${NC}"
  exit 0
elif [ $ERRORS -eq 0 ]; then
  echo -e "${YELLOW}⚠ Configuration valid with ${WARNINGS} warning(s)${NC}"
  echo -e "${YELLOW}The application will work, but some features may be limited.${NC}"
  exit 0
else
  echo -e "${RED}❌ Found ${ERRORS} error(s) and ${WARNINGS} warning(s)${NC}"
  echo -e "${RED}Please fix the errors before running the application.${NC}"
  echo ""
  echo "For help, see:"
  echo "  - frontend/.env.example for frontend configuration"
  echo "  - websocket-server/.env.example for WebSocket server configuration"
  echo "  - DEVELOPER-GUIDE.md for detailed setup instructions"
  exit 1
fi
