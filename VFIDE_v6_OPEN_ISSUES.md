# VFIDE v6 — Still Open

Everything below is a real bug in v6. Ordered by severity. Each item lists location, problem, fix.

---

## 1. INFRA-01 — `middleware.ts` missing, strict CSP active → site cannot load

**Severity:** Blocker (regressed from v5)

**Location:** `proxy.ts` deleted; `middleware.ts` never created; `next.config.ts:80`; `app/layout.tsx:17-20`.

**Problem:**

- `next.config.ts:80` sets a strict static CSP: `default-src 'self'; object-src 'none'; base-uri 'self'; frame-ancestors 'none';` — no `script-src` directive, so it inherits `default-src 'self'`, blocking every inline script.
- `next.config.ts:71` claims *"CSP is applied per-request in middleware.ts with a nonce"* but no `middleware.ts` exists.
- `app/layout.tsx:17` reads `(await headers()).get('x-nonce')` — but no middleware sets that header, so `nonce` is always empty.
- Every Next.js framework inline bootstrap script is CSP-blocked. Page renders blank in production.
- All the security checks that were in `proxy.ts` (CSRF, Content-Length cap, Content-Type validation, body-size limit, CORS) are now completely gone.

**Fix:** create `middleware.ts` at the repo root.

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

  // Port the body validation, CSRF, Content-Length, Content-Type checks
  // from the deleted proxy.ts here. Recover them with `git show <prev>:proxy.ts`.

  const response = NextResponse.next({ request: { headers: requestHeaders } });
  response.headers.set('Content-Security-Policy', buildCsp(nonce));
  return response;
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|woff2?|ttf)).*)'],
};
```

Recover the deleted `proxy.ts` contents with `git show HEAD~N:proxy.ts` (replace N with the commit count back to v5) and inline the CSRF/Content-Length/Content-Type/CORS logic into the new `middleware.ts`.

**Verify:** deploy preview loads (not blank). `curl -I /` shows `Content-Security-Policy: ... 'nonce-<base64>' ...`. Page source shows every `<script>` has matching `nonce` attribute.

---

## 2. ABI-05 — `useEscrow.ts` calls deleted `CommerceEscrow` contract

**Severity:** Blocker

**Location:** `lib/escrow/useEscrow.ts:14,48,65`. Used by `app/pay/components/PayContent.tsx:225` and `components/merchant/PaymentInterface.tsx:44`.

**Problem:** `CommerceEscrow.sol` was removed from `contracts/`. `useEscrow` still imports `CommerceEscrowABI` and reads/writes `CONTRACT_ADDRESSES.CommerceEscrow`. If the env var is unset, every `createEscrow` call fails simulation against `ZERO_ADDRESS`. If set to a stale address, calls go to legacy bytecode whose semantics may have drifted. The merchant payment flow is broken on the frontend.

**Fix:** decision required — pick one:

- **Restore.** If escrow-mediated payments are still planned, restore `contracts/CommerceEscrow.sol` from git, regenerate ABI, redeploy on each chain, set env var.
- **Migrate to MerchantPortal.** Update `useEscrow.ts` to call `MerchantPortal` directly:
  ```typescript
  // sketch — adapt to actual MerchantPortal interface
  await writeContractAsync({
    address: addresses.MerchantPortal,
    abi: MerchantPortalABI,
    functionName: 'createPayment',
    args: [merchant, amount, orderId, releaseDelaySeconds],
  });
  ```
- **Delete.** Remove `lib/escrow/`, `app/pay/`, `components/merchant/PaymentInterface.tsx` if escrow isn't a current product.

**Verify:** end-to-end buyer-to-merchant payment flow completes without errors.

---

## 3. INFRA-03 — `CONTRACT_ADDRESSES` has no chain-ID dimension

**Severity:** Blocker for multi-chain mainnet

**Location:** `lib/contracts.ts:80-215`, `lib/wagmi.ts:188-240`.

**Problem:** wagmi is configured for 6 chains (Base, Polygon, zkSync mainnet + Sepolia variants). `CONTRACT_ADDRESSES` is flat — same address resolves no matter which chain the user is on. Multi-chain operation hits the wrong address (or a non-contract).

**Fix:** convert to per-chain registry.

```typescript
// lib/contracts.ts
type ChainAddresses = Record<ContractName, `0x${string}`>;

