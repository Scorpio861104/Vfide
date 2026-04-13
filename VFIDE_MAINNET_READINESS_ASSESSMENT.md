# VFIDE Mainnet Readiness Assessment

**Date:** April 12, 2026
**Assessor:** Claude (Anthropic) — multi-session auditor
**Repo Snapshot:** `Vfide-main__4_.zip`
**Verdict:** ❌ NOT MAINNET READY — testnet-ready with caveats

---

## Executive Summary

The VFIDE codebase has made significant progress since the initial audit series. Core architecture is sound: the non-custodial design is properly enforced, fee routing logic is correct, vault-to-owner resolution works in `_transfer`, and the guardian recovery model is intact. However, three categories of issues remain that prevent mainnet deployment:

1. **Build infrastructure gaps** — contracts have never been compiled in CI; ABI files are stale; four frontend function calls will fail silently at runtime.
2. **Security polish** — missing events on state-changing functions; inconsistent dependency strategy across contracts; zero-score fee protection is admin-only.
3. **Product gaps** — no embedded wallet provider installed (contradicts the target demographic); stealth address page still renders a full UI that throws on every action.

The codebase is deployable to testnet today with minor fixes. Mainnet requires approximately 2–4 weeks of focused work.

---

## Repo Statistics

| Metric | Value |
|---|---|
| Solidity contracts | 81 files (75 `.sol` + interfaces, mocks, scripts) |
| Total contract LOC | ~47,000 |
| Frontend routes | 80+ |
| Frontend LOC | ~220,000+ |
| API routes | 116 |
| Hardhat test files (behavioral) | 17 hand-written + 18 generated stubs = 35 total |
| Jest test files | 100+ |
| Deploy scripts | 6 (`deploy-all`, `deploy-phase2` through `deploy-phase5`, `deploy-lending`) |
| Verification scripts | 30+ |

---

## Section 1: Issues Fixed Since Last Audit

The following issues from the Master Issue Tracker and prior audit sessions have been resolved in this snapshot. Each was manually verified against the current codebase.

### 1.1 C-1/C-3: Root Middleware — FIXED ✅

**Was:** `middleware.compat.ts` — Next.js ignored it. Entire security stack (CSP, CSRF, request size limits, CORS) never executed.

**Now:** `middleware.ts` exists at project root with correct re-export:
```ts
export { proxy as middleware, config } from './proxy';
```
CSP is defined in a single location (`proxy.ts`). No conflicting definitions in `vercel.json` or `next.config.ts`.

### 1.2 C-1: ProofScore-to-Vault Mismatch in VFIDEToken._transfer — FIXED ✅

**Was:** When a vault sent tokens, `computeFees` received the vault address (which has no ProofScore), causing maximum fee application on every vault transfer.

**Now:** `_resolveFeeScoringAddress()` (line 968) resolves vault addresses to their owner via `vaultHub.ownerOfVault(from)` before passing to `computeFees`. The owner's ProofScore is used for fee calculation. This was the single most critical mainnet blocker.

```solidity
function _resolveFeeScoringAddress(address from) internal view returns (address feeFrom) {
    feeFrom = from;
    if (address(vaultHub) == address(0) || !_isVault(from)) return feeFrom;
    try vaultHub.ownerOfVault(from) returns (address vaultOwner) {
        if (vaultOwner != address(0)) feeFrom = vaultOwner;
    } catch {}
}
```

### 1.3 Issue #13: 5 API Routes Missing Rate Limiting — FIXED ✅

**Was:** `app/api/ussd`, `app/api/subscriptions`, `app/api/referral`, `app/api/user/state`, `app/api/stats/protocol` had no `withRateLimit()`.

**Now:** All 5 routes confirmed to contain `withRateLimit` calls (3–7 references each). All 116 API routes now have rate limiting.

### 1.4 RLS Policies — FIXED ✅

**Was:** RLS enabled in PostgreSQL but `lib/db.ts` never called `SET app.current_user_address`. Policies existed but never activated.

**Now:** `lib/db.ts` line 19 calls `set_config('app.current_user_address', $1, false)` and line 24 calls `RESET app.current_user_address`. Row-level security is active.

