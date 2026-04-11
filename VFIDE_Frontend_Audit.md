# VFIDE Hostile Frontend Audit Report

**Date:** April 10, 2026
**Scope:** 231K LOC · 101 pages · 116 API routes · 385 components · 61 hooks · 200 lib files
**Imports verified:** 2,234 (576 relative + 1,658 alias)

---

## CRITICAL — Deployment Blockers

### C-1: ABI Files Are Stale

**Impact:** Every contract call to a new function silently fails. Every call to a removed function reverts. The frontend cannot interact with deployed contracts.

**13 mismatches found:**

| ABI File | Function | Status | Problem |
|----------|----------|--------|---------|
| VFIDEToken.json | setFrozen | STILL PRESENT | Removed from contract |
| VFIDEToken.json | setBlacklist | STILL PRESENT | Removed from contract |
| VFIDEToken.json | setSecurityBypass | STILL PRESENT | Removed from contract |
| VFIDEToken.json | setFraudRegistry | MISSING | New function, not in ABI |
| VFIDEToken.json | applyFraudRegistry | MISSING | New function, not in ABI |
| VFIDEToken.json | fraudRegistry | MISSING | New getter, not in ABI |
| CardBoundVault.json | __forceSetOwner | STILL PRESENT | Removed from contract |
| CardBoundVault.json | executeQueuedWithdrawal | MISSING | New function, not in ABI |
| CardBoundVault.json | cancelQueuedWithdrawal | MISSING | New function, not in ABI |
| CardBoundVault.json | setLargeTransferThreshold | MISSING | New function, not in ABI |
| CardBoundVault.json | getPendingQueuedWithdrawals | MISSING | New view, not in ABI |
| FraudRegistry.json | (entire file) | MISSING | New contract, no ABI at all |
| VFIDETestnetFaucet.json | (entire file) | MISSING | New contract, no ABI at all |

**Fix:**
```bash
npx hardhat compile
# Copy each artifact to lib/abis/
cp artifacts/contracts/VFIDEToken.sol/VFIDEToken.json lib/abis/
cp artifacts/contracts/CardBoundVault.sol/CardBoundVault.json lib/abis/
cp artifacts/contracts/FraudRegistry.sol/FraudRegistry.json lib/abis/
cp artifacts/contracts/VFIDETestnetFaucet.sol/VFIDETestnetFaucet.json lib/abis/
cp artifacts/contracts/OwnerControlPanel.sol/OwnerControlPanel.json lib/abis/
# Repeat for any other changed contracts
```

Also add FraudRegistry and Faucet addresses to `lib/contracts.ts`:
```typescript
export const CONTRACT_ADDRESSES = {
  // ... existing
  FraudRegistry: process.env.NEXT_PUBLIC_FRAUD_REGISTRY_ADDRESS as `0x${string}`,
  VFIDETestnetFaucet: process.env.NEXT_PUBLIC_FAUCET_ADDRESS as `0x${string}`,
};
```

---

### C-2: RLS Policies Enabled But Never Activated

**Impact:** Every database query runs with full access to all rows. User A can see User B's transactions, notifications, merchant data, and wallet information. Complete data isolation failure.

**The gap:**
- `lib/db.ts` line 19 defines `applyDbUserAddressContext()` which calls `SET app.current_user_address = $1`
- 0 out of 116 API routes call this function before querying
- RLS policies exist in migrations but are never activated at query time

**Files that query user-specific data without RLS:**
- `app/api/activities/route.ts`
- `app/api/merchant/gift-cards/route.ts`
- `app/api/merchant/locations/route.ts`
- `app/api/merchant/suppliers/route.ts`
- `app/api/merchant/wholesale/route.ts`
- `app/api/merchant/customers/route.ts`
- `app/api/merchant/expenses/route.ts`
- `app/api/merchant/returns/route.ts`
- `app/api/notifications/preferences/route.ts`
- `app/api/privacy/delete/route.ts`

**Fix:** Create a helper that wraps all authed queries:

```typescript
// lib/db.ts — add this function
export async function queryWithRLS<T extends QueryResultRow>(
  userAddress: string,
  text: string,
  params?: unknown[]
): Promise<QueryResult<T>> {
  const client = await getPool().connect();
  try {
    await applyDbUserAddressContext(client, userAddress);
    const result = await client.query<T>(text, params);
    return result;
  } finally {
    await clearDbUserAddressContext(client, userAddress);
    client.release();
  }
}
```

