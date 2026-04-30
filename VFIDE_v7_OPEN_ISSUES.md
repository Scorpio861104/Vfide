# VFIDE v7 — Still Open

Compared `Vfide-main__6_.zip` → `Vfide-main__7_.zip`. Substantial progress: 9 of 15 v6 issues fully closed. **One v6 blocker still unfixed and one new blocker found.** 4 v6 items remain open, 1 partially fixed.

---

## 1. INFRA-01 — `middleware.ts` STILL missing (unchanged from v6)

**Severity:** Blocker

**Location:** repo root has no `middleware.ts`. `app/layout.tsx:17` reads `(await headers()).get('x-nonce')`. `next.config.ts:80` sets strict CSP `default-src 'self'; object-src 'none'; base-uri 'self'; frame-ancestors 'none';`.

**Problem:** identical to v6. The strict CSP has no `script-src`, so it inherits `default-src 'self'` and blocks every Next.js inline bootstrap script. The layout reads a nonce header that's never set. Production page renders blank. CSRF, content-length cap, content-type validation, and CORS that lived in the deleted `proxy.ts` are still gone.

**Fix:** create `middleware.ts` at the repo root. Recover the deleted security checks from `git show <pre-v6>:proxy.ts` and combine with nonce injection. The exact code I gave for v6 is still the correct fix:

```typescript
// middleware.ts
import { NextResponse, type NextRequest } from 'next/server';

const isProd = process.env.NODE_ENV === 'production';

function buildCsp(nonce: string): string {
  return [
    `default-src 'self'`,
    `script-src 'self' 'nonce-${nonce}' 'strict-dynamic' ${isProd ? '' : "'unsafe-eval'"}`,
    `style-src 'self' 'unsafe-inline'`,
    `img-src 'self' data: https:`,
    `font-src 'self' data:`,
    `connect-src 'self' https: wss:`,
    `frame-ancestors 'none'`,
    `object-src 'none'`,
    `base-uri 'self'`,
    `form-action 'self'`,
  ].join('; ');
}

export function middleware(request: NextRequest) {
  const nonce = Buffer.from(crypto.getRandomValues(new Uint8Array(16))).toString('base64');
  const requestHeaders = new Headers(request.headers);
  requestHeaders.set('x-nonce', nonce);

  // PORT FROM DELETED proxy.ts:
  // - CSRF double-submit cookie check on POST/PUT/PATCH/DELETE
  // - Content-Length presence + max-size enforcement
  // - Content-Type allowlist (application/json, multipart/form-data)
  // - CORS allowlist for /api/*

  const response = NextResponse.next({ request: { headers: requestHeaders } });
  response.headers.set('Content-Security-Policy', buildCsp(nonce));
  return response;
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|woff2?|ttf)).*)'],
};
```

This is the same fix I prescribed for v6. It still hasn't landed. Production cannot deploy until it does.

**Verify:** deploy preview loads (not blank). `curl -I /` shows `Content-Security-Policy: ... 'nonce-<base64>' ...`. Page source: every `<script>` has matching `nonce` attribute.

---

## 2. NEW BLOCKER — Merchant payment flow broken: `MerchantPortal.pay` requires impossible approvals

**Severity:** Blocker

**Location:** `lib/escrow/useEscrow.ts:133-138`, `hooks/useMerchantHooks.ts:287-293`, `contracts/MerchantPortal.sol:677,682,838,1010,1052`, `contracts/CardBoundVault.sol:499-505`.

**Problem:** the v6 fix routed `useEscrow.createEscrow` and `payMerchant` through `MerchantPortal.pay()`. But `MerchantPortal._processPaymentInternal` resolves `customerVault = vaultHub.vaultOf(customer)` and then calls `IERC20(token).safeTransferFrom(customerVault, ...)`. That requires the `customerVault` to have approved the MerchantPortal as an ERC-20 spender.

The only way to grant that approval is `CardBoundVault.approveVFIDE(spender, amount)` (line 499) which **queues the approval through `_queueTokenApproval` with a `SENSITIVE_ADMIN_DELAY = 7 days` timelock**. So:

- Customer: connects wallet, opens merchant payment screen, clicks "Pay 100 VFIDE."
- Frontend: calls `useEscrow.createEscrow` → `writeContractAsync({ functionName: 'pay', ... })`.
- Onchain: `safeTransferFrom(customerVault, feeSink, fee)` → reverts with `ERC20InsufficientAllowance` because no allowance exists.
- Customer can't fix this. Even calling `approveVFIDE` (which they'd need to do as the vault admin) would queue a 7-day-pending approval before the next payment could process.

**Result:** every merchant payment in the app reverts. The fact that `useEscrow` was migrated correctly to call `MerchantPortal.pay` is moot because the contract function doesn't accept the type of authorization the customer can actually provide.