const CHAIN_ADDRESS_REGISTRY: Record<number, ChainAddresses> = {
  8453:  { /* Base mainnet */ },
  137:   { /* Polygon */ },
  324:   { /* zkSync */ },
  84532: { /* Base Sepolia */ },
  80002: { /* Polygon Amoy */ },
  300:   { /* zkSync Sepolia */ },
};

export function getContractAddresses(chainId: number): ChainAddresses {
  const entry = CHAIN_ADDRESS_REGISTRY[chainId];
  if (!entry) throw new Error(`No addresses configured for chain ${chainId}`);
  return entry;
}

export function useContractAddresses(): ChainAddresses {
  return getContractAddresses(useChainId());
}
```

Codemod every consumer to `useContractAddresses()` (frontend) or `getContractAddresses(chainId)` (server).

**Verify:** Playwright test that switches chains mid-session and asserts contract reads succeed on each.

---

## 4. BRIDGE-02 — `finalizeStaleBridgeRefund` skips the systemExempt check

**Severity:** High

**Location:** `contracts/future/VFIDEBridge.sol:1021-1043`.

**Problem:** `bridge()` (line 275) and `claimBridgeRefund()` (line 928) both `require(_bridgeIsSystemExempt(), ...)`. `finalizeStaleBridgeRefund` does not. If `systemExempt[bridge]` is revoked between bridge time and the 30-day stale window, the `safeTransfer` at line 1040 fee-debits the refund — user gets `amount - fees` instead of `amount`.

**Fix:**

```diff
 function finalizeStaleBridgeRefund(bytes32 txId) external nonReentrant whenNotPaused {
+    require(_bridgeIsSystemExempt(), "VFIDEBridge: configure token systemExempt for bridge");
     BridgeTransaction storage btx = bridgeTransactions[txId];
     require(btx.sender != address(0), "VFIDEBridge: unknown tx");
     require(!btx.executed, "VFIDEBridge: already executed");
     // ...
 }
