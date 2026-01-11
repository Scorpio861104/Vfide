#!/bin/bash
# VFIDE Setup Wizard - Interactive setup for local development

set -e

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

# Helper functions
print_header() {
    echo -e "\n${CYAN}========================================${NC}"
    echo -e "${CYAN}$1${NC}"
    echo -e "${CYAN}========================================${NC}\n"
}

print_success() {
    echo -e "${GREEN}✅ $1${NC}"
}

print_error() {
    echo -e "${RED}❌ $1${NC}"
}

print_warning() {
    echo -e "${YELLOW}⚠️  $1${NC}"
}

print_info() {
    echo -e "${BLUE}ℹ️  $1${NC}"
}

ask_question() {
    echo -e "${YELLOW}❓ $1${NC}"
}

# Check if command exists
command_exists() {
    command -v "$1" >/dev/null 2>&1
}

# Main wizard
clear
print_header "🚀 VFIDE Development Environment Setup Wizard"

echo "This wizard will help you set up your local development environment."
echo "Press Ctrl+C at any time to exit."
echo ""
read -p "Press Enter to continue..."

# Step 1: Check prerequisites
print_header "📋 Step 1/7: Checking Prerequisites"

MISSING_DEPS=()

if ! command_exists node; then
    print_error "Node.js not found"
    MISSING_DEPS+=("node")
else
    NODE_VERSION=$(node -v)
    print_success "Node.js installed: $NODE_VERSION"
fi

if ! command_exists npm; then
    print_error "npm not found"
    MISSING_DEPS+=("npm")
else
    NPM_VERSION=$(npm -v)
    print_success "npm installed: $NPM_VERSION"
fi

if ! command_exists psql; then
    print_warning "PostgreSQL client (psql) not found"
    print_info "You can still continue, but database setup will be manual"
else
    print_success "PostgreSQL client installed"
fi

if ! command_exists forge; then
    print_warning "Foundry (forge) not found"
    print_info "Install from: https://getfoundry.sh/"
else
    print_success "Foundry installed"
fi

