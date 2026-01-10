# VFIDE Testnet Deployment Guide

Complete guide for deploying a fully functional VFIDE testnet ecosystem that operates just like mainnet.

## 🎯 Overview

This testnet deployment includes:
- ✅ 32 Smart contracts deployed on Base Sepolia (Chain ID: 84532)
- ✅ PostgreSQL database with complete schema
- ✅ WebSocket server for real-time features
- ✅ Frontend application
- ✅ Redis cache (optional, for scaling)
- ✅ Docker-based infrastructure

## 📋 Prerequisites

### Required
- Docker & Docker Compose
- Node.js 18+ and npm
- Git
- Base Sepolia testnet ETH in your wallet

### Optional
- Supabase account (alternative to self-hosted PostgreSQL)
- Render.com or Railway.app account (for WebSocket deployment)
- Vercel account (for frontend deployment)

## 🚀 Quick Start (Local Development)

### 1. Clone and Setup

```bash
cd /workspaces/Vfide

# Make scripts executable
chmod +x scripts/deploy-testnet.sh
chmod +x scripts/stop-testnet.sh
chmod +x scripts/verify-testnet.sh
```

### 2. Deploy Full Stack

```bash
# Deploy everything with one command
./scripts/deploy-testnet.sh
```

This script will:
1. ✅ Check prerequisites
2. ✅ Setup environment files
3. ✅ Install dependencies
4. ✅ Build services
5. ✅ Start PostgreSQL and Redis
6. ✅ Initialize database schema
7. ✅ Start WebSocket server
8. ✅ Start frontend
9. ✅ Verify deployment

### 3. Verify Health

```bash
./scripts/verify-testnet.sh
```

### 4. Access Your Testnet

- **Frontend**: http://localhost:3000
- **WebSocket**: http://localhost:8080
- **Database**: postgresql://postgres:postgres@localhost:5432/vfide_testnet
- **Redis**: redis://localhost:6379
- **pgAdmin** (optional): http://localhost:5050

### 5. Stop Services

```bash
./scripts/stop-testnet.sh
```

## 🗄️ Database Setup

### Option 1: Docker PostgreSQL (Included)

The deployment script automatically sets up PostgreSQL with Docker. The schema is auto-loaded from `database/schema.sql`.

### Option 2: Supabase (Recommended for Production Testnet)

1. **Create Supabase Project**
   ```bash
   # Visit https://supabase.com/dashboard
   # Create new project: vfide-testnet
   # Region: Choose closest to your users
   ```

2. **Run Schema**
   ```bash
   # Copy database/schema.sql content
   # Paste in Supabase SQL Editor
   # Execute
   ```

3. **Update Environment**
   ```bash
   # In frontend/.env.local (server-side only)
   DATABASE_URL=postgresql://postgres:[PASSWORD]@db.[PROJECT].supabase.co:5432/postgres
   SUPABASE_URL=https://[PROJECT].supabase.co
   SUPABASE_ANON_KEY=[YOUR_ANON_KEY]
   SUPABASE_SERVICE_ROLE_KEY=[YOUR_SERVICE_KEY]

   # In websocket-server/.env
   DATABASE_URL=postgresql://postgres:[PASSWORD]@db.[PROJECT].supabase.co:5432/postgres
   ```

## 🔌 WebSocket Server Deployment

### Option 1: Local (Development)

Already handled by deployment script.

### Option 2: Render.com (Recommended)

1. **Create Web Service**
   ```bash
   # Visit https://dashboard.render.com
   # New -> Web Service
   # Connect GitHub repo: Scorpio861104/Vfide
   ```

2. **Configure Service**
   ```yaml
   Name: vfide-websocket-testnet
   Root Directory: websocket-server
   Environment: Node
   Build Command: npm install && npm run build
   Start Command: npm start
   ```

3. **Add Environment Variables**
   ```
   NODE_ENV=production
   PORT=8080
   DATABASE_URL=[Your Supabase URL]
   JWT_SECRET=[Generate with: openssl rand -base64 32]
   CORS_ORIGINS=https://testnet.vfide.io,http://localhost:3000
   BASE_SEPOLIA_RPC_URL=https://sepolia.base.org
   DAO_ADDRESS=0xA462F4C2825f48545a9217FD65B7eB621ea8b507
   TOKEN_ADDRESS=0xf57992ab9F8887650C2a220A34fe86ebD00c02f5
   REDIS_ENABLED=false
   ```

