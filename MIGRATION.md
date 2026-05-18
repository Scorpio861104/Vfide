# VFIDE Frontend Scaffold — Migration Guide

> Status: Historical reference. Review current route structure and provider wiring in the live codebase before applying steps from this document.

## What's in this zip

```
scaffold/
├── app/
│   ├── layout.tsx                    ← NEW root layout (CoreProviders only)
│   ├── (marketing)/
│   │   ├── layout.tsx                ← RSC layout, no providers, no wallet
│   │   ├── about/page.tsx            ← SSR shell (migrate content into this)
│   │   ├── docs/page.tsx
│   │   ├── legal/page.tsx
│   │   └── support/page.tsx
│   ├── (auth)/layout.tsx             ← Web3Providers + WalletGate
│   ├── (finance)/
│   │   ├── layout.tsx
│   │   └── vault/components/index.ts ← barrel export
│   ├── (commerce)/layout.tsx         ← + CommerceProviders (cart)
│   ├── (governance)/
│   │   ├── layout.tsx
│   │   └── governance/components/index.ts
│   ├── (social)/layout.tsx           ← + SocialProviders (presence)
│   ├── (security)/
│   │   ├── layout.tsx
│   │   └── guardians/components/index.ts
│   ├── (gamification)/layout.tsx     ← + GamificationProviders (achievements)
│   └── (seer)/layout.tsx
├── components/
│   ├── layout/
│   │   ├── WalletGate.tsx            ← shared auth guard
│   │   ├── ComingSoon.tsx            ← feature flag placeholder
│   │   └── index.ts
│   ├── merchant/index.ts             ← barrel
│   ├── social/index.ts
│   ├── search/index.ts
│   └── crypto/index.ts
├── lib/
│   ├── providers/
│   │   ├── CoreProviders.tsx         ← Tier 1: theme, a11y, preferences, toast
│   │   ├── Web3Providers.tsx         ← Tier 2: wagmi, rainbowkit, security
│   │   ├── FeatureProviders.tsx      ← Tier 3: social, gamification, commerce
│   │   └── index.ts
│   ├── features.ts                   ← feature flags
│   └── ssr-animations.css            ← CSS replacements for framer-motion
├── scripts/
│   ├── migrate-route-groups.sh       ← moves routes into groups
│   ├── new-page.sh                   ← scaffolds page + loading + error
│   └── new-component.sh              ← scaffolds component file
└── MIGRATION.md                      ← this file
```

## Migration order (solo dev optimized)

### Phase 1: Provider flattening (30 min)

1. Copy `lib/providers/` into your repo
2. Replace your `app/layout.tsx` with the scaffold version
3. Identify which of your 15+ nested providers map to which tier:
   - **Tier 1** (CoreProviders): ThemeProvider, AccessibilityProvider, PreferencesProvider, ToastProvider
   - **Tier 2** (Web3Providers): WagmiProvider, RainbowKitProvider, QueryClientProvider, SecurityProvider
   - **Tier 3** (FeatureProviders): PresenceManager, NotificationProvider, AchievementToastProvider, CartProvider
4. Move each provider from root layout into the correct tier file
5. `npm run dev` — verify everything still works

### Phase 2: Route group migration (1-2 hours)

1. Copy route group layouts from `app/(marketing)/layout.tsx` etc.
2. Copy `components/layout/WalletGate.tsx` and `ComingSoon.tsx`
3. Run: `bash scripts/migrate-route-groups.sh --dry-run` (see what moves)
4. Run: `bash scripts/migrate-route-groups.sh` (copies routes into groups)
5. `npm run dev` — test each route group
6. Once verified: `bash scripts/migrate-route-groups.sh --cleanup`

**Route group mapping:**

| Group | Routes | Providers |
|---|---|---|
| (marketing) | about, docs, legal, support, benefits, seer-academy | None (pure RSC) |
| (auth) | dashboard, profile, settings, notifications | Web3 + WalletGate |
| (finance) | vault, treasury, vesting, payroll, escrow, streaming, subscriptions, budgets, taxes, time-locks | Web3 + WalletGate |
| (commerce) | merchant, merchants, marketplace, store, product, pos, buy, checkout, pay | Web3 + Commerce + WalletGate |
| (governance) | governance, dao-hub, council, appeals | Web3 + WalletGate |
| (social) | social, social-hub, social-messaging, social-payments, feed, stories, endorsements, friends | Web3 + Social + WalletGate |
| (security) | guardians, security-center, multisig, stealth, hardware-wallet, paper-wallet | Web3 + WalletGate |
| (gamification) | quests, achievements, badges, leaderboard, headhunter, rewards | Web3 + Gamification + WalletGate |
| (seer) | seer-service, flashloan, insights, agent | Web3 + WalletGate |

### Phase 3: SSR conversion for marketing pages (1 hour)

For each page in `(marketing)/`:

1. Remove `'use client'` directive
2. Remove `framer-motion` imports
3. Remove `useAccount`, `useWallet`, and any wagmi hooks
4. Replace `<motion.div initial={{...}} animate={{...}}>` with `<div className="animate-fade-in">`
5. Add CSS animations from `lib/ssr-animations.css` to your `globals.css`
6. Add `export const metadata` for SEO

### Phase 4: Feature flags (15 min)

1. Copy `lib/features.ts` into your repo
2. Copy `components/layout/ComingSoon.tsx`
3. At the top of each unfinished page, add:
   ```tsx
   import { features } from '@/lib/features';
   import { ComingSoon } from '@/components/layout/ComingSoon';
   
   export default function StreamingPage() {
     if (!features.streaming) return <ComingSoon feature="Streaming Payments" />;
     // ... actual page
   }
   ```

### Phase 5: Barrel exports (15 min)

1. Copy each `index.ts` barrel into the matching `components/` directory
2. Update imports across the codebase:
   ```tsx
   // Before
   import { TransactionHistory } from '@/components/crypto/TransactionHistory';
   import { TransactionCard } from '@/components/crypto/TransactionCard';
   
   // After
   import { TransactionHistory, TransactionCard } from '@/components/crypto';
   ```

### Phase 6: Scaffolding scripts (5 min)

1. Copy `scripts/new-page.sh` and `scripts/new-component.sh`
2. `chmod +x scripts/new-page.sh scripts/new-component.sh`
3. New pages: `bash scripts/new-page.sh (finance)/budgets`
4. New components: `bash scripts/new-component.sh components/merchant/OrderTracker`

## Expected impact

| Metric | Before | After |
|---|---|---|
| Root layout providers | 15+ nested | 4 (Tier 1 only) |
| (marketing) JS bundle | 500KB-1MB | ~0 (pure HTML) |
| TTI on 3G for /about | 3-8 seconds | <1 second |
| Auth guard per page | Copy-pasted in 50+ files | 1 WalletGate in layout |
| Feature gating | None | 30 flags, instant toggle |
| New page scaffold | Manual (10 min) | `bash new-page.sh` (5 sec) |
| Import paths | Hunt through folders | Barrel exports |
