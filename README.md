<!-- CI re-trigger: 1779599043.6223626 -->
# VFIDE Frontend

Next.js 16 frontend for the VFIDE trust-based payment protocol.

## Documentation

- 📄 **[White Paper](./WHITEPAPER.md)** ([PDF](./WHITEPAPER.pdf)) — full architecture, economics, governance, Howey compliance posture, threat model
- 📋 **[Executive Summary](./WHITEPAPER-EXECUTIVE-SUMMARY.md)** ([PDF](./WHITEPAPER-EXECUTIVE-SUMMARY.pdf)) — 1-page TL;DR
- 📚 **[Complete Manual](./docs/)** — the canonical technical reference (every threshold, every function, every line citation)
- 🔐 **[Security Policy](./SECURITY.md)** — disclosure process and scope
- 🛡️ **[Security Sweep](./SECURITY_SWEEP.md)** — full system security audit report

## Tech Stack

- **Framework**: Next.js 16 (App Router)
- **React**: 19
- **Styling**: Tailwind CSS 4
- **Web3**: wagmi v2, RainbowKit
- **Chain**: Base Sepolia (testnet), Base/Polygon/zkSync (mainnet)

## Getting Started

### Development

```bash
# Install dependencies
npm install

# Copy environment file
cp .env.local.example .env.local

# Start development server
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) to view the app.

## Environment Variables

Copy `.env.local.example` to `.env.local` and configure:

```bash
NEXT_PUBLIC_IS_TESTNET=true
NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID=your_project_id
```

For production, see `.env.production` for complete configuration.

### Production Security Prerequisites

These values are required for a safe production deployment and are validated by startup and production checks:

- `DATABASE_URL` must connect with the constrained `vfide_app` role (not superuser / BYPASSRLS role).
- `JWT_SECRET` must be strong and unique per environment.
- `UPSTASH_REDIS_REST_URL` and `UPSTASH_REDIS_REST_TOKEN` must be set.
- `LOG_IP_HASH_SALT` must be set (minimum 16 characters recommended).
- `APP_ORIGIN` and `NEXT_PUBLIC_APP_URL` must be set to your canonical app origin.

Feature-specific production variables:

- `USSD_GATEWAY_TOKEN` when `/api/ussd` is enabled.
- `STREAM_ALLOWED_TOKENS` if stream symbols differ from defaults (`VFIDE,USDC,USDT,DAI,ETH,WETH`).

## Production Deployment

### Prerequisites

1. **Required Services:**
   - PostgreSQL database
   - Redis (Upstash recommended for rate limiting)
   - Sentry account (for error tracking)
   - WalletConnect Project ID
   - Constrained Postgres app role (`vfide_app`, `NOBYPASSRLS`)

2. **Smart Contracts:**
   - Deploy contracts to mainnet
   - Update contract addresses in environment variables

### Deployment Steps

1. **Configure Environment:**
   ```bash
   cp .env.production .env.production.local
   # Fill in all required values
   ```

2. **Validate Configuration:**
   ```bash
   npm run validate:env
   npm run validate:production
   ```

   Vercel note:
   - CI/deployment now fails fast on validation errors (no warning-only bypass).
   - If `APP_ORIGIN` / `NEXT_PUBLIC_APP_URL` are unset on Vercel, validation infers them from `VERCEL_PROJECT_PRODUCTION_URL`, then `VERCEL_BRANCH_URL`, then `VERCEL_URL`.
   - Explicitly setting `APP_ORIGIN` and `NEXT_PUBLIC_APP_URL` is still recommended for canonical production domains.

   Production note: validation failures on Redis or `LOG_IP_HASH_SALT` must block deploy until fixed.

3. **Build Application:**
   ```bash
   npm run build
   ```

4. **Run Database Migrations:**
   ```bash
   npm run migrate:up
   ```

5. **Start Production Server:**
   ```bash
   npm run start
   ```

6. **Health Check:**
   Visit `/api/health` to verify all services are operational.

### Production Checklist

See [PRODUCTION_DEPLOYMENT_CHECKLIST.md](./PRODUCTION_DEPLOYMENT_CHECKLIST.md) for complete pre-deployment checklist.

### Key Production Features

✅ **Security:**
- CSRF protection enabled
- Rate limiting on all endpoints
- CSP headers configured
- HTTPS enforcement (HSTS)
- Input validation with Zod schemas
- SQL injection protection

✅ **Performance:**
- Image optimization
- Code splitting
- Bundle analysis
- Compression enabled
- Database indexing

✅ **Monitoring:**
- Sentry error tracking
- Health check endpoint
- Performance metrics
- Database monitoring

✅ **Testing:**
- 375+ test files
- Unit tests
- Integration tests
- E2E tests (Playwright)
- Performance tests
- Accessibility tests

## Scripts

```bash
# Development
npm run dev              # Start dev server
npm run build            # Production build
npm run start            # Start production server

# Testing
npm run test             # Run unit tests
npm run test:security    # Run Jest-based security suites
npm run test:onchain     # Run blocking Hardhat onchain suites (non-generated)
npm run test:onchain:generated # Run generated deploy-smoke stubs
npm run test:security:all # Run the blocking security gate
npm run test:e2e         # Run E2E tests
npm run test:ci          # Run all tests for CI
npm run test:a11y        # Run accessibility tests

