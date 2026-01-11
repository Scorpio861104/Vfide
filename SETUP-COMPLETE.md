# 🚀 VFIDE Complete Setup Summary

## ✅ What's Been Automated

The following setup improvements have been applied to your project:

### 1. ✅ Environment Files Created/Updated
- `.env` - Smart contract deployment configuration
- `websocket-server/.env` - WebSocket server configuration  
- `frontend/.env.local` - Frontend configuration (expanded)

### 2. ✅ Database Connection Pool Fixed
Fixed 11+ API routes to use shared connection pool instead of creating new instances:
- `/api/quests/daily`
- `/api/quests/weekly`
- `/api/quests/streak`
- `/api/quests/onboarding`
- `/api/quests/achievements`
- `/api/quests/notifications`
- `/api/quests/claim`
- `/api/quests/weekly/claim`
- `/api/quests/achievements/claim`
- `/api/leaderboard/monthly`
- `/api/leaderboard/claim-prize`

**Benefit:** Better performance, fewer database connections, prevents connection pool exhaustion

### 3. ✅ Helper Scripts Created

#### `/scripts/validate-env.sh`
Validates all environment variables and shows what's missing.
```bash
./scripts/validate-env.sh
```

#### `/scripts/setup-wizard.sh`  
Interactive setup wizard that guides you through configuration.
```bash
./scripts/setup-wizard.sh
```

#### `/scripts/quick-setup.sh`
Automated quick setup that creates files and generates secrets.
```bash
./scripts/quick-setup.sh
```

#### `/scripts/check-env.js`
Node.js-based environment checker with detailed output.
```bash
node scripts/check-env.js
```

### 4. ✅ Documentation Created

#### `DATABASE-SETUP.md`
Complete guide for setting up PostgreSQL locally, Docker, or Vercel Postgres.

#### `ENV-VARIABLES-GUIDE.md`
Comprehensive reference for all environment variables with priorities and examples.

---

## 🎯 What You Still Need To Do

### Priority 1: MUST HAVE (Blocking)

1. **Get WalletConnect Project ID** ⭐
   - Visit: https://cloud.walletconnect.com/
   - Create free account
   - Create new project
   - Copy Project ID
   - Add to `frontend/.env.local`:
     ```bash
     NEXT_PUBLIC_WAGMI_PROJECT_ID=your_project_id_here
     ```

2. **Set Up PostgreSQL Database** ⭐
   ```bash
   # Quick option: Docker
   docker run -d --name vfide-postgres \
     -e POSTGRES_DB=vfide_testnet \
     -e POSTGRES_PASSWORD=postgres \
     -p 5432:5432 postgres:15-alpine
   
   # Initialize schema
   psql postgresql://postgres:postgres@localhost:5432/vfide_testnet -f frontend/init-db.sql
   ```
   
   Or see `DATABASE-SETUP.md` for other options.

3. **Review Environment Files**
   - Check `.env` - Add your deployment private key (when deploying contracts)
   - Check `websocket-server/.env` - JWT secret should be auto-generated
   - Check `frontend/.env.local` - Add WalletConnect ID and verify DATABASE_URL

### Priority 2: RECOMMENDED

4. **Get RPC API Keys** (Optional but recommended)
   - Alchemy: https://www.alchemy.com/
   - Or Infura: https://infura.io/
   - Add to `frontend/.env.local`:
     ```bash
     NEXT_PUBLIC_ALCHEMY_KEY=your_key
     NEXT_PUBLIC_BASE_SEPOLIA_RPC=https://base-sepolia.g.alchemy.com/v2/your_key
     ```

5. **Deploy Smart Contracts** (When ready)
   ```bash
   # Local testing
   anvil  # Start local blockchain
   forge script script/Deploy.s.sol --rpc-url http://localhost:8545 --broadcast
   
   # Testnet
   forge script script/Deploy.s.sol --rpc-url https://sepolia.base.org --broadcast --verify
   ```
   
   Then update all `NEXT_PUBLIC_*_ADDRESS` variables in `frontend/.env.local`

### Priority 3: NICE TO HAVE

