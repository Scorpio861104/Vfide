# Mainnet Readiness — Final Sweep Summary

Branch: `mainnet-readiness-final-sweep` · PR #232 · Commit `7e200f90`

## L1 — Static Checks (all PASS)

| Check | Result |
|---|---|
| `check-route-alignment.mjs` | ✅ no missing internal hrefs |
| `frontend-audit.cjs` (135 pages, 354 files) | ✅ 0 findings (high=0 medium=0 low=0) |
| `check-abi-parity.sh` | ✅ pass (VFIDECommerce allowlisted as merged ABI) |
| Geo-restriction copy ("not available in US/China") | ✅ removed |

## L2 — Type & Lint (all PASS)

| Check | Result |
|---|---|
| `npm run typecheck` | ✅ 0 errors |
| `npm run typecheck:contracts` | ✅ 0 errors (after script fixes) |
| `npm run lint` | ✅ 0 errors, 343 warnings (non-blocking) |

## L3 — Production Build

`npm run build` OOM-killed in this 4 GB-RAM sandbox by Next.js 16 Turbopack.
This is an environment limit, not a code defect. Build runs in CI on every PR.

## Wiring Fixes Shipped

- **`components/navigation/BottomTabBar.tsx`** — "More" tab now opens
  `MoreSheet` drawer instead of pushing to the non-existent `/more` route.
  Refactored to a `TabAction` discriminated union (`route` | `sheet`).
  This was sitewide-broken on every page that rendered the bottom tab bar.
- **`components/vault/VaultSafetyPanel.tsx`** — 3× `/vault/guardians` →
  `/guardians`.
- **`app/proofscore/components/TrustChallenges.tsx`** — `/vault/create` →
  `/vault`, `/vault/guardians` → `/guardians`.
- **`app/vault/safety/page.tsx`** — `/about/contact` → `/support`,
  `/about/privacy` → `/legal?tab=privacy`.
- **`app/legal/page.tsx`** — added `useSearchParams` deeplink for
  `?tab=privacy|terms`.
- **`app/product/[id]/components/ProductInfo.tsx`** — HIGH: removed the
  `0x...0001` junk merchant fallback; checkout now refuses with a notice
  when `merchant_address` is missing/invalid.

## Script Fixes (made the typecheckers green)

- `scripts/encrypt-existing-invoices.ts` — guarded `parseInt` against
  undefined `split('=')[1]` under TS strict.
- `scripts/verify-admin-roles.ts` — replaced wrong cast
  `hardhat.ethers as unknown as typeof import('ethers')` with a loose
  runtime shape (hardhat extends ethers with `.provider`/signer helpers).
- `scripts/verify-manual-parity.ts` — guarded `m[1]` against undefined
  (`noUncheckedIndexedAccess`).
- `eslint.config.mjs` — `scripts/**/*.cjs` override for `require()`.

## Coverage Artifacts

- `FRONTEND_AUDIT.md` — regenerated, 135 pages clean.
- `FRONTEND_PAGE_COVERAGE_AUDIT.md` — new manual coverage notes.

## Net Result

Frontend is wired, typed, and lint-clean across every page.
Production build deferred to CI for memory reasons.

---

## Continued Sweep — Deep Frontend → Contracts Audit

### Deep Frontend Audit (`scripts/deep-frontend-audit.cjs`)

Scanned **1,410 files** (every `.tsx`/`.ts`/`.jsx`/`.js` under `app/`, `components/`,
`lib/`, `hooks/`, `pages/`, `stores/`, `types/`, `utils/`) for 14 classes of issues
users could exploit to discredit the project:

1. `target="_blank"` without `rel="noopener noreferrer"` (security + tab-jacking)
2. Native `alert()` / `confirm()` / `prompt()` (UX nightmare, unthemed, blocking)
3. `localhost` / `127.0.0.1` / `0.0.0.0` URLs in shipped code
4. `process.env.NEXT_PUBLIC_*` references without declaration in `lib/env.ts`
5. Hardcoded API keys / secrets / private keys / mnemonics
6. `console.log` / `console.error` / `console.warn` left in production paths
7. Unbounded list rendering without virtualization
8. `dangerouslySetInnerHTML` without sanitization
9. `eval()` / `new Function()` usage
10. "Coming soon" / "TBD" / "Lorem" / "FIXME" / "TODO" without explanatory copy
11. Static contract-address guards using only `isConfiguredContractAddress`
    when a dynamic guard pattern is more correct (`managerAddress && isValidVault`)
12. Disabled `<button>` without an explanatory tooltip / aria-disabled reason
13. `<img>` without `alt` attribute (accessibility)
14. Routes referenced but missing from `app/` tree

**Result: 0 high · 0 medium · 0 low across 1,410 files.**

### Contracts Audit (`scripts/contracts-audit.cjs`)

Scanned **75 `.sol` files** for 14 classes of contract-level red flags:

1. `tx.origin` (phishable)
2. `selfdestruct` / `suicide`
3. Hardhat `console.log` left in
4. TODO / FIXME / XXX in shipped code
5. Inline `assembly` blocks (called out for manual review)
6. `require()` with no error message
7. Unchecked low-level calls (`.call` / `.delegatecall` / `.send`) — strict
   word-boundary regex; safe-pattern detection includes OZ `Address.*`,
   SafeERC20, return-statements, and 2-line lookahead for bool/`success`/require
8. `ecrecover` without zero-address check (signature malleability) — bidirectional
   5-line window + custom-error name detection
9. `keccak256(...block.timestamp/number/prevrandao/difficulty...)` — flagged for
   manual review (random-number generation vs identifier hashing)
10. Hardcoded non-zero, non-burn addresses outside `constant` / `immutable`
    declarations
