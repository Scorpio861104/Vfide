# Pull Request

## Summary

<!-- One paragraph: what is this change, and why? -->

## Type of change

<!-- Mark the one that fits best -->

- [ ] Bug fix
- [ ] New feature
- [ ] Refactor (no behavior change)
- [ ] Performance improvement
- [ ] Documentation
- [ ] Operational / infrastructure

---

## v19 carryover audit checklist

VFIDE went through a 17-lens audit series in 2026 (v19.1 through v19.11) covering hostile-attacker, power-user, operator, economic-actor, failure-mode, integration, cross-chain, FTU, compliance, performance, mobile, accessibility, race conditions, browser compatibility, recovery, documentation, and i18n. Every PR should be quickly checked against the lenses that apply to the change, so new code doesn't silently regress what the v19 sweep fixed.

**Skip lenses that obviously don't apply** (e.g. a doc-only PR doesn't need the race-condition check). The point is to make the relevant ones cheap to confirm, not to bureaucratize every change.

### If this PR touches contracts / Solidity:
- [ ] Reentrancy: external calls happen AFTER state writes (set-before-try)
- [ ] Access control: every privileged function is gated by the right role/owner check
- [ ] Replay protection: signed intents include `chainId` and a nonce
- [ ] No new admin powers that bypass DAOTimelock
- [ ] EIP-712 domain separator includes chainId where relevant
- [ ] Verified against the latest v19 audit findings catalog (no regressions of patched issues)

### If this PR touches API routes:
- [ ] Auth: SIWE / session check is present and enforced
- [ ] Authorization: per-row authorization check (RLS or explicit query filter), not just authentication
- [ ] CSRF token validated for state-changing methods
- [ ] Rate limiting applied (or explicitly opted out with reason)
- [ ] Input validation with explicit type/shape checks
- [ ] No `LOWER(wallet_address)` predicates without the functional index (v19.8 COMP-2)

### If this PR touches the frontend / React:
- [ ] No `'use client'` on components that don't use client-only APIs (v19.x frontend cleanup)
- [ ] Mobile: form inputs have `autoComplete`, `inputMode`, `autoCorrect="off"` for hex addresses, `min-h-[44px]` for tap targets (MOB-1 pattern)
- [ ] A11y: any new modal has `role="dialog"`, `aria-modal="true"`, `aria-labelledby`, focus trap via `useFocusTrap` (v19.11 A11Y-FOLLOWUP)
- [ ] Clipboard usage goes through `copyToClipboardSafe` (v19.10 BCOMPAT-1)
- [ ] No `window.ethereum!` non-null assertions; guard with `typeof window !== 'undefined' && window.ethereum` (v19.10 BCOMPAT-3)
- [ ] User-facing strings have `t('key')` lookups, not hardcoded English (run `node scripts/extract-i18n-keys.mjs` to verify)

### If this PR touches multi-chain code:
- [ ] Contract addresses are read via `NEXT_PUBLIC_*_ADDRESS_<chainId>` (v19.7 XCHAIN-1)
- [ ] SIWE / auth challenges accept only chains in `NEXT_PUBLIC_SUPPORTED_CHAIN_IDS` (v19.7 XCHAIN-3)
- [ ] WebSocket subscriptions filter by chain in addition to event signature (v19.7 XCHAIN-7)
- [ ] CardBoundVault address prediction routes EVM vs zkSync correctly (v19.11 XCHAIN-4)

### If this PR touches deployment / infrastructure:
- [ ] `.deployments/<network>.json` updated with new contracts + `expectedAdmin`
- [ ] Run `npm run -s verify:admin-roles -- --network <name>` after deploy (v19.11 COMP-1)
- [ ] If multi-chain, indexer instance count + chain assignments updated (v19.11 XCHAIN-2)
- [ ] Backup procedure runs against the changed schema (v19.3 OP-5)
- [ ] Rollback procedure tested (v19.3 OP-2 deploy checkpoints)

### If this PR touches the indexer:
- [ ] No assumption of single-chain (use `lib/indexer/multiChain.ts` patterns; v19.11 XCHAIN-2)
- [ ] Reorg-safe: writes are conditional on confirmation depth
- [ ] Idempotent: re-processing a block doesn't double-write events
- [ ] Lag monitor still works (v19.3 OP-4 + REC-2)

### If this PR touches PII or compliance-relevant data:
- [ ] New PII columns are encrypted at rest (envelope encryption per COMP-4 pattern, v19.11)
- [ ] GDPR erasure path covers the new columns (v19.8 COMP-2)
- [ ] Audit log captures access (v19.8 COMP-3)

### If this PR touches translations:
- [ ] All 8 locales (`en`, `es`, `pt`, `fr`, `hi`, `ar`, `ha`, `sw`) updated; key counts match
- [ ] Run `node scripts/extract-i18n-keys.mjs --check` to confirm no missing strings

### If this PR touches the build / bundle:
- [ ] No new eager imports of large libraries; prefer dynamic imports for non-initial-route code
- [ ] If using framer-motion, prefer `m` + `LazyMotion` over `motion` (v19.11 PERF-6)

---

## Testing

- [ ] Unit tests added/updated
- [ ] Integration tests pass locally
- [ ] Hardhat tests pass for any contract changes
- [ ] Manual smoke test on the affected route(s)

## Documentation

- [ ] If user-facing: README / DEPLOYMENT / relevant runbook updated
- [ ] If operational: a runbook entry exists for the new failure mode

## Pre-merge checks

- [ ] `npm run typecheck` passes
- [ ] `npm run lint` passes
- [ ] `npm run test` passes
- [ ] `npx hardhat test` passes (if contracts changed)

---

## Reviewer guidance

If this PR touches multiple subsystems, a reviewer should pull from each subsystem's checklist above. The goal is not to gate every PR behind a 30-item checklist — it's to make sure the v19 audit's hard-won findings don't quietly regress because no one remembered to look for them.

When in doubt: read the v19.x INDEX.md files (one per round) for the specific finding the relevant lens patched.