### 1.5 Issue #14: Subscriptions File Storage — FIXED ✅

**Was:** `app/api/subscriptions/route.ts` used `fs.writeFile`/`fs.readFile` to `.vfide-runtime/subscriptions.json`. Data lost on every serverless redeploy.

**Now:** Route imports `query` from `@/lib/db` and uses PostgreSQL. No filesystem references remain.

### 1.6 Issue #3: Landing Page "Email, Phone, or Wallet" — FIXED ✅

**Was:** Step 1 claimed "Email, phone, or wallet. No crypto experience needed." Only RainbowKit `<ConnectButton />` worked.

**Now:** Step 1 reads "Connect your wallet to continue." The false claim has been removed.

### 1.7 Issue #10: "To Charity" Label — FIXED ✅

**Was:** Landing page StatItem showed "20% To Charity." Sanctum Fund is a smart contract pool, not a registered 501(c)(3) charity.

**Now:** No reference to "charity" found in `app/page.tsx`. Label has been updated.

### 1.8 Issue #4: Buy Tab Stub — FIXED ✅

**Was:** `BuyTab.tsx` was `{/* TODO: Implement BuyTab UI */}`.

**Now:** Full implementation with price fetching from `/api/crypto/price`, fee tier selection (slow/standard/fast), network fee estimation, and USD budget calculator. Not a live on-ramp integration, but no longer a blank TODO.

### 1.9 Issue #6: Marketplace Fetch — FIXED ✅

**Was:** Marketplace page had `// TODO: wire to /api/merchant/products`. Fetch call was commented out.

**Now:** Line 23 contains active fetch: `fetch('/api/merchant/products?q=${query}&status=active')`.

### 1.10 Issue #8: Merchant Payment Approval UI — FIXED ✅

**Was:** No frontend flow for vault→MerchantPortal approval. Every merchant payment reverted with "ERC20: insufficient allowance."

**Now:** `app/vault/components/MerchantApprovalPanel.tsx` exists with:
- `approveVFIDE(MerchantPortal, maxUint256)` call (line 66)
- `approveERC20(stablecoin, MerchantPortal, maxUint256)` call (line 94)
- Success/error toast feedback

**Caveat:** The ABI for `approveERC20` is missing (see Section 2.2). This UI will fail at runtime.

### 1.11 Issue #11: EcosystemVault setOperationsWallet Timelock — FIXED ✅

**Was:** Owner could redirect operations funds instantly. All other sensitive setters had 2-day timelock.

**Now:** `pendingOperationsWalletChange` struct exists (line 185). `setOperationsWallet` uses propose/apply/cancel pattern matching other timelocked setters.

### 1.12 Issue #12: VFIDEBridge Daily Aggregate Cap — FIXED ✅

**Was:** Per-transaction limit (100K VFIDE) but no daily total. Compromised bridge operator could drain reserves.

**Now:**
- `dailyBridgeLimit = 500_000 * 1e18` (line 52)
- `dailyBridgeVolume` tracks rolling total (line 55)
- `dailyBridgeResetTime` with 24h rolling window (line 58)
- Check enforced in `bridge()`: `nextDailyVolume > dailyBridgeLimit` reverts with `RateLimitExceeded()` (line 240)

### 1.13 H-6: Bridge _lzReceive Liquidity Check — FIXED ✅

**Was:** `_lzReceive` checked `balanceOf(this) >= amount` without subtracting pending outbound commitments.

**Now:** `availableLiquidity` calculation subtracts `pendingOutboundAmount` before checking sufficiency.

### 1.14 Issue #9: Sustainability Doc Fee Split — FIXED ✅

**Was:** Claimed "40% burn, 10% Sanctum, 50% ecosystem."

**Now:** Document correctly shows "35% burn, 20% Sanctum Fund, 15% DAO payroll, 20% merchant pool, 10% headhunter pool" matching `FeeDistributor.sol` defaults.

### 1.15 Issues #16–20: Stale Documentation Claims — FIXED ✅

