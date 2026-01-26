# VFIDE Development Tools Guide

This document provides a comprehensive overview of all tools available in the VFIDE project to ensure 100% correct and fully functioning development workflow.

## Table of Contents
1. [Quick Start](#quick-start)
2. [Development Tools](#development-tools)
3. [Code Quality Tools](#code-quality-tools)
4. [Testing Tools](#testing-tools)
5. [Smart Contract Tools](#smart-contract-tools)
6. [Database Tools](#database-tools)
7. [Build & Deploy Tools](#build--deploy-tools)
8. [CI/CD Integration](#cicd-integration)

---

## Quick Start

### Initial Setup
```bash
# Clone repository
git clone <repository-url>
cd Vfide

# Install dependencies
npm install

# Install Playwright browsers
npx playwright install

# Start local database (Docker required)
npm run docker:up

# Initialize database
npm run db:init

# Start development server
npm run dev
```

### Verify Setup
```bash
# Run all checks to ensure everything works
npm run typecheck      # TypeScript compilation
npm run lint           # ESLint checks
npm run format:check   # Prettier formatting
npm test               # Jest unit tests
npm run test:e2e       # Playwright E2E tests
npm run build          # Production build
```

---

## Development Tools

### Node Version Management
- **Tool**: nvm (Node Version Manager)
- **Config**: `.nvmrc` specifies Node v20
- **Usage**:
  ```bash
  nvm use  # Use version specified in .nvmrc
  ```

### Package Management
- **Tool**: npm
- **Config**: `.npmrc` (legacy-peer-deps enabled)
- **Commands**:
  ```bash
  npm install              # Install all dependencies
  npm install <package>    # Add new package
  npm update               # Update packages
  ```

### Local Development
```bash
npm run dev              # Start Next.js dev server (localhost:3000)
npm run docker:up        # Start PostgreSQL database
npm run docker:down      # Stop database
npm run docker:logs      # View database logs
```

---

## Code Quality Tools

### TypeScript
- **Tool**: TypeScript 5.x
- **Config**: `tsconfig.json` (strict mode enabled)
- **Features**:
  - Strict type checking
  - Path aliases (`@/*`)
  - noUncheckedIndexedAccess
  - noImplicitReturns
- **Commands**:
  ```bash
  npm run typecheck        # Check types without emitting files
  tsc --noEmit --watch     # Watch mode for type checking
  ```

### ESLint
- **Tool**: ESLint 9 (flat config)
- **Config**: `eslint.config.mjs`
- **Extends**: Next.js, TypeScript
- **Commands**:
  ```bash
  npm run lint             # Run linter
  npm run lint -- --fix    # Auto-fix issues
  ```

### Prettier
- **Tool**: Prettier 3.4
- **Config**: `.prettierrc.json`
- **Plugins**: 
  - prettier-plugin-tailwindcss (auto-sort Tailwind classes)
- **Commands**:
  ```bash
  npm run format           # Format all files
  npm run format:check     # Check formatting without changes
  ```

### Git Hooks
- **Tool**: Husky + lint-staged
- **Config**: `.lintstagedrc.js`
- **Features**:
  - Pre-commit: Runs ESLint and Prettier on staged files
  - Commit message: Validates conventional commits
- **Commands**:
  ```bash
  npm run prepare          # Setup Husky hooks
  ```

### Circular Dependencies
- **Tool**: madge
- **Config**: `.madgerc`
- **Commands**:
  ```bash
  npm run check-circular   # Detect circular dependencies
  npm run circular-deps    # Alias for check-circular
  ```

### Bundle Size Analysis
- **Tool**: @next/bundle-analyzer + size-limit
- **Config**: `.size-limit.json`
- **Commands**:
  ```bash
  npm run analyze          # Build with bundle analyzer
  npm run size             # Check bundle size limits
  npm run size:why         # Analyze why bundle is large
  ```

---

## Testing Tools

### Unit & Integration Testing (Jest)
- **Tool**: Jest 30 + Testing Library
- **Config**: `jest.config.js`, `jest.setup.js`
- **Coverage**: 85%+ code coverage required
- **Commands**:
  ```bash
  npm test                 # Run all tests
  npm run test:watch       # Watch mode
  npm run test:coverage    # Generate coverage report
  npm run test:ci          # CI mode with coverage
  
  # Category-specific tests
  npm run test:security    # Security tests
  npm run test:accessibility  # A11y tests
  npm run test:integration # Integration tests
  npm run test:mobile      # Mobile-specific tests
  npm run test:contract    # Contract interaction tests
  npm run test:network     # Network resilience tests
  npm run test:websocket   # WebSocket tests
  npm run test:storage     # Storage tests
  npm run test:performance:unit  # Performance unit tests
  ```

### E2E Testing (Playwright)
- **Tool**: Playwright 1.57
- **Config**: `playwright.config.ts`
- **Browsers**: Chromium, Firefox, WebKit, Mobile Chrome, Mobile Safari
- **Commands**:
  ```bash
  npm run test:e2e         # Run all E2E tests
  npm run test:e2e:ui      # Interactive UI mode
  npm run test:e2e:debug   # Debug mode
  npm run test:e2e:chromium  # Chrome only
  npm run test:e2e:firefox   # Firefox only
  npm run test:e2e:webkit    # Safari only
  npm run test:e2e:mobile    # Mobile devices
  ```

### Visual Regression Testing
- **Tool**: Percy
- **Config**: `.percy.yml`
- **Commands**:
  ```bash
  npm run test:visual      # Visual regression tests
  ```

### Accessibility Testing
- **Tools**: jest-axe, @axe-core/playwright
- **Standards**: WCAG 2.1 AA compliance
- **Commands**:
  ```bash
  npm run test:a11y        # Run accessibility tests
  npm run test:a11y:watch  # Watch mode
  ```

### Performance Testing
- **Tool**: Lighthouse CI
- **Config**: `lighthouserc.json`, `lighthouse-budget.json`
- **Commands**:
  ```bash
  npm run test:performance     # Lighthouse CI
  npm run test:performance:e2e # E2E performance tests
  npm run test:performance:all # All performance tests
  ```

### Component Testing
- **Tool**: Storybook
- **Config**: `.storybook/`
- **Commands**:
  ```bash
  npm run storybook        # Start Storybook dev server
  npm run build:storybook  # Build static Storybook
  ```

---

## Smart Contract Tools

### Hardhat
- **Tool**: Hardhat (Ethereum development environment)
- **Config**: `hardhat.config.ts`
- **Contracts**: `contracts/VFIDETokenV2.sol`
- **Commands**:
  ```bash
  npm run contract:compile   # Compile smart contracts
  npm run contract:test      # Run contract tests
  npm run contract:deploy    # Deploy contracts (requires --network flag)
  
  # Examples:
  npm run contract:deploy -- base-sepolia
  npm run contract:deploy -- base
  ```

### Contract Verification
- Uses Hardhat verify plugin
- Automatically verifies on Etherscan/Basescan after deployment

---

## Database Tools

### PostgreSQL (Docker)
- **Tool**: PostgreSQL 16 (Alpine)
- **Config**: `docker-compose.yml`
- **Schema**: `init-db.sql`
- **Commands**:
  ```bash
  npm run docker:up        # Start PostgreSQL container
  npm run docker:down      # Stop container
  npm run docker:logs      # View logs
  npm run db:init          # Initialize database with schema
  ```

### Migrations
- **Tool**: Custom migration system (tsx)
- **Location**: `lib/migrations/`
- **Commands**:
  ```bash
  npm run migrate:status   # Check migration status
  npm run migrate:up       # Run pending migrations
  npm run migrate:down     # Rollback last migration
  npm run migrate:create   # Create new migration
  ```

### Environment Variables
- **Development**: `.env.local` (copy from `.env.local.example`)
- **Production**: `.env.production.example`
- **Staging**: `.env.staging.example`
- **Required Variables**:
  ```bash
  DATABASE_URL=postgresql://vfide_user:vfide_password@localhost:5432/vfide_db
  NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID=your_project_id
  NEXT_PUBLIC_IS_TESTNET=true
  ```

---

## Build & Deploy Tools

### Next.js Build
- **Framework**: Next.js 16 (App Router)
- **Config**: `next.config.ts`
- **Commands**:
  ```bash
  npm run build            # Production build
  npm run start            # Start production server
  npm run analyze          # Build with bundle analysis
  ```

### Vercel Deployment
- **Config**: `vercel.json`
- **Features**:
  - Automatic deployments on push
  - Preview deployments for PRs
  - Environment variable management
  - Edge functions for middleware
- **Commands**:
  ```bash
  vercel                   # Deploy to preview
  vercel --prod            # Deploy to production
  ```

### Docker
- **Config**: `Dockerfile`
- **Commands**:
  ```bash
  docker build -t vfide-frontend .
  docker run -p 3000:3000 vfide-frontend
  ```

### Monitoring
- **Tool**: Sentry
- **Config**: `sentry.client.config.ts`, `sentry.server.config.ts`, `sentry.edge.config.ts`
- **Features**:
  - Error tracking
  - Performance monitoring
  - Session replay
  - Source map upload

---

## CI/CD Integration

### GitHub Actions (Recommended)
```yaml
name: CI/CD

on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: '20'
      - run: npm ci
      - run: npm run typecheck
      - run: npm run lint
      - run: npm run format:check
      - run: npm run test:ci
      - run: npm run build
```

### Pre-deployment Checklist
```bash
# 1. Type checking
npm run typecheck

# 2. Linting
npm run lint

# 3. Formatting
npm run format:check

# 4. Tests
npm run test:coverage
npm run test:e2e

# 5. Build
npm run build

# 6. Bundle size
npm run size

# 7. Contract compilation (if changed)
npm run contract:compile
npm run contract:test

# 8. Database migrations (if needed)
npm run migrate:status
npm run migrate:up
```

---

## Troubleshooting

### Common Issues

#### "Port 3000 already in use"
```bash
# Kill process on port 3000
npx kill-port 3000
# or
lsof -ti:3000 | xargs kill
```

#### "Playwright browsers not installed"
```bash
npx playwright install
```

#### "Database connection failed"
```bash
# Ensure Docker is running
docker ps

# Restart database
npm run docker:down
npm run docker:up
npm run db:init
```

#### "Out of memory during build"
```bash
NODE_OPTIONS=--max_old_space_size=4096 npm run build
```

#### "Type errors in tests"
```bash
# Tests are excluded from main tsconfig
# Use jest type definitions in jest.d.ts
```

---

## Best Practices

### Development Workflow
1. Create feature branch from `main`
2. Make changes with frequent commits
3. Run `npm run typecheck && npm run lint && npm test`
4. Create pull request
5. CI runs all checks automatically
6. Review and merge

### Code Quality Standards
- **TypeScript**: Strict mode, no `any` unless documented
- **Testing**: 85%+ coverage, all features tested
- **Accessibility**: WCAG 2.1 AA compliant
- **Performance**: Lighthouse score 90+
- **Security**: No unsafe CSP, dependency audits
- **Bundle Size**: Monitor with size-limit

### Commit Message Format (Conventional Commits)
```
type(scope): subject

feat: add new feature
fix: fix bug
docs: update documentation
style: format code
refactor: refactor code
test: add tests
chore: update tooling
```

---

## Additional Resources

- **Next.js Docs**: https://nextjs.org/docs
- **React 19 Docs**: https://react.dev
- **wagmi Docs**: https://wagmi.sh
- **RainbowKit Docs**: https://rainbowkit.com
- **Hardhat Docs**: https://hardhat.org
- **Jest Docs**: https://jestjs.io
- **Playwright Docs**: https://playwright.dev
- **Tailwind CSS**: https://tailwindcss.com

---

## Summary

This VFIDE project is equipped with **best-in-class tools** for:

✅ **Development**: Next.js 16, React 19, TypeScript, Tailwind CSS  
✅ **Code Quality**: ESLint, Prettier, Husky, madge  
✅ **Testing**: Jest (4000+ tests), Playwright, Storybook, Percy  
✅ **Smart Contracts**: Hardhat with automated compilation and testing  
✅ **Database**: PostgreSQL with Docker and migrations  
✅ **Performance**: Lighthouse CI, bundle analysis, size limits  
✅ **Security**: Strict CSP, dependency audits, Sentry monitoring  
✅ **Accessibility**: WCAG 2.1 AA compliance with automated testing  
✅ **CI/CD**: Automated checks, Vercel deployment  

All tools are properly configured and ready to use. Follow the commands in this guide to maintain 100% correct and fully functioning code.

---

**Last Updated**: 2026-01-26

---

## Additional Advanced Tools

For comprehensive information on advanced testing, security, and monitoring tools, see:

📘 **[ADDITIONAL_TOOLS_GUIDE.md](./ADDITIONAL_TOOLS_GUIDE.md)** - Complete guide to:

### Testing & Quality
- **fast-check** - Property-based testing for fuzzing
- **Chromatic** - Visual regression testing
- **Dependabot** - Automated dependency updates
- **Codecov** - Code coverage tracking

### Smart Contract Security
- **Slither** - Static analysis for Solidity
- **Mythril** - Security vulnerability detection
- **Certora** - Formal verification

### Development Experience
- **Turborepo** - Monorepo build optimization
- **Changesets** - Version and changelog management
- **CommitLint** - Conventional commit enforcement

### Monitoring
- **OpenTelemetry** - Distributed tracing
- **Datadog RUM** - Real user monitoring

---

**Quick Commands for New Tools:**
```bash
# Property-based testing
npm run test:fuzz

# Smart contract security analysis
npm run contract:analyze     # Slither (requires Python)
npm run contract:mythril     # Mythril (requires Python)

# Visual regression testing
npm run chromatic

# Version management
npm run changeset
npm run changeset:version
```

See [ADDITIONAL_TOOLS_GUIDE.md](./ADDITIONAL_TOOLS_GUIDE.md) for detailed setup instructions and usage examples.