Then in every authenticated API route, replace:
```typescript
// BEFORE (no RLS)
const result = await query('SELECT * FROM transactions WHERE wallet_address = $1', [address]);

// AFTER (with RLS)
const result = await queryWithRLS(address, 'SELECT * FROM transactions WHERE wallet_address = $1', [address]);
```

---

## HIGH — Security / Data Exposure

### H-1: 8 Sensitive API Routes Have No Authentication

**Impact:** Anyone with the URL can call these endpoints. File uploads, prize claims, SMS sends, and supplier data are all unprotected.

| Route | Risk | Fix |
|-------|------|-----|
| `/api/media/upload` | Anyone can upload files to your S3/R2 bucket | Add `requireAuth()` check |
| `/api/leaderboard/claim-prize` | Anyone can claim prizes without earning them | Add `requireAuth()` + verify eligibility |
| `/api/notifications/preferences` | Read/write any user's notification prefs | Add `requireAuth()` + verify ownership |
| `/api/push/subscribe` | Subscribe any device to any user's notifications | Add `requireAuth()` |
| `/api/support/tickets` | Create fake support tickets as any user | Add `requireAuth()` |
| `/api/merchant/suppliers` | Read any merchant's supplier relationships | Add `requireAuth()` + verify merchant ownership |
| `/api/merchant/wholesale` | Read any merchant's wholesale pricing | Add `requireAuth()` + verify merchant ownership |
| `/api/merchant/receipts/sms` | Send SMS receipts as any merchant | Add `requireAuth()` + verify merchant ownership |

**Fix pattern for each route:**
```typescript
// At the top of each handler
import { requireAuth } from '@/lib/security/requireAuth';

export async function POST(request: NextRequest) {
  const auth = await requireAuth(request);
  if (auth instanceof NextResponse) return auth;
  
  const { address } = auth;
  // ... rest of handler, using address for ownership checks
}
```

---

### H-2: 6 POST Routes Accept JSON Without Zod Validation

**Impact:** Malformed payloads crash handlers, cause type confusion, or insert unexpected data into the database.

| Route | Fix |
|-------|-----|
| `/api/faucet/claim` | Add `z.object({ address: z.string().regex(/^0x[a-fA-F0-9]{40}$/), referrer: z.string().optional() })` |
| `/api/push/subscribe` | Add `z.object({ endpoint: z.string().url(), keys: z.object({ p256dh: z.string(), auth: z.string() }) })` |
| `/api/merchant/locations` | Add schema for location fields (lat, lng, name, address) |
| `/api/merchant/receipts/sms` | Add `z.object({ phone: z.string(), orderId: z.string() })` |
| `/api/community/posts` | Add `z.object({ content: z.string().max(5000), type: z.enum(['post','story']) })` |
| `/api/referral` | Add `z.object({ address: z.string().regex(/^0x[a-fA-F0-9]{40}$/) })` |

**Fix pattern:**
```typescript
import { z } from 'zod';

const ClaimSchema = z.object({
  address: z.string().regex(/^0x[a-fA-F0-9]{40}$/),
  referrer: z.string().regex(/^0x[a-fA-F0-9]{40}$/).optional(),
});

export async function POST(request: NextRequest) {
  const body = await request.json();
  const parsed = ClaimSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: 'Invalid request', details: parsed.error.flatten() }, { status: 400 });
  }
  const { address, referrer } = parsed.data;
  // ... safe to use
}
```

---

### H-3: 3 Sensitive Routes Have No Rate Limiting

**Impact:** Automated scripts can drain faucet funds, exhaust storage, or steal prizes with unlimited requests.

| Route | Risk | Fix |
|-------|------|-----|
| `/api/faucet/claim` | Unlimited token claims exhaust faucet balance | Add rate limit: 1 request per address per 24h |
| `/api/media/upload` | Unlimited uploads exhaust S3/R2 storage quota | Add rate limit: 10 uploads per address per hour |
| `/api/leaderboard/claim-prize` | Unlimited prize claims | Add rate limit: 1 claim per address per prize period |

**Fix pattern:**
```typescript
import { rateLimit } from '@/lib/rateLimit';

const limiter = rateLimit({ interval: 86400, limit: 1 }); // 1 per day

export async function POST(request: NextRequest) {
  const ip = request.headers.get('x-forwarded-for') || 'unknown';
  const limited = await limiter.check(ip);
  if (limited) {
    return NextResponse.json({ error: 'Rate limited' }, { status: 429 });
  }
  // ...
}
```

---

### H-4: 15 API Routes Swallow Errors Silently