4. **Deploy**
   - Click "Create Web Service"
   - Wait for deployment
   - Note your WebSocket URL: `wss://vfide-websocket-testnet.onrender.com`

### Option 3: Railway.app

1. **Create Project**
   ```bash
   # Visit https://railway.app
   # New Project -> Deploy from GitHub
   # Select: Scorpio861104/Vfide
   ```

2. **Configure**
   ```
   Root Directory: /websocket-server
   Build Command: npm install && npm run build
   Start Command: npm start
   ```

3. **Add Variables** (same as Render.com)

## 🌐 Frontend Deployment

### Deploy to Vercel

1. **Install Vercel CLI**
   ```bash
   npm install -g vercel
   ```

2. **Deploy Frontend**
   ```bash
   cd frontend
   
   # Use testnet environment
   cp .env.testnet .env.production
   
   # Deploy to Vercel
   vercel --prod
   ```

3. **Configure Vercel Environment**
   ```bash
   # In Vercel Dashboard -> Settings -> Environment Variables
   # Import from .env.testnet
   ```

4. **Update WebSocket URL**
   ```bash
   # In Vercel, update:
   NEXT_PUBLIC_WS_URL=wss://vfide-websocket-testnet.onrender.com
   NEXT_PUBLIC_WEBSOCKET_URL=wss://vfide-websocket-testnet.onrender.com
   ```

5. **Redeploy**
   ```bash
   vercel --prod
   ```

## 📝 Contract Addresses (Base Sepolia)

All 32 contracts are already deployed:

### Core Infrastructure
| Contract | Address |
|----------|---------|
| VFIDEToken | 0xf57992ab9F8887650C2a220A34fe86ebD00c02f5 |
| DAO | 0xA462F4C2825f48545a9217FD65B7eB621ea8b507 |
| VFIDECommerce | 0x7637455897FabeE627ba56D10965A73ad7FddadC |
| EscrowManager | 0xB8bBFEDe7C4dDe4369eEA17EA5BB2b2e0dFB54DC |
| CouncilManager | 0x5aC51E7389e7812209c33f7000b4571a0F43Ba46 |

[Full list in BASE_SEPOLIA_DEPLOYMENT.md](../BASE_SEPOLIA_DEPLOYMENT.md)

## 🧪 Testing Your Testnet

### 1. Get Testnet ETH

```bash
# Visit Base Sepolia Faucet
https://www.coinbase.com/faucets/base-sepolia-faucet

# Or use the faucet button in the app
```

### 2. Connect Wallet

1. Open http://localhost:3000 or your deployed URL
2. Click "Connect Wallet"
3. Select MetaMask/Coinbase Wallet
4. Switch to Base Sepolia (Chain ID: 84532)

### 3. Test Core Features

**Governance:**
- Create a proposal
- Vote on proposals
- Delegate voting power

**Commerce:**
- Create a merchant profile
- Set up escrow
- Make test payments

**Social:**
- Send messages
- Add friends
- Give endorsements

**Council:**
- Nominate for council
- Vote in council elections
- View council members

## 🔧 Configuration Files

### Frontend Environment
- **Development**: `frontend/.env.local`
- **Testnet**: `frontend/.env.testnet`
- **Production**: `frontend/.env.production`

### WebSocket Server
- **Development**: `websocket-server/.env`
- **Testnet**: `websocket-server/.env.testnet`
- **Production**: `websocket-server/.env.production`

### Docker Compose
- **Testnet**: `docker/docker-compose.testnet.yml`

### Database
- **Schema**: `database/schema.sql`

## 🔍 Monitoring & Logs

### Docker Logs
```bash
# All services
docker-compose -f docker/docker-compose.testnet.yml logs -f

# Specific service
docker-compose -f docker/docker-compose.testnet.yml logs -f postgres
docker-compose -f docker/docker-compose.testnet.yml logs -f redis
```