```

**Verify:** test — bridge tokens, revoke `systemExempt`, wait 30 days, call `finalizeStaleBridgeRefund` → reverts (currently silently fee-debits).

---

## 5. DB-OPEN-01 — RLS not FORCED on `users` and `user_portfolios`

**Severity:** High

**Location:** All RLS migrations.

**Problem:** Migrations `ENABLE ROW LEVEL SECURITY` but never `FORCE ROW LEVEL SECURITY`. By default, table owners and roles with `BYPASSRLS` skip every policy. If the app's DB role is the owner of `users` (the default if the same role ran the migrations) or has `BYPASSRLS`, the `users_read_authenticated`, `users_insert_own`, and `users_update_own` policies are decorative for that role.

**Fix:**

```sql
-- migrations/<next>_force_rls.sql
ALTER TABLE users FORCE ROW LEVEL SECURITY;
ALTER TABLE user_portfolios FORCE ROW LEVEL SECURITY;
ALTER TABLE messages FORCE ROW LEVEL SECURITY;
ALTER TABLE user_rewards FORCE ROW LEVEL SECURITY;
ALTER TABLE proposals FORCE ROW LEVEL SECURITY;
ALTER TABLE endorsements FORCE ROW LEVEL SECURITY;
ALTER TABLE friendships FORCE ROW LEVEL SECURITY;
-- Repeat for every RLS-enabled table.
```

Then verify the app's connecting role is **not** the table owner and does **not** have `BYPASSRLS`:

```sql
SELECT rolbypassrls FROM pg_roles WHERE rolname = current_user;  -- must be false
SELECT tableowner FROM pg_tables WHERE tablename = 'users';      -- must NOT equal current_user
```

If either fails, split into a `vfide_admin` role (runs migrations, owns tables) and `vfide_app` role (runtime connection, RLS-bound).

**Verify:** as the app role, `INSERT INTO users (wallet_address) VALUES ('0x' + someone-else)` must fail; the same INSERT for the session's own address must succeed.

---

## 6. DB-04 — 119 of 123 routes still don't use `withAuth`

**Severity:** High

**Location:** `lib/auth/middleware.ts:255` (defines `withAuth`); only 2 routes use it.

**Problem:** RLS context activation relies on the implicit fallback in `lib/db.ts:35` that re-extracts the JWT from `headers()` per query. Works today; fragile across Next.js upgrades; double crypto cost per query.

**Fix:** codemod every authenticated route to:

```diff
-export async function POST(request: NextRequest) {
-  const authResult = await requireAuth(request);
-  if (authResult instanceof NextResponse) return authResult;
-  // ... handler ...
-}
+export const POST = withAuth(async (request, user) => {
+  // ... handler uses `user` directly, RLS context auto-applied ...
+});
```

For ownership-on-other-address routes, add `withOwnership` wrapper to `lib/auth/middleware.ts`:

```typescript
export function withOwnership(extractAddress: (req: NextRequest) => string | Promise<string>, handler: AuthenticatedHandler) {
  return async (request: NextRequest): Promise<NextResponse> => {
    const address = await extractAddress(request);
    const authResult = await requireOwnership(request, address);
    if (authResult instanceof NextResponse) return authResult;
    const { runWithDbUserAddressContext } = await import('@/lib/db');
    return runWithDbUserAddressContext(authResult.user.address, () => handler(request, authResult.user));
  };
}
```

**Verify:** add a runtime warning in `lib/db.ts:query()` that fires when `dbUserContext.getStore()` is unset on an authenticated query path. After the migration, the warning never fires.

---

## 7. ABI-01 / ABI-02 — 12+ stale ABI files still imported

**Severity:** Critical (combined)

**Location:** `lib/abis/`, `lib/abis/index.ts`.

**Problem:** stale ABIs still on disk and still imported by `lib/abis/index.ts`:

```
BurnRouter.json, CommerceEscrow.json, PanicGuard.json, GuardianLock.json,
GuardianRegistry.json, EmergencyBreaker.json, MerchantRegistry.json,
SecurityHub.json, UserVault.json, UserVaultLite.json, TempVault.json,
WithdrawalQueue.json
```

Several are imported and `validateABI`'d in `index.ts`. The validation passes only because the JSON files exist — not because they match deployed bytecode. Frontend hooks calling these ABIs against the wrong (or no) deployed contract get selector mismatches at runtime.

**Fix:**

```bash
# Step 1: delete the orphan files
git rm lib/abis/{BurnRouter,CommerceEscrow,PanicGuard,GuardianLock,GuardianRegistry,EmergencyBreaker,MerchantRegistry,SecurityHub,UserVault,UserVaultLite,TempVault,WithdrawalQueue}.json
```

```diff
 // lib/abis/index.ts
