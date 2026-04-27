# GitHub Issues Summary — Complete Repository Audit

**Generated:** April 27, 2026  
**Scope:** All issues found across codebase, documentation, and diagnostics  
**Status:** Ready for GitHub Issues creation

---

## Executive Summary

This document consolidates **all identified issues** in the Vfide repository from:
- Existing audit documentation (`VFIDE_MAINNET_READINESS_FINDINGS.md`)
- Embedded code comments (TODO/FIXME/NOTE markers)
- Slither static analysis
- TypeScript/ESLint diagnostics
- API route and contract-level findings

**Total Issues Identified:** 60+  
**Critical/High Severity:** 18  
**Medium Severity:** 10+  
**Low/Informational:** 30+

---

## CRITICAL ISSUES (Mainnet Blockers)

### [CRITICAL] A-1: CardBoundVault Instant Approval in Bootstrap Mode
- **File:** `contracts/CardBoundVault.sol`
- **Impact:** Circumvents approval timelock before guardian setup complete
- **Fix Required:** Enforce queued+delayed approval path even in bootstrap mode
- **Status:** Partially fixed (needs verification)

### [CRITICAL] A-2: WithdrawalQueue Stub Production Deployment
- **File:** `contracts/scripts/deploy-phase1.ts` (line 182-188), `DeployPhase1Infrastructure.sol`
- **Impact:** Script deploys admin-controlled testnet stub to production if `ALLOW_WITHDRAWAL_QUEUE_STUB=true`
- **Fix Required:** (a) Delete stub, or (b) require production implementation
- **Related:** `NEXT_PUBLIC_WITHDRAWAL_QUEUE_ADDRESS` env var references system that doesn't exist
- **Status:** Unresolved — abstract contract has no production subclass

### [CRITICAL] A-3: SIWE Auth Domain Missing from Production Env
- **File:** `lib/security/siweChallenge.ts` (line 28-35), `.env.production.example`, `.env.mainnet.example`
- **Impact:** Every SIWE auth attempt fails with HTTP 400 if `APP_ORIGIN` unset
- **Fix Required:** Add `APP_ORIGIN=https://app.vfide.io` to both example env files + startup assertion
- **Additional Risk:** `.vercel.app` domain suffix trust gated on `NODE_ENV !== production` — bypassable if env mishandled
- **Status:** Unresolved — outage risk on mainnet deploy

### [CRITICAL] B-1: StablecoinRegistry Owner-Controlled with Wrong Decimals
- **File:** `contracts/StablecoinRegistry.sol`
- **Impact:** 
  - No DAO gate: all mutators are `onlyOwner`
  - No decimals validation: wrong decimals → all payment math wrong forever
  - Owner key compromise → adversary registers malicious stablecoin
- **Example:** Register USDC (6 decimals) with 18 decimals → $1 invoice charges $1e12
- **Fix Required:** Convert to `onlyDAO`/`onlyDAOTimelock`, cross-check `IERC20Metadata.decimals()`
- **Status:** Unresolved — production ready but high risk

---

## HIGH SEVERITY ISSUES

### [HIGH] A-4: Middleware Body Cap Bypassable via Chunked Transfer-Encoding
- **File:** `proxy.ts` (line 122-148)
- **Impact:** POST/PUT/PATCH with `Transfer-Encoding: chunked` skip size limit entirely
- **DoS Vector:** Attacker can bypass 10MB cap on any route
- **Fix Required:** Either reject POST/PUT/PATCH without `Content-Length`, or read body in middleware
- **Status:** Unresolved

### [HIGH] A-5: SystemHandover Ownership Audit is Self-Attestable
- **File:** `contracts/SystemHandover.sol` (line 159-172)
- **Impact:** Dev can set themselves as auditor, then mark ownership as audited regardless of chain state
- **Combined Risk:** Dev controls both `executeHandover` (onlyDev) and `disarm` (blocked last 30 days only)
- **Fix Required:** Route `markOwnershipAudited` through off-chain verifier or require second signer
- **Status:** Partially addressed via documentation (insufficient for on-chain enforcement)

### [HIGH] A-6: EcosystemVault & MerchantPortal Exceed EIP-170 24KB Bytecode Limit
- **Contracts:**
  - `EcosystemVault.sol` — 26,099 bytes (1.5KB over)
  - `MerchantPortal.sol` — 25,181 bytes (0.6KB over)
