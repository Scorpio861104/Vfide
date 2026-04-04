# VFIDE Frontend

Next.js 16 frontend for the VFIDE trust-based payment protocol.

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

## Production Deployment

### Prerequisites

1. **Required Services:**
   - PostgreSQL database
   - Redis (Upstash recommended for rate limiting)
   - Sentry account (for error tracking)
   - WalletConnect Project ID

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

## Validation Status

**Current local status:** ✅ `typecheck`, `build`, security suites, and on-chain guardrail suites pass with the maintained local configuration.

Recent validation evidence:
- `npm run typecheck && npm run typecheck:contracts`
- `npm run test:security:all`
- `npm run build`
- `npm run security:supply-chain`

Operational notes:
- Production deployment still requires the expected environment variables and contract addresses.
- Local/frontend-only mode may emit non-blocking warnings when blockchain or server secrets are not configured.
- `KNOWN_ISSUES.md` tracks remaining enhancements and follow-up work.

## License

[Add your license here]

---

**Status:** ✅ Locally validated | ⚠️ Production env still required  
**Last Updated:** April 4, 2026  
**Version:** 0.1.0