-import UserVaultLiteABI from './UserVaultLite.json'
-import UserVaultABI from './UserVault.json'
-import GuardianRegistryABI from './GuardianRegistry.json'
-import GuardianLockABI from './GuardianLock.json'
-import PanicGuardABI from './PanicGuard.json'
-import EmergencyBreakerABI from './EmergencyBreaker.json'
-import MerchantRegistryABI from './MerchantRegistry.json'
-import CommerceEscrowABI from './CommerceEscrow.json'
-import BurnRouterABI from './BurnRouter.json'
```

Plus delete the matching `validateABI(...)` calls and re-exports.

Wire a CI check to keep this clean:

```bash
# scripts/check-abi-parity.sh
#!/usr/bin/env bash
set -euo pipefail
contracts=$(find contracts \( -path '*/lib/*' -o -path '*/interfaces/*' -o -path '*/mocks/*' \) -prune -o -name '*.sol' -print | xargs -n1 basename | sed 's/\.sol$//' | sort -u)
abis=$(ls lib/abis/*.json | xargs -n1 basename | sed 's/\.json$//' | sort -u)
orphans=$(comm -23 <(echo "$abis") <(echo "$contracts"))
[ -z "$orphans" ] && exit 0
echo "ABIs without matching contract:"; echo "$orphans"; exit 1
```

`tsc --noEmit` will flag every consumer — fix per ABI-03 / ABI-06 below.

**Verify:** `tsc --noEmit` clean. `scripts/check-abi-parity.sh` exits 0.

---

## 8. ABI-03 — `BurnRouter` alias inconsistent in `lib/contracts.ts`

**Severity:** Critical

**Location:** `lib/contracts.ts:99` and `lib/contracts.ts:204`.

**Problem:** `CONTRACT_ENV_VAR_MAP:99` says `BurnRouter: 'NEXT_PUBLIC_LEGACY_BURN_ROUTER_ADDRESS'`. But the actual `CONTRACT_ADDRESSES:204` reads `process.env.NEXT_PUBLIC_BURN_ROUTER_ADDRESS` — the same env var as `ProofScoreBurnRouter`. The map and the resolution disagree. `BurnRouter` and `ProofScoreBurnRouter` resolve to the same address despite the map suggesting a separate legacy slot exists.

**Fix:** delete the `BurnRouter` slot entirely. After ABI-01, no runtime code uses it.

```diff
 // lib/contracts.ts CONTRACT_ENV_VAR_MAP
-  BurnRouter: 'NEXT_PUBLIC_LEGACY_BURN_ROUTER_ADDRESS',
   ProofScoreBurnRouter: 'NEXT_PUBLIC_BURN_ROUTER_ADDRESS',
```

```diff
 // lib/contracts.ts CONTRACT_ADDRESSES
-  BurnRouter: validateContractAddress(process.env.NEXT_PUBLIC_BURN_ROUTER_ADDRESS, 'BurnRouter'),
   ProofScoreBurnRouter: validateContractAddress(process.env.NEXT_PUBLIC_BURN_ROUTER_ADDRESS, 'ProofScoreBurnRouter'),
```

**Verify:** `tsc --noEmit` reveals every `CONTRACT_ADDRESSES.BurnRouter` consumer — none should remain after ABI-04 was fixed in v6.

---

## 9. ABI-06 — Stale ABIs imported into runtime hooks behind dead branches

**Severity:** Medium

**Location:** `hooks/useSecurityHooks.ts`, `app/vault/components/useVaultOperations.ts`, `components/vault/VaultActionsModal.tsx`.

**Problem:** these hooks import `PanicGuardABI`, `GuardianRegistryABI`, `GuardianLockABI`, `EmergencyBreakerABI`, `UserVaultABI` and gate usage behind `!cardBoundMode`. `isCardBoundVaultMode()` always returns `true` (`lib/contracts.ts:253`), so these branches are unreachable. After ABI-01/02 delete the JSON files and imports, the runtime imports here will fail to type-check.

**Fix:** delete the dead branches.

```diff
 // hooks/useSecurityHooks.ts
 import { useReadContract, ... } from 'wagmi'
 import { CARD_BOUND_VAULT_ABI, CONTRACT_ADDRESSES, ... } from '../lib/contracts'
-import { PanicGuardABI, GuardianRegistryABI, GuardianLockABI, EmergencyBreakerABI } from '../lib/abis'

-export function useQuarantineStatus(vaultAddress?: `0x${string}`) {
-  const cardBoundMode = isCardBoundVaultMode()
-  const { data: paused } = useReadContract({ /* card-bound */ })
-  const { data: quarantineUntil } = useReadContract({ /* legacy */ })
-  const until = cardBoundMode ? 0 : quarantineUntil ? Number(quarantineUntil) : 0
-  return { quarantineUntil: until, isQuarantined: cardBoundMode ? !!paused : ..., supportsTimer: !cardBoundMode }
-}
+export function useQuarantineStatus(vaultAddress?: `0x${string}`) {
+  const { data: paused } = useReadContract({
+    address: vaultAddress, abi: CARD_BOUND_VAULT_ABI, functionName: 'paused',
+    query: { enabled: !!vaultAddress },
+  })
+  return { quarantineUntil: 0, isQuarantined: !!paused, supportsTimer: false }
+}
```

Apply similarly to all `!cardBoundMode` gates. Then collapse the constants:

```diff
 // lib/contracts.ts