- **Impact:** Will fail to deploy on Ethereum mainnet, Base, Polygon, zkSync Era
- **Status:** Pre-existing violation; hardhat.config.ts already optimized (runs:1)
- **Fix Required:** Library extraction or feature removal before mainnet
- **Blocker:** No transactions can settle, no merchant can be paid if deployed

### [HIGH] A-7: VFIDETestnetFaucet on Production Deploy List
- **File:** `PRODUCTION_SET.md` (line 58), `contracts/VFIDETestnetFaucet.sol`
- **Impact:** Constructor rejects deployment on chains other than Sepolia/Amoy/Mumbai
- **Risk:** (1) Script mid-deploy revert leaves deployment half-state; (2) no env var safeguard in .env.production.example
- **Fix Required:** Move to `TESTNET_SET.md`, add assertion that faucet bytecode absent from production
- **Status:** Unresolved

### [HIGH] B-2: PayrollManager Unbounded Array Growth → Permanent Self-Lockout
- **File:** `contracts/PayrollManager.sol` (line 406, 440)
- **Issue:** `cancelStream` and `claimExpiredStream` don't pop from `payerStreams`/`payeeStreams` arrays
- **Attack:** Create 200 streams (hard cap), cancel them → user locked out forever
- **Sybil Griefing:** Attacker creates 200 micro-streams to victim as payee → victim cannot receive payroll from anyone
- **Fix Required:** Track active count separately or use swap-and-pop pattern (same as H-40 fix)
- **Status:** Unresolved

### [HIGH] B-3: PayrollManager.topUp Doesn't Account for Fee-on-Transfer Tokens
- **File:** `contracts/PayrollManager.sol` (line 200-208)
- **Issue:** Balance incremented before `safeTransferFrom` (unlike `createStream` which measures actual received)
- **Impact:** Fee-on-transfer token top-up causes accounting to exceed actual balance; withdrawals fail mid-stream
- **Status:** Unresolved

### [HIGH] B-4: PayrollManager Accepts Arbitrary Tokens with No Allowlist
- **File:** `contracts/PayrollManager.sol`
- **Risk:** (1) Merchant tricked into accepting stream in illiquid token; (2) Malicious tokens extract value; (3) Rebasing tokens drift accounting
- **Fix Required:** Restrict to `StablecoinRegistry` allowlist + VFIDE, or create PayrollManager-level per-token allowlist
- **Status:** Unresolved

### [HIGH] B-5: SeerSocial.endorsersOf Unbounded Growth → Permanent Reputational Sabotage
- **File:** `contracts/SeerSocial.sol` (line 290)
- **Issue:** Hard 200-cap per subject; endorsements not removed on expiry, only on revoke
- **Attack:** Sybil mass-endorse victim with cheap-to-fund accounts, let expire → victim's slot consumed forever, bonus capped
- **Status:** Unresolved

### [HIGH] B-6: Slither `arbitrary-send-erc20` Flags Not Tracked
- **Affected Routes:**
  - `SubscriptionManager.processPayment()` → pulls from userVault without specific auth
  - `CommerceEscrow.markFunded()` → pulls from buyerVault
  - `VFIDETermLoan.extractFromGuarantors()` → pulls from guarantor (tied to A-1 approval issue)
- **Impact:** Combined with A-1, SubscriptionManager is same drain primitive as C-1/C-20
- **Fix Required:** Tie `from` address to signed user intent or queued vault permission
- **Status:** Acknowledged but not in tracker

### [HIGH] B-7: `/api/streams` Creates DB Rows with No On-Chain Backing
- **File:** `app/api/streams/route.ts`
- **Issue:** Creates `streams` table row off-chain only; no transferFrom, no escrow, no link to PayrollManager
- **Trust Gap:** Frontend shows "active stream" that doesn't exist on-chain; recipient gets silent failure on claim
- **Fix Required:** Remove endpoint or mark as preview/planning only (no "active" status)
- **Status:** Unresolved — API audit spot-checked 18/122 routes; this not reviewed

### [HIGH] B-8: Faucet Operator Key in Production Route Code Path
- **File:** `app/api/faucet/claim/route.ts` (line 6, 48)
- **Issue:** Route not gated on `NEXT_PUBLIC_IS_TESTNET`; `FAUCET_OPERATOR_PRIVATE_KEY` read from env regardless
- **Risk:** Private key exposed in production env if route enabled + env var misconfigured
- **Faucet Contract Revert:** Doesn't save you — private keys in env are leak surface independent
- **Fix Required:** Wrap handler in `if (process.env.NEXT_PUBLIC_IS_TESTNET !== 'true') return 404`; add build guard
- **Status:** Unresolved

