# v19.12 Rollup — Index

## Findings catalog

This package fills gaps discovered during state-audit of `Vfide-main__4_.zip`. Each row links the missing item to its origin round and where it lives in the package.

### Cross-browser compatibility (v19.10 BCOMPAT)

| ID | Status | Title |
|---|---|---|
| BCOMPAT-1 | ✅ | Cross-browser clipboard helper + 7 fan-out call sites |
| BCOMPAT-3 | ✅ | `window.ethereum!` non-null assertion guarded |

### Cross-chain (v19.7 XCHAIN)

| ID | Status | Title |
|---|---|---|
| XCHAIN-3 | ✅ | SIWE chain allowlist (env-overridable) |
| XCHAIN-3 | ✅ | API-layer chain validation in `/api/auth/challenge` (defense in depth) |

### FTU + compliance (v19.8 COMP)

| ID | Status | Title |
|---|---|---|
| COMP-2 | ✅ | Privacy-delete actually pseudonymizes user records (was: only logged the request) |
| COMP-3 | ✅ | `audit_events` table + `lib/audit/auditLog.ts` infrastructure |

### Performance + race conditions (v19.9 RACE)

| ID | Status | Title |
|---|---|---|
| RACE quest-claim | ✅ | `FOR UPDATE OF uqp` on daily-quest claim |
| RACE weekly-claim | ✅ | `FOR UPDATE OF uwp` on weekly-challenge claim |
| RACE achievements-claim | ✅ | `FOR UPDATE OF uap` on achievement-milestone claim |

### Mobile UX (v19.9 MOB-1 follow-ups)

| ID | Status | Title |
|---|---|---|
| MOB-1 SetupStepBusiness | ✅ | `inputMode`, `autoComplete`, `autoCorrect`, 44px tap targets |
| MOB-1 SetupStepProducts | ✅ | Same; `inputMode="decimal"` for price input |

### Documentation (v19.10 DOCS)

| ID | Status | Title |
|---|---|---|
| DOCS-1 | ✅ | Multi-Chain Deployments section in `ENV_CONTRACT_ADDRESS_MATRIX.md` |
| DOCS-2 | ✅ | Deploying to Multiple Chains section in `DEPLOYMENT.md` |
| DOCS-3 | ✅ | Fee Structure section in `README.md` |

### Recovery / operations (v19.10 REC, v19.3 OP-5)

| ID | Status | Title |
|---|---|---|
| REC-1 | ✅ | SystemHandover runbook |
| OP-5 | ✅ | Standalone restore-test for archived backups |

### Internationalization (v19.10 I18N-2)

| ID | Status | Title |
|---|---|---|
| I18N-2 | ✅ | String-extraction tooling (CI-runnable in `--check` mode) |

## Files in this package

```
vfide-v19-12-rollup-patches/
├── README.md                   ← start here
├── INDEX.md                    ← this file
├── PRIORITY_CHECKLIST.md       ← apply in this order
├── modified-files/             ← drop-in copies, mirrors repo layout
│   ├── README.md                                                       (DOCS-3, append-only)
│   ├── app/
│   │   ├── (commerce)/store/[slug]/components/ShareStoreSheet.tsx      (BCOMPAT-1)
│   │   ├── (marketing)/s/[slug]/LinkInBioClient.tsx                    (BCOMPAT-1)
│   │   ├── api/
│   │   │   ├── auth/challenge/route.ts                                 (XCHAIN-3 API layer)
│   │   │   ├── privacy/delete/route.ts                                 (COMP-2 pseudonymization)
│   │   │   └── quests/
│   │   │       ├── achievements/claim/route.ts                         (RACE)
│   │   │       ├── claim/route.ts                                      (RACE)
│   │   │       └── weekly/claim/route.ts                               (RACE)
│   │   ├── checkout/[id]/page.tsx                                      (BCOMPAT-1)
│   │   └── merchant/gift-cards/page.tsx                                (BCOMPAT-1)
│   ├── components/
│   │   ├── merchant/
│   │   │   ├── SetupStepBusiness.tsx                                   (MOB-1)
│   │   │   └── SetupStepProducts.tsx                                   (MOB-1)
│   │   ├── payment-links/PaymentLinkGenerator.tsx                      (BCOMPAT-1)
│   │   └── ui/
│   │       ├── AddressDisplay.tsx                                      (BCOMPAT-1)
│   │       └── EtherscanLink.tsx                                       (BCOMPAT-1)
│   ├── docs/
│   │   ├── DEPLOYMENT.md                                               (DOCS-2, append-only)
│   │   ├── ENV_CONTRACT_ADDRESS_MATRIX.md                              (DOCS-1, append-only)
│   │   └── operations/SYSTEM_HANDOVER_RUNBOOK.md                       (REC-1, NEW)
│   ├── lib/
│   │   ├── audit/auditLog.ts                                           (COMP-3, NEW)
│   │   ├── clipboardSafe.ts                                            (BCOMPAT-1, NEW)
│   │   ├── cryptoValidation.ts                                         (BCOMPAT-3)
│   │   └── security/siweChallenge.ts                                   (XCHAIN-3)
│   ├── migrations/
│   │   ├── 20260509_create_audit_events.up.sql                         (COMP-3, NEW)
│   │   └── 20260509_create_audit_events.down.sql                       (COMP-3, NEW)
│   └── scripts/
│       ├── extract-i18n-keys.mjs                                       (I18N-2, NEW)
│       └── restore-test.sh                                             (OP-5, NEW)
└── unified-diffs/              ← apply with `patch -p0`
    └── (one .diff per modified file; new files diffed against /dev/null)
```

## Cross-references

- BCOMPAT-1 helper (`lib/clipboardSafe.ts`) is imported by all 7 fan-out sites. New code should also import this rather than calling `navigator.clipboard.writeText` directly. The PR template (v19.11) reminds reviewers of this.
- XCHAIN-3 enforcement happens at TWO layers: `lib/security/siweChallenge.ts` (defense-in-depth, can't be bypassed) AND `app/api/auth/challenge/route.ts` (early rejection saves a Redis round-trip). Both must be present.
- COMP-2 privacy-delete and COMP-3 audit log work together: every privileged action recorded in `audit_events` survives the privacy-delete pseudonymization (it's a compliance requirement to keep audit logs even after user data is erased; the audit log stores the address pseudonym, not the address itself).
- The RACE fixes use `FOR UPDATE OF <table_alias>` (not bare `FOR UPDATE`) so the lock applies only to the user-progress row, not the joined reference table.
- v19.10 SystemHandover runbook references v19.11's `verify-admin-roles.ts` script — verifying admin role topology is part of the pre-execution checklist.

## What this rollup proves

Re-verifying by reading actual file content (not just fingerprint grep) is essential. Two items (v19.4 PayrollManager `s.payer` guard, v19.7 XCHAIN-1 `resolveChainScopedAddress`) were already applied under different shape than my initial grep expected. Catching that saved the rollup from being twice as large.

For future audits, the workflow should be:
1. Fingerprint grep → produces a candidate list of suspect files
2. **Open each suspect file and read** → confirm or refute
3. Patch only the genuinely-missing items

Step 2 is non-negotiable. Skipping it produces patches against problems that don't exist, which break working code.
