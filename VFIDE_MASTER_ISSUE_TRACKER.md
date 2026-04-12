# VFIDE Master Issue Tracker

**Date:** April 11, 2026
**Total Issues:** 22
**Status:** All identified, none started

---

## MUST FIX — Blocks Launch / Legally Risky

### 1. Compile & Contract Size Check
- **Type:** Blocker
- **Where:** All 72 contracts
- **Problem:** Never compiled. 6+ contracts likely exceed 24KB EVM limit (EIP-170).
- **At-risk:** VFIDEToken (1348L), Seer (1344L), OwnerControlPanel (1248L), VaultInfrastructure (1324L), MainstreamPayments (1252L), EcosystemVault (1674L)
- **Fix:** Run `npx hardhat compile` locally. Extract view/pure functions into libraries for oversized contracts.
- **Effort:** Must run locally (network-blocked here). Library extraction: 1-2 hours per contract.
- **Status:** ⬜ Not started

---

### 2. ABI Regeneration
- **Type:** Blocker
- **Where:** `lib/abis/*.json`
- **Problem:** 6 new functions added by fixes have no ABI entries. Frontend calls to these functions fail silently.
- **Missing:** `approveERC20` (CBV), `executeRecoveryRotation` (CBV, VaultHub), `setDAO` (MerchantPortal), `rescueExcessTokens` (FraudRegistry), `applyEmergencyController`, `cancelEmergencyController` (all Ownable). `VFIDECommerce.json` has stale `ISecurityHub_COM`.
- **Fix:** After compile, copy artifacts to `lib/abis/` or run ABI generation script.
- **Effort:** 15 minutes after compile.
- **Status:** ⬜ Not started

---

### 3. Landing Page: "Email, phone, or wallet" — Only Wallet Works
- **Type:** False claim
- **Where:** `app/page.tsx` Step 1, `components/onboarding/OnboardingSystem.tsx`
- **Problem:** Claims "Email, phone, or wallet. No crypto experience needed." Only RainbowKit `<ConnectButton />` works. Embedded wallet code exists in `lib/embeddedWallet/` but Privy/Web3Auth not installed, provider not mounted.
- **Fix (option A):** Change Step 1 text to "Connect your wallet" and remove "No crypto experience needed."
- **Fix (option B):** Install Privy (`npm install @privy-io/react-auth`), mount provider, wire email/social login.
- **Effort:** Option A: 5 minutes. Option B: 2-4 hours.
- **Status:** ⬜ Not started

---

### 4. Buy Page: On-Ramp Stub
- **Type:** False claim
- **Where:** `app/buy/components/BuyTab.tsx`
- **Problem:** Says "Buy VFIDE tokens via on-ramp providers (MoonPay, Transak, Ramp)" but entire component is `{/* TODO: Implement BuyTab UI */}`. No SDK, no widget, no API.
- **Fix (option A):** Remove provider names, show "Coming Soon" placeholder.
- **Fix (option B):** Integrate MoonPay widget (`npm install @moonpay/moonpay-react`).
- **Effort:** Option A: 5 minutes. Option B: 4-8 hours.
- **Status:** ⬜ Not started

---

### 5. Swap Tab: DEX Stub
- **Type:** False claim
- **Where:** `app/buy/components/SwapTab.tsx`
- **Problem:** Says "Swap between tokens via DEX integration" but is `// TODO: Wire to API endpoint`. `lib/compliance/dex-routing.ts` has types only, zero execution code.
- **Fix (option A):** Label tab "Coming Soon" or remove it.
- **Fix (option B):** Integrate Uniswap widget or 1inch API.
- **Effort:** Option A: 5 minutes. Option B: 8-16 hours.
- **Status:** ⬜ Not started

---

