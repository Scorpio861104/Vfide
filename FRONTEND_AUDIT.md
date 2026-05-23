# VFIDE Frontend Mainnet-Readiness Audit

_Generated: 2026-05-20T17:07:43.987Z_  
_Mode A — automated + manual sweep across all 135 user-facing pages._

## Summary

- **Pages audited:** 135
- **Files scanned in page scope (page + components):** 354
- **Pages clean (zero findings):** 135 / 135 (100%)
- **Total raw findings:** 0
  - 🔴 High:   0
  - 🟡 Medium: 0
  - 🟢 Low:    0
- **Pages without `loading.tsx` (own or inherited):** 0
- **Pages without `error.tsx`  (own or inherited):** 0

## Checks performed per page (and its components)

1. **Testnet/sepolia leakage** in user-visible JSX (excluding chainId-keyed explorer maps, lib/testnet imports, network-detection branches)
2. **Hardcoded EOA-style addresses** (excluding zero/dead/template-literal type tags)
3. **Mock/fake/dummy data** rendered in JSX children
4. **`loading.tsx`** neighbor present (own dir or inherited from ancestor)
5. **`error.tsx`** neighbor present (own dir or inherited from ancestor)
6. **Howey-risk affirmative language** ("passive income", "guaranteed return", "earn yield", "staking reward") not in disclaiming context
7. **Stray `console.log` / `console.debug`** in production code
8. **Empty `catch {}` blocks** (silent error swallow)

## Findings table

Status: 🟢 clean · 🟡 medium · 🔴 high. Loading/Error: ✅ present (own or inherited), ❌ missing.

