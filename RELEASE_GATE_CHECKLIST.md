# Release Gate Checklist (Local)

Purpose: provide a strict, repeatable local release gate so deployments are based on objective pass/fail evidence.

## Scope

This checklist is for "maximum confidence" local validation:
- static quality gates
- full Jest CI coverage gate
- contract invariant checks
- full browser and device E2E matrix
- runtime API/page smoke checks

## Prerequisites

```bash
npm install
cp .env.local.example .env.local
set -a && source ./.env.local && set +a
```

Use this contract placeholder for local runtime checks when needed:

```bash
export NEXT_PUBLIC_CONTRACT_ADDRESS='0x0000000000000000000000000000000000000000'
```

## Gate 1: Static Quality

Run:

```bash
npm run -s typecheck
npm run -s typecheck:contracts
npm run -s lint
npm run -s validate:env
```

Pass criteria:
- all commands exit `0`
- no lint errors
- environment validation prints success (optional-service warnings are acceptable)

## Gate 2: Full Test CI Parity

Run:

```bash
npm run -s test:ci
```

Pass criteria:
- command exits `0`
- no failed suites or tests

## Gate 3: Contract Safety Invariants

Run:

```bash
npm run -s contract:verify:governance-safety:local
npm run -s contract:verify:merchant-payment-escrow:local
npm run -s contract:verify:ecosystem-work-rewards:local
```

Pass criteria:
- all commands exit `0`
- each verifier reports checks passed

## Gate 4: Full E2E Matrix (All User Surfaces)

Baseline matrix (repo default):

```bash
npm run -s test:e2e
```

Maximum-confidence matrix against real app runtime:

```bash
CI= npx playwright test -c playwright.config.runtime.ts \
  --project=chromium \
  --project=firefox \
  --project=webkit \
  --project=mobile-chrome \
  --project=mobile-safari \
  --project=tablet
```

Pass criteria:
- command exits `0`
- no failed tests
- skipped tests are only intentional guards with known reasons

## Gate 5: Runtime Smoke (API + Page Safety)

Start app:

```bash
set -a && source ./.env.local && set +a && npm run -s start
```

In a second shell, run endpoint sweeps:

```bash
# API sweep from app/api routes
base='http://127.0.0.1:3000'
routes=$(find app/api -name 'route.ts' | sed -E 's#^app/api##; s#/route.ts$##; s#\[[^/]+\]#placeholder#g' | sort -u)
server_errors=0
total=0
for r in $routes; do
  path="/api${r}"
  code=$(curl -s -o /tmp/api_body.txt -w "%{http_code}" "$base$path" || echo 000)
  total=$((total+1))
  if echo "$code" | grep -q '^5'; then
    server_errors=$((server_errors+1))
    echo "$code $path"
  fi
done
echo "TOTAL=$total SERVER_ERRORS=$server_errors"
```

Pass criteria:
- `SERVER_ERRORS=0`
- expected auth-protected routes may return `401/403`; this is not a failure

## Release Decision Rule

Release only if ALL gates pass.

If any gate fails:
1. fix issue
2. rerun failed gate
3. rerun full Gate 4 and Gate 5 before release approval

## Recommended Single-Command Sequence

```bash
set -a && source ./.env.local && set +a && \
npm run -s typecheck && \
npm run -s typecheck:contracts && \
npm run -s lint && \
npm run -s test:ci && \
npm run -s validate:env && \
npm run -s contract:verify:governance-safety:local && \
npm run -s contract:verify:merchant-payment-escrow:local && \
npm run -s contract:verify:ecosystem-work-rewards:local && \
CI= npx playwright test -c playwright.config.runtime.ts --project=chromium --project=firefox --project=webkit --project=mobile-chrome --project=mobile-safari --project=tablet
```

Use Gate 5 API/page smoke immediately after this sequence for final runtime assurance.