### 6. Marketplace: Fetch Commented Out
- **Type:** Broken feature
- **Where:** `app/marketplace/page.tsx` line 24
- **Problem:** Landing page has "Browse marketplace" CTA linking to `/marketplace`. The page has `// TODO: wire to /api/merchant/products`. API route exists and works (`app/api/merchant/products/route.ts`). DB table exists. Fetch call is commented out.
- **Fix:** Uncomment/wire the fetch call: `fetch('/api/merchant/products?q=${query}&status=active')` and render results.
- **Effort:** 30-60 minutes.
- **Status:** ⬜ Not started

---

### 7. Stealth Addresses: Throws on Every Action
- **Type:** Broken feature
- **Where:** `app/stealth/page.tsx`, `lib/stealthAddresses.ts`
- **Problem:** Full UI renders but `generateStealthAddress` and `scanForStealthPayments` both throw: "Stealth addresses are temporarily disabled pending full EIP-5564 secp256k1 implementation."
- **Fix (option A):** Remove `/stealth` from navigation, add redirect to docs.
- **Fix (option B):** Add "Coming Soon" banner at top of page, disable action buttons.
- **Effort:** Option A: 10 minutes. Option B: 15 minutes.
- **Status:** ⬜ Not started

---

### 8. Merchant Payment Approval UI Missing
- **Type:** Broken feature
- **Where:** Entire merchant payment flow
- **Problem:** `MerchantPortal.pay()` calls `safeTransferFrom(customerVault, merchant, amount)`. Vault must have approved MerchantPortal as spender. No frontend flow exists. Every merchant payment reverts with "ERC20: insufficient allowance".
- **Fix:** Add approval step to vault settings or merchant checkout:
  - Call `CBV.approveVFIDE(MerchantPortal, maxUint256)` for VFIDE
  - Call `CBV.approveERC20(stablecoin, MerchantPortal, maxUint256)` for stablecoins
  - Add to vault onboarding wizard
- **Effort:** 2-4 hours (UI + hook + transaction flow).
- **Status:** ⬜ Not started

---

### 9. Sustainability Doc: Wrong Fee Split
- **Type:** Stale documentation
- **Where:** `docs/SUSTAINABILITY-MODEL.md`
- **Problem:** Claims "40% burn, 10% Sanctum, 50% ecosystem". Actual FeeDistributor code: 35% burn, 20% Sanctum, 15% DAO Payroll, 20% Merchant Pool, 10% Headhunter Pool. Landing page correctly shows 35%/20%.
- **Fix:** Update the document to match FeeDistributor defaults (35/20/15/20/10).
- **Effort:** 15 minutes.
- **Status:** ⬜ Not started

---

### 10. Landing Page: "20% To Charity" — Regulatory Risk
- **Type:** Legal/regulatory
- **Where:** `app/page.tsx` StatItem
- **Problem:** "Charity" implies tax-deductible nonprofit status. Sanctum Fund is a smart contract pool, not a registered charity. No 501(c)(3). Using "charity" could attract regulatory attention.
- **Fix:** Change label from "To Charity" to "Sanctum Fund" or "Community Protection".
- **Effort:** 2 minutes.
- **Status:** ⬜ Not started

---

## SHOULD FIX — Features Broken or Misleading

### 11. EcosystemVault.setOperationsWallet No Timelock
- **Type:** Security
- **Where:** `contracts/EcosystemVault.sol`
- **Problem:** Owner can redirect operations funds instantly. All other sensitive EcosystemVault setters have 2-day timelock (`SENSITIVE_CHANGE_DELAY`).
- **Fix:** Add propose/apply/cancel pattern matching `setManager` and `setCouncilManager`.
- **Effort:** 30 minutes.
- **Status:** ⬜ Not started

---

### 12. VFIDEBridge No Daily Aggregate Cap
- **Type:** Security
- **Where:** `contracts/VFIDEBridge.sol`
- **Problem:** Per-transaction limit (100K VFIDE) but no daily total. Compromised bridge operator could drain reserves in multiple transactions.
- **Fix:** Add `dailyBridgeLimit`, `dailyBridgeVolume`, `dailyBridgeResetTime` with 24h rolling window check in `bridge()`.
- **Effort:** 30 minutes.
- **Status:** ⬜ Not started