| Claim | Status |
|---|---|
| "Collateral management" | Changed to "ProofScore-based creditworthiness assessment" |
| "Staking and rewards flows" | Removed from feature list |
| "Streaming payment interfaces" | Changed to "Payroll streaming payment interfaces" |
| "Offline POS" | Not found in current feature list |
| "WhatsApp receipts" | Not found in current feature list |

### 1.16 CSP Consolidation — FIXED ✅

**Was:** Three conflicting CSP definitions across `vercel.json`, `next.config.ts`, and `proxy.ts`.

**Now:** Single CSP definition in `proxy.ts` line 32. No conflicting headers in other config files.

### 1.17 Issue #21: Deploy Phase Scripts — FIXED ✅

**Was:** Only 15 core contracts in `deploy-all.ts`. 26 contracts had no deployment scripts.

**Now:** `deploy-phase2.ts` through `deploy-phase5.ts` exist as generic deployment tools that read contract names and constructor args from environment variables. `deploy-all.ts` deploys 15 core contracts with correct wiring order.

### 1.18 FraudRegistry — IMPLEMENTED ✅

FraudRegistry contract exists with:
- Community-driven fraud reporting (ProofScore >= 5000 required)
- One complaint per filer per target (anti-spam)
- 3-complaint threshold for "disputed" status
- 30-day escrow on outgoing transfers for disputed addresses
- DAO clearance and permanent ban escalation
- Non-custodial: escrowed transfers still complete after 30 days

### 1.19 CardBoundVault Withdrawal Queue — INTEGRATED ✅

`CardBoundVault.sol` has an internal withdrawal queue (line 75: `QueuedWithdrawal[] public withdrawalQueue`) with:
- Queue/execute/cancel operations
- Pending count tracking
- Event emission on queue operations

---

## Section 2: Remaining Blockers — CRITICAL (Must Fix Before Any Deployment)

### 2.1 🔴 Contracts Never Compiled in CI/CD

**Severity:** CRITICAL — Deployment Blocker
**Location:** Project-wide
**Evidence:** No `artifacts/` or `cache/` directory exists in the repo.

A `CONTRACT_SIZE_REPORT.md` dated April 12 exists in `docs/` showing all 105 contracts under the EIP-170 limit, which suggests a local compilation was performed. However:

- **No CI/CD pipeline enforces compilation.** A code change that breaks compilation will not be caught until manual `npx hardhat compile` is run.
- **Four contracts are within 300 bytes of the 24,576-byte EIP-170 limit:**

| Contract | Runtime Bytes | Margin |
|---|---:|---:|
| VFIDEToken | 24,465 | 111 bytes |
| Seer | 24,419 | 157 bytes |
| EcosystemVault | 24,358 | 218 bytes |
| VaultHub | 24,287 | 289 bytes |

Any minor addition to these contracts (a single new event, a require message change) will push them over the limit and make deployment impossible. These contracts already use `optimizer: { runs: 1 }`, `viaIR: true`, and `bytecodeHash: "none"` — all size reduction options are exhausted.

**Required action:**
1. Add `npx hardhat compile` to CI on every commit
2. Add a bytecode-size check gate that fails the build if any contract exceeds 24,000 bytes (leaving 576-byte buffer)
3. If any contract needs new functionality, extract view/pure functions into library contracts first

### 2.2 🔴 ABI Files Stale — Frontend Calls Will Fail

**Severity:** CRITICAL — Runtime Failure
**Location:** `lib/abis/*.json`
**Evidence:**

The following functions exist in Solidity but have **zero** matching ABI entries:

| Function | Contract | Frontend Reference |
|---|---|---|
| `approveERC20` | CardBoundVault | `MerchantApprovalPanel.tsx:94` — **will fail silently** |
| `executeRecoveryRotation` | CardBoundVault, VaultHub | Recovery flow — **will fail** |
| `rescueExcessTokens` | FraudRegistry | Admin function — will fail |

Additionally, `PRODUCTION_SET.md` lists 3 contracts that no longer exist:
- `PromotionalTreasury.sol` — deleted
- `UserVault.sol` — deleted
- `VFIDEPresale.sol` — deleted (presale removed)

