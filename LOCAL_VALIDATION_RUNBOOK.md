# Local Validation Runbook

Purpose: provide copy-paste commands for reproducing local validation and runtime safety checks.

## 1) One-Time Setup

```bash
npm install
cp .env.local.example .env.local
```

Notes:
- `.env.local.example` now includes safe local placeholders for required validation keys.
- Do not commit real secrets in `.env.local`.

## 2) Export Local Environment

Run this once per shell session before validation commands:

```bash
set -a && source ./.env.local && set +a
```

## 3) Fast Validation (Environment Only)

```bash
npm run -s validate:env
```

Expected result:
- `Environment validation passed`
- Optional service warnings may still appear (S3/SendGrid/Twilio/Redis/Sentry), which is expected in local dev.

## 4) Full Local Parity Validation

```bash
npm run -s validate:production
```

This runs:
- `typecheck`
- `typecheck:contracts`
- `lint`
- `test:ci`
- `validate:env`

## 5) Additional Runtime Safety Checks

Run these after full validation to verify high-value invariant surfaces:

```bash
npm run -s contract:verify:governance-safety:local
npm run -s contract:verify:merchant-payment-escrow:local
npm run -s contract:verify:ecosystem-work-rewards:local
```

Expected success lines:
- `...checks passed`

## 6) Troubleshooting

If `validate:env` fails for required keys:
- Ensure `.env.local` contains: `NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID`, `NEXT_PUBLIC_APP_URL`, `DATABASE_URL`, `JWT_SECRET`.
- Re-export env in the current shell:

```bash
set -a && source ./.env.local && set +a
```

If `typecheck:contracts` fails:
- Confirm `tsconfig.contracts.json` exists at repo root.

## 7) Recommended Pre-Push Sequence

```bash
set -a && source ./.env.local && set +a && \
npm run -s validate:production && \
npm run -s contract:verify:governance-safety:local && \
npm run -s contract:verify:merchant-payment-escrow:local && \
npm run -s contract:verify:ecosystem-work-rewards:local
```