---

## MEDIUM SEVERITY ISSUES

### [MEDIUM] A-4b: Body Cap Missing `validateContentType`
- **File:** `proxy.ts`
- **Issue:** CSP enforced but partial; combined with A-4, incomplete protection
- **Status:** Partial

### [MEDIUM] B-9: WebSocket Topic ACL 30s Staleness Window
- **File:** `websocket-server/src/index.ts` (line 39)
- **Issue:** Group membership changes take up to 30s to land; kicked user receives messages 30s after removal
- **Impact:** Disclosure risk in payments/governance system
- **Fix Required:** Move to real-time ACL or reduce staleness window
- **Status:** Unresolved

### [MEDIUM] B-10: setFeeBypass Activates Immediately, No Timelock
- **File:** `contracts/VFIDEToken.sol` (line 720-747)
- **Issue:** Owner can enable 7-day fee bypass with zero delay
- **Pre-Handover Risk:** Compromised dev key can drain protocol revenue for 7 days
- **Fix Required:** Apply 24-48h propose/apply timelock; cap one bypass per N days
- **Status:** Unresolved

### [MEDIUM] B-11: WithdrawalQueue Dead Code Shipped in Production
- **File:** `contracts/WithdrawalQueue.sol` (abstract, 387 lines)
- **Issue:** Referenced only by testnet stub; no production implementation exists
- **Audit Mess:** Auditors read 387 lines looking for implementation that doesn't exist
- **Fix Required:** Delete file, remove import from `DeployPhase1Infrastructure.sol`, drop env var
- **Status:** Unresolved

### [MEDIUM] B-12: H-9 Precision-Loss Fix Claim Doesn't Match Code
- **File:** `contracts/ProofScoreBurnRouter.sol` (line 563-565)
- **Issue:** Audit marked as "FIXED: multiply-then-divide". Code actually does BPS arithmetic then applies to amount
- **Impact:** Minor but incorrectly marked as resolved
- **Status:** Needs re-triage (partial/minor)

### [MEDIUM] B-13: Faucet Drainable Over Days if Operator Key Compromised
- **File:** `contracts/VFIDETestnetFaucet.sol`
- **Cap:** 100 claims × 1000e18 VFIDE + 0.5 ETH per day
- **Risk:** Unattended testnet runs for days; drain time roughly `(balance) / (dailyCap × claimAmount)` days
- **Status:** Acknowledged (H-22 operational risk)

### [MEDIUM] B-14: DeployPhase1Infrastructure Error Message Misleading
- **File:** `DeployPhase1Infrastructure.sol` (line 16)
- **Issue:** Unconditional revert with stub-disabled message, but `DeployPhase1.sol` calls this function
- **Confusion:** Auditors lose half day figuring out if Solidity path is dead or broken
- **Fix Required:** Either delete Solidity contract (TS-only deploy) or fix revert
- **Status:** Unresolved

### [MEDIUM] B-15: CSRFPolicy Comment Overstates Safety
- **File:** `lib/security/csrfPolicy.ts`
- **Issue:** Comment says "Skip CSRF only for pre-auth", but `/api/auth` (post-auth verify) exempted too
- **Accuracy:** Exemption is correct; comment is misleading
- **Fix Required:** Update comment or clarify exempt paths
- **Status:** Documentation only

### [MEDIUM] B-17: Marketing vs Code Claims Drift
- **Issues:**
  1. README claims CSP enforced; actually bypassed via chunked (A-4)
  2. Marketing says "non-custodial/no freeze"; BridgeSecurityModule has freeze (H-29 "ACCEPTED RISK")
  3. OwnerControlPanel.vault_freezeVault function name contradicts changed semantics
- **Status:** Documentation + naming

### [MEDIUM] B-18: `.env.example` Generic Placeholder Naming
- **File:** `.env.example` (line 174)
- **Issue:** `FAUCET_OPERATOR_PRIVATE_KEY=0x_BACKEND_OPERATOR_PRIVATE_KEY`
- **Problem:** Real values must start with `0x` + 64 hex; placeholder is confusing
- **Related:** Non-zero placeholder contract addresses; copy-paste deploys may fail silently without clean "not configured" error
- **Status:** Low impact but confusing

---

## LOW / INFORMATIONAL ISSUES

### [LOW] B-16: Slither Dead Code / Reentrancy Noise
- **Findings:** ReentrancyGuard dead code in SharedInterfaces, various reentrancy-benign/events suppressed
- **Status:** Noise layer; properly suppressed with comments
- **Action:** Run slither pass with project-tuned config; suppress acknowledged findings inline