**Impact:** When these handlers throw inside a catch block, the client gets no response and hangs indefinitely. No error logged, no 500 returned.

**Affected routes:**
1. `/api/privacy/delete`
2. `/api/merchant/wholesale`
3. `/api/merchant/payments/confirm`
4. `/api/crypto/rewards/[userId]/claim`
5. `/api/crypto/price`
6. `/api/flashloans/lanes/[id]/actions`
7. `/api/leaderboard/monthly`
8. `/api/security/anomaly`
9. (7 more — run `grep -rn "catch" app/api/ --include="*.ts" | grep -v "return\|throw\|NextResponse"` to find all)

**Fix pattern for each:**
```typescript
// BEFORE (swallows error)
} catch (error) {
  console.error(error);
  // ← no return! Client hangs.
}

// AFTER (proper error response)
} catch (error) {
  logger.error('Handler failed', error);
  return NextResponse.json(
    { error: 'Internal server error' },
    { status: 500 }
  );
}
```

---

## MEDIUM

### M-1: 135 Raw localStorage Calls Without SSR Guard

**Impact:** If any of these code paths execute during server-side rendering, the page crashes with `ReferenceError: localStorage is not defined`.

**28 affected files include:** MerchantPortal.tsx, PieMenuAdvanced.tsx, PieMenuEnhancements.tsx, OnboardingSystem.tsx, DailyRewardsWidget.tsx, EasterEggs.tsx, FirstTimeUserBanner.tsx, TestnetNotification.tsx, LocaleProvider.tsx, ProgressiveNav.tsx, and 18 more.

**Fix:** Wrap every raw `localStorage`/`sessionStorage` call:
```typescript
// BEFORE
const value = localStorage.getItem('key');

// AFTER (option 1: typeof guard)
const value = typeof window !== 'undefined' ? localStorage.getItem('key') : null;

// AFTER (option 2: use existing safeLocalStorage)
import { safeLocalStorage } from '@/lib/utils';
const value = safeLocalStorage.getItem('key');
```

The codebase already has `safeLocalStorage` in `lib/utils` — replace all 135 raw calls with it.

---

### M-2: 51 SQL Interpolations Need Manual Review

**Impact:** Template literal SQL with `${variable}` interpolation can be an injection vector if the variable contains user input.

**Pattern found in:**
- `app/api/merchant/wholesale/route.ts` — `${conditions.join(' AND ')}`
- `app/api/merchant/customers/route.ts` — `${filterSql}`
- `app/api/merchant/directory/route.ts` — `${orderClause}`, `${pi++}`
- `app/api/merchant/expenses/route.ts` — `${expenseFilterSql}`
- `app/api/merchant/products/route.ts` — `${updates.join(', ')}`
- `app/api/merchant/orders/route.ts` — `${where}`
- `app/api/merchant/reviews/route.ts` — `${where}`
- `app/api/analytics/route.ts` — `${whereClause}`
- And 43 more

**Most use the safe builder pattern:**
```typescript
const conditions: string[] = [];
const params: unknown[] = [];
if (status) { conditions.push(`status = $${params.length + 1}`); params.push(status); }
const where = conditions.length ? conditions.join(' AND ') : '1=1';
// This is SAFE — conditions only contain $N placeholders
```

**Review each to verify:**
1. The interpolated variable (`where`, `conditions`, `updates`) is built ONLY from `$N` placeholders
2. No user input is concatenated directly into the variable
3. Column names and table names are hardcoded, never from user input

---

### M-3: No Wallet Button on Mobile BottomTabBar

**Impact:** On mobile, there is no persistent wallet connection indicator. Users can't see if they're connected, disconnect, or switch accounts without navigating to the profile page.

**File:** `components/navigation/BottomTabBar.tsx`

**Fix:** Add a small wallet indicator to the "Me" tab or add a 6th icon:
```typescript
// In BottomTabBar.tsx, modify the "Me" tab to show connection state
import { useAccount } from 'wagmi';

// Inside the component:
const { isConnected } = useAccount();

// On the Me tab icon, add a connection dot:
<div className="relative">
  <User size={22} />
  {isConnected && (
    <div className="absolute -top-0.5 -right-0.5 w-2 h-2 rounded-full bg-green-400" />
  )}
</div>
```

---

### M-4: 12 Route Groups Missing error.tsx

**Impact:** Errors in these routes bubble to the root error handler with no context-specific recovery UI.

**Missing from:** demo, remittance, (commerce), components, lending, checkout, agent, elections, (finance), (marketing), (gamification), (auth), store