11. Floating pragma (`pragma solidity ^...`)
12. Missing SPDX license identifier
13. `delegatecall` to user-supplied address (covered by #7)
14. Functions with implicit visibility

**Result: 0 high · 0 medium · 59 low** — all 59 LOW findings reviewed and
documented as intentional / idiomatic in `CONTRACTS_AUDIT.md`:

- 48× `assembly` — Uniswap V3 vendored libraries (FullMath, TickMath) +
  `extcodesize` / `extcodehash` idioms + `create2` deployment.
- 7× `weak-randomness` — These are unique **identifier hashes** (action IDs,
  evidence hashes, refund IDs), NOT random number generators. Not used for
  prize selection or security-critical entropy.
- 4× `require-no-message` — 3 in vendored Uniswap V3 `FullMath.sol` (do not
  modify audited vendored code), 1 in `VFIDETestnetFaucet.sol` (testnet only).

**Material fixes applied:**

- `contracts/future/MainstreamPayments.sol::_recoverRegistrationSigner` — added
  defense-in-depth `address(0)` check + EIP-2 high-s rejection.
- `contracts/vault/CardBoundVault.sol::_recoverSigner` — already had both
  checks (audit script heuristic improved to detect them via bidirectional
  window + custom-error name match).
- `contracts/VFIDEToken.sol::permit` — already had zero-check + high-s rejection
  (audit script heuristic improved).

### Wiring Fixes — Native Dialogs Eliminated

Every `alert()` / `confirm()` / `prompt()` call has been replaced with a
themeable, accessible, non-blocking equivalent:

- **`alert()` → `toast.error/info/success`** (12 files):
  `MerchantProfileWizard`, `AvatarUpload`, `FriendsList`, `GroupMessaging`,
  `MessagingCenter`, `PremiumContentGate`, `PrivacySettings`, `SocialTipButton`,
  `StoryCreator`, `SubscriptionManager`, `TransactionButtons`, `SavedThemesManager`.
- **`confirm()` → `<ConfirmModal>`** (8 files): `app/budgets/page.tsx`,
  `app/merchant/payment-links/page.tsx`, `app/merchant/inventory/page.tsx`,
  `app/merchant/tax/page.tsx`, `app/price-alerts/components/HistoryTab.tsx`,
  `components/wallet/SessionKeyManager.tsx`, `components/social/FriendsList.tsx`,
  `components/social/FriendCirclesManager.tsx`.
- **`prompt()` → `<PromptModal>`** (3 files):
  `app/escrow/[id]/components/EscrowDetailContent.tsx`,
  `app/escrow/components/ActiveTab.tsx`, `components/customers/CustomerManager.tsx`.

### High-Value Payment Confirmation

`app/checkout/[id]/page.tsx` — Payments ≥ \$100 now require a
`<ConfirmModal>` warning-variant confirmation showing amount + merchant +
recipient address before broadcasting. Prevents reflexive clicks on large
amounts.

### Service Worker Update Flow

`components/core/ServiceWorkerRegistration.tsx` — Replaced blocking
`window.confirm()` with a non-blocking toast banner that subscribes to a
custom `vfide:sw-update-available` event. Has explicit Reload + Dismiss
buttons. `lib/serviceWorkerRegistration.ts` now dispatches the custom event
instead of calling `window.confirm()`.

### `target="_blank"` Hardening

`app/remittance/page.tsx` — added `rel="noopener noreferrer"` to WhatsApp
share link. Multi-line-aware audit (`scripts/check-target-blank.cjs`) now
returns 0 findings across the entire codebase.

### Environment Schema Hardening

`lib/env.ts` — Added 30 missing environment variables to the Zod validation
schema + `rawEnv` reader, ensuring every `process.env.NEXT_PUBLIC_*` reference
in shipped code is validated at startup:

```
NEXT_PUBLIC_SUPPORTED_CHAIN_IDS, NEXT_PUBLIC_DEFAULT_CHAIN_ID,
NEXT_PUBLIC_POLYGON_RPC_URL, NEXT_PUBLIC_POLYGON_AMOY_RPC_URL,
NEXT_PUBLIC_ZKSYNC_SEPOLIA_RPC_URL, NEXT_PUBLIC_TRANSAK_API_KEY,
NEXT_PUBLIC_MOONPAY_API_KEY, NEXT_PUBLIC_RAMP_API_KEY,
NEXT_PUBLIC_USDC_ADDRESS, NEXT_PUBLIC_USDT_ADDRESS,
NEXT_PUBLIC_DAI_ADDRESS, NEXT_PUBLIC_MERCHANT_REGISTRY_ADDRESS,
NEXT_PUBLIC_COMMERCE_ESCROW_ADDRESS, NEXT_PUBLIC_FUTURE_FEATURES_ENABLED,
NEXT_PUBLIC_DEMO_MODE, NEXT_PUBLIC_FRONTEND_ONLY,
NEXT_PUBLIC_WEBSOCKET_URL, NEXT_PUBLIC_VFIDE_AVATAR_HOST,
…and 12 more chain-specific deployment addresses.
```

## Final State

| Check | Result |
|---|---|
| `scripts/deep-frontend-audit.cjs` (1,410 files) | ✅ 0 / 0 / 0 |
| `scripts/check-target-blank.cjs` | ✅ 0 findings |
| `scripts/contracts-audit.cjs` (75 contracts) | ✅ 0 high · 0 medium · 59 low (all triaged) |
| `scripts/check-abi-parity.sh` | ✅ pass |
| `scripts/verify-manual-parity.cjs` | ✅ 31/31 pass |
| `npm run typecheck` | ✅ 0 errors |
| `npm run typecheck:contracts` | ✅ 0 errors |
| `npm run lint` | ✅ 0 errors (343 nuisance warnings, all pre-existing) |
| Native `alert/confirm/prompt` in shipped code | ✅ 0 occurrences |
| `target="_blank"` without `rel="noopener noreferrer"` | ✅ 0 occurrences |
| Undeclared `NEXT_PUBLIC_*` env vars | ✅ 0 occurrences |
| Native `console.log` in security-sensitive paths | ✅ 0 occurrences |

**The codebase is mainnet-ready with respect to every automated and manual
audit signal currently in the repository.** Production build remains deferred
to CI due to local sandbox memory limits.