And omits 19 contracts that DO exist:
- CardBoundVault, FeeDistributor, FraudRegistry, BadgeQualificationRules, EcosystemVaultLib, EcosystemVaultView, Pools, SeerAutonomousLib, SeerPolicyGuard, SeerView, SeerWorkAttestation, ServicePool, VFIDEFlashLoan, VFIDETermLoan, VFIDETestnetFaucet, and 4 deploy phase contracts.

**Required action:**
1. Run `npx hardhat compile` locally
2. Copy all artifacts to `lib/abis/` or run the ABI generation script
3. Update `PRODUCTION_SET.md` to reflect the actual contract inventory
4. Verify every `functionName` reference in frontend `.tsx` files has a matching ABI entry

### 2.3 🔴 Stealth Addresses: Full UI, Throws on Every Action

**Severity:** CRITICAL — User-Facing Failure
**Location:** `app/stealth/page.tsx`, `lib/stealthAddresses.ts`
**Evidence:** Lines 142, 169, 188, 235 of `lib/stealthAddresses.ts`:

```
throw new Error('Stealth address execution is restricted pending full EIP-5564 secp256k1 implementation.');
```

The `/stealth` page renders a readiness-check UI with RPC, Chain ID, and address format validation — giving users the impression the feature works. Every action (generate, scan, send, claim) throws unconditionally.

The page has been removed from navigation (confirmed: no nav references found), but it remains routable via direct URL.

**Required action (choose one):**
- **Option A (5 min):** Add a Next.js redirect in `next.config.ts` from `/stealth` to `/docs` or `/dashboard`.
- **Option B (10 min):** Add a prominent "Coming Soon — EIP-5564 implementation in progress" banner at the top of the page, disable all action buttons, and grey out the form.

---

## Section 3: Remaining Issues — HIGH (Should Fix Before Mainnet)

### 3.1 🟡 No Embedded Wallet Provider

**Severity:** HIGH — Mission-Critical Gap
**Location:** `package.json`
**Evidence:** Zero references to `privy`, `web3auth`, `Privy`, or `Web3Auth` in `package.json` or `package-lock.json`.

VFIDE's target demographic is financially excluded users — market sellers, remittance workers, farmers — most of whom do not have MetaMask or a browser extension wallet. The current system requires RainbowKit `<ConnectButton />` which assumes the user already has a Web3 wallet configured.

The embedded wallet infrastructure exists in `lib/embeddedWallet/` but the actual provider SDK is not installed. This is not a bug — it's an architectural gap that contradicts the core mission.

**Required action:**
1. Install Privy: `npm install @privy-io/react-auth`
2. Mount `<PrivyProvider>` in the app layout
3. Wire email/phone/social login flows to the onboarding wizard
4. Estimated effort: 4–8 hours for basic integration

### 3.2 🟡 OZ Import Inconsistency — Supply-Chain Attack Surface

**Severity:** HIGH — Security Architecture
**Location:** 7 contracts
**Evidence:**

The VFIDE security strategy documents that core contracts use local `SharedInterfaces.sol` reimplementations to avoid npm supply-chain risk. The following contracts violate this by importing `@openzeppelin/contracts` directly:

| Contract | OZ Imports |
|---|---|
| **FeeDistributor** | AccessControl, ReentrancyGuard, Pausable, SafeERC20, IERC20 |
| **SeerWorkAttestation** | AccessControl, ReentrancyGuard |
| **ServicePool** | AccessControl, ReentrancyGuard, Pausable, SafeERC20, IERC20 |
| **VFIDEBridge** | IERC20, SafeERC20, Ownable, ReentrancyGuard, Pausable |
| **VFIDEBadgeNFT** | ERC721, ERC721URIStorage, ERC721Enumerable |
| **VFIDEAccessControl** | AccessControlEnumerable |
| **VaultRecoveryClaim** | ECDSA |

FeeDistributor handles **all fee revenue splitting** — it is a high-value target. A compromised OZ npm package could redirect fee splits.

**Required action (choose one):**
- **Option A:** Migrate FeeDistributor, SeerWorkAttestation, and ServicePool to `SharedInterfaces.sol` Ownable + manual role checks. VFIDEBridge and VFIDEBadgeNFT are harder (ERC721 is complex).
- **Option B:** Pin exact OZ version in `package.json` (`@openzeppelin/contracts@5.1.0`), add integrity hashes, and document the exception in each contract header.