# Code Quality
npm run typecheck        # TypeScript validation
npm run lint             # ESLint
npm run format           # Prettier format

# Database
npm run migrate:up       # Run migrations
npm run migrate:down     # Rollback migration
npm run migrate:status   # Check migration status

# Production Validation
npm run validate:env         # Validate environment variables
npm run validate:production  # Full production validation
```

## Testing Workflow

- `npm run test:security:all` is the blocking security gate. It runs the Jest security suites and the core onchain Hardhat suites.
- `npm run test:onchain` runs the maintained onchain suites under `test/hardhat` and excludes generated smoke stubs.
- `npm run test:onchain:generated` runs generated deploy-smoke coverage separately. This lane is non-blocking and is intended to catch simple artifact drift for contracts that support literal constructor-based smoke deployment.

## Deployed Contracts

See contract configuration in `lib/contracts.ts` for contract addresses.

## Project Structure

```
/app                 # Next.js App Router pages & API routes
/components          # React components (280+)
/lib                 # Utility functions & configurations
/hooks               # Custom React hooks
/types               # TypeScript type definitions
/public              # Static assets
/contracts           # Smart contract ABIs
/migrations          # Database migrations
/__tests__           # Unit tests
/e2e                 # End-to-end tests
```

## Documentation

- [Architecture](./ARCHITECTURE_WIRING.md) - System architecture
- [Security Audit](./SECURITY_AUDIT.md) - Security review
- [API Documentation](./openapi.yaml) - API specification
- [Testing Guide](./TEST_EXECUTION_GUIDE.md) - Testing strategy
- [Local Validation Runbook](./LOCAL_VALIDATION_RUNBOOK.md) - Reproducible local validation and runtime checks
- [Deployment Checklist](./PRODUCTION_DEPLOYMENT_CHECKLIST.md) - Production deployment

## Learn More

- [Next.js Documentation](https://nextjs.org/docs)
- [wagmi Documentation](https://wagmi.sh)
- [RainbowKit Documentation](https://rainbowkit.com)

## Security

Found a security issue? Please email security@vfide.io (do not open a public issue).

## Issue Status

**Status:** ✅ **100% Issue-Free** (Zero Blocking Issues)

All critical and high-priority issues have been resolved. See:
- [100_PERCENT_ISSUE_FREE_STATUS.md](./100_PERCENT_ISSUE_FREE_STATUS.md) - Complete assessment
- [KNOWN_ISSUES.md](./KNOWN_ISSUES.md) - Non-blocking enhancements (3 open, 1 resolved)

**Summary:**
- Critical Issues: 0
- High Priority: 0
- Blocking Issues: 0
- Security Grade: A+ (Excellent)

## License

[Add your license here]

---

**Status:** ✅ Production Ready | ✅ 100% Issue-Free  
**Last Updated:** March 2, 2026  
**Version:** 0.1.0


## Fee structure

VFIDE's most distinctive commitment is that **merchants pay the protocol zero fees on incoming payments — and the code cannot do otherwise.**

### Merchant fee — hardcoded zero

`MerchantPortal.protocolFeeBps` is declared `public constant = 0`. There is no setter, no proposal mechanism, and no timelock path that can change it. The functions that would change it (`setProtocolFee`, `applyProtocolFee`, `cancelProtocolFee`) do not exist in the contract. They were not removed — they were never written, and the surface is deliberately closed.

When a customer pays a merchant via `/pay` or `MerchantPortal.payWithIntent`, the merchant receives 100% of the payment amount in their configured payout token (VFIDE or stablecoin). Every cent of the listed price flows to the merchant.

This is one of the three constitutional commitments described in the VFIDE Manual. It is not a default that can be tuned by governance — it is a property of the code itself.

### Buyer-side burn fee

A separate burn fee applies on outgoing VFIDE transfers (token-level, not merchant-level). It is **not** a protocol revenue stream — burned VFIDE leaves circulation. The burn percentage scales with the buyer's ProofScore: ~3.82% for a brand-new user, dropping to 0.25% for a trusted user (ProofScore ≥ 8000), with a 1% ceiling for micro-transactions. The curve endpoints (`minTotalBps`, `maxTotalBps`) are DAO-bounded with a 10% absolute ceiling, a per-cooldown ≤2× rate limit, and a `MIN_TOTAL_FEE_FLOOR_BPS = 10` immutable floor.

### Buyer gas fee

Standard L2 gas. Not a VFIDE-controlled cost.

### Why merchant fee is closed and burn fee is not

The merchant fee touches the **value the merchant earns from their labor.** Any non-zero merchant fee, however small, replicates the extraction model that VFIDE was built to move past. The code refuses to permit it.

The buyer-side burn fee touches **the cost of using the network.** It exists to fund the burn, the Sanctum Fund, and ecosystem operations. Its value is bounded; its existence is intentional.

### See also

- `contracts/MerchantPortal.sol` — `protocolFeeBps` (constant), `processPayment`, `payWithIntent`
- `contracts/VFIDEToken.sol` — burn-fee calculation by ProofScore
- `contracts/ProofScoreBurnRouter.sol` — fee curve and split math
- `contracts/SanctumVault.sol` — the 10% community charity slice (also hardcoded inline)
- `docs/VFIDE-TECHNICAL-REFERENCE.md` — full fee math reference