The architectural mismatch: VFIDE customers transfer via signed `TransferIntent` (EIP-712, nonced, walletEpoch-bound) → `CardBoundVault.executeVaultToVaultTransfer`. That's how `useVaultOperations.ts:183-217` does vault-to-vault transfers correctly. But that path is direct vault-to-vault, not a merchant-portal-mediated payment — it bypasses `MerchantPortal._checkMerchantScore`, fee routing, fraud checks, the merchant-stats tally, etc.

**Fix:** add a transfer-intent variant to `MerchantPortal.pay` that the customer's wallet signs and the merchant (or a relayer) submits. New solidity function:

```solidity
// contracts/MerchantPortal.sol
struct PayIntent {
    address customer;
    address customerVault;
    address merchant;
    address token;
    uint256 amount;
    uint256 nonce;        // unique per customer
    uint64 walletEpoch;   // CardBoundVault wallet epoch at signing time
    uint64 deadline;
    string orderId;
}

function payWithIntent(PayIntent calldata intent, bytes calldata signature) external nonReentrant returns (uint256 netAmount) {
    if (!merchants[intent.merchant].registered) revert MERCH_NotRegistered();
    if (merchants[intent.merchant].suspended) revert MERCH_Suspended();
    if (intent.deadline < block.timestamp) revert MERCH_Expired();

    _checkMerchantScore(intent.merchant);

    // Verify customer's signature against the merchant-portal domain.
    bytes32 digest = _payIntentDigest(intent);
    address signer = _recoverSigner(digest, signature);
    if (signer != intent.customer) revert MERCH_InvalidSignature();

    // Verify the customer's vault is the one referenced and authorize the pull.
    address resolvedVault = vaultHub.vaultOf(intent.customer);
    if (resolvedVault != intent.customerVault) revert MERCH_VaultMismatch();

    // Tell the vault: "the merchant portal is authorized to pull this exact amount once."
    // This requires CardBoundVault to expose a single-shot authorization that consumes nonce.
    ICardBoundVaultIntent(intent.customerVault).authorizePullByIntent(
        address(this),
        intent.token,
        intent.amount,
        intent.nonce,
        intent.walletEpoch,
        signature
    );

    // Now safeTransferFrom succeeds for exactly intent.amount.
    return _processPaymentInternal(intent.customer, intent.merchant, intent.token, intent.amount, intent.orderId);
}
```

Plus a new `CardBoundVault.authorizePullByIntent` that:
- Validates the intent matches the signature, nonce, walletEpoch, deadline.
- Sets a one-shot allowance directly (`forceApprove` or single-use approval, NOT through `_queueTokenApproval`).
- Increments nonce so the intent can't be replayed.

Frontend: replace `writeContractAsync({ functionName: 'pay' })` with:

```typescript
// lib/escrow/useEscrow.ts
const intent = {
  customer: address,
  customerVault: vaultAddress,
  merchant,
  token: tokenAddress,
  amount: amountWei,
  nonce: await getNextNonce(vaultAddress),
  walletEpoch: await getWalletEpoch(vaultAddress),
  deadline: BigInt(Math.floor(Date.now() / 1000) + 600),
  orderId,
};

const signature = await signTypedDataAsync({
  domain: {
    name: 'VFIDE MerchantPortal',
    version: '1',
    chainId,
    verifyingContract: portalAddress,
  },
  types: {
    PayIntent: [
      { name: 'customer', type: 'address' },
      { name: 'customerVault', type: 'address' },
      { name: 'merchant', type: 'address' },
      { name: 'token', type: 'address' },
      { name: 'amount', type: 'uint256' },
      { name: 'nonce', type: 'uint256' },
      { name: 'walletEpoch', type: 'uint64' },
      { name: 'deadline', type: 'uint64' },
      { name: 'orderId', type: 'string' },
    ],
  },
  primaryType: 'PayIntent',
  message: intent,
});

const hash = await writeContractAsync({
  address: portalAddress,
  abi: MerchantPortalABI,
  functionName: 'payWithIntent',
  args: [intent, signature],
});
```

**Alternative (simpler, more invasive):** rewrite `MerchantPortal._processPaymentInternal` to NOT use `safeTransferFrom` from the vault, but instead require the customer to send funds in a different way. The two reasonable options:

- **Push model:** customer's vault sends tokens directly to MerchantPortal which then forwards. Requires the customer to call `executeVaultToVaultTransfer` to portal first, then call `pay()`. Two transactions per payment — bad UX.
- **Pre-approved spender:** make MerchantPortal a vault-system spender that doesn't need per-payment approval (similar to how `BurnRouter` works for fees). This requires an allowlist mechanism in `CardBoundVault` that's narrower than blanket allowance.

