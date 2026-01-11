#!/bin/bash
# Quick setup helper for first-time developers

echo "🚀 VFIDE Quick Setup"
echo "==================="
echo ""
echo "Running automated setup tasks..."
echo ""

# Make scripts executable
chmod +x scripts/*.sh 2>/dev/null || true

# Create .env files if they don't exist
if [ ! -f ".env" ]; then
    echo "📝 Creating root .env from example..."
    cp .env.example .env
    echo "✅ Created .env - Please edit and add your PRIVATE_KEY"
else
    echo "✅ .env exists"
fi

if [ ! -f "websocket-server/.env" ]; then
    echo "📝 Creating websocket-server/.env from example..."
    cp websocket-server/.env.example websocket-server/.env
    
    # Generate JWT secret if openssl is available
    if command -v openssl &> /dev/null; then
        JWT_SECRET=$(openssl rand -base64 32)
        if [[ "$OSTYPE" == "darwin"* ]]; then
            sed -i '' "s|JWT_SECRET=.*|JWT_SECRET=${JWT_SECRET}|" websocket-server/.env
        else
            sed -i "s|JWT_SECRET=.*|JWT_SECRET=${JWT_SECRET}|" websocket-server/.env
        fi
        echo "✅ Generated random JWT secret"
    else
        echo "⚠️  Please set JWT_SECRET in websocket-server/.env"
    fi
else
    echo "✅ websocket-server/.env exists"
fi

if [ ! -f "frontend/.env.local" ]; then
    echo "📝 Creating frontend/.env.local from example..."
    cp frontend/.env.local.example frontend/.env.local
    echo "✅ Created frontend/.env.local - Please add your NEXT_PUBLIC_WAGMI_PROJECT_ID"
else
    echo "✅ frontend/.env.local exists"
fi

echo ""
echo "📦 Installing dependencies..."
npm install --silent
cd frontend && npm install --silent && cd ..
cd websocket-server && npm install --silent && cd ..
echo "✅ Dependencies installed"

echo ""
echo "🎉 Quick setup complete!"
echo ""
echo "📋 Next steps:"
echo "1. Get WalletConnect Project ID from https://cloud.walletconnect.com/"
echo "2. Add to frontend/.env.local: NEXT_PUBLIC_WAGMI_PROJECT_ID=your_id"
echo "3. Set up PostgreSQL database (see DATABASE-SETUP.md)"
echo "4. Run: npm run dev (or cd frontend && npm run dev)"
echo ""
echo "For detailed setup, run: ./scripts/setup-wizard.sh"