6. **Set Up Error Tracking** (For production)
   - Sentry: https://sentry.io/
   - Add DSN to `frontend/.env.local`

7. **Set Up Redis** (For WebSocket scaling)
   ```bash
   docker run -d --name vfide-redis -p 6379:6379 redis:7-alpine
   ```
   Update `websocket-server/.env`:
   ```bash
   REDIS_ENABLED=true
   REDIS_URL=redis://localhost:6379
   ```

---

## 🏃 Quick Start Commands

```bash
# 1. Run environment checker
node scripts/check-env.js

# 2. If issues found, run setup wizard
./scripts/setup-wizard.sh

# 3. Install dependencies (if not already done)
npm install
cd frontend && npm install
cd ../websocket-server && npm install
cd ..

# 4. Set up database (see DATABASE-SETUP.md)
# Docker option:
docker run -d --name vfide-postgres -e POSTGRES_DB=vfide_testnet -p 5432:5432 postgres:15-alpine
sleep 3
psql postgresql://postgres:postgres@localhost:5432/vfide_testnet -f frontend/init-db.sql

# 5. Start development servers
# Terminal 1: WebSocket Server
cd websocket-server && npm run dev

# Terminal 2: Frontend
cd frontend && npm run dev

# Terminal 3: Local blockchain (optional, for contract testing)
anvil
```

---

## 📝 Verification Checklist

Run these commands to verify your setup:

```bash
# ✓ Check environment configuration
node scripts/check-env.js

# ✓ Check database tables
psql postgresql://postgres:postgres@localhost:5432/vfide_testnet -c "\dt"

# ✓ Check TypeScript compilation
cd frontend && npm run typecheck

# ✓ Check linting
cd frontend && npm run lint

# ✓ Run tests
cd frontend && npm run test
```

---

## 🐛 Troubleshooting

### Issue: "WalletConnect configuration error"
**Solution:** Missing `NEXT_PUBLIC_WAGMI_PROJECT_ID`
```bash
# Get from: https://cloud.walletconnect.com/
echo "NEXT_PUBLIC_WAGMI_PROJECT_ID=your_id" >> frontend/.env.local
```

### Issue: "Database connection failed"
**Solution:** PostgreSQL not running or wrong connection string
```bash
# Check if PostgreSQL is running
pg_isready
# Or for Docker:
docker ps | grep postgres

# Test connection
psql postgresql://postgres:postgres@localhost:5432/vfide_testnet -c "SELECT 1"
```

### Issue: "Contract not found" errors in frontend
**Solution:** Contracts not deployed yet - this is OK for development
```bash
# Frontend will show demo data until contracts are deployed
# Deploy when ready with: forge script script/Deploy.s.sol ...
```

### Issue: "WebSocket connection failed"
**Solution:** WebSocket server not running
```bash
cd websocket-server && npm run dev
```

---

## 📚 Additional Resources

- **Full Environment Guide:** `ENV-VARIABLES-GUIDE.md`
- **Database Setup:** `DATABASE-SETUP.md`
- **Quick Start:** `QUICK-START.md`
- **Deployment Guide:** `DEPLOYMENT.md`
- **Testing Guide:** `frontend/TESTING.md`

---

## 🎉 Next Steps After Setup

1. **Browse the frontend:** http://localhost:3000
2. **Connect your wallet** (testnet mode)
3. **Get testnet ETH:** https://sepoliafaucet.com/ → Bridge to Base Sepolia
4. **Deploy contracts** (when ready)
5. **Test all features**
6. **Read the docs** in `/docs` folder

---

## 💬 Need Help?

1. Run diagnostics: `node scripts/check-env.js`
2. Check the docs in this repo
3. Review error messages carefully - they usually point to the issue
4. Verify all environment variables are set correctly

---

**Status: Development environment is now configured and ready to use!** 🚀

The only manual steps required are:
1. Getting a WalletConnect Project ID (5 minutes)
2. Setting up PostgreSQL (5-10 minutes with Docker)
3. Reviewing and updating environment files as needed

Everything else is automated and ready to go!