| # | Route | Loading | Error | Files | Findings | Status |
|---:|---|:-:|:-:|:-:|---|:-:|
| 1 | `/embed/[slug]` | ✅ | ✅ | 2 | — | 🟢 |
| 2 | `/s/[slug]` | ✅ | ✅ | 2 | — | 🟢 |
| 3 | `/about` | ✅ | ✅ | 1 | — | 🟢 |
| 4 | `/achievements` | ✅ | ✅ | 4 | — | 🟢 |
| 5 | `/admin` | ✅ | ✅ | 2 | — | 🟢 |
| 6 | `/agent` | ✅ | ✅ | 1 | — | 🟢 |
| 7 | `/api-coverage` | ✅ | ✅ | 1 | — | 🟢 |
| 8 | `/appeals` | ✅ | ✅ | 4 | — | 🟢 |
| 9 | `/badges` | ✅ | ✅ | 4 | — | 🟢 |
| 10 | `/benefits` | ✅ | ✅ | 5 | — | 🟢 |
| 11 | `/budgets` | ✅ | ✅ | 1 | — | 🟢 |
| 12 | `/buy` | ✅ | ✅ | 4 | — | 🟢 |
| 13 | `/checkout/[id]` | ✅ | ✅ | 3 | — | 🟢 |
| 14 | `/control-panel` | ✅ | ✅ | 13 | — | 🟢 |
| 15 | `/council` | ✅ | ✅ | 5 | — | 🟢 |
| 16 | `/cross-chain` | ✅ | ✅ | 1 | — | 🟢 |
| 17 | `/crypto` | ✅ | ✅ | 1 | — | 🟢 |
| 18 | `/dao-hub` | ✅ | ✅ | 5 | — | 🟢 |
| 19 | `/dashboard` | ✅ | ✅ | 8 | — | 🟢 |
| 20 | `/demo/crypto-social` | ✅ | ✅ | 5 | — | 🟢 |
| 21 | `/developer` | ✅ | ✅ | 1 | — | 🟢 |
| 22 | `/disputes` | ✅ | ✅ | 1 | — | 🟢 |
| 23 | `/docs` | ✅ | ✅ | 5 | — | 🟢 |
| 24 | `/elections` | ✅ | ✅ | 1 | — | 🟢 |
| 25 | `/endorsements` | ✅ | ✅ | 1 | — | 🟢 |
| 26 | `/enterprise` | ✅ | ✅ | 6 | — | 🟢 |
| 27 | `/escrow/[id]` | ✅ | ✅ | 2 | — | 🟢 |
| 28 | `/escrow` | ✅ | ✅ | 6 | — | 🟢 |
| 29 | `/explorer/[id]` | ✅ | ✅ | 1 | — | 🟢 |
| 30 | `/explorer` | ✅ | ✅ | 1 | — | 🟢 |
| 31 | `/feed` | ✅ | ✅ | 1 | — | 🟢 |
| 32 | `/flashloans` | ✅ | ✅ | 7 | — | 🟢 |
| 33 | `/fraud` | ✅ | ✅ | 5 | — | 🟢 |
| 34 | `/governance` | ✅ | ✅ | 13 | — | 🟢 |
| 35 | `/governance/proposal/[id]` | ✅ | ✅ | 1 | — | 🟢 |
| 36 | `/guardians` | ✅ | ✅ | 15 | — | 🟢 |
| 37 | `/hardware-wallet` | ✅ | ✅ | 4 | — | 🟢 |
| 38 | `/headhunter` | ✅ | ✅ | 5 | — | 🟢 |
| 39 | `/inheritance/claim` | ✅ | ✅ | 1 | — | 🟢 |
| 40 | `/inheritance/memorial` | ✅ | ✅ | 1 | — | 🟢 |
| 41 | `/inheritance/override` | ✅ | ✅ | 1 | — | 🟢 |
| 42 | `/inheritance` | ✅ | ✅ | 1 | — | 🟢 |
| 43 | `/inheritance/setup` | ✅ | ✅ | 1 | — | 🟢 |
| 44 | `/inheritance/status` | ✅ | ✅ | 1 | — | 🟢 |
| 45 | `/insights` | ✅ | ✅ | 1 | — | 🟢 |
| 46 | `/invite/[code]` | ✅ | ✅ | 1 | — | 🟢 |
| 47 | `/invite` | ✅ | ✅ | 1 | — | 🟢 |
| 48 | `/leaderboard` | ✅ | ✅ | 5 | — | 🟢 |
| 49 | `/legal` | ✅ | ✅ | 1 | — | 🟢 |
| 50 | `/lending` | ✅ | ✅ | 4 | — | 🟢 |
| 51 | `/live-demo` | ✅ | ✅ | 1 | — | 🟢 |
| 52 | `/marketplace` | ✅ | ✅ | 4 | — | 🟢 |
| 53 | `/me` | ✅ | ✅ | 1 | — | 🟢 |
| 54 | `/merchant/analytics` | ✅ | ✅ | 1 | — | 🟢 |
| 55 | `/merchant/bookings` | ✅ | ✅ | 1 | — | 🟢 |
| 56 | `/merchant/coupons` | ✅ | ✅ | 1 | — | 🟢 |
| 57 | `/merchant/customers` | ✅ | ✅ | 1 | — | 🟢 |
| 58 | `/merchant/expenses` | ✅ | ✅ | 1 | — | 🟢 |
| 59 | `/merchant/gift-cards` | ✅ | ✅ | 1 | — | 🟢 |
| 60 | `/merchant/installments` | ✅ | ✅ | 1 | — | 🟢 |
| 61 | `/merchant/inventory` | ✅ | ✅ | 1 | — | 🟢 |
| 62 | `/merchant/invoices` | ✅ | ✅ | 1 | — | 🟢 |
| 63 | `/merchant/locations` | ✅ | ✅ | 1 | — | 🟢 |
| 64 | `/merchant/loyalty` | ✅ | ✅ | 1 | — | 🟢 |
| 65 | `/merchant` | ✅ | ✅ | 5 | — | 🟢 |
| 66 | `/merchant/payment-links` | ✅ | ✅ | 1 | — | 🟢 |
| 67 | `/merchant/payouts` | ✅ | ✅ | 1 | — | 🟢 |
| 68 | `/merchant/profile/edit` | ✅ | ✅ | 1 | — | 🟢 |
| 69 | `/merchant/profile/setup` | ✅ | ✅ | 1 | — | 🟢 |
| 70 | `/merchant/refunds` | ✅ | ✅ | 1 | — | 🟢 |
| 71 | `/merchant/returns` | ✅ | ✅ | 1 | — | 🟢 |
| 72 | `/merchant/setup` | ✅ | ✅ | 1 | — | 🟢 |
| 73 | `/merchant/staff` | ✅ | ✅ | 1 | — | 🟢 |
| 74 | `/merchant/subscriptions` | ✅ | ✅ | 1 | — | 🟢 |
| 75 | `/merchant/suppliers` | ✅ | ✅ | 1 | — | 🟢 |
| 76 | `/merchant/tax` | ✅ | ✅ | 1 | — | 🟢 |
| 77 | `/merchant/tips` | ✅ | ✅ | 1 | — | 🟢 |
| 78 | `/merchant/wholesale` | ✅ | ✅ | 1 | — | 🟢 |
| 79 | `/merchants` | ✅ | ✅ | 1 | — | 🟢 |
| 80 | `/multisig` | ✅ | ✅ | 1 | — | 🟢 |
| 81 | `/notifications` | ✅ | ✅ | 1 | — | 🟢 |
| 82 | `/onboarding` | ✅ | ✅ | 1 | — | 🟢 |
| 83 | `/` | ✅ | ✅ | 13 | — | 🟢 |
| 84 | `/paper-wallet` | ✅ | ✅ | 3 | — | 🟢 |
| 85 | `/pay/link/[id]` | ✅ | ✅ | 2 | — | 🟢 |
| 86 | `/pay` | ✅ | ✅ | 2 | — | 🟢 |
| 87 | `/payroll` | ✅ | ✅ | 5 | — | 🟢 |
| 88 | `/performance` | ✅ | ✅ | 6 | — | 🟢 |
| 89 | `/pos` | ✅ | ✅ | 1 | — | 🟢 |
| 90 | `/price-alerts` | ✅ | ✅ | 4 | — | 🟢 |
| 91 | `/product/[id]` | ✅ | ✅ | 6 | — | 🟢 |
| 92 | `/profile` | ✅ | ✅ | 1 | — | 🟢 |
| 93 | `/proofscore` | ✅ | ✅ | 3 | — | 🟢 |
| 94 | `/quests` | ✅ | ✅ | 1 | — | 🟢 |
| 95 | `/remittance` | ✅ | ✅ | 1 | — | 🟢 |
| 96 | `/reporting` | ✅ | ✅ | 1 | — | 🟢 |
| 97 | `/rewards` | ✅ | ✅ | 1 | — | 🟢 |
| 98 | `/sanctum/charities/[id]` | ✅ | ✅ | 1 | — | 🟢 |
| 99 | `/sanctum` | ✅ | ✅ | 6 | — | 🟢 |
| 100 | `/scan` | ✅ | ✅ | 2 | — | 🟢 |
| 101 | `/security-center` | ✅ | ✅ | 1 | — | 🟢 |
| 102 | `/seer-academy` | ✅ | ✅ | 1 | — | 🟢 |
| 103 | `/seer-service` | ✅ | ✅ | 4 | — | 🟢 |
| 104 | `/settings` | ✅ | ✅ | 2 | — | 🟢 |
| 105 | `/setup` | ✅ | ✅ | 4 | — | 🟢 |
| 106 | `/social-hub` | ✅ | ✅ | 4 | — | 🟢 |
| 107 | `/social-messaging` | ✅ | ✅ | 8 | — | 🟢 |
| 108 | `/social-payments` | ✅ | ✅ | 1 | — | 🟢 |
| 109 | `/social` | ✅ | ✅ | 4 | — | 🟢 |
| 110 | `/splitter` | ✅ | ✅ | 1 | — | 🟢 |
| 111 | `/staking` | ✅ | ✅ | 1 | — | 🟢 |
| 112 | `/stealth` | ✅ | ✅ | 1 | — | 🟢 |
| 113 | `/store/[slug]` | ✅ | ✅ | 4 | — | 🟢 |
| 114 | `/stories` | ✅ | ✅ | 1 | — | 🟢 |
| 115 | `/streaming` | ✅ | ✅ | 1 | — | 🟢 |
| 116 | `/subscriptions` | ✅ | ✅ | 4 | — | 🟢 |
| 117 | `/support` | ✅ | ✅ | 4 | — | 🟢 |
| 118 | `/taxes` | ✅ | ✅ | 1 | — | 🟢 |
| 119 | `/testnet` | ✅ | ✅ | 1 | — | 🟢 |
| 120 | `/theme-manager` | ✅ | ✅ | 1 | — | 🟢 |
| 121 | `/theme-showcase` | ✅ | ✅ | 1 | — | 🟢 |
| 122 | `/theme` | ✅ | ✅ | 4 | — | 🟢 |
| 123 | `/time-locks` | ✅ | ✅ | 1 | — | 🟢 |
| 124 | `/token-launch` | ✅ | ✅ | 1 | — | 🟢 |
| 125 | `/treasury` | ✅ | ✅ | 6 | — | 🟢 |
| 126 | `/vault/lock` | ✅ | ✅ | 1 | — | 🟢 |
| 127 | `/vault` | ✅ | ✅ | 12 | — | 🟢 |
| 128 | `/vault/pending-changes` | ✅ | ✅ | 1 | — | 🟢 |
| 129 | `/vault/recover` | ✅ | ✅ | 4 | — | 🟢 |
| 130 | `/vault/recover/status` | ✅ | ✅ | 1 | — | 🟢 |
| 131 | `/vault/safety` | ✅ | ✅ | 1 | — | 🟢 |
| 132 | `/vault/safety/window` | ✅ | ✅ | 1 | — | 🟢 |
| 133 | `/vault/settings` | ✅ | ✅ | 1 | — | 🟢 |
| 134 | `/verifier` | ✅ | ✅ | 1 | — | 🟢 |
| 135 | `/vesting` | ✅ | ✅ | 4 | — | 🟢 |