**Fix:** Create `error.tsx` in each directory:
```typescript
'use client';
import { useEffect } from 'react';
import { logger } from '@/lib/logger';

export default function Error({ error, reset }: { error: Error; reset: () => void }) {
  useEffect(() => { logger.error('Route error', error); }, [error]);
  return (
    <div className="min-h-[50vh] flex items-center justify-center p-6">
      <div className="text-center space-y-4 max-w-md">
        <h2 className="text-xl font-bold text-white">Something went wrong</h2>
        <p className="text-zinc-400 text-sm">{error.message}</p>
        <button onClick={reset} className="px-6 py-2 bg-cyan-500 text-white rounded-lg">Try Again</button>
      </div>
    </div>
  );
}
```

---

### M-5: 43 'any' Type Assertions in Production Code

**Impact:** `any` bypasses TypeScript's type checking. Bugs hide behind these assertions and surface as runtime crashes.

**Fix:** Run `grep -rn ": any\|as any" app/ components/ lib/ hooks/ --include="*.ts" --include="*.tsx" | grep -v "node_modules\|test"` and replace each with proper types. Common patterns:

```typescript
// BEFORE
const data: any = await response.json();

// AFTER
interface ApiResponse { items: Item[]; total: number; }
const data: ApiResponse = await response.json();
```

---

### M-6: Test Files Reference Removed Contract Functions

**Impact:** Tests will fail on next `npm test` run. 31 references to `isLocked`, `setFrozen`, `setBlacklist`, `forceRecovery` in test files.

**Files:**
- `test/hardhat/VFIDEToken.test.ts`
- `test/hardhat/ContractCoverageBackfill.test.ts`
- `test/contracts/RemainingContracts.test.ts`
- `__tests__/hooks/useSecurityHooksReal.test.ts`
- `__tests__/components/VaultSecurityPanelReal.test.tsx`

**Fix:** Remove or update tests that reference removed functions. Replace `isLocked` assertions with the new non-custodial behavior (always returns false).

---

## Verified Clean

| Check | Status |
|-------|--------|
| All 2,234 imports resolve | ✅ |
| No server/client boundary violations | ✅ |
| No metadata exports from client components | ✅ |
| No hooks reference removed contract functions | ✅ |
| All useEffect calls have dependency arrays | ✅ |
| Contract calls gated behind chain validation | ✅ |
| Web3Providers in root via CoreProviders | ✅ |
| No eval(), no innerHTML=, no private key leaks | ✅ |
| dangerouslySetInnerHTML only in JSON-LD (safe) | ✅ |
| XSS vectors fixed (location.assign not .href=) | ✅ |
| CSRF/CSP/content-type validation in proxy.ts | ✅ |
| X-Frame-Options DENY, HSTS, Referrer-Policy | ✅ |
| WebSocket has JWT auth + heartbeat + reconnect | ✅ |
| Private keys server-side only (API routes) | ✅ |
| TypeScript strict mode, ignoreBuildErrors: false | ✅ |
| @ts-nocheck: 0, @ts-ignore: 1 | ✅ |
| Guardian step mandatory in onboarding | ✅ |
| 0 N+1 query patterns in API routes | ✅ |
| viem (lightweight) instead of ethers.js | ✅ |
| Cron auth via CRON_SECRET | ✅ |
| 79 loading.tsx pages for UX | ✅ |
| Query timeouts configured (30s) | ✅ |
| document.write only in print context (SmartQR) | ✅ |
| Dead links only in test files | ✅ |

---

## Priority Order

1. **C-1** — Compile contracts and copy ABIs (blocks all contract interaction)
2. **C-2** — Wire RLS into API routes (blocks data isolation)
3. **H-1** — Add auth to 8 unprotected routes (blocks security)
4. **H-3** — Add rate limiting to faucet/upload/prize (blocks abuse prevention)
5. **H-2** — Add Zod to 6 unvalidated routes (blocks input safety)
6. **H-4** — Fix 15 swallowed errors (blocks error visibility)
7. **M-1** — Replace 135 localStorage with safeLocalStorage (blocks SSR)
8. **M-3** — Add wallet indicator to mobile nav (blocks mobile UX)
9. **M-4** — Add 12 missing error.tsx (improves error recovery)
10. **M-6** — Update stale tests (blocks CI/CD)
11. **M-2** — Review 51 SQL interpolations (verify safety)
12. **M-5** — Replace 43 `any` types (improves type safety)