if [ ${#MISSING_DEPS[@]} -gt 0 ]; then
    print_error "Missing required dependencies: ${MISSING_DEPS[*]}"
    echo "Please install them and run this wizard again."
    exit 1
fi

# Step 2: Install Node dependencies
print_header "📦 Step 2/7: Installing Node.js Dependencies"

ask_question "Install Node.js dependencies? (y/n)"
read -p "> " INSTALL_DEPS

if [ "$INSTALL_DEPS" = "y" ] || [ "$INSTALL_DEPS" = "Y" ]; then
    print_info "Installing root dependencies..."
    npm install
    
    print_info "Installing frontend dependencies..."
    cd frontend && npm install && cd ..
    
    print_info "Installing websocket-server dependencies..."
    cd websocket-server && npm install && cd ..
    
    print_success "Dependencies installed"
else
    print_warning "Skipped dependency installation"
fi

# Step 3: Environment files
print_header "🔧 Step 3/7: Setting Up Environment Files"

# Root .env
if [ ! -f .env ]; then
    print_info "Creating root .env file..."
    cp .env.example .env
    print_success "Created .env from template"
    print_warning "You need to add your PRIVATE_KEY before deploying contracts"
else
    print_success "Root .env already exists"
fi

# WebSocket .env
if [ ! -f websocket-server/.env ]; then
    print_info "Creating websocket-server/.env file..."
    cp websocket-server/.env.example websocket-server/.env
    print_success "Created websocket-server/.env from template"
    
    # Generate JWT secret
    if command_exists openssl; then
        JWT_SECRET=$(openssl rand -base64 32)
        sed -i.bak "s|your-super-secret-jwt-key-change-this-in-production.*|$JWT_SECRET|" websocket-server/.env
        rm -f websocket-server/.env.bak
        print_success "Generated secure JWT_SECRET"
    fi
else
    print_success "websocket-server/.env already exists"
fi

# Frontend .env.local
if [ ! -f frontend/.env.local ]; then
    print_info "Creating frontend/.env.local file..."
    
    # Check if the comprehensive version exists
    if [ -f frontend/.env.local.example ]; then
        cp frontend/.env.local.example frontend/.env.local
    else
        # Create minimal version
        cat > frontend/.env.local << 'EOF'
# WebSocket Server URL
NEXT_PUBLIC_WS_URL=http://localhost:8080

# WalletConnect Project ID (REQUIRED)
NEXT_PUBLIC_WAGMI_PROJECT_ID=your_walletconnect_project_id_here

# Database URL
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/vfide_testnet

# Network Configuration
NEXT_PUBLIC_CHAIN_ID=84532
NEXT_PUBLIC_RPC_URL=https://sepolia.base.org
EOF
    fi
    print_success "Created frontend/.env.local"
else
    print_success "frontend/.env.local already exists"
fi

# Step 4: WalletConnect Setup
print_header "🔗 Step 4/7: WalletConnect Configuration"

ask_question "Do you have a WalletConnect Project ID? (y/n)"
read -p "> " HAS_WC

if [ "$HAS_WC" = "n" ] || [ "$HAS_WC" = "N" ]; then
    print_info "Get your FREE WalletConnect Project ID:"
    print_info "1. Go to: https://cloud.walletconnect.com/"
    print_info "2. Sign up/Login"
    print_info "3. Create a new project"
    print_info "4. Copy your Project ID"
    echo ""
    ask_question "Enter your WalletConnect Project ID (or press Enter to skip):"
    read -p "> " WC_PROJECT_ID
    
    if [ ! -z "$WC_PROJECT_ID" ]; then
        sed -i.bak "s|NEXT_PUBLIC_WAGMI_PROJECT_ID=.*|NEXT_PUBLIC_WAGMI_PROJECT_ID=$WC_PROJECT_ID|" frontend/.env.local
        rm -f frontend/.env.local.bak
        print_success "WalletConnect Project ID configured"
    else
        print_warning "Skipped WalletConnect configuration - you'll need to add it manually"
    fi
else
    print_success "WalletConnect already configured"
fi

# Step 5: Database Setup
print_header "🗄️  Step 5/7: Database Setup"

ask_question "Set up PostgreSQL database? (y/n)"
read -p "> " SETUP_DB

if [ "$SETUP_DB" = "y" ] || [ "$SETUP_DB" = "Y" ]; then
    if command_exists psql; then
        print_info "Creating database 'vfide_testnet'..."
        
        # Try to create database
        if createdb vfide_testnet 2>/dev/null; then
            print_success "Database created"
        else
            print_warning "Database may already exist (this is OK)"
        fi
        
        # Initialize schema
        if [ -f frontend/init-db.sql ]; then
            print_info "Initializing database schema..."
            psql vfide_testnet -f frontend/init-db.sql > /dev/null 2>&1 || true
            print_success "Database schema initialized"
        fi
    else
        print_warning "psql not found. Please set up PostgreSQL manually:"
        print_info "1. Install PostgreSQL"
        print_info "2. Run: createdb vfide_testnet"
        print_info "3. Run: psql vfide_testnet -f frontend/init-db.sql"
    fi
else
    print_warning "Skipped database setup"
fi

# Step 6: Local Blockchain (optional)
print_header "⛓️  Step 6/7: Local Blockchain Setup (Optional)"

ask_question "Start local blockchain with Anvil? (y/n)"
read -p "> " START_ANVIL

if [ "$START_ANVIL" = "y" ] || [ "$START_ANVIL" = "Y" ]; then
    if command_exists anvil; then
        print_info "Starting Anvil in background..."
        anvil > /dev/null 2>&1 &
        ANVIL_PID=$!
        print_success "Anvil started (PID: $ANVIL_PID)"
        print_info "Stop with: kill $ANVIL_PID"
        
        # Save PID for later
        echo $ANVIL_PID > .anvil.pid
    else
        print_warning "Anvil not found. Install Foundry from: https://getfoundry.sh/"
    fi
else
    print_info "Skipped Anvil startup"
fi

# Step 7: Validation
print_header "✅ Step 7/7: Validating Configuration"

if [ -f scripts/validate-env.js ]; then
    node scripts/validate-env.js || true
else
    print_warning "Validation script not found (this is OK)"
fi

# Final summary
print_header "🎉 Setup Complete!"

echo -e "${GREEN}Your development environment is ready!${NC}\n"

echo "📝 Next steps:"
echo ""
echo "1. Review and update environment variables:"
echo "   - .env (add PRIVATE_KEY)"
echo "   - frontend/.env.local (add WalletConnect ID if not done)"
echo "   - websocket-server/.env (review settings)"
echo ""
echo "2. Start the development servers:"
echo "   Terminal 1: cd websocket-server && npm run dev"
echo "   Terminal 2: cd frontend && npm run dev"
echo ""
echo "3. Deploy smart contracts (optional for local testing):"
echo "   forge script script/Deploy.s.sol --rpc-url http://localhost:8545 --broadcast"
echo ""
echo "4. Open in browser:"
echo "   http://localhost:3000"
echo ""

print_info "For more information, see: QUICK-START.md"
echo ""