-export const isCardBoundVaultMode = (): boolean => true;
-export const ACTIVE_VAULT_ABI = CARD_BOUND_VAULT_ABI;
-export type VaultImplementation = 'cardbound';
-export const ACTIVE_VAULT_IMPLEMENTATION: VaultImplementation = resolveVaultImplementation();
```

**Verify:** `grep -rn "isCardBoundVaultMode\|cardBoundMode\b" --include='*.ts*'` returns zero.

---

## 10. ABI-07 — `contracts/future/` addresses in main env-var map

**Severity:** Low

**Location:** `lib/contracts.ts` — `BadgeNFT`, `SeerGuardian`, `CouncilElection`, `CouncilSalary`, `SubscriptionManager`.

**Problem:** these contracts live in `contracts/future/` and are explicitly not deployment-ready, but their env var slots and ABIs are wired into the main runtime registry. If env vars are accidentally set, hooks resolve and start calling pre-production contracts.

**Fix:** move to a feature-flag-gated module.

```typescript
// lib/contracts/future-contracts.ts
if (process.env.NEXT_PUBLIC_FUTURE_FEATURES_ENABLED !== 'true') {
  throw new Error('future-contracts loaded but feature flag is not enabled');
}

export const FUTURE_CONTRACT_ADDRESSES = {
  BadgeNFT: validateContractAddress(process.env.NEXT_PUBLIC_BADGE_NFT_ADDRESS, 'BadgeNFT'),
  SeerGuardian: validateContractAddress(process.env.NEXT_PUBLIC_SEER_GUARDIAN_ADDRESS, 'SeerGuardian'),
  CouncilElection: validateContractAddress(process.env.NEXT_PUBLIC_COUNCIL_ELECTION_ADDRESS, 'CouncilElection'),
  CouncilSalary: validateContractAddress(process.env.NEXT_PUBLIC_COUNCIL_SALARY_ADDRESS, 'CouncilSalary'),
  SubscriptionManager: validateContractAddress(process.env.NEXT_PUBLIC_SUBSCRIPTION_MANAGER_ADDRESS, 'SubscriptionManager'),
};
```

Remove these entries from main `CONTRACT_ENV_VAR_MAP` and `CONTRACT_ADDRESSES`. Any frontend code that uses them must import from `future-contracts` (which throws when the feature flag isn't set).

**Verify:** `grep -r "CONTRACT_ADDRESSES.BadgeNFT" --include='*.ts*'` returns zero outside `future-contracts.ts` and feature-flagged components.

---

## 11. WALLET-02 — `AccountButton` requires unmounted `VFIDEWalletProvider`

**Severity:** High (latent)

**Location:** `lib/wallet/AccountButton.tsx:14,19,179`; `lib/providers/Web3Providers.tsx` mounts `RainbowKitProvider` instead.

**Problem:** `AccountButton` calls `useVFIDEWallet()` which throws if `VFIDEWalletProvider` isn't a parent. Currently dead (no page renders `AccountButton`), but the file's own header comment instructs the next dev to wire it in. Following that advice without first wiring an embedded wallet SDK breaks the app at signin.

**Fix:** decision required — pick one:

- **Keep as planned migration:** add a header guard to `Web3Providers.tsx` documenting the migration prerequisite. Replace the comment in `VFIDEWalletProvider.tsx` with: *"DO NOT swap RainbowKitProvider until (1) Privy/Web3Auth SDK installed, (2) `authenticateWithProvider` and `ensureVaultExists` replaced with real implementations."*
- **Delete:** if RainbowKit is the long-term wallet stack:
  ```bash
  git rm lib/wallet/AccountButton.tsx lib/wallet/VFIDEWalletProvider.tsx lib/wallet/EmbeddedWalletAdapter.tsx
  ```
  Keep `lib/wallet/walletUXEnhancements.ts` (utilities) and `lib/wallet/index.ts`.

**Verify:** if keep — manual mount in dev tree does not render-error (signin throws cleanly per WALLET-01 fix). If delete — `tsc --noEmit` clean.

---

## 12. WS-03 — Chat topic ACL depends on operator config, not topic structure

**Severity:** Medium

**Location:** `websocket-server/src/index.ts:239-247, 387-403`.

**Problem:** `isAllowedTopic` accepts any topic with `chat.`/`presence.`/`proposal.` prefix. Access control then depends on `topicAclSnapshot.grants` shape. A misconfigured ACL like `chat.*: ['*']` broadcasts every DM to every authenticated client.

**Fix:** structurally enforce participant membership for chat/presence — independent of ACL config.

```typescript
// websocket-server/src/index.ts
function isAuthorizedForTopic(client: AuthenticatedSocket, topic: string, refreshForSubscribe = false): boolean {
  if (!isAllowedTopic(topic)) return false;
  if (!client.vfideAddress) return false;

  // Convention: chat.<addrA>_<addrB>  with addrA < addrB lexicographically.
  if (topic.startsWith('chat.')) {
    const parts = topic.slice('chat.'.length).split('_');
    if (parts.length !== 2) return false;
    const [a, b] = parts.map(p => p.toLowerCase());
    if (!/^0x[a-f0-9]{40}$/.test(a) || !/^0x[a-f0-9]{40}$/.test(b)) return false;
    if (a >= b) return false;  // canonical ordering
    const me = client.vfideAddress.toLowerCase();
    return me === a || me === b;
  }

  // Convention: presence.<addr>
  if (topic.startsWith('presence.')) {
    const subject = topic.slice('presence.'.length).toLowerCase();
    if (!/^0x[a-f0-9]{40}$/.test(subject)) return false;
    return subject === client.vfideAddress.toLowerCase();
  }

  // proposal.* etc → fall back to ACL-snapshot logic
  ensureFreshTopicAclSnapshot(refreshForSubscribe);
  if (!topicAclSnapshot) return false;
  const address = client.vfideAddress.toLowerCase();
  for (const [grantTopic, addresses] of Object.entries(topicAclSnapshot.grants)) {
    if (!topicMatchesGrant(topic, grantTopic)) continue;
    if (addresses.includes('*') || addresses.map(e => e.toLowerCase()).includes(address)) return true;
  }
  return false;
}
```

Producer side — canonicalize:

```typescript
function chatTopic(a: string, b: string): string {
  const lower = [a.toLowerCase(), b.toLowerCase()].sort();
  return `chat.${lower[0]}_${lower[1]}`;
}
```

**Verify:** as user A, subscribe to `chat.0xB_0xC` → denied. Subscribe to canonical-ordered own DM → allowed.

---

## 13. AUTH-02 — `verifyToken` re-throws on Redis revocation-store failure

**Severity:** Medium

**Location:** `lib/auth/jwt.ts:184-191`.

**Problem:** if Upstash Redis is briefly unreachable, `isTokenRevoked` throws → `verifyToken` re-throws → all auth fails closed for the duration. A 30-second Redis blip = 30-second app outage for all authenticated users.

**Fix:** circuit breaker that downgrades to fail-open after N consecutive failures.

```typescript
// lib/auth/jwt.ts
let revocationFailures = 0;
let revocationSuppressedUntil = 0;
const FAILURE_THRESHOLD = 5;
const SUPPRESSION_WINDOW_MS = 30_000;

