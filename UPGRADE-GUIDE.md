# Upgrade Migration Guide

Comprehensive guide for upgrading VFIDE between versions, including breaking changes, migration steps, and testing procedures.

## Table of Contents

- [Version Compatibility](#version-compatibility)
- [Pre-Upgrade Checklist](#pre-upgrade-checklist)
- [Version-Specific Migrations](#version-specific-migrations)
  - [v1.1.0 → v1.2.0](#v110--v120)
  - [v1.0.0 → v1.1.0](#v100--v110)
- [Component Upgrades](#component-upgrades)
- [Database Migrations](#database-migrations)
- [Smart Contract Upgrades](#smart-contract-upgrades)
- [Post-Upgrade Testing](#post-upgrade-testing)
- [Rollback Procedures](#rollback-procedures)

---

## Version Compatibility

### Supported Upgrade Paths

| From Version | To Version | Direct Upgrade | Notes |
|--------------|------------|----------------|-------|
| v1.0.0 | v1.1.0 | ✅ Yes | Minor updates |
| v1.0.0 | v1.2.0 | ⚠️ Via v1.1.0 | Must upgrade to v1.1.0 first |
| v1.1.0 | v1.2.0 | ✅ Yes | Recommended path |

### Version Requirements

**v1.2.0 Requirements:**
- Node.js >= 18.0.0
- npm >= 9.0.0
- Docker >= 20.10.0 (if using Docker)
- Foundry >= 0.2.0
- Redis >= 7.0 (for WebSocket server)

---

## Pre-Upgrade Checklist

Before starting any upgrade, complete these steps:

### 1. Backup Data

```bash
# Backup environment files
cp .env .env.backup
cp frontend/.env.local frontend/.env.local.backup
cp websocket-server/.env websocket-server/.env.backup

# Backup database (if using)
# Redis backup (if persistence enabled)
redis-cli SAVE
cp /var/lib/redis/dump.rdb dump.rdb.backup

# Backup smart contract deployments
cp -r deployments deployments.backup
cp -r broadcast broadcast.backup
```

### 2. Document Current State

```bash
# Record current versions
node --version > upgrade-state.txt
npm --version >> upgrade-state.txt
docker --version >> upgrade-state.txt
forge --version >> upgrade-state.txt

# Record current dependencies
cd frontend && npm list --depth=0 > ../frontend-deps.txt
cd ../websocket-server && npm list --depth=0 > ../websocket-deps.txt
cd ..

# Record current environment variables
cat frontend/.env.local | grep -v "PRIVATE_KEY\|SECRET" > env-structure.txt
```

### 3. Run Pre-Upgrade Tests

```bash
# Frontend tests
cd frontend
npm test
npm run lint
npm run type-check
cd ..

# WebSocket tests
cd websocket-server
npm test
cd ..

# Smart contract tests
forge test

# E2E tests
cd frontend
npm run test:e2e
cd ..
```

### 4. Check for Breaking Changes

Read the CHANGELOG.md for your target version:
```bash
grep -A 50 "## \[TARGET_VERSION\]" CHANGELOG.md
```

---

## Version-Specific Migrations

### v1.1.0 → v1.2.0

**Release Date**: January 2025  
**Upgrade Time**: ~15-30 minutes  
**Downtime Required**: No (rolling upgrade possible)

#### Breaking Changes

1. **WebSocket Authentication**
   - JWT tokens now expire after 24 hours (was infinite)
   - Must implement token refresh logic in frontend

2. **Environment Variables**
   - `NEXT_PUBLIC_WS_URL` renamed to `NEXT_PUBLIC_WEBSOCKET_URL`
   - New required variable: `REDIS_URL` for WebSocket server

3. **API Changes**
   - `/api/governance` endpoints now return paginated results
   - Must add `page` and `limit` query parameters

#### Migration Steps

**Step 1: Update Dependencies**

```bash
# Frontend
cd frontend
rm -rf node_modules package-lock.json
npm install
cd ..

# WebSocket Server
cd websocket-server
rm -rf node_modules package-lock.json
npm install
cd ..
```

**Step 2: Update Environment Variables**

```bash
# Frontend .env.local
# OLD:
NEXT_PUBLIC_WS_URL=http://localhost:3001

# NEW:
NEXT_PUBLIC_WEBSOCKET_URL=http://localhost:3001
```

```bash
# WebSocket Server .env
# ADD:
REDIS_URL=redis://localhost:6379
JWT_EXPIRY=24h
```

**Step 3: Update WebSocket Client Code**

```typescript
// OLD CODE (frontend/lib/websocket.ts)
const socket = io(process.env.NEXT_PUBLIC_WS_URL);

// NEW CODE
const socket = io(process.env.NEXT_PUBLIC_WEBSOCKET_URL, {
  auth: {
    token: getAuthToken()
  },
  reconnection: true,
  reconnectionDelay: 1000,
  reconnectionAttempts: 5
});

// Handle token expiry
socket.on('auth_error', async () => {
  const newToken = await refreshAuthToken();
  socket.auth = { token: newToken };
  socket.connect();
});
```

**Step 4: Update API Calls**

```typescript
// OLD CODE
const proposals = await fetch('/api/governance/proposals');

// NEW CODE
const proposals = await fetch('/api/governance/proposals?page=1&limit=20');
```

**Step 5: Start Redis (if not already running)**

```bash
# Using Docker
docker run -d --name redis -p 6379:6379 redis:7-alpine

# Or using docker-compose
docker-compose up -d redis
```

**Step 6: Test the Upgrade**

```bash
# Run all tests
npm run test:all

# Start development servers
npm run dev:frontend &
npm run dev:websocket &

# Test WebSocket connection
curl http://localhost:3001/health

# Test frontend
curl http://localhost:3000/api/health
```

**Step 7: Deploy**

```bash
# Build for production
npm run build:all

# Deploy (example for Vercel)
cd frontend && vercel --prod

# Deploy WebSocket server
# (Deploy to your hosting provider)
```

---

### v1.0.0 → v1.1.0

**Release Date**: December 2024  
**Upgrade Time**: ~10-20 minutes  
**Downtime Required**: No

#### Breaking Changes

1. **TypeScript Version**
   - Upgraded to TypeScript 5.3.3
   - May require fixing type errors in custom code

2. **Next.js App Router**
   - Migrated from Pages Router to App Router
   - Custom pages need migration

#### Migration Steps

**Step 1: Update Dependencies**

```bash
cd frontend
rm -rf node_modules package-lock.json .next
npm install
cd ..
```

**Step 2: Migrate Custom Pages**

If you have custom pages in `frontend/pages/`, migrate to `frontend/app/`:

```bash
# OLD: frontend/pages/custom.tsx
# NEW: frontend/app/custom/page.tsx

mkdir -p frontend/app/custom
mv frontend/pages/custom.tsx frontend/app/custom/page.tsx
```

Update the component structure:

```typescript
// OLD (Pages Router)
export default function CustomPage() {
  return <div>Custom Page</div>;
}

// NEW (App Router)
export default function CustomPage() {
  return <div>Custom Page</div>;
}

// Add metadata
export const metadata = {
  title: 'Custom Page',
  description: 'Custom page description'
};
```

**Step 3: Update Data Fetching**

```typescript
// OLD (getServerSideProps)
export async function getServerSideProps() {
  const data = await fetchData();
  return { props: { data } };
}

// NEW (App Router)
async function getData() {
  const data = await fetchData();
  return data;
}

export default async function Page() {
  const data = await getData();
  return <div>{data}</div>;
}
```

**Step 4: Test**

```bash
cd frontend
npm run dev
npm test
npm run type-check
```

---

## Component Upgrades

### Frontend Dependencies

**Major version upgrades:**

```bash
# Check for outdated packages
cd frontend
npm outdated

# Update specific package
npm update <package-name>

# Update all minor and patch versions
npm update

# Update major versions (carefully)
npm install <package-name>@latest
```

**Critical packages to watch:**
- `next`: Follow [Next.js upgrade guide](https://nextjs.org/docs/upgrading)
- `react`: Check [React changelog](https://github.com/facebook/react/releases)
- `wagmi`: Check [wagmi migration guides](https://wagmi.sh/react/migration-guide)
- `viem`: Check [viem changelog](https://viem.sh/)

### WebSocket Server Dependencies

```bash
cd websocket-server
npm outdated
npm update

# Critical packages
# - socket.io: Check for breaking changes
# - jsonwebtoken: Verify algorithm compatibility
# - redis: Check migration guides
```

### Smart Contract Dependencies

```bash
# Update Foundry
foundryup

# Update dependencies
forge update

# Check for breaking changes in libraries
cat lib/openzeppelin-contracts/CHANGELOG.md
cat lib/forge-std/CHANGELOG.md
```

---

## Database Migrations

### Redis Schema Updates

**Example migration for adding new keys:**

```typescript
// migration/redis-v1.2.0.ts
import Redis from 'ioredis';

export async function migrateRedisV120(redis: Redis) {
  console.log('Starting Redis migration to v1.2.0...');
  
  // Get all user sessions
  const sessionKeys = await redis.keys('session:*');
  
  for (const key of sessionKeys) {
    const session = await redis.get(key);
    const sessionData = JSON.parse(session);
    
    // Add new field: tokenVersion
    if (!sessionData.tokenVersion) {
      sessionData.tokenVersion = 1;
      await redis.set(key, JSON.stringify(sessionData));
      console.log(`Migrated session: ${key}`);
    }
  }
  
  // Set migration version
  await redis.set('migration:version', '1.2.0');
  console.log('Redis migration complete!');
}

// Run migration
const redis = new Redis(process.env.REDIS_URL);
await migrateRedisV120(redis);
redis.disconnect();
```

**Run migration:**

```bash
cd websocket-server
npx tsx migrations/redis-v1.2.0.ts
```

---

## Smart Contract Upgrades

### Using UUPS Proxy Pattern

VFIDE contracts use UUPS (Universal Upgradeable Proxy Standard) for upgradability.

**Upgrade process:**

```solidity
// script/UpgradeDAO.s.sol
pragma solidity ^0.8.20;

import "forge-std/Script.sol";
import "../contracts/DAO.sol";
import "../contracts/DAOv2.sol";

contract UpgradeDAOScript is Script {
    function run() external {
        uint256 deployerPrivateKey = vm.envUint("PRIVATE_KEY");
        address proxyAddress = vm.envAddress("DAO_PROXY_ADDRESS");
        
        vm.startBroadcast(deployerPrivateKey);
        
        // Deploy new implementation
        DAOv2 newImplementation = new DAOv2();
        
        // Upgrade proxy to new implementation
        DAO proxy = DAO(proxyAddress);
        proxy.upgradeTo(address(newImplementation));
        
        // Run initialization if needed
        // proxy.initializeV2(newParams);
        
        vm.stopBroadcast();
        
        console.log("Upgraded DAO to:", address(newImplementation));
    }
}
```

**Deployment:**

```bash
# Test upgrade on fork
forge script script/UpgradeDAO.s.sol \
  --rpc-url $RPC_URL \
  --fork-url $FORK_URL \
  --private-key $PRIVATE_KEY \
  --broadcast

# Deploy to testnet
forge script script/UpgradeDAO.s.sol \
  --rpc-url $SEPOLIA_RPC_URL \
  --private-key $PRIVATE_KEY \
  --broadcast \
  --verify

# Deploy to mainnet (requires multisig)
forge script script/UpgradeDAO.s.sol \
  --rpc-url $MAINNET_RPC_URL \
  --private-key $PRIVATE_KEY \
  --broadcast \
  --verify
```

### Contract Upgrade Checklist

- [ ] Review new contract code
- [ ] Run security audit on changes
- [ ] Test upgrade on local fork
- [ ] Test upgrade on testnet
- [ ] Verify storage layout compatibility
- [ ] Test all functions after upgrade
- [ ] Prepare rollback procedure
- [ ] Execute upgrade via multisig (mainnet)
- [ ] Verify upgraded contract on block explorer
- [ ] Update frontend contract addresses
- [ ] Monitor for issues

---

## Post-Upgrade Testing

### Automated Testing

```bash
# Run full test suite
./scripts/check-all.sh

# Run specific test suites
cd frontend && npm test
cd websocket-server && npm test
forge test

# Run E2E tests
cd frontend && npm run test:e2e
```

### Manual Testing Checklist

**Frontend:**
- [ ] Connect wallet successfully
- [ ] View governance proposals
- [ ] Create new proposal
- [ ] Cast vote on proposal
- [ ] View chat messages
- [ ] Send chat message
- [ ] Receive real-time notifications
- [ ] Profile page loads correctly
- [ ] Settings page works

**WebSocket:**
- [ ] WebSocket connects successfully
- [ ] Authentication works
- [ ] Real-time updates received
- [ ] Reconnection works after disconnect
- [ ] Rate limiting works correctly

**Smart Contracts:**
- [ ] Proposal creation works
- [ ] Voting works
- [ ] Token transfers work
- [ ] Badge minting works
- [ ] Council election works

### Performance Testing

```bash
# Load test WebSocket server
npm install -g artillery
artillery quick --count 100 --num 10 http://localhost:3001

# Frontend lighthouse audit
npm install -g @lhci/cli
lhci autorun

# Smart contract gas usage
forge test --gas-report
```

---

## Rollback Procedures

### Frontend Rollback

**Using Vercel:**

```bash
# List deployments
vercel ls

# Rollback to previous deployment
vercel rollback <deployment-url>
```

**Using manual deployment:**

```bash
# Checkout previous version
git checkout v1.1.0

# Rebuild and redeploy
cd frontend
npm install
npm run build
# Deploy to your hosting provider
```

### WebSocket Server Rollback

```bash
# Stop current server
pm2 stop websocket-server

# Checkout previous version
git checkout v1.1.0

# Reinstall dependencies
cd websocket-server
rm -rf node_modules
npm install

# Rebuild
npm run build

# Restart server
pm2 start websocket-server
```

### Database Rollback

**Redis rollback:**

```bash
# Restore from backup
redis-cli FLUSHDB
redis-cli --pipe < dump.rdb.backup
```

### Smart Contract Rollback

**Emergency procedures:**

```solidity
// Use proxy admin to rollback
DAO proxy = DAO(proxyAddress);
proxy.upgradeTo(previousImplementationAddress);
```

**Note**: Smart contract rollbacks are complex and should only be done in emergencies. Prepare thoroughly before attempting.

---

## Troubleshooting

### Common Issues

**Issue: Module not found errors after upgrade**

```bash
# Solution: Clean install
rm -rf node_modules package-lock.json
npm install
```

**Issue: Type errors after TypeScript upgrade**

```bash
# Solution: Regenerate types
cd frontend
npm run build
npm run type-check
```

**Issue: WebSocket connection fails**

```bash
# Check Redis is running
redis-cli ping

# Check WebSocket server logs
pm2 logs websocket-server

# Verify environment variables
cat websocket-server/.env
```

**Issue: Smart contract upgrade fails**

```bash
# Check storage layout compatibility
forge inspect contracts/DAO.sol:DAO storage-layout > before.txt
forge inspect contracts/DAOv2.sol:DAOv2 storage-layout > after.txt
diff before.txt after.txt
```

---

## Getting Help

If you encounter issues during upgrade:

1. **Check the logs**: Look for error messages in console, terminal, and log files
2. **Review documentation**: Check [DEPLOYMENT.md](DEPLOYMENT.md) and [DEVELOPER-GUIDE.md](DEVELOPER-GUIDE.md)
3. **Search issues**: Check GitHub issues for similar problems
4. **Ask the community**: Join our Discord or create a GitHub issue
5. **Contact support**: Email support@vfide.io for assistance

---

## Upgrade Schedule

### Recommended Upgrade Frequency

- **Minor versions** (x.Y.0): Within 1 month of release
- **Patch versions** (x.y.Z): Within 1 week of release
- **Security patches**: Immediately

### Maintenance Windows

- **Staging environment**: Anytime
- **Production environment**: Off-peak hours
  - Weekdays: 2 AM - 4 AM UTC
  - Weekends: Anytime

---

## Version History

| Version | Release Date | Upgrade Time | Downtime | Breaking Changes |
|---------|--------------|--------------|----------|------------------|
| v1.2.0 | Jan 2025 | 15-30 min | No | Yes (3) |
| v1.1.0 | Dec 2024 | 10-20 min | No | Yes (2) |
| v1.0.0 | Nov 2024 | - | - | Initial release |

---

For more information, see:
- [CHANGELOG.md](CHANGELOG.md) - Detailed version history
- [DEPLOYMENT.md](DEPLOYMENT.md) - Deployment procedures
- [DEVELOPER-GUIDE.md](DEVELOPER-GUIDE.md) - Development guide
- [CONTRIBUTING.md](CONTRIBUTING.md) - Contributing guidelines