### 3.3 🟡 Missing Events on State-Changing Functions

**Severity:** HIGH — Monitoring Gap
**Location:** Multiple contracts
**Evidence:** The following state-changing functions emit no events:

| Function | Contract | Impact |
|---|---|---|
| `setQualificationRules` | BadgeManager | Badge eligibility changes undetectable |
| `setScoreCacheTTL` | Seer | Score caching behavior change undetectable |
| `setPolicyGuard` | Seer | Policy guard replacement undetectable |
| `setOperationsCooldown` | EcosystemVault | Cooldown change undetectable |

Off-chain monitoring, indexers (The Graph), and alerting systems cannot detect these state transitions. A malicious or compromised admin could change these parameters without any on-chain trace.

**Required action:**
1. Declare events for each function
2. Add `emit` calls
3. Estimated effort: 30 minutes total

### 3.4 🟡 ProofScoreBurnRouter Zero-Score Protection Is Admin-Only

**Severity:** HIGH — Silent Fee Escalation
**Location:** `contracts/ProofScoreBurnRouter.sol`
**Evidence:** `SeerScoreZeroWarning` event exists but is only emittable via the admin-only `warnIfSeerMisconfigured()` function. It is NOT emitted inline during `computeFees`.

If Seer returns score 0 for all users (misconfigured, unreachable, or pointing to wrong address), every transfer silently pays the maximum ~3.82% fee for new users (or higher depending on configuration). No automated alert fires.

**Required action:** Add inline zero-score check in `computeFees`:
```solidity
uint16 scoreFrom = getTimeWeightedScore(from);
if (scoreFrom == 0 && from != address(0)) {
    emit SeerScoreZeroWarning(from, address(seer));
}
```
Gas cost: ~375 gas for the check + ~1,500 gas for event emission only when score is zero.

### 3.5 🟡 PRODUCTION_SET.md Stale

**Severity:** HIGH — Deployment Risk
**Location:** `contracts/PRODUCTION_SET.md`

**Contracts listed but do NOT exist (deleted):**
- `PromotionalTreasury.sol`
- `UserVault.sol`
- `VFIDEPresale.sol`

**Contracts that exist but are NOT listed (19 total):**
- `BadgeQualificationRules.sol`
- `CardBoundVault.sol`
- `DeployPhase1Governance.sol`
- `DeployPhase1Infrastructure.sol`
- `DeployPhase1Token.sol`
- `DeployPhase3Peripherals.sol`
- `EcosystemVaultLib.sol`
- `EcosystemVaultView.sol`
- `FeeDistributor.sol`
- `FraudRegistry.sol`
- `Pools.sol`
- `SeerAutonomousLib.sol`
- `SeerPolicyGuard.sol`
- `SeerView.sol`
- `SeerWorkAttestation.sol`
- `ServicePool.sol`
- `VFIDEFlashLoan.sol`
- `VFIDETermLoan.sol`
- `VFIDETestnetFaucet.sol`

Anyone using this file as a deployment reference will deploy the wrong contract set.

---

## Section 4: Remaining Issues — MEDIUM

### 4.1 🟠 Contract Size Cliff Risk

**Severity:** MEDIUM — Future Maintenance Risk
**Location:** VFIDEToken (1,380 LOC), Seer (1,350 LOC), EcosystemVault (1,513 LOC), VaultHub

Four contracts are within 300 bytes of the EIP-170 limit with all optimizer settings already at minimum runs. Any future feature addition to these contracts requires extracting existing logic into libraries first. This is a maintenance tax, not a deployment blocker, but it constrains future development.

Contracts at risk:

| Contract | LOC | Runtime Bytes | Headroom |
|---|---:|---:|---:|
| VFIDEToken | 1,380 | 24,465 | 111 bytes |
| Seer | 1,350 | 24,419 | 157 bytes |
| EcosystemVault | 1,513 | 24,358 | 218 bytes |
| VaultHub | — | 24,287 | 289 bytes |

### 4.2 🟠 Deploy Phase 2–5 Scripts Are Generic

