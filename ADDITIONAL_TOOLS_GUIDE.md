# Additional Development Tools Guide

This guide covers all the additional tools added to enhance the VFIDE project's development workflow, testing, security, and maintenance.

## Table of Contents
1. [Testing & Quality](#testing--quality)
2. [Smart Contract Security](#smart-contract-security)
3. [Development Experience](#development-experience)
4. [Monitoring & Observability](#monitoring--observability)

---

## Testing & Quality

### 1. Fast-Check (Property-Based Testing)

**Purpose:** Generate random test inputs to discover edge cases and verify invariants hold for all possible inputs.

**Installation:** ✅ Installed (`fast-check@^3.24.2`)

**Usage:**
```bash
# Run property-based/fuzz tests
npm run test:fuzz

# Run specific fuzz test file
npm test -- __tests__/fuzz/price-calculation.fuzz.test.ts
```

**Example Test:**
```typescript
import fc from 'fast-check';

it('should always return positive values', () => {
  fc.assert(
    fc.property(
      fc.double({ min: 0, max: 1e6 }),
      (input) => {
        const result = myFunction(input);
        expect(result).toBeGreaterThanOrEqual(0);
      }
    ),
    { numRuns: 1000 } // Test 1000 random inputs
  );
});
```

**Benefits:**
- Discovers edge cases humans might miss
- Tests thousands of inputs automatically
- Finds integer overflow, division by zero, etc.
- Property-based testing catches logic errors

**Sample Tests Created:**
- `__tests__/fuzz/price-calculation.fuzz.test.ts` - Price formatting invariants

---

### 2. Chromatic (Visual Regression Testing)

**Purpose:** Automated visual testing to catch UI regressions across all Storybook components.

**Installation:** ✅ Already installed (`chromatic@^13.3.5`)

**Setup Required:**
1. Sign up at https://www.chromatic.com/
2. Get project token
3. Add to GitHub Secrets: `CHROMATIC_PROJECT_TOKEN`

**Usage:**
```bash
# Run visual regression tests
npm run chromatic

# Run in CI (will be automatic once token is set)
npm run chromatic -- --exit-zero-on-changes
```

**Configuration:**
- Works with existing Storybook setup
- Automatically creates visual baselines
- Detects pixel-level UI changes
- Integrates with PR workflow

**Benefits:**
- Catch visual regressions before they reach production
- Automated UI review process
- Cross-browser visual testing
- Component-level change detection

---

### 3. Dependabot (Automated Dependency Updates)

**Purpose:** Automatically create PRs to update dependencies, keeping the project secure and up-to-date.

**Installation:** ✅ Configured (`.github/dependabot.yml`)

**Configuration:**
- **Schedule:** Weekly on Mondays at 9:00 AM
- **Ecosystems:** npm, GitHub Actions, Docker
- **PR Limit:** 10 concurrent PRs
- **Auto-labels:** dependencies, automated

**Features:**
- Ignores major version updates for Next.js and React (to prevent breaking changes)
- Automatic security updates
- Groups related updates
- Semantic versioning aware

**How It Works:**
- Dependabot runs weekly
- Creates PRs for outdated dependencies
- Each PR includes changelog and compatibility info
- Merge manually after CI passes

---

### 4. Codecov (Code Coverage Tracking)

**Purpose:** Track code coverage over time, visualize coverage in PRs, and prevent coverage regressions.

**Installation:** ✅ Installed (`codecov@^3.8.3`)

**Setup Required:**
1. Sign up at https://codecov.io/
2. Add repository
3. Add to GitHub Secrets: `CODECOV_TOKEN`

**Configuration:** `.github/codecov.yml`
- Project target: 85%
- Patch target: 80%
- Threshold: 2% (project), 5% (patch)

**Usage:**
```bash
# Generate coverage locally
npm run test:coverage

# Coverage is automatically uploaded in CI
# View at: https://codecov.io/gh/Scorpio861104/Vfide
```

**GitHub Workflow:** `.github/workflows/codecov.yml`
- Runs on every push and PR
- Uploads coverage to Codecov
- Comments on PRs with coverage changes

**Benefits:**
- Track coverage trends over time
- Visualize covered/uncovered lines in PRs
- Prevent coverage regressions
- Identify untested code paths

---

## Smart Contract Security

### 5. Slither (Static Analysis)

**Purpose:** Static analysis tool to find vulnerabilities in Solidity smart contracts.

**Installation:** ⚠️ Requires separate installation (Python tool)

**Setup:**
```bash
# Install Slither (requires Python 3.8+)
pip3 install slither-analyzer

# Or with pipx
pipx install slither-analyzer
```

**Configuration:** `slither.config.json`
- Excludes: node_modules, test files, mocks
- Includes: All vulnerability detectors
- Output: Markdown reports in `docs/security/`

**Usage:**
```bash
# Analyze all contracts
npm run contract:analyze

# Or directly with Slither
slither .

# Generate detailed report
slither . --print human-summary > docs/security/slither-report.md
```

**Detects:**
- Reentrancy vulnerabilities
- Integer overflow/underflow
- Uninitialized storage pointers
- Improper access controls
- Gas optimization issues
- Code quality problems

**Integration:**
Add to CI/CD pipeline:
```yaml
- name: Run Slither
  run: npm run contract:analyze
```

---

### 6. Mythril (Security Analysis)

**Purpose:** Symbolic execution and security analysis for Ethereum smart contracts.

**Installation:** ⚠️ Requires separate installation

**Setup:**
```bash
# Install Mythril (requires Python)
pip3 install mythril

# Or with Docker
docker pull mythril/myth
```

**Usage:**
```bash
# Analyze specific contract
npm run contract:mythril

# Or directly
myth analyze contracts/VFIDETokenV2.sol

# Deep analysis (slower but more thorough)
myth analyze contracts/VFIDETokenV2.sol --execution-timeout 300
```

**Detects:**
- Integer vulnerabilities
- Reentrancy attacks
- Unprotected functions
- Denial of service vectors
- Transaction order dependencies

**Benefits:**
- Symbolic execution finds edge cases
- Security vulnerability reports
- Gas optimization suggestions
- Complementary to Slither (finds different issues)

---

### 7. Certora (Formal Verification)

**Purpose:** Mathematical proof that smart contracts behave correctly under all conditions.

**Installation:** ⚠️ Requires Certora Prover (commercial/academic license)

**Setup:**
1. Sign up at https://www.certora.com/
2. Install Certora Prover
3. Write specifications in CVL (Certora Verification Language)

**Usage:**
```bash
# Run formal verification (requires Certora setup)
certoraRun contracts/VFIDETokenV2.sol --verify VFIDEToken:spec/VFIDEToken.spec

# Check specific properties
certoraRun contracts/VFIDETokenV2.sol \
  --verify VFIDEToken:spec/VFIDEToken.spec \
  --rule totalSupplyDoesNotChange
```

**What to Verify:**
- Token supply never changes unexpectedly
- Balances never go negative
- Transfer logic is always correct
- Access controls cannot be bypassed
- Vesting schedules are monotonic

**Example Specification:**
```cvl
// spec/VFIDEToken.spec
rule totalSupplyConstant {
  uint256 supplyBefore = totalSupply();
  method f; env e;
  calldataarg args;
  f(e, args);
  uint256 supplyAfter = totalSupply();
  assert supplyBefore == supplyAfter;
}
```

**Benefits:**
- Mathematical certainty of correctness
- Finds all possible bugs in specified properties
- Required for high-stakes DeFi protocols
- Industry standard for critical contracts

---

## Development Experience

### 8. Turborepo (Monorepo Build System)

**Purpose:** Fast, incremental builds with smart caching for monorepo projects.

**Installation:** ⚠️ Optional (only if project becomes monorepo)

**When to Use:**
- Project splits into multiple packages (contracts, frontend, backend)
- Need faster CI/CD builds
- Want to cache build artifacts

**Setup (if needed):**
```bash
npm install -D turbo

# Create turbo.json
{
  "pipeline": {
    "build": {
      "dependsOn": ["^build"],
      "outputs": [".next/**", "dist/**"]
    },
    "test": {
      "cache": false
    }
  }
}
```

**Benefits:**
- 10x faster builds with caching
- Only rebuilds changed packages
- Parallel task execution
- Remote caching support

---

### 9. Changesets (Version Management)

**Purpose:** Manage versions and changelogs in a collaborative way.

**Installation:** ✅ Installed (`@changesets/cli@^2.27.12`)

**Configuration:** `.changeset/config.json`
- Access: public
- Base branch: main
- Commit: false (manual commits)

**Usage:**
```bash
# Add a changeset (describe your changes)
npm run changeset

# Version packages (bump versions based on changesets)
npm run changeset:version

# Publish to npm (if applicable)
npm run changeset:publish
```

**Workflow:**
1. Make code changes
2. Run `npm run changeset` and describe changes
3. Commit changeset file with your PR
4. On merge to main, changesets generates version bump
5. Create release with updated changelog

**Benefits:**
- Collaborative changelog generation
- Semantic versioning automation
- Team members document their changes
- Clean, comprehensive release notes

---

### 10. CommitLint (Conventional Commits)

**Purpose:** Enforce conventional commit message format.

**Installation:** ✅ Already installed (`@commitlint/cli@^20.3.1`)

**Configuration:** `commitlint.config.js` (already exists)

**Format:**
```
type(scope): subject

Examples:
feat(auth): add JWT token refresh
fix(payment): handle failed transactions
docs(readme): update installation steps
chore(deps): update dependencies
```

**Commit Types:**
- `feat`: New feature
- `fix`: Bug fix
- `docs`: Documentation
- `style`: Code style (formatting)
- `refactor`: Code refactoring
- `test`: Add/update tests
- `chore`: Maintenance tasks

**Integration:**
- Runs automatically on commit (via Husky)
- Blocks commits with invalid format
- Enables automated changelog generation
- Improves git history readability

---

## Monitoring & Observability

### 11. OpenTelemetry (Distributed Tracing)

**Purpose:** Monitor application performance, trace requests across services, and identify bottlenecks.

**Installation:** ⚠️ Requires manual setup

**Setup:**
```bash
# Install OpenTelemetry packages
npm install @opentelemetry/api \
  @opentelemetry/sdk-node \
  @opentelemetry/auto-instrumentations-node \
  @opentelemetry/exporter-trace-otlp-http

# Create instrumentation.ts
import { NodeSDK } from '@opentelemetry/sdk-node';
import { getNodeAutoInstrumentations } from '@opentelemetry/auto-instrumentations-node';

const sdk = new NodeSDK({
  traceExporter: new OTLPTraceExporter({
    url: process.env.OTEL_EXPORTER_OTLP_ENDPOINT,
  }),
  instrumentations: [getNodeAutoInstrumentations()],
});

sdk.start();
```

**Usage:**
- Automatically traces all HTTP requests
- Monitors database queries
- Tracks external API calls
- Measures function execution time

**Integrations:**
- Jaeger (open-source)
- Grafana Tempo
- DataDog
- New Relic

---

### 12. Datadog RUM (Real User Monitoring)

**Purpose:** Monitor real user experience in production - page loads, errors, user sessions.

**Installation:** ⚠️ Requires Datadog account and manual setup

**Setup:**
```bash
# Install Datadog browser SDK
npm install @datadog/browser-rum

# Initialize in app/layout.tsx
import { datadogRum } from '@datadog/browser-rum';

datadogRum.init({
  applicationId: process.env.NEXT_PUBLIC_DATADOG_APP_ID!,
  clientToken: process.env.NEXT_PUBLIC_DATADOG_CLIENT_TOKEN!,
  site: 'datadoghq.com',
  service: 'vfide-frontend',
  env: process.env.NODE_ENV,
  version: '0.1.0',
  sessionSampleRate: 100,
  sessionReplaySampleRate: 20,
  trackUserInteractions: true,
  trackResources: true,
  trackLongTasks: true,
});
```

**Monitors:**
- Core Web Vitals (LCP, FID, CLS)
- Page load times
- JavaScript errors
- User sessions and flows
- Network requests
- Resource loading

**Benefits:**
- Real user performance data
- Error tracking in production
- User behavior analytics
- Session replay for debugging
- Custom event tracking

---

## Quick Start Commands

```bash
# Testing & Quality
npm run test:fuzz          # Run property-based tests
npm run chromatic          # Visual regression tests
# Dependabot runs automatically
npm run test:coverage      # Generate coverage report

# Smart Contract Security
npm run contract:analyze   # Run Slither (requires Python)
npm run contract:mythril   # Run Mythril (requires Python)
# Certora requires separate setup

# Development Experience
npm run changeset          # Create version changeset
npm run changeset:version  # Bump versions
npm run changeset:publish  # Publish packages
# CommitLint runs automatically on commit

# Monitoring
# OpenTelemetry - manual instrumentation needed
# Datadog RUM - requires account and setup
```

---

## Setup Checklist

### Immediate (No Extra Setup)
- [x] fast-check (ready to use)
- [x] Changesets (ready to use)
- [x] CommitLint (already configured)
- [x] Dependabot (will run automatically)

### Requires Tokens/Accounts
- [ ] Chromatic - sign up and add `CHROMATIC_PROJECT_TOKEN`
- [ ] Codecov - sign up and add `CODECOV_TOKEN`

### Requires Python Installation
- [ ] Slither - `pip3 install slither-analyzer`
- [ ] Mythril - `pip3 install mythril`

### Requires Commercial License
- [ ] Certora - contact Certora for academic/commercial license

### Requires Manual Integration
- [ ] OpenTelemetry - install packages and configure
- [ ] Datadog RUM - sign up and add to app

---

## Recommended Priority

**Phase 1 (Immediate):**
1. Start using fast-check for critical functions
2. Enable Dependabot (automatic)
3. Set up Codecov token for coverage tracking

**Phase 2 (This Week):**
4. Install Slither and run contract analysis
5. Set up Chromatic for visual testing

**Phase 3 (Before Production):**
6. Install Mythril for deeper contract analysis
7. Set up OpenTelemetry/Datadog for monitoring

**Phase 4 (For Critical Contracts):**
8. Consider Certora for formal verification

---

## Support & Documentation

- **Fast-Check:** https://fast-check.dev/
- **Chromatic:** https://www.chromatic.com/docs/
- **Dependabot:** https://docs.github.com/en/code-security/dependabot
- **Codecov:** https://docs.codecov.com/
- **Slither:** https://github.com/crytic/slither
- **Mythril:** https://github.com/ConsenSys/mythril
- **Certora:** https://docs.certora.com/
- **Changesets:** https://github.com/changesets/changesets
- **OpenTelemetry:** https://opentelemetry.io/docs/
- **Datadog:** https://docs.datadoghq.com/

---

**Last Updated:** 2026-01-26
**Tools Added:** 12
**Ready to Use:** 4
**Requires Setup:** 8