Either way, **this is the gating fix for the merchant payment feature.** v6's "useEscrow now routes through MerchantPortal" was a refactor that connected two things that don't compose.

**Verify:** end-to-end test of buyer-to-merchant payment. Customer with a CardBoundVault funded with VFIDE pays a registered merchant. Tokens move from customer vault to merchant vault in a single user transaction (or single signed intent + one onchain submission). No `ERC20InsufficientAllowance` revert.

---

## 3. DB-04 — `withAuth` codemod incomplete (33 routes still unmigrated)

**Severity:** High

**Location:** 33 of 123 API routes still use `requireAuth`/`requireOwnership` without `withAuth`. Examples:

```
app/api/analytics/portfolio/[address]/route.ts
app/api/proposals/route.ts
app/api/enterprise/orders/route.ts
app/api/quests/claim/route.ts
app/api/merchant/{digital,loyalty,expenses,coupons,webhooks,customers,receipts,installments,orders,returns,locations,subscriptions,staff}/route.ts
app/api/remittance/beneficiaries/route.ts
... (33 total)
```

`withOwnership` wrapper from the v6 fix proposal was never added to `lib/auth/middleware.ts`.

**Problem:** these routes still rely on the implicit fallback in `lib/db.ts:35` re-extracting JWT from `headers()` per query. Same fragility risk as before. **Worse:** with `FORCE ROW LEVEL SECURITY` now applied (the v6 fix), if the implicit fallback ever fails to set `app.current_user_address`, those routes will hit RLS-denied queries instead of silently leaking data — better fail mode, but still a fragility risk.

**Fix:** complete the codemod. Add `withOwnership` to `lib/auth/middleware.ts`:

```typescript
export function withOwnership(
  extractAddress: (req: NextRequest, ctx: { params?: Record<string, string> }) => string | Promise<string>,
  handler: (req: NextRequest, user: JWTPayload, ctx: { params?: Record<string, string> }) => Promise<NextResponse>
) {
  return async (request: NextRequest, ctx: { params?: Record<string, string> } = {}) => {
    const address = await extractAddress(request, ctx);
    const authResult = await requireOwnership(request, address);
    if (authResult instanceof NextResponse) return authResult;
    const { runWithDbUserAddressContext } = await import('@/lib/db');
    return runWithDbUserAddressContext(authResult.user.address, () => handler(request, authResult.user, ctx));
  };
}
```

Migrate the 33 routes. Example for `analytics/portfolio/[address]`:

```diff
-export async function GET(request: NextRequest, { params }: { params: Promise<{ address: string }> }) {
-  const rateLimit = await withRateLimit(request, 'api');
-  if (rateLimit) return rateLimit;
-  try {
-    const { address } = await params;
-    // ... validate address ...
-    const authResult = await requireOwnership(request, normalizedAddress);
-    if (authResult instanceof NextResponse) return authResult;
-    const result = await query('...');
-    // ...
-  } catch { /* ... */ }
-}
+export const GET = withOwnership(
+  async (req, ctx) => (await ctx.params!).address.toLowerCase(),
+  async (request, user, { params }) => {
+    const rateLimit = await withRateLimit(request, 'api');
+    if (rateLimit) return rateLimit;
+    const { address } = await params!;
+    // ... handler logic, RLS context auto-applied ...
+  }
+);
```

**Verify:** add a runtime warning in `lib/db.ts:query()` that fires when `dbUserContext.getStore()` is unset on an authenticated query path. After the codemod, the warning never fires.

---

## 4. ABI-07 — Future contract ABIs still validated and re-exported by main ABI index

**Severity:** Low

**Location:** `lib/abis/index.ts:11,19,20,21,115,123,124,125,191,199,*`.

**Problem:** the address-side gating worked: `lib/contracts/future-contracts.ts` exists with the feature-flag check, and `lib/contracts.ts` no longer has `BadgeNFT`/`Council*`/`SubscriptionManager` slots. But the ABIs are still imported, validated, and re-exported by the main `lib/abis/index.ts`:

```typescript
import VFIDEBadgeNFTABI from './VFIDEBadgeNFT.json'
import CouncilElectionABI from './CouncilElection.json'
import CouncilSalaryABI from './CouncilSalary.json'
import SubscriptionManagerABI from './SubscriptionManager.json'
// ... validateABI calls and re-exports ...
```

**Impact:** any consumer can `import { VFIDEBadgeNFTABI } from '@/lib/abis'` and call into a `contracts/future/` ABI. Combined with a stray env var setting an address, this re-opens the not-deployment-ready surface even with the address gating in place.

**Fix:** move the future ABIs to `lib/contracts/future-contracts.ts` alongside the address registry:

```typescript
// lib/contracts/future-contracts.ts
import VFIDEBadgeNFTABI from '@/lib/abis/VFIDEBadgeNFT.json'
import CouncilElectionABI from '@/lib/abis/CouncilElection.json'
import CouncilSalaryABI from '@/lib/abis/CouncilSalary.json'
import SubscriptionManagerABI from '@/lib/abis/SubscriptionManager.json'

if (process.env.NEXT_PUBLIC_FUTURE_FEATURES_ENABLED !== 'true') {
  throw new Error('future-contracts loaded but feature flag is not enabled');
}

export {
  VFIDEBadgeNFTABI,
  CouncilElectionABI,
  CouncilSalaryABI,
  SubscriptionManagerABI,
};
```

Remove the imports/validateABI/re-exports from `lib/abis/index.ts`. Codemod consumers from `@/lib/abis` to `@/lib/contracts/future-contracts`.

**Verify:** `grep -rn "VFIDEBadgeNFTABI\|CouncilElectionABI\|CouncilSalaryABI\|SubscriptionManagerABI" --include="*.ts*"` returns only files inside `lib/contracts/future-contracts.ts` or feature-flagged components.

---

## 5. DEAD-01 — Social commerce components still unrendered

**Severity:** Low

**Location:** `components/social/{ShoppablePost,PurchaseProofEvent,ShareProductToFeed,SocialCommerce}.tsx` — no page in `app/` references them.

**Fix:** unchanged from v6. Decide: wire into `app/feed/page.tsx`, or delete.

```bash
# Option A: delete
git rm components/social/{ShoppablePost,PurchaseProofEvent,ShareProductToFeed,SocialCommerce,social-commerce-types}.{tsx,ts}

# Option B: wire — add to app/feed/page.tsx based on event.type
```

---

## What's NEW in v7 that I want to call out as good

These don't need fixing but are worth noting because they were correctly addressed:

- **Per-chain addresses (INFRA-03):** `lib/contracts.ts:111-120,127` — `validateContractAddress(addr, name, chainId)` with chain-scoped env-var fallback `${envVarName}_${chainId}`. `getContractAddresses(chainId)` exported. Clean implementation.
- **Bridge systemExempt fix (BRIDGE-02):** `contracts/future/VFIDEBridge.sol` — `_bridgeIsSystemExempt()` now required at line 2 of `finalizeStaleBridgeRefund`.
- **FORCE RLS (DB-OPEN-01):** `migrations/20260430_180000_force_rls_tables.sql` — applies `ALTER TABLE ... FORCE ROW LEVEL SECURITY` to all RLS tables.
- **ABI cleanup (ABI-01/02/03/06):** all 12 stale ABI files deleted, no orphan imports in `lib/abis/index.ts`, BurnRouter alias removed from `CONTRACT_ENV_VAR_MAP`, `useSecurityHooks.ts` no longer imports legacy security ABIs. `scripts/check-abi-parity.sh` exists and is wired into `validate:production`.
- **Future contract addresses (ABI-07, partial):** `lib/contracts/future-contracts.ts` created with `NEXT_PUBLIC_FUTURE_FEATURES_ENABLED` flag check; `BadgeNFT`/`Council*`/`SubscriptionManager` removed from main `CONTRACT_ENV_VAR_MAP` and `CONTRACT_ADDRESSES`. Address gating done; ABI gating still pending (see #4 above).
- **withAuth uptake (DB-04, partial):** went from 2 routes in v6 to ~90 of 123 routes in v7. 33 still need migration.
- **Wallet decision (WALLET-02):** `lib/providers/Web3Providers.tsx:40-45` keeps RainbowKit and adds an explicit code comment guarding against premature swap. Acceptable.
- **WS chat structural enforcement (WS-03):** `websocket-server/src/index.ts:396-409` — chat and presence topics structurally enforced regardless of ACL config. Implementation matches the fix proposal.
- **JWT circuit breaker (AUTH-02):** `lib/auth/jwt.ts:84-86,112` — circuit breaker added.
- **EIP-1271 build check (AUTH-01):** `scripts/check-no-eip1271.sh` exists and wired into `validate:production`.

---

## Recommended next steps

1. **TODAY:** create `middleware.ts` (#1). Without it the site doesn't load. This is the third audit pass in a row that flags this.
2. **THIS WEEK:** decide and implement merchant payment flow (#2). Either add `payWithIntent` to `MerchantPortal` or restructure to skip portal-mediated transferFrom. Without this, the entire commerce feature is non-functional.
3. **THIS WEEK:** finish the 33 remaining routes for `withAuth` (#3) and gate future ABIs (#4). Both are mechanical PRs.
4. **WHEN CONVENIENT:** decide on social commerce components (#5).