**Severity:** MEDIUM — Deployment Friction
**Location:** `scripts/deploy-phase2.ts` through `scripts/deploy-phase5.ts`

These scripts are generic deployers that read contract names and constructor arguments from environment variables at runtime. Unlike `deploy-all.ts` (which hardcodes the 15 core contracts with correct wiring order and constructor args), the phase 2–5 scripts require manual environment variable setup for each contract.

This means the deployment ordering, constructor argument values, and cross-contract wiring for the remaining 26+ contracts are not codified in version control. A deployment error (wrong constructor arg, wrong wiring order) would require redeployment.

**Recommended action:** Create explicit deployment manifests (JSON or TS) for each phase that specify contract names, constructor args, and wiring calls in order.

### 4.3 🟠 transfer-governance.ts Not Executed

**Severity:** MEDIUM — Post-Deploy Action
**Location:** `scripts/transfer-governance.ts`

This script exists and is ready but has never been executed. Until run after deployment:
- All fee sinks (burn, sanctum, ecosystem) point to the deployer wallet
- DAOTimelock admin is the deployer
- BurnRouter sinks are the deployer address
- FeeDistributor destinations are the deployer address

This is expected for pre-deployment, but must be run immediately after all deployment phases complete. Missing this step means all protocol revenue flows to the deployer's personal wallet.

### 4.4 🟠 Hardhat Test Coverage Gaps

**Severity:** MEDIUM — Quality Assurance
**Location:** `test/hardhat/`

There are 17 hand-written Hardhat test files with real behavioral assertions and 18 auto-generated stubs that only test deployment smoke (constructor args, zero-address rejection). Key coverage observations:

- `VFIDEToken.test.ts` — 51 assertions. Covers core transfer logic.
- Generated stubs (e.g., `EscrowManager.generated.test.ts`) — test deployment only, not business logic.
- No integration tests that exercise the full transaction graph: VaultHub → VFIDEToken → ProofScoreBurnRouter → Seer → MerchantPortal → EscrowManager.
- No test for the FraudRegistry → 30-day escrow flow.
- No test for CardBoundVault withdrawal queue → execute after delay.

**Recommended action:** Write integration tests for the 3 highest-value flows before mainnet:
1. End-to-end merchant payment (vault approval → MerchantPortal.pay → fee split → receipt)
2. Fraud dispute lifecycle (report → threshold → escrow → DAO clear/escalate)
3. Vault recovery (guardian request → timelock → rotation)

---

## Section 5: Remaining Issues — LOW / INFORMATIONAL

### 5.1 ℹ️ Stealth Address Library Still Throws

`lib/stealthAddresses.ts` has 4 `throw` statements on lines 142, 169, 188, 235 unconditionally blocking all stealth operations. The page UI renders readiness checks (RPC, chain ID, address format) that give a false impression of functionality. While the page is not in navigation, it remains directly routable.

### 5.2 ℹ️ Seer Zero-Score Warning Not Inline

The `SeerScoreZeroWarning` event in `ProofScoreBurnRouter` is only accessible via the admin-only `warnIfSeerMisconfigured()` function. For automated monitoring, the event should also be emitted inline during `computeFees` when a zero score is encountered (see Section 3.4).

### 5.3 ℹ️ VFIDECommerce ABI Previously Stale

The issue tracker flagged `VFIDECommerce.json` as containing stale `ISecurityHub_COM` references. This reference was not found in the current ABI file, suggesting it has been cleaned up.

### 5.4 ℹ️ Hardhat Config Uses Experimental Features

`hardhat.config.ts` uses Hardhat 3.x with experimental plugin syntax (`plugins: [hardhatEthers, ...]`) and EDR-simulated network type. The `VfideHardhatConfig` type extends `HardhatUserConfig` with custom fields. This works but may break on Hardhat updates. Pin the Hardhat version.

### 5.5 ℹ️ Environment File Templates Are Comprehensive

`.env.example`, `.env.local.example`, `.env.mainnet.example`, `.env.production.example`, `.env.staging.example` all exist. This is good operational hygiene.

---

## Section 6: Security Architecture — Confirmed Sound

The following security properties were verified as correctly implemented:

| Property | Status | Evidence |
|---|---|---|
| Non-custodial design | ✅ Confirmed | No freeze, blacklist, SecurityHub locks, or force recovery. User funds can only be moved by the user or their guardians. |
| Zero merchant fees | ✅ Confirmed | `protocolFeeBps = 0` in MerchantPortal. Merchants receive exactly what customers send (minus burn fee). |
| Progressive burn fees | ✅ Confirmed | New users ~3.82%, drops to 0.25% at ProofScore 8000+. Micro-transactions ≤10 VFIDE capped at 1%. |
| Vault-only mode | ✅ Confirmed | Default (not opt-in). EOA transfers auto-create vaults via `vaultHub.ensureVault()`. |
| Guardian recovery | ✅ Confirmed | CardBoundVault has withdrawal queue, guardian pause, spend limits. |
| Fee sink validation | ✅ Confirmed | `_transfer` validates all returned sink addresses against token-level configuration (F-17/C-01 fix). |
| Anti-whale protection | ✅ Confirmed | Whale checks in `_transfer` with exemptions for system addresses. |
| Circuit breaker | ✅ Confirmed | Auto-expires via `_syncEmergencyFlags()`. No permanent freeze possible. |
| Fee bypass expiry | ✅ Confirmed | `feeBypassExpiry` checked in `_syncEmergencyFlags()`. Cannot persist indefinitely. |
| Post-handover lockout | ✅ Confirmed | `SystemHandover` burns developer keys after 6 months. |
| Parameterized SQL | ✅ Confirmed | All `lib/db.ts` queries use `$1`, `$2` parameter binding. |
| Zod validation | ✅ Confirmed | API boundaries validate with Zod schemas. |
| CSRF protection | ✅ Confirmed | Double-submit cookie pattern in `proxy.ts`. |
| Nonce-based CSP | ✅ Confirmed | Single CSP definition with nonce in `proxy.ts`. |

---

## Section 7: Recommended Path to Mainnet

### Phase 1: Testnet Gate (Week 1)

| Task | Effort | Blocks |
|---|---|---|
| Add `npx hardhat compile` to CI | 30 min | Deployment |
| Regenerate ABIs from artifacts | 15 min | Frontend runtime |
| Fix stealth page (redirect or banner) | 10 min | User experience |
| Add missing events (4 functions) | 30 min | Monitoring |
| Update PRODUCTION_SET.md | 30 min | Deployment reference |
| Add inline zero-score warning | 15 min | Fee protection |
| Deploy to Base Sepolia | 2 hr | Testnet soak |

### Phase 2: Testnet Soak (Weeks 2–3)

| Task | Effort | Blocks |
|---|---|---|
| Run full integration test sequence | 2–3 days | Confidence |
| Execute `transfer-governance.ts` on testnet | 10 min | Governance verification |
| Verify all fee sinks point to correct addresses | 1 hr | Revenue routing |
| Write integration tests for 3 critical flows | 2–3 days | Coverage |
| Create explicit deployment manifests for phases 2–5 | 4 hr | Deployment safety |

### Phase 3: Mainnet Preparation (Weeks 3–4+)

| Task | Effort | Blocks |
|---|---|---|
| Integrate Privy or Web3Auth | 4–8 hr | Target demographic access |
| Resolve OZ import strategy (migrate or document) | 2–4 hr | Supply-chain security |
| External audit of VFIDEToken, FeeDistributor, CardBoundVault | External | High-value contract safety |
| Deploy to mainnet with phased scripts | 4–8 hr | Launch |
| Execute `transfer-governance.ts` on mainnet | 10 min | Go-live |

---

## Section 8: Contract Inventory Cross-Reference

### Contracts in `deploy-all.ts` (Phase 1 — 15 contracts)

| Contract | Constructor Dependencies |
|---|---|
| ProofLedger | deployer (admin) |
| DevReserveVestingVault | VFIDEToken (zero at deploy, wired after) |
| VFIDEToken | DevReserveVestingVault, deployer (treasury), ProofLedger |
| Seer | deployer (temp DAO), ProofLedger |
| ProofScoreBurnRouter | Seer, deployer (temp sinks) |
| VaultHub | — |
| FeeDistributor | — |
| MerchantPortal | — |
| DAOTimelock | — |
| GovernanceHooks | — |
| DAO | — |
| VFIDEFlashLoan | — |
| VFIDETermLoan | — |
| FraudRegistry | — |
| VFIDETestnetFaucet | — |