### Application Logs
```bash
# Frontend (if running locally)
cd frontend && npm run dev

# WebSocket (if running locally)
cd websocket-server && npm start
```

### Database Queries
```bash
# Connect to PostgreSQL
docker exec -it vfide-postgres psql -U postgres -d vfide_testnet

# Useful queries
SELECT COUNT(*) FROM users;
SELECT COUNT(*) FROM messages;
SELECT COUNT(*) FROM proposals;
```

## 🐛 Troubleshooting

### Database Connection Failed
```bash
# Check if PostgreSQL is running
docker ps | grep postgres

# Restart database
docker-compose -f docker/docker-compose.testnet.yml restart postgres

# Check logs
docker logs vfide-postgres
```

### WebSocket Not Connecting
```bash
# Check if WebSocket is running
curl http://localhost:8080/health

# Check CORS settings
# Ensure your frontend URL is in CORS_ORIGINS

# Check logs
tail -f websocket-server/logs/websocket.log
```

### Contract Calls Failing
```bash
# Verify you're on Base Sepolia (Chain ID: 84532)
# Check contract addresses in .env.local
# Ensure you have testnet ETH
# Check RPC is responding: https://sepolia.base.org
```

### Build Errors
```bash
# Clear caches
rm -rf frontend/.next
rm -rf frontend/node_modules
rm -rf websocket-server/node_modules

# Reinstall
cd frontend && npm install
cd ../websocket-server && npm install
```

## 🎛️ Advanced Configuration

### Enable Redis for Scaling
```bash
# In websocket-server/.env
REDIS_ENABLED=true
REDIS_URL=redis://localhost:6379

# Or use Redis Cloud
REDIS_URL=redis://username:password@redis-xxxxx.cloud.redislabs.com:12345
```

### Enable Rate Limiting
```bash
# In websocket-server/.env
RATE_LIMIT_MAX_CONNECTIONS_PER_IP=50
RATE_LIMIT_WINDOW_MS=60000
```

### Custom Domain Setup
```bash
# Update CORS origins
CORS_ORIGINS=https://testnet.yourdomain.com

# Update frontend WebSocket URL
NEXT_PUBLIC_WS_URL=wss://ws-testnet.yourdomain.com
```

## 📊 Performance Optimization

### Frontend
- Enable PWA (optional for testnet)
- Add CDN (Vercel handles this automatically)
- Optimize images with next/image

### WebSocket
- Enable Redis for multi-instance scaling
- Adjust heartbeat intervals based on usage
- Monitor connection pool size

### Database
- Add indexes for frequently queried fields (already in schema)
- Enable connection pooling
- Use read replicas for high traffic

## 🔐 Security Checklist

- [ ] Change JWT_SECRET from default
- [ ] Use strong database passwords
- [ ] Enable HTTPS (Vercel/Render handle this)
- [ ] Configure CORS properly
- [ ] Enable rate limiting
- [ ] Use environment variables for secrets
- [ ] Enable signature verification for WebSocket
- [ ] Keep dependencies updated

## 📚 Additional Resources

- [Smart Contracts Documentation](../CONTRACTS.md)
- [Frontend Development Guide](../frontend/README.md)
- [WebSocket API Documentation](../websocket-server/README.md)
- [Database Schema](../database/schema.sql)
- [Architecture Overview](../ARCHITECTURE.md)

## 🆘 Getting Help

If you encounter issues:

1. Check the troubleshooting section above
2. Review logs: `./scripts/verify-testnet.sh`
3. Check GitHub issues: https://github.com/Scorpio861104/Vfide/issues
4. Join Discord: https://discord.gg/vfide

## 🎉 Next Steps

Once your testnet is running:

1. **Test All Features** - Systematically test governance, commerce, social, council
2. **Gather Feedback** - Invite testers to use the testnet
3. **Monitor Performance** - Track response times, error rates
4. **Fix Issues** - Address bugs before mainnet
5. **Security Audit** - Consider professional audit
6. **Mainnet Preparation** - Deploy contracts to Base mainnet when ready

---

**Congratulations!** 🎊 You now have a fully functional VFIDE testnet that operates just like mainnet!
