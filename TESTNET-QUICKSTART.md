# VFIDE Testnet - Quick Start Guide

🚀 **Get your fully functional VFIDE testnet running in 5 minutes!**

## What You Get

- ✅ **32 Smart Contracts** deployed on Base Sepolia
- ✅ **PostgreSQL Database** with complete schema
- ✅ **WebSocket Server** for real-time features
- ✅ **Frontend Application** with all features enabled
- ✅ **Redis Cache** (optional, for scaling)
- ✅ **Docker Infrastructure** for easy deployment

## One-Command Deployment

```bash
# From the root directory
./scripts/deploy-testnet.sh
```

That's it! The script will:
1. Check prerequisites (Docker, Node.js, npm)
2. Setup environment files
3. Install all dependencies
4. Build services
5. Start database and cache
6. Initialize schema
7. Start WebSocket server
8. Start frontend
9. Verify everything is working

## Access Your Testnet

After deployment completes, access:

- **Frontend**: http://localhost:3000
- **WebSocket**: http://localhost:8080
- **Database**: postgresql://postgres:postgres@localhost:5432/vfide_testnet
- **Redis**: redis://localhost:6379

## Verify Health

```bash
./scripts/verify-testnet.sh
```

## Stop Services

```bash
./scripts/stop-testnet.sh
```

## Testnet Network Info

- **Network**: Base Sepolia Testnet
- **Chain ID**: 84532
- **RPC URL**: https://sepolia.base.org
- **Explorer**: https://sepolia.basescan.org
- **Faucet**: https://www.coinbase.com/faucets/base-sepolia-faucet

## Key Contract Addresses

| Contract | Address |
|----------|---------|
| VFIDE Token | 0xf57992ab9F8887650C2a220A34fe86ebD00c02f5 |
| DAO | 0xA462F4C2825f48545a9217FD65B7eB621ea8b507 |
| Commerce | 0x7637455897FabeE627ba56D10965A73ad7FddadC |
| Escrow Manager | 0xB8bBFEDe7C4dDe4369eEA17EA5BB2b2e0dFB54DC |
| Council Manager | 0x5aC51E7389e7812209c33f7000b4571a0F43Ba46 |

[Full list of 32 contracts →](BASE_SEPOLIA_DEPLOYMENT.md)

## What Works Out of the Box

### ✅ Governance
- Create and vote on proposals
- Delegate voting power
- Execute approved proposals
- View proposal history

### ✅ Commerce
- Merchant portal
- Escrow services
- Payment processing
- Subscription management

### ✅ Social Features
- Real-time chat (WebSocket)
- Friend system
- User profiles
- Activity feeds
- Notifications

### ✅ Council System
- Council elections
- Member management
- Salary distribution
- Endorsements

### ✅ Badges & Rewards
- Badge earning
- Proof score tracking
- Reputation system
- Achievements

## Prerequisites

Make sure you have installed:
- Docker & Docker Compose
- Node.js 18+
- npm

## Troubleshooting

### Port Already in Use
```bash
# Stop existing services
./scripts/stop-testnet.sh

# Or kill specific ports
lsof -ti:3000 | xargs kill -9
lsof -ti:8080 | xargs kill -9
```

### Database Connection Failed
```bash
# Restart database
docker-compose -f docker/docker-compose.testnet.yml restart postgres

# Check logs
docker logs vfide-postgres
```

### Need Testnet ETH
Visit the faucet: https://www.coinbase.com/faucets/base-sepolia-faucet

## Cloud Deployment

For cloud deployment (Vercel, Render, Railway), see:
- [Full Deployment Guide](TESTNET-DEPLOYMENT-GUIDE.md)

## Production Deployment

When ready for mainnet:
1. Complete security audit
2. Deploy contracts to Base mainnet
3. Update environment variables
4. Follow mainnet deployment checklist

## Support

- [Full Documentation](TESTNET-DEPLOYMENT-GUIDE.md)
- [GitHub Issues](https://github.com/Scorpio861104/Vfide/issues)
- [Discord](https://discord.gg/vfide)

---

**Ready to test?** Connect your wallet to Base Sepolia and start exploring! 🎉