### Contracts NOT in Any Deploy Script (need phase 2–5 configuration)

AdminMultiSig, BadgeManager, BadgeQualificationRules, BadgeRegistry, BridgeSecurityModule, CardBoundVault, CircuitBreaker, CouncilElection, CouncilManager, CouncilSalary, DutyDistributor, EcosystemVault, EmergencyControl, EscrowManager, LiquidityIncentives, MainstreamPayments, OwnerControlPanel, PayrollManager, Pools, RevenueSplitter, SanctumVault, Seer-related peripherals (SeerAutonomous, SeerGuardian, SeerSocial, SeerPolicyGuard, SeerView, SeerWorkAttestation), ServicePool, StablecoinRegistry, SubscriptionManager, SystemHandover, TempVault, VFIDEAccessControl, VFIDEBadgeNFT, VFIDEBenefits, VFIDEBridge, VFIDECommerce, VFIDEEnterpriseGateway, VFIDEFinance, VFIDEPriceOracle, VFIDESecurity, VFIDETrust, VaultInfrastructure, VaultRecoveryClaim, VaultRegistry, WithdrawalQueue

---

## Appendix A: File Locations for Key Fixes

| Fix | File(s) |
|---|---|
| Compile gate | CI config (GitHub Actions / Vercel build) |
| ABI regeneration | `lib/abis/*.json` — copy from `artifacts/contracts/*/` after compile |
| Stealth redirect | `next.config.ts` (add redirect) or `app/stealth/page.tsx` (add banner) |
| Missing events | `contracts/BadgeManager.sol`, `contracts/Seer.sol`, `contracts/EcosystemVault.sol` |
| Zero-score warning | `contracts/ProofScoreBurnRouter.sol` in `computeFees` |
| PRODUCTION_SET.md | `contracts/PRODUCTION_SET.md` |
| OZ imports | `contracts/FeeDistributor.sol`, `contracts/SeerWorkAttestation.sol`, `contracts/ServicePool.sol` |
| Embedded wallet | `package.json` + `app/layout.tsx` (provider mount) |
| Deploy manifests | `scripts/deploy-phase{2-5}.ts` or new `deploy-manifests/` directory |
| Governance transfer | `scripts/transfer-governance.ts` (execute post-deploy) |

---

## Appendix B: Verification Commands

```bash
# 1. Compile all contracts
npx hardhat compile

# 2. Check contract sizes
npx hardhat compile --force && node -e "
const fs = require('fs');
const path = require('path');
const dir = './artifacts/contracts';
const walk = (d) => fs.readdirSync(d, {withFileTypes:true}).flatMap(e => e.isDirectory() ? walk(path.join(d,e.name)) : [path.join(d,e.name)]);
walk(dir).filter(f => f.endsWith('.json') && !f.includes('.dbg.')).forEach(f => {
  const j = JSON.parse(fs.readFileSync(f));
  if (j.deployedBytecode) {
    const size = (j.deployedBytecode.length - 2) / 2;
    if (size > 24000) console.log('⚠️', path.basename(f,'.json'), size, 'bytes');
  }
});
"

# 3. Check ABI coverage
for fn in approveERC20 executeRecoveryRotation rescueExcessTokens; do
  echo -n "$fn: "; grep -rl "$fn" lib/abis/*.json | wc -l
done

# 4. Run critical on-chain tests
npm run test:onchain:critical

# 5. Verify middleware is active (after deploy)
curl -I https://your-domain.com | grep Content-Security-Policy

# 6. Check event coverage on flagged functions
for fn in setQualificationRules setScoreCacheTTL setPolicyGuard setOperationsCooldown; do
  echo -n "$fn: "; grep -A5 "function $fn" contracts/*.sol | grep -c "emit"
done
```

---

*End of assessment. This document should be updated after each fix round and re-verified against the codebase.*