## Detail — pages with findings

_All 135 pages clean. ✅_

## Manual review notes

### Accepted as-is

- **`/lending` — "Interest (% APR, max 12)"** (`OfferTab.tsx:207`, `lending/layout.tsx:6`)  
  Context: peer-to-peer term loan offers are user-set credit between two consenting wallets, capped at 12% APR by protocol. This is *not* a VFIDE-issued yield product. The legal page explicitly disclaims: _"Peer-to-peer credit lanes are user-negotiated and not a VFIDE yield product"_ (`legal/page.tsx:108`). The scanner correctly skips this via the negation-prefix check; documented here for reviewers. **Keep.**

- **`/benefits`, `/achievements`, `/legal` — "not investment returns" / "no passive income"**  
  All hits are *disclaiming* Howey-risk language, not asserting it. The scanner skips these via the negation prefix check; manual re-read confirmed. **Keep.**

- **Multi-chain explorer maps** (`sanctum/components/HistoryTab.tsx`, `treasury/components/RevenueTab.tsx`, `checkout/[id]/page.tsx`)  
  These are `Record<chainId, explorerUrl>` lookup tables that include sepolia entries as valid keys for users connected on testnet. The default fallback resolves to `basescan.org` (mainnet 8453). **Keep.**

- **`localhost` fallbacks for `NEXT_PUBLIC_APP_URL`** (`(marketing)/s/[slug]/page.tsx:28,36`, `store/[slug]/page.tsx:17,27`)  
  Used only for OG/canonical URL construction during build/SSR. Production env must set `NEXT_PUBLIC_APP_URL=https://vfide.io`. Already enforced by `scripts/validate-mainnet-env.ts` and `lib/validateProduction.ts`. **Keep with env enforcement.**

