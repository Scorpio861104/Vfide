# VFIDE Environment Variables Quick Reference

## Overview
VFIDE uses three separate environment configuration files:
1. **/.env** - Smart contract deployment
2. **/frontend/.env.local** - Frontend application  
3. **/websocket-server/.env** - WebSocket real-time server

---

## Priority Setup (Must Have)

### 1. WalletConnect Project ID ⭐ REQUIRED
**Where:** `frontend/.env.local`
```bash
NEXT_PUBLIC_WAGMI_PROJECT_ID=your_project_id_here
```
**Get it:** https://cloud.walletconnect.com/ (Free, 5 minutes)
**Why:** Required for wallet connections (MetaMask, Coinbase Wallet, etc.)

### 2. Database Connection ⭐ REQUIRED  
**Where:** `frontend/.env.local`
```bash
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/vfide_testnet
```
**Setup:** See DATABASE-SETUP.md
**Why:** Required for all API routes (users, messages, proposals, etc.)

### 3. JWT Secret ⭐ REQUIRED
**Where:** `websocket-server/.env`
```bash
JWT_SECRET=$(openssl rand -base64 32)
```
**Why:** Secures WebSocket authentication

---

## Optional But Recommended

### 4. RPC Endpoints (Better Performance)
**Where:** `frontend/.env.local` or `.env`
```bash
# Alchemy (recommended)
NEXT_PUBLIC_BASE_SEPOLIA_RPC=https://base-sepolia.g.alchemy.com/v2/YOUR_KEY
MAINNET_RPC_URL=https://eth-mainnet.g.alchemy.com/v2/YOUR_KEY

# Or Infura  
NEXT_PUBLIC_RPC_URL=https://base-sepolia.infura.io/v3/YOUR_KEY
```
**Get keys:**
- Alchemy: https://www.alchemy.com/
- Infura: https://infura.io/
**Why:** Public RPCs are slow and rate-limited

### 5. Block Explorer API Keys (For Contract Verification)
**Where:** `.env`
```bash
BASESCAN_API_KEY=your_key
ETHERSCAN_API_KEY=your_key
POLYGONSCAN_API_KEY=your_key
```
**Get keys:**
- BaseScan: https://basescan.org/apis
- Etherscan: https://etherscan.io/apis
**Why:** Verify contracts on block explorers

### 6. Error Tracking (Production)
**Where:** `frontend/.env.local`
```bash
NEXT_PUBLIC_SENTRY_DSN=https://xxx@xxx.ingest.sentry.io/xxx
```
**Get it:** https://sentry.io/ (Free tier)
**Why:** Catch production errors

---

## Complete Variable List

### Root Project (/.env)
```bash
# Required for deployment
PRIVATE_KEY=your_private_key_without_0x

# Optional RPCs
MAINNET_RPC_URL=
SEPOLIA_RPC_URL=
ZKSYNC_SEPOLIA_RPC=
ZKSYNC_MAINNET_RPC=
BASE_RPC_URL=
BASE_SEPOLIA_RPC_URL=

# Optional verification keys
BASESCAN_API_KEY=
ETHERSCAN_API_KEY=
POLYGONSCAN_API_KEY=
```

### Frontend (/frontend/.env.local)
```bash
# ⭐ REQUIRED
NEXT_PUBLIC_WAGMI_PROJECT_ID=          # WalletConnect
DATABASE_URL=                           # PostgreSQL

# Network Config
NEXT_PUBLIC_CHAIN_ID=84532              # 84532=Base Sepolia, 8453=Base
NEXT_PUBLIC_RPC_URL=https://sepolia.base.org

# Contract Addresses (after deployment)
NEXT_PUBLIC_VFIDE_TOKEN_ADDRESS=
NEXT_PUBLIC_DAO_ADDRESS=
NEXT_PUBLIC_VAULT_HUB_ADDRESS=
NEXT_PUBLIC_SEER_ADDRESS=
# ... (30+ more contract addresses)

# Optional Services
NEXT_PUBLIC_SENTRY_DSN=                 # Error tracking
NEXT_PUBLIC_GA_MEASUREMENT_ID=          # Analytics
NEXT_PUBLIC_VAPID_PUBLIC_KEY=           # Push notifications
NEXT_PUBLIC_ALCHEMY_KEY=                # RPC service
```

### WebSocket Server (/websocket-server/.env)
```bash
# ⭐ REQUIRED
JWT_SECRET=                             # Generate: openssl rand -base64 32
CORS_ORIGINS=http://localhost:3000     # Frontend URLs

# Server Config
PORT=8080
NODE_ENV=development

# Optional Redis (for scaling)
REDIS_ENABLED=false
REDIS_URL=redis://localhost:6379

# Rate Limiting
RATE_LIMIT_MAX_CONNECTIONS_PER_IP=10
RATE_LIMIT_WINDOW_MS=60000

# Logging
LOG_LEVEL=info
```

---

## Quick Commands

```bash
# Validate all environment variables
./scripts/validate-env.sh

# Interactive setup wizard
./scripts/setup-wizard.sh

# Quick setup (creates files, generates secrets)
./scripts/quick-setup.sh

# Generate JWT secret
openssl rand -base64 32
```

---

## Common Issues

### ❌ "WalletConnect error"
→ Missing `NEXT_PUBLIC_WAGMI_PROJECT_ID` in frontend/.env.local

### ❌ "Database connection error"  
→ PostgreSQL not running or wrong `DATABASE_URL`

### ❌ "Contract not found"
→ Contract addresses not set (deploy contracts first)

### ❌ "WebSocket authentication failed"
→ Missing or invalid `JWT_SECRET` in websocket-server/.env

---

## Security Checklist

- [ ] Never commit `.env` files (already in .gitignore)
- [ ] Use different secrets for dev/staging/production
- [ ] Rotate JWT_SECRET periodically in production
- [ ] Use strong DATABASE passwords (not "postgres")
- [ ] Keep PRIVATE_KEY secure (use hardware wallet for mainnet)
- [ ] Enable HTTPS in production
- [ ] Restrict CORS_ORIGINS to actual domains

---

## Need Help?

1. Run validation: `./scripts/validate-env.sh`
2. Check examples: `.env.example`, `.env.local.example`
3. See DATABASE-SETUP.md for database configuration
4. Review QUICK-START.md for step-by-step setup