### [LOW] Code TODO/FIXME Markers (80+)
- **Incomplete Routes:**
  - `app/(commerce)/pos/page.group.tsx` — online flow not wired
  - `components/checkout/CheckoutPanel.tsx` — actual contract call not wired
  - `components/(store)/[slug]/components/ProductCard.tsx` — cart context not wired
- **Test Placeholders:** 9+ `it.todo()` in test files
- **Coverage Gaps:** Test files document missing test cases
- **Status:** Normal development markers; track separately

### [LOW] Test Stubs & Generated Code
- **20+ Auto-Generated Test Stubs:** `*.generated.test.ts` (test scaffolding)
- **Mock Contracts:** `WithdrawalQueueStub`, `MockContracts.sol`
- **Status:** Expected; part of test infrastructure

### [LOW] Embedded Notes in Contract Code
- **Multiple `// NOTE:` and `// @dev` comments** documenting design decisions
- **Example:** `SharedInterfaces.sol` documenting three ReentrancyGuard implementations by design
- **Status:** Good documentation; no action needed

---

## DOCUMENTATION REFERENCES

### Files with Comprehensive Issue Catalogs
- [VFIDE_MAINNET_READINESS_FINDINGS.md](VFIDE_MAINNET_READINESS_FINDINGS.md) — Original audit findings + new Section B issues
- [docs/stub-mock-placeholder-report-2026-04-12.md](docs/stub-mock-placeholder-report-2026-04-12.md) — Placeholder audit
- [VFIDE_AUDIT_FINDINGS_FULL.md](VFIDE_AUDIT_FINDINGS_FULL.md) — Full audit findings
- [VFIDE_FRONTEND_VERCEL_FAILURES.md](VFIDE_FRONTEND_VERCEL_FAILURES.md) — Frontend build issues (mostly resolved)
- [AUDIT_FIXES_IMPLEMENTED.md](AUDIT_FIXES_IMPLEMENTED.md) — Remediation tracking

### Static Analysis Output
- `.tmp/slither-current.out` — 229 detector hits; most low-priority, many acknowledged

---

## REMEDIATION PRIORITY

### Immediate (Mainnet Blocker)
1. **A-3:** Add APP_ORIGIN to .env files + startup assertion
2. **A-6:** Extract libraries from EcosystemVault & MerchantPortal OR remove features
3. **A-2:** Decide: delete WithdrawalQueue OR ship production implementation

### Short-term (Before Production Deploy)
4. **A-1:** Verify CardBoundVault approval timelock in all paths
5. **A-5:** Implement second-signer or off-chain verifier for SystemHandover auditor
6. **B-1:** Convert StablecoinRegistry to DAO gate + decimals validation
7. **A-4:** Fix middleware to reject or handle chunked requests

### Medium-term
8. **B-7:** Remove `/api/streams` or demote to preview
9. **B-8:** Gate faucet route on testnet flag
10. **B-2:** Fix PayrollManager array GC
11. **B-3, B-4, B-5:** Apply token allowlist patterns

### Long-term / Nice-to-have
- Reduce Slither noise (B-16)
- Complete TODO/FIXME work
- Align marketing messaging (B-17)

---

## Statistics

| Severity | Count | Status |
|----------|-------|--------|
| Critical | 3 | Unresolved |
| High | 12 | Mostly unresolved |
| Medium | 10 | Unresolved |
| Low | 30+ | Development markers |
| **Total** | **60+** | Mixed |

---

## Next Steps

1. **Create GitHub Issues** from this document (template provided below)
2. **Assign Severity Labels** (critical, high, medium, low)
3. **Link to Audit Tracking** (reference VFIDE_MAINNET_READINESS_FINDINGS.md)
4. **Add to Roadmap** based on remediation priority
5. **Track Fixes** across PRs and commits

---

## GitHub Issue Template

```markdown
### Title
[CRITICAL/HIGH/MEDIUM] Brief Issue Title

### Description
Detailed description from GITHUB_ISSUES_SUMMARY.md

### Impact
- What breaks if not fixed
- Risk level

### Files Affected
- List of contract/component files

### Fix Required
- Specific remediation steps

### Related Issues
- Link to other related issues or findings
```

---

**Document Prepared:** April 27, 2026  
**Repository:** Scorpio861104/Vfide  
**Scope:** Complete codebase audit, all issue types