async function checkRevocationWithCircuitBreaker(token: string, decoded: JWTPayload): Promise<boolean> {
  const now = Date.now();
  if (now < revocationSuppressedUntil) {
    logger.warn('[JWT] Revocation check suppressed (circuit open)', { address: decoded.address });
    return false;
  }
  try {
    const tokenHash = await hashToken(token);
    if (await isTokenRevoked(tokenHash)) return true;
    const userRevocation = await isUserRevoked(decoded.address);
    if (userRevocation?.revoked && (userRevocation.revokedAt ?? 0) > (decoded.iat ?? 0)) return true;
    revocationFailures = 0;
    return false;
  } catch (error) {
    revocationFailures++;
    if (revocationFailures >= FAILURE_THRESHOLD) {
      revocationSuppressedUntil = now + SUPPRESSION_WINDOW_MS;
      logger.error('[JWT] Revocation check circuit BROKEN — failing open for 30s', { failures: revocationFailures });
    }
    return false;
  }
}

export async function verifyToken(token: string): Promise<JWTPayload | null> {
  // ... existing JWT verify against current/prev secret ...
  if (!decoded) return null;
  if (await checkRevocationWithCircuitBreaker(token, decoded)) return null;
  return decoded;
}
```

Trade-off: a successfully-revoked token might be accepted for up to 30s after Redis dies. Deliberate availability/security trade.

**Verify:** simulate Redis down 60s. With current code, all auth fails. With fix, first 5 requests fail then next 30s succeed (with warning logs).

---

## 14. AUTH-01 — EIP-1271 trust assumption not build-enforced

**Severity:** Low

**Location:** `app/api/auth/route.ts:155-160`; no CI script enforces the assumption.

**Problem:** `verifyMessage` calls `eth_call` for contract addresses (EIP-1271). The auth route documents *"no deployed vault contract has a permissive `isValidSignature`"* — currently true (zero matches in `contracts/`), but unenforced. Future contract change can introduce one and the auth layer silently trusts it.

**Fix:** add a CI check.

```bash
# scripts/check-no-eip1271.sh
#!/usr/bin/env bash
set -euo pipefail
if grep -rn "isValidSignature" contracts/ --include="*.sol" >/dev/null 2>&1; then
  echo "ERROR: EIP-1271 isValidSignature implementation detected:"
  grep -rn "isValidSignature" contracts/ --include="*.sol"
  echo "If intentional, allowlist the contract in lib/auth/eip1271-allowlist.ts and update auth route."
  exit 1
