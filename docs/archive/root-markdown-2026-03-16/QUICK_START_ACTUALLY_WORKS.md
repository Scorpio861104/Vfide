# Quick Start Guide - Actually Working Instructions

This guide has been tested and verified to work. Follow these steps exactly.

## Prerequisites

- Node.js 18+ installed
- npm or yarn
- Git

## Step 1: Clone and Install (5 minutes)

```bash
git clone https://github.com/Scorpio861104/Vfide.git
cd Vfide
npm install
```

**Expected:** You'll see warnings about missing environment variables. That's normal.

## Step 2: Set Up Environment (2 minutes)

Create `.env.local` file in the root directory:

```bash
# Copy this entire block into .env.local
cat > .env.local << 'EOF'
# Blockchain Configuration (Base Sepolia Testnet)
NEXT_PUBLIC_CHAIN_ID=84532
NEXT_PUBLIC_RPC_URL=https://sepolia.base.org
NEXT_PUBLIC_EXPLORER_URL=https://sepolia.basescan.org
NEXT_PUBLIC_IS_TESTNET=true

# Application
NEXT_PUBLIC_APP_URL=http://localhost:3000

# Database (mock for local dev - won't persist data)
DATABASE_URL=postgresql://localhost:5432/vfide

# Security (dev-only - NEVER use in production)
JWT_SECRET=test-secret-dev-only-change-for-production
CSRF_SECRET=test-csrf-dev-only-change-for-production
SESSION_SECRET=test-session-dev-only-change-for-production

# WalletConnect (use "test123" for local dev)
NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID=test123

# ⚠️ REQUIRED: Main contract address (use 0x0 for local dev)
NEXT_PUBLIC_CONTRACT_ADDRESS=0x0000000000000000000000000000000000000000
EOF
```

## Step 3: Start Development Server (30 seconds)

```bash
npm run dev
```

**Expected output:**
```
▲ Next.js 16.1.5 (Turbopack)
- Local:         http://localhost:3000
✓ Ready in 2s
```

## Step 4: Verify It's Working (10 seconds)

Open a new terminal and test:

```bash
# Test health endpoint
curl http://localhost:3000/api/health

# Expected response:
# {"status":"ok","checks":{"env":true,"nextjs":true}}
```

## Step 5: Open in Browser

Open http://localhost:3000 in your browser.

You should see the VFIDE homepage with:
- "Accept Crypto. Zero Fees." heading
- Navigation menu (V button bottom-right)
- "Get Started" and "Watch Demo" buttons

## Troubleshooting

### Health Check Returns 503

**Problem:** `curl http://localhost:3000/api/health` returns `"env": false`

**Solution:** Check that `.env.local` has all three required variables:
- `NEXT_PUBLIC_CHAIN_ID`
- `NEXT_PUBLIC_CONTRACT_ADDRESS` 
- `NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID`

### Port 3000 Already in Use

**Problem:** Error: "Port 3000 is already in use"

**Solution:** 
```bash
# Kill the process using port 3000
lsof -ti:3000 | xargs kill -9

# Or use a different port
PORT=3001 npm run dev
```

### Build Fails

**Problem:** `npm run build` fails with errors

**Solution:**
1. Delete `.next` folder: `rm -rf .next`
2. Clear npm cache: `npm cache clean --force`
3. Reinstall: `rm -rf node_modules && npm install`
4. Try building again: `npm run build`

### Page Loads Slowly

**Problem:** Homepage takes 5+ seconds to load

**Explanation:** This is expected in development mode. The app makes calls to:
- Blockchain RPC endpoints
- WalletConnect APIs
- External font/image CDNs

**Solution:** This is normal. Production builds are much faster.

## What Works

✅ Homepage loads  
✅ Navigation menu  
✅ API health check  
✅ Static pages (About, Legal, etc.)  
✅ Basic routing  

## What Doesn't Work (Without Setup)

❌ Wallet connections (need real WalletConnect ID)  
❌ Database operations (need real PostgreSQL)  
❌ Smart contract interactions (need deployed contracts)  
❌ Payment processing (need contract deployment)  
❌ User authentication (need database)  

## Next Steps

### For Local Development

1. Get a real WalletConnect Project ID from https://cloud.walletconnect.com/
2. Update `NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID` in `.env.local`
3. Set up local PostgreSQL database
4. Run migrations: `npm run migrate:up`
5. Deploy contracts to testnet (Base Sepolia)
6. Update contract addresses in `.env.local`

### For Production Deployment

See `REALITY_CHECK.md` for honest production requirements.

**Do not deploy to production without:**
- Real database
- Deployed smart contracts
- Proper secrets (not "test123")
- External services configured
- Security audit completed
- Load testing performed

## Getting Help

1. Check `REALITY_CHECK.md` for common issues
2. Review `.env.local.example` for all options
3. Check server logs: `tail -f /tmp/dev-server.log`
4. Look for errors in browser console (F12)

---

**Last tested:** January 28, 2026  
**Status:** ✅ Verified working  
**Time to get running:** ~10 minutes