---

### 13. 5 API Routes Missing Rate Limiting
- **Type:** Security
- **Where:** `app/api/ussd/route.ts`, `app/api/subscriptions/route.ts`, `app/api/referral/route.ts`, `app/api/user/state/route.ts`, `app/api/stats/protocol/route.ts`
- **Problem:** All other 111 routes have `withRateLimit()`. These 5 don't.
- **Fix:** Add `withRateLimit(request, 'write')` or `withRateLimit(request, 'read')` at top of each handler.
- **Effort:** 15 minutes total.
- **Status:** ⬜ Not started

---

### 14. Subscriptions API: File Storage
- **Type:** Data loss
- **Where:** `app/api/subscriptions/route.ts`
- **Problem:** Uses `fs.writeFile` / `fs.readFile` to `.vfide-runtime/subscriptions.json`. Data lost on every Vercel/serverless redeploy.
- **Fix:** Replace with PostgreSQL via existing `lib/db.ts` `query()`. Create `subscriptions` table in migration.
- **Effort:** 1-2 hours.
- **Status:** ⬜ Not started

---

### 15. ~8 State-Changing Functions Missing Events
- **Type:** Monitoring gap
- **Where:** Multiple contracts
- **Problem:** Off-chain monitoring can't detect these state changes.
- **Functions:**
  - `BadgeManager.setQualificationRules`
  - `CircuitBreaker.updateTVL`
  - `CouncilSalary.setKeeper`
  - `CouncilSalary.setDAO`
  - `EcosystemVault.setOperationsCooldown`
  - `FeeDistributor.setMinDistributionAmount`
  - `Seer.setScoreCacheTTL`
  - `Seer.setPolicyGuard`
- **Fix:** Add event declaration and `emit` to each function.
- **Effort:** 30 minutes total.
- **Status:** ⬜ Not started

---

### 16. Feature List: "Collateral Management" — Doesn't Exist
- **Type:** Stale documentation
- **Where:** `docs/SYSTEM_FEATURE_LIST.md` Section 11
- **Problem:** Lists "Collateral management" as a feature. `VFIDETermLoan.sol` line 10 explicitly states: "No token collateral. Your ProofScore IS your collateral."
- **Fix:** Remove "Collateral management" or change to "ProofScore-based creditworthiness assessment".
- **Effort:** 2 minutes.
- **Status:** ⬜ Not started

---

### 17. Feature List: "Staking" — No Page, No Contract
- **Type:** Stale documentation
- **Where:** `docs/SYSTEM_FEATURE_LIST.md` Section 11
- **Problem:** Lists "Staking and rewards flows". No `/staking` page exists. No staking contract exists. `LiquidityIncentives.sol` has LP staking but no frontend.
- **Fix:** Remove "Staking" or change to "LP Incentives (contract only, no UI)".
- **Effort:** 2 minutes.
- **Status:** ⬜ Not started

---

### 18. Feature List: "Streaming Payment Interfaces"
- **Type:** Misleading documentation
- **Where:** `docs/SYSTEM_FEATURE_LIST.md` Section 8
- **Problem:** Implies standalone streaming payments. Only `PayrollManager.sol` has streaming (rate-per-second payroll). `/payroll` page exists but there's no generic streaming payments page.
- **Fix:** Change to "Payroll streaming payments".
- **Effort:** 2 minutes.
- **Status:** ⬜ Not started

---

### 19. Feature List: "Offline POS"
- **Type:** Misleading documentation
- **Where:** Referenced in prior session docs
- **Problem:** `lib/networkLatency.ts` detects network quality. POS page (`/pos`) exists. But no offline queue, no service worker, no cache-first strategy. POS fails if network is down.
- **Fix:** Remove "offline" from any POS descriptions.
- **Effort:** 2 minutes.
- **Status:** ⬜ Not started