### Fixed in PR #232

| Issue | File | Severity | Fix |
|---|---|:-:|---|
| `/about/contact` link 404s on mainnet | `app/vault/safety/page.tsx:339` | medium | Repointed to `/support` |
| `/about/privacy` link 404s on mainnet | `app/vault/safety/page.tsx:323` | medium | Repointed to `/legal?tab=privacy` |
| Legal page tabs not deeplink-aware | `app/legal/page.tsx` | low | Added `useSearchParams` to honor `?tab=privacy` / `?tab=terms` |
| Junk merchant address `0x...0001` fallback | `app/product/[id]/components/ProductInfo.tsx:122` | **high** | Now refuses checkout when merchant_address is missing/invalid; shows "Checkout unavailable" notice instead of routing payment to a junk address |
| "before testnet deployment" copy on dev tool | `app/api-coverage/page.tsx:113` | low | Changed to "in any deployment environment" |
| "Test on testnet first" in operator deploy checklist | `app/control-panel/components/ProductionSetupPanel.tsx:266` | low | Rephrased to "Validate the full flow on a non-production network first" — same operator guidance, network-agnostic wording |
| Sitemap missing 18 indexable public pages | `app/sitemap.ts` | low | Expanded from 8 to 26 entries with proper priority tiers and changeFrequency |
| Missing `error.tsx` for `/sanctum/charities/[id]` | new file | low | Added |
| Missing `error.tsx` for `/inheritance/memorial` | new file | low | Added |
| Missing `error.tsx` for `/merchant/profile/setup` | new file | low | Added |
| Missing `loading.tsx` for `/sanctum/charities/[id]` | new file | low | Added |
| Missing `loading.tsx` for `/inheritance/memorial` | new file | low | Added |
| Missing `loading.tsx` for `/vault/safety/window` | new file | low | Added |
| Missing `loading.tsx` for `/merchant/profile/setup` | new file | low | Added |

### Codebase-wide quality observations

- **0** `TODO` / `FIXME` / `HACK` markers in `app/`
- **0** `dangerouslySetInnerHTML`, **0** `eval`
- **2** `console.log` calls total in `app/` (both in admin/dev tools)
- **13** `as any` casts across all of `app/` (acceptable for a 354-file frontend)
- **0** empty `catch {}` blocks (all catches handle the error or fall through to a default value)
- All `window.*` / `document.*` accesses are inside `useEffect`, event handlers, or `onClick` callbacks → SSR-safe
- All contract reads via `useReadContract` are properly gated with `query: { enabled: isConfiguredContractAddress(...) }` → won't fire against unconfigured networks
- `robots.ts` correctly disallows `/api/`, `/admin/`, `/dashboard/`, `/vault/`, `/settings/` and blocks `GPTBot`, `ChatGPT-User`, `CCBot`
- `/testnet` page self-redirects away on mainnet chains and is excluded from the sitemap

### Verdict

**Frontend is mainnet-ready.** All 14 issues addressed. Auto-scanner: **135 / 135 pages clean, 0 findings.**