fi
```

Wire into `package.json`:

```json
"scripts": {
  "check:eip1271": "bash scripts/check-no-eip1271.sh",
  "validate:production": "... && npm run check:eip1271 && ..."
}
```

**Verify:** `npm run check:eip1271` exits 0. Add a fake `isValidSignature` to a test contract → CI fails.

---

## 15. DEAD-01 — Social commerce components unrendered

**Severity:** Low

**Location:** `components/social/{ShoppablePost,PurchaseProofEvent,ShareProductToFeed,SocialCommerce}.tsx`. Unreferenced from any page in `app/`.

**Fix:** decision — wire in or delete.

- **Wire in:** add to `app/feed/page.tsx`:
  ```typescript
  import { ShoppablePost, PurchaseProofEvent } from '@/components/social';
  // render based on event.type
  ```
- **Delete:**
  ```bash
  git rm components/social/{ShoppablePost,PurchaseProofEvent,ShareProductToFeed,SocialCommerce,social-commerce-types}.{tsx,ts}
  ```

**Verify:** `tsc --noEmit` clean after either action.

---

## Recommended order

1. **Today:** #1 (middleware.ts) — without this the site doesn't load.
2. **This week:** #2 (CommerceEscrow decision), #4 (one-line bridge fix), #5 (FORCE RLS).
3. **Next sprint:** #7 + #8 + #9 + #10 (single ABI cleanup PR), #3 (per-chain addresses), #6 (`withAuth` codemod).
4. **Lower priority:** #11, #12, #13, #14, #15.