---

### 20. "WhatsApp Receipts" — Just a Share Link
- **Type:** Misleading documentation
- **Where:** Referenced in prior session docs
- **Problem:** `components/social/ShareSystem.tsx` opens `wa.me/?text=...`. This is a share button, not a receipt delivery system. No WhatsApp Business API integration.
- **Fix:** Don't describe as "WhatsApp receipts" — call it "social sharing" or "share via WhatsApp".
- **Effort:** 2 minutes.
- **Status:** ⬜ Not started

---

## POST-DEPLOY — Run After Deployment

### 21. 26 Contracts Not in deploy-all.ts
- **Type:** Deployment gap
- **Where:** `scripts/deploy-all.ts`
- **Problem:** Only 15 core contracts deployed. 26 additional contracts need scripts.
- **Contracts:** OwnerControlPanel, VaultRecoveryClaim, SanctumVault, EcosystemVault, SeerAutonomous, SeerGuardian, SeerSocial, CouncilElection, CouncilManager, CouncilSalary, EmergencyControl, BadgeManager, VFIDEBadgeNFT, VaultRegistry, SystemHandover, SeerWorkAttestation, SeerView, SeerPolicyGuard, VFIDEBenefits, VFIDECommerce, VFIDEEnterpriseGateway, MainstreamPayments, AdminMultiSig, PayrollManager, SubscriptionManager, LiquidityIncentives
- **Fix:** Create phased deployment scripts (`deploy-phase2.ts` through `deploy-phase5.ts`).
- **Effort:** 4-8 hours total.
- **Status:** ⬜ Not started

---

### 22. transfer-governance.ts Not Run
- **Type:** Post-deploy action
- **Where:** `scripts/transfer-governance.ts`
- **Problem:** Script exists but hasn't been executed. Until run: all fee sinks point to deployer wallet, DAOTimelock admin is deployer, BurnRouter sinks are deployer, FeeDistributor destinations are deployer.
- **Fix:** Run after all deployments and apply phases complete.
- **Effort:** 10 minutes (run script + wait for timelocks).
- **Status:** ⬜ Not started

---

## Quick Reference

| # | Issue | Type | Effort | Can Fix Here |
|---|---|---|---|---|
| 1 | Compile & size check | Blocker | Local only | ❌ |
| 2 | ABI regeneration | Blocker | 15 min | ❌ |
| 3 | Email/phone login claim | False claim | 5 min or 4 hr | ✅ |
| 4 | Buy on-ramp stub | False claim | 5 min or 8 hr | ✅ |
| 5 | Swap DEX stub | False claim | 5 min or 16 hr | ✅ |
| 6 | Marketplace fetch | Broken feature | 30-60 min | ✅ |
| 7 | Stealth addresses | Broken feature | 10-15 min | ✅ |
| 8 | Merchant approval UI | Broken feature | 2-4 hr | ✅ |
| 9 | Sustainability doc split | Stale doc | 15 min | ✅ |
| 10 | "Charity" label | Legal risk | 2 min | ✅ |
| 11 | EcoVault ops timelock | Security | 30 min | ✅ |
| 12 | Bridge daily cap | Security | 30 min | ✅ |
| 13 | 5 routes rate limiting | Security | 15 min | ✅ |
| 14 | Subscriptions file storage | Data loss | 1-2 hr | ✅ |
| 15 | Missing events | Monitoring | 30 min | ✅ |
| 16 | Collateral claim | Stale doc | 2 min | ✅ |
| 17 | Staking claim | Stale doc | 2 min | ✅ |
| 18 | Streaming claim | Stale doc | 2 min | ✅ |
| 19 | Offline POS claim | Stale doc | 2 min | ✅ |
| 20 | WhatsApp receipts claim | Stale doc | 2 min | ✅ |
| 21 | 26 contracts deploy | Deploy gap | 4-8 hr | ✅ |
| 22 | Governance transfer | Post-deploy | 10 min | ✅ |